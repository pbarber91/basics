# Basics — Mission Community Church

## Prereqs
- Node 18+
- pnpm or npm

## Setup
```bash
cp .env.example .env
pnpm install # or npm install
pnpm prisma db push
pnpm db:seed
pnpm dev
```

Visit http://localhost:3000

- Sign in with `admin@missioncc.org / admin123` (ADMIN) or `leader@missioncc.org / leader123` (LEADER)
- Upload your own videos to `/public/videos/weekN.mp4`
- Add WebVTT caption files under `/public/captions/weekN.vtt` (captions are default-on)
- Replace guides and PDFs under `/public/guides/`

## Roles & Access
- **USER**: sees public resources only.
- **LEADER**: also sees items tagged `restricted: "LEADER"`.
- **ADMIN**: sees everything, including `restricted: "ADMIN"`.

Guard additional pages by placing them under `/leader` or `/admin` and verifying role in server components.

## Theology content
Populate session summaries, prompts, and resource links with Mission CC's language that aligns with the Foursquare Church [beliefs]. The placeholders in `data/weeks.ts` mark where to do this.

## Swap to Postgres/Supabase later
- Change `datasource db` in `schema.prisma` and `DATABASE_URL`.
- Re-run `prisma generate` and migrations.

---
