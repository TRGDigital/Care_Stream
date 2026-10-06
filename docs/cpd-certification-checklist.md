# When a course is CPD Certified

Rule: the moment The CPD Certification Service certifies a course, everything CareStream says about
it switches over together: the page, the shop, the schema, the CPD page and indexing. Most of it
follows one flag; the rest is this checklist.

## Automatic once the flag is set (no code change)
Setting `training_modules.cpd_accredited = true` on the course's `tier = 'cpd'` module, and pointing
`training_topics.shop_module_id` at that module, drives:
- the CPD Certified logo on the course page, the course card on /staff-training and related cards;
- "CPD Certified Course" in the trust list, CPD hours in the stats strip, the CPD certificate;
- the Course schema (`lib/schema.ts` `courseSchema`, called from
  `app/(marketing)/staff-training/[slug]/page.tsx`): the EducationalOccupationalCredential
  recognised by The CPD Certification Service, numberOfCredits in CPD hours, syllabusSections from
  the lessons, the real course length, the image;
- the /cpd-certified list (built from the catalogue);
- "Related CPD Certified training" on every certified course page.
Pages pick it up within the hour (data cache). To force it, bump the `?v=` cache keys on getModule
and getModuleDemo in `staff-training/[slug]/page.tsx`.

## Still to do by hand
1. Back up first (`cpd_switch_backup`), then set the flag and shop_module_id in the database.
2. Add the month certified to `CERTIFIED_SINCE` in `app/(marketing)/cpd-certified/page.tsx`.
3. Replace the demo lesson translations (`demo_translations`, pol and hin) because the demo now
   comes from the certified module.
4. Write the course page copy in `lib/course-cro-cpd.ts` (who it is for, benefits, moments,
   resources) from the course's real lessons.
5. Offers: add the course slug to the training offers in the Funnel Insights calendar
   (`fi_offers`, and `site_offers` to apply at once).
6. Check the schema in https://validator.schema.org (no errors or warnings).
7. Resubmit the course page, /cpd-certified and /staff-training to RalfyIndex
   (`ralfyindex_config` key via pg_net, log in `ralfyindex_submissions`).
8. Google Ads: the course may now be advertised (only CPD Certified courses are). Build its keyword
   plan and ad groups in the keyword tool.
