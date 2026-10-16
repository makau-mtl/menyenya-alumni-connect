# Menyenya (MHS) Alumni Connect

The digital platform of the Menyenya SDA High School Alumni Association: membership register, giving to causes (starting with the KES 100M tuition block), events and more. Built pro bono by Miribo Technologies.

- Build specification: `docs/SPEC.md`
- Rules for the AI coding agent: `CLAUDE.md`
- What has been built so far: `docs/PROGRESS.md`
- For officials, how to update the website: `docs/HOW-TO-UPDATE-THE-SITE.md`

## Run it on your computer

You need Node.js 22 or newer. The project uses Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, ESLint 10 and Vitest 5, kept on their latest releases.

```bash
npm install
npm run dev        # open http://localhost:3000
```

## Database

See `docs/SETUP-SUPABASE.md` for the one-time setup. To work against the database locally, copy `.env.example` to `.env.local` and fill in the two values.

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
| `src/app` | Pages (home, causes, give, pledge, thank-you, news) and form actions |
| `src/app/admin` | Admin area: overview, cause editor, news editor, photos and video. Actions in `actions.ts` |
| `src/components` | Shared pieces: header, footer, brick-wall progress, form fields; `admin/` holds the admin forms and photo upload |
| `src/content` | Fixed website text (`site.ts`) and the list of photo spaces (`photo-spaces.ts`) |
| `src/lib` | Money formatting, references, validation, and the data layer |
| `src/lib/data` | `index.ts` is the only way pages read or write data. With Supabase keys set it uses the database (`supabase-store.ts`); without them, in-memory sample data (`sample-store.ts`). |
| `src/lib/supabase` | Supabase settings and clients |
| `src/lib/admin` | Who is signed in and their roles; photo saving |
| `supabase/migrations` | Database changes, applied in order by the **Database** GitHub workflow when they reach `main` |
| `tests/db` | Database tests: every migration is applied to a local Postgres and the access rules are checked |
| `tests` | Unit tests |

## Photos

Uploaded photos go to the public `site-media` storage bucket (created by a migration). The browser
shrinks each photo to two WebP copies, 1600px and 800px wide, before upload; pages pick the small one
on phones. Paths are stored in `cause_photos`, `site_photos` and `news_posts`.
