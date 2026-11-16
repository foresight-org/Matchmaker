import { describe, expect, it } from "vitest"
import { buildAiTeam, buildIndividual } from "./__fixtures__/build"
import { score } from "./score"
import { mixerCardKind, mixerDisplayTrack, mixerRole } from "./mixer"
import type { Profile } from "./types"

function guest(kind: "individual" | "ai_team", overrides: Partial<Profile> = {}): Profile {
  const base = kind === "ai_team" ? buildAiTeam() : buildIndividual()
  return {
    ...base,
    challenge_id: "vision_mixer",
    attending: ["vw_mixer"],
    application_status: "not_applying",
    looking_for: ["introductions"],
    contact_role: kind === "ai_team" ? "I'm an Angel Investor" : "Raising for my startup",
    funding_mainly_needed_for: "Seed",
    one_liner: "A longevity therapeutic.",
    summary: "Raising a seed round for a longevity therapeutic aimed at aging biology.",
    ...overrides,
  } as Profile
}

describe("founder and funder mixer scoring", () => {
  it("ranks a longevity founder higher with a longevity angel than with a late-stage fusion LP", () => {
    const founder = guest("individual")
    const angel = guest("ai_team", {
      contact_role: "I'm an Angel Investor, I'm an early-stage Fund",
      one_liner: "I back longevity therapeutics.",
      summary: "Early cheques into longevity biotech and aging biology.",
      funding_mainly_needed_for: "Seed",
    })
    const lp = guest("ai_team", {
      contact_role: "I'm an LP, I'm a late-stage Fund",
      one_liner: "Fusion and firm power.",
      summary: "Late-stage capital for fusion and grid-scale energy.",
      funding_mainly_needed_for: "Series C+",
    })
    const withAngel = score(founder, angel).score
    const withLp = score(founder, lp).score
    expect(withAngel).toBeGreaterThanOrEqual(70)
    expect(withLp).toBe(0)
  })

  it("keeps two funders off the introduction threshold", () => {
    const a = guest("ai_team", { one_liner: "Angel in fusion.", summary: "Fusion energy angel." })
    const b = guest("ai_team", {
      contact_role: "I'm a Grant Funder",
      one_liner: "Grants for AI safety.",
      summary: "Grantmaker for AI safety research.",
    })
    expect(score(a, b).score).toBeLessThan(40)
  })

  it("does not pair a mixer guest with a Recoding Medicine listing", () => {
    const founder = guest("individual")
    const medicine = buildIndividual()
    expect(score(founder, medicine).score).toBe(0)
    expect(score(medicine, founder).score).toBe(0)
  })

  it("lets a shared thesis carry a guest who is not raising", () => {
    const researcher = guest("individual", {
      contact_role: "Not considering this currently",
      looking_for: ["collaborators"],
      one_liner: "Mars terraforming research.",
      summary: "Novel methods to warm Mars and make it more habitable.",
      funding_mainly_needed_for: "Research phase, grants",
    })
    const blank = guest("individual", {
      contact_role: "Not considering this currently",
      one_liner: "Happy to be in the room.",
      summary: "Looking forward to meeting the team.",
      funding_mainly_needed_for: "",
    })
    const funder = guest("ai_team", {
      contact_role: "I'm an early-stage Fund",
      one_liner: "Backing space and Mars.",
      summary: "Early-stage fund for Mars terraforming and space.",
    })
    expect(score(researcher, funder).score).toBeGreaterThanOrEqual(35)
    expect(score(blank, funder).score).toBeLessThan(35)
  })

  it("reads capital, builders, and parked guests off the registration answer", () => {
    expect(mixerRole("I'm an early-stage Fund")).toBe("funder")
    expect(mixerRole("Raising for my startup")).toBe("founder")
    expect(mixerRole("Considering founding soon, I'm an Angel Investor")).toBe("both")
    expect(mixerRole("Raising for my startup, I'm an early-stage Fund")).toBe("both")
    expect(mixerRole("Not considering this currently")).toBe("guest")
    expect(mixerCardKind("I'm a Grant Funder")).toBe("ai_team")
    expect(mixerCardKind("Raising for my FRO")).toBe("individual")
  })

  it("keeps a specialist cheque inside the portfolio they named", () => {
    const longevity = guest("individual", {
      one_liner: "Mitochondrial therapy for aging.",
      summary: "A longevity therapeutic aimed at mitochondrial aging.",
      funding_mainly_needed_for: "Seed",
    })
    const safety = guest("individual", {
      one_liner: "Mechanistic interpretability for AI safety.",
      summary: "A research lab on mechanistic interpretability and alignment.",
      funding_mainly_needed_for: "Pre-seed",
    })
    const nfx = guest("ai_team", {
      contact_role: "I'm an early-stage Fund",
      one_liner: "Early-stage investor at NFX.",
      summary: "Early-stage fund at NFX.",
      website: "https://www.nfx.com/team/omri",
      funding_mainly_needed_for: "Seed",
    })
    const open = guest("ai_team", {
      contact_role: "I'm an early-stage Fund",
      one_liner: "Early-stage funder of novel, well-intentioned work.",
      summary: "Anything novel, disruptive, counter-intuitive, but also sincerely well intentioned.",
      funding_mainly_needed_for: "Seed",
    })
    expect(score(longevity, nfx).score).toBeGreaterThanOrEqual(35)
    expect(score(safety, nfx).score).toBe(0)
    expect(score(safety, open).score).toBeGreaterThanOrEqual(35)
    expect(score(longevity, open).score).toBeGreaterThanOrEqual(35)
  })

  it("does not introduce a hard-tech fellowship to a drug-only company", () => {
    const drug = guest("individual", {
      one_liner: "A cancer medicine.",
      summary: "Cancer medicines that trigger apoptosis. Lead drug in ovarian cancer.",
      funding_mainly_needed_for: "Pre-seed",
    })
    const hardware = guest("individual", {
      one_liner: "Grid-scale energy storage.",
      summary: "Hardware for firm power and grid storage.",
      funding_mainly_needed_for: "Pre-seed",
    })
    const activate = guest("ai_team", {
      contact_role: "I'm a Grant Funder",
      one_liner: "Activate fellowship for scientist entrepreneurs.",
      summary: "Fellowship program for scientist entrepreneurs at Activate.",
      website: "https://activate.org",
      funding_mainly_needed_for: "Pre-seed",
    })
    expect(score(drug, activate).score).toBe(0)
    expect(score(hardware, activate).score).toBeGreaterThanOrEqual(35)
  })

  it("does not treat someone raising for their own project as a cheque", () => {
    const founder = guest("individual")
    const project = guest("ai_team", {
      contact_role: "I fundraise for non-profits",
      one_liner: "Can machines be conscious?",
      summary: "Consciousness as a process that can be reproduced in cognitive architectures.",
      funding_mainly_needed_for: "Growing FRO",
    })
    expect(score(founder, project).score).toBeLessThan(35)
  })

  it("paints a card with the Foresight track they named first", () => {
    expect(mixerDisplayTrack("A longevity therapeutic for aging biology.")).toBe("biotech")
    expect(mixerDisplayTrack("Mechanistic interpretability for AI safety.")).toBe("secure_ai")
    expect(mixerDisplayTrack("A brain-computer interface for speech.")).toBe("neuro")
    expect(mixerDisplayTrack("Atomically precise molecular manufacturing.")).toBe("nano")
    expect(mixerDisplayTrack("Nanoparticle-based brain-computer interface.")).toBe("neuro")
    expect(mixerDisplayTrack("Nasal-spray nanoparticle delivery for Parkinson's.")).toBe("neuro")
    expect(mixerDisplayTrack("Redesigning gene therapies in silico.")).toBe("biotech")
    expect(mixerDisplayTrack("Matter Bio, raising a Series A.")).toBe("biotech")
    expect(mixerDisplayTrack("Reasoning systems with something like a prefrontal cortex.")).toBe("neuro")
    expect(mixerDisplayTrack("AI systems that do science.")).toBe("secure_ai")
    expect(mixerDisplayTrack("Hyperbolic vision-language models for search.")).toBe("secure_ai")
    expect(mixerDisplayTrack("Angel thinking about human agency.")).toBe("secure_ai")
    expect(mixerDisplayTrack("Terraforming Mars and warming the planet.")).toBe("space")
    expect(mixerDisplayTrack("Fusion angel. Firm power comes second.")).toBe("space")
    expect(mixerDisplayTrack("Grid-scale storage and firm power. No launch vehicle.")).toBeNull()
    expect(mixerDisplayTrack("Biosecurity for pandemic surveillance.")).toBe("biotech")
    expect(mixerDisplayTrack("AI safety, and biosecurity alongside it.")).toBe("secure_ai")
    expect(mixerDisplayTrack("Longevity biology, with an AI safety tool on the side.")).toBe("biotech")
    expect(mixerDisplayTrack("Existential hope and worldbuilding.")).toBe("hope")
    expect(mixerDisplayTrack("Early-stage fund at NFX.")).toBe("biotech")
    expect(mixerDisplayTrack("We are stage and industry agnostic.")).toBeNull()
    expect(mixerDisplayTrack("Anything novel, well intentioned.")).toBeNull()
    expect(mixerDisplayTrack("Fellowship program at Activate.")).toBeNull()
    expect(mixerDisplayTrack("Launching a new focused research organization.")).toBeNull()
    expect(mixerDisplayTrack("Considering founding soon https://example.com/why-biology-wasnt-made-to-last")).toBeNull()
    expect(mixerDisplayTrack("Literature discovery, supercharged by AI. https://neurospike.org")).toBe("secure_ai")
    expect(mixerDisplayTrack("e11.bio")).toBe("neuro")
  })
})
