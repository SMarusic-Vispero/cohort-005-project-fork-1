import { describe, it, expect } from "vitest";
import { describeNoteDraft } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("describeNoteDraft", () => {
  it("counts characters against the note limit", () => {
    expect(describeNoteDraft("hello", "").counterLabel).toBe("5 / 2,000");
  });

  it("formats large counts with a thousands separator", () => {
    expect(describeNoteDraft("a".repeat(1234), "").counterLabel).toBe(
      "1,234 / 2,000"
    );
  });

  it("can save a new note that has text", () => {
    const draft = describeNoteDraft("Remember generics", "");
    expect(draft.dirty).toBe(true);
    expect(draft.canSave).toBe(true);
  });

  it("cannot save an empty or whitespace-only draft", () => {
    expect(describeNoteDraft("", "").canSave).toBe(false);
    expect(describeNoteDraft("   \n ", "old note").canSave).toBe(false);
  });

  it("is clean when the draft matches the saved note", () => {
    const draft = describeNoteDraft("same", "same");
    expect(draft.dirty).toBe(false);
    expect(draft.canSave).toBe(false);
  });

  it("ignores surrounding whitespace when comparing to the saved note", () => {
    expect(describeNoteDraft("  same\n", "same").dirty).toBe(false);
    expect(describeNoteDraft("same", "same\n").dirty).toBe(false);
  });

  it("is dirty when the draft has changed", () => {
    expect(describeNoteDraft("same, but more", "same").dirty).toBe(true);
  });

  it("allows a note exactly at the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), "");
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("does not count surrounding whitespace against the limit", () => {
    const draft = describeNoteDraft(`${"a".repeat(MAX_NOTE_LENGTH)}\n`, "");
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
    expect(draft.counterLabel).toBe("2,000 / 2,000");
  });

  it("blocks a note one character over the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), "");
    expect(draft.tooLong).toBe(true);
    expect(draft.canSave).toBe(false);
  });
});
