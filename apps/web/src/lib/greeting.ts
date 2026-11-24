/** The greeting for an hour of the day (0 to 23): morning until noon, afternoon until six, evening after. */
export function greetingFor(hour: number): 'Good morning' | 'Good afternoon' | 'Good evening' {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
