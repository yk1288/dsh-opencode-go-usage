/**
 * OpenCode Go quota fetcher
 * 
 * Fetches usage data from opencode.ai workspace page.
 */
import { homedir } from "node:os"
import { join } from "node:path"
import { readFileSync, existsSync } from "node:fs"
import type { Quota, UsageWindow } from "./types.ts"

// ── Constants ────────────────────────────────────────────────────────

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const CREDENTIAL_PATH = join(homedir(), ".opencode-go-usage.json")

// ── Credential Resolution ────────────────────────────────────────────

export function resolveCredentials(opts: {
  workspaceId?: string
  authCookie?: string
} = {}): { workspaceId: string; cookie: string } | null {
  let ws = opts.workspaceId ?? process.env.OPENCODE_GO_WORKSPACE_ID
  let ck = opts.authCookie ?? process.env.OPENCODE_GO_AUTH_COOKIE
  
  if (ws && ck) return { workspaceId: ws.trim(), cookie: ck.trim() }
  
  // Try reading from file
  try {
    if (existsSync(CREDENTIAL_PATH)) {
      const cfg = JSON.parse(readFileSync(CREDENTIAL_PATH, "utf8"))
      ws = ws ?? cfg.workspace_id
      ck = ck ?? cfg.auth_cookie
    }
  } catch {}
  
  if (ws && ck) return { workspaceId: ws.trim(), cookie: ck.trim() }
  return null
}

// ── Fetching ─────────────────────────────────────────────────────────

export async function fetchQuota(ws: string, cookie: string): Promise<Quota> {
  const res = await fetch(`https://opencode.ai/workspace/${ws}/go`, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,*/*",
      Cookie: `auth=${cookie}; oc_locale=zh`,
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()
  const out: Quota = { fetchedAt: Date.now() }

  // Parse SSR output: rollingUsage:$R[N]={status:"ok",resetInSec:N,usagePercent:N}
  const re =
    /(rolling|weekly|monthly)Usage:\$R\[\d+\]=\{status:"([a-z]+)",resetInSec:(\d+),usagePercent:(\d+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const key = m[1] as 'rolling' | 'weekly' | 'monthly'
    out[key] = {
      status: m[2],
      resetInSec: +m[3],
      usedPct: +m[4],
    }
  }

  // Extract email
  const acc = html.match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  )
  if (acc) out.account = acc[1]

  return out
}
