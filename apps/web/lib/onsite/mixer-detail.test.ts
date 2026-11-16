import { describe, expect, it } from "vitest"
import { mixerDetail } from "./mixer-detail"

describe("mixerDetail", () => {
  it("uses a listed affiliation when the person gave one", () => {
    expect(
      mixerDetail({
        org_name: "Omri Amirav Drory",
        one_liner: "Early-stage investor at NFX.",
        affiliation: "NFX",
        website: "https://www.nfx.com/team/omri",
      }),
    ).toBe("NFX")
  })

  it("keeps the sentence they wrote, ahead of a domain name", () => {
    expect(
      mixerDetail({
        org_name: "Eleana Baskouta",
        one_liner: "Philanthropic partnerships at Activate.",
        website: "https://www.activate.org",
      }),
    ).toBe("Philanthropic partnerships at Activate.")
  })

  it("does not turn a personal domain into a fake firm", () => {
    expect(
      mixerDetail({
        org_name: "Ben Lukszys",
        one_liner: "",
        website: "https://benlukszys.com",
      }),
    ).toBe("")
  })

  it("ignores social hosts and falls back to the project line", () => {
    expect(
      mixerDetail({
        org_name: "Paula Amato",
        one_liner: "In-vivo cell-based mitochondrial transfer therapy for longevity.",
        website: "https://linkedin.com/in/paula-amato",
      }),
    ).toBe("In-vivo cell-based mitochondrial transfer therapy for…")
  })
})
