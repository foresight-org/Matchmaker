import type { Profile } from "@rmm/schema"
import type { Blocker, Factor, ScoreResult } from "./types"
import { sumFactors } from "./factors"

/**
 * Founder & Funder mixer scoring.
 *
 * Recoding Medicine pairs a dataset with a team. This room pairs a person
 * who is building with a person who can back them, and — a step behind —
 * two builders who asked for a collaborator in the same field. The five
 * Vision Weekend focus areas are read out of the thesis they submitted,
 * not out of a medical vocabulary.
 *
 * Weights sum to 100. A ratio of 0 is a miss; unstated stage sits in the
 * middle so a blank stage neither crowns nor kills a pairing.
 */

const ROLE_WEIGHT = 45
const FOCUS_WEIGHT = 30
const STAGE_WEIGHT = 15
const COLLAB_WEIGHT = 10

export type MixerRole = "founder" | "funder" | "both" | "guest"

/** Focus areas named on the mixer page. A thesis can sit in more than one. */
const FOCUS: ReadonlyArray<readonly [string, RegExp]> = [
  ["secure_ai", /ai safety|alignment|interpretab|privacy|cryptograph|\bzk\b|formal verif|\bagents?\b|sovereign|mechanistic|misuse|cyber|prompt injection|secure ai|public[- ]interest|cognitive liberty|digital rights/i],
  ["biosecurity", /biosecurity/i],
  ["longevity", /longevity|\baging\b|\bageing\b|mitochond|epigenet|glp-?1|biostasis|senescen|healthspan|follistatin/i],
  ["neuro", /neuro|\bbrain\b|\bbci\b|parkinson|neural|mind upload|neuromod|retina|\beeg\b|cogniti|ultrasound|consciousness|cognitive architect/i],
  ["nano", /nano|mechanosynth|diamondoid|atomically precise|molecular manufactur|dna origami|scanning tunneling/i],
  ["space_mars", /\bmars\b|terraform|asteroid|cislunar/i],
  ["space_fusion", /\bfusion\b/i],
  ["space_energy", /\benergy\b|\bgrid\b|climate|firm power|ocean compute|wave energy/i],
  ["bio", /biotech|synbio|tissue|gene therapy|\bdrug\b|\bcells?\b|cellular|microb|therapeut|pharma|protein|immun|cancer|antibod|biomanufactur|pollutant|biomarker|chronic disease/i],
  ["robotics", /\brobots?\b|humanoid|embodied|mechatronic|exoskeleton|prosthetic/i],
  ["fro", /\bfros?\b|focused research organi[sz]ation/i],
]

type Stage =
  | "pre_seed"
  | "seed"
  | "series_a"
  | "growth"
  | "research"
  | "new_fro"
  | "growing_fro"
  | "unknown"

interface Signals {
  raising: boolean
  founding: boolean
  capital: boolean
  connector: boolean
  parked: boolean
}

function pts(weight: number, ratio: number): number {
  return Math.round(weight * Math.max(0, Math.min(1, ratio)) * 10) / 10
}

export function isVisionMixer(profile: Profile): boolean {
  return profile.challenge_id === "vision_mixer"
}

/**
 * What this person is in the room, from the founder/funder answer they ticked.
 * Someone raising who also invests is both — the card says so, instead of
 * dropping the capital side.
 */
export function mixerRole(role: string): MixerRole {
  const s = signals(role)
  const building = s.raising || s.founding
  const capital = s.capital || s.connector
  if (building && capital) return "both"
  if (capital && !building) return "funder"
  if (s.parked && !building && !s.capital) return "guest"
  return "founder"
}

/**
 * Colour on the projector. Capital takes the mark rail; everyone building
 * or visiting keeps the founder rail, so a funder never holds the top card.
 */
export function mixerCardKind(role: string): "individual" | "ai_team" {
  return mixerRole(role) === "funder" ? "ai_team" : "individual"
}

export function mixerFocuses(text: string): string[] {
  return FOCUS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name)
}

function signals(role: string): Signals {
  const r = role.toLowerCase()
  return {
    raising: /raising for my startup|raising for my fro/.test(r),
    founding: /considering founding/.test(r),
    capital: /early-stage fund|late-stage fund|angel investor|i'm an lp|family office|grant funder/.test(r),
    connector: /fundraise for non-profits/.test(r),
    parked: /not considering/.test(r),
  }
}

