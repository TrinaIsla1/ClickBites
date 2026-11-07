-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- Lets shop owners upload their own banner (cover) photo. Safe to run again.

alter table public.shops add column if not exists banner_url text;

-- Optional check: if an owner gets "You do not have permission" when saving the shop
-- form, look at how the update policy on shops is written. If it lists allowed columns,
-- add banner_url to that list.
--   select policyname, cmd, qual, with_check from pg_policies where tablename = 'shops';
--
-- Banners use the existing "shop-images" bucket, in the same folder as the logo
-- ("<shop id>/banner"), so the existing storage upload policy should already cover it.
