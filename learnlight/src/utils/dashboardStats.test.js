import test from "node:test";
import assert from "node:assert/strict";
import { computeDashboardStats } from "./dashboardStats.js";

test("computeDashboardStats returns expected progress and badges", () => {
  const lessons = [
    { id: 1, title: "Lesson One" },
    { id: 2, title: "Lesson Two" },
    { id: 3, title: "Lesson Three" }
  ];
  const progress = {
    completedLessonIds: [1, 2],
    passedQuizLessonIds: [1, 2],
    downloadedLessonPackages: 1,
    downloadedSubjects: 11,
    currentStreak: 7,
    certificates: [{ certId: "LL-1", lessonId: 1, lessonTitle: "Lesson One" }]
  };

  const result = computeDashboardStats(lessons, progress);
  assert.equal(result.totalLessons, 3);
  assert.equal(result.completedLessons, 2);
  assert.equal(result.progressPercent, 67);
  assert.ok(result.achievementBadges.includes("Offline Starter"));
  assert.ok(result.achievementBadges.includes("Subject Collector"));
  assert.ok(result.achievementBadges.includes("7-Day Learning Streak"));
  assert.equal(result.certificates.length, 3);
  assert.equal(result.certificates[0].certId, "LL-1");
});

test("computeDashboardStats handles empty inputs", () => {
  const result = computeDashboardStats([], null);
  assert.equal(result.totalLessons, 0);
  assert.equal(result.completedLessons, 0);
  assert.equal(result.passedQuizzes, 0);
  assert.equal(result.progressPercent, 0);
  assert.deepEqual(result.achievementBadges, []);
  assert.deepEqual(result.certificates, []);
});
