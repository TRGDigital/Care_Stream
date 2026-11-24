// UK bank holidays on which the live support chat is CLOSED (England and Wales, which is where the team works).
// Source: https://www.gov.uk/bank-holidays.json ("england-and-wales"), fetched and checked on 24 Nov 2026.
// Add the next year here each autumn when GOV.UK publishes it: a test fails once the list no longer covers next year.
export const SUPPORT_BANK_HOLIDAYS: Record<string, string> = {
  '2026-01-01': 'New Year’s Day',
  '2026-04-03': 'Good Friday',
  '2026-04-06': 'Easter Monday',
  '2026-05-04': 'Early May bank holiday',
  '2026-05-25': 'Spring bank holiday',
  '2026-08-31': 'Summer bank holiday',
  '2026-12-25': 'Christmas Day',
  '2026-12-28': 'Boxing Day',
  '2027-01-01': 'New Year’s Day',
  '2027-03-26': 'Good Friday',
  '2027-03-29': 'Easter Monday',
  '2027-05-03': 'Early May bank holiday',
  '2027-05-31': 'Spring bank holiday',
  '2027-08-30': 'Summer bank holiday',
  '2027-12-27': 'Christmas Day',
  '2027-12-28': 'Boxing Day',
}
