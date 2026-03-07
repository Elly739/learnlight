import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLessonDetailState,
  getEmptyLessonDetailState
} from "./lessonDetailState.js";

test("buildLessonDetailState maps backend payload to UI state", () => {
  const state = buildLessonDetailState(
    2,
    { completedLessonIds: [1, 2] },
    [
      { lesson_id: 2, download_type: "lesson" },
      { lesson_id: 2, download_type: "subject", subject_name: "Topic A" },
      { lesson_id: 3, download_type: "subject", subject_name: "Other Lesson" }
    ],
    [{ lesson_id: 2 }],
    { noteText: "My note" },
    [{ lesson_id: 2 }]
  );

  assert.equal(state.completed, true);
  assert.equal(state.downloadedLesson, true);
  assert.deepEqual(state.downloadedSubjects, ["Topic A"]);
  assert.equal(state.bookmarked, true);
  assert.equal(state.noteText, "My note");
  assert.equal(state.enrolled, true);
});

test("getEmptyLessonDetailState returns cleared fallback state", () => {
  const state = getEmptyLessonDetailState();
  assert.deepEqual(state, {
    completed: false,
    downloadedLesson: false,
    downloadedSubjects: [],
    bookmarked: false,
    noteText: "",
    enrolled: false
  });
});
