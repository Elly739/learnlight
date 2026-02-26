const express = require('express');
const { query } = require('../db');
const router = express.Router();

// Get quiz for a lesson (including questions and options)
router.get('/lesson/:lessonId', async (req, res, next) => {
  try {
    const lessonId = req.params.lessonId;
    const quizzes = await query('SELECT id, title FROM quizzes WHERE lesson_id = ?', [lessonId]);
    if (!quizzes.length) {
      return res.status(404).json({ error: 'No quiz for lesson' });
    }
    const quiz = quizzes[0];
    const questions = await query('SELECT id, question_text FROM questions WHERE quiz_id = ?', [quiz.id]);
    for (const q of questions) {
      // retrieve only id and option_text so we don't expose is_correct
      q.options = await query('SELECT id, option_text FROM question_options WHERE question_id = ?', [q.id]);
      if (!Array.isArray(q.options)) q.options = [];
    }
    // deep-clone to ensure only plain JSON-safe values are sent
    const payload = JSON.parse(JSON.stringify({ quiz: { ...quiz, questions } }));
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// Submit quiz answers: { quizId, answers: [{ questionId, optionId }] }
router.post('/submit', async (req, res, next) => {
  try {
    const { quizId, answers } = req.body;
    if (!quizId || !Array.isArray(answers)) return res.status(400).json({ error: 'Invalid payload' });
    let correct = 0;
    for (const a of answers) {
      const optId = Number(a.optionId);
      const rows = await query('SELECT is_correct FROM question_options WHERE id = ? AND question_id IN (SELECT id FROM questions WHERE quiz_id = ?)', [optId, quizId]);
      if (rows.length && rows[0].is_correct) correct++;
    }
    const score = correct;
    res.json({ score, total: answers.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
