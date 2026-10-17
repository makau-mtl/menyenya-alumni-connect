"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareWarning, X } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const severities = [
  { v: "blocks", label: "It stops me", hint: "Something doesn't work" },
  { v: "annoying", label: "It's annoying", hint: "Confusing, slow or looks wrong" },
  { v: "idea", label: "An idea", hint: "Something that would make it better" },
] as const;

/**
 * "Give feedback", for testers and officials only (checked in the browser so public pages stay fast).
 * Sends what happened, what they expected, how serious, the page, and an optional screenshot.
 */
export function FeedbackButton() {
  const path = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabase();
    let live = true;
    db.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: ok } = await db.rpc("can_give_feedback");
      if (live && ok === true) setAllowed(true);
    });
    return () => { live = false; };
  }, []);

  if (!allowed || path.startsWith("/offline")) return null;

  async function send(form: HTMLFormElement) {
    setSending(true);
    setError(null);
    const fd = new FormData(form);
    const db = createBrowserSupabase();
    const { data: me } = await db.rpc("current_person_id");
    let screenshot: string | null = null;
    const file = fd.get("screenshot");
    if (file instanceof File && file.size > 0) {
      if (file.size > 3 * 1024 * 1024) { setSending(false); return setError("The screenshot is larger than 3 MB."); }
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      screenshot = `${me}/${crypto.randomUUID()}.${ext}`;
      const up = await db.storage.from("feedback").upload(screenshot, file, { contentType: file.type });
      if (up.error) screenshot = null;
    }
    const { error: e } = await db.from("feedback").insert({
      person_id: me,
      page: `${path}${window.location.search}`.slice(0, 300),
      what_happened: String(fd.get("what") ?? "").trim(),
      expected: String(fd.get("expected") ?? "").trim(),
      severity: String(fd.get("severity") ?? "annoying"),
      device: `${navigator.userAgent} · ${window.innerWidth}×${window.innerHeight}`.slice(0, 300),
      screenshot_path: screenshot,
    });
    setSending(false);
    if (e) return setError("It couldn't be sent. Please write at least a few words and try again.");
    setDone(true);
    form.reset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setDone(false); }}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-ink shadow-lg hover:bg-[#f0b95f] md:bottom-6"
      >
        <MessageSquareWarning className="size-4" /> Give feedback
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Give feedback" className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Give feedback</h2>
                <p className="text-sm text-ink-soft">About this page: <span className="font-mono">{path}</span></p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 hover:bg-paper"><X className="size-5" /></button>
            </div>
            {done ? (
              <div className="mt-6 flex flex-col gap-4">
                <p className="text-lg font-semibold text-tea">Thank you! Your feedback has been sent.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDone(false)} className="rounded-md border-2 border-ink px-4 py-2 font-semibold">Send more</button>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-tea px-4 py-2 font-semibold text-white">Close</button>
                </div>
              </div>
            ) : (
              <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); send(e.currentTarget); }}>
                <fieldset className="grid gap-2 sm:grid-cols-3">
                  <legend className="mb-1 font-semibold">How serious is it?</legend>
                  {severities.map((s, i) => (
                    <label key={s.v} className="flex cursor-pointer flex-col rounded-lg p-2.5 ring-1 ring-line has-[:checked]:bg-tea-tint has-[:checked]:ring-tea">
                      <span className="flex items-center gap-2 text-sm font-semibold"><input type="radio" name="severity" value={s.v} defaultChecked={i === 1} className="accent-tea" /> {s.label}</span>
                      <span className="text-xs text-ink-soft">{s.hint}</span>
                    </label>
                  ))}
                </fieldset>
                <label className="flex flex-col gap-1 font-semibold">What happened?
                  <textarea name="what" required minLength={3} maxLength={3000} rows={3} className="rounded-md border-2 border-line bg-white px-3 py-2 font-normal" />
                </label>
                <label className="flex flex-col gap-1 font-semibold">What did you expect? (optional)
                  <textarea name="expected" maxLength={2000} rows={2} className="rounded-md border-2 border-line bg-white px-3 py-2 font-normal" />
                </label>
                <label className="flex flex-col gap-1 font-semibold">Screenshot (optional)
                  <input name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm font-normal" />
                </label>
                {error && <p role="alert" className="text-sm font-semibold text-alert">{error}</p>}
                <button type="submit" disabled={sending} className="self-start rounded-md bg-tea px-5 py-2.5 font-semibold text-white disabled:opacity-60">{sending ? "Sending…" : "Send feedback"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
