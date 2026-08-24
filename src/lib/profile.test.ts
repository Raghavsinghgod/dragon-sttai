import { beforeEach, describe, expect, it } from "vitest"
import { getProfile, setProfile } from "./profile"

beforeEach(() => {
  localStorage.clear()
})

describe("getProfile", () => {
  it("defaults to an empty string when unset", () => {
    expect(getProfile()).toBe("")
  })

  it("reads back a stored name", () => {
    setProfile("dragon rider")
    expect(getProfile()).toBe("dragon rider")
  })
})

describe("setProfile", () => {
  it("trims surrounding whitespace before saving", () => {
    setProfile("  anon  ")
    expect(getProfile()).toBe("anon")
  })

  it("overwrites the previous value", () => {
    setProfile("first")
    setProfile("second")
    expect(getProfile()).toBe("second")
  })

  it("clears the stored name when given blank input", () => {
    setProfile("someone")
    setProfile("   ")
    expect(getProfile()).toBe("")
  })

  it("clears the stored name when given an empty string", () => {
    setProfile("someone")
    setProfile("")
    expect(getProfile()).toBe("")
  })
})
