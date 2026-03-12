const express = require('express');
const { query } = require('../db');
const { buildQuizForLesson } = require('../quizCatalog');
const { getManagedQuizForLesson } = require('../contentStore');
const jwt = require('jsonwebtoken');
const { validateBody } = require('../middleware/validate');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-dev';

function buildReviewFromQuiz(quiz, answers) {
  const questionById = new Map((quiz.questions || []).map((q) => [Number(q.id), q]));
  let correct = 0;
  const review = [];

  for (const answer of answers) {
    const questionId = Number(answer.questionId);
    const optionId = Number(answer.optionId);
    const question = questionById.get(questionId);
    if (!question) continue;

    const selectedOption = (question.options || []).find((o) => Number(o.id) === optionId) || null;
    const correctOption =
      (question.options || []).find((o) => Number(o.is_correct) === 1 || o.is_correct === true) || null;
    const isCorrect = Boolean(correctOption && Number(correctOption.id) === optionId);

    if (isCorrect) correct += 1;

    const baseExplanation = String(question.explanation || '').trim();
    const explanation = isCorrect
      ? [
          'Correct.',
          baseExplanation || `${correctOption ? correctOption.option_text : 'The chosen option'} matches the expected concept.`
        ]
          .filter(Boolean)
          .join(' ')
      : [
          `Not quite. The correct answer is: ${correctOption ? correctOption.option_text : 'N/A'}.`,
          baseExplanation ||
            `${selectedOption ? selectedOption.option_text : 'Your choice'} does not best match the concept tested by this question.`
        ]
          .filter(Boolean)
          .join(' ');

    review.push({
      questionId,
      questionText: question.question_text || '',
      selectedOptionId: selectedOption ? Number(selectedOption.id) : null,
      selectedOptionText: selectedOption ? selectedOption.option_text : null,
      correctOptionId: correctOption ? Number(correctOption.id) : null,
      correctOptionText: correctOption ? correctOption.option_text : null,
      isCorrect,
      explanation
    });
  }

  return { score: correct, total: answers.length, review };
}

function getOptionalUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch (e) {
    return null;
  }
}

async function inferDifficultyForLesson(userId, lessonId) {
  if (!userId || !lessonId) return 'medium';
  const rows = await query(
    'SELECT score, total FROM quiz_attempts WHERE user_id = ? AND lesson_id = ? ORDER BY created_at DESC, id DESC LIMIT 5',
    [Number(userId), Number(lessonId)]
  );
  if (!rows.length) return 'medium';
  const percents = rows
    .map((r) => {
      const total = Number(r.total) || 0;
      const score = Number(r.score) || 0;
      return total > 0 ? (score / total) * 100 : 0;
    })
    .filter((p) => Number.isFinite(p));
  if (!percents.length) return 'medium';
  const avg = percents.reduce((sum, p) => sum + p, 0) / percents.length;
  if (avg >= 85 && rows.length >= 2) return 'hard';
  if (avg < 60) return 'easy';
  return 'medium';
}

// Get quiz for a lesson (including questions and options)
router.get('/lesson/:lessonId', async (req, res, next) => {
  try {
    const lessonId = Number(req.params.lessonId);

    const managedQuiz = await getManagedQuizForLesson(lessonId);
    if (managedQuiz) {
      const safeQuiz = {
        ...managedQuiz,
        questions: managedQuiz.questions.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          options: (q.options || []).map((o) => ({
            id: o.id,
            option_text: o.option_text
          }))
        }))
      };
      return res.json({ quiz: safeQuiz });
    }

    // Prefer generated curriculum quizzes to guarantee coverage for all lessons.
    const maybeUser = getOptionalUser(req);
    const adaptiveDifficulty = await inferDifficultyForLesson(maybeUser?.id, lessonId);
    const generatedQuiz = buildQuizForLesson(lessonId, adaptiveDifficulty);
    if (generatedQuiz) {
      const safeQuiz = {
        ...generatedQuiz,
        questions: generatedQuiz.questions.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          options: (q.options || []).map((o) => ({
            id: o.id,
            option_text: o.option_text
          }))
        }))
      };
      return res.json({ quiz: safeQuiz });
    }

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
router.post(
  '/submit',
  validateBody([
    { key: 'quizId', type: 'number', required: true, min: 1 },
    { key: 'answers', isArray: true, required: true },
    { key: 'difficulty', type: 'string', maxLen: 20 }
  ]),
  async (req, res, next) => {
  try {
    const { quizId, answers, difficulty } = req.body;
    if (!quizId || !Array.isArray(answers)) return res.status(400).json({ error: 'Invalid payload' });

    const managedRows = await query('SELECT id FROM managed_quizzes WHERE id = ?', [Number(quizId)]);
    if (managedRows.length) {
      const quiz = await getManagedQuizForLessonFromQuizId(Number(quizId));
      if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
      return res.json(buildReviewFromQuiz(quiz, answers));
    }

    // Generated quizzes use id 10000 + lessonId.
    if (Number(quizId) >= 10000) {
      const lessonId = Number(quizId) - 10000;
      const generatedQuiz = buildQuizForLesson(lessonId, difficulty || 'medium');
      if (!generatedQuiz) return res.status(404).json({ error: 'Quiz not found' });
      return res.json(buildReviewFromQuiz(generatedQuiz, answers));
    }

    const quizRows = await query('SELECT id, title FROM quizzes WHERE id = ?', [Number(quizId)]);
    if (!quizRows.length) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = { id: Number(quizId), title: quizRows[0].title, questions: [] };
    const questions = await query('SELECT id, question_text FROM questions WHERE quiz_id = ?', [Number(quizId)]);
    for (const q of questions) {
      const options = await query(
        'SELECT id, option_text, is_correct FROM question_options WHERE question_id = ?',
        [q.id]
      );
      quiz.questions.push({
        id: q.id,
        question_text: q.question_text,
        options
      });
    }
    return res.json(buildReviewFromQuiz(quiz, answers));
  } catch (err) {
    next(err);
  }
});

async function getManagedQuizForLessonFromQuizId(quizId) {
  const rows = await query('SELECT lesson_id FROM managed_quizzes WHERE id = ?', [quizId]);
  if (!rows.length) return null;
  return getManagedQuizForLesson(Number(rows[0].lesson_id));
}

module.exports = router;
