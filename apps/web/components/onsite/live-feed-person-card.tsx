import { FittedName } from "@/components/onsite/fitted-name"
import { TileProfileQr } from "@/components/onsite/tile-profile-qr"
import { boardSurface, roleInk } from "@/lib/onsite/track-skin"
import { pairNameMaxPx, tileNameMaxPx } from "@/lib/onsite/name-fit"
import type { OnsiteFeed } from "@/lib/onsite/types"

type Card = OnsiteFeed["people"][number]
type Tone = "pair" | "tile"

function formatLookingFor(labels: readonly string[], heading: string, max: number): string | undefined {
  if (labels.length === 0) return undefined
  const items = labels.slice(0, max).join(" · ")
  const more = labels.length > max ? " …" : ""
  return `${heading}: ${items}${more}`
}

/**
 * Name-first card. Wall tiles auto-fit the full org name; the footer is a
 * fixed band so names and “looking for” never compete for the same pixels.
 */
export function LiveFeedPersonCard({
  org_name,
  slug,
  kind_label,
  one_liner,
  looking_for,
  kind,
  track,
  capital,
  tone,
  lookingForLabel,
  profileOrigin,
  profileQrLabel,
  nameLine = "wrap",
}: Card & {
  tone: Tone
  lookingForLabel?: string
  profileOrigin?: string
  profileQrLabel?: string
  /** Packed walls keep one readable line. Pair posters still wrap the full name. */
  nameLine?: "wrap" | "single"
}) {
  const showSeeking = Boolean(lookingForLabel) && looking_for.length > 0
  const seekingMax = tone === "tile" ? 1 : looking_for.length
  const seekingLine = showSeeking ? formatLookingFor(looking_for, lookingForLabel!, seekingMax) : undefined
  const blurb = tone === "tile" ? undefined : one_liner
  const showQr = Boolean(profileOrigin && profileQrLabel)

  if (tone === "tile") {
    return (
      <article
        className={`relative box-border grid h-full min-h-0 min-w-0 overflow-hidden border-2 ${capital === undefined ? "border-ink border-l-4" : ""} ${boardSurface({ kind, track, capital })} ${
          nameLine === "single"
            ? "grid-rows-[auto_minmax(0,1fr)] px-2 py-1"
            : `grid-rows-[auto_1fr_auto] px-3 py-2 ${showQr ? "pr-20" : ""}`
        }`}
      >
        {showQr ? (
          <div className="absolute right-1 top-1 z-10">
            <TileProfileQr origin={profileOrigin!} slug={slug} tone="tile" label={profileQrLabel!} />
          </div>
        ) : null}
        <p className="shrink-0 truncate pr-1 text-[9px] font-semibold uppercase leading-tight tracking-[0.12em]">
          <span className={roleInk(capital)}>{kind_label}</span>
        </p>
        <FittedName
          name={org_name}
          lines={nameLine}
          maxPx={nameLine === "single" ? 15 : tileNameMaxPx(org_name, { withFooter: showSeeking })}
          minPx={nameLine === "single" ? 11 : 6.5}
        />
        {seekingLine ? (
          <p className="mt-1 shrink-0 break-words text-[8px] font-semibold uppercase leading-[1.2] tracking-wide text-ink-soft [overflow-wrap:anywhere]">
            {seekingLine}
          </p>
        ) : nameLine === "single" ? null : (
          <span aria-hidden="true" />
        )}
      </article>
    )
  }

  return (
    <article
      className={`relative box-border grid h-full min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden border-2 ${capital === undefined ? "border-ink border-l-8" : ""} ${boardSurface({ kind, track, capital })} px-4 py-3 ${showQr ? "pr-32" : ""}`}
    >
      {showQr ? (
        <div className="absolute right-3 top-3 z-10">
          <TileProfileQr origin={profileOrigin!} slug={slug} tone={tone} label={profileQrLabel!} />
        </div>
      ) : null}
      <p className="shrink-0 truncate text-[10px] font-semibold uppercase leading-tight tracking-[0.14em]">
        <span className={roleInk(capital)}>{kind_label}</span>
      </p>
      <FittedName name={org_name} maxPx={Math.min(pairNameMaxPx(org_name), 26)} minPx={16} fill={false} />
      {blurb ? (
        <p className="mt-2 line-clamp-6 min-h-0 overflow-hidden break-words text-[15px] leading-snug text-ink-soft [overflow-wrap:anywhere]">
          {blurb}
        </p>
      ) : (
        <span aria-hidden="true" />
      )}
      {seekingLine ? (
        <p className="mt-2 shrink-0 break-words text-[11px] font-semibold uppercase leading-snug tracking-wide text-ink-soft [overflow-wrap:anywhere]">
          {seekingLine}
        </p>
      ) : null}
    </article>
  )
}
