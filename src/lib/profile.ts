const key = "dragon-stt-profile"

export function getProfile(): string {
  return localStorage.getItem(key) ?? ""
}

export function setProfile(name: string): void {
  if (name.trim()) localStorage.setItem(key, name.trim())
  else localStorage.removeItem(key)
}
