import { TRACK_FILL, TRACK_LABEL, TRACK_ORDER } from "@/lib/onsite/track-skin"

/**
 * One row under the title. Each swatch is the same fill as the cards.
 * The gold outline is capital, kept apart so it is not a seventh track.
 */
export function TrackLegend({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex shrink-0 items-center gap-x-4 border-b-2 border-ink bg-paper px-4 py-1.5">
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3.5 gap-y-1" aria-label={t("onsite.feed.tracks")}>
        {TRACK_ORDER.map((track) => (
          <li key={track} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">
            <span className={`h-3 w-5 border border-ink ${TRACK_FILL[track]}`} aria-hidden="true" />
            {t(TRACK_LABEL[track])}
          </li>
        ))}
      </ul>
      <p className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">
        <span className="h-3 w-5 border-2 border-mark bg-paper" aria-hidden="true" />
        {t("enum.mixer_role.funder")}
      </p>
    </div>
  )
}
