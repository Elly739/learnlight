const LESSON_SUBJECTS = {
  "foundations-of-digital-learning": [
    {
      id: "learning-science-basics",
      name: "Learning science basics",
      description: "How people retain information effectively."
    },
    {
      id: "study-workflows-note-taking",
      name: "Study workflows and note-taking",
      description: "SRS, Cornell, and Zettelkasten methods."
    },
    {
      id: "goal-setting-learning-metrics",
      name: "Goal setting and learning metrics",
      description: "Using OKRs and measurable progress for students."
    },
    {
      id: "digital-literacy-research",
      name: "Digital literacy and internet research skills",
      description: "Finding, evaluating, and using online sources."
    },
    {
      id: "time-management-deep-work",
      name: "Time management for deep work",
      description: "Focus systems for high-quality study sessions."
    }
  ],
  "web-development-frontend": [
    {
      id: "html-semantic-markup",
      name: "HTML and semantic markup",
      description: "Structure web pages with meaningful HTML."
    },
    {
      id: "css-responsive-design",
      name: "CSS fundamentals and responsive design",
      description: "Create layouts that adapt across screen sizes."
    },
    {
      id: "javascript-essentials",
      name: "JavaScript essentials",
      description: "DOM manipulation, events, and core scripting concepts."
    },
    {
      id: "react-fundamentals",
      name: "Modern frameworks (React fundamentals)",
      description: "Build interactive UIs with components and state."
    },
    {
      id: "accessibility-performance",
      name: "Accessibility and performance optimization",
      description: "Improve inclusivity and load/runtime performance."
    }
  ],
  "web-development-backend-apis": [
    {
      id: "node-rest-api-design",
      name: "Node.js basics and REST API design",
      description: "Build maintainable backend services and endpoints."
    },
    {
      id: "sql-nosql-fundamentals",
      name: "Databases: SQL vs NoSQL fundamentals",
      description: "Compare storage models and practical use-cases."
    },
    {
      id: "auth-jwt-oauth",
      name: "Authentication and authorization",
      description: "JWT, OAuth, and access-control concepts."
    },
    {
      id: "api-testing-workflows",
      name: "API testing workflows",
      description: "Postman and Insomnia testing practices."
    },
    {
      id: "server-deployment-basics",
      name: "Server deployment basics",
      description: "Process managers, environments, and deployment setup."
    }
  ],
  "mobile-app-development": [
    {
      id: "cross-platform-basics",
      name: "Cross-platform basics",
      description: "React Native and Expo fundamentals."
    },
    {
      id: "app-navigation-state",
      name: "App navigation and state management",
      description: "Screen flows and predictable app state."
    },
    {
      id: "local-storage-offline-first",
      name: "Local storage and offline-first patterns",
      description: "Persist data and support low-connectivity usage."
    },
    {
      id: "push-notifications-device",
      name: "Push notifications and device integration",
      description: "Connect app features to native device capabilities."
    },
    {
      id: "app-testing-store-submission",
      name: "App testing and store submission basics",
      description: "Prepare stable builds for app store delivery."
    }
  ],
  "data-science-ml-intro": [
    {
      id: "data-cleaning-eda",
      name: "Data cleaning and exploratory analysis",
      description: "Pandas basics for preparing and understanding data."
    },
    {
      id: "data-visualization-storytelling",
      name: "Data visualization and storytelling",
      description: "Communicate insights with charts and dashboards."
    },
    {
      id: "supervised-learning-essentials",
      name: "Supervised learning essentials",
      description: "Classification and regression fundamentals."
    },
    {
      id: "model-evaluation-validation",
      name: "Model evaluation and validation",
      description: "Overfitting prevention and cross-validation basics."
    },
    {
      id: "model-deployment-basics",
      name: "Basics of deploying a model",
      description: "Wrap models in APIs and simple product demos."
    }
  ],
  "algorithms-data-structures": [
    {
      id: "big-o-thinking",
      name: "Big-O and algorithmic thinking",
      description: "Reason about time/space complexity tradeoffs."
    },
    {
      id: "core-linear-structures",
      name: "Arrays, linked lists, stacks, queues",
      description: "Master foundational linear data structures."
    },
    {
      id: "trees-graphs-basics",
      name: "Trees and graphs",
      description: "Understand structure traversal and use-cases."
    },
    {
      id: "sorting-searching",
      name: "Sorting and searching fundamentals",
      description: "Implement and compare common algorithms."
    },
    {
      id: "problem-solving-patterns",
      name: "Problem-solving patterns",
      description: "Two pointers, sliding window, and related patterns."
    }
  ],
  "software-engineering-architecture": [
    {
      id: "design-patterns-solid",
      name: "Design patterns and SOLID principles",
      description: "Apply maintainable OOP and architecture principles."
    },
    {
      id: "modular-architecture-microservices",
      name: "Modular architecture and microservices intro",
      description: "Structure services for growth and maintainability."
    },
    {
      id: "testing-strategy",
      name: "Testing strategy",
      description: "Unit, integration, and end-to-end testing layers."
    },
    {
      id: "cicd-release-workflows",
      name: "CI/CD basics and release workflows",
      description: "Automate quality checks and deployment flow."
    },
    {
      id: "code-review-repo-hygiene",
      name: "Code review and repository hygiene",
      description: "Keep collaboration and codebase quality high."
    }
  ],
  "devops-cloud-fundamentals": [
    {
      id: "cloud-iaas-paas",
      name: "Cloud basics",
      description: "Understand IaaS and PaaS concepts."
    },
    {
      id: "containers-docker-intro",
      name: "Containers and Docker intro",
      description: "Package applications consistently for deployment."
    },
    {
      id: "ci-pipelines",
      name: "CI pipelines",
      description: "GitHub Actions and basic pipeline design."
    },
    {
      id: "monitoring-logs-alerts",
      name: "Monitoring and logs",
      description: "Prometheus concepts and practical alerting basics."
    },
    {
      id: "cost-awareness-budgeting",
      name: "Cost awareness and infra budgeting",
      description: "Manage cloud spending while scaling services."
    }
  ],
  "ui-ux-product-design": [
    {
      id: "design-thinking-research",
      name: "Design thinking and user research basics",
      description: "Discover user needs and product opportunity space."
    },
    {
      id: "wireframing-prototyping",
      name: "Wireframing and prototyping",
      description: "Figma basics for interaction design workflows."
    },
    {
      id: "visual-systems",
      name: "Visual systems",
      description: "Typography, color, and grid systems for UI consistency."
    },
    {
      id: "usability-testing-iteration",
      name: "Usability testing and iteration loops",
      description: "Collect feedback and improve product usability quickly."
    },
    {
      id: "high-fidelity-demo-flows",
      name: "Creating high-fidelity demo flows for pitch",
      description: "Design compelling walkthroughs for stakeholders."
    }
  ],
  "cybersecurity-privacy-essentials": [
    {
      id: "secure-auth-patterns",
      name: "Secure authentication patterns",
      description: "Password hygiene, MFA, and secure login practices."
    },
    {
      id: "data-privacy-basics",
      name: "Data privacy basics",
      description: "PII handling and foundational GDPR concepts."
    },
    {
      id: "input-validation-owasp",
      name: "Input validation and common web vulnerabilities",
      description: "OWASP Top 10 awareness and prevention basics."
    },
    {
      id: "backup-disaster-recovery",
      name: "Backup and disaster recovery basics",
      description: "Protect data and restore operations reliably."
    },
    {
      id: "secure-deployment-checklist",
      name: "Secure deployment checklist",
      description: "Review practical controls before release."
    }
  ],
  "career-soft-skills-tech-students": [
    {
      id: "resume-github-polish",
      name: "Resume and GitHub portfolio polish",
      description: "Present projects clearly for employers and partners."
    },
    {
      id: "interview-prep",
      name: "Interview prep",
      description: "Whiteboard and behavioral interview readiness."
    },
    {
      id: "networking-linkedin",
      name: "Networking and LinkedIn growth playbook",
      description: "Build relationships and visibility in tech communities."
    },
    {
      id: "project-storytelling",
      name: "Project-based learning and storytelling",
      description: "Craft strong case-study narratives from project work."
    },
    {
      id: "time-management-side-projects",
      name: "Time management for side-projects and studies",
      description: "Balance academic and practical growth effectively."
    }
  ],
  "entrepreneurship-product-strategy": [
    {
      id: "problem-validation-interviews",
      name: "Problem validation and customer interviews",
      description: "Confirm real user pain before building solutions."
    },
    {
      id: "edtech-business-models",
      name: "Business models for edtech",
      description: "B2C, B2B, and freemium strategy fundamentals."
    },
    {
      id: "mvp-growth-experiments",
      name: "MVP planning and growth experiments",
      description: "Test assumptions rapidly with measurable experiments."
    },
    {
      id: "metrics-that-matter",
      name: "Metrics that matter",
      description: "LTV, CAC, activation, and decision-making metrics."
    },
    {
      id: "pitching-investor-deck",
      name: "Pitching basics and one-page investor deck",
      description: "Communicate product vision and traction clearly."
    }
  ]
};

export default LESSON_SUBJECTS;
