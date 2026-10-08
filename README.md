# Tech Learners

A focused online-learning portal built with TanStack Start and Supabase.

## Built with

- TanStack Start (React 19, SSR, file-based routing)
- TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth)
- Nitro (deploy target: Vercel)

## Development

Requires Node.js 22+.

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your Supabase project's credentials (Project Settings → API, and → Database for the migration connection string).

## Database migrations

Schema is managed as raw SQL migrations under `drizzle/migrations/`, applied with Drizzle Kit:

```sh
npm run db:generate   # create a new empty migration
npm run db:migrate    # apply migrations to DATABASE_URL
```

`DATABASE_URL` should point at your Supabase project's Postgres connection string (Project Settings → Database → Connection string, "Session pooler" or direct connection).

## Deploying to Vercel

The build targets Vercel's Build Output API directly via Nitro — `npm run build` produces a ready-to-deploy `.vercel/output/` folder, so no extra Vercel configuration is required. Connect the repo in the Vercel dashboard (or run `vercel deploy`) and set the same environment variables from `.env.example` in the project's settings, including `SUPABASE_SERVICE_ROLE_KEY`.
