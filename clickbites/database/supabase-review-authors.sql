-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- It lets the site show each reviewer's name and profile picture on reviews.
-- It exposes ONLY name, avatar and customer code, and ONLY for customers who have written a review.
-- Nothing else from profiles (email, phone, role) is exposed. Safe to run again.

create or replace view public.review_authors as
select p.customer_code, p.name, p.avatar_url
from public.profiles p
where p.customer_code is not null
  and exists (select 1 from public.reviews r where r.customer_code = p.customer_code);

grant select on public.review_authors to anon, authenticated;
