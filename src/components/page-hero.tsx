import { SitePhoto } from "./site-photo";

export function PageHero({
  title,
  intro,
  image,
  children,
}: {
  title: string;
  intro?: string;
  /** A photo space key from src/content/photo-spaces.ts */
  image?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-surface">
      <div className={`section grid items-center gap-10 py-14 lg:py-20 ${image ? "lg:grid-cols-[1.1fr_1fr]" : ""}`}>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl">{title}</h1>
          {intro && <p className="mt-5 text-lg text-ink-soft sm:text-xl">{intro}</p>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {image && <SitePhoto space={image} />}
      </div>
    </section>
  );
}

export function DraftNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-gold/60 bg-gold-tint px-4 py-2 text-sm text-ink">
      <strong>Draft for leadership review:</strong> {children}
    </p>
  );
}
