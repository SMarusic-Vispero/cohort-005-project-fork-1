function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * One line describing the catalog for the landing page, such as
 * "4 published courses across 5 categories". The category count is left out
 * when there is only one, and the line is `null` when nothing is published.
 */
export function describeCatalog(
  courseCount: number,
  categoryCount: number
): string | null {
  if (courseCount === 0) return null;
  const courses = plural(courseCount, "published course", "published courses");
  if (categoryCount < 2) return courses;
  return `${courses} across ${categoryCount} categories`;
}
