// Personal-unlock gate (web). The demo/distributed build hides Anuja's personal
// features (Config Track, Book, Sources) until she enters her passphrase. Only the
// SHA-256 hash ships — the passphrase (~80 bits, entered once per browser) can't
// be recovered from it. Same passphrase as the iOS app. To change it: sha256 the
// new passphrase and replace EXPECTED_HASH.
const EXPECTED_HASH = 'd82bd0ced363756e4d566866f7383ed0f258acd428f7a6a5686189c30ef21867'

const UNLOCK_FLAG = 'inkwell:unlocked'

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Hash the input and compare to the baked hash. */
export async function verifyPassphrase(input: string): Promise<boolean> {
  return (await sha256hex(input.trim())) === EXPECTED_HASH
}

/** Synchronous read of the persisted unlock flag (localStorage). */
export function loadUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_FLAG) === '1'
  } catch {
    return false
  }
}

export function setUnlockedFlag(unlocked: boolean): void {
  try {
    if (unlocked) localStorage.setItem(UNLOCK_FLAG, '1')
    else localStorage.removeItem(UNLOCK_FLAG)
  } catch {
    /* storage disabled — stays locked */
  }
}
