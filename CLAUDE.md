# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note:** This project also uses GitHub Copilot for autocomplete. Copilot has its own configuration in `.github/copilot-instructions.md`.

## Tech Stack

- **Astro 5** - Modern web framework with server-side rendering (SSR mode)
- **React 19** - UI library for interactive components (without Next.js directives)
- **TypeScript 5** - Type-safe JavaScript with strict configuration
- **Tailwind CSS 4** - Utility-first CSS framework with CSS variables
- **Shadcn/ui** - Accessible component library (New York style, neutral base color)

## Development Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier
```

## Project Architecture

### Directory Structure

- `src/layouts/` - Astro layout components
- `src/pages/` - File-based routing for pages
- `src/pages/api/` - Server endpoints (use `export const prerender = false`)
- `src/middleware/index.ts` - Astro middleware for request/response modification
- `src/components/` - Astro (static) and React (interactive) components
- `src/components/ui/` - Shadcn/ui components
- `src/components/hooks/` - Custom React hooks
- `src/lib/` - Services and utility functions
- `src/db/` - Supabase clients and types
- `src/types.ts` - Shared types (Entities, DTOs)
- `src/styles/` - Global styles
- `src/assets/` - Internal static assets
- `public/` - Public static assets

### Rendering Strategy

This is a **server-side rendered (SSR)** Astro application using Node.js adapter in standalone mode. All routes are dynamically rendered by default unless explicitly marked with `export const prerender = true`.

### Import Aliases

Configured path aliases (see `tsconfig.json` and `components.json`):
- `@/components` - UI components
- `@/lib` - Libraries and utilities
- `@/hooks` - React hooks

## Astro Conventions

- Use **uppercase** HTTP method names for API handlers: `GET`, `POST`, etc.
- Mark API routes with `export const prerender = false`
- Use Astro View Transitions API for smooth page transitions
- Leverage `Astro.cookies` for server-side cookie management
- Access environment variables via `import.meta.env`
- Extract business logic into services in `src/lib/services`
- Use Zod for input validation in API routes

## React Guidelines

- Use functional components with hooks (no class components)
- **Never use "use client"** or other Next.js directives
- Use `React.memo()` for expensive components that re-render frequently
- Implement code-splitting with `React.lazy()` and `Suspense`
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive calculations
- Use `useId()` for accessibility attributes
- Consider `useOptimistic` for optimistic UI updates
- Use `useTransition` for non-urgent state updates

## Styling with Tailwind

- Use `@layer` directive for organizing styles (base, components, utilities)
- Leverage arbitrary values: `w-[123px]` for one-off designs
- Use `theme()` function in CSS to access Tailwind theme values
- Implement dark mode with `dark:` variant
- Use responsive variants: `sm:`, `md:`, `lg:`, `xl:`
- Apply state variants: `hover:`, `focus-visible:`, `active:`

## Shadcn/ui Components

Components are installed in `src/components/ui/`. To add new components:

```bash
npx shadcn@latest add [component-name]
```

Example usage:
```tsx
import { Button } from "@/components/ui/button"

<Button variant="outline">Click me</Button>
```

Browse available components at https://ui.shadcn.com/

## Backend & Database (Supabase)

### Setup Structure

The Supabase integration follows this file structure:
- `src/db/supabase.client.ts` - Supabase client initialization with typed Database
- `src/db/database.types.ts` - Auto-generated types from Supabase schema
- `src/middleware/index.ts` - Makes Supabase client available via `context.locals.supabase`
- `src/env.d.ts` - TypeScript definitions for environment variables and Astro locals
- `supabase/migrations/` - Database migration files
- `supabase/config.toml` - Supabase CLI configuration

### Usage Guidelines

- Access Supabase client from `context.locals.supabase` in Astro routes (never import directly)
- Use `SupabaseClient<Database>` type from `src/db/supabase.client.ts` (not from `@supabase/supabase-js`)
- Environment variables: `SUPABASE_URL` and `SUPABASE_KEY` (accessed via `import.meta.env`)
- Validate all backend data exchanges with Zod schemas
- Store shared types in `src/types.ts`

### Database Migrations

Migration files in `supabase/migrations/` must follow the naming convention:
```
YYYYMMDDHHmmss_short_description.sql
```

Example: `20240906123045_create_profiles.sql`

**SQL Migration Guidelines:**
- Write all SQL in lowercase
- Include header comments with migration purpose and affected tables
- Always enable Row Level Security (RLS) on new tables
- Create granular RLS policies (one per operation: select, insert, update, delete)
- Separate policies for `anon` and `authenticated` roles (never combine)
- Add extensive comments for destructive operations (drop, truncate, alter)
- For public tables, RLS policies can simply return `true`

## Code Quality Standards

### Error Handling Pattern

- Handle errors and edge cases **at the beginning** of functions
- Use **early returns** for error conditions (avoid deep nesting)
- Place the **happy path last** for readability
- Avoid unnecessary `else` statements (use if-return pattern)
- Use guard clauses for preconditions and invalid states
- Implement proper error logging with user-friendly messages

### Accessibility (ARIA)

- Use ARIA landmarks (main, navigation, search)
- Set `aria-expanded` and `aria-controls` for expandable content
- Use `aria-live` regions for dynamic content updates
- Apply `aria-hidden` to hide decorative content from screen readers
- Use `aria-label`/`aria-labelledby` for elements without visible labels
- Use `aria-describedby` for form inputs and complex elements
- Implement `aria-current` for navigation state
- Avoid redundant ARIA that duplicates native HTML semantics

## Linting & Formatting

- ESLint configured with TypeScript, React, Astro, and accessibility rules
- Prettier integration for formatting
- React Compiler plugin enforces React 19 best practices
- Pre-commit hooks via Husky run linters on staged files
- Console statements trigger warnings (use sparingly)