function parseStage(stage: string): Stage {
  const x = stage.toLowerCase()
  if (x.includes("pre-seed")) return "pre_seed"
  if (x.includes("series c") || x.includes("series b")) return "growth"
  if (x.includes("series a")) return "series_a"
  if (/\bseed\b/.test(x)) return "seed"
  if (x.includes("new fro")) return "new_fro"
  if (x.includes("growing fro")) return "growing_fro"
  if (x.includes("research") || x.includes("grant")) return "research"
  return "unknown"
}

/**
 * Stages this capital will actually write. The role answer sets the default.
 * A thesis that names Series A or pre-IPO widens it; a family office stays broad.
 */
function capitalStages(text: string): Stage[] | "broad" {
  const r = text.toLowerCase()
  if (/family office/.test(r)) return "broad"
  const stages = new Set<Stage>()
  if (/early-stage|angel investor/.test(r)) {
    for (const stage of ["pre_seed", "seed", "research", "new_fro", "growing_fro"] as const) stages.add(stage)
  }
  if (/late-stage|i'm an lp|pre-ipo|series b|series c/.test(r)) {
    for (const stage of ["series_a", "growth", "growing_fro"] as const) stages.add(stage)
  }
  if (/series a/.test(r)) stages.add("series_a")
  if (/grant funder|fundraise for non-profits/.test(r)) {
    for (const stage of ["research", "new_fro", "growing_fro", "pre_seed"] as const) stages.add(stage)
  }
  if (stages.size === 0) return "broad"
  return [...stages]
}

function stageRatio(builderStage: Stage, capitalRole: string): number {
  if (builderStage === "unknown") return 0.55
  const accept = capitalStages(capitalRole)
  if (accept === "broad") return 0.85
  if (accept.includes(builderStage)) return 1
  if (builderStage === "pre_seed" && accept.includes("seed")) return 0.7
  if (builderStage === "seed" && accept.includes("series_a")) return 0.6
  if (builderStage === "series_a" && accept.includes("seed")) return 0.55
  return 0.28
}

function builderStageOf(profile: Profile): Stage {
  return parseStage(profile.funding_mainly_needed_for ?? "")
}

function capitalText(profile: Profile): string {
  return `${profile.contact_role ?? ""} ${profile.one_liner} ${profile.summary} ${profile.funding_mainly_needed_for ?? ""} ${profile.website ?? ""}`
}

/**
 * Cheque-writers whose registration line names a firm instead of a field.
 * `fillIfEmpty` applies only when their own words did not already name one.
 * A star means they said the portfolio is broad, or the firm really is.
 */
const PORTFOLIO_RULES: ReadonlyArray<{
  test: RegExp
  areas: "*" | readonly string[]
  fillIfEmpty?: boolean
  excludeTherapeutics?: boolean
  /** This sentence names one field. Do not also inherit the broader tags around it. */
  replace?: boolean
}> = [
  { test: /fusion angel|angel investor in fusion/i, areas: ["space_fusion"], replace: true },
  { test: /\bnfx\b/i, areas: ["bio", "longevity"], fillIfEmpty: true },
  { test: /1517/i, areas: "*" },
  { test: /anything novel|industry agnostic/i, areas: "*" },
  { test: /lingfeng/i, areas: "*" },
  { test: /researchhub/i, areas: "*" },
  {
    test: /activate/i,
    areas: ["nano", "space_energy", "space_mars", "space_fusion", "secure_ai", "biosecurity", "bio", "robotics"],
    fillIfEmpty: true,
    excludeTherapeutics: true,
  },
  { test: /eastworlds/i, areas: ["robotics"], fillIfEmpty: true },
  { test: /deep tech/i, areas: ["bio", "longevity", "nano", "space_energy", "neuro", "robotics"] },
  { test: /human agency|brendanmarshall/i, areas: ["secure_ai", "neuro"], fillIfEmpty: true },
]

/**
 * The six focus areas on foresight.org. A card wears one of them.
 * Biosecurity sits with biotech; grid and climate do not become Space
 * unless the words also say space. Robotics and a FRO are structures,
 * not tracks, so they stay uncolored.
 */
export type MixerTrack = "secure_ai" | "neuro" | "biotech" | "nano" | "space" | "hope"

const HOPE_PATTERN = /existential hope|world-?building|strategic foresight|existential risk|\bx-?risk\b|flourishing futures?/i

