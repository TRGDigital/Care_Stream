// Observed competency checklists for the modules that require a practical
// assessment. Stored on the module as learning_content.practical_checklist
// (a plain string[]), printed as the "Observed competency checklist" sheet and
// signed off by a manager against the staff member's record.
//
// Written to be OBSERVABLE: each line is something an assessor can watch happen and
// tick, in plain British English. Deliberately no doses, target figures or device
// settings — those vary by prescription, care plan and local policy, and a checklist
// that hard-codes them would be wrong somewhere. Items say "in line with the care
// plan / local policy" instead, which is also what a competent worker should do.
//
// Keyed by the standard-library topic title; matched with the same normalisation
// the programme templates use, so punctuation drift does not break the lookup.

export const PRACTICAL_CHECKLISTS: Record<string, string[]> = {

  // ── Universal ──────────────────────────────────────────────────────────────

  'Care Certificate': [
    'Introduces themselves to the person and explains what they are about to do before starting',
    'Gains and records consent, and respects a refusal',
    'Maintains privacy and dignity throughout — closes doors and curtains, keeps the person covered',
    'Communicates at the person\'s pace, checking they have understood',
    'Follows the person\'s care plan and reports anything that has changed',
    'Uses correct hand hygiene at each of the required moments',
    'Recognises the limits of their role and asks for help rather than proceeding unsure',
    'Records the care given accurately and contemporaneously',
    'Knows how to raise a safeguarding concern and can say who they would tell',
  ],

  'Moving and Handling of People': [
    'Checks the person\'s handling risk assessment and care plan before moving them',
    'Explains the move to the person and gains their agreement',
    'Clears and prepares the area, checking floor, footwear and obstacles',
    'Checks the equipment is serviced, undamaged and within its safe working load',
    'Selects the correct sling type and size, and fits it correctly',
    'Adopts a stable base, keeps the load close, and avoids twisting or stooping',
    'Gives clear commands and moves in time with a colleague when working in a pair',
    'Encourages the person to do what they can for themselves',
    'Checks the person is comfortable and safely positioned afterwards',
    'Stops and reassesses if the person shows pain, distress or resistance',
  ],

  'First Aid / Basic Life Support': [
    'Checks for danger and makes the scene safe before approaching',
    'Assesses responsiveness and shouts for help appropriately',
    'Opens the airway correctly and checks breathing for up to 10 seconds',
    'Calls 999 (or delegates the call clearly) and requests a defibrillator',
    'Delivers chest compressions at the correct depth and rate, allowing full recoil',
    'Delivers rescue breaths or applies a compression-only approach as trained',
    'Uses an AED safely — pads placed correctly, everyone clear before a shock',
    'Places a breathing, unresponsive person into the recovery position',
    'Manages choking with correct back blows and abdominal thrusts',
    'Hands over clearly to the ambulance crew and records the event',
  ],

  'Medication Administration and Competency': [
    'Washes hands and prepares a clean, uninterrupted space before starting',
    'Checks the person\'s identity against the MAR chart',
    'Applies the six rights — right person, medicine, dose, route, time and documentation',
    'Checks the medicine label, strength and expiry date against the MAR',
    'Checks for known allergies before administering',
    'Explains the medicine to the person and gains consent',
    'Administers by the prescribed route without touching tablets directly',
    'Stays to confirm the medicine has been taken before signing',
    'Signs the MAR immediately after administration, never in advance',
    'Records a refusal, omission or error correctly and reports it straight away',
    'Stores medicines and controlled drugs securely, and records stock accurately',
  ],

  'Positive Behaviour Support / De-escalation': [
    'Reads and follows the person\'s behaviour support plan and known triggers',
    'Recognises early signs of escalating distress and acts before crisis',
    'Adjusts their own body language, tone, volume and proximity',
    'Gives the person space and time, and avoids confrontation or arguing',
    'Offers realistic choices to return a sense of control to the person',
    'Removes or reduces the trigger in the environment where possible',
    'Keeps themselves, the person and others safe, summoning help appropriately',
    'Uses restrictive intervention only as a last resort, and only as trained and authorised',
    'Stays with the person afterwards and offers reassurance and comfort',
    'Records the incident factually, including what worked, and contributes to the debrief',
  ],

  'Epilepsy and Buccal Midazolam Administration': [
    'Knows the person\'s individual epilepsy care plan and seizure profile',
    'Protects the person from injury during the seizure and does not restrain them',
    'Times the seizure accurately from the point it starts',
    'Identifies correctly when rescue medication is indicated per the care plan',
    'Checks the prescription, medicine, dose and expiry before administering',
    'Administers buccal midazolam into the buccal cavity using correct technique',
    'Monitors airway, breathing and responsiveness after administration',
    'Knows when to call 999 and does so without delay',
    'Places the person in the recovery position once the seizure has ended',
    'Stays with the person through the recovery period and offers reassurance',
    'Records the seizure, the medication given and the outcome, and reports it',
  ],

  'Catheter Care': [
    'Explains the procedure and gains consent, maintaining privacy and dignity',
    'Washes hands and applies gloves and apron, using aseptic technique where required',
    'Performs meatal hygiene correctly with the recommended solution',
    'Keeps the drainage bag below bladder level and off the floor at all times',
    'Checks the tubing for kinks, dependent loops or traction on the catheter',
    'Empties the bag before it becomes over-full, using a clean container per person',
    'Measures and records output accurately on the fluid balance chart',
    'Observes and reports changes in urine colour, odour, sediment or blood',
    'Recognises and escalates signs of infection, blockage or bypassing',
    'Disposes of waste correctly and washes hands afterwards',
  ],

  'PEG Feeding Care': [
    'Checks the feeding regime and prescription against the care plan before starting',
    'Positions the person upright as specified, and keeps them upright afterwards',
    'Washes hands and prepares equipment on a clean surface',
    'Checks the tube position and external length against the recorded measurement',
    'Checks the stoma site for redness, leakage, soreness or overgranulation',
    'Flushes the tube with the prescribed volume of water before and after the feed',
    'Administers the feed at the prescribed rate, never forcing a blocked tube',
    'Gives medicines separately and flushes between each one',
    'Rotates or advances the tube if the care plan requires it',
    'Recognises and escalates a blocked or displaced tube, aspiration or vomiting',
    'Records the feed, flushes, medicines and any concerns',
  ],

  // ── Complex care ───────────────────────────────────────────────────────────

  'Tracheostomy Care': [
    'Checks emergency equipment is present and working at the bedside before care',
    'Knows the tube type, size and the person\'s individual tracheostomy plan',
    'Washes hands and uses aseptic non-touch technique throughout',
    'Provides stoma care and observes the site for redness, discharge or breakdown',
    'Changes tapes securely with a second person, keeping the tube stable',
    'Maintains humidification as prescribed',
    'Checks and maintains cuff pressure where a cuffed tube is in use',
    'Recognises signs of a blocked or displaced tube and acts on the emergency algorithm',
    'Summons help immediately in an airway emergency and starts the correct sequence',
    'Records the care given, secretions observed and any concerns escalated',
  ],

  'Ventilation and Respiratory Support': [
    'Checks the prescribed settings against the person\'s plan before connecting',
    'Confirms alarms are switched on and set to the prescribed limits',
    'Checks the circuit, filters and humidifier are correct, clean and in date',
    'Fits the mask or interface correctly, checking for leaks and pressure areas',
    'Confirms back-up power and a manual ventilation bag are available and working',
    'Observes chest movement, colour, work of breathing and oxygen saturations',
    'Recognises the signs of respiratory deterioration and escalates promptly',
    'Responds correctly to each alarm rather than silencing it',
    'Knows the emergency procedure if ventilation fails and can describe it',
    'Records settings, observations and any interventions accurately',
  ],

  'Airway Suctioning': [
    'Confirms suctioning is indicated rather than performed by routine',
    'Explains the procedure to the person and gains consent where possible',
    'Washes hands and applies PPE including eye protection',
    'Checks suction pressure is set within the prescribed range',
    'Selects the correct catheter size for the tube',
    'Uses aseptic non-touch technique and a clean catheter for each pass',
    'Inserts to the correct depth without applying suction on insertion',
    'Applies suction on withdrawal only, and keeps within the recommended time',
    'Allows the person to recover between passes and monitors saturations and colour',
    'Stops and escalates if the person deteriorates during the procedure',
    'Observes and records the volume, colour and consistency of secretions',
  ],

  'Enteral Feeding and Stoma Care': [
    'Checks the feed, rate and route against the current prescription',
    'Washes hands and prepares equipment on a clean surface',
    'Positions the person as specified and keeps them upright afterwards',
    'Checks tube position and external length before use',
    'Assesses the stoma site for infection, leakage or overgranulation and treats per plan',
    'Flushes with the prescribed volume before and after feed and medicines',
    'Administers medicines separately, flushing between each',
    'Recognises and escalates blockage, displacement, vomiting or aspiration',
    'Manages the equipment hygienically and changes giving sets as required',
    'Records feed, flushes, site condition and any concerns',
  ],

  'Cough Assist': [
    'Confirms the prescribed settings and the person\'s individual plan before use',
    'Explains the procedure and gains consent, checking the person is ready',
    'Checks the circuit, filter and interface are correct, clean and in date',
    'Positions the person appropriately and fits the interface with a good seal',
    'Delivers the prescribed number of cycles, pausing as specified',
    'Coordinates with the person\'s own breathing and cough effort',
    'Monitors saturations, colour, comfort and effectiveness throughout',
    'Recognises contraindications and stops if the person deteriorates',
    'Suctions or clears secretions afterwards as required',
    'Cleans equipment per manufacturer guidance and records the session and outcome',
  ],

  // ── Nursing homes ──────────────────────────────────────────────────────────

  'Wound Care and Dressings': [
    'Reviews the wound care plan and previous assessment before starting',
    'Explains the procedure, gains consent and manages the person\'s pain first',
    'Prepares a clean field and uses aseptic non-touch technique throughout',
    'Removes the old dressing without contaminating the wound or themselves',
    'Assesses and measures the wound, recording size, bed, exudate and surrounding skin',
    'Recognises and reports signs of infection or deterioration',
    'Cleans or irrigates the wound as specified in the plan',
    'Selects and applies the prescribed dressing correctly and secures it',
    'Disposes of clinical waste correctly and performs hand hygiene',
    'Records the assessment, dressing used and the review date, and photographs if the plan requires it',
  ],

  'Pressure Ulcer Categorisation and Tissue Viability Management': [
    'Carries out a risk assessment on admission and re-assesses after any change',
    'Inspects all pressure areas and skin tone changes, including under devices',
    'Categorises pressure damage accurately and can justify the category given',
    'Distinguishes pressure damage from moisture-associated skin damage',
    'Implements the repositioning schedule and records each reposition',
    'Checks that the correct mattress and cushion are in place and set correctly',
    'Addresses nutrition, hydration and continence as part of prevention',
    'Reports new or deteriorating damage promptly and raises a safeguarding or incident report where required',
    'Records the assessment and category clearly, with a review date',
  ],

  'Subcutaneous, Intramuscular and Insulin Injections': [
    'Checks the prescription, medicine, dose, route and expiry before drawing up',
    'Confirms the person\'s identity and checks for allergies',
    'Explains the injection and gains consent',
    'Washes hands and prepares equipment using aseptic non-touch technique',
    'Draws up the correct dose accurately, using an insulin syringe or pen for insulin',
    'Selects an appropriate site and rotates sites, checking for lipohypertrophy',
    'Uses the correct needle length, angle and technique for the route',
    'Disposes of the sharp immediately into a sharps bin without re-sheathing',
    'Observes the person afterwards for an adverse reaction',
    'Records the administration and site immediately, and reports any error',
  ],

  'Syringe Drivers and Anticipatory (End of Life) Medicines': [
    'Checks the prescription, medicines, diluent and compatibility before setting up',
    'Has the set-up and dose independently checked where policy requires it',
    'Draws up accurately and labels the syringe with medicines, dose, time and date',
    'Selects an appropriate site, avoiding oedematous or broken skin',
    'Primes the line and sets the correct rate and duration on the device',
    'Checks the device is running, the battery is adequate, and it is secured safely',
    'Checks the site at every shift for redness, swelling, leakage or pain',
    'Assesses whether symptoms are controlled and escalates when they are not',
    'Administers and records breakthrough (PRN) doses correctly',
    'Records checks, site condition and stock balance accurately, and stores CDs correctly',
  ],

  'Venepuncture and Cannulation': [
    'Checks the request, confirms the person\'s identity and gains consent',
    'Checks for allergies, anticoagulation and any contraindicated limb',
    'Washes hands and prepares equipment on a clean tray',
    'Positions the limb, applies the tourniquet correctly and selects a suitable vein',
    'Decontaminates the skin for the required contact time and lets it dry',
    'Inserts at the correct angle using a no-touch technique',
    'Fills tubes in the correct order and inverts them as required',
    'Releases the tourniquet before withdrawing, and achieves haemostasis',
    'Secures the cannula, applies a sterile dressing and documents the insertion',
    'Disposes of sharps immediately at the point of use',
    'Labels samples at the bedside and completes the request accurately',
  ],

  // ── Hospices ───────────────────────────────────────────────────────────────

  'Verification of Expected Death': [
    'Confirms the death was expected and that verification is within their role and competence',
    'Checks the relevant documentation, including any DNACPR and advance care plan',
    'Observes for absence of a central pulse and absence of respiration for the required period',
    'Checks pupils are fixed and unresponsive to light',
    'Records the date and time of death accurately',
    'Treats the person\'s body with dignity and respects their cultural and religious wishes',
    'Communicates with the family with compassion and clarity',
    'Notifies the GP, next of kin and any other required parties promptly',
    'Completes verification documentation fully and accurately',
    'Manages medicines, including controlled drugs, per policy after death',
  ],

  'Syringe Drivers and Subcutaneous Medication': [
    'Checks the prescription, medicines, diluent and compatibility before setting up',
    'Has the set-up independently checked where policy requires it',
    'Draws up accurately and labels the syringe fully',
    'Selects an appropriate subcutaneous site and inserts correctly',
    'Sets the correct rate and duration and confirms the device is running',
    'Checks the site each shift for inflammation, leakage or pain, and re-sites when needed',
    'Assesses symptom control and escalates unrelieved symptoms promptly',
    'Administers and records PRN doses correctly',
    'Explains the driver to the person and their family in plain language',
    'Records checks and controlled drug balances accurately',
  ],

  // ── Dental practices ───────────────────────────────────────────────────────

  'Dental Decontamination and HTM 01-05': [
    'Wears the correct PPE for the decontamination role being performed',
    'Transports contaminated instruments safely in a closed, rigid container',
    'Keeps the dirty-to-clean flow in one direction with no cross-over',
    'Cleans instruments correctly by the method in use, following manufacturer guidance',
    'Inspects instruments for cleanliness and damage under illuminated magnification',
    'Loads the steriliser correctly without overloading or overlapping',
    'Runs and checks the correct sterilisation cycle and confirms cycle parameters',
    'Completes the daily, weekly and periodic tests and records the results',
    'Stores and dates processed instruments correctly to protect sterility',
    'Maintains decontamination records that trace instruments to the cycle',
  ],

  'Medical Emergencies in the Dental Practice': [
    'Locates the emergency drugs kit and oxygen and confirms they are in date',
    'Checks the AED is present, accessible and serviceable',
    'Recognises the presentation of the emergencies the practice must be prepared for',
    'Manages an airway and delivers oxygen at the correct flow rate',
    'Recognises anaphylaxis and administers adrenaline by the correct route and site',
    'Recognises hypoglycaemia and treats it appropriately',
    'Starts basic life support promptly and effectively',
    'Calls 999 clearly with the practice address and delegates roles',
    'Works as part of the team, following the practice emergency protocol',
    'Records the event and restocks the emergency kit afterwards',
  ],

  // ── Domiciliary care ───────────────────────────────────────────────────────

  'Medication Support in the Community': [
    'Checks the care plan to confirm the level of medication support agreed',
    'Confirms the person\'s identity and gains consent before support',
    'Washes hands and prepares in a clean space in the person\'s home',
    'Checks the MAR chart, medicine, dose, route and time before support',
    'Distinguishes correctly between prompting, assisting and administering',
    'Checks expiry dates and the condition of the medicine',
    'Supports the person to take the medicine without rushing them',
    'Signs the MAR immediately after, and records refusals or omissions',
    'Stores medicines safely in the home as agreed in the plan',
    'Reports errors, missed doses and stock running low without delay',
  ],

  // ── GP practices ───────────────────────────────────────────────────────────

  'Vaccine Storage and Cold Chain': [
    'Checks and records fridge minimum, maximum and current temperatures daily',
    'Resets the thermometer after each reading',
    'Confirms the fridge is a dedicated pharmaceutical fridge, not a domestic one',
    'Stores vaccines with air circulation, away from walls, floor and cooling plate',
    'Rotates stock by expiry date and does not overfill',
    'Never stores food, drink or specimens in the vaccine fridge',
    'Recognises a cold chain excursion and quarantines affected stock immediately',
    'Reports an excursion and seeks advice before using or discarding stock',
    'Maintains accurate stock and temperature records available for audit',
    'Knows the contingency plan for a fridge or power failure',
  ],

  // ── Independent hospitals ──────────────────────────────────────────────────

  'Sterile Services and Instrument Decontamination': [
    'Wears the correct PPE for the stage of the process',
    'Maintains a single-direction dirty-to-clean workflow with no cross-over',
    'Handles and transports contaminated instruments safely and in closed containers',
    'Cleans and disinfects using validated equipment and correct cycles',
    'Inspects instruments for cleanliness, function and damage before packing',
    'Packs and seals instruments correctly with the right indicators',
    'Loads the steriliser correctly and confirms the cycle parameters were met',
    'Completes and records the required daily and periodic test regime',
    'Stores sterile stock correctly, protecting integrity and rotating by date',
    'Maintains full traceability from instrument set to patient and cycle',
  ],

  // ── Substance misuse ───────────────────────────────────────────────────────

  'Substance Withdrawal and Detoxification': [
    'Reviews the person\'s detox plan and prescribed regime before each intervention',
    'Uses the withdrawal assessment tool in use correctly and at the required frequency',
    'Records observations accurately and recognises a deteriorating trend',
    'Recognises the red flags requiring urgent medical escalation',
    'Escalates promptly and clearly to the prescriber or emergency services',
    'Supports hydration, nutrition and rest through withdrawal',
    'Administers or supports prescribed withdrawal medication correctly',
    'Communicates calmly and without judgement, managing distress and agitation',
    'Recognises seizure and delirium risk and takes appropriate precautions',
    'Records interventions, observations and escalations fully',
  ],

  'Overdose Response and Naloxone': [
    'Recognises the signs of an opioid overdose, including pinpoint pupils and shallow breathing',
    'Checks for danger and makes the scene safe',
    'Assesses responsiveness and breathing, and opens the airway',
    'Calls 999 immediately, or delegates the call clearly',
    'Locates and checks the naloxone kit and its expiry',
    'Administers naloxone by the correct route, site and dose',
    'Provides rescue breaths or basic life support as required',
    'Repeats naloxone if there is no response and the protocol allows',
    'Stays with the person, recognising that overdose can recur as naloxone wears off',
    'Places the person in the recovery position once breathing is restored',
    'Hands over clearly to the ambulance crew and records the event',
  ],
}

// Normalised lookup so punctuation and "&"/"and" drift never breaks the match.
const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()

const BY_NORM = new Map<string, string[]>(
  Object.entries(PRACTICAL_CHECKLISTS).map(([title, items]) => [norm(title), items]),
)

/** The curated checklist for a topic/module title, or null if there isn't one. */
export function checklistForTitle(title: string): string[] | null {
  return BY_NORM.get(norm(title)) ?? null
}

export const PRACTICAL_CHECKLIST_COUNT = Object.keys(PRACTICAL_CHECKLISTS).length
