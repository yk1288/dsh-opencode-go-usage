/**
 * dsh-opencode-go-usage — Host side plugin
 *
 * Fetches OpenCode Go quota data from the workspace page.
 * Exposes it via a loopback-only HTTP route for the client badge.
 */
import type { Context } from '@deepseek-ai/cordis'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Quota } from './types'

// ── Constants ────────────────────────────────────────────────────────

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// ── Loopback fence (from dsh-ssh) ───────────────────────────────────

function isIPv4Loopback(addr: string): boolean {
  if (addr === '127.0.0.1') return true
  if (!addr.startsWith('127.')) return false
  return addr.split('.').every(p => { const n = Number(p); return Number.isInteger(n) && n >= 0 && n <= 255 })
}
function isLoopbackAddress(address?: string): boolean {
  if (!address) return false
  const n = address.toLowerCase()
  if (n === '::1') return true
  if (n.startsWith('::ffff:')) return isIPv4Loopback(n.slice(7))
  return isIPv4Loopback(n)
}
function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  return isIPv4Loopback(hostname)
}
function isLoopbackRequest(req: any): boolean {
  if (!isLoopbackAddress(req.socket?.remoteAddress)) return false
  const host: string | undefined = req.headers?.host
  if (typeof host !== 'string') return false
  let hostUrl: URL
  try { hostUrl = new URL('http://' + host) } catch { return false }
  if (!isLoopbackHostname(hostUrl.hostname)) return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin: string | undefined = req.headers.origin
  if (origin === undefined) return true
  try { return new URL(origin).host === hostUrl.host } catch { return false }
}

// ── Credential Resolution ────────────────────────────────────────────

function resolveCredentials(config: Record<string, any>): {
  workspaceId: string
  cookie: string
} | null {
  let ws = config.workspaceId ?? process.env.OPENCODE_GO_WORKSPACE_ID
  let ck = config.authCookie ?? process.env.OPENCODE_GO_AUTH_COOKIE

  if (ws && ck) return { workspaceId: ws.trim(), cookie: ck.trim() }

  // Try reading from file
  try {
    const filePath = join(homedir(), '.opencode-go-usage.json')
    if (existsSync(filePath)) {
      const cfg = JSON.parse(readFileSync(filePath, 'utf8'))
      ws = ws ?? cfg.workspace_id
      ck = ck ?? cfg.auth_cookie
    }
  } catch {}

  if (ws && ck) return { workspaceId: ws.trim(), cookie: ck.trim() }
  return null
}

// ── Fetching ─────────────────────────────────────────────────────────

async function fetchQuota(ws: string, cookie: string): Promise<Quota> {
  const res = await fetch(`https://opencode.ai/workspace/${ws}/go`, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,*/*',
      Cookie: `auth=${cookie}; oc_locale=zh`,
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()
  const out: Quota = { fetchedAt: Date.now() }

  const re =
    /(rolling|weekly|monthly)Usage:\$R\[\d+\]=\{status:"([a-z]+)",resetInSec:(\d+),usagePercent:(\d+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const key = m[1] as 'rolling' | 'weekly' | 'monthly'
    ;(out as any)[key] = { status: m[2], resetInSec: +m[3], usedPct: +m[4] }
  }

  const acc = html.match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  )
  if (acc) out.account = acc[1]

  return out
}

// ── Plugin ───────────────────────────────────────────────────────────

/** Services required by the host plugin. */
export const inject: string[] = ['webServer']

/**
 * Register the OpenCode Go usage projection.
 */
export function apply(ctx: Context, config: Record<string, any> = {}): void {
  let currentQuota: Quota | null = null

  const refresh = async () => {
    if (config.enabled === false) return

    const creds = resolveCredentials(config)
    if (!creds) {
      console.warn('[dsh-opencode-go-usage] No credentials configured')
      return
    }

    try {
      const quota = await fetchQuota(creds.workspaceId, creds.cookie)
      currentQuota = quota

      const worst = Math.max(
        quota.rolling?.usedPct ?? 0,
        quota.weekly?.usedPct ?? 0,
        quota.monthly?.usedPct ?? 0,
      )

      if (worst >= (config.alertThreshold ?? 90)) {
        console.warn(`[dsh-opencode-go-usage] ALERT: Usage at ${worst}%`)
      } else if (worst >= (config.warnThreshold ?? 70)) {
        console.warn(`[dsh-opencode-go-usage] WARNING: Usage at ${worst}%`)
      }
    } catch (e) {
      console.error('[dsh-opencode-go-usage] Fetch failed:', e)
    }
  }

  // Polling lifecycle owned by ctx.effect — auto-disposed on stop/update
  ;(ctx as any).effect(() => {
    refresh()
    const interval = (config.refreshInterval ?? 60) * 1000
    const id = setInterval(refresh, interval)
    ;(id as any).unref?.()
    return () => clearInterval(id)
  }, 'opencode-go-usage: poll')

  ctx.provide('opencodeGoUsage', {
    getQuota: () => currentQuota,
    refresh,
  })

  // Expose quota via HTTP for the browser badge (loopback-only)
  ;(ctx as any).effect(() => {
    const webServer: any = (ctx as any).webServer
    if (!webServer?.register) return
    const dispose = webServer.register({
      kind: 'exact' as const,
      path: '/api/opencode-go-usage/quota',
      handler: async (req: any, res: any) => {
        if (!isLoopbackRequest(req)) {
          res.writeHead(403, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'forbidden: loopback-only' }))
          return
        }
        try {
          if (!currentQuota) refresh().catch(() => {})
          const body = JSON.stringify(currentQuota ?? { fetchedAt: Date.now(), _empty: true })
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(body)
        } catch (e: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: String(e?.message ?? e) }))
        }
      },
    })
    return () => { try { dispose?.() } catch {} }
  }, 'opencode-go-usage: web route')
}

// ── Exports ──────────────────────────────────────────────────────────

export { fetchQuota } from './fetcher'
export type { Config, Quota, UsageWindow } from './types'
