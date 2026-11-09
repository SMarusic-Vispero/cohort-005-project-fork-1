// PROTOTYPE — throwaway Knock spike for "Does Knock hold up against Cadence?" (#51).
// Lives on the prototype/knock-spike branch only. Never merge.
//
// Open /prototype/knock, pick a user in the DevUI panel, and work down the
// four checks. Every request and response is printed on the page.
import { useCallback, useEffect, useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Route } from "./+types/prototype.knock";
import { db } from "~/db";
import { comments, courses, lessons, modules, users } from "~/db/schema";
import { getCurrentUserId } from "~/lib/session";
import {
  env,
  knock,
  knockUserId,
  signTokenFor,
} from "~/lib/prototype-knock.server";

const API = "https://api.knock.app/v1";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getCurrentUserId(request);
  const missingKeys = Object.entries(env)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  const me = userId
    ? db.select().from(users).where(eq(users.id, userId)).get()
    : undefined;

  const questions = db
    .select({
      id: comments.id,
      body: comments.body,
      authorId: users.id,
      authorName: users.name,
      lessonTitle: lessons.title,
      courseTitle: courses.title,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .innerJoin(lessons, eq(lessons.id, comments.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .where(and(isNull(comments.parentId), isNull(comments.deletedAt)))
    .orderBy(desc(comments.id))
    .limit(15)
    .all();

  const instructorCourses = db
    .select({
      id: courses.id,
      title: courses.title,
      instructorId: users.id,
      instructorName: users.name,
    })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.instructorId))
    .limit(15)
    .all();

  return {
    me: me ? { id: me.id, name: me.name, role: me.role } : null,
    knockUserId: me ? knockUserId(me.id) : null,
    // Check 1: the RS256 user token, signed on the server for the DevUI user.
    userToken: me ? await signTokenFor(me.id) : null,
    publicKey: env.publicKey,
    feedChannelId: env.feedChannelId,
    missingKeys,
    questions,
    instructorCourses,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) return { ok: false, log: "No DevUI user selected" };
  const actor = db.select().from(users).where(eq(users.id, userId)).get()!;
  const form = await request.formData();
  const intent = form.get("intent");

  const asRecipient = (u: { id: number; name: string; email: string }) => ({
    id: knockUserId(u.id),
    name: u.name,
    email: u.email,
  });

  try {
    if (intent === "discussion-reply") {
      // Check 2: trigger a real catalogue Notification with the Node SDK.
      const q = db
        .select({
          id: comments.id,
          body: comments.body,
          lessonId: lessons.id,
          lessonTitle: lessons.title,
          courseSlug: courses.slug,
          author: users,
        })
        .from(comments)
        .innerJoin(users, eq(users.id, comments.userId))
        .innerJoin(lessons, eq(lessons.id, comments.lessonId))
        .innerJoin(modules, eq(modules.id, lessons.moduleId))
        .innerJoin(courses, eq(courses.id, modules.courseId))
        .where(eq(comments.id, Number(form.get("questionId"))))
        .get();
      if (!q) return { ok: false, log: "Question not found" };
      const payload = {
        recipients: [asRecipient(q.author)],
        actor: asRecipient(actor),
        data: {
          lesson_title: q.lessonTitle,
          question_excerpt: q.body.slice(0, 80),
          url: `/courses/${q.courseSlug}/lessons/${q.lessonId}#comment-${q.id}`,
        },
      };
      const res = await knock.workflows.trigger("discussion-reply", payload);
      return {
        ok: true,
        log: `trigger discussion-reply → ${q.author.name} (Knock user ${q.author.id})\n${JSON.stringify(payload, null, 2)}\n\nresponse: ${JSON.stringify(res)}`,
      };
    }

    if (intent === "new-enrollment") {
      // Check 4 (part): fire the off-by-default Notification at an Instructor.
      const c = db
        .select({ id: courses.id, title: courses.title, slug: courses.slug, instructor: users })
        .from(courses)
        .innerJoin(users, eq(users.id, courses.instructorId))
        .where(eq(courses.id, Number(form.get("courseId"))))
        .get();
      if (!c) return { ok: false, log: "Course not found" };
      const payload = {
        recipients: [asRecipient(c.instructor)],
        actor: asRecipient(actor),
        data: { course_title: c.title, url: `/instructor/${c.id}/students` },
      };
      const res = await knock.workflows.trigger("new-enrollment", payload);
      return {
        ok: true,
        log: `trigger new-enrollment → ${c.instructor.name} (Knock user ${c.instructor.id})\n${JSON.stringify(payload, null, 2)}\n\nresponse: ${JSON.stringify(res)}`,
      };
    }

    if (intent === "server-prefs") {
      const target = String(form.get("userId"));
      const prefs = await knock.users
        .getPreferences(target, "default")
        .catch((e: Error) => ({ error: e.message }));
      return {
        ok: true,
        log: `server GET preferences for Knock user ${target} (secret key)\n${JSON.stringify(prefs, null, 2)}`,
      };
    }
  } catch (e) {
    return { ok: false, log: `ERROR: ${(e as Error).message}` };
  }
  return { ok: false, log: `Unknown intent ${String(intent)}` };
}

type FeedItem = {
  id: string;
  source: { key: string };
  blocks: { name: string; rendered?: string; content?: string }[];
  actors: { name?: string; id: string }[];
  data: Record<string, unknown>;
  inserted_at: string;
  seen_at: string | null;
  read_at: string | null;
};
type Feed = {
  entries: FeedItem[];
  meta: { total_count: number; unread_count: number; unseen_count: number };
};

export default function PrototypeKnock({ loaderData }: Route.ComponentProps) {
  const d = loaderData;
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const [log, setLog] = useState<string[]>([]);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [probeUserId, setProbeUserId] = useState("");

  const push = (line: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l].slice(0, 60));

  // Browser → Knock, user-scoped, with the public key + signed user token.
  const call = useCallback(
    async (method: string, path: string, body?: unknown, token = d.userToken) => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${d.publicKey}`,
        "Content-Type": "application/json",
      };
      if (token) headers["X-Knock-User-Token"] = token;
      const res = await fetch(`${API}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let json: unknown = text;
      try {
        json = JSON.parse(text);
      } catch {}
      return { status: res.status, json };
    },
    [d.publicKey, d.userToken]
  );

  const loadFeed = useCallback(async () => {
    if (!d.knockUserId) return;
    const r = await call("GET", `/users/${d.knockUserId}/feeds/${d.feedChannelId}?page_size=20`);
    push(`GET own feed (with token) → ${r.status}`);
    if (r.status === 200) setFeed(r.json as Feed);
    else push(JSON.stringify(r.json));
  }, [call, d.knockUserId, d.feedChannelId]);

  // Re-load whenever the DevUI user changes (new token from the loader).
  useEffect(() => {
    setFeed(null);
    loadFeed();
  }, [loadFeed]);

  const markOne = async (id: string, status: "seen" | "read" | "unread" | "unseen") => {
    const r = await call("POST", `/messages/batch/${status}`, { message_ids: [id] });
    push(`POST /messages/batch/${status} [${id}] → ${r.status}`);
    loadFeed();
  };
  const markAll = async (status: "seen" | "read") => {
    const r = await call("POST", `/channels/${d.feedChannelId}/messages/bulk/${status}`, {
      user_ids: [d.knockUserId],
    });
    push(`POST bulk ${status} for me → ${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
    setTimeout(loadFeed, 1500); // bulk ops are async
  };

  const probe = async (label: string, userId: string, token: string | null) => {
    const r = await call("GET", `/users/${userId}/feeds/${d.feedChannelId}`, undefined, token);
    push(`${label}: GET feed of Knock user ${userId} → ${r.status} ${r.status === 200 ? `(${(r.json as Feed).meta.total_count} items)` : JSON.stringify(r.json).slice(0, 160)}`);
  };

  const getPrefs = async () => {
    const r = await call("GET", `/users/${d.knockUserId}/preferences/default`);
    push(`GET my preferences (browser, token) → ${r.status}\n${JSON.stringify(r.json, null, 2)}`);
  };
  const setEnrollmentPref = async (on: boolean) => {
    const body = {
      workflows: { "new-enrollment": { channel_types: { in_app_feed: on } } },
    };
    const r = await call("PUT", `/users/${d.knockUserId}/preferences/default`, body);
    push(`PUT my preferences ${JSON.stringify(body)} → ${r.status}\n${JSON.stringify(r.json, null, 2)}`);
  };

  if (!d.me) {
    return <div className="p-8">PROTOTYPE: pick a user in the DevUI panel first.</div>;
  }

  const busy = nav.state !== "idle";
  const section = "rounded border p-4 space-y-2";
  const btn = "rounded border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50";

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6 text-sm">
      <div className="rounded bg-yellow-100 p-2 font-bold text-yellow-900">
        PROTOTYPE: Knock spike (#51). Throwaway, never merge.
      </div>
      {d.missingKeys.length > 0 && (
        <div className="rounded bg-red-100 p-2 text-red-900">
          Missing env: {d.missingKeys.join(", ")}
        </div>
      )}

      <section className={section}>
        <h2 className="font-bold">1. Signed user token</h2>
        <p>
          DevUI user: <b>{d.me.name}</b> ({d.me.role}) → Knock user id <code>{d.knockUserId}</code>
        </p>
        <p className="break-all text-xs text-muted-foreground">token: {d.userToken}</p>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => probe("No token", d.knockUserId!, null)}>
            Read MY feed with NO token (expect 401 when enhanced security is on)
          </button>
          <input
            className="w-24 rounded border px-1"
            placeholder="other id"
            value={probeUserId}
            onChange={(e) => setProbeUserId(e.target.value)}
          />
          <button className={btn} onClick={() => probe("My token", probeUserId, d.userToken)}>
            Read ANOTHER user's feed with MY token (expect 401/403)
          </button>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-bold">2. Trigger a Discussion Reply (Node SDK, server)</h2>
        <p>Acts as {d.me.name}, replying to someone's Discussion Question. Switch to the author afterwards to see it.</p>
        <Form method="post" className="flex gap-2">
          <input type="hidden" name="intent" value="discussion-reply" />
          <select name="questionId" className="max-w-xl rounded border px-1">
            {d.questions.map((q) => (
              <option key={q.id} value={q.id}>
                #{q.id} by {q.authorName} (user {q.authorId}) in “{q.lessonTitle}”: {q.body.slice(0, 40)}
              </option>
            ))}
          </select>
          <button className={btn} disabled={busy}>Trigger discussion-reply</button>
        </Form>
      </section>

      <section className={section}>
        <div className="flex items-center gap-2">
          <h2 className="font-bold">3. My feed (headless API, browser)</h2>
          <button className={btn} onClick={loadFeed}>Reload</button>
          <button className={btn} onClick={() => markAll("seen")}>Mark all seen</button>
          <button className={btn} onClick={() => markAll("read")}>Mark all read</button>
        </div>
        {feed && (
          <>
            <p>
              total <b>{feed.meta.total_count}</b> · unread <b>{feed.meta.unread_count}</b> · unseen{" "}
              <b>{feed.meta.unseen_count}</b>
            </p>
            <ul className="space-y-1">
              {feed.entries.map((item) => (
                <li key={item.id} className="rounded border p-2">
                  <div>
                    <code>{item.source.key}</code>{" "}
                    {item.blocks.map((b) => b.rendered ?? b.content).join(" | ").replace(/<[^>]+>/g, "")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.inserted_at} · seen: {item.seen_at ? "✔" : "✗"} · read: {item.read_at ? "✔" : "✗"} · actor:{" "}
                    {item.actors.map((a) => a.name ?? a.id).join(", ")} · url: {String(item.data?.url ?? "")}
                  </div>
                  <div className="mt-1 flex gap-1">
                    {(["seen", "read", "unread", "unseen"] as const).map((s) => (
                      <button key={s} className={btn} onClick={() => markOne(item.id, s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={section}>
        <h2 className="font-bold">4. Off-by-default, opt-in preference (new Enrollment → Instructor)</h2>
        <Form method="post" className="flex gap-2">
          <input type="hidden" name="intent" value="new-enrollment" />
          <select name="courseId" className="rounded border px-1">
            {d.instructorCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}, Instructor {c.instructorName} (user {c.instructorId})
              </option>
            ))}
          </select>
          <button className={btn} disabled={busy}>Trigger new-enrollment</button>
        </Form>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={getPrefs}>Show my preferences</button>
          <button className={btn} onClick={() => setEnrollmentPref(true)}>Opt IN to new-enrollment (feed)</button>
          <button className={btn} onClick={() => setEnrollmentPref(false)}>Opt OUT</button>
          <Form method="post">
            <input type="hidden" name="intent" value="server-prefs" />
            <input type="hidden" name="userId" value={d.knockUserId!} />
            <button className={btn} disabled={busy}>Server view of my preferences</button>
          </Form>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-bold">Log</h2>
        {actionData && (
          <pre className={`whitespace-pre-wrap rounded p-2 ${actionData.ok ? "bg-green-50" : "bg-red-50"}`}>
            {actionData.log}
          </pre>
        )}
        <pre className="whitespace-pre-wrap">{log.join("\n")}</pre>
      </section>
    </div>
  );
}
