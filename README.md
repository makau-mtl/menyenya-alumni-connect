# Menyenya (MHS) Alumni Connect

The digital platform of the Menyenya SDA High School Alumni Association: membership register, giving to causes (starting with the KES 100M tuition block), events and more. Built pro bono by Miribo Technologies.

- Build specification: `docs/SPEC.md`
- Rules for the AI coding agent: `CLAUDE.md`
- What has been built so far: `docs/PROGRESS.md`

## Run it on your computer

You need Node.js 22 or newer. The project uses Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, ESLint 10 and Vitest 5, kept on their latest releases.

```bash
npm install
npm run dev        # open http://localhost:3000
```

## Checks

```bash
npm test           # unit tests
npm run lint
npm run typecheck
npm run build
```

## How it is organised

| Folder | What is in it |
|---|---|
| `src/app` | Pages (home, causes, give, pledge, thank-you) and form actions |
| `src/components` | Shared pieces: header, footer, brick-wall progress, form fields |
| `src/lib` | Money formatting, references, validation, and the data layer |
| `src/lib/data` | `index.ts` is the only way pages read or write data. It currently uses sample data in `sample.ts`; it will be switched to Supabase without changing the pages. |
| `tests` | Unit tests |
