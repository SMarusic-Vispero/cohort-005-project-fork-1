import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createLandingPage, FEATURED_COURSE_LIMIT } from "../index.server";

let db: TestDb;
let instructorId: number;
let categoryId: number;
let baseCourseId: number;

beforeEach(() => {
  db = createTestDb();
  const base = seedBaseData(db);
  instructorId = base.instructor.id;
  categoryId = base.category.id;
  baseCourseId = base.course.id;
  // Pin the seeded course to the oldest moment, so newer fixtures sort first.
  db.update(schema.courses)
    .set({ createdAt: "2026-01-01T00:00:00.000Z" })
    .run();
});

// ─── Fixtures ───
// Courses, modules and lessons are written by other parts of the app; this
// module only reads them, so rows go in directly.

let counter = 0;

function addCategory(name: string) {
  return db
    .insert(schema.categories)
    .values({ name, slug: `${name.toLowerCase()}-${++counter}` })
    .returning()
    .get().id;
}

function addCourse(
  title: string,
  createdAt: string,
  {
    status = CourseStatus.Published,
    category = categoryId,
  }: { status?: CourseStatus; category?: number } = {}
) {
  return db
    .insert(schema.courses)
    .values({
      title,
      slug: `course-${++counter}`,
      description: `${title} description`,
      salesCopy: markdown(`## ${title}`),
      instructorId,
      categoryId: category,
      status,
      createdAt,
    })
    .returning()
    .get().id;
}

function addLessons(courseId: number, perModule: number[]) {
  perModule.forEach((count, position) => {
    const moduleId = db
      .insert(schema.modules)
      .values({ courseId, title: `Module ${position}`, position })
      .returning()
      .get().id;
    for (let i = 0; i < count; i++) {
      db.insert(schema.lessons)
        .values({ moduleId, title: `Lesson ${i}`, position: i })
        .run();
    }
  });
}

const showcase = () => createLandingPage(db).getShowcase();

describe("getShowcase", () => {
  it("features published courses newest first", () => {
    addCourse("Older", "2026-02-01T00:00:00.000Z");
    addCourse("Newer", "2026-03-01T00:00:00.000Z");

    expect(showcase().featuredCourses.map((c) => c.title)).toEqual([
      "Newer",
      "Older",
      "Test Course",
    ]);
  });

  it(`features at most ${FEATURED_COURSE_LIMIT} courses`, () => {
    for (let month = 2; month <= 6; month++) {
      addCourse(`Month ${month}`, `2026-0${month}-01T00:00:00.000Z`);
    }

    expect(showcase().featuredCourses.map((c) => c.title)).toEqual([
      "Month 6",
      "Month 5",
      "Month 4",
    ]);
  });

  it("leaves out drafts and archived courses", () => {
    addCourse("Draft", "2026-05-01T00:00:00.000Z", {
      status: CourseStatus.Draft,
    });
    addCourse("Archived", "2026-05-02T00:00:00.000Z", {
      status: CourseStatus.Archived,
    });

    const result = showcase();
    expect(result.featuredCourses.map((c) => c.title)).toEqual(["Test Course"]);
    expect(result.courseCount).toBe(1);
  });

  it("counts lessons across every module of a course", () => {
    addLessons(baseCourseId, [2, 3]);
    const other = addCourse("Other", "2026-02-01T00:00:00.000Z");
    addLessons(other, [4]);

    const counts = Object.fromEntries(
      showcase().featuredCourses.map((c) => [c.title, c.lessonCount])
    );
    expect(counts).toEqual({ "Test Course": 5, Other: 4 });
  });

  it("counts a course with no modules as having no lessons", () => {
    expect(showcase().featuredCourses[0].lessonCount).toBe(0);
  });

  it("carries the instructor and category names", () => {
    expect(showcase().featuredCourses[0]).toMatchObject({
      id: baseCourseId,
      slug: "test-course",
      description: "A test course",
      coverImageUrl: null,
      instructorName: "Test Instructor",
      categoryName: "Programming",
    });
  });

  it("counts every published course, not only the featured ones", () => {
    for (let month = 2; month <= 6; month++) {
      addCourse(`Month ${month}`, `2026-0${month}-01T00:00:00.000Z`);
    }

    expect(showcase().courseCount).toBe(6);
  });

  it("counts only categories that hold a published course", () => {
    const design = addCategory("Design");
    const empty = addCategory("Empty");
    addCourse("Design course", "2026-02-01T00:00:00.000Z", {
      category: design,
    });
    addCourse("Draft course", "2026-02-02T00:00:00.000Z", {
      category: empty,
      status: CourseStatus.Draft,
    });

    expect(showcase().categoryCount).toBe(2);
  });

  it("is empty when nothing is published", () => {
    db.update(schema.courses).set({ status: CourseStatus.Draft }).run();

    expect(showcase()).toEqual({
      featuredCourses: [],
      courseCount: 0,
      categoryCount: 0,
    });
  });
});
