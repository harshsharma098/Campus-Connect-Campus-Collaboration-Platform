const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all tags
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, COUNT(qt.question_id) as question_count
       FROM tags t
       LEFT JOIN question_tags qt ON qt.tag_id = t.id
       GROUP BY t.id
       ORDER BY question_count DESC, t.name ASC`
    );
    res.json({ tags: result.rows });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Server error fetching tags' });
  }
});

module.exports = router;
