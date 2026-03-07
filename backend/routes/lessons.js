const express = require('express');
const {
  getPublicLessons,
  getLessonById,
  getLessonBySlug,
  getSubjectsForLesson
} = require('../contentStore');
const router = express.Router();

// List lessons
router.get('/', async (req, res, next) => {
  try {
    const lessons = await getPublicLessons();
    res.json(lessons);
  } catch (err) {
    next(err);
  }
});

// Get lesson by slug
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const lesson = await getLessonBySlug(slug);
    if (!lesson) return res.status(404).json({ error: 'Not found' });
    res.json(lesson);
  } catch (err) {
    next(err);
  }
});

// Get lesson by id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const lesson = await getLessonById(id);
    if (!lesson) return res.status(404).json({ error: 'Not found' });
    res.json(lesson);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/subjects', async (req, res, next) => {
  try {
    const lessonId = Number(req.params.id);
    const subjects = await getSubjectsForLesson(lessonId);
    res.json(subjects || []);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
