"use client";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/shadcn/alert-dialog";
import { Button } from "@/components/shadcn/button";
import { useRef } from "react";

/**
 * A button that asks "Are you sure?" before running a server action, for anything hard to undo
 * (remove, hide, end a role, terminate). Nothing is deleted; this is about avoiding mistakes.
 */
export function ConfirmAction({ action, fields, label, title, description, confirmLabel = "Yes, continue", variant = "ghost", size = "sm" }: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  label: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "ghost" | "outline" | "destructive" | "default";
  size?: "sm" | "default";
}) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant={variant} size={size}>{label}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => form.current?.requestSubmit()}>{confirmLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

/** Like ConfirmAction, but used inside an existing form (for example one with a note field). */
export function ConfirmSubmit({ label, title, description, confirmLabel = "Yes, continue", variant = "default", size = "sm" }: {
  label: React.ReactNode; title: string; description?: string; confirmLabel?: string;
  variant?: "ghost" | "outline" | "destructive" | "default"; size?: "sm" | "default";
}) {
  const button = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button ref={button} type="button" variant={variant} size={size}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => button.current?.form?.requestSubmit()}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
