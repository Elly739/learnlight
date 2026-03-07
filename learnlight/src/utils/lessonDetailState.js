export function buildLessonDetailState(lessonId, progress, learnerDownloads, bookmarks, note, enrollments) {
  const safeLessonId = Number(lessonId);

  const completedIds = (progress?.completedLessonIds || []).map((x) => Number(x));
  const completed = completedIds.includes(safeLessonId);

  const downloads = Array.isArray(learnerDownloads) ? learnerDownloads : [];
  const downloadedLesson = downloads.some(
    (d) => Number(d.lesson_id) === safeLessonId && d.download_type === "lesson"
  );

  const downloadedSubjects = downloads
    .filter((d) => Number(d.lesson_id) === safeLessonId && d.download_type === "subject")
    .map((d) => String(d.subject_name || ""));

  const marks = Array.isArray(bookmarks) ? bookmarks : [];
  const bookmarked = marks.some((b) => Number(b.lesson_id) === safeLessonId);

  const enrolledIds = (enrollments || []).map((r) => Number(r.lesson_id));
  const enrolled = enrolledIds.includes(safeLessonId);

  return {
    completed,
    downloadedLesson,
    downloadedSubjects,
    bookmarked,
    noteText: note?.noteText || "",
    enrolled
  };
}

export function getEmptyLessonDetailState() {
  return {
    completed: false,
    downloadedLesson: false,
    downloadedSubjects: [],
    bookmarked: false,
    noteText: "",
    enrolled: false
  };
}
