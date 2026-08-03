import { useEffect, useRef } from 'react'
import { useStore } from '../store'

/* ── First-party analytics beacon → Warden's public collector.
 *
 *  The same cookieless beacon the portfolio uses, pointed at Inkwell. No cookies,
 *  no consent banner, no third party. The browser POSTs a tiny pageview (and a
 *  heartbeat while the tab is open) to Warden's collector; Warden stores it keyed
 *  by `site` and shows it on Inkwell's page in the console (Audience + Time on
 *  page). The IP never leaves the browser.
 *
 *  Inkwell has no URL router — it's a store-driven single page. So the "path" is
 *  the active view (`/home`, `/archive`, …); that becomes Top Pages in Warden.
 *
 *  Receiver contract lives in the `warden` repo:
 *    src/app/api/analytics/collect/route.ts  (public; accepts *.anujaharsha.com)
 *
 *  Owner opt-out AT THE SOURCE — an opted-out browser never even sends the beacon:
 *    ?track=off  → stop reporting THIS browser (persists)  ·  ?track=on → resume
 *    ?exclude-me → alias for ?track=off
 *  The flag is the ONLY thing kept in localStorage — no persistent tracking id.
 *
 *  LIVE SITE ONLY — the hostname guard means localhost, `vite dev`, the Electron
 *  desktop build, and previews NEVER report; only *.anujaharsha.com does. (The
 *  collector also checks the Origin server-side — two independent layers.)
 */

const COLLECT_URL =
  import.meta.env.VITE_ANALYTICS_URL ||
  'https://warden.anujaharsha.com/api/analytics/collect'
const SITE = import.meta.env.VITE_ANALYTICS_SITE || 'inkwell'
const OPT_OUT_KEY = 'we_noreport'
const HEARTBEAT_MS = 60_000

/* FNV-1a → base36. Not cryptographic — just a stable per-day bucket. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/* Cookieless, approximate visitor id: coarse browser traits + the calendar day,
 * stored NOWHERE. Same browser within a day → same id (rough uniques); resets
 * daily on its own. Matches Warden's "approximate (cookieless)" label honestly. */
function visitorId(): string {
  if (typeof navigator === 'undefined') return 'anon'
  let tz = ''
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    /* ignore */
  }
  const traits = [
    navigator.userAgent,
    navigator.language,
    tz,
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
    new Date().toISOString().slice(0, 10), // YYYY-MM-DD (UTC)
  ].join('|')
  return `v${fnv1a(traits)}`
}

function device(): 'mobile' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  const mobileUA = /Mobi|Android|iPhone|iPod|iPad|Windows Phone/i.test(navigator.userAgent)
  const narrow = typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 768
  return mobileUA || narrow ? 'mobile' : 'desktop'
}

/* Only the real production subdomain reports — never localhost / dev / desktop. */
function onLiveSite(): boolean {
  if (typeof window === 'undefined') return false
  return /(^|\.)anujaharsha\.com$/i.test(window.location.hostname)
}

function optedOut(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('track')
    if (t === 'off' || params.has('exclude-me')) localStorage.setItem(OPT_OUT_KEY, '1')
    else if (t === 'on') localStorage.removeItem(OPT_OUT_KEY)
    return localStorage.getItem(OPT_OUT_KEY) === '1'
  } catch {
    return false // storage blocked (private mode) → still count the visit
  }
}

function send(type: 'pageview' | 'heartbeat', path: string): void {
  if (typeof window === 'undefined' || !onLiveSite() || optedOut()) return
  const payload = JSON.stringify({
    type,
    site: SITE,
    path,
    referrer: type === 'pageview' ? document.referrer : '',
    device: device(),
    visitor: visitorId(),
  })
  // Plain string body → text/plain → a "simple" request → NO CORS preflight.
  // Warden reads req.text(); the browser still sends Origin. Analytics must never
  // break the page, so everything is wrapped.
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(COLLECT_URL, payload)) return
  } catch {
    /* fall through to fetch */
  }
  try {
    void fetch(COLLECT_URL, {
      method: 'POST',
      body: payload,
      keepalive: true,
      mode: 'no-cors',
      credentials: 'include',
    })
  } catch {
    /* swallow — a missed hit is never worth a broken page */
  }
}

/** Reports the active store `view` as a pageview, plus a heartbeat while visible. */
export function WardenAnalytics() {
  const view = useStore((s) => s.view)
  const lastPath = useRef<string | null>(null)
  const pathRef = useRef<string>(`/${view}`)

  useEffect(() => {
    const path = `/${view}`
    pathRef.current = path
    if (path === lastPath.current) return
    lastPath.current = path
    send('pageview', path)
  }, [view])

  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === 'visible') send('heartbeat', pathRef.current)
    }
    const id = setInterval(beat, HEARTBEAT_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') beat()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return null
}
