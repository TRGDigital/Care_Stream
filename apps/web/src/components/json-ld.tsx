// Renders one or more schema.org objects as a JSON-LD <script> tag. Server
// component, so the structured data is in the initial SSR HTML.
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
