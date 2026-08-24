import { afterEach, describe, expect, it, vi } from "vitest"

describe("addEntry failure handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it("toasts instead of throwing when indexeddb is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined)
    const sonner = await import("sonner")
    const errorSpy = vi.spyOn(sonner.toast, "error").mockImplementation(() => "")
    const { addEntry } = await import("./db")

    await expect(
      addEntry({ text: "doomed row", duration: 1, createdAt: 0, modelVer: "dragon-stt int8 v0.1.0" }),
    ).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith("could not save to history")
  })
})
