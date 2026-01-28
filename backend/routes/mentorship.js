const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateMentorProfile, validateMentorshipRequest } = require('../middleware/validation');

// Get all mentors
router.get('/mentors', async (req, res) => {
  try {
    const search = req.query.search || '';
    const skill = req.query.skill;

    let query = `
      SELECT 
        mp.id, mp.skills, mp.experience_years, mp.availability_status, mp.max_mentees, mp.bio,
        u.id as user_id, u.first_name, u.last_name, u.email, u.profile_image_url,
        COUNT(DISTINCT m.id) as current_mentees
      FROM mentor_profiles mp
      INNER JOIN users u ON mp.user_id = u.id
      LEFT JOIN mentorships m ON m.mentor_id = mp.user_id AND m.status = 'active'
      WHERE mp.availability_status != 'unavailable'
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (search) {
      conditions.push(`(UPPER(u.first_name) LIKE UPPER($${paramCount}) OR UPPER(u.last_name) LIKE UPPER($${paramCount}) OR UPPER(mp.bio) LIKE UPPER($${paramCount}))`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (skill) {
      // SQLite doesn't support ANY(), use JSON functions instead
      conditions.push(`json_extract(mp.skills, '$') LIKE $${paramCount}`);
      params.push(`%"${skill}"%`);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY mp.id, u.id HAVING COUNT(DISTINCT m.id) < mp.max_mentees`;

    const result = await pool.query(query, params);

    res.json({ mentors: result.rows });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({ error: 'Server error fetching mentors' });
  }
});

// Get mentor profile by user ID
router.get('/mentors/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await pool.query(
      `SELECT 
        mp.id, mp.skills, mp.experience_years, mp.availability_status, mp.max_mentees, mp.bio,
        u.id as user_id, u.first_name, u.last_name, u.email, u.profile_image_url,
        COUNT(DISTINCT m.id) as current_mentees
      FROM mentor_profiles mp
      INNER JOIN users u ON mp.user_id = u.id
      LEFT JOIN mentorships m ON m.mentor_id = mp.user_id AND m.status = 'active'
      WHERE mp.user_id = $1
      GROUP BY mp.id, u.id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching mentor profile:', error);
    res.status(500).json({ error: 'Server error fetching mentor profile' });
  }
});

// Create or update mentor profile
router.post('/mentors', authenticate, authorize('mentor', 'admin'), validateMentorProfile, async (req, res) => {
  try {
    const userId = req.user.id;
    const { skills, experienceYears, maxMentees = 5, bio, availabilityStatus = 'available' } = req.body;

    // Check if profile exists
    const existing = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = $1', [userId]);

    if (existing.rows.length > 0) {
      // Update existing profile - store skills as JSON string for SQLite
      const skillsJson = JSON.stringify(skills);
      const result = await pool.query(
        `UPDATE mentor_profiles 
         SET skills = $1, experience_years = $2, max_mentees = $3, bio = $4, availability_status = $5, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $6
         RETURNING *`,
        [skillsJson, experienceYears, maxMentees, bio, availabilityStatus, userId]
      );
      return res.json({ message: 'Mentor profile updated', profile: result.rows[0] });
    } else {
      // Create new profile - store skills as JSON string for SQLite
      const skillsJson = JSON.stringify(skills);
      const result = await pool.query(
        `INSERT INTO mentor_profiles (user_id, skills, experience_years, max_mentees, bio, availability_status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, skillsJson, experienceYears, maxMentees, bio, availabilityStatus]
      );
      return res.status(201).json({ message: 'Mentor profile created', profile: result.rows[0] });
    }
  } catch (error) {
    console.error('Error creating/updating mentor profile:', error);
    res.status(500).json({ error: 'Server error creating/updating mentor profile' });
  }
});

