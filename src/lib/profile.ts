const key = "dragon-stt-profile"

export function getProfile(): string {
  try {
    return localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

export function setProfile(name: string): void {
  try {
    if (name.trim()) localStorage.setItem(key, name.trim())
    else localStorage.removeItem(key)
  } catch {
    return
  }
}
