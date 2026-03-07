export function computeDashboardStats(lessons, progress) {
  const lessonList = Array.isArray(lessons) ? lessons : [];
  const totalLessons = lessonList.length;

  const completedLessonIds = Array.isArray(progress?.completedLessonIds)
    ? progress.completedLessonIds.map((id) => Number(id))
    : [];
  const passedQuizLessonIds = Array.isArray(progress?.passedQuizLessonIds)
    ? progress.passedQuizLessonIds.map((id) => Number(id))
    : [];

  const completedLessons = completedLessonIds.length;
  const passedQuizzes = passedQuizLessonIds.length;
  const downloadedLessonPackages = Number(progress?.downloadedLessonPackages) || 0;
  const downloadedSubjects = Number(progress?.downloadedSubjects) || 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const achievementBadges = [];
  if (completedLessons >= 1) achievementBadges.push("First Lesson Completed");
  if (completedLessons >= 3) achievementBadges.push("Learning Momentum: 3 Lessons");
  if (completedLessons >= Math.ceil(totalLessons / 2) && totalLessons > 0) {
    achievementBadges.push("Halfway Milestone");
  }
  if (completedLessons === totalLessons && totalLessons > 0) {
    achievementBadges.push("All Lessons Completed");
  }
  if (passedQuizzes >= 1) achievementBadges.push("First Quiz Passed");
  if (passedQuizzes >= totalLessons && totalLessons > 0) achievementBadges.push("Quiz Master");
  if (downloadedLessonPackages >= 1) achievementBadges.push("Offline Starter");
  if (downloadedSubjects >= 10) achievementBadges.push("Subject Collector");
  if ((progress?.currentStreak || 0) >= 3) achievementBadges.push("3-Day Learning Streak");
  if ((progress?.currentStreak || 0) >= 7) achievementBadges.push("7-Day Learning Streak");

  const certs = (progress?.certificates || []).map((cert) => ({
    id: cert.certId,
    certId: cert.certId,
    lessonId: Number(cert.lessonId),
    title: `${cert.lessonTitle} Certificate`,
    unlocked: true,
    reason: "Unlocked from completed quiz"
  }));

  const completedSet = new Set(completedLessonIds);
  lessonList.forEach((lesson) => {
    const lessonId = Number(lesson.id);
    const already = certs.find((c) => Number(c.lessonId) === lessonId);
    if (!already) {
      certs.push({
        id: `locked-${lessonId}`,
        certId: null,
        lessonId,
        title: `${lesson.title} Certificate`,
        unlocked: completedSet.has(lessonId),
        reason: "Finish the lesson quiz"
      });
    }
  });

  return {
    totalLessons,
    completedLessons,
    passedQuizzes,
    downloadedLessonPackages,
    downloadedSubjects,
    progressPercent,
    achievementBadges,
    certificates: certs.sort((a, b) => Number(a.lessonId) - Number(b.lessonId))
  };
}
