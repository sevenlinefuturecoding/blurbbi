# Blurbii

Blurbii is a minimal, text-only social media platform where users share thoughts in short Drops with zero media clutter.

## Core Concepts

- **Drop**: Post (up to 500 characters, text and emoji)
- **Echo**: Comment / reply
- **Relay**: Repost
- **Pass**: Share
- **Spark**: Like
- **Orbit**: Follow
- **Stream**: Feed

## Key Features

1. **Auth & Onboarding**: Email/password and OAuth sign-in with customizable profile (username, bio, emoji avatar with color palettes).
2. **Streams & Feeds**:
   - **Blurbing Now**: Viral strip highlighting trending drops.
   - **For You**: Heat-ranked drops mixed with account recommendations.
   - **Orbit**: Chronological stream of accounts you follow.
   - **Global Stream**: Public view accessible to visitors without signing in.
3. **Engagement**: Spark, Echo, Relay, Pass (strictly enforced at DB level: 1 per user, no self-engagement).
4. **Hall of Blurbs**: Top 50 Drops from the last 7 days.
5. **Safety**: Report, hide, and mute controls.

## Tech Stack

- **Frontend**: TanStack Start (SSR), React 19, TanStack Router, TanStack Query v5, Tailwind CSS v4, Framer Motion
- **Backend / Database**: Supabase (PostgreSQL, Row Level Security, Triggers, Custom RPC ranking functions)

## Getting Started

### 1. Install Dependencies

```sh
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase project credentials:

```env
VITE_SUPABASE_URL="https://<your-project-id>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-supabase-anon-key>"

SUPABASE_URL="https://<your-project-id>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<your-supabase-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-supabase-service-role-key>"
```

### 3. Run Database Migrations

Run the SQL migration scripts in `drizzle/migrations/` on your Supabase project database.

### 4. Run Development Server

```sh
npm run dev
```

### 5. Build for Production

```sh
npm run build
```
