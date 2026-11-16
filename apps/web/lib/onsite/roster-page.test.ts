import { describe, expect, it } from "vitest"
import { bySurname, letterSpan, ROSTER_PAGE_MS, ROSTER_PAGE_SIZE, rosterWindow, surnameInitial } from "./roster-page"

describe("rosterWindow", () => {
  it("shows a readable page, then the next names", () => {
    expect(rosterWindow(116, 0)).toEqual({ start: 0, end: ROSTER_PAGE_SIZE, pages: 8 })
    expect(rosterWindow(116, ROSTER_PAGE_MS)).toEqual({
      start: ROSTER_PAGE_SIZE,
      end: ROSTER_PAGE_SIZE * 2,
      pages: 8,
    })
  })

  it("closes the last page on the final person", () => {
    expect(rosterWindow(116, ROSTER_PAGE_MS * 7).end).toBe(116)
  })
})

describe("bySurname", () => {
  it("files people by surname, ignoring accents", () => {
    const people = [{ org_name: "Zara Chen" }, { org_name: "Mariëlle Voss" }, { org_name: "Aaron Blotnick" }]
    expect([...people].sort(bySurname).map((person) => person.org_name)).toEqual([
      "Aaron Blotnick",
      "Zara Chen",
      "Mariëlle Voss",
    ])
  })
})

describe("letterSpan", () => {
  it("reads the surname, not the given name", () => {
    expect(surnameInitial("Mariëlle Voss")).toBe("V")
    expect(surnameInitial("Jean-Charles Cabelguen")).toBe("C")
  })

  it("writes a single letter when the page stays inside one", () => {
    expect(letterSpan(["Aaron Blotnick", "Zara Chen", "Mariëlle Voss"])).toBe("B–V")
    expect(letterSpan(["Ada Mer", "Noah Moss"])).toBe("M")
  })
})
