/**
 * Sidebar badge injection for OpenCode Go usage
 *
 * NOTE: The running browser bundle is `public/client.js` → `lib/client.js`
 * (hand-written __ModuleLoader wrapper). This file is kept as typed reference
 * and for `tsc -b` type-checking; keep it in sync with `public/client.js`.
 */
import { tt } from './locales'
import type { Quota, WindowKey } from '../types'
import { WINDOWS } from '../types'

/** Stable data attribute identifying the injected badge. */
export const BADGE_SELECTOR = '[data-dsh-opencode-go-usage]'

// ── State ────────────────────────────────────────────────────────────

let currentQuota: Quota | null = null
let badgeElement: HTMLElement | null = null
let detailPanel: HTMLElement | null = null

// ── Formatting Helpers ───────────────────────────────────────────────

function fmtReset(sec: number): string {
  if (sec <= 0) return "即将重置"
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}天`)
  if (h > 0) parts.push(`${h}小时`)
  if (m > 0 || parts.length === 0) parts.push(`${m}分钟`)
  return parts.join(" ")
}

function buildBar(pct: number, width: number = 12): string {
  const filled = Math.round((pct / 100) * width)
  return "█".repeat(filled) + "░".repeat(width - filled)
}

function getStatusColor(pct: number): string {
  if (pct >= 90) return "var(--dsw-alias-color-danger, #ef4444)"
  if (pct >= 70) return "var(--dsw-alias-color-warning, #f59e0b)"
  return "var(--dsw-alias-color-success, #22c55e)"
}

// ── Badge Styles ─────────────────────────────────────────────────────

const BADGE_STYLE = `
[data-dsh-opencode-go-usage] {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  margin: 2px 8px;
  min-height: 22px;
  height: 22px;
  border-radius: 4px;
  background: var(--dsw-alias-bg-secondary, rgba(0, 0, 0, 0.05));
  cursor: pointer;
  transition: background 0.15s ease;
  font-size: 11px;
  line-height: 1;
  color: var(--dsw-alias-label-primary, #333);
  user-select: none;
  box-sizing: border-box;
}

[data-dsh-opencode-go-usage]:hover {
  background: var(--dsw-alias-bg-tertiary, rgba(0, 0, 0, 0.08));
}

[data-dsh-opencode-go-usage] .go-badge-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

[data-dsh-opencode-go-usage] .go-badge-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-dsh-opencode-go-usage] .go-badge-status {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

[data-dsh-opencode-go-usage] .go-badge-error {
  color: var(--dsw-alias-color-danger, #ef4444);
}

/* when injected into bottom toolbar (red-box position) */
[data-dsh-opencode-go-usage].footer-inline {
  flex: 1;
  margin: 0;
  height: 22px;
  min-height: 22px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-secondary, #e5e7eb);
  background: var(--dsw-alias-bg-secondary, #f3f4f6);
  padding: 0 8px;
}
[data-dsh-opencode-go-usage].footer-inline .go-badge-text {
  font-size: 11px;
}

/* Detail Panel */
.go-usage-detail {
  position: fixed;
  bottom: 80px;
  left: 16px;
  width: 320px;
  max-height: 480px;
  overflow-y: auto;
  background: var(--dsw-alias-bg-primary, #fff);
  border: 1px solid var(--dsw-alias-border-secondary, #e5e7eb);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 10000;
  padding: 16px;
  font-size: 13px;
}

.go-usage-detail .detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 14px;
}

.go-usage-detail .detail-header button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--dsw-alias-label-secondary, #666);
}

.go-usage-detail .detail-section {
  margin-bottom: 12px;
}

.go-usage-detail .detail-section-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 12px;
}

.go-usage-detail .detail-bar {
  height: 8px;
  background: var(--dsw-alias-bg-tertiary, #e5e7eb);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.go-usage-detail .detail-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.go-usage-detail .detail-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--dsw-alias-border-secondary, #e5e7eb);
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 11px;
  text-align: center;
}
`

// ── Inject Styles ────────────────────────────────────────────────────

let styleInjected = false

function injectStyles() {
  if (styleInjected) return
  const style = document.createElement('style')
  style.textContent = BADGE_STYLE
  document.head.appendChild(style)
  styleInjected = true
}

// ── Create Badge ─────────────────────────────────────────────────────

function createBadge(): HTMLElement {
  const badge = document.createElement('div')
  badge.dataset.dshOpencodeGoUsage = ''
  badge.setAttribute('title', tt('badge.tooltip'))
  
  badge.innerHTML = `
    <svg class="go-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
    <span class="go-badge-text">${tt('badge.loading')}</span>
  `
  
  badge.addEventListener('click', toggleDetailPanel)
  
  return badge
}

// ── Create Detail Panel ──────────────────────────────────────────────

function createDetailPanel(): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'go-usage-detail'
  panel.style.display = 'none'
  
  document.body.appendChild(panel)
  return panel
}

// ── Update Display ───────────────────────────────────────────────────

function updateBadge() {
  if (!badgeElement) return
  
  const textEl = badgeElement.querySelector('.go-badge-text')
  if (!textEl) return
  
  if (!currentQuota) {
    textEl.textContent = tt('badge.loading')
    return
  }
  
  // Show worst usage
  const worst = Math.max(
    currentQuota.rolling?.usedPct ?? 0,
    currentQuota.weekly?.usedPct ?? 0,
    currentQuota.monthly?.usedPct ?? 0,
  )
  
  if (worst === 0) {
    textEl.textContent = tt('badge.noData')
    return
  }
  
  const parts: string[] = []
  for (const w of WINDOWS) {
    const data = currentQuota[w.key as WindowKey]
    if (data) parts.push(`${w.short} ${data.usedPct}%`)
  }
  
  textEl.textContent = parts.join(' · ')
  textEl.className = 'go-badge-text go-badge-status'
  
  // Update color based on worst usage
  badgeElement.style.borderLeft = `3px solid ${getStatusColor(worst)}`
}

function updateDetailPanel() {
  if (!detailPanel) return
  
  // No data yet — show placeholder instead of blank
  if (!currentQuota || (currentQuota as any)._empty) {
    const isEmpty = (currentQuota as any)?._empty
    detailPanel.innerHTML = `
      <div class="detail-header">
        <span>OpenCode Go 用量</span>
        <button onclick="this.closest('.go-usage-detail').style.display='none'">✕</button>
      </div>
      <div style="padding: 16px 0; text-align:center; color: var(--dsw-alias-label-secondary, #999); font-size: 12px;">
        ${isEmpty ? '暂无用量数据<br><span style="font-size:11px">请检查 ~/.opencode-go-usage.json 凭据是否配置</span>' : '加载中...'}
      </div>
    `
    return
  }
  
  let html = `
    <div class="detail-header">
      <span>OpenCode Go 用量</span>
      <button onclick="this.closest('.go-usage-detail').style.display='none'">✕</button>
    </div>
  `
  
  let hasAny = false
  for (const w of WINDOWS) {
    const data = currentQuota[w.key as WindowKey]
    if (data) {
      hasAny = true
      const barColor = getStatusColor(data.usedPct)
      html += `
        <div class="detail-section">
          <div class="detail-section-header">
            <span>${w.label}</span>
            <span>${data.usedPct}% / $${w.max}</span>
          </div>
          <div class="detail-bar">
            <div class="detail-bar-fill" style="width: ${data.usedPct}%; background: ${barColor}"></div>
          </div>
          <div style="color: var(--dsw-alias-label-secondary, #666); font-size: 11px;">
            重置于 ${fmtReset(data.resetInSec)}
          </div>
        </div>
      `
    }
  }
  if (!hasAny) {
    html += `<div style="padding: 8px 0; text-align:center; color: #999; font-size: 12px;">暂无用量数据</div>`
  }
  
  if (currentQuota.account) {
    html += `<div style="margin-top: 8px; font-size: 11px; color: var(--dsw-alias-label-secondary, #666);">账号: ${currentQuota.account}</div>`
  }
  
  const now = new Date(currentQuota.fetchedAt)
  html += `
    <div class="detail-footer">
      更新于 ${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}
    </div>
  `
  
  detailPanel.innerHTML = html
}

// ── Toggle Detail Panel ──────────────────────────────────────────────

function toggleDetailPanel() {
  if (!detailPanel) {
    detailPanel = createDetailPanel()
  }
  
  const isVisible = detailPanel.style.display !== 'none'
  detailPanel.style.display = isVisible ? 'none' : 'block'
  
  if (!isVisible) {
    updateDetailPanel()
  }
}

// ── Fetch Quota ──────────────────────────────────────────────────────

async function fetchQuota() {
  try {
    const response = await fetch('/api/opencode-go-usage/quota')
    if (response.ok) {
      currentQuota = await response.json()
      updateBadge()
      // if detail panel is open, refresh it
      if (detailPanel && detailPanel.style.display !== 'none') updateDetailPanel()
    } else {
      console.warn('[dsh-opencode-go-usage] quota HTTP', response.status)
    }
  } catch (e) {
    console.warn('[dsh-opencode-go-usage] Failed to fetch quota:', e)
  }
}

// ── Find Sidebar Root ────────────────────────────────────────────────

function sidebarRoot(): HTMLElement | undefined {
  const column = document.querySelector<HTMLElement>('[data-pane="sidebar"], [class*="sidebarCol"]')
  if (column === null) return undefined
  const logoOwner = column.querySelector<HTMLElement>('[class*="logoRow"]')?.parentElement
  return logoOwner ?? (column.firstElementChild as HTMLElement | undefined)
}

// ── Find Footer Toolbar (下载/电话图标所在行) ─────────────────────
// 锚定“设置”行，其上一行即为下载/电话工具栏（红框位置）
function findFooterBar(): HTMLElement | undefined {
  const sidebar = document.querySelector<HTMLElement>('[data-pane="sidebar"], [class*="sidebarCol"]')
  if (!sidebar) return undefined
  // 优先：以“设置”文本为锚点，上一兄弟即为工具栏
  const all = Array.from(sidebar.querySelectorAll<HTMLElement>('*'))
  const settingsEl = all.find(el => el.textContent?.trim() === '设置') as HTMLElement | undefined
  if (settingsEl) {
    let row: HTMLElement | null = settingsEl.closest('div, button, a') as HTMLElement | null
    // 向上找到设置行的容器，再取其前一个兄弟
    while (row && row.parentElement && row.parentElement !== sidebar) {
      const prev = row.previousElementSibling as HTMLElement | null
      if (prev && prev.querySelectorAll('button').length >= 1) return prev
      // 若前兄弟不存在，尝试父容器的前兄弟
      const parentPrev = row.parentElement.previousElementSibling as HTMLElement | null
      if (parentPrev && parentPrev.querySelectorAll('button').length >= 1) return parentPrev
      row = row.parentElement as HTMLElement | null
    }
    if (row) {
      const prev = row.previousElementSibling as HTMLElement | null
      if (prev) return prev
    }
  }
  // 回退：找包含下载/电话按钮的公共父容器（最后两个按钮）
  const buttons = Array.from(sidebar.querySelectorAll<HTMLButtonElement>('button'))
  if (buttons.length >= 2) {
    for (let i = buttons.length - 1; i >= 1; i--) {
      const a = buttons[i], b = buttons[i - 1]
      let parent: HTMLElement | null = a.parentElement
      while (parent && parent !== sidebar) {
        if (parent.contains(b)) return parent
        parent = parent.parentElement as HTMLElement | null
      }
    }
    return buttons[buttons.length - 1].parentElement as HTMLElement | undefined
  }
  return undefined
}

// ── Mount Badge ──────────────────────────────────────────────────────

function placeBadge(_root: HTMLElement, badge: HTMLElement): boolean {
  const footerBar = findFooterBar()
  if (!footerBar) return false
  badge.classList.add('footer-inline')
  if (badge.parentElement !== footerBar) {
    footerBar.appendChild(badge)
    const cs = getComputedStyle(footerBar)
    if (!cs.display.includes('flex')) {
      footerBar.style.display = 'flex'
      footerBar.style.alignItems = 'center'
      footerBar.style.gap = '8px'
    }
  }
  return true
}

/**
 * Mount the sidebar badge, waiting for the shell to render.
 */
export function mountSidebarBadge(): () => void {
  injectStyles()
  
  badgeElement = createBadge()
  let root: HTMLElement | undefined
  let placed = false

  const tryPlace = (): void => {
    if (root !== undefined && !root.isConnected) {
      rootObserver.disconnect()
      root = undefined
      placed = false
    }
    if (placed) {
      if (document.body.contains(badgeElement!)) return
      rootObserver.disconnect()
      root = undefined
      placed = false
    }
    root ??= sidebarRoot()
    if (root === undefined) return
    placed = placeBadge(root, badgeElement!)
    if (placed) {
      rootObserver.observe(root, { childList: true, subtree: true })
    }
  }

  const waitObserver = new MutationObserver(() => { tryPlace() })
  waitObserver.observe(document.body, { childList: true, subtree: true })

  const rootObserver = new MutationObserver(() => {
    if (root === undefined || !root.isConnected) {
      placed = false
      tryPlace()
      return
    }
    if (!root.contains(badgeElement!)) {
      placed = placeBadge(root, badgeElement!)
    }
  })

  tryPlace()
  
  // Start fetching quota
  fetchQuota()
  setInterval(fetchQuota, 60000) // Refresh every minute

  return () => {
    waitObserver.disconnect()
    rootObserver.disconnect()
    badgeElement?.remove()
    detailPanel?.remove()
  }
}
