import Link from "next/link";
import { buttonClass } from "./ui";

export function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-14">
      <h1 className="text-4xl font-bold">{title}</h1>
      <div className="mt-4 flex flex-col gap-3 text-lg text-ink-soft">{children}</div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/causes/tuition-block" className={buttonClass("primary")}>
          See the tuition block
        </Link>
        <Link href="/" className={buttonClass("secondary")}>
          Home
        </Link>
      </div>
    </div>
  );
}
