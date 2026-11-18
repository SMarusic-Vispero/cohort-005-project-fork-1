import { useState } from "react";
import { useFetcher } from "react-router";
import { describeNoteDraft, type NoteDraft } from "~/modules/lesson-notes";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { Check, NotebookPen, Lock } from "lucide-react";
import { cn, formatRelativeTime } from "~/lib/utils";

type SavedNote = { body: string; updatedAt: string } | null;

export function LessonNote({ note }: { note: SavedNote }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [body, setBody] = useState(note?.body ?? "");
  const [submittedBody, setSubmittedBody] = useState<string | null>(null);
  const isSaving = fetcher.state !== "idle";
  // A save error describes the text that was sent; once it is edited the
  // error no longer applies.
  const error = body === submittedBody ? fetcher.data?.error : undefined;
  const draft = describeNoteDraft(body, note?.body ?? "");

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <NoteHeader />

        <fetcher.Form
          method="post"
          className="space-y-2"
          onSubmit={() => setSubmittedBody(body)}
        >
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Jot down what you want to remember from this lesson..."
            aria-label="Your notes"
            className="min-h-32 resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="submit"
                size="sm"
                disabled={isSaving || !draft.canSave}
              >
                {isSaving ? "Saving..." : "Save note"}
              </Button>
              <NoteStatus
                error={error}
                dirty={draft.dirty}
                updatedAt={note?.updatedAt}
              />
            </div>
            <NoteCounter draft={draft} />
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteCounter({ draft }: { draft: NoteDraft }) {
  return (
    <span
      className={cn(
        "shrink-0 text-xs tabular-nums",
        draft.tooLong ? "text-red-600" : "text-muted-foreground"
      )}
    >
      {draft.counterLabel}
    </span>
  );
}

function NoteHeader() {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-5 text-primary" />
        <h2 className="text-xl font-semibold">Your notes</h2>
      </div>
      <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Private to you
      </span>
    </div>
  );
}

function NoteStatus({
  error,
  dirty,
  updatedAt,
}: {
  error: string | undefined;
  dirty: boolean;
  updatedAt: string | undefined;
}) {
  if (error) return <span className="text-sm text-red-600">{error}</span>;
  if (dirty) {
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  }
  if (!updatedAt) return null;
  return (
    <span
      suppressHydrationWarning
      className="flex items-center gap-1 text-xs text-muted-foreground"
    >
      <Check className="size-3" />
      Saved {formatRelativeTime(updatedAt)}
    </span>
  );
}
