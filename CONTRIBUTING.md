# Contributing

Thanks for helping improve AnimeList Local. This is a small, focused project: keep changes scoped
and respectful of the existing architecture.

## Getting started

```bash
npm install
cp .env.example .env
openssl rand -hex 32   # JWT_SECRET
npm run db:up
npm run dev            # web :3000, api :4000
```

## Before you start

- Read `README.md`, `ARCHITECTURE.md` and `PRD.md`.
- Check existing issues/PRs to avoid duplicate work.
- For UI work, follow the design system in `apps/web/src/index.css` (tokens) and the shared
  primitives in `apps/web/src/components/ui/`. Don't introduce new ad-hoc colors/radii.

## Development workflow

1. Create a branch: `git checkout -b feat/your-change`.
2. Implement the smallest change that solves the problem.
3. Verify before submitting:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```
4. Commit with a conventional message, e.g.:

   ```
   feat(rating): support fractional scores
   fix(sync): dedupe characters within a single batch
   refactor(web): migrate buttons to ui/Button
   docs: add database schema reference
   ```

## Guidelines

- **Scope**: only touch what's needed. UI/UX redesigns must not change API contracts, database
  schema, or business logic unless that's explicitly the goal.
- **No fake data**: empty states over invented content.
- **No AI-slop UI**: follow the design rules in the redesign spec (no gratuitous gradients/glass/
  rounded cards/animations, controlled accent color, real hierarchy).
- **Tests**: add/adjust tests for behavior you change. API integration tests live in
  `apps/api/test/` and run against a real Postgres.
- **Dependencies**: avoid adding libraries unless there's a clear reason.

## Report an issue

Include: reproduction steps, expected vs actual behavior, API logs, and environment (Node version,
Docker status).
