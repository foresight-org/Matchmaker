import { mixerCardKind, mixerRole } from "@rmm/matching"
import type { LookingFor, Profile } from "@rmm/schema"
import type { VisionGuest } from "./vision-guest"

/**
 * Turn one approved mixer registration into a listing.
 *
 * The person has not claimed it and does not need to. The room treats the
 * registration as presence. Email is the consent signal: this builder is
 * only called for guests who left one.
 */

const EMPTY_NEEDS = {
  modality: [],
  disease_area: [],
  linkage_required: [],
  standards_preferred: [],
}

export function visionSlug(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const slug = `vw-${base}`.replace(/-+/g, "-")
  return slug.slice(0, 80).replace(/-+$/g, "")
}

export function clipText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(" ")
  const base = (space > max * 0.55 ? cut.slice(0, space) : cut).replace(/[.,;: ]+$/g, "")
  return `${base}…`
}

/** Co-founder answers are free text. Map them onto the chips the directory already knows. */
export function lookingFromAnswer(raw: string | undefined): LookingFor[] {
  const text = (raw ?? "").toLowerCase().replace(/\s+/g, " ").trim()
  if (!text) return ["introductions"]
  const hardNo = /^(no|nope|not at this time|not looking)\b/.test(text)
  const meet = /collaborat|co-?founder|cofounder|\byes\b|\bboth\b|open|partner|hiring|meet|intro|investor|funder|capital|always|research/.test(text)
  if (hardNo && !meet) return ["not_looking"]
  const out: LookingFor[] = []
  if (/co-?founder|cofounder/.test(text)) out.push("join_team")
  if (/collaborat|research|\byes\b|\bboth\b|open to|partner|hiring|always/.test(text)) out.push("collaborators")
  if (out.length === 0 || /investor|funder|capital|meet|intro/.test(text)) out.push("introductions")
  return [...new Set(out)]
}

function asUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let value = raw.trim().replace(/[\u200b\u2060⁠]+/g, "")
  if (!value || /^(na|no|not yet\.?)$/i.test(value)) return undefined
  if (!/^https?:\/\//i.test(value)) {
    if (!/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(value)) return undefined
    value = `https://${value}`
  }
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

function lineFor(guest: VisionGuest): string {
  const written = guest.line?.trim()
  if (written) return clipText(written, 140)
  const thesis = guest.thesis.trim()
  if (/^https?:\/\//i.test(thesis) && !/\s/.test(thesis)) {
    return clipText(`${guest.name} — ${guest.role}`, 140)
  }
  return clipText(thesis || guest.role || "At the Founder and Funder mixer.", 140)
}

function summaryFor(guest: VisionGuest, line: string): string {
  const thesis = guest.thesis.replace(/\s+/g, " ").trim()
  if (!thesis) return line
  return clipText(thesis, 600)
}

/**
 * Profile-shaped record, ready for `saveProfile`. Identity fields
 * (`id`, timestamps, derived flags) are filled in at write time.
 */
export function visionProfileInput(guest: VisionGuest): Record<string, unknown> {
  const role = mixerRole(guest.role)
  const kind = mixerCardKind(guest.role) === "ai_team" ? "ai_team" : "individual"
  const line = lineFor(guest)
  const tracks = [guest.github, guest.scholar].map(asUrl).filter((url): url is string => Boolean(url)).slice(0, 5)
  const website = asUrl(guest.website) ?? (/^https?:\/\//i.test(guest.thesis.trim()) ? asUrl(guest.thesis.trim().split(/\s/)[0]) : undefined)
  const linkedin = asUrl(guest.linkedin?.startsWith("http") ? guest.linkedin : guest.linkedin ? `https://${guest.linkedin}` : undefined)

  return {
    slug: visionSlug(guest.name),
    kind,
    challenge_id: "vision_mixer",
    org_name: guest.name,
    org_type: role === "funder" ? "other" : role === "guest" ? "individual" : "startup",
    org_type_other: role === "funder" ? "Funder" : undefined,
    country: "US",
    partner_only: false,
    one_liner: line,
    summary: summaryFor(guest, line),
    website,
    linkedin,
    languages: ["en"],
    looking_for: lookingFromAnswer(guest.looking),
    application_status: "not_applying",
    parallel_public_funding: "no",
    attending: ["vw_mixer"],
    open_to_intros: true,
    visibility: "authenticated_only",
    contact_name: guest.name,
    contact_email: guest.email.trim().toLowerCase(),
    contact_role: clipText(guest.role, 160),
    funding_mainly_needed_for: guest.stage ? clipText(guest.stage, 200) : undefined,
    methods: [],
    application_target: [],
    domain_expertise: [],
    clinical_partner: "not_needed",
    regulatory_experience: [],
    compute: "unsure",
    privacy_capability: [],
    team_size: role === "funder" ? "2_5" : "1",
    track_record: tracks,
    data_needs: EMPTY_NEEDS,
  }
}

/** Answers the card editor can write. Each line is one the room already understands. */
export const MIXER_ROLE_LINE = {
  founder: "Raising for my startup",
  funder: "I'm an early-stage Fund",
  both: "Raising for my startup, I'm an Angel Investor",
  guest: "Not considering this currently",
} as const

export type MixerRoleChoice = keyof typeof MIXER_ROLE_LINE

/** A person who walked up, not a row from the Luma export. */
export function mixerWalkUpInput(input: {
  name: string
  email: string
  role: MixerRoleChoice
  line: string
  website?: string
}): Record<string, unknown> {
  return visionProfileInput({
    name: input.name.trim(),
    email: input.email,
    role: MIXER_ROLE_LINE[input.role],
    stage: "",
    thesis: input.line.trim(),
    line: input.line.trim(),
    website: input.website?.trim() || undefined,
  })
}

/** Narrow helper for tests that want the parsed kind without a database. */
export function visionKind(guest: VisionGuest): Profile["kind"] {
  return mixerCardKind(guest.role) === "ai_team" ? "ai_team" : "individual"
}
