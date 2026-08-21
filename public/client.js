window.__ModuleLoader__.load({
	id: "dsh-opencode-go-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let React = require("react");

		const NS = 'opencode-go-usage';
		const zh = {
			'badge.tooltip': '点击查看 OpenCode Go 用量详情',
			'badge.loading': 'Go …',
			'badge.noData': 'Go --',
		};
		const en = {
			'badge.tooltip': 'Click to view OpenCode Go usage details',
			'badge.loading': 'Go …',
			'badge.noData': 'Go --',
		};

		const WINDOWS = [
			{ key: "rolling", label: "5 小时滚动", short: "5h", max: 12 },
			{ key: "weekly", label: "本周", short: "W", max: 30 },
			{ key: "monthly", label: "本月", short: "M", max: 60 },
		];

		function fmtReset(sec) {
			if (sec <= 0) return "即将重置";
			const d = Math.floor(sec / 86400);
			const h = Math.floor((sec % 86400) / 3600);
			const m = Math.floor((sec % 3600) / 60);
			const parts = [];
			if (d > 0) parts.push(`${d}天`);
			if (h > 0) parts.push(`${h}小时`);
			if (m > 0 || parts.length === 0) parts.push(`${m}分钟`);
			return parts.join(" ");
		}
		function getStatusColor(pct) {
			if (pct >= 90) return "#ef4444";
			if (pct >= 70) return "#f59e0b";
			return "#22c55e";
		}

		let styleInjected = false;
		function injectStyles() {
			if (styleInjected) return;
			const css = `
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
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  z-index: 10000;
  padding: 16px;
  font-size: 13px;
}
.go-usage-detail .detail-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; font-weight:600; font-size:14px; }
.go-usage-detail .detail-header button { background:none; border:none; cursor:pointer; padding:4px; color:#666; }
.go-usage-detail .detail-section { margin-bottom:12px; }
.go-usage-detail .detail-section-header { display:flex; justify-content:space-between; margin-bottom:6px; color:#666; font-size:12px; }
.go-usage-detail .detail-bar { height:6px; background:#e5e7eb; border-radius:3px; overflow:hidden; margin-bottom:4px; }
.go-usage-detail .detail-bar-fill { height:100%; border-radius:3px; transition:width 0.3s ease; }
.go-usage-detail .detail-footer { margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb; color:#666; font-size:11px; text-align:center; }
`;
			const style = document.createElement('style');
			style.textContent = css;
			document.head.appendChild(style);
			styleInjected = true;
		}

		function GoBadgeFooter(props) {
			const [quota, setQuota] = React.useState(null);
			const [open, setOpen] = React.useState(false);
			const wide = props.wide;

			React.useEffect(() => {
				let alive = true;
				async function fetchQuota() {
					try {
						const r = await fetch('/api/opencode-go-usage/quota');
						if (r.ok && alive) {
							const d = await r.json();
							setQuota(d);
						}
					} catch {}
				}
				fetchQuota();
				const id = setInterval(fetchQuota, 60000);
				return () => { alive = false; clearInterval(id); };
			}, []);

			React.useEffect(() => {
				injectStyles();
				if (!open) return;
				function onKey(e) { if (e.key === 'Escape') setOpen(false); }
				window.addEventListener('keydown', onKey);
				return () => window.removeEventListener('keydown', onKey);
			}, [open]);

			let text = 'Go …';
			let worst = 0;
			if (quota && !quota._empty) {
				worst = Math.max(quota.rolling?.usedPct ?? 0, quota.weekly?.usedPct ?? 0, quota.monthly?.usedPct ?? 0);
				if (worst === 0) text = 'Go --';
				else {
					const parts = [];
					for (const w of WINDOWS) {
						const d = quota[w.key];
						if (d) parts.push(`${w.short} ${d.usedPct}%`);
					}
					text = parts.join(' · ');
				}
			} else if (quota && quota._empty) {
				text = 'Go --';
			}

			const btnStyle = {
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '4px',
				height: '28px',
				minHeight: '28px',
				padding: '0 8px',
				borderRadius: '999px',
				border: '1px solid var(--dsw-alias-border-secondary, #e5e7eb)',
				background: 'var(--dsw-alias-bg-secondary, #f3f4f6)',
				fontSize: '11px',
				lineHeight: '1',
				cursor: 'pointer',
				userSelect: 'none',
				whiteSpace: 'nowrap',
				flex: '0 1 auto',
				marginLeft: 'auto',
				order: 99,
				alignSelf: 'center',
				boxSizing: 'border-box',
				color: 'var(--dsw-alias-label-primary, #333)',
				borderLeft: worst ? `3px solid ${getStatusColor(worst)}` : undefined,
			};

			const detail = open ? React.createElement('div', {
				className: 'go-usage-detail',
				onClick: (e) => e.stopPropagation(),
			},
				React.createElement('div', { className: 'detail-header' },
					React.createElement('span', null, 'OpenCode Go 用量'),
					React.createElement('button', { onClick: () => setOpen(false) }, '✕')
				),
				(!quota || quota._empty) ? React.createElement('div', { style: { padding: '12px 0', textAlign: 'center', color: '#999', fontSize: '12px' } },
					quota && quota._empty ? React.createElement(React.Fragment, null,
						'暂无用量数据',
						React.createElement('br'),
						React.createElement('span', { style: { fontSize: '11px' } }, '请检查 ~/.opencode-go-usage.json 凭据是否配置')
					) : '加载中...'
				) : (() => {
					const sections = [];
					let hasAny = false;
					for (const w of WINDOWS) {
						const d = quota[w.key];
						if (!d) continue;
						hasAny = true;
						sections.push(React.createElement('div', { key: w.key, className: 'detail-section' },
							React.createElement('div', { className: 'detail-section-header' },
								React.createElement('span', null, w.label),
								React.createElement('span', null, `${d.usedPct}% / $${w.max}`)
							),
							React.createElement('div', { className: 'detail-bar' },
								React.createElement('div', { className: 'detail-bar-fill', style: { width: `${d.usedPct}%`, background: getStatusColor(d.usedPct) } })
							),
							React.createElement('div', { style: { color: '#666', fontSize: '11px' } }, `重置于 ${fmtReset(d.resetInSec)}`)
						));
					}
					if (!hasAny) sections.push(React.createElement('div', { key: 'empty', style: { padding: '8px 0', textAlign: 'center', color: '#999' } }, '暂无用量数据'));
					if (quota.account) sections.push(React.createElement('div', { key: 'acct', style: { marginTop: '8px', fontSize: '11px', color: '#666' } }, `账号: ${quota.account}`));
					const now = new Date(quota.fetchedAt);
					sections.push(React.createElement('div', { key: 'footer', className: 'detail-footer' }, `更新于 ${now.getMonth()+1}月${now.getDate()}日 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`));
					return sections;
				})()
			) : null;

			return React.createElement(React.Fragment, null,
				React.createElement('div', {
					title: '点击查看 OpenCode Go 用量详情',
					onClick: () => setOpen(v => !v),
					style: btnStyle,
				},
					React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', style: { width: '12px', height: '12px', flexShrink: 0 } },
						React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
						React.createElement('path', { d: 'M12 6v6l4 2' })
					),
					React.createElement('span', null, text)
				),
				detail
			);
		}

		const inject = ['slots', 'locale'];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'opencode-go-usage: dictionaries');
			ctx.slots.inject('sidebar.footer.action', () => {
				const dispose = ctx.slots.register({ name: 'sidebar.footer.action', id: 'opencode-go-usage', locale: NS }, GoBadgeFooter);
				return () => dispose();
			});
			ctx.slots.inject('sidebar.remote', () => {
				const dispose = ctx.slots.register({ name: 'sidebar.remote', locale: NS }, GoBadgeFooter);
				return () => dispose();
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
