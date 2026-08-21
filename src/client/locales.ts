/**
 * Locale strings for OpenCode Go usage plugin
 */

export interface UsageKey {
  'badge.tooltip': string
  'badge.loading': string
  'badge.noData': string
  'badge.error': string
  'detail.title': string
  'detail.rolling': string
  'detail.weekly': string
  'detail.monthly': string
  'detail.resetIn': string
  'detail.account': string
  'detail.updatedAt': string
}

export const zh: UsageKey = {
  'badge.tooltip': '点击查看 OpenCode Go 用量详情',
  'badge.loading': 'Go …',
  'badge.noData': 'Go --',
  'badge.error': 'Go ⚠',
  'detail.title': 'OpenCode Go 用量',
  'detail.rolling': '5 小时滚动',
  'detail.weekly': '本周',
  'detail.monthly': '本月',
  'detail.resetIn': '重置于',
  'detail.account': '账号',
  'detail.updatedAt': '更新于',
}

export const en: UsageKey = {
  'badge.tooltip': 'Click to view OpenCode Go usage details',
  'badge.loading': 'Go …',
  'badge.noData': 'Go --',
  'badge.error': 'Go ⚠',
  'detail.title': 'OpenCode Go Usage',
  'detail.rolling': '5-hour Rolling',
  'detail.weekly': 'This Week',
  'detail.monthly': 'This Month',
  'detail.resetIn': 'Resets in',
  'detail.account': 'Account',
  'detail.updatedAt': 'Updated at',
}

// Helper function for translation
let currentLocale: 'zh' | 'en' = 'zh'
let dictionaries: Record<string, UsageKey> = { zh, en }

export function setLocale(locale: 'zh' | 'en') {
  currentLocale = locale
}

export function tt(key: keyof UsageKey): string {
  return dictionaries[currentLocale]?.[key] ?? key
}
