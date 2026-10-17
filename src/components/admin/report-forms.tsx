"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { createReport, saveReportDetails } from "@/app/admin/actions";
import type { ActionState } from "@/lib/admin/staff";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { REPORT_BUCKET, fileSize, reportKinds } from "@/lib/reports";
import { Button } from "@/components/shadcn/button";
import { Field, inputClass } from "@/components/ui";

const MAX = 15 * 1024 * 1024;

/** Upload a report PDF straight to storage (too large for the website's server), then record it as a draft. */
export function ReportUpload({ kinds, replaces }: { kinds: string[]; replaces?: { id: string; kind: string; year: number; title: string } }) {
  const form = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(!replaces);
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await createReport(prev, fd);
    if (result?.ok) {
      toast.success(result.message);
      form.current?.reset();
      setFile(null);
      if (replaces) setOpen(false);
    } else if (result?.message) toast.error(result.message);
    return result;
  }, null);
  const err = (k: string) => state?.errors?.[k];

  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><FileUp /> Upload a new version</Button>;

  return (
    <form
      ref={form}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return toast.error("Choose the PDF first.");
        if (file.type !== "application/pdf") return toast.error("The report must be a PDF.");
        if (file.size > MAX) return toast.error("The PDF is larger than 15 MB. Save it smaller and try again.");
        const fd = new FormData(e.currentTarget);
        const kind = String(fd.get("kind"));
        const path = `${kind}/${crypto.randomUUID()}.pdf`;
        setUploading(true);
        const { error } = await createBrowserSupabase().storage.from(REPORT_BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false });
        setUploading(false);
        if (error) return toast.error("The PDF could not be uploaded. Check your connection and try again.");
        fd.set("filePath", path);
        fd.set("fileSize", String(file.size));
        fd.delete("file");
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-4"
    >
      {replaces ? (
        <>
          <input type="hidden" name="kind" value={replaces.kind} />
          <input type="hidden" name="replacesId" value={replaces.id} />
          <input type="hidden" name="year" value={replaces.year} />
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Kind of report" name="kind">
            <select id="kind" name="kind" className={inputClass}>
              {kinds.map((k) => <option key={k} value={k}>{reportKinds[k].label}</option>)}
            </select>
          </Field>
          <Field label="Year it covers" name="year" error={err("year")}>
            <input id="year" name="year" inputMode="numeric" maxLength={4} defaultValue={new Date().getFullYear() - 1} className={inputClass} />
          </Field>
          <input type="hidden" name="replacesId" value="" />
        </div>
      )}
      <Field label="Title" name="title" error={err("title")} hint={replaces ? undefined : "e.g. Financial statements for the year ended 31 December 2026"}>
        <input id="title" name="title" maxLength={140} defaultValue={replaces ? `${replaces.title} (updated)` : ""} className={inputClass} />
      </Field>
      <Field label="Summary (optional)" name="summary" error={err("summary")} hint="A few lines in plain language: the main figures or highlights.">
        <textarea id="summary" name="summary" rows={3} maxLength={1200} className={inputClass} />
      </Field>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-input bg-muted/50 p-4 text-sm hover:border-tea">
        <FileUp className="size-6 text-tea" aria-hidden />
        <span className="flex-1">
          {file ? <><span className="font-semibold">{file.name}</span> · {fileSize(file.size)}</> : <span className="font-semibold">Choose the PDF (up to 15 MB)</span>}
        </span>
        <input name="file" type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {err("filePath") && <p className="text-sm text-alert">{err("filePath")}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={uploading || pending}>{uploading ? "Uploading…" : pending ? "Saving…" : "Save as draft"}</Button>
        {replaces && <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>}
      </div>
    </form>
  );
}

/** Correct a report's title or summary. */
export function ReportDetails({ id, title, summary }: { id: string; title: string; summary: string }) {
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await saveReportDetails(prev, fd);
    if (result?.ok) toast.success(result.message);
    else if (result?.message) toast.error(result.message);
    return result;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Title" name={`title-${id}`} error={state?.errors?.title}>
        <input id={`title-${id}`} name="title" defaultValue={title} maxLength={140} className={inputClass} />
      </Field>
      <Field label="Summary" name={`summary-${id}`} error={state?.errors?.summary}>
        <textarea id={`summary-${id}`} name="summary" defaultValue={summary} rows={3} maxLength={1200} className={inputClass} />
      </Field>
      <Button type="submit" size="sm" variant="outline" className="self-start" disabled={pending}>Save</Button>
    </form>
  );
}
