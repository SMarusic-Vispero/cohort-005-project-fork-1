import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  tooLong: boolean;
  /** The draft differs from what is saved, ignoring surrounding whitespace. */
  dirty: boolean;
  canSave: boolean;
  counterLabel: string;
};

export function describeDraft(draft: string, savedBody: string): NoteDraft {
  // The server trims before it checks the limit, so the counter does too.
  const trimmed = draft.trim();
  const length = trimmed.length;
  const tooLong = length > MAX_NOTE_LENGTH;
  const dirty = trimmed !== savedBody.trim();

  return {
    tooLong,
    dirty,
    canSave: dirty && !tooLong && length > 0,
    counterLabel: `${length.toLocaleString("en")} / ${MAX_NOTE_LENGTH.toLocaleString("en")}`,
  };
}
