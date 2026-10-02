-- Converts nationalities that were typed as free text before the pick-list existed
-- into ISO country codes (see lib/nationalities.ts). Only touches rows that are not
-- already a 2-letter code, so it is safe to run more than once. Anything it doesn't
-- recognise is left exactly as it was - the app shows unknown values as stored.
-- Run in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.

update public.worker_profiles
set nationality = case lower(trim(nationality))
  when 'egypt'    then 'EG'
  when 'egyptian' then 'EG'
  when 'مصر'      then 'EG'
  when 'مصري'     then 'EG'
  when 'sudan'    then 'SD'
  when 'sudanese' then 'SD'
  when 'السودان'  then 'SD'
  when 'سوداني'   then 'SD'
  else nationality
end
where nationality !~ '^[A-Z]{2}$';
