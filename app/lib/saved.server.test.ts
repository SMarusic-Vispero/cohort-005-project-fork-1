import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import {
  MAX_NOTE_LENGTH,
  getNote,
  isBookmarked,
  listBookmarks,
  listNotes,
  saveNote,
  toggleBookmark,
} from "./saved.server";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);
const LATER = new Date(2026, 9, 7, 12, 0, 0);

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonId: number;
let otherLessonId: number;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonId = db
    .insert(schema.lessons)
    .values({ moduleId: module.id, title: "Lesson 1", position: 1 })
    .returning()
    .get().id;
  otherLessonId = db
    .insert(schema.lessons)
    .values({ moduleId: module.id, title: "Lesson 2", position: 2 })
    .returning()
    .get().id;
});

describe("toggling a Bookmark", () => {
  it("bookmarks a Lesson, then removes the Bookmark", () => {
    expect(toggleBookmark(db, base.user.id, lessonId, NOW)).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonId)).toBe(true);

    expect(toggleBookmark(db, base.user.id, lessonId, NOW)).toBe(false);
    expect(isBookmarked(db, base.user.id, lessonId)).toBe(false);
    expect(listBookmarks(db, base.user.id)).toHaveLength(0);
  });

  it("never leaves two Bookmarks on one Lesson", () => {
    toggleBookmark(db, base.user.id, lessonId, NOW);
    expect(() =>
      db
        .insert(schema.bookmarks)
        .values({ userId: base.user.id, lessonId })
        .run()
    ).toThrow();
    expect(listBookmarks(db, base.user.id)).toHaveLength(1);
  });
});

describe("saving a Note", () => {
  it("creates a Note with the body trimmed", () => {
    const result = saveNote(db, base.user.id, lessonId, "  # not a heading  ", NOW);

    expect(result).toMatchObject({
      ok: true,
      note: {
        body: "# not a heading",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
    });
  });

  it("replaces the body and moves the last edited time on", () => {
    saveNote(db, base.user.id, lessonId, "first", NOW);
    saveNote(db, base.user.id, lessonId, "second", LATER);

    expect(getNote(db, base.user.id, lessonId)).toMatchObject({
      body: "second",
      createdAt: NOW.toISOString(),
      updatedAt: LATER.toISOString(),
    });
    expect(listNotes(db, base.user.id)).toHaveLength(1);
  });

  it("removes the Note when saved empty", () => {
    saveNote(db, base.user.id, lessonId, "first", NOW);
    expect(saveNote(db, base.user.id, lessonId, "   ", LATER)).toEqual({
      ok: true,
      note: null,
    });
    expect(getNote(db, base.user.id, lessonId)).toBeUndefined();
  });

  it(`accepts exactly ${MAX_NOTE_LENGTH} characters and refuses one more`, () => {
    expect(
      saveNote(db, base.user.id, lessonId, "a".repeat(MAX_NOTE_LENGTH), NOW).ok
    ).toBe(true);
    expect(
      saveNote(db, base.user.id, lessonId, "b".repeat(MAX_NOTE_LENGTH + 1), LATER)
    ).toMatchObject({ ok: false });
    expect(getNote(db, base.user.id, lessonId)?.body).toBe(
      "a".repeat(MAX_NOTE_LENGTH)
    );
  });
});

describe("the Saved lists", () => {
  it("hold only the Student's own rows, newest first, with Lesson and Course", () => {
    toggleBookmark(db, base.user.id, lessonId, NOW);
    toggleBookmark(db, base.user.id, otherLessonId, LATER);
    toggleBookmark(db, base.instructor.id, lessonId, LATER);
    saveNote(db, base.user.id, otherLessonId, "older", NOW);
    saveNote(db, base.user.id, lessonId, "newer", LATER);
    saveNote(db, base.instructor.id, lessonId, "not yours", LATER);

    expect(listBookmarks(db, base.user.id)).toMatchObject([
      { lessonId: otherLessonId, lessonTitle: "Lesson 2", courseSlug: "test-course" },
      { lessonId, lessonTitle: "Lesson 1", courseTitle: "Test Course" },
    ]);
    expect(listNotes(db, base.user.id)).toMatchObject([
      { body: "newer", lessonId, courseTitle: "Test Course" },
      { body: "older", lessonId: otherLessonId },
    ]);
  });
});
