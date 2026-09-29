// Food Hygiene Annual Refresher: full course content for CPD submission.
//
// Framework: Skills for Care, Statutory and mandatory training guide for adult
// social care employers (December 2025), food hygiene row. Its three headings
// (importance of food safety; food safety requirements and practices; good
// hygiene when providing and supporting people with food and drink) are mapped
// section by section in the timings table. The practice content follows the
// Food Standards Agency: Safer food, better business supplement for residential
// care homes (June 2026), the gov.uk food hygiene guide for businesses and the
// FSA fitness to work guidance. Knowledge only: no observed practical.
//
// Timings total 60 minutes and duration_minutes is set from them. Applied to
// the tier='cpd' module by scripts/apply-cpd-course.ts; the prebuilt tier is
// never touched.

import type { CpdCourse } from './cpd-course-types'

export const CPD_FOOD_HYGIENE: CpdCourse = {
  module_id: '944b8b12-7c19-4cfd-ac7f-7c1f5deaa915',
  name: 'Food Hygiene Annual Refresher',
  duration_minutes: 60,
  pass_mark: 80,
  frequency: 'annual',
  renewal_months: 12,
  requires_practical: false,
  description:
    'Annual food hygiene refresher for care workers who prepare, handle or serve food, or support people to eat ' +
    'and drink, in any adult social care setting. Built on the Skills for Care statutory and mandatory training ' +
    'guide and Food Standards Agency guidance for care homes, it covers why food safety matters, personal hygiene ' +
    'and fitness to work, chilling, cooking and reheating, cross contamination, cleaning, the 14 allergens, texture ' +
    'modified diets, gift food, and recording and reporting. Eight lessons with scenarios and activities, then a ' +
    'final assessment.',
  entry_requirements:
    'Foundation level. For care workers who handle food or support people to eat and drink in residential, ' +
    'nursing, home care, supported living and day services. No prior qualification is needed. It refreshes ' +
    'existing knowledge and does not replace a Level 2 or Level 3 food safety qualification where your workplace ' +
    'requires one for kitchen staff.',
  summary:
    'Eight short lessons, each with a care scenario, an interactive activity and a quick check with an ' +
    'explanation. You start with a five question knowledge check so your learning gain can be measured, and ' +
    'finish with a 32 question assessment with a pass mark of 80%. Skills for Care recommends refreshing food ' +
    'hygiene at least every three years; this course is designed to be taken every year.',
  outcomes: [
    'Explain why food safety matters for the people you support, and the legal duties on your workplace and on you',
    'Describe the personal hygiene and fitness to work rules for anyone who handles food',
    'Apply the correct temperatures and time limits for chilling, cooking, hot holding, cooling and reheating',
    'Identify how cross contamination happens in a care setting and the two stage clean that controls it',
    'Apply a person\'s documented allergy, dietary and texture requirements every time food or drink is served',
    'Know what to record and what to report, including suspected food poisoning',
  ],
  key_points: [
    'The people you support are more likely to become seriously ill from food poisoning, so every safe method matters',
    'Report diarrhoea or vomiting before your shift and stay away until 48 hours after symptoms stop',
    'Chilled food at 8°C or below by law, fridges set at 5°C or below, frozen food at minus 18°C or below',
    'Cook to 70°C for 2 minutes (or 75°C for 30 seconds), hold hot food at 63°C or above, reheat once until steaming hot',
    'Keep raw and ready to eat food apart, and clean then disinfect, leaving the disinfectant for its contact time',
    'Check every meal against the care plan for the 14 allergens, special diets and IDDSI texture level',
    'Record checks at the time, and report two or more people with similar symptoms straight away',
  ],
  timings: [
    { part: 'Pre-course knowledge check, 5 questions', minutes: 3 },
    { part: 'Section 1. Importance of food safety: why it matters in care', minutes: 5 },
    { part: 'Section 2. Good hygiene: personal hygiene and fitness to work', minutes: 5 },
    { part: 'Section 3. Requirements and practices: chilling, storage and dates', minutes: 5 },
    { part: 'Section 4. Requirements and practices: cooking, hot holding, cooling and reheating', minutes: 5 },
    { part: 'Section 5. Requirements and practices: preventing cross contamination', minutes: 4 },
    { part: 'Section 6. Requirements and practices: cleaning, disinfecting and pests', minutes: 5 },
    { part: 'Section 7. Requirements and practices: allergens, special diets and texture modified food', minutes: 5 },
    { part: 'Section 8. Good hygiene when supporting people with food and drink: mealtimes, gift food, records and reporting', minutes: 5 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
  ],
  baseline: [
    { id: 'pc1', text: 'What is the legal maximum temperature for chilled food in England?', options: ['5°C', '8°C', '10°C', '63°C'], correct: 1 },
    { id: 'pc2', text: 'A yoghurt is one day past its use by date but looks and smells fine. What should happen to it?', options: ['Serve it, it looks fine', 'Throw it away', 'Freeze it to make it safe', 'Serve it to staff only'], correct: 1 },
    { id: 'pc3', text: 'After diarrhoea or vomiting, how long should a care worker stay away from handling food once the symptoms stop?', options: ['Until they feel better', '24 hours', '48 hours', 'One week'], correct: 2 },
    { id: 'pc4', text: 'How many allergens must food businesses, including care settings, give information about?', options: ['8', '10', '12', '14'], correct: 3 },
    { id: 'pc5', text: 'You have washed a worktop with hot soapy water. What makes it safe for preparing food?', options: ['Drying it with a tea towel', 'A disinfectant left on for its contact time', 'Rinsing it with cold water', 'Nothing more is needed'], correct: 1 },
  ],
  sections: [
    {
      heading: 'Why food safety matters in care',
      minutes: 5,
      body:
        'Food poisoning is unpleasant for a healthy adult. For many of the people you support it can be dangerous. Ageing weakens the immune system, and illness, some medicines, diabetes and difficulty eating and drinking all reduce the body\'s ability to fight infection. A stomach bug that a younger person shakes off in a day can lead to dehydration, falls, a hospital admission and, at worst, death. That is why the Food Standards Agency asks care settings to take extra care, and why food hygiene training is expected for anyone who handles food or supports people with it.\n\n' +
        'Most food poisoning comes from a small number of germs. Campylobacter and Salmonella are carried on raw poultry, meat and eggs. E. coli O157 spreads from raw meat and from soil on vegetables, and a tiny dose can cause kidney failure. Clostridium perfringens grows in large batches of stew or gravy that cool too slowly. Norovirus spreads from people, surfaces and food and is the classic cause of outbreaks in care settings. Listeria is a particular risk for older and vulnerable people because it can grow slowly even in a fridge, in foods such as pâté, smoked fish and soft cheese.\n\n' +
        'The law treats your workplace as a food business. The Food Safety Act 1990 makes it an offence to serve food that is unsafe. Food hygiene regulations require food to be handled hygienically, staff to be supervised and trained for their role, and a written food safety management system based on HACCP principles, which most care settings meet with the Safer Food, Better Business pack. The Health and Social Care Act 2008 (Regulated Activities) Regulations 2014, which the Care Quality Commission enforces, require people\'s nutrition and hydration needs to be met (Regulation 14) and care to be safe (Regulation 12).\n\n' +
        'Your part is personal. Follow the safe methods every time, keep the records you are asked to keep, and speak up when something is not right. Environmental health officers inspect care settings and give a food hygiene rating, but the standard that really matters is what happens on every shift.',
      scenario: {
        situation: 'A new colleague says food hygiene is only for the cook: "We just serve it, the kitchen deals with safety." You are about to plate up puddings from the trolley in the dining room.',
        prompt: 'How would you respond?',
        answer: 'Food safety depends on everyone who touches food, not only the cook. Care staff wash hands, serve, carry trays, store snacks, make drinks and help people eat, and each of those points can bring in germs or allergens. Explain this kindly, point out that the people you support are more vulnerable to food poisoning than most, and follow the safe methods together. If the colleague has not had food hygiene training, let the senior know so it can be arranged.',
      },
      check: {
        question: 'Why does the Food Standards Agency ask care settings to take extra care with food?',
        options: ['Older and unwell people are more likely to become seriously ill from food poisoning', 'Care settings are inspected more often than restaurants', 'Care staff are not allowed to cook', 'Food in care settings is always prepared in advance'],
        correct: 0,
        explanation: 'Ageing, illness and some medicines weaken the immune system, so food poisoning is both more likely and more serious for the people you support. That is the reason behind every extra precaution in this course.',
      },
      image_prompt: 'A calm care home dining room at lunchtime. A care worker in a clean disposable apron carries a covered plate on a tray towards a table where an older person waits. Clean surfaces, a menu card on the table.',
      image_alt: 'A care worker in a clean apron carrying a covered plate to an older person at a dining table',
    },
    {
      heading: 'Personal hygiene and fitness to work',
      minutes: 5,
      body:
        'Hands are the main route by which germs and allergens reach food. Wash and dry your hands before handling food or anything that touches food, and every time you come from another task. In a care setting that includes after helping someone use the toilet, emptying a commode or catheter bag, handling soiled linen or clothing, touching bins, raw meat, raw eggs or unwashed vegetables, touching pets or their bowls, and after coughing, sneezing or touching your face or phone. Use soap and warm running water, rub every surface of both hands for at least 20 seconds, rinse, and dry thoroughly with a disposable paper towel. Hand gel does not replace washing before you handle food, and it works less well than washing against norovirus.\n\n' +
        'What you wear matters. Before serving food or helping someone to eat, put on a clean or disposable apron, so that germs from personal care on your uniform cannot reach the food. Tie back long hair, keep nails short and free of varnish, and keep jewellery to a plain band. Cover cuts and sores with a brightly coloured waterproof dressing, usually blue, so it can be seen if it falls off.\n\n' +
        'Fitness to work is a legal duty, not a matter of how you feel. Report to your manager straight away, before your shift, if you have diarrhoea or vomiting, stomach pain, nausea, fever or jaundice, an infected skin, nose or throat condition, or if someone you live with has diarrhoea or vomiting. The FSA advises that staff with diarrhoea or vomiting stay away from open food, normally until 48 hours after the symptoms have stopped naturally. In a care setting this usually means staying off work altogether, because personal care and food service are so closely linked.\n\n' +
        'Coming in while ill, however short staffed the team is, is how outbreaks start. One person\'s shift can become a whole unit\'s illness.',
      scenario: {
        situation: 'You wake at 5am after being sick twice in the night. By 6am you feel much better, and you are due on the breakfast shift at 7am. The team is already two people down.',
        prompt: 'What should you do?',
        answer: 'Phone the manager or senior on duty before the shift, tell them you have been vomiting, and do not come in. Feeling better is not the test: the advice is to stay away until 48 hours after symptoms have stopped naturally, because you can still pass the infection on. One person working while infectious can start an outbreak that takes far more of the team off sick and puts vulnerable people at serious risk.',
      },
      check: {
        question: 'You have just helped someone use the toilet and now need to serve drinks. What should you do first?',
        options: ['Use hand gel and carry on', 'Put a fresh pair of gloves on', 'Serve the drinks, then wash your hands', 'Remove your gloves and apron, wash and dry your hands, then put on a clean apron'],
        correct: 3,
        explanation: 'Personal care contaminates your hands and uniform. Gloves and apron come off, hands are washed with soap and water and dried, and a clean apron goes on before you handle food or drink. Gel does not replace washing before food.',
      },
      image_prompt: 'A care worker washing their hands thoroughly with soap under running water at a hand wash basin in a care home kitchen, paper towel dispenser beside the sink, a clean apron hanging ready.',
      image_alt: 'A care worker washing their hands with soap at a hand basin, with paper towels and a clean apron ready',
    },
    {
      heading: 'Chilling, storage and dates',
      minutes: 5,
      body:
        'Cold slows the growth of bacteria but does not kill them, so chilled food is only safe while it stays cold. The law in England, Wales and Northern Ireland requires chilled food to be kept at 8°C or below. Fridges are set at 5°C or below so there is a margin when the door is opened, and the FSA\'s care home guidance asks that fridges run at or below 5°C. Freezers run at minus 18°C or below. Fridge and freezer temperatures are checked and recorded at least daily, and a reading out of range is reported at once so the food can be assessed by someone responsible.\n\n' +
        'Store food so that nothing can drip or spread. Raw meat, poultry and fish go in sealed containers on the bottom shelf, below ready to eat food such as cooked meats, cheese, desserts and salads. Cover and label everything once opened, with what it is and the date. Unless the label says otherwise, use opened food within two days. Rotate stock so the oldest food, still in date, is used first, and put chilled and frozen deliveries away straight away. Chilled food can be kept out of the fridge for no more than four hours, for example on a buffet; after that it must be thrown away.\n\n' +
        'The two dates mean different things. A use by date is about safety: never serve food after its use by date, even if it looks and smells fine, because bacteria such as Listeria do not change how food looks or smells. A best before date is about quality: food may be safe after it but can lose flavour and texture. Eggs are the exception, and should always be used by their best before date.\n\n' +
        'Defrost frozen food in the fridge, not on the side, unless the pack says it can be cooked from frozen. Do not refreeze food that has been defrosted unless it has been cooked first. Medicines that need to be kept cold belong in a separate medicines fridge, not with food.',
      scenario: {
        situation: 'At the start of the late shift you check the kitchenette fridge on your unit. The thermometer reads 11°C. Inside are yoghurts, a plate of sandwiches made at lunchtime and a jug of milk.',
        prompt: 'What do you do?',
        answer: 'Do not use the food yet. Report the reading to the senior or cook straight away and record it. The food has been above the legal limit of 8°C for an unknown time, so someone responsible must decide whether it is safe, and high risk ready to eat food such as the sandwiches is likely to be thrown away. Check the door has not been left ajar and the fridge is not overloaded, move any food that is kept to a working fridge, and arrange a repair. Write in the diary what went wrong and what was done.',
      },
      check: {
        question: 'Which of these belongs on the bottom shelf of the fridge?',
        options: ['Cooked ham', 'Raw chicken in a sealed container', 'A trifle', 'Cheese'],
        correct: 1,
        explanation: 'Raw meat, poultry and fish always go at the bottom, sealed, so they cannot drip onto ready to eat food that will not be cooked again before it is eaten.',
      },
      image_prompt: 'An open commercial fridge in a care home kitchen, neatly organised: covered and labelled ready to eat food on the upper shelves, raw meat in sealed containers on the bottom shelf, a fridge thermometer visible on a shelf.',
      image_alt: 'An organised fridge with labelled ready to eat food above and raw meat sealed on the bottom shelf',
    },
    {
      heading: 'Cooking, hot holding, cooling and reheating',
      minutes: 5,
      body:
        'Thorough cooking kills most harmful bacteria. The FSA\'s standard advice is to cook food until the centre reaches 70°C for two minutes. Other combinations give the same safety, such as 75°C for 30 seconds or 80°C for 6 seconds, which is why many kitchens simply check for 75°C. Push a clean, disinfected probe thermometer into the thickest part. Poultry, pork, burgers, sausages and rolled joints must have no pink meat and the juices must run clear. Probes are checked regularly for accuracy: in iced water they should read between minus 1°C and 1°C, and in boiling water between 99°C and 101°C.\n\n' +
        'Hot food that is not served straight away must be kept at 63°C or above. It can be kept below 63°C for up to two hours, once. After that it must be cooled quickly to 8°C or below, or thrown away. This matters in care, where meals are kept for people who are out, asleep or eating late. A plate left covered on the side is sitting in the danger zone, between 8°C and 63°C, where bacteria multiply fastest.\n\n' +
        'Cool leftovers as quickly as possible, ideally within 90 minutes, by dividing them into smaller, shallow containers, then cover, label and refrigerate them. Reheat food until it is steaming hot all the way through and check it with the probe. Food is reheated once only. Never just warm food through, and never top up a hot holding dish with fresh food.\n\n' +
        'Microwaves heat unevenly, so stir the food and let it stand before checking it. Then think about the person eating it: food that has just reached a safe temperature can scald. Let it cool to a comfortable eating temperature before you offer it, particularly to someone who cannot tell you it is too hot.\n\n' +
        'Write your checks in the kitchen records at the time. If a check is not recorded, nobody can show that it happened.',
      scenario: {
        situation: 'Arthur is at a hospital appointment and will miss lunch. His roast dinner has been plated, and a colleague suggests leaving it covered on the side until he gets back, probably in about three hours.',
        prompt: 'What should you do?',
        answer: 'Do not leave it at room temperature, which is the danger zone. Agree a safe plan with the cook: either keep it hot at 63°C or above in the hot cupboard, or cool it quickly, cover, label and refrigerate it, then reheat it once until steaming hot throughout when Arthur returns, checked with a probe and recorded. Let it cool to a comfortable temperature before serving. Offering him a freshly made meal on his return is also a good option.',
      },
      check: {
        question: 'A plate of food has been kept warm below 63°C for two hours and has not been eaten. What must happen now?',
        options: ['Leave it until the person wants it', 'Keep it warm for another hour', 'Cool it quickly to 8°C or below, or throw it away', 'Top it up with fresh hot gravy'],
        correct: 2,
        explanation: 'Hot food can be kept below 63°C for up to two hours, once. After that the only safe choices are to cool it quickly and refrigerate it, or to throw it away.',
      },
      image_prompt: 'A cook in a care home kitchen checking the centre of a tray of cooked food with a digital probe thermometer, a temperature record sheet and pen on the counter beside them.',
      image_alt: 'A cook checking cooked food with a probe thermometer next to a temperature record sheet',
    },
    {
      heading: 'Preventing cross contamination',
      minutes: 4,
      body:
        'Cross contamination is the spread of harmful bacteria, viruses or allergens from one place to another: from raw food to ready to eat food, from hands, cloths and equipment to food, and in a care setting from personal care, laundry, pets and medicines into the kitchen. It is one of the most common causes of food poisoning, and you cannot see it happening.\n\n' +
        'The most important rule is to keep raw and ready to eat food apart at every stage: delivery, storage, preparation, cooking and serving. Use separate chopping boards, knives and utensils for raw and ready to eat food. Many kitchens use colour coding, and you follow your kitchen\'s system every time. Complex equipment that is hard to clean inside, such as slicers, mincers and vacuum packers, must never be used for both raw and ready to eat food, because the FSA\'s E. coli O157 guidance accepts that cleaning cannot be relied on to remove all bacteria from it. Do not wash raw chicken or other raw meat: splashes spread bacteria around the sink and worktop, and cooking kills them anyway.\n\n' +
        'Care settings have routes that a restaurant does not. Kitchen cloths and mops stay in the kitchen and are never used in other areas; disposable cloths and paper towels are safest. Dirty laundry and laundry baskets never go into the kitchen or onto a food surface. Pets and their bowls stay out of kitchens and food stores. Visitors do not come into the kitchen.\n\n' +
        'Allergens cross contaminate too, and cooking does not make an allergen safe. A knife used on ordinary bread and then on gluten free bread, a spoon moved between dishes, or crumbs in a shared toaster can make someone with coeliac disease ill or cause a severe allergic reaction. Prepare allergen free food first, with clean equipment on a cleaned surface, and store it covered and separate.',
      scenario: {
        situation: 'You are making afternoon sandwiches. You have just buttered ordinary bread. Next is a sandwich for Patricia, who has coeliac disease. The gluten free bread is ready beside the butter dish you have been using.',
        prompt: 'What must you do before making Patricia\'s sandwich?',
        answer: 'Stop and reset. Clean and disinfect the surface, wash your hands, and use a clean knife and butter that no knife used on ordinary bread has touched, such as a single portion or a separate labelled tub. The shared butter dish now has gluten crumbs in it. Cover and label Patricia\'s sandwich before it goes on the trolley, and next time make the gluten free sandwich first.',
      },
      check: {
        question: 'Why must slicers and vacuum packers never be shared between raw and ready to eat food?',
        options: ['Cleaning cannot be relied on to remove all bacteria from inside them', 'They are too slow to clean between jobs', 'The law says they are for cooked meat only', 'They blunt quickly'],
        correct: 0,
        explanation: 'The FSA\'s E. coli O157 guidance treats complex equipment as impossible to clean reliably between uses, so keeping separate equipment for raw and ready to eat food is the only safe control.',
      },
      image_prompt: 'A clean kitchen worktop with separate colour coded chopping boards laid out, red for raw meat and green for salad, with separate knives, and a covered labelled container of gluten free sandwiches set apart.',
      image_alt: 'Separate colour coded chopping boards and knives, with a covered gluten free sandwich set apart',
    },
    {
      heading: 'Cleaning, disinfecting and pests',
      minutes: 5,
      body:
        'Cleaning removes dirt, grease and food. Disinfecting kills bacteria and viruses. You need both, in that order, because a disinfectant cannot work through grease. This is the two stage clean. First clean the surface with hot soapy water or a detergent and rinse it. Then apply a disinfectant and leave it for the full contact time on the label before wiping or rinsing. Check the product: to be sure it kills bacteria, its label should show BS EN 1276 or BS EN 13697. A spray that is wiped straight off has not disinfected anything.\n\n' +
        'Clean as you go, and always clean and disinfect surfaces and equipment after raw food and before ready to eat food. Food contact surfaces, chopping boards, utensils, fridge handles, taps, light switches, bins and trolleys all need regular cleaning, and your workplace\'s cleaning schedule sets what is cleaned, how often and with which products. A commercial dishwasher is the most reliable way to clean and disinfect crockery and utensils; report it if it is not reaching its temperature.\n\n' +
        'Cloths spread bacteria quickly. Use disposable cloths where you can, or wash reusable ones at a high temperature after each shift. Tea towels are not for wiping hands or surfaces.\n\n' +
        'The FSA\'s care home supplement adds mini kitchens: kitchenettes on units, satellite kitchens and service trolleys. They belong on a cleaning schedule with opening and closing checks, and are cleaned and disinfected before food is prepared or served, especially where people use them unsupervised, because you cannot know how they were used before you.\n\n' +
        'After an accident such as vomiting or diarrhoea, clear up promptly wearing a disposable apron and gloves, clean and then disinfect the area using your infection control procedure, and wash your hands, so nothing spreads towards food areas. Pests carry disease: report droppings, gnawed packaging, insects or holes at once, keep food covered and off the floor, and keep bins lidded and emptied.',
      scenario: {
        situation: 'In the kitchenette on your unit you are about to make toast and drinks for supper. The worktop looks clean, but a relative made a sandwich there earlier and one resident sometimes uses the kettle on their own.',
        prompt: 'What should you do before you start?',
        answer: 'Treat the surface as unclean, because you cannot know how it was used. Do a two stage clean: clean it with hot soapy water or detergent and rinse, then apply a disinfectant marked BS EN 1276 or BS EN 13697 and leave it for the contact time on the label, then dry it with a disposable paper towel. Check the fridge temperature and the dates on anything stored, and record the clean on the kitchenette checklist.',
      },
      check: {
        question: 'What is the correct order for a two stage clean?',
        options: ['Disinfect, then clean', 'Clean only, as detergent kills bacteria', 'Disinfect and wipe straight off', 'Clean, then disinfect and leave it for the contact time'],
        correct: 3,
        explanation: 'Disinfectant cannot work through grease and food, so the surface is cleaned first. The disinfectant then needs its full contact time, shown on the label, to kill bacteria.',
      },
      image_prompt: 'A care worker spraying disinfectant onto a clean kitchenette worktop on a care home unit, a bottle of detergent and a roll of disposable paper towels nearby, a small cleaning checklist on the wall.',
      image_alt: 'A care worker disinfecting a kitchenette worktop, with detergent, paper towels and a cleaning checklist',
    },
    {
      heading: 'Allergens, special diets and texture modified food',
      minutes: 5,
      body:
        'UK law requires food businesses, including care settings that provide meals, to give accurate information about 14 allergens when they are ingredients: celery, cereals containing gluten (such as wheat, rye, barley and oats), crustaceans, eggs, fish, lupin, milk, molluscs, mustard, tree nuts, peanuts, sesame, soya, and sulphur dioxide and sulphites. A reaction can range from itching and swelling to anaphylaxis, a life threatening reaction affecting breathing and circulation, and a trace can be enough. Coeliac disease is not an allergy, but gluten causes real harm, so the same care is needed.\n\n' +
        'The information must be right every time. Kitchens keep allergen information for every dish, usually a matrix or recipe cards, and it must be updated whenever a recipe or supplier changes, because a substitute product can bring a new allergen. Before you serve, check the person\'s documented allergies and diet in their care plan against the dish, not from memory. If you are unsure what is in something, do not guess and do not serve it until you have checked. Some people cannot remember or tell you their allergies, which makes your check the only safeguard. If your workplace wraps food on site before it is offered, for example sandwiches for a café, ask your manager whether it needs a full ingredients label under the prepacked for direct sale rules, sometimes called Natasha\'s Law.\n\n' +
        'If someone shows signs of a severe reaction, such as swelling of the lips, tongue or throat, difficulty breathing, wheezing or collapse, call 999, follow the person\'s plan, including their adrenaline auto injector if they have one and you are trained to use it, and stay with them.\n\n' +
        'People with swallowing difficulties may have texture modified food and thickened drinks prescribed by a speech and language therapist using the IDDSI framework: drinks are levels 0 to 4 and foods levels 3 to 7. The wrong level can cause choking or aspiration pneumonia, so check the level in the care plan and on the food every time, and report any coughing, choking or change in swallowing.',
      scenario: {
        situation: 'David has a severe tree nut allergy recorded in his care plan. At lunch he asks for the chocolate cake. The allergen matrix shows it contains almonds. He says a small slice will be fine, he has had cake before.',
        prompt: 'What should you do?',
        answer: 'Do not serve it. Almonds are tree nuts and a trace can cause anaphylaxis. Explain kindly why, offer a nut free alternative he enjoys, and tell the senior. David has the right to make his own choices, but a quick request at the table is not an informed decision about a life threatening risk. If he keeps wanting to take that risk, it is for the care team to discuss with him, including how well he understands it, and to record in his care plan. Record what happened today.',
      },
      check: {
        question: 'How should you check whether a dish is safe for someone with a food allergy?',
        options: ['Ask the person, they will know', 'Check their care plan against the dish\'s current allergen information', 'Look at the dish for anything they might react to', 'Ask a colleague who knows them well'],
        correct: 1,
        explanation: 'Allergens are often invisible, and people cannot always remember or explain their allergies. The care plan checked against the current allergen information for that dish is the reliable check.',
      },
      image_prompt: 'A care worker at a serving trolley comparing a printed allergen chart with a plated meal before serving it, small allergen symbols on the chart, a separate plate with a coloured label for a special diet.',
      image_alt: 'A care worker checking a plated meal against an allergen chart before serving it',
    },
    {
      heading: 'Mealtimes, gift food, records and reporting',
      minutes: 5,
      body:
        'Good food hygiene continues after food leaves the kitchen. Before serving food or helping someone to eat, wash your hands and put on a clean or disposable apron. Help people to clean their own hands before they eat, which is easily missed and matters as much as your own. Visitors who help at mealtimes wash their hands first. Serve food promptly, keep it covered on trolleys and trays, and return uneaten food to the kitchen rather than leaving it in rooms.\n\n' +
        'Food brought in as gifts needs thought, because you cannot know how it was handled. The FSA advises care settings to encourage low risk food such as washed fruit, biscuits and chocolate, to discourage hot food, and to ask families to check for allergens. Chilled gift food goes in a fridge, ideally separate from the main kitchen fridge, covered and labelled with the person\'s name and the date it arrived, and is thrown away at its use by date. Food kept in people\'s rooms is checked regularly. If you support people in their own homes or in supported living, the same principles apply: help them check dates and fridge temperatures, keep raw and ready to eat food apart and clean as you go, while respecting that it is their home and their choice.\n\n' +
        'Records show that food safety is being managed. They include fridge and freezer temperatures, cooking and reheating probe checks, cleaning schedules, delivery checks and the Safer Food, Better Business diary. Fill them in at the time and accurately. A record written up later from memory is not evidence.\n\n' +
        'Report promptly: a fridge out of range, food past its date or in damaged packaging, signs of pests, faulty equipment, poor practice you see, and any illness of your own. If two or more people become unwell with similar symptoms such as diarrhoea or vomiting, tell the senior on duty straight away. Your manager will follow the outbreak procedure, which includes contacting the local UKHSA health protection team. Do not throw away food that might be the cause until you are told to, as it may help the investigation.',
      scenario: {
        situation: 'A resident\'s son brings in a homemade trifle with fresh cream for his mother\'s birthday and leaves it on her bedside table. He asks you to let her have it "whenever she fancies it" over the next few days.',
        prompt: 'What should you do?',
        answer: 'Thank him, and explain that cream desserts are high risk and need to go in the fridge now. Check the ingredients with him against his mother\'s allergies, diet and texture level if she has one. Label it with her name and today\'s date, store it covered in the gift food fridge and use it within two days, as it is homemade. Share your workplace\'s gift food advice with him for next time.',
      },
      check: {
        question: 'When should a fridge temperature or a probe check be recorded?',
        options: ['At the end of the week', 'Only when something is wrong', 'At the time the check is made', 'Before an inspection'],
        correct: 2,
        explanation: 'Records are evidence that food safety is being managed. Written at the time, they are reliable; written up later from memory, they are not.',
      },
      image_prompt: 'A family visitor handing a covered dessert in a lidded container to a care worker in a care home lounge, the care worker holding a label and pen, a small fridge in the background.',
      image_alt: 'A visitor handing a covered homemade dessert to a care worker who is ready to label it',
    },
  ],
  activities: [
    {
      id: 'fh-act-1', type: 'match', after_section: 0,
      title: 'Know the germs',
      instructions: 'Match each germ to where it comes from or how it spreads.',
      pairs: [
        { term: 'Campylobacter', definition: 'Raw chicken and other poultry' },
        { term: 'Norovirus', definition: 'Spreads from person to person and via surfaces; the classic cause of care setting outbreaks' },
        { term: 'Listeria', definition: 'Can grow slowly in the fridge in foods such as pâté, smoked fish and soft cheese' },
        { term: 'Clostridium perfringens', definition: 'Grows in large batches of stew or gravy that cool too slowly' },
        { term: 'E. coli O157', definition: 'From raw meat and soil on vegetables; a tiny dose can cause kidney failure' },
      ],
    },
    {
      id: 'fh-act-2', type: 'sort', after_section: 1,
      title: 'Fit to work with food?',
      instructions: 'Sort each situation. Which must you report to your manager before your shift?',
      bins: [
        { id: 'report', name: 'Report before your shift', note: 'You may need to stay away from food or work' },
        { id: 'fine', name: 'Fine to work', note: 'With good hygiene as usual' },
      ],
      items: [
        { text: 'You vomited in the night but feel better now', bin: 'report' },
        { text: 'Your partner has had diarrhoea since yesterday', bin: 'report' },
        { text: 'An infected cut on your finger', bin: 'report' },
        { text: 'Yellowing of your skin or the whites of your eyes', bin: 'report' },
        { text: 'A small clean cut covered with a blue waterproof dressing', bin: 'fine' },
        { text: 'Feeling tired after a busy weekend', bin: 'fine' },
      ],
    },
    {
      id: 'fh-act-3', type: 'sort', after_section: 2,
      title: 'Use it or lose it',
      instructions: 'Sort each item. Is it safe to use, or must it not be used?',
      bins: [
        { id: 'use', name: 'Safe to use', note: 'Within safety rules' },
        { id: 'discard', name: 'Do not use', note: 'A safety risk' },
      ],
      items: [
        { text: 'A yoghurt one day past its use by date that looks fine', bin: 'discard' },
        { text: 'A tin of soup a month past its best before date, tin undamaged', bin: 'use' },
        { text: 'Eggs past their best before date', bin: 'discard' },
        { text: 'Opened ham labelled yesterday, kept at 4°C', bin: 'use' },
        { text: 'Sandwiches that have been on a buffet for five hours', bin: 'discard' },
        { text: 'Sealed biscuits a week past their best before date', bin: 'use' },
      ],
    },
    {
      id: 'fh-act-4', type: 'match', after_section: 3,
      title: 'The numbers that keep food safe',
      instructions: 'Match each temperature rule to what it is for.',
      pairs: [
        { term: '70°C for 2 minutes', definition: 'The FSA\'s standard core temperature for cooking' },
        { term: '63°C or above', definition: 'Keeping hot food hot until it is served' },
        { term: '8°C or below', definition: 'The legal maximum for chilled food' },
        { term: '5°C or below', definition: 'Where fridges in care settings should run' },
        { term: 'Steaming hot all the way through', definition: 'Reheating food, once only' },
      ],
    },
    {
      id: 'fh-act-5', type: 'sort', after_section: 4,
      title: 'Stopping the spread',
      instructions: 'Sort each practice. Does it prevent or cause cross contamination?',
      bins: [
        { id: 'prevent', name: 'Prevents cross contamination', note: 'Safe practice' },
        { id: 'cause', name: 'Causes cross contamination', note: 'Unsafe practice' },
      ],
      items: [
        { text: 'Keeping kitchen cloths for kitchen use only', bin: 'prevent' },
        { text: 'Making the gluten free sandwich first with clean equipment', bin: 'prevent' },
        { text: 'Storing raw meat sealed on the bottom shelf', bin: 'prevent' },
        { text: 'Putting a laundry basket on the worktop for a moment', bin: 'cause' },
        { text: 'Washing raw chicken in the sink', bin: 'cause' },
        { text: 'Using the same slicer for raw bacon and cooked ham after a wipe', bin: 'cause' },
      ],
    },
    {
      id: 'fh-act-6', type: 'order', after_section: 5,
      title: 'The two stage clean',
      instructions: 'Put the steps of cleaning and disinfecting a food surface into order.',
      steps: [
        'Remove loose food debris and waste',
        'Clean with hot soapy water or detergent',
        'Rinse off the detergent',
        'Apply a disinfectant marked BS EN 1276 or BS EN 13697',
        'Leave it on for the contact time stated on the label',
        'Rinse if the label says to, then air dry or dry with a disposable paper towel',
      ],
    },
    {
      id: 'fh-act-7', type: 'match', after_section: 6,
      title: 'Where allergens hide',
      instructions: 'Match each allergen to foods it is often found in.',
      pairs: [
        { term: 'Cereals containing gluten', definition: 'Bread, pasta, pastry and many sauces and gravies' },
        { term: 'Crustaceans', definition: 'Prawns, crab and lobster' },
        { term: 'Molluscs', definition: 'Mussels, squid and oyster sauce' },
        { term: 'Sulphur dioxide and sulphites', definition: 'Dried fruit, wine and some sausages' },
        { term: 'Sesame', definition: 'Tahini, houmous and some breads' },
        { term: 'Milk', definition: 'Butter, cheese, cream and many ready meals' },
      ],
    },
    {
      id: 'fh-act-8', type: 'order', after_section: 7,
      title: 'Supporting someone at a meal',
      instructions: 'Put the steps of supporting a person with their meal into order.',
      steps: [
        'Check the person\'s care plan for allergies, diet and texture level',
        'Wash your hands and put on a clean apron',
        'Help the person to clean their hands',
        'Check the meal matches their needs before you serve it',
        'Serve promptly, at a safe and comfortable eating temperature',
        'Return uneaten food to the kitchen and record intake if required',
      ],
    },
  ],
  references: [
    { title: 'Statutory and mandatory training guide for adult social care employers (December 2025)', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf', source: 'Skills for Care', note: 'The framework this course is mapped to. Its food hygiene row sets the expected content: the importance of food safety, food safety requirements and practices, and good hygiene when supporting people with food and drink.' },
    { title: 'Safer food, better business supplement for residential care homes (June 2026)', url: 'https://www.gov.uk/government/publications/safer-food-better-business-supplement-for-residential-care-homes', source: 'Food Standards Agency', note: 'The FSA safe methods written for care homes: extra care protecting food, mini kitchens and gift food. Sections 2, 5, 6 and 8 draw on it directly.' },
    { title: 'Safer food, better business for caterers', url: 'https://www.food.gov.uk/business-guidance/safer-food-better-business', source: 'Food Standards Agency', note: 'The main food safety management pack that most care kitchens use, including the daily diary, probe checks and opening and closing checks.' },
    { title: 'Food hygiene for your business', url: 'https://www.gov.uk/food-hygiene-businesses', source: 'Food Standards Agency, GOV.UK', note: 'The current rules on cooking, hot holding, reheating, chilling, freezing, defrosting and cleaning. The temperatures in sections 3 and 4 come from here.' },
    { title: 'Fitness to work', url: 'https://www.gov.uk/government/publications/fitness-to-work', source: 'Food Standards Agency, GOV.UK', note: 'Which symptoms food handlers must report, and the 48 hour exclusion after diarrhoea or vomiting. The basis for section 2.' },
    { title: 'E. coli O157 control of cross contamination guidance', url: 'https://www.food.gov.uk/business-guidance/e-coli-cross-contamination-guidance', source: 'Food Standards Agency', note: 'Why raw and ready to eat food need separate equipment, including complex equipment such as slicers and vacuum packers.' },
    { title: 'Allergen guidance for food businesses', url: 'https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses', source: 'Food Standards Agency', note: 'The 14 allergens, how allergen information must be provided, and the prepacked for direct sale labelling rules.' },
    { title: 'Listeria: reducing the risk of vulnerable groups contracting listeriosis', url: 'https://www.food.gov.uk/listeria', source: 'Food Standards Agency', note: 'Guidance for health and social care organisations on the foods and practices that put older and vulnerable people at risk of Listeria.' },
    { title: 'The IDDSI framework', url: 'https://www.iddsi.org/framework', source: 'International Dysphagia Diet Standardisation Initiative', note: 'The levels used for texture modified food and thickened drinks. Use it to check what a person\'s prescribed level means in practice.' },
    { title: 'Regulation 14: Meeting nutritional and hydration needs', url: 'https://www.cqc.org.uk/guidance-providers/regulations/regulation-14-meeting-nutritional-hydration-needs', source: 'Care Quality Commission', note: 'What CQC expects of registered providers on food, drink, special diets and support to eat, alongside the safe care requirements of Regulation 12.' },
  ],
  glossary: [
    { term: 'Cross contamination', definition: 'The spread of harmful bacteria, viruses or allergens from one food, surface, piece of equipment or person to another.' },
    { term: 'Danger zone', definition: 'The temperature range between 8°C and 63°C, where bacteria in food multiply fastest.' },
    { term: 'Two stage clean', definition: 'Cleaning a surface with detergent first to remove dirt and grease, then applying a disinfectant for its full contact time.' },
    { term: 'Contact time', definition: 'How long a disinfectant must stay on a surface to kill bacteria, as stated on its label.' },
    { term: 'Use by date', definition: 'A safety date. Food must not be served after it, even if it looks and smells fine.' },
    { term: 'Best before date', definition: 'A quality date. Food may be safe after it but can lose flavour and texture. Eggs should always be used by it.' },
    { term: 'Allergen', definition: 'A food ingredient that can cause an allergic reaction. UK law names 14 that food businesses must give information about.' },
    { term: 'Anaphylaxis', definition: 'A severe, life threatening allergic reaction affecting breathing and circulation. Call 999.' },
    { term: 'IDDSI', definition: 'The International Dysphagia Diet Standardisation Initiative framework of levels for texture modified food and thickened drinks.' },
    { term: 'HACCP', definition: 'Hazard Analysis and Critical Control Point: identifying where food could become unsafe and checking those points.' },
    { term: 'Safer Food, Better Business', definition: 'The FSA\'s food safety management pack, with safe methods and a daily diary, used by most care kitchens.' },
    { term: 'Probe thermometer', definition: 'A thermometer pushed into the centre of food to check its core temperature. It is cleaned and disinfected between uses.' },
  ],
  practical_checklist: [],
  // Final assessment: four questions per section, 32 in total, 80% to pass (26 of
  // 32), maximum three attempts before the learner is returned to the lesson.
  questions: [
    // Section 1. Why food safety matters in care
    { id: 'q1', text: 'Which group is most likely to become seriously ill from food poisoning?', options: ['Healthy adults aged 20 to 40', 'Older people, and people who are unwell or taking some medicines', 'Staff who eat at work', 'Nobody in particular'], correct: 1 },
    { id: 'q2', text: 'Which germ can grow slowly even at fridge temperatures, and is a particular risk to older people?', options: ['Listeria', 'Campylobacter', 'Clostridium perfringens', 'Norovirus'], correct: 0 },
    { id: 'q3', text: 'Which law makes it an offence to serve food that is unsafe?', options: ['The Care Act 2014', 'The Food Safety Act 1990', 'The Mental Capacity Act 2005', 'The Equality Act 2010'], correct: 1 },
    { id: 'q4', text: 'Most care settings meet the legal requirement for a written food safety management system by using:', options: ['A CQC inspection report', 'The weekly menu', 'The staff rota', 'The Safer Food, Better Business pack'], correct: 3 },
    // Section 2. Personal hygiene and fitness to work
    { id: 'q5', text: 'Which of these must you report to your manager before working with food?', options: ['Someone you live with has diarrhoea', 'You slept badly', 'A small clean cut covered with a blue waterproof dressing', 'You have been on holiday in the UK'], correct: 0 },
    { id: 'q6', text: 'Before helping someone to eat after giving personal care, you should:', options: ['Use hand gel', 'Wash and dry your hands and put on a clean apron', 'Put gloves on over unwashed hands', 'Wipe your hands on your uniform'], correct: 1 },
    { id: 'q7', text: 'How long should you rub your hands together with soap when washing them?', options: ['5 seconds', 'Until the soap bubbles', 'At least 20 seconds', 'At least 2 minutes'], correct: 2 },
    { id: 'q8', text: 'Why is a cut covered with a brightly coloured, usually blue, waterproof dressing?', options: ['It is easy to spot if it falls into food', 'Blue dressings heal faster', 'Blue is the NHS colour', 'It is needed for allergy control'], correct: 0 },
    // Section 3. Chilling, storage and dates
    { id: 'q9', text: 'Fridges in care settings should run at:', options: ['5°C or below', '8°C to 10°C', 'Exactly 0°C', 'Room temperature for dairy products'], correct: 0 },
    { id: 'q10', text: 'Unless the label says otherwise, opened chilled food should be used within:', options: ['A week', 'Five days', 'Two days', 'Its best before date'], correct: 2 },
    { id: 'q11', text: 'A kitchenette fridge reads 11°C at the start of your shift. What should you do first?', options: ['Turn the dial down and carry on', 'Report and record it, so someone responsible can decide whether the food is safe', 'Throw everything away yourself without telling anyone', 'Use the food if it still feels cold'], correct: 1 },
    { id: 'q12', text: 'Which date on a label is about safety rather than quality?', options: ['Best before', 'Display until', 'Use by', 'Packed on'], correct: 2 },
    // Section 4. Cooking, hot holding, cooling and reheating
    { id: 'q13', text: 'The FSA\'s standard advice for cooking food is a core temperature of:', options: ['63°C for 2 minutes', '70°C for 2 minutes', '50°C for 10 minutes', '100°C for 1 minute'], correct: 1 },
    { id: 'q14', text: 'How many times can food be reheated?', options: ['Twice', 'As often as needed, if it is steaming hot', 'Never', 'Once'], correct: 3 },
    { id: 'q15', text: 'Hot food that is not being served straight away must be kept at:', options: ['40°C or above', '50°C or above', 'Room temperature under a cover', '63°C or above'], correct: 3 },
    { id: 'q16', text: 'Why should microwaved food be stirred and left to stand before you check its temperature?', options: ['To stop the plate cracking', 'Microwaves heat unevenly and can leave cold spots', 'To improve the flavour', 'It is a fire safety rule'], correct: 1 },
    // Section 5. Preventing cross contamination
    { id: 'q17', text: 'Where should raw meat be stored in a fridge?', options: ['On the top shelf', 'Next to cooked meat', 'On the bottom shelf, sealed, below ready to eat food', 'In the door'], correct: 2 },
    { id: 'q18', text: 'Why should raw chicken not be washed before cooking?', options: ['It removes the flavour', 'It makes the meat tough', 'It is only allowed in commercial kitchens', 'Splashes spread bacteria around the sink and worktop'], correct: 3 },
    { id: 'q19', text: 'Kitchen cloths and mops should be:', options: ['Used anywhere in the building', 'Shared with the laundry team', 'Kept for kitchen use only', 'Used in bathrooms first, then the kitchen'], correct: 2 },
    { id: 'q20', text: 'Does cooking make an allergen safe for someone who is allergic to it?', options: ['Yes, heat destroys allergens', 'Only for nut allergens', 'Only above 100°C', 'No, cooking does not make an allergen safe'], correct: 3 },
    // Section 6. Cleaning, disinfecting and pests
    { id: 'q21', text: 'Which code on a disinfectant label shows it meets the standard for killing bacteria?', options: ['ISO 9001', 'BS 5839', 'BS EN 1276 or BS EN 13697', 'Any product will do, all sprays kill bacteria'], correct: 2 },
    { id: 'q22', text: 'Kitchenettes and mini kitchens on units should be:', options: ['On a cleaning schedule, and cleaned and disinfected before food is prepared', 'Cleaned only when they look dirty', 'Left to residents to clean', 'Cleaned once a week'], correct: 0 },
    { id: 'q23', text: 'Why must a surface be cleaned before it is disinfected?', options: ['Disinfectant cannot work through grease and food', 'Cleaning is quicker', 'Disinfectant stains dirty surfaces', 'It saves disinfectant'], correct: 0 },
    { id: 'q24', text: 'Someone has vomited in a lounge near the dining area. You should:', options: ['Leave it for housekeeping at the end of the shift', 'Wear a disposable apron and gloves, clean then disinfect the area, and wash your hands', 'Cover it with a paper towel for now', 'Spray air freshener and carry on'], correct: 1 },
    // Section 7. Allergens, special diets and texture modified food
    { id: 'q25', text: 'Which of these is one of the 14 allergens?', options: ['Sesame', 'Tomato', 'Chicken', 'Rice'], correct: 0 },
    { id: 'q26', text: 'A drink is served thinner than the IDDSI level in a person\'s care plan. What is the main risk?', options: ['There is no risk', 'Choking or aspiration pneumonia', 'Food poisoning', 'An allergic reaction'], correct: 1 },
    { id: 'q27', text: 'Which of these could be a sign of anaphylaxis?', options: ['A mild headache', 'Feeling full after a meal', 'Swelling of the lips or tongue and difficulty breathing', 'A single sneeze'], correct: 2 },
    { id: 'q28', text: 'Why must allergen information be updated when a supplier changes a product?', options: ['Prices change', 'A substitute product can contain a different allergen', 'The law requires a new menu every month', 'Suppliers ask for it'], correct: 1 },
    // Section 8. Mealtimes, gift food, records and reporting
    { id: 'q29', text: 'Chilled food brought in by a family as a gift should be:', options: ['Left in the person\'s room', 'Thrown away straight away', 'Frozen', 'Labelled with the person\'s name and date, and kept in the fridge'], correct: 3 },
    { id: 'q30', text: 'Two residents develop vomiting on the same day. You should:', options: ['Wait to see if anyone else becomes ill', 'Clean the rooms and say nothing', 'Tell the senior on duty straight away so the outbreak procedure can start', 'Stop giving them drinks'], correct: 2 },
    { id: 'q31', text: 'Before people eat, as well as washing your own hands, you should:', options: ['Help them to clean their hands', 'Give them hand gel after the meal', 'Ask their family to do it', 'Nothing more is needed'], correct: 0 },
    { id: 'q32', text: 'Food that might have caused people to become ill should be:', options: ['Thrown away straight away', 'Eaten by staff to test it', 'Reheated and served', 'Kept until your manager says otherwise, as it may help the investigation'], correct: 3 },
  ],
}