// Get mentorship requests for a user
router.get('/requests', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const status = req.query.status;

    let query;
    let params = [userId];

    if (role === 'mentor') {
      // Get requests sent to this mentor
      query = `
        SELECT 
          mr.id, mr.message, mr.status, mr.created_at, mr.updated_at,
          u.id as student_id, u.first_name, u.last_name, u.email
        FROM mentorship_requests mr
        INNER JOIN users u ON mr.student_id = u.id
        WHERE mr.mentor_id = $1
      `;
    } else {
      // Get requests sent by this student
      query = `
        SELECT 
          mr.id, mr.message, mr.status, mr.created_at, mr.updated_at,
          u.id as mentor_id, u.first_name, u.last_name, u.email
        FROM mentorship_requests mr
        INNER JOIN users u ON mr.mentor_id = u.id
        WHERE mr.student_id = $1
      `;
    }

    if (status) {
      query += ` AND mr.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY mr.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Error fetching mentorship requests:', error);
    res.status(500).json({ error: 'Server error fetching mentorship requests' });
  }
});

// Create mentorship request
router.post('/requests', authenticate, authorize('student'), validateMentorshipRequest, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { mentorId, message } = req.body;

    // Check if mentor exists and has profile
    const mentorCheck = await pool.query(
      'SELECT id FROM mentor_profiles WHERE user_id = $1',
      [mentorId]
    );

    if (mentorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    // Check if request already exists
    const existingRequest = await pool.query(
      'SELECT id FROM mentorship_requests WHERE student_id = $1 AND mentor_id = $2 AND status = $3',
      [studentId, mentorId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'Pending request already exists' });
    }

    // Check if already in active mentorship
    const activeMentorship = await pool.query(
      'SELECT id FROM mentorships WHERE student_id = $1 AND mentor_id = $2 AND status = $3',
      [studentId, mentorId, 'active']
    );

    if (activeMentorship.rows.length > 0) {
      return res.status(400).json({ error: 'Active mentorship already exists' });
    }

    // Create request
    const result = await pool.query(
      `INSERT INTO mentorship_requests (student_id, mentor_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [studentId, mentorId, message]
    );

    res.status(201).json({
      message: 'Mentorship request created',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating mentorship request:', error);
    res.status(500).json({ error: 'Server error creating mentorship request' });
  }
});

// Accept or reject mentorship request
router.patch('/requests/:id', authenticate, authorize('mentor'), async (req, res) => {
  try {
    const requestId = req.params.id;
    const mentorId = req.user.id;
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "accepted" or "rejected"' });
    }

    // Get request
    const requestResult = await pool.query(
      'SELECT * FROM mentorship_requests WHERE id = $1 AND mentor_id = $2',
      [requestId, mentorId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    // Check mentor capacity
    if (status === 'accepted') {
      const mentorProfile = await pool.query(
        'SELECT max_mentees FROM mentor_profiles WHERE user_id = $1',
        [mentorId]
      );

      const currentMentees = await pool.query(
        'SELECT COUNT(*) as count FROM mentorships WHERE mentor_id = $1 AND status = $2',
        [mentorId, 'active']
      );

      if (parseInt(currentMentees.rows[0].count) >= mentorProfile.rows[0].max_mentees) {
        return res.status(400).json({ error: 'Mentor has reached maximum mentee capacity' });
      }

      // Create active mentorship
      await pool.query(
        `INSERT INTO mentorships (student_id, mentor_id, request_id)
         VALUES ($1, $2, $3)`,
        [request.student_id, mentorId, requestId]
      );
    }

    // Update request status
    await pool.query(
      'UPDATE mentorship_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, requestId]
    );

    res.json({ message: `Request ${status}`, status });
  } catch (error) {
    console.error('Error updating mentorship request:', error);
    res.status(500).json({ error: 'Server error updating mentorship request' });
  }
});

// Get active mentorships
router.get('/mentorships', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query;
    if (role === 'mentor') {
      query = `
        SELECT 
          m.id, m.started_at, m.status,
          u.id as student_id, u.first_name, u.last_name, u.email
        FROM mentorships m
        INNER JOIN users u ON m.student_id = u.id
        WHERE m.mentor_id = $1 AND m.status = 'active'
      `;
    } else {
      query = `
        SELECT 
          m.id, m.started_at, m.status,
          u.id as mentor_id, u.first_name, u.last_name, u.email
        FROM mentorships m
        INNER JOIN users u ON m.mentor_id = u.id
        WHERE m.student_id = $1 AND m.status = 'active'
      `;
    }

    const result = await pool.query(query, [userId]);
    res.json({ mentorships: result.rows });
  } catch (error) {
    console.error('Error fetching mentorships:', error);
    res.status(500).json({ error: 'Server error fetching mentorships' });
  }
});

module.exports = router;
