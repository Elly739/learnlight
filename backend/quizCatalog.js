const LESSON_CATALOG = require('./lessonCatalog');

const LESSON_SUBJECTS = {
  "foundations-of-digital-learning": [
    { name: "Learning science basics", description: "how people retain information effectively" },
    { name: "Study workflows and note-taking", description: "SRS, Cornell, and Zettelkasten methods" },
    { name: "Goal setting and learning metrics", description: "using OKRs and measurable progress" },
    { name: "Digital literacy and internet research skills", description: "finding and evaluating online sources" },
    { name: "Time management for deep work", description: "focus systems for high-quality study sessions" }
  ],
  "web-development-frontend": [
    { name: "HTML and semantic markup", description: "structuring pages with meaningful HTML" },
    { name: "CSS fundamentals and responsive design", description: "building layouts that adapt across screens" },
    { name: "JavaScript essentials", description: "DOM, events, and core scripting concepts" },
    { name: "React fundamentals", description: "components, state, and interactive interfaces" },
    { name: "Accessibility and performance optimization", description: "inclusive UX and faster page behavior" }
  ],
  "web-development-backend-apis": [
    { name: "Node.js basics and REST API design", description: "building maintainable backend endpoints" },
    { name: "Databases: SQL vs NoSQL fundamentals", description: "comparing relational and document models" },
    { name: "Authentication and authorization", description: "JWT, OAuth, and access control" },
    { name: "API testing workflows", description: "testing with Postman and Insomnia" },
    { name: "Server deployment basics", description: "process managers and environment configuration" }
  ],
  "mobile-app-development": [
    { name: "Cross-platform basics", description: "React Native and Expo fundamentals" },
    { name: "App navigation and state management", description: "screen flows and predictable app state" },
    { name: "Local storage and offline-first patterns", description: "persistent data for low-connectivity use" },
    { name: "Push notifications and device integration", description: "native device capabilities in apps" },
    { name: "App testing and store submission basics", description: "preparing stable app store releases" }
  ],
  "data-science-ml-intro": [
    { name: "Data cleaning and exploratory analysis", description: "pandas basics for preparation and analysis" },
    { name: "Data visualization and storytelling", description: "communicating insights with charts and dashboards" },
    { name: "Supervised learning essentials", description: "classification and regression fundamentals" },
    { name: "Model evaluation and validation", description: "overfitting prevention and cross-validation" },
    { name: "Basics of deploying a model", description: "wrapping models in simple APIs and demos" }
  ],
  "algorithms-data-structures": [
    { name: "Big-O and algorithmic thinking", description: "time and space complexity tradeoffs" },
    { name: "Arrays, linked lists, stacks, queues", description: "core linear data structures" },
    { name: "Trees and graphs", description: "traversal basics and common use-cases" },
    { name: "Sorting and searching fundamentals", description: "comparing algorithm behavior and performance" },
    { name: "Problem-solving patterns", description: "two pointers and sliding window techniques" }
  ],
  "software-engineering-architecture": [
    { name: "Design patterns and SOLID principles", description: "maintainable architecture principles" },
    { name: "Modular architecture and microservices intro", description: "service decomposition for scale" },
    { name: "Testing strategy", description: "unit, integration, and end-to-end test layers" },
    { name: "CI/CD basics and release workflows", description: "automated quality gates and deployment flow" },
    { name: "Code review and repository hygiene", description: "collaborative quality and clean history" }
  ],
  "devops-cloud-fundamentals": [
    { name: "Cloud basics", description: "IaaS and PaaS concepts" },
    { name: "Containers and Docker intro", description: "packaging apps consistently for deployment" },
    { name: "CI pipelines", description: "automation with GitHub Actions and similar tools" },
    { name: "Monitoring and logs", description: "observability, metrics, and basic alerts" },
    { name: "Cost awareness and infra budgeting", description: "controlling cloud spending while scaling" }
  ],
  "ui-ux-product-design": [
    { name: "Design thinking and user research basics", description: "discovering user needs and pain points" },
    { name: "Wireframing and prototyping", description: "Figma basics for iterative design" },
    { name: "Visual systems", description: "typography, color, and grid consistency" },
    { name: "Usability testing and iteration loops", description: "feedback-driven interface improvement" },
    { name: "High-fidelity demo flows", description: "pitch-ready product walkthroughs" }
  ],
  "cybersecurity-privacy-essentials": [
    { name: "Secure authentication patterns", description: "password hygiene and MFA practices" },
    { name: "Data privacy basics", description: "PII handling and foundational GDPR ideas" },
    { name: "Input validation and common web vulnerabilities", description: "OWASP Top 10 awareness" },
    { name: "Backup and disaster recovery basics", description: "resilience and recovery planning" },
    { name: "Secure deployment checklist", description: "pre-release security verification" }
  ],
  "career-soft-skills-tech-students": [
    { name: "Resume and GitHub portfolio polish", description: "clear presentation of project experience" },
    { name: "Interview prep", description: "whiteboard and behavioral interview readiness" },
    { name: "Networking and LinkedIn growth playbook", description: "building visibility and professional connections" },
    { name: "Project-based learning and storytelling", description: "turning projects into strong case studies" },
    { name: "Time management for side-projects and studies", description: "balancing practical work and academics" }
  ],
  "entrepreneurship-product-strategy": [
    { name: "Problem validation and customer interviews", description: "confirming real market pain points" },
    { name: "Business models for edtech", description: "B2C, B2B, and freemium models" },
    { name: "MVP planning and growth experiments", description: "testing assumptions with fast iterations" },
    { name: "Metrics that matter", description: "LTV, CAC, activation, and traction indicators" },
    { name: "Pitching basics and investor deck", description: "clear narrative for one-page pitch communication" }
  ]
};

