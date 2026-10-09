# Garmin — React rebuild

This repo has been rebuilt as a modern React + TypeScript + Vite fitness dashboard.

## Stack

- React 18
- TypeScript
- Vite
- Recharts
- Zustand
- React Router
- Supabase client integration ready

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment values if needed:
   ```bash
   cp .env.example .env.local
   ```
   Example contents:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_APP_NAME=Garmin
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
5. Preview the production build:
   ```bash
   npm run preview
   ```

## Architecture

- `src/app` — app shell and route composition
- `src/components` — reusable view components
- `src/data` — mock and backend-adapter data
- `src/lib` — environment and shared library utilities
- `src/pages` — page-level screens
- `src/services` — typed data loading and API layer
- `src/store` — application state persistence
- `src/types` — domain model definitions

## Backend compatibility

The app preserves the current Garmin + Supabase integration model, but swaps the legacy static presentation layer for a component-based frontend. The data layer is designed to be compatible with the existing Supabase schema while allowing structured mock fallbacks for local development.

## Notes

- The legacy static app remains in the repo for compatibility reference.
- PWA support can be layered through Vite plugin tooling or a custom service worker later.
