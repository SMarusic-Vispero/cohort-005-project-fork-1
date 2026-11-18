import { db } from "~/db";
import { getShowcase, type Db } from "./lib/showcase";

export type { FeaturedCourse, Showcase } from "./lib/showcase";
export { FEATURED_COURSE_LIMIT } from "./lib/showcase";

/**
 * The landing page's view of the catalog, bound to a database. The app uses
 * `landingPage`; tests build their own against a test database.
 */
export function createLandingPage(database: Db) {
  return {
    /**
     * The newest published courses, each with its instructor, category and
     * lesson count, and how many published courses and categories there are.
     * Drafts and archived courses never appear and are never counted.
     */
    getShowcase() {
      return getShowcase(database);
    },
  };
}

// Pure so a route importing this only for its loader doesn't pull the
// database into the client bundle (see `~/db`).
export const landingPage = /* @__PURE__ */ createLandingPage(db);
