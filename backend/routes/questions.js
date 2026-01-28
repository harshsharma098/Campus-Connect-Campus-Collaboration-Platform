const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateQuestion, validateAnswer } = require('../middleware/validation');

// Get all questions with pagination, search, and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const tagId = req.query.tagId;
    const sortBy = req.query.sortBy || 'created_at';
    const order = req.query.order || 'DESC';

    let query = `
      SELECT 
        q.id, q.title, q.content, q.views, q.created_at, q.updated_at,
        u.id as user_id, u.first_name, u.last_name, u.email,
        COALESCE(SUM(CASE WHEN v.vote_type = 'upvote' THEN 1 WHEN v.vote_type = 'downvote' THEN -1 ELSE 0 END), 0) as votes,
        COUNT(DISTINCT a.id) as answer_count
      FROM questions q
      LEFT JOIN users u ON q.user_id = u.id
      LEFT JOIN votes v ON v.votable_type = 'question' AND v.votable_id = q.id
      LEFT JOIN answers a ON a.question_id = q.id
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (search) {
      // SQLite uses LIKE instead of ILIKE, but we'll handle case-insensitive in the query
      conditions.push(`(UPPER(q.title) LIKE UPPER($${paramCount}) OR UPPER(q.content) LIKE UPPER($${paramCount}))`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (tagId) {
      query += ` INNER JOIN question_tags qt ON qt.question_id = q.id`;
      conditions.push(`qt.tag_id = $${paramCount}`);
      params.push(tagId);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY q.id, u.id`;

    // Validate sortBy to prevent SQL injection
    const allowedSortBy = ['created_at', 'views', 'votes'];
    const sortColumn = allowedSortBy.includes(sortBy) ? sortBy : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get tags for each question
    const questions = await Promise.all(
      result.rows.map(async (question) => {
        const tagsResult = await pool.query(
          `SELECT t.id, t.name 
           FROM tags t
           INNER JOIN question_tags qt ON qt.tag_id = t.id
           WHERE qt.question_id = $1`,
          [question.id]
        );
        return {
          ...question,
          tags: tagsResult.rows
        };
      })
    );

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT q.id) as total FROM questions q';
    if (tagId) {
      countQuery += ' INNER JOIN question_tags qt ON qt.question_id = q.id';
    }
    const countConditions = [];
    if (search) {
      countConditions.push(`(UPPER(q.title) LIKE UPPER($1) OR UPPER(q.content) LIKE UPPER($1))`);
    }
    if (tagId) {
      countConditions.push(`qt.tag_id = $${search ? '2' : '1'}`);
    }
    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }
    const countParams = search ? [`%${search}%`, tagId].filter(Boolean) : (tagId ? [tagId] : []);
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      questions,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Server error fetching questions' });
  }
});

