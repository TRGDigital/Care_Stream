-- The organisation's brand colour (Settings > Letterhead and company details > Brand colour). ONE new column; nothing existing is changed. Safe to run more than once.
-- brand_colour: a hex colour such as #0F766E that reads on white (the API checks it), or empty for the CareStream default. It colours the designed newsletters, the rule and headings on formal letters and reports, and the button in staff and family emails. It never changes body text.
-- Until this is run the rest of the letterhead works as before and saving a colour says it needs a database update.
alter table public.tenant_letterhead add column if not exists brand_colour text;
