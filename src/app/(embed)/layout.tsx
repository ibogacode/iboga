/**
 * Minimal layout for embed pages (e.g. form view in popup).
 * No sidebar or dashboard chrome - only the page content.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
