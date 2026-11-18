import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  length: number;
  limit: number;
  tooLong: boolean;
  /** The draft differs from what is saved, ignoring surrounding whitespace. */
  dirty: boolean;
  canSave: boolean;
  counterLabel: string;
};

export function describeDraft(draft: string, savedBody: string): NoteDraft {
  const length = draft.length;
  const tooLong = length > MAX_NOTE_LENGTH;
  const dirty = draft.trim() !== savedBody.trim();
  const empty = draft.trim().length === 0;

  return {
    length,
    limit: MAX_NOTE_LENGTH,
    tooLong,
    dirty,
    canSave: dirty && !tooLong && !empty,
    counterLabel: `${length.toLocaleString("en")} / ${MAX_NOTE_LENGTH.toLocaleString("en")}`,
  };
}
