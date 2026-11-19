-- Champions team IDs: the 10-character, case-sensitive code the game gives
-- for a shared "Replica Team". There is no public API that turns a code back
-- into a team, so the site only stores and shows it; players enter it in the
-- game themselves (see the Obsidian vault: team-id-preview-brief.md).
-- `src/lib/database.types.ts` is hand-written from the migrations.
--
-- Idempotent: safe to run again. The column uses `if not exists`; nothing is
-- dropped anywhere in this migration.
--
-- No new policies: the existing row-level policies on `teams` cover every
-- column, so the owner reads and writes their own ID ("own teams") and other
-- players see it only on public teams ("public teams are readable"). CI
-- (db.yml) checks that a private team's ID is not readable by another user.

alter table public.teams
  add column if not exists game_team_id text
    constraint teams_game_team_id_check check (
      game_team_id is null
      or game_team_id ~ '^[A-Za-z0-9]{10}$'
    );
