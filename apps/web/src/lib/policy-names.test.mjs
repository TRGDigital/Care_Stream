// Every role phrase must actually match the wording a policy uses.
//
// Run: node apps/web/src/lib/policy-names.test.mjs
//
// This exists because eight phrases were once written with escaped backslashes, so "\\b" was
// a literal backslash rather than a word boundary. Perfectly valid regex, so TypeScript was
// happy and nothing failed; the phrases simply never matched, and the names would have
// silently stopped appearing in policies. A regex that compiles is not a regex that works.
import fs from "node:fs";

const src = fs.readFileSync(new URL("./policy-names.ts", import.meta.url), "utf8");
const block = src.slice(src.indexOf("const ROLE_PHRASES"), src.indexOf("export function applyRoleNames"));
const entries = [...block.matchAll(/\{ re: (\/.+?\/i),\s*key: '([a-z_]+)' \}/g)]
  .map(([, re, key]) => ({ re: eval(re), key }));

// One sentence per role, written the way a policy actually writes it.
const SAMPLES = {
  registered_manager: "The Registered Manager is responsible for this policy.",
  safeguarding_lead: "Concerns are reported to the Safeguarding Lead without delay.",
  ipc_lead: "The IPC Lead audits hand hygiene monthly.",
  dignity_champion: "Our Dignity Champion supports staff with this.",
  caldicott_guardian: "The Caldicott Guardian approves any disclosure.",
  fire_safety_officer: "The Fire Safety Officer carries out the weekly test.",
  maintenance_lead: "The Maintenance Lead keeps the inventory of gas appliances.",
  health_safety_lead: "The Health and Safety Lead reviews the risk assessment.",
  medicines_lead: "The Medicines Lead completes the monthly audit.",
  data_protection_officer: "Report the breach to the Data Protection Officer.",
  deputy_manager: "In their absence the Deputy Manager takes this on.",
  moving_handling_lead: "The Moving and Handling Lead reviews each assessment.",
  mental_capacity_lead: "The Mental Capacity Lead oversees best interests decisions.",
  end_of_life_lead: "The End of Life Care Lead reviews the care plan.",
  water_safety_lead: "The Water Safety Lead records the monthly flushing.",
  training_lead: "The Training Lead books the annual refresher.",
  freedom_to_speak_up_guardian: "You may speak to the Freedom to Speak Up Guardian in confidence.",
  complaints_lead: "The Complaints Lead acknowledges every complaint within three days.",
  first_aid_lead: "The First Aid Appointed Person checks the kit each month.",
  food_safety_lead: "The Food Safety Lead signs off the allergen matrix.",
  nutrition_hydration_lead: "The Nutrition and Hydration Lead reviews weight records.",
  falls_lead: "The Falls Lead reviews every fall at the monthly meeting.",
  tissue_viability_lead: "The Tissue Viability Lead reviews every pressure ulcer.",
  business_continuity_lead: "The Business Continuity Lead maintains the emergency plan.",
};

let bad = 0;
for (const { re, key } of entries) {
  const sample = SAMPLES[key];
  if (!sample) {
    console.log(`FAIL  ${key}: no sample sentence, so the phrase is untested`);
    bad++;
    continue;
  }
  if (!re.test(sample)) {
    console.log(`FAIL  ${key}: ${re} does not match ${JSON.stringify(sample)}`);
    bad++;
  }
}

// A literal backslash in a phrase is the bug this file was written for.
for (const { re, key } of entries) {
  if (/\\\\/.test(re.source)) {
    console.log(`FAIL  ${key}: escaped backslash in ${re}, so it can never match`);
    bad++;
  }
}

// Every role in settings must have a phrase, or its name never reaches a document.
const settings = fs.readFileSync(
  new URL("../../../api/src/routes/settings.ts", import.meta.url), "utf8");
const keys = [...settings.matchAll(/\{ key: '([a-z_]+)',\s*role:/g)].map(m => m[1]);
const havePhrase = new Set(entries.map(e => e.key));
for (const k of keys) {
  if (!havePhrase.has(k)) {
    console.log(`FAIL  ${k} is a settings role with no phrase in policy-names.ts`);
    bad++;
  }
}

console.log(bad ? `\n${bad} failure(s)` : `\npolicy names: ${entries.length} phrases all match, all settings roles covered`);
process.exit(bad ? 1 : 0);
