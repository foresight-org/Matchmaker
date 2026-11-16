import Link from "next/link"
import { boardSurface, roleInk } from "@/lib/onsite/track-skin"
import type { OnsiteCard, OnsiteRoomMatch } from "@/lib/onsite/types"

/**
 * One person, one tap. Read-only by design: in a room you walk over and say
 * hello — the card only has to make that decision easy.
 */

type Person = OnsiteCard | OnsiteRoomMatch

/** Match rows carry a score; plain arrivals do not. */
function isMatch(person: Person): person is OnsiteRoomMatch {
  return "score" in person
}

/** Two labels fit a phone line; the rest live on the profile page. */
const LABEL_MAX = 2

function joinLabels(labels: readonly string[]): string | null {
  if (labels.length === 0) return null
  const shown = labels.slice(0, LABEL_MAX).join(" · ")
  return labels.length > LABEL_MAX ? `${shown} …` : shown
}

/** Translated strings, resolved once by the board rather than per card. */
export interface RoomCardLabels {
  seeking: string
  strongOn: string
  /** Spoken form of the bare score numeral, which reads as noise alone. */
  score: (score: number) => string
}

export function RoomPersonCard({
  person,
  labels,
  mixer = false,
}: {
  person: Person
  labels: RoomCardLabels
  /** Mixer cards lead with the person and the project. The score stays off the card. */
  mixer?: boolean
}) {
  const seeking = mixer ? null : joinLabels(person.looking_for)
  const reasons = !mixer && isMatch(person) ? joinLabels(person.reasons) : null
  const about = person.one_liner || person.detail

  return (
    <li>
      <Link
        href={`/profile/${person.slug}`}
        className={`block border-2 ${boardSurface(person)} ${person.capital === undefined ? "border-l-8 border-ink" : ""} px-4 py-3 active:translate-y-px`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[10px] font-semibold uppercase leading-tight tracking-[0.14em]">
            <span className={roleInk(person.capital)}>{person.kind_label}</span>
          </p>
          {!mixer && isMatch(person) ? (
            <p className="tnum shrink-0 font-listing text-2xl leading-none">
              <span aria-hidden="true">{person.score}</span>
              <span className="sr-only">{labels.score(person.score)}</span>
            </p>
          ) : null}
        </div>

        <p className="mt-1 break-words font-listing text-2xl uppercase leading-tight tracking-tight [overflow-wrap:anywhere]">
          {person.org_name}
        </p>

        {about ? (
          <p className={`mt-2 break-words text-sm leading-snug text-ink-soft [overflow-wrap:anywhere] ${mixer ? "line-clamp-3" : ""}`}>
            {about}
          </p>
        ) : null}

        {reasons ? (
          <p className="mt-3 break-words text-[11px] font-semibold uppercase leading-snug tracking-wide [overflow-wrap:anywhere]">
            <span className="text-ink-soft">{labels.strongOn}: </span>
            {reasons}
          </p>
        ) : null}

        {seeking ? (
          <p className="mt-1 break-words text-[11px] font-semibold uppercase leading-snug tracking-wide text-ink-soft [overflow-wrap:anywhere]">
            {labels.seeking}: {seeking}
          </p>
        ) : null}
      </Link>
    </li>
  )
}
