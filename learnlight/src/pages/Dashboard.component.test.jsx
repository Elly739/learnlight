import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Test User", cohort: "CS-2026-A" },
    saveProfile: vi.fn(async () => true)
  })
}));

vi.mock("../api", () => ({
  getLessons: vi.fn(async () => [
    { id: 1, title: "Lesson One" },
    { id: 2, title: "Lesson Two" }
  ]),
  getMyEnrollments: vi.fn(async () => [{ lesson_id: 2, enrolled_at: "2026-03-01 09:00:00" }]),
  getMyProgress: vi.fn(async () => ({
    completedLessonIds: [1],
    passedQuizLessonIds: [1],
    latestQuizByLesson: [],
    downloadedLessonPackages: 1,
    downloadedSubjects: 2,
    currentStreak: 3,
    longestStreak: 5,
    certificates: [{ certId: "LL-CERT-1", lessonId: 1, lessonTitle: "Lesson One" }]
  })),
  getWeeklyLeaderboard: vi.fn(async ({ scope }) => {
    if (scope === "mine") {
      return {
        cohort: "CS-2026-A",
        top: [{ userId: 1, rank: 1, name: "Test User", lessonsCompleted: 1, avgQuizPercent: 90 }],
        me: { rank: 1, lessonsCompleted: 1, avgQuizPercent: 90 }
      };
    }
    return {
      top: [{ userId: 1, rank: 1, name: "Test User", lessonsCompleted: 1, avgQuizPercent: 90 }],
      me: { rank: 1, lessonsCompleted: 1, avgQuizPercent: 90 }
    };
  }),
  getMyProfile: vi.fn(async () => ({ name: "Test User", cohort: "CS-2026-A" })),
  getDueReminders: vi.fn(async () => ({ reminders: [] })),
  getReminderPreferences: vi.fn(async () => ({
    emailEnabled: false,
    pushEnabled: true,
    dailyTime: "18:00",
    timezone: "UTC"
  })),
  saveReminderPreferences: vi.fn(async () => ({ ok: true }))
}));

describe("Dashboard component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders backend-driven progress and certificate actions", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText(/50% completed/i)).toBeInTheDocument();
    expect(await screen.findByText("Open Certificate")).toBeInTheDocument();
    expect(await screen.findByText("Current Streak: 3 day(s)")).toBeInTheDocument();
    expect(await screen.findByText("Certificates Earned")).toBeInTheDocument();
    expect(await screen.findByText("Current Streak")).toBeInTheDocument();
    expect(await screen.findByText("Resume Lesson")).toBeInTheDocument();
  });
});
