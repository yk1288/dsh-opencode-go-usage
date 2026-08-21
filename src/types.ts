/**
 * OpenCode Go usage types
 */

/** Usage window keys */
export type WindowKey = "rolling" | "weekly" | "monthly"

/** Single usage window data */
export interface UsageWindow {
  /** Window status (ok, limited, etc.) */
  status: string
  /** Seconds until reset */
  resetInSec: number
  /** Usage percentage (0-100) */
  usedPct: number
}

/** Complete quota data */
export interface Quota {
  /** Rolling 5-hour window */
  rolling?: UsageWindow
  /** Weekly window */
  weekly?: UsageWindow
  /** Monthly window */
  monthly?: UsageWindow
  /** Account email */
  account?: string
  /** Timestamp when data was fetched */
  fetchedAt: number
}

/** Window configuration */
export interface WindowConfig {
  key: WindowKey
  label: string
  short: string
  max: number
}

/** Default window configurations */
export const WINDOWS: WindowConfig[] = [
  { key: "rolling", label: "5 小时滚动", short: "5h", max: 12 },
  { key: "weekly", label: "本周", short: "W", max: 30 },
  { key: "monthly", label: "本月", short: "M", max: 60 },
]

/** Plugin configuration */
export interface Config {
  /** Enable/disable the plugin */
  enabled?: boolean
  /** Refresh interval in seconds */
  refreshInterval?: number
  /** Warning threshold (0-100) */
  warnThreshold?: number
  /** Alert threshold (0-100) */
  alertThreshold?: number
  /** OpenCode workspace ID */
  workspaceId?: string
  /** OpenCode auth cookie */
  authCookie?: string
}
