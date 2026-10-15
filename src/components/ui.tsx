// Small shared UI pieces. Kept in one file while the set is small.

type Variant = "primary" | "secondary" | "quiet";
type Size = "sm" | "md" | "lg";

export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  const base =
    "inline-flex items-center justify-center rounded-md font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes: Record<Size, string> = {
    sm: "px-4 py-2 text-[0.95rem]",
    md: "px-5 py-2.5",
    lg: "px-6 py-3 text-lg",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-tea text-white hover:bg-tea-dark",
    secondary: "border-2 border-ink text-ink hover:bg-ink hover:text-white",
    quiet: "text-tea underline underline-offset-4 hover:text-tea-dark",
  };
  return `${base} ${variant === "quiet" ? "" : sizes[size]} ${variants[variant]}`;
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="font-semibold">
        {label}
      </label>
      {hint && (
        <p id={`${name}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${name}-error`} className="text-sm font-semibold text-alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-ink-soft/50 bg-surface px-3 py-2.5 text-ink placeholder:text-ink-soft/70 focus:border-tea aria-[invalid=true]:border-alert";

export function Checkbox({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1.5 size-4 accent-tea" />
      <span>
        {label}
        {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}
