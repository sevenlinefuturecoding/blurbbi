# Blurbii Development Guidelines

## Architecture Overview

- **Framework**: TanStack Start (SSR) with React 19 & TanStack Router
- **State & Data Fetching**: TanStack Query (React Query v5)
- **Styling**: Tailwind CSS v4 & Lucide React
- **Backend / DB**: Supabase (PostgreSQL with RLS, triggers, ranking RPC functions)

## Conventions

- Preserve file-based routing under `src/routes/`.
- Use the Supabase client from `@/integrations/supabase/client` for client-side queries with RLS.
- For SSR/server functions, use `@/integrations/supabase/client.server`.
