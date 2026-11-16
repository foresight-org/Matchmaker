import { profilePageUrl } from "@/lib/onsite/profile-url"
import { qrSvgMarkup } from "@/lib/onsite/qr"

const SIZE: Record<"tile" | "row" | "pair" | "hero", string> = {
  tile: "h-16 w-16",
  row: "aspect-square h-full max-h-[5.5rem] w-auto min-h-0",
  pair: "h-28 w-28",
  hero: "h-20 w-20",
}

/**
 * Profile QR on a wall card. The code fills the card height and sits on
 * paper, so the modules stay large enough to scan from a seat. Scans open
 * /profile/{slug}; a session cookie skips sign-in.
 */
export function TileProfileQr({
  origin,
  slug,
  tone,
  label,
}: {
  origin: string
  slug: string
  tone: "tile" | "row" | "pair" | "hero"
  label: string
}) {
  const url = profilePageUrl(origin, slug)
  // Low correction keeps the modules fat. The paper pad is the quiet zone.
  const svg = qrSvgMarkup(url, { border: 0, ecc: "L" })

  return (
    <div
      className={`${SIZE[tone]} shrink-0 bg-paper p-1 text-ink shadow-[inset_0_0_0_1px_var(--color-rule)]`}
      role="img"
      aria-label={label}
      title={label}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
