import { AltMapProvider } from '@/components/alt-map-provider'
import { getSiteAltMap, trainingAltsFor } from '@/lib/image-alts'

// Adds the console alt text for the training images a page shows (lib/image-alts.ts). Pass the
// page's own data (module records, demo payloads, topic lists): every training image path found
// in it is looked up, and only those entries are sent to the browser.
export async function AltScope({ data, children }: { data: unknown; children: React.ReactNode }) {
  const map = trainingAltsFor(await getSiteAltMap(), data)
  return <AltMapProvider map={map}>{children}</AltMapProvider>
}