/** Molecular machines. A drug nanoparticle is not this track. */
const NANO_STRONG = /nanotech|molecular machine|mechanosynth|diamondoid|atomically precise|molecular manufactur|dna origami|scanning tunneling|\bstm\b/i

/**
 * Words the registration used that the scorer treats as detail, not a field.
 * The wall still needs a track: biology, a cortex, or an AI system.
 */
const DISPLAY_WORD: ReadonlyArray<readonly [MixerTrack, RegExp]> = [
  ["neuro", /cortex|\bvagus\b|\bappetite\b|\be11\b|merge labs|merge\.io/i],
  ["biotech", /\bbio\b|biolog|gene therap|antiviral|\bviral\b|wet lab|\bclinical\b|blood vessel/i],
]

/** Plain "AI" is the Secure AI track only when no scientific field was named. */
const AI_WORD = /\bai\b|agentic|machine learning|language model/i

function tagToTrack(tag: string, text: string): MixerTrack | null {
  if (tag === "nano") return /nanoparticle/i.test(text) && !NANO_STRONG.test(text) ? null : "nano"
  if (tag === "neuro") return "neuro"
  if (tag === "space_mars" || tag === "space_fusion") return "space"
  if (tag === "space_energy") return /\bspace\b|\bmars\b|fusion|orbit|cislunar|asteroid|\blunar\b/i.test(text) ? "space" : null
  if (tag === "longevity" || tag === "bio" || tag === "biosecurity") return "biotech"
  if (tag === "secure_ai") return "secure_ai"
  return null
}

/** The track they named first. A later aside does not repaint the card. */
function earliestTrack(text: string, tags: readonly string[]): MixerTrack | null {
  const best: { at: number; track: MixerTrack | null } = { at: Number.POSITIVE_INFINITY, track: null }
  const consider = (track: MixerTrack, at: number) => {
    if (at < 0 || at >= best.at) return
    best.at = at
    best.track = track
  }
  for (const [name, pattern] of FOCUS) {
    const track = tagToTrack(name, text)
    if (!track || !tags.includes(name)) continue
    consider(track, text.search(pattern))
  }
  for (const [track, pattern] of DISPLAY_WORD) consider(track, text.search(pattern))
  consider("hope", text.search(HOPE_PATTERN))
  return best.track
}

function tracksOf(areas: readonly string[], text: string): MixerTrack[] {
  return [...new Set(areas.map((area) => tagToTrack(area, text)).filter((track): track is MixerTrack => track !== null))]
}

/** A blog slug or a `.ai` domain is not a thesis. Match the words they wrote. */
function spoken(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b[\w-]+\.(?:ai|bio|io|com|org|xyz|net|co)(?:\/\S*)?/gi, " ")
}

/**
 * One Foresight track for the wall, or none when they never named one.
 * A firm that invests across the board stays uncolored. Their own words
 * still win over the firm's usual portfolio.
 */
export function mixerDisplayTrack(text: string): MixerTrack | null {
  if (/\be11\.bio\b/i.test(text)) return "neuro"
  if (/merge\.io|merge labs/i.test(text)) return "neuro"
  const prose = spoken(text)
  const own = mixerFocuses(prose)
  const named = earliestTrack(prose, own)
  if (named) return named
  if (AI_WORD.test(prose)) return "secure_ai"
  for (const rule of PORTFOLIO_RULES) {
    if (!rule.replace || rule.areas === "*" || !rule.test.test(prose)) continue
    const tracks = tracksOf(rule.areas, prose)
    if (tracks.length === 1) return tracks[0]!
  }
  if (PORTFOLIO_RULES.some((rule) => rule.areas === "*" && rule.test.test(prose))) return null
  if (own.length > 0) return null
  for (const rule of PORTFOLIO_RULES) {
    if (!rule.fillIfEmpty || rule.areas === "*" || !rule.test.test(prose)) continue
    const tracks = tracksOf(rule.areas, prose)
    // Two named fields: the rule lists the one to show. Wider than that is a generalist.
    if (tracks.length === 1 || tracks.length === 2) return tracks[0]!
  }
  return null
}

