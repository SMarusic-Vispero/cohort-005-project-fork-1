import { describe, it, expect } from "vitest";
import { describeCatalog } from "../index";

describe("describeCatalog", () => {
  it("names courses and categories", () => {
    expect(describeCatalog(4, 5)).toBe(
      "4 published courses across 5 categories"
    );
  });

  it("uses the singular for one course", () => {
    expect(describeCatalog(1, 0)).toBe("1 published course");
  });

  it("leaves out the category count when there is only one category", () => {
    expect(describeCatalog(3, 1)).toBe("3 published courses");
  });

  it("names two categories", () => {
    expect(describeCatalog(2, 2)).toBe(
      "2 published courses across 2 categories"
    );
  });

  it("is null when nothing is published", () => {
    expect(describeCatalog(0, 0)).toBeNull();
  });
});