function buildQuestion(lessonId, qIndex, subject, otherNames) {
  const questionId = lessonId * 100 + (qIndex + 1);
  const optionBase = lessonId * 1000 + (qIndex + 1) * 10;
  const options = [
    { id: optionBase + 1, option_text: subject.name, is_correct: 1 },
    { id: optionBase + 2, option_text: otherNames[0], is_correct: 0 },
    { id: optionBase + 3, option_text: otherNames[1], is_correct: 0 },
    { id: optionBase + 4, option_text: otherNames[2], is_correct: 0 }
  ];
  return {
    id: questionId,
    question_text: `In "${subject.lessonTitle}", which topic focuses on "${subject.description}"?`,
    explanation: `"${subject.name}" is the topic that directly addresses "${subject.description}" in this lesson.`,
    options
  };
}

function buildDefinitionQuestion(lessonId, qIndex, subject, difficulty = 'medium') {
  const questionId = lessonId * 100 + (qIndex + 1);
  const optionBase = lessonId * 1000 + (qIndex + 1) * 10;
  const prompt =
    difficulty === 'easy'
      ? `Which option best describes "${subject.name}"?`
      : `What is the best description of "${subject.name}" in this lesson?`;
  return {
    id: questionId,
    question_text: prompt,
    explanation: `In this lesson, "${subject.name}" is defined as "${subject.description}".`,
    options: [
      { id: optionBase + 1, option_text: subject.description, is_correct: 1 },
      { id: optionBase + 2, option_text: "Managing office printers and paper inventory", is_correct: 0 },
      { id: optionBase + 3, option_text: "Cooking methods for large restaurants", is_correct: 0 },
      { id: optionBase + 4, option_text: "Unrelated historical timelines", is_correct: 0 }
    ]
  };
}

function buildAppliedQuestion(lessonId, qIndex, subject, otherSubjects) {
  const questionId = lessonId * 100 + (qIndex + 1);
  const optionBase = lessonId * 1000 + (qIndex + 1) * 10;
  const distractorA = otherSubjects[0]?.description || "Unrelated operations process";
  const distractorB = otherSubjects[1]?.description || "General management guideline";
  const distractorC = otherSubjects[2]?.description || "Basic administrative policy";
  return {
    id: questionId,
    question_text: `A learner struggles with "${subject.description}". Which topic should they revise first?`,
    explanation: `If the challenge is "${subject.description}", the best next topic is "${subject.name}".`,
    options: [
      { id: optionBase + 1, option_text: subject.name, is_correct: 1 },
      { id: optionBase + 2, option_text: distractorA, is_correct: 0 },
      { id: optionBase + 3, option_text: distractorB, is_correct: 0 },
      { id: optionBase + 4, option_text: distractorC, is_correct: 0 }
    ]
  };
}

function buildQuizForLesson(lessonId, difficulty = 'medium') {
  const lesson = LESSON_CATALOG.find((l) => l.id === Number(lessonId));
  if (!lesson) return null;
  const subjects = LESSON_SUBJECTS[lesson.slug] || [];
  if (!subjects.length) return null;

  const namedSubjects = subjects.map((s) => ({ ...s, lessonTitle: lesson.title }));
  const subjectNames = namedSubjects.map((s) => s.name);
  const questions = [];
  const mode = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';

  if (mode === 'easy') {
    for (let i = 0; i < 10; i += 1) {
      const subject = namedSubjects[i % namedSubjects.length];
      questions.push(buildDefinitionQuestion(lesson.id, questions.length, subject, 'easy'));
    }
  } else if (mode === 'hard') {
    for (let i = 0; i < 5; i += 1) {
      const subject = namedSubjects[i % namedSubjects.length];
      const distractors = subjectNames.filter((n) => n !== subject.name).slice(0, 3);
      questions.push(buildQuestion(lesson.id, questions.length, subject, distractors));
    }
    for (let i = 0; i < 5; i += 1) {
      const subject = namedSubjects[i % namedSubjects.length];
      const others = namedSubjects.filter((s) => s.name !== subject.name);
      questions.push(buildAppliedQuestion(lesson.id, questions.length, subject, others));
    }
  } else {
    // medium default: balanced recognition + definition
    for (let i = 0; i < 5; i += 1) {
      const subject = namedSubjects[i % namedSubjects.length];
      const distractors = subjectNames.filter((n) => n !== subject.name).slice(0, 3);
      questions.push(buildQuestion(lesson.id, questions.length, subject, distractors));
    }
    for (let i = 0; i < 5; i += 1) {
      const subject = namedSubjects[i % namedSubjects.length];
      questions.push(buildDefinitionQuestion(lesson.id, questions.length, subject, 'medium'));
    }
  }

  return {
    id: 10000 + lesson.id,
    lesson_id: lesson.id,
    title: `${lesson.title} Quiz`,
    difficulty: mode,
    questions
  };
}

function getCorrectOptionIds(quiz) {
  const map = new Map();
  for (const q of quiz.questions || []) {
    const correct = (q.options || []).find((o) => Number(o.is_correct) === 1);
    if (correct) map.set(Number(q.id), Number(correct.id));
  }
  return map;
}

module.exports = {
  buildQuizForLesson,
  getCorrectOptionIds
};
