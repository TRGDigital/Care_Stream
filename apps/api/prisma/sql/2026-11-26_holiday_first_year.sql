-- Holiday: the allocation for the REMAINDER of the year a person starts in (a part year starter), next to their full yearly allocation. Safe to run more than once.
-- first_year_allowance is in the same unit as the person's allowance (hours or days). It is used only for the holiday year that contains their start date.
-- Nothing existing is changed. Until this is run, the new box saves nothing and balances use the full allocation as before.
alter table public.holiday_staff add column if not exists first_year_allowance numeric(7,2);
