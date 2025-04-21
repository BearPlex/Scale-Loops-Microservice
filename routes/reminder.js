const express = require('express');
const router = express.Router();
const validateReminder = require('../utils/validateReminder');

router.post('/', async (req, res) => {
  try {
    validateReminder(req.body);
    res.json(reminder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
