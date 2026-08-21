/**
 * Browser-half entry for the dsh-opencode-go-usage plugin
 * 
 * Mounts the sidebar status badge and detail popover.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { mountSidebarBadge } from './sidebar-badge'
import { en, zh, type UsageKey } from './locales'

/** Locale namespace this plugin owns. */
const NS = 'opencode-go-usage'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'opencode-go-usage': UsageKey
  }
}

/** Required services. */
export const inject = ['slots', 'locale', 'connection']

/**
 * Mount the OpenCode Go usage badge.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext & { locale?: { register: (ns: string, dict: Record<string, any>) => void } }): void {
  if (ctx.locale) {
    ctx.effect(() => {
      ctx.locale!.register(NS, { zh, en })
      return {} as any
    }, 'opencode-go-usage: dictionaries')
  }

  const disposers: Array<() => void> = []
  try {
    disposers.push(mountSidebarBadge())
  } catch (error) {
    // DOM failures degrade the badge, never the GUI.
    console.warn('[dsh-opencode-go-usage] mount failed:', error)
  }
  
  ctx.effect(() => {
    return () => {
      for (const dispose of disposers.splice(0)) dispose()
    }
  }, 'opencode-go-usage: ui mounts')
}
