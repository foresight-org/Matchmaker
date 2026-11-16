import type { MixerTrack } from "@rmm/matching"
import type { Kind } from "@rmm/schema"
import { KIND_SKIN } from "@/lib/onsite/kind-skin"

/**
 * Projector colors for the six Foresight tracks.
 *
 * The fill is the track. Capital is a gold edge — foresight.org already
 * gives nanotech the green, so a green funder would disappear into it.
 * Gold is the mark this board already uses for a cheque.
 */
export const TRACK_ORDER: readonly MixerTrack[] = ["secure_ai", "neuro", "biotech", "nano", "space", "hope"]

export const TRACK_FILL: Record<MixerTrack, string> = {
  secure_ai: "bg-track-ai",
  neuro: "bg-track-neuro",
  biotech: "bg-track-biotech",
  nano: "bg-track-nano",
  space: "bg-track-space",
  hope: "bg-track-hope",
}

export const TRACK_LABEL: Record<MixerTrack, string> = {
  secure_ai: "onsite.feed.track_secure_ai",
  neuro: "onsite.feed.track_neuro",
  biotech: "onsite.feed.track_biotech",
  nano: "onsite.feed.track_nano",
  space: "onsite.feed.track_space",
  hope: "onsite.feed.track_hope",
}

/** Card wash and border. Other programmes keep the four-kind skins. */
export function boardSurface(card: {
  kind: Kind
  track?: MixerTrack | null
  capital?: boolean
}): string {
  if (card.capital === undefined) return KIND_SKIN[card.kind]
  const fill = card.track ? TRACK_FILL[card.track] : "bg-paper"
  // A hairline gold edge. Thick enough to spot a cheque, thin enough
  // that it does not eat the name.
  return `${fill} ${card.capital ? "border-mark" : "border-ink"}`
}

/** The role word. Gold chip when they write a cheque; ink when they don't. */
export function roleInk(capital: boolean | undefined): string {
  if (capital === undefined) return "text-teal-deep"
  if (capital) return "bg-mark px-1 text-mark-ink"
  return "text-ink"
}
