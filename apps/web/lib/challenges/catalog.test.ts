import { describe, expect, it } from "vitest"
import {
  acceptsNewListings,
  listingOnDisplay,
  directoryHref,
  challengeBySlug,
  openChallenges,
  sessionUrl,
  programmeAutoNudge,
  challengeById,
} from "./catalog"
import {
  browseDirectoryPath,
  registerableChallengeIdOf,
  registerableChallengeIds,
  visibleChallenges,
  isChallengeVisible,
} from "./visibility"

describe("browseDirectoryPath", () => {
  it("sends a closed listing to the programme that is actually open", () => {
    expect(browseDirectoryPath("recoding_medicine")).toBe("/directory?challenge=vision_mixer")
  })

  it("prefers an active desk cookie over the listing programme", () => {
    expect(browseDirectoryPath("recoding_medicine", null, "vision_mixer")).toBe(
      "/directory?challenge=vision_mixer",
    )
  })

  it("falls back when there is no listing yet", () => {
    const visible = visibleChallenges()
    if (visible.length === 1) {
      expect(browseDirectoryPath(null)).toBe(directoryHref(visible[0]!.id))
    } else {
      // No listing yet: land on the programme that is open.
      expect(browseDirectoryPath(null)).toBe("/directory?challenge=vision_mixer")
    }
  })
})

describe("challengeBySlug", () => {
  it("finds AI Safety Berlin by slug", () => {
    expect(challengeBySlug("ai-safety-berlin")?.id).toBe("ai_safety_berlin")
  })
})

describe("sessionUrl", () => {
  it("falls back to calendarUrl for sessions without a per-session URL", () => {
    const asb = challengeBySlug("ai-safety-berlin")!
    expect(sessionUrl(asb, "asb_coworking")).toBe("https://luma.com/AISafetyBerlin")
  })
})

describe("visibility", () => {
  it("Recoding Medicine stays visible as a closed archive", () => {
    expect(isChallengeVisible("recoding_medicine")).toBe(true)
    expect(challengeById("recoding_medicine").status).toBe("closed")
  })

  it("keeps a closed programme's listings off the directory", () => {
    expect(listingOnDisplay("recoding_medicine")).toBe(false)
    expect(listingOnDisplay("recoding_medicine", true)).toBe(true)
    expect(listingOnDisplay("vision_mixer")).toBe(true)
  })

  it("keeps AI Safety Berlin off the desk entirely", () => {
    expect(isChallengeVisible("ai_safety_berlin")).toBe(false)
    expect(visibleChallenges().map((c) => c.id)).toEqual(["recoding_medicine", "vision_mixer"])
  })

  it("ignores a demo cookie for an unlisted programme", () => {
    const unlock = { programme: "ai_safety_berlin" as const, solo: true }
    expect(isChallengeVisible("ai_safety_berlin", unlock)).toBe(false)
    expect(isChallengeVisible("recoding_medicine", unlock)).toBe(true)
    expect(isChallengeVisible("vision_mixer", unlock)).toBe(true)
  })

  it("ignores unlock cookies when preview programmes are off", () => {
    const previous = process.env.NEXT_PUBLIC_PREVIEW_PROGRAMMES
    process.env.NEXT_PUBLIC_PREVIEW_PROGRAMMES = "off"
    try {
      const unlock = { programme: "ai_safety_berlin" as const, solo: true }
      // Live desk: closed archive stays; preview programme stays hidden.
      expect(isChallengeVisible("recoding_medicine", unlock)).toBe(true)
      expect(isChallengeVisible("ai_safety_berlin", unlock)).toBe(false)
      expect(visibleChallenges(unlock).map((c) => c.id)).toEqual([
        "recoding_medicine",
        "vision_mixer",
      ])
      expect(acceptsNewListings("recoding_medicine")).toBe(false)
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_PREVIEW_PROGRAMMES
      else process.env.NEXT_PUBLIC_PREVIEW_PROGRAMMES = previous
    }
  })
})

describe("acceptsNewListings", () => {
  it("blocks Recoding Medicine after close", () => {
    expect(acceptsNewListings("recoding_medicine")).toBe(false)
    expect(openChallenges().map((c) => c.id)).toEqual(["vision_mixer"])
  })

  it("offers the live mixer, and not a closed archive, on register", () => {
    expect(registerableChallengeIdOf("recoding_medicine")).toBe("vision_mixer")
    expect(registerableChallengeIdOf("vision_mixer")).toBe("vision_mixer")
    expect(registerableChallengeIds()).toEqual(["vision_mixer"])
  })

  it("offers a preview programme when it is visible and open", () => {
    // ASB is preview, not open — still not registerable until flipped.
    expect(acceptsNewListings("ai_safety_berlin")).toBe(false)
  })
})

describe("programmeAutoNudge", () => {
  it("leaves Recoding Medicine off after the operator blast", () => {
    expect(programmeAutoNudge("recoding_medicine")).toBe(false)
    expect(challengeById("recoding_medicine").autoNudge).toBe(false)
  })

  it("mails AI Safety Berlin and any later programme that does not opt out", () => {
    expect(programmeAutoNudge("ai_safety_berlin")).toBe(true)
    expect(programmeAutoNudge("vision_mixer")).toBe(false)
  })
})
