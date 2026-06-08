// Map CareStream's ISO 639-3 language codes to BCP-47 locales for browser speech
// recognition (dictation) and synthesis (read-aloud), so voice works in the staff
// member's own language rather than the device's UI language.
const BCP47: Record<string, string> = {
  eng: 'en-GB', pol: 'pl-PL', ron: 'ro-RO', por: 'pt-PT', spa: 'es-ES', fra: 'fr-FR',
  deu: 'de-DE', ita: 'it-IT', ara: 'ar-SA', hin: 'hi-IN', ben: 'bn-BD', urd: 'ur-PK',
  guj: 'gu-IN', pan: 'pa-IN', tam: 'ta-IN', tel: 'te-IN', kan: 'kn-IN', mal: 'ml-IN',
  nep: 'ne-NP', sin: 'si-LK', tgl: 'fil-PH', yor: 'yo-NG', som: 'so-SO', swa: 'sw-KE',
  lit: 'lt-LT', cym: 'cy-GB', zho: 'zh-CN', bho: 'hi-IN', sna: 'sn-ZW', hat: 'ht-HT',
  pcm: 'en-NG', jam: 'en-JM',
}

export function bcp47(iso: string | null | undefined): string {
  if (!iso) return 'en-GB'
  return BCP47[iso] ?? 'en-GB'
}
