// Seed a local SQLite database (backend/data.sqlite) with the mock data.
// Usage: npm install sqlite3 && node backend/tools/seed_sqlite.js

const path = require('path');

async function run() {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, '..', 'data.sqlite');
    const db = new sqlite3.Database(dbPath);

    const mock = {
      lessons: [
        { id: 1, title: 'Foundations of Digital Learning', slug: 'foundations-of-digital-learning', description: 'Sets the stage with onboarding, learning science, digital literacy, and deep-work habits.', order: 1 },
        { id: 2, title: 'Web Development - Frontend', slug: 'web-development-frontend', description: 'Build strong UI foundations with HTML, CSS, JavaScript, React, accessibility, and performance.', order: 2 },
        { id: 3, title: 'Web Development - Backend and APIs', slug: 'web-development-backend-apis', description: 'Learn Node.js, API design, databases, auth, testing workflows, and deployment basics.', order: 3 },
        { id: 4, title: 'Mobile App Development', slug: 'mobile-app-development', description: 'Create cross-platform apps with navigation, state, offline patterns, and store-readiness.', order: 4 },
        { id: 5, title: 'Data Science and Machine Learning Intro', slug: 'data-science-ml-intro', description: 'Cover data analysis, visualization, ML foundations, validation, and simple deployment patterns.', order: 5 },
        { id: 6, title: 'Algorithms and Data Structures', slug: 'algorithms-data-structures', description: 'Build technical rigor with complexity analysis, core structures, and problem-solving patterns.', order: 6 },
        { id: 7, title: 'Software Engineering and Architecture', slug: 'software-engineering-architecture', description: 'Design maintainable systems with patterns, modularity, testing strategy, and release discipline.', order: 7 },
        { id: 8, title: 'DevOps and Cloud Fundamentals', slug: 'devops-cloud-fundamentals', description: 'Understand cloud models, containers, CI pipelines, monitoring, and infrastructure cost awareness.', order: 8 },
        { id: 9, title: 'UI/UX and Product Design', slug: 'ui-ux-product-design', description: 'Shape product experiences with research, wireframing, visual systems, usability testing, and demos.', order: 9 },
        { id: 10, title: 'Cybersecurity and Privacy Essentials', slug: 'cybersecurity-privacy-essentials', description: 'Improve trust and compliance with secure auth, privacy, validation, resilience, and deployment checks.', order: 10 },
        { id: 11, title: 'Career and Soft Skills for Tech Students', slug: 'career-soft-skills-tech-students', description: 'Improve outcomes with portfolio polish, interview prep, networking, and project storytelling.', order: 11 },
        { id: 12, title: 'Entrepreneurship and Product Strategy', slug: 'entrepreneurship-product-strategy', description: 'Go from idea to pitch through validation, business models, MVP experiments, and investor communication.', order: 12 }
      ],
      downloads: [],
      quizzes: [
        {
          id: 1,
          lesson_id: 1,
          title: 'Foundations Quiz',
          questions: [
            {
              id: 1,
              question_text: 'Which note-taking system is listed in this lesson?',
              options: [
                { id: 1, option_text: 'Zettelkasten', is_correct: true },
                { id: 2, option_text: 'Binary Heap Notes', is_correct: false }
              ]
            },
            {
              id: 2,
              question_text: 'What framework is used for student goal tracking here?',
              options: [
                { id: 3, option_text: 'OKRs', is_correct: true },
                { id: 4, option_text: 'TCP/IP', is_correct: false }
              ]
            }
          ]
        }
      ]
    };

    const runAsync = (sql, params = []) =>
      new Promise((res, rej) => db.run(sql, params, function (err) {
        if (err) rej(err);
        else res(this);
      }));

    await runAsync('CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, title TEXT, slug TEXT UNIQUE, description TEXT, content TEXT, "order" INTEGER)');
    await runAsync('CREATE TABLE IF NOT EXISTS downloads (id INTEGER PRIMARY KEY, lesson_id INTEGER, filename TEXT, url TEXT, description TEXT)');
    await runAsync('CREATE TABLE IF NOT EXISTS quizzes (id INTEGER PRIMARY KEY, lesson_id INTEGER, title TEXT)');
    await runAsync('CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, quiz_id INTEGER, question_text TEXT)');
    await runAsync('CREATE TABLE IF NOT EXISTS question_options (id INTEGER PRIMARY KEY, question_id INTEGER, option_text TEXT, is_correct INTEGER DEFAULT 0)');

    await runAsync('DELETE FROM lessons');
    await runAsync('DELETE FROM downloads');
    await runAsync('DELETE FROM quizzes');
    await runAsync('DELETE FROM questions');
    await runAsync('DELETE FROM question_options');

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