// Get single question with answers
router.get('/:id', async (req, res) => {
  try {
    const questionId = req.params.id;

    // Increment view count
    await pool.query('UPDATE questions SET views = views + 1 WHERE id = $1', [questionId]);

    // Get question
    const questionResult = await pool.query(
      `SELECT 
        q.id, q.title, q.content, q.views, q.created_at, q.updated_at,
        u.id as user_id, u.first_name, u.last_name, u.email
      FROM questions q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.id = $1`,
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = questionResult.rows[0];

    // Get votes
    const votesResult = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN vote_type = 'upvote' THEN 1 WHEN vote_type = 'downvote' THEN -1 ELSE 0 END), 0) as votes
       FROM votes WHERE votable_type = 'question' AND votable_id = $1`,
      [questionId]
    );
    question.votes = parseInt(votesResult.rows[0].votes) || 0;

    // Get tags
    const tagsResult = await pool.query(
      `SELECT t.id, t.name 
       FROM tags t
       INNER JOIN question_tags qt ON qt.tag_id = t.id
       WHERE qt.question_id = $1`,
      [questionId]
    );
    question.tags = tagsResult.rows;

    // Get answers
    const answersResult = await pool.query(
      `SELECT 
        a.id, a.content, a.is_accepted, a.created_at, a.updated_at,
        u.id as user_id, u.first_name, u.last_name, u.email,
        COALESCE(SUM(CASE WHEN v.vote_type = 'upvote' THEN 1 WHEN v.vote_type = 'downvote' THEN -1 ELSE 0 END), 0) as votes
      FROM answers a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN votes v ON v.votable_type = 'answer' AND v.votable_id = a.id
      WHERE a.question_id = $1
      GROUP BY a.id, u.id
      ORDER BY a.is_accepted DESC, a.created_at ASC`,
      [questionId]
    );

    question.answers = answersResult.rows;

    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Server error fetching question' });
  }
});

// Create question
router.post('/', authenticate, validateQuestion, async (req, res) => {
  try {
    const { title, content, tags = [] } = req.body;
    const userId = req.user.id;

    // Insert question
    const questionResult = await pool.query(
      `INSERT INTO questions (user_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, views, created_at, updated_at`,
      [userId, title, content]
    );

    const question = questionResult.rows[0];

    // Handle tags
    if (tags.length > 0) {
      for (const tagName of tags) {
        // Get or create tag
        let tagResult = await pool.query('SELECT id FROM tags WHERE name = $1', [tagName.trim()]);
        let tagId;

        if (tagResult.rows.length === 0) {
          const newTagResult = await pool.query(
            'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            [tagName.trim()]
          );
          tagId = newTagResult.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        // Link tag to question
        await pool.query(
          'INSERT INTO question_tags (question_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [question.id, tagId]
        );
      }
    }

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Server error creating question' });
  }
});

// Create answer
router.post('/:id/answers', authenticate, validateAnswer, async (req, res) => {
  try {
    const questionId = req.params.id;
    const { content } = req.body;
    const userId = req.user.id;

    // Check if question exists
    const questionCheck = await pool.query('SELECT id FROM questions WHERE id = $1', [questionId]);
    if (questionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Insert answer
    const result = await pool.query(
      `INSERT INTO answers (question_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, is_accepted, created_at, updated_at`,
      [questionId, userId, content]
    );

    res.status(201).json({
      message: 'Answer created successfully',
      answer: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating answer:', error);
    res.status(500).json({ error: 'Server error creating answer' });
  }
});

// Vote on question or answer
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const votableId = req.params.id;
    const { votableType, voteType } = req.body; // 'question' or 'answer', 'upvote' or 'downvote'
    const userId = req.user.id;

    if (!['question', 'answer'].includes(votableType)) {
      return res.status(400).json({ error: 'Invalid votable type' });
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // Check if user already voted
    const existingVote = await pool.query(
      'SELECT id, vote_type FROM votes WHERE user_id = $1 AND votable_type = $2 AND votable_id = $3',
      [userId, votableType, votableId]
    );

    if (existingVote.rows.length > 0) {
      // Update existing vote
      if (existingVote.rows[0].vote_type === voteType) {
        // Remove vote if clicking same vote type
        await pool.query(
          'DELETE FROM votes WHERE user_id = $1 AND votable_type = $2 AND votable_id = $3',
          [userId, votableType, votableId]
        );
        return res.json({ message: 'Vote removed', voteType: null });
      } else {
        // Update vote
        await pool.query(
          'UPDATE votes SET vote_type = $1 WHERE user_id = $2 AND votable_type = $3 AND votable_id = $4',
          [voteType, userId, votableType, votableId]
        );
        return res.json({ message: 'Vote updated', voteType });
      }
    } else {
      // Create new vote
      await pool.query(
        'INSERT INTO votes (user_id, votable_type, votable_id, vote_type) VALUES ($1, $2, $3, $4)',
        [userId, votableType, votableId, voteType]
      );
      return res.json({ message: 'Vote added', voteType });
    }
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: 'Server error voting' });
  }
});

// Accept answer
router.patch('/answers/:id/accept', authenticate, async (req, res) => {
  try {
    const answerId = req.params.id;
    const userId = req.user.id;

    // Get answer and question
    const answerResult = await pool.query(
      `SELECT a.id, a.question_id, q.user_id as question_owner_id
       FROM answers a
       INNER JOIN questions q ON q.id = a.question_id
       WHERE a.id = $1`,
      [answerId]
    );

    if (answerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    const answer = answerResult.rows[0];

    // Only question owner can accept answer
    if (answer.question_owner_id !== userId) {
      return res.status(403).json({ error: 'Only question owner can accept answers' });
    }

    // Unaccept all other answers for this question
    await pool.query(
      'UPDATE answers SET is_accepted = FALSE WHERE question_id = $1',
      [answer.question_id]
    );

    // Accept this answer
    await pool.query(
      'UPDATE answers SET is_accepted = TRUE WHERE id = $1',
      [answerId]
    );

    res.json({ message: 'Answer accepted' });
  } catch (error) {
    console.error('Error accepting answer:', error);
    res.status(500).json({ error: 'Server error accepting answer' });
  }
});

module.exports = router;
