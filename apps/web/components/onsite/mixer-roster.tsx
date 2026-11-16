"use client"

import { useEffect, useState } from "react"
import { TileProfileQr } from "@/components/onsite/tile-profile-qr"
import { useT } from "@/lib/i18n/client"
import { boardSurface, roleInk } from "@/lib/onsite/track-skin"
import { bySurname, letterSpan, ROSTER_PAGE_SIZE, rosterRemaining, rosterWindow } from "@/lib/onsite/roster-page"
import type { OnsiteFeed } from "@/lib/onsite/types"

/**
 * The mixer directory. Names stay alphabetical. The page is labeled by the
 * surname letters on it, so the room waits for "D–F" rather than a full name.
 */
export function MixerRoster({
  people,
  profileOrigin,
  profileQrLabel,
}: {
  people: OnsiteFeed["people"]
  profileOrigin: string
  profileQrLabel: string
}) {
  const t = useT()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    function tick() {
      setNow(Date.now())
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [])

  const ordered = [...people].sort(bySurname)
  const windowed = rosterWindow(ordered.length, now ?? 0)
  const slice = ordered.slice(windowed.start, windowed.end)
  const nextStart = windowed.end >= ordered.length ? 0 : windowed.end
  const nextSlice = ordered.length > slice.length ? ordered.slice(nextStart, nextStart + ROSTER_PAGE_SIZE) : []
  const span = letterSpan(slice.map((person) => person.org_name))
  const nextSpan = letterSpan(nextSlice.map((person) => person.org_name))
  const remaining = now === null ? 1 : rosterRemaining(now)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="mb-2 shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="flex min-w-0 items-baseline gap-3">
            <span className="font-listing text-4xl uppercase leading-none tracking-tight">{span}</span>
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
              {t("onsite.feed.roster_span")}
            </span>
          </p>
          {nextSpan ? (
            <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              {t("onsite.feed.roster_next", { span: nextSpan })}
            </p>
          ) : null}
        </div>
        <div className="mt-1.5 h-1 w-full bg-paper-shade" aria-hidden="true">
          <div className="h-full bg-teal" style={{ width: `${Math.round(remaining * 100)}%` }} />
        </div>
      </div>
      <ul className="grid min-h-0 flex-1 grid-cols-2 grid-rows-8 gap-2">
        {slice.map((person) => (
          <li key={person.id} className="min-h-0 min-w-0">
            <article
              className={`grid h-full min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden border-2 px-2 py-0.5 ${boardSurface(person)}`}
            >
              <div className="min-h-0 min-w-0 overflow-hidden">
                <p className="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.12em]">
                  <span className={roleInk(person.capital)}>{person.kind_label}</span>
                </p>
                <h3 className="mt-0.5 truncate font-listing text-[15px] uppercase leading-none tracking-tight">
                  {person.org_name}
                </h3>
                {person.detail ? (
                  <p className="mt-0.5 line-clamp-2 break-words text-[12px] leading-tight text-ink-soft [overflow-wrap:anywhere]">
                    {person.detail}
                  </p>
                ) : null}
              </div>
              <div className="flex h-full min-h-0 items-center py-0.5">
                <TileProfileQr origin={profileOrigin} slug={person.slug} tone="row" label={profileQrLabel} />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}
