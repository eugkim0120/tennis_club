# Multi-Sport Booking Implementation Plan

> **Goal:** Allow booking for multiple sports. Minimum: Tennis (existing) + Padel (new).
> **Non-goal:** No variable group sizes per sport. Groups always use 4-player auto-booking. No multi-user changes.

**Approach:** Add a `sports` catalog table, tag courts/groups/profiles with their sport type, sport-filter all queries and UI.

**Tech Stack:** Next.js 16, TypeScript, SQLite (better-sqlite3), Tailwind CSS, Jest

---

## Data Model

### New: `sports` table
| name | display_name | description |
|---|---|---|
| tennis | Tennis | Doubles on a tennis court |
| padel | Padel | Doubles on an enclosed padel court |

### New columns (all with safe defaults):
- `courts.sport_type TEXT DEFAULT 'tennis'`
- `profiles.sports TEXT DEFAULT '["tennis"]'`
- `profiles.sport_skills TEXT DEFAULT '{}'`
- `groups.sport_type TEXT DEFAULT 'tennis'`

Old `skill_level` on profiles acts as fallback when `sport_skills` is empty.

---

## Task Breakdown

### Task 1 — Sports catalog table + helper + tests
**Files:** `db.ts` (modify), `sports.ts` (create), `sports.test.ts` (create)

Add `sports` table to initSchema with seed data for tennis + padel.
Create `sports.ts` with `getAllSports()` and `getSport(name)`.
Tests verify the catalog returns correctly.

### Task 2 — Add sport columns via safe migration
**Files:** `db.ts` (modify), `booking.test.ts` (modify), `matching.test.ts` (modify)

ALTER TABLE ADD COLUMN wrapped in try/catch for idempotent migration.
Update all test mock schemas to include the new columns with defaults.

### Task 3 — Multi-sport profiles
**Files:** `profiles.ts` (modify), `validation.ts` (modify)

Update Profile interface with `sports: string[]` and `sport_skills: Record<string, number>`.
Update rowToProfile/createProfile/updateProfile to handle JSON columns.
Add validation for sports array (non-empty, all strings) and sport_skills (object).

### Task 4 — Sport-typed courts + Padel OSM scraping
**Files:** `courts.ts` (modify), `courts/route.ts` (modify)

Add `sport_type` to Court interface, upsert, row parser.
Add `getCourtsByCityAndSport(city, sport)` helper.
Extend OSM scraping: the Overpass query now accepts a sportType param so it can find `[leisure=pitch][sport=padel]` for padel courts.
Update API route to accept `sport` query/filter param.

### Task 5 — Sport-filtered groups and booking
**Files:** `booking.ts` (modify), `groups/route.ts` (modify), `bookings/route.ts` (modify)

Add `sport_type` to Group interface and createGroup() INSERT.
`getOrCreateGroup(city, sportType)` — groups are sport-specific.
`browseGroups()` — optional sportType filter.
`autoBook()` — filters courts by the group's sport_type (so a padel group doesn't book a tennis court).
API routes accept/send `sport_type`.

### Task 6 — Sport-filtered matching
**Files:** `matching.ts` (modify)

`computeStandouts()` filters candidates to those who share at least one sport.
`scoreSkill()` compares using the best shared sport's `sport_skills`, falling back to `skill_level`.
Optional `sportFilter` param to narrow to a single sport.

### Task 7 — Frontend sport selector UI
**Files:** `SportSelector.tsx` (create), `create-game/page.tsx` (modify), `browse/page.tsx` (modify), `games/page.tsx` (modify), `courts/page.tsx` (modify), `page.tsx` (modify)

SportSelector component with pill-style Tennis/Padel buttons.
Create game page: sport picker in form.
Browse page: sport filter tabs.
Games page: sport badge per game.
Courts page: sport filter.
Landing page: generalised text ("Match with players by skill level").

### Task 8 — Integration tests
**Files:** `multi-sport.test.ts` (create)

Test scenarios:
- Sports catalog returns tennis and padel
- Courts filtered by sport_type
- Multi-sport profile creation
- Padel group created and auto-booked to a padel-only court (not a tennis court)
- Browse groups filtered by sport

---

## Backward Compatibility

- All new columns have DEFAULT values that match current tennis-only behaviour
- Existing API calls without sport_type param behave as tennis
- ALTER TABLE wrapped in try/catch for existing production databases
- Old skill_level column acts as fallback for empty sport_skills
