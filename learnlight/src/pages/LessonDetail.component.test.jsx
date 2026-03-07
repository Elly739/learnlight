import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LessonDetail from "./LessonDetail";

vi.mock("../api", () => ({
  addMyDownload: vi.fn(async () => ({ ok: true })),
  getLesson: vi.fn(async () => ({
    id: 1,
    slug: "lesson-one",
    title: "Lesson One",
    description: "Lesson one description"
  })),
  getLessonSubjects: vi.fn(async () => [
    { id: "sub-1", name: "Subject A", description: "A subject", content: "Content A" }
  ]),
  getMyBookmarks: vi.fn(async () => [{ lesson_id: 1 }]),
  getMyLearnerDownloads: vi.fn(async () => [
    { lesson_id: 1, download_type: "lesson" },
    { lesson_id: 1, download_type: "subject", subject_name: "Subject A" }
  ]),
  getMyEnrollments: vi.fn(async () => [{ lesson_id: 1 }]),
  getMyLessonNote: vi.fn(async () => ({ noteText: "Saved note" })),
  getMyProgress: vi.fn(async () => ({ completedLessonIds: [1] })),
  saveMyLessonNote: vi.fn(async () => ({ ok: true })),
  setMyBookmark: vi.fn(async () => ({ ok: true })),
  setMyEnrollment: vi.fn(async () => ({ ok: true }))
}));

describe("LessonDetail component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders backend-derived lesson state and subject actions", async () => {
    render(
      <MemoryRouter initialEntries={["/lessons/1"]}>
        <Routes>
          <Route path="/lessons/:id" element={<LessonDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Lesson One")).toBeInTheDocument();
    expect(await screen.findByText("Entire Lesson Downloaded")).toBeInTheDocument();
    expect(await screen.findByText("Bookmarked")).toBeInTheDocument();
    expect(await screen.findByText("Retake Quiz")).toBeInTheDocument();
    expect(await screen.findByText("Downloaded")).toBeInTheDocument();
  });
});
