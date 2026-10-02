/**
 * Report Inkwell's real AI usage to Warden (warden.anujaharsha.com), so the Writing
 * Assistant shows up there as a REAL agent with real spend — not simulated activity.
 *
 * Inkwell's AI runs in the browser on a bring-your-own key, so there is no server in
 * the request to hold Warden's ingest secret. This posts to Warden's PUBLIC beacon
 * (/api/usage/beacon) instead — no secret ships in the bundle; the endpoint is
 * origin-locked. METADATA ONLY — token counts + agent/action/model/latency/status.
 * NEVER the prompt, the draft, or anything she wrote.
 *
 * Fire-and-forget: a telemetry failure can never break the app. The caller decides
 * WHEN to report — ai.ts reports only real, non-demo calls, so a demo visitor's
 * BYO-key usage never lands in her real spend.
 *
 * (Mirror of warden/src/lib/usage/beacon-client.ts — kept self-contained on purpose.)
 */
export interface UsageBeaconReport {
  app: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  agent?: string;
  action?: string;
  actor?: 'user' | 'ai';
  latencyMs?: number;
  status?: string;
}

const WARDEN_URL = 'https://warden.anujaharsha.com';

export function reportUsageBeacon(event: UsageBeaconReport): void {
  if (typeof window === 'undefined') return;
  const url = `${WARDEN_URL}/api/usage/beacon`;
  const body = JSON.stringify(event);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    /* fire-and-forget — telemetry must never break the app */
  }
}
