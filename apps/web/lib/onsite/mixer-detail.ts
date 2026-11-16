/**
 * The short second line under a name on the mixer wall.
 *
 * Guests did not fill an affiliation field. The sentence they wrote about
 * the project — or about themselves, for a funder — is the true line.
 * A website host is a last resort, and only when it is not their own name
 * mashed into a domain.
 */

const SKIP_HOST =
  /^(?:linkedin|twitter|x|t|github|scholar\.google|google|gmail|youtube|youtu|facebook|instagram|linktr)\./i

export function mixerDetail(input: {
  org_name: string
  one_liner: string
  website?: string | null
  affiliation?: string | null
}): string {
  const listed = input.affiliation?.trim()
  if (listed) return listed

  const written = clip(input.one_liner, input.org_name)
  if (written) return written

  return hostLabel(input.website, input.org_name) ?? ""
}

function hostLabel(website: string | null | undefined, orgName: string): string | undefined {
  if (!website) return undefined
  let host: string
  try {
    host = new URL(website).hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return undefined
  }
  if (SKIP_HOST.test(host)) return undefined
  const stem = host.split(".")[0]?.replace(/-/g, "")
  if (!stem || stem.length < 2 || stem.length > 12) return undefined
  const flat = stem.toLowerCase()
  const ownName = orgName
    .toLowerCase()
    .split(/\s+/)
    .some((part) => part.length > 2 && flat.includes(part))
  if (ownName) return undefined
  if (stem.length <= 4) return stem.toUpperCase()
  return stem.charAt(0).toUpperCase() + stem.slice(1)
}

function clip(line: string, name: string): string {
  const clean = line.replace(/\s+/g, " ").trim()
  if (!clean) return ""
  if (clean.toLowerCase() === name.trim().toLowerCase()) return ""
  const max = 56
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(" ")
  const base = (space > 24 ? cut.slice(0, space) : cut).replace(/[.,;: ]+$/g, "")
  return `${base}…`
}
