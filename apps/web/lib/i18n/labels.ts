/**
 * Enum → label resolution. Every controlled-vocabulary value gets its
 * user-facing label from the locale files under `enum.<group>.<value>`.
 * If a key is ever missing, the value is humanised — "imaging_mri" →
 * "Imaging MRI" beats a raw token in the UI — as a defensive fallback, not
 * because any shipped locale is currently incomplete.
 */

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

const ACRONYMS = new Set(["mri", "ct", "ehr", "ecg", "eeg", "nlp", "tre", "dua", "hq", "eu", "uk"])

export function humanise(value: string): string {
  return value
    .split("_")
    .map((word, i) => {
      if (ACRONYMS.has(word)) return word.toUpperCase()
      return i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
    })
    .join(" ")
}

export function enumLabel(t: TranslateFn, group: string, value: string): string {
  const key = `enum.${group}.${value}`
  const translated = t(key)
  return translated === key ? humanise(value) : translated
}

/**
 * Kind chips on a programme that borrowed a stored kind for a room colour.
 * The mixer stores capital as `ai_team` so the wall can tell the two sides
 * apart; the word a guest should read is Funder.
 */
export function programmeKindLabel(
  t: TranslateFn,
  challengeId: string,
  kind: string,
  orgType?: string,
  mixerRole?: string,
): string {
  if (challengeId === "vision_mixer") {
    if (mixerRole === "founder" || mixerRole === "funder" || mixerRole === "both" || mixerRole === "guest") {
      return t(`enum.mixer_role.${mixerRole}`)
    }
    if (kind === "ai_team") return t("enum.mixer_role.funder")
    if (orgType === "individual") return t("enum.mixer_role.guest")
    return t("enum.mixer_role.founder")
  }
  return enumLabel(t, "kind", kind)
}
