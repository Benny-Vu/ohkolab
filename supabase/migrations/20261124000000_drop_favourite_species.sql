-- Part 5 of the quality wave: remove the favourite Pokémon field.
-- The owner dropped the feature; nothing in the app reads or writes the
-- column any more (no view, RPC or policy references it). Idempotent so
-- it is safe to re-run. One live profile carries a value; it is simply
-- discarded. Applies only with the owner's go-ahead.
alter table public.profiles
  drop column if exists favourite_species;
