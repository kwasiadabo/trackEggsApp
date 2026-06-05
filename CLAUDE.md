# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite, port 5173)
npm run build      # Production build
npm run preview    # Preview production build
```

No test runner or linter is configured. There are no pre-commit hooks.

The dev server proxies `/api/*` → `http://localhost:5000`, so a backend must be running for API calls to work.

## Architecture

**EggTrack** is a React 18 + Vite SPA for managing an egg distribution business. It uses React Router v6, Axios, and no external state library — all state is local `useState` or the single `AuthContext`.

### Data flow

1. `useFetch(fn, deps?)` (`src/hooks/useFetch.js`) is the universal fetch hook. It calls `fn()` on mount, re-calls when `deps` change, and exposes `{ data, loading, error, reload }`. The `data` field is extracted from `res.data.data` — the backend always wraps responses in `{ data: { data: ... } }`.

2. Mutations follow the pattern: `await api.create/update/remove(...)` → `toast('message ✓')` → `reload()`. Errors are caught and surfaced via `toast(err.message, 'error')`.

3. The Axios instance (`src/services/api.js`) auto-attaches `Authorization: Bearer` from `localStorage.accessToken`. On a 401 it silently refreshes via `/api/auth/refresh`, queues in-flight requests, then retries. If refresh fails it clears localStorage and redirects to `/login`.

### Auth & roles

`AuthContext` (`src/context/AuthContext.jsx`) holds `user`, `login()`, `logout()`, `isAdmin`, and `isManager`. Session is restored on mount by calling `/auth/me` if a token exists.

- `isAdmin` — `role === 'admin'`
- `isManager` — `role === 'admin'` **or** `role === 'manager'`
- `isManager` gates all write actions; `isAdmin` gates deletes and the `/users` page.

### Page conventions

Every page in `src/pages/` follows the same CRUD skeleton:

- `EMPTY_FORM` constant for blank form state
- `useFetch` for list data; `customers` / `sales` fetched as secondary lists when needed for selects
- Modal opened with `showForm` + `editItem` (null = create, object = edit)
- `openCreate` / `openEdit(rec)` / `closeForm` helpers
- `handleChange` with `setForm(p => ({ ...p, [e.target.name]: e.target.value }))`
- `ConfirmDelete` component for delete confirmations

### UI primitives (`src/components/ui.jsx`)

| Export | Purpose |
|--------|---------|
| `<Loading />` | Spinner during fetch |
| `<ErrorMsg message />` | API error display |
| `<Empty message />` | Zero-state placeholder |
| `<ToastContainer />` | Mounted once in `AppShell` |
| `toast(msg, type?)` | `type` is `'success'` (default) or `'error'`; auto-dismisses after 3.5 s |
| `fmt(n)` | GH₵ currency — `fmt(1234.5)` → `"GH₵ 1,234.50"` |
| `fmtDate(d)` | `"04 Jun 2024"` — returns `'-'` for null/undefined |
| `<EggBadge size />` | Coloured badge: small=brown, medium=amber, large=green |

### Routing (`src/App.jsx`)

All routes except `/login` are wrapped in `<ProtectedRoute>` which redirects to `/login` if no user. The shell renders `<Sidebar>` + `<Topbar>` + `<ToastContainer>` around the page outlet.

### Design system

Single CSS file: `src/index.css`. Uses CSS custom properties (`--amber`, `--brown`, `--cream`, etc.). Key utility classes: `card`, `btn btn-primary/secondary/danger`, `badge badge-green/amber/brown/red`, `table-wrap > table`, `form-grid`, `stats-grid`, `section-header`, `stat-card amber/green/brown/red`, `text-right`, `amount`.

Mobile-first breakpoints: 480 / 768 / 1024 px. On mobile the sidebar is a drawer toggled by a hamburger button; modals render as bottom sheets.
