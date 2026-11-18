import { summariseCatalog } from "./lib/catalog-summary";

/**
 * One line describing the catalogue for the landing page, such as
 * "4 published courses across 5 categories". The category count is left out
 * when there is only one, and the line is `null` when nothing is published.
 */
export function describeCatalog(
  courseCount: number,
  categoryCount: number
): string | null {
  return summariseCatalog(courseCount, categoryCount);
}
