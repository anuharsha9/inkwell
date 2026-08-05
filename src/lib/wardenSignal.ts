/**
 * Tell Warden a real event happened, so a bound Cadence commitment auto-completes
 * (publishing an article → the "Publish an article" cadence ticks itself off).
 *
 * Fire-and-forget and owner-gated: it only fires when a Warden signal key is
 * configured (Settings → the owner's instances). The public demo has no key, so
 * a demo visitor's "publish" never reaches Warden. The key travels in the body
 * (text/plain) so the cross-origin POST stays a "simple" request — no CORS
 * preflight — mirroring the analytics beacon. It never throws into the app and
 * never blocks publishing.
 */

const WARDEN_SIGNAL_URL =
  import.meta.env.VITE_WARDEN_SIGNAL_URL ||
  'https://warden.anujaharsha.com/api/commitments/signal'

export function notifyWardenPublished(articleId: string, wardenKey: string | undefined): void {
  if (!wardenKey) return // no key = not an owner instance → stay silent
  try {
    const body = JSON.stringify({
      app: 'inkwell',
      kind: 'publish',
      ref: articleId, // dedupes: one article counts once, however many times this fires
      key: wardenKey,
    })
    void fetch(WARDEN_SIGNAL_URL, {
      method: 'POST',
      body, // text/plain (default) → simple request, no preflight
      keepalive: true,
      mode: 'no-cors',
    }).catch(() => {})
  } catch {
    /* telemetry must never break publishing */
  }
}