function chequePortfolio(profile: Profile): { areas: "*" | string[]; excludeTherapeutics: boolean } {
  const text = capitalText(profile)
  const tagged = mixerFocuses(text)
  let broad = false
  let excludeTherapeutics = false
  const extra: string[] = []
  for (const rule of PORTFOLIO_RULES) {
    if (!rule.test.test(text)) continue
    if (rule.excludeTherapeutics) excludeTherapeutics = true
    if (rule.replace && rule.areas !== "*") return { areas: [...rule.areas], excludeTherapeutics }
    if (rule.areas === "*") broad = true
    else if (!rule.fillIfEmpty || tagged.length === 0) extra.push(...rule.areas)
  }
  if (broad) return { areas: "*", excludeTherapeutics }
  return { areas: [...new Set([...tagged, ...extra])], excludeTherapeutics }
}

/**
 * Angel, fund, grant, LP, or family office. Someone fundraising for their
 * own project is not a cheque, and neither is a person who came to meet funders.
 */
function writesCheques(profile: Profile): boolean {
  const text = capitalText(profile)
  if (/connect with funders/i.test(text)) return false
  if (signals(profile.contact_role ?? "").capital) return true
  return /scoping a fund/i.test(text)
}

/** The other side is building, visiting, or raising — not a second pure fund. */
function seeksWork(profile: Profile): boolean {
  const s = signals(profile.contact_role ?? "")
  if (s.raising || s.founding) return true
  if (s.capital && !s.raising && !s.founding) return false
  return true
}

const PORTFOLIO_STOPWORDS = new Set([
  "about", "across", "after", "angel", "apply", "applying", "based", "being", "build", "building",
  "capital", "company", "considering", "currently", "early", "engineering", "founder", "founding",
  "fund", "funder", "funding", "fundraise", "grant", "human", "investor", "looking", "models",
  "nonprofit", "people", "platform", "profits", "project", "raising", "research", "science",
  "stage", "startup", "systems", "technology", "their", "these", "through", "working",
])

/** A cheque with no field still has to share a real word with the work, not "research" or "engineering". */
function contentOverlap(capital: Profile, builder: Profile): boolean {
  const words = `${capital.one_liner} ${capital.summary}`.toLowerCase().match(/[a-z]{6,}/g) ?? []
  const interesting = [...new Set(words.filter((word) => !PORTFOLIO_STOPWORDS.has(word)))]
  if (interesting.length === 0) return false
  const hay = `${builder.one_liner} ${builder.summary}`.toLowerCase()
  return interesting.some((word) => hay.includes(word))
}

function therapeuticsOnly(text: string): boolean {
  const health = /therapeut|\bdrug\b|pharma|\bfda\b|clinical trial|cancer medicine|oncolog/i.test(text)
  const other = /hardware|\benergy\b|material|industrial|manufactur|sensor|\brobot|semiconductor|quantum|biosecur|agricultur|\bfood\b|\bwater\b|climate|fusion|\bgrid\b|\bnano/i.test(text)
  return health && !other
}

/**
 * A cheque is introduced only to work inside the portfolio and the stage
 * that capital said it would consider. No stated field means they are a
 * generalist, and the stage check still applies.
 */
function portfolioBlocker(capital: Profile, builder: Profile): Blocker | null {
  const portfolio = chequePortfolio(capital)
  const workText = capitalText(builder)
  if (portfolio.excludeTherapeutics && therapeuticsOnly(workText)) {
    return {
      key: "mixer_portfolio",
      severity: "hard",
      note: "This capital does not fund a therapeutic whose only path is a drug approval.",
    }
  }
  if (portfolio.areas !== "*") {
    const work = mixerFocuses(workText)
    const named = portfolio.areas.length > 0
    const shared = named && work.filter((area) => (portfolio.areas as string[]).includes(area)).length > 0
    const words = !named && contentOverlap(capital, builder)
    if (!shared && !words) {
      return {
        key: "mixer_portfolio",
        severity: "hard",
        note: named
          ? "Outside the portfolio this capital wrote down."
          : "This cheque never named a field this work shares.",
      }
    }
  }
  const stage = builderStageOf(builder)
  if (stage !== "unknown" && stageRatio(stage, capitalText(capital)) < 0.6) {
    return {
      key: "mixer_portfolio",
      severity: "hard",
      note: "Stage sits outside the cheques this capital writes.",
    }
  }
  return null
}

function portfolioBlockers(a: Profile, b: Profile): Blocker[] {
  const blockers: Blocker[] = []
  if (writesCheques(a) && seeksWork(b)) {
    const block = portfolioBlocker(a, b)
    if (block) blockers.push(block)
  }
  if (writesCheques(b) && seeksWork(a)) {
    const block = portfolioBlocker(b, a)
    if (block) blockers.push(block)
  }
  return blockers
}

