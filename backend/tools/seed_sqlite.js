// Seed a local SQLite database (backend/data.sqlite) with the mock data.
// Usage: npm install sqlite3 && node backend/tools/seed_sqlite.js

const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, '..', 'data.sqlite');
    const db = new sqlite3.Database(dbPath);
    // Embedded seed data (previously in ../mockData)
    const mock = {
      lessons: [
        { id: 1, title: 'Intro to Spanish', slug: 'intro-spanish', description: 'Basics of Spanish', order: 1 },
          { id: 2, title: 'Advanced Spanish', slug: 'adv-spanish', description: 'Advanced topics', order: 2 },
          { id: 3, title: 'Addition Basics', slug: 'addition-basics', description: 'Learn addition', order: 1 },
          { id: 4, title: 'Subtraction Basics', slug: 'subtraction-basics', description: 'Learn subtraction', order: 2 },
          { id: 5, title: 'Computer Basics', slug: 'computer-basics', description: 'Intro to computers', order: 1 },
          { id: 6, title: 'Internet Safety', slug: 'internet-safety', description: 'Staying safe online', order: 2 }
      ],
      downloads: [
        { id: 1, lesson_id: 1, filename: 'cheatsheet.pdf', url: '/downloads/cheatsheet.pdf', description: 'Quick reference' }
      ],
      quizzes: [
        {
          id: 1,
          lesson_id: 1,
          title: 'Spanish Basics',
          questions: [
            {
              id: 1,
              question_text: 'What is the Spanish word for "hello"?',
              options: [
                { id: 1, option_text: 'Hola', is_correct: true },
                { id: 2, option_text: 'Adiós', is_correct: false }
              ]
            },
            {
              id: 2,
              question_text: 'Select the Spanish word for "thank you".',
              options: [
                { id: 3, option_text: 'Gracias', is_correct: true },
                { id: 4, option_text: 'Por favor', is_correct: false }
              ]
            }
          ]
        }
      ]
    };

    const runAsync = (sql, params=[]) => new Promise((res, rej) => db.run(sql, params, function(err){ if(err) rej(err); else res(this); }));
    const allAsync = (sql, params=[]) => new Promise((res, rej) => db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));

    // Create tables (if missing)
    await runAsync(`CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, title TEXT, slug TEXT UNIQUE, description TEXT, content TEXT, "order" INTEGER)`);
    await runAsync(`CREATE TABLE IF NOT EXISTS downloads (id INTEGER PRIMARY KEY, lesson_id INTEGER, filename TEXT, url TEXT, description TEXT)`);
    await runAsync(`CREATE TABLE IF NOT EXISTS quizzes (id INTEGER PRIMARY KEY, lesson_id INTEGER, title TEXT)`);
    await runAsync(`CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, quiz_id INTEGER, question_text TEXT)`);
    await runAsync(`CREATE TABLE IF NOT EXISTS question_options (id INTEGER PRIMARY KEY, question_id INTEGER, option_text TEXT, is_correct INTEGER DEFAULT 0)`);

    // Clear existing seeded rows (keep DB file if locked)
    await runAsync('DELETE FROM lessons');
    await runAsync('DELETE FROM downloads');
    await runAsync('DELETE FROM quizzes');
    await runAsync('DELETE FROM questions');
    await runAsync('DELETE FROM question_options');

    // Insert lessons
    for (const l of mock.lessons) {
      await runAsync('INSERT INTO lessons (id, title, slug, description, "order") VALUES (?, ?, ?, ?, ?)', [l.id, l.title, l.slug, l.description, l.order]);
    }

    for (const d of mock.downloads) {
      await runAsync('INSERT INTO downloads (id, lesson_id, filename, url, description) VALUES (?, ?, ?, ?, ?)', [d.id, d.lesson_id, d.filename, d.url, d.description]);
    }

    for (const q of mock.quizzes) {
      await runAsync('INSERT INTO quizzes (id, lesson_id, title) VALUES (?, ?, ?)', [q.id, q.lesson_id, q.title]);
      for (const qq of q.questions) {
        await runAsync('INSERT INTO questions (id, quiz_id, question_text) VALUES (?, ?, ?)', [qq.id, q.id, qq.question_text]);
        for (const o of qq.options) {
          await runAsync('INSERT INTO question_options (id, question_id, option_text, is_correct) VALUES (?, ?, ?, ?)', [o.id, qq.id, o.option_text, o.is_correct ? 1 : 0]);
        }
      }
    }

    console.log('SQLite DB seeded at', dbPath);
    db.close();
  } catch (err) {
    console.error('Failed to seed SQLite DB:', err.message || err);
    process.exitCode = 1;
  }
}

run();
