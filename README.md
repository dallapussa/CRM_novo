# CRM Novo

A modern CRM system built with React 19, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI (shadcn/ui)
- **State Management**: TanStack Query
- **Routing**: TanStack Router
- **Backend**: Supabase (Auth + PostgreSQL + Storage + RLS)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Database Schema

All PostgreSQL columns use `snake_case` naming convention. Row Level Security (RLS) is enforced on all tables.

## Important Notes

- ❌ Do NOT use `localStorage` for business data (clients, users, leads, etc.)
- ❌ Do NOT use `mockData.ts` with fake records
- ❌ Do NOT mix offline/cloud data
- ❌ Do NOT use `@ts-nocheck` on core files
- ✅ Always use `snake_case` for PostgreSQL column names
- ✅ Use TanStack Query for all server state management

## License

MIT