/** How well these two belong on opposite sides of an introduction. */
export function mixerRoleRatio(a: Profile, b: Profile): number {
  const A = signals(a.contact_role ?? "")
  const B = signals(b.contact_role ?? "")
  const aSeeks = A.raising || A.founding
  const bSeeks = B.raising || B.founding
  const aCap = writesCheques(a)
  const bCap = writesCheques(b)
  const cross = (aSeeks && bCap) || (bSeeks && aCap)
  if (cross && (A.raising || B.raising)) return 1
  if (cross) return 0.84
  const aBuild = aSeeks || (!aCap && !A.parked)
  const bBuild = bSeeks || (!bCap && !B.parked)
  if ((aBuild && bCap) || (bBuild && aCap)) return A.parked || B.parked ? 0.3 : 0.5
  const bothOpen =
    wantsPeople(a) && wantsPeople(b) && (a.looking_for.includes("join_team") || b.looking_for.includes("join_team") || a.looking_for.includes("collaborators"))
  if (aBuild && bBuild && bothOpen) return 0.58
  if (aBuild && bBuild) return 0.38
  if (aCap && bCap) return 0.16
  return 0.3
}

/**
 * A shared "bio" or "AI" tag covers half the room, so it cannot be a
 * perfect focus score. Rarer areas — nanotech, Mars, longevity — pull
 * harder. Several shared areas add a little on top of the rarest one.
 */
const FOCUS_RARITY: Record<string, number> = {
  bio: 0.42,
  secure_ai: 0.5,
  biosecurity: 0.84,
  neuro: 0.74,
  longevity: 0.8,
  space_mars: 0.9,
  space_fusion: 0.96,
  space_energy: 0.86,
  robotics: 0.88,
  fro: 0.7,
  nano: 0.94,
}

function focusRatio(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0.08
  const shared = a.filter((area) => b.includes(area))
  if (shared.length === 0) return 0.06
  const rarest = Math.max(...shared.map((area) => FOCUS_RARITY[area] ?? 0.5))
  return Math.min(1, rarest + Math.min(0.1, (shared.length - 1) * 0.05))
}

function wantsPeople(profile: Profile): boolean {
  return profile.looking_for.some((value) => value === "collaborators" || value === "join_team" || value === "introductions")
}

function askedForCollaborator(profile: Profile): boolean {
  return profile.looking_for.some((value) => value === "collaborators" || value === "join_team")
}

function closed(profile: Profile): boolean {
  return profile.looking_for.includes("not_looking") && !wantsPeople(profile)
}

function collabRatio(a: Profile, b: Profile): number {
  if (closed(a) || closed(b)) return 0.25
  if (askedForCollaborator(a) && askedForCollaborator(b)) return 1
  if (askedForCollaborator(a) || askedForCollaborator(b)) return 0.7
  if (wantsPeople(a) && wantsPeople(b)) return 0.5
  return 0.35
}

function thesisOf(profile: Profile): string {
  return `${profile.one_liner} ${profile.summary} ${profile.contact_role ?? ""} ${profile.website ?? ""}`
}

/** Stage fit follows whoever is asking for capital. Two builders compare stages with each other. */
function pairingStageRatio(a: Profile, b: Profile): number {
  const A = signals(a.contact_role ?? "")
  const B = signals(b.contact_role ?? "")
  const aSeeks = A.raising || A.founding
  const bSeeks = B.raising || B.founding
  const aCap = writesCheques(a)
  const bCap = writesCheques(b)
  if (aSeeks && bCap && !bSeeks) return stageRatio(builderStageOf(a), capitalText(b))
  if (bSeeks && aCap && !aSeeks) return stageRatio(builderStageOf(b), capitalText(a))
  if ((aSeeks && bCap) || (bSeeks && aCap)) {
    const builder = aSeeks ? a : b
    const capital = aSeeks ? b : a
    return stageRatio(builderStageOf(builder), capitalText(capital))
  }
  const left = builderStageOf(a)
  const right = builderStageOf(b)
  if (left === "unknown" || right === "unknown") return 0.5
  return left === right ? 0.85 : 0.4
}

