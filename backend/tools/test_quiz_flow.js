// Simple script to fetch a quiz for a lesson and submit answers programmatically.
// Requires Node 18+ (global fetch). Run: node backend/tools/test_quiz_flow.js

const API = process.env.API_URL || 'http://localhost:4000';
const LESSON_ID = process.argv[2] || '1';

async function run() {
  try {
    console.log(`Fetching quiz for lesson ${LESSON_ID}...`);
    const res = await fetch(`${API}/api/quiz/lesson/${LESSON_ID}`);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GET quiz failed: ${res.status} ${txt}`);
    }
    const body = await res.json();
    const quiz = body.quiz;
    if (!quiz) {
      console.log('No quiz returned.');
      return;
    }

    console.log('Quiz title:', quiz.title || '(no title)');
    const answers = [];
    for (const q of quiz.questions) {
      // pick correct option if present (mock contains is_correct), otherwise choose first
      let chosen = null;
      if (Array.isArray(q.options)) {
        const correct = q.options.find((o) => o.is_correct || o.is_correct === 1 || o.is_correct === true);
        chosen = correct ? correct.id : q.options[0].id;
      }
      answers.push({ questionId: q.id, optionId: chosen });
      console.log(`Question ${q.id} -> choosing option ${chosen}`);
    }

    console.log('Submitting answers...', answers);
    const submit = await fetch(`${API}/api/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: quiz.id, answers }),
    });
    const submitBody = await submit.json();
    console.log('Submit response:', submitBody);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exitCode = 1;
  }
}

run();
