function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function summariseCatalog(
  courseCount: number,
  categoryCount: number
): string | null {
  if (courseCount === 0) return null;
  const courses = plural(courseCount, "published course", "published courses");
  if (categoryCount < 2) return courses;
  return `${courses} across ${categoryCount} categories`;
}
