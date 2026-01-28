const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateEvent } = require('../middleware/validation');

// Get all events with filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const categoryId = req.query.categoryId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const search = req.query.search || '';
    const approvedOnly = req.query.approvedOnly !== 'false'; // Default to true

    let query = `
      SELECT 
        e.id, e.title, e.description, e.location, e.event_date, e.registration_deadline,
        e.max_participants, e.is_approved, e.created_at, e.updated_at,
        u.id as created_by_id, u.first_name, u.last_name,
        ec.id as category_id, ec.name as category_name,
        COUNT(DISTINCT er.id) as registered_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      LEFT JOIN event_registrations er ON er.event_id = e.id
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (approvedOnly) {
      conditions.push(`e.is_approved = TRUE`);
    }

    if (search) {
      conditions.push(`(UPPER(e.title) LIKE UPPER($${paramCount}) OR UPPER(e.description) LIKE UPPER($${paramCount}))`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (categoryId) {
      conditions.push(`e.category_id = $${paramCount}`);
      params.push(categoryId);
      paramCount++;
    }

    if (startDate) {
      conditions.push(`e.event_date >= $${paramCount}`);
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`e.event_date <= $${paramCount}`);
      params.push(endDate);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY e.id, u.id, ec.id`;
    query += ` ORDER BY e.event_date ASC`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT e.id) as total FROM events e';
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      events: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Server error fetching events' });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    const result = await pool.query(
      `SELECT 
        e.id, e.title, e.description, e.location, e.event_date, e.registration_deadline,
        e.max_participants, e.is_approved, e.created_at, e.updated_at,
        u.id as created_by_id, u.first_name, u.last_name, u.email,
        ec.id as category_id, ec.name as category_name,
        COUNT(DISTINCT er.id) as registered_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      LEFT JOIN event_registrations er ON er.event_id = e.id
      WHERE e.id = $1
      GROUP BY e.id, u.id, ec.id`,
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get registered users
    const registrations = await pool.query(
      `SELECT 
        er.id, er.registered_at,
        u.id as user_id, u.first_name, u.last_name, u.email
      FROM event_registrations er
      INNER JOIN users u ON er.user_id = u.id
      WHERE er.event_id = $1
      ORDER BY er.registered_at DESC`,
      [eventId]
    );

    const event = result.rows[0];
    event.registrations = registrations.rows;

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Server error fetching event' });
  }
});

// Create event
router.post('/', authenticate, validateEvent, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, location, eventDate, registrationDeadline, maxParticipants, categoryId } = req.body;

    // Admin events are auto-approved, others need approval
    const isApproved = req.user.role === 'admin';

    const result = await pool.query(
      `INSERT INTO events (created_by, category_id, title, description, location, event_date, registration_deadline, max_participants, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, categoryId || null, title, description, location || null, eventDate, registrationDeadline || null, maxParticipants || null, isApproved]
    );

    res.status(201).json({
      message: isApproved ? 'Event created and approved' : 'Event created, pending approval',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Server error creating event' });
  }
});

// Update event
router.put('/:id', authenticate, validateEvent, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;
    const { title, description, location, eventDate, registrationDeadline, maxParticipants, categoryId } = req.body;

    // Check if event exists and user has permission
    const eventCheck = await pool.query(
      'SELECT created_by, is_approved FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];

    // Only creator or admin can update
    if (event.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // If non-admin updates, event needs re-approval
    const isApproved = req.user.role === 'admin' ? event.is_approved : false;

    const result = await pool.query(
      `UPDATE events 
       SET title = $1, description = $2, location = $3, event_date = $4, 
           registration_deadline = $5, max_participants = $6, category_id = $7, 
           is_approved = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [title, description, location || null, eventDate, registrationDeadline || null, maxParticipants || null, categoryId || null, isApproved, eventId]
    );

    res.json({
      message: req.user.role === 'admin' ? 'Event updated' : 'Event updated, pending approval',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Server error updating event' });
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Check if event exists and user has permission
    const eventCheck = await pool.query(
      'SELECT created_by FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only creator or admin can delete
    if (eventCheck.rows[0].created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await pool.query('DELETE FROM events WHERE id = $1', [eventId]);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Server error deleting event' });
  }
});

// Approve event (admin only)
router.patch('/:id/approve', authenticate, authorize('admin'), async (req, res) => {
  try {
    const eventId = req.params.id;

    const result = await pool.query(
      'UPDATE events SET is_approved = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event approved', event: result.rows[0] });
  } catch (error) {
    console.error('Error approving event:', error);
    res.status(500).json({ error: 'Server error approving event' });
  }
});

// Register for event
router.post('/:id/register', authenticate, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Check if event exists and is approved
    const eventCheck = await pool.query(
      'SELECT id, max_participants, event_date, registration_deadline FROM events WHERE id = $1 AND is_approved = TRUE',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or not approved' });
    }

    const event = eventCheck.rows[0];

    // Check registration deadline
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({ error: 'Registration deadline has passed' });
    }

    // Check if already registered
    const existingRegistration = await pool.query(
      'SELECT id FROM event_registrations WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (existingRegistration.rows.length > 0) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Check capacity
    if (event.max_participants) {
      const registrationCount = await pool.query(
        'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = $1',
        [eventId]
      );

      if (parseInt(registrationCount.rows[0].count) >= event.max_participants) {
        return res.status(400).json({ error: 'Event is full' });
      }
    }

    // Register
    const result = await pool.query(
      'INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2) RETURNING *',
      [eventId, userId]
    );

    res.status(201).json({
      message: 'Successfully registered for event',
      registration: result.rows[0]
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Server error registering for event' });
  }
});

// Unregister from event
router.delete('/:id/register', authenticate, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      'DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    res.json({ message: 'Successfully unregistered from event' });
  } catch (error) {
    console.error('Error unregistering from event:', error);
    res.status(500).json({ error: 'Server error unregistering from event' });
  }
});

// Get event categories
router.get('/categories/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM event_categories ORDER BY name');
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Server error fetching categories' });
  }
});

module.exports = router;