function roleNote(ratio: number): string {
  if (ratio >= 0.95) return "One side is raising and the other deploys capital."
  if (ratio >= 0.8) return "A builder and a funder, with founding still ahead of a round."
  if (ratio >= 0.5) return "Both are building and open to a collaborator."
  return "Same side of the table — a weaker reason to interrupt them."
}

function focusNote(ratio: number, shared: readonly string[]): string {
  if (shared.length > 0 && ratio >= 0.4) return `Shared focus: ${shared.join(", ").replaceAll("_", " ")}.`
  if (ratio >= 0.3) return "Focus area was left thin on one side."
  return "The theses sit in different focus areas."
}

function stageNote(ratio: number): string {
  if (ratio >= 0.95) return "Stage matches how this capital usually shows up."
  if (ratio >= 0.55) return "Stage is close enough for a first conversation."
  return "Stage and cheque size sit apart."
}

function collabNote(ratio: number): string {
  if (ratio >= 1) return "Both asked to meet collaborators."
  if (ratio >= 0.6) return "One of them asked to be introduced."
  return "Collaboration was not requested."
}

export function computeMixerFactors(a: Profile, b: Profile): Factor[] {
  const focusesA = mixerFocuses(thesisOf(a))
  const focusesB = mixerFocuses(thesisOf(b))
  const shared = focusesA.filter((area) => focusesB.includes(area))
  const role = mixerRoleRatio(a, b)
  const focus = focusRatio(focusesA, focusesB)
  const stage = pairingStageRatio(a, b)
  const collab = collabRatio(a, b)
  return [
    { key: "mixer_role_fit", weight: ROLE_WEIGHT, earned: pts(ROLE_WEIGHT, role), note: roleNote(role) },
    { key: "mixer_focus_fit", weight: FOCUS_WEIGHT, earned: pts(FOCUS_WEIGHT, focus), note: focusNote(focus, shared) },
    { key: "mixer_stage_fit", weight: STAGE_WEIGHT, earned: pts(STAGE_WEIGHT, stage), note: stageNote(stage) },
    { key: "mixer_collab_fit", weight: COLLAB_WEIGHT, earned: pts(COLLAB_WEIGHT, collab), note: collabNote(collab) },
    // Zero weight on purpose: the portfolio decision is a gate, and this key
    // tells a warm server that its cached scores were computed with that gate.
    { key: "mixer_portfolio_gate", weight: 0, earned: 0, note: "Portfolio fit is required before a cheque is introduced." },
  ]
}

/**
 * Score two mixer listings. A listing from another programme scores 0 so a
 * Recoding Medicine profile cannot wander onto this wall.
 */
export function scoreMixer(a: Profile, b: Profile): ScoreResult {
  const blockers: Blocker[] = []
  if (!isVisionMixer(a) || !isVisionMixer(b)) {
    blockers.push({
      key: "challenge_mismatch",
      severity: "hard",
      note: "These profiles belong to different programmes.",
    })
  }
  if (a.open_to_intros === false) {
    blockers.push({ key: "a.open_to_intros", severity: "hard", note: "This profile is not open to introductions." })
  }
  if (b.open_to_intros === false) {
    blockers.push({ key: "b.open_to_intros", severity: "hard", note: "This profile is not open to introductions." })
  }
  if (b.visibility === "hidden") {
    blockers.push({ key: "b.visibility_hidden", severity: "hard", note: "This profile is hidden." })
  }
  if (blockers.some((blocker) => blocker.severity === "hard")) {
    return { score: 0, factors: [], blockers }
  }
  const factors = computeMixerFactors(a, b)
  const role = factors.find((factor) => factor.key === "mixer_role_fit")
  const focus = factors.find((factor) => factor.key === "mixer_focus_fit")
  const roleRatio = role && role.weight > 0 ? role.earned / role.weight : 0
  const focusRatioEarned = focus && focus.weight > 0 ? focus.earned / focus.weight : 0
  if (roleRatio < 0.8 && focusRatioEarned < 0.2) {
    blockers.push({
      key: "mixer_portfolio",
      severity: "hard",
      note: "No shared field, and this is not a cheque for that work.",
    })
  }
  blockers.push(...portfolioBlockers(a, b))
  if (blockers.some((blocker) => blocker.severity === "hard")) {
    return { score: 0, factors, blockers }
  }
  const raw = sumFactors(factors)
  return { score: Math.max(0, Math.min(100, raw)), factors, blockers }
}
