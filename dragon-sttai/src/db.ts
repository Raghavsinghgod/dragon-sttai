const p = "dstt:";

export function get(k: string): any {
  try {
    const v = localStorage.getItem(p + k);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function set(k: string, v: unknown): void {
  try {
    localStorage.setItem(p + k, JSON.stringify(v));
  } catch {
    return;
  }
}

export function clear(): void {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(p)) localStorage.removeItem(k);
  }
}
