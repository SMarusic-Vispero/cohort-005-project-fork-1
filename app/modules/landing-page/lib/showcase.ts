import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { countDistinct, desc, eq, sql } from "drizzle-orm";
import * as schema from "~/db/schema";
import { CourseStatus } from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;

export const FEATURED_COURSE_LIMIT = 3;

export type FeaturedCourse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  instructorName: string;
  categoryName: string;
  lessonCount: number;
};

export type Showcase = {
  featuredCourses: FeaturedCourse[];
  courseCount: number;
  categoryCount: number;
};

const { courses, users, categories, modules, lessons } = schema;
const isPublished = eq(courses.status, CourseStatus.Published);

function getFeaturedCourses(db: Db): FeaturedCourse[] {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      coverImageUrl: courses.coverImageUrl,
      instructorName: users.name,
      categoryName: categories.name,
      lessonCount: sql<number>`count(${lessons.id})`,
    })
    .from(courses)
    .innerJoin(users, eq(courses.instructorId, users.id))
    .innerJoin(categories, eq(courses.categoryId, categories.id))
    .leftJoin(modules, eq(modules.courseId, courses.id))
    .leftJoin(lessons, eq(lessons.moduleId, modules.id))
    .where(isPublished)
    .groupBy(courses.id)
    .orderBy(desc(courses.createdAt), desc(courses.id))
    .limit(FEATURED_COURSE_LIMIT)
    .all();
}

function getCatalogCounts(db: Db) {
  // An aggregate with no GROUP BY always returns exactly one row.
  const [counts] = db
    .select({
      courseCount: countDistinct(courses.id),
      categoryCount: countDistinct(courses.categoryId),
    })
    .from(courses)
    .where(isPublished)
    .all();
  return counts;
}

export function getShowcase(db: Db): Showcase {
  return { featuredCourses: getFeaturedCourses(db), ...getCatalogCounts(db) };
}
