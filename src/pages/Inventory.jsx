import { inventoryApi, salesApi, purchasesApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMsg, fmt, fmtDate, EggBadge, PrintHeader } from '../components/ui';

// ── Date constants ────────────────────────────────────────────────────────────
const NOW             = new Date();
const D30_AGO         = new Date(NOW - 30 * 864e5);
const D60_AGO         = new Date(NOW - 60 * 864e5);

// ── Design tokens per egg size ────────────────────────────────────────────────
const SIZE_CFG = {
	small:   { color: 'var(--brown-light)', light: 'rgba(122,69,32,.1)',  label: 'Small Eggs' },
	medium:  { color: 'var(--amber)',       light: 'rgba(212,117,10,.1)', label: 'Medium Eggs' },
	large:   { color: 'var(--success)',     light: 'rgba(46,125,50,.1)',  label: 'Large Eggs' },
};

// ── Mini components ───────────────────────────────────────────────────────────
function Bar({ pct, color, height = 8 }) {
	return (
		<div style={{ height, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden', flex: 1 }}>
			<div style={{ height: '100%', width: `${Math.max(Number(pct) || 0, 2)}%`, background: color, borderRadius: 4 }} />
		</div>
	);
}

function StockBadge({ qty }) {
	if (qty === 0)  return <span className="badge badge-red">Out of Stock</span>;
	if (qty < 20)   return <span className="badge badge-red">⚠ Critical</span>;
	if (qty < 50)   return <span className="badge badge-amber">Low Stock</span>;
	if (qty >= 500) return <span className="badge badge-brown">Overstocked</span>;
	return <span className="badge badge-green">✓ In Stock</span>;
}

function DaysBadge({ days }) {
	if (days === null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
	const color = days < 7 ? 'var(--danger)' : days < 30 ? 'var(--warning)' : 'var(--success)';
	return <span style={{ fontWeight: 700, color }}>{days}d</span>;
}

function Trend({ cur, prev }) {
	if (!prev) return null;
	const pct = ((cur - prev) / Math.abs(prev)) * 100;
	if (Math.abs(pct) < 1) return <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→ same</span>;
	const up = pct > 0;
	return (
		<span style={{ fontSize: '0.7rem', fontWeight: 600, color: up ? 'var(--success)' : 'var(--danger)' }}>
			{up ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}%
		</span>
	);
}

function SectionHead({ icon, title }) {
	return (
		<div style={{
			fontFamily: "'DM Serif Display', serif",
			fontSize: '0.97rem',
			color: 'var(--text-primary)',
			marginBottom: 14,
			paddingBottom: 10,
			borderBottom: '1px solid var(--border-light)',
			display: 'flex', alignItems: 'center', gap: 7,
		}}>
			{icon} {title}
		</div>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Inventory() {
	const { data: inventory, loading, error } = useFetch(() => inventoryApi.get());
	const { data: salesRaw }                  = useFetch(() => salesApi.getAll());
	const { data: purchasesRaw }              = useFetch(() => purchasesApi.getAll());

	if (loading) return <Loading />;
	if (error)   return <ErrorMsg message={error} />;
	if (!inventory) return null;

	const salesArr = salesRaw    || [];
	const purchArr = purchasesRaw || [];

	// ── Per-size enrichment ───────────────────────────────────────────────────
	const sizeStats = inventory.map((item) => {
		const sz = item.eggSize;

		const sizePurch    = purchArr.filter((p) => p.eggSize === sz);
		const totalPurch   = sizePurch.reduce((s, p) => s + Number(p.quantity || 0), 0);
		// Use DB-stored totalCost when available, fall back to quantity × costPerTray
		const totalPurchCost = sizePurch.reduce((s, p) =>
			s + Number(p.totalCost || (Number(p.quantity || 0) * Number(p.costPerTray || 0))), 0);
		const avgCostPerTray = totalPurch > 0 ? totalPurchCost / totalPurch : 0;
		const stockValue     = item.quantity * avgCostPerTray;

		const sizeSales    = salesArr.filter((s) => s.eggSize === sz);
		const totalSold    = sizeSales.reduce((s, r) => s + Number(r.quantity    || 0), 0);
		const totalRevenue = sizeSales.reduce((s, r) => s + Number(r.totalAmount || 0), 0);

		const last30Sales = sizeSales.filter((s) => new Date(s.saleDate) >= D30_AGO);
		const prev30Sales = sizeSales.filter((s) => { const d = new Date(s.saleDate); return d >= D60_AGO && d < D30_AGO; });
		const last30Qty   = last30Sales.reduce((s, r) => s + Number(r.quantity || 0), 0);
		const prev30Qty   = prev30Sales.reduce((s, r) => s + Number(r.quantity || 0), 0);

		const avgDailySales = last30Qty / 30;
		const daysRemaining = avgDailySales > 0 ? Math.round(item.quantity / avgDailySales) : null;

		// Sell-through: sold ÷ (current stock + sold) accounts for any pre-existing stock
		// and is always 0–100% regardless of whether purchases were tracked from day one
		const totalThrough = item.quantity + totalSold;
		const sellThrough  = totalThrough > 0 ? (totalSold / totalThrough) * 100 : 0;

		// COGS: use weighted avg cost but cap sold qty at purchased qty so cost
		// never exceeds what was actually spent
		const soldForCost  = Math.min(totalSold, totalPurch);
		const cogs         = soldForCost * avgCostPerTray;
		const grossProfit  = totalRevenue - cogs;

		const avgUnitPrice = totalSold > 0 ? totalRevenue / totalSold : 0;

		const lastPurch = [...sizePurch].sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))[0];
		const lastSale  = [...sizeSales].sort((a, b) => new Date(b.saleDate)     - new Date(a.saleDate))[0];

		return {
			...item,
			totalPurch, totalPurchCost, avgCostPerTray, stockValue,
			totalSold, totalRevenue, last30Qty, prev30Qty,
			avgDailySales, daysRemaining, sellThrough, cogs, grossProfit,
			lastPurchDate: lastPurch?.purchaseDate || null,
			lastSaleDate:  lastSale?.saleDate      || null,
			avgUnitPrice,
		};
	});

	// ── Aggregates ────────────────────────────────────────────────────────────
	const totalStock      = sizeStats.reduce((s, r) => s + r.quantity,      0);
	const totalStockValue = sizeStats.reduce((s, r) => s + r.stockValue,     0);
	const totalPurch      = sizeStats.reduce((s, r) => s + r.totalPurch,     0);
	const totalSold       = sizeStats.reduce((s, r) => s + r.totalSold,      0);
	const totalRevenue    = sizeStats.reduce((s, r) => s + r.totalRevenue,   0);
	const totalLast30     = sizeStats.reduce((s, r) => s + r.last30Qty,      0);
	const totalPrev30     = sizeStats.reduce((s, r) => s + r.prev30Qty,      0);
	const totalCOGS = sizeStats.reduce((s, r) => s + r.cogs, 0); // cost of goods SOLD only
	// Overall sell-through uses same formula: sold ÷ (in-stock + sold)
	const totalThrough = totalStock + totalSold;
	const overallSell  = totalThrough > 0 ? (totalSold / totalThrough) * 100 : 0;
	const grossProfit  = totalRevenue - totalCOGS;

	const criticalCount = sizeStats.filter((s) => s.quantity < 20).length;
	const lowCount      = sizeStats.filter((s) => s.quantity >= 20 && s.quantity < 50).length;
	const healthStatus  = criticalCount > 0 ? 'critical' : lowCount > 0 ? 'warning' : 'healthy';

	const fastestMoving = [...sizeStats].sort((a, b) => b.avgDailySales - a.avgDailySales)[0];
	const maxQty        = Math.max(...sizeStats.map((s) => s.quantity), 1);
	const maxRevenue    = Math.max(...sizeStats.map((s) => s.totalRevenue), 1);
	const maxLast30     = Math.max(...sizeStats.map((s) => s.last30Qty), 1);

	const HEALTH = {
		critical: { label: 'Critical Alert',    color: 'var(--danger)',  bg: 'var(--danger-bg)',  icon: '🔴' },
		warning:  { label: 'Low Stock Warning',  color: 'var(--warning)', bg: 'var(--warning-bg)', icon: '🟡' },
		healthy:  { label: 'All Stock Healthy',  color: 'var(--success)', bg: 'var(--success-bg)', icon: '🟢' },
	}[healthStatus];

	// ── Table col style helpers ───────────────────────────────────────────────
	const TH = {
		fontSize: '0.71rem', textTransform: 'uppercase',
		letterSpacing: '.04em', color: 'var(--text-muted)',
		background: 'var(--warm-white)', padding: '7px 10px',
		borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
	};
	const TD = { padding: '9px 10px', fontSize: '0.84rem', borderBottom: '1px solid var(--border-light)' };

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
			<PrintHeader title="Inventory & Stock Report" />

			{/* ── Page header ── */}
			<div className="section-header">
				<div>
					<span className="section-title">📦 Inventory & Stock</span>
					<div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
						As of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
					</div>
				</div>
				<button className="btn btn-secondary no-print" onClick={() => window.print()} style={{ whiteSpace: 'nowrap' }}>
					🖨 Print Report
				</button>
			</div>

			{/* ── Health alert banner ── */}
			{healthStatus !== 'healthy' && (
				<div style={{
					background: HEALTH.bg,
					border: `1px solid ${HEALTH.color}`,
					borderLeft: `5px solid ${HEALTH.color}`,
					borderRadius: 'var(--radius)',
					padding: '12px 18px',
					display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.875rem',
				}}>
					<span style={{ fontSize: '1.2rem' }}>{HEALTH.icon}</span>
					<div>
						<strong style={{ color: HEALTH.color }}>{HEALTH.label}:</strong>{' '}
						<span style={{ color: 'var(--text-secondary)' }}>
							{criticalCount > 0 && `${criticalCount} size${criticalCount > 1 ? 's' : ''} critically low (below 20 crates). `}
							{lowCount      > 0 && `${lowCount} size${lowCount > 1 ? 's' : ''} approaching low stock (below 50 crates).`}
						</span>
					</div>
				</div>
			)}

			{/* ── Row 1 · KPI cards ── */}
			<div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))' }}>
				<div className="stat-card amber">
					<div className="label">Total Stock</div>
					<div className="value">{totalStock.toLocaleString()}</div>
					<div className="sub">crates · {sizeStats.length} sizes</div>
				</div>
				<div className="stat-card brown">
					<div className="label">Est. Stock Value</div>
					<div className="value" style={{ fontSize: '1.1rem' }}>{fmt(totalStockValue)}</div>
					<div className="sub">at avg purchase cost</div>
				</div>
				<div className="stat-card green">
					<div className="label">Total Revenue</div>
					<div className="value" style={{ fontSize: '1.1rem' }}>{fmt(totalRevenue)}</div>
					<div className="sub">from all egg sales</div>
				</div>
				<div className={`stat-card ${grossProfit >= 0 ? 'green' : 'red'}`}>
					<div className="label">Gross Profit</div>
					<div className="value" style={{ fontSize: '1.1rem', color: grossProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
						{fmt(grossProfit)}
					</div>
					<div className="sub">revenue − purchase cost</div>
				</div>
				<div className="stat-card green">
					<div className="label">Sell-Through Rate</div>
					<div className="value">{overallSell.toFixed(1)}%</div>
					<div className="sub">{totalSold.toLocaleString()} of {totalPurch.toLocaleString()} crates</div>
				</div>
				<div className={`stat-card ${healthStatus === 'healthy' ? 'green' : healthStatus === 'warning' ? 'amber' : 'red'}`}>
					<div className="label">Stock Health</div>
					<div className="value" style={{ fontSize: '0.95rem' }}>{HEALTH.icon} {HEALTH.label.split(' ')[0]}</div>
					<div className="sub">{(criticalCount + lowCount) === 0 ? 'All sizes well stocked' : `${criticalCount + lowCount} size${(criticalCount + lowCount) > 1 ? 's' : ''} need attention`}</div>
				</div>
				{fastestMoving && (
					<div className="stat-card amber">
						<div className="label">Fastest Moving</div>
						<div className="value" style={{ fontSize: '0.95rem', textTransform: 'capitalize' }}>{fastestMoving.eggSize}</div>
						<div className="sub">{fastestMoving.avgDailySales.toFixed(1)} crates/day (30d avg)</div>
					</div>
				)}
				<div className="stat-card brown">
					<div className="label">Last 30 Days Sold</div>
					<div className="value">{totalLast30.toLocaleString()}</div>
					<div className="sub" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
						<span>vs prior 30d</span>
						<Trend cur={totalLast30} prev={totalPrev30} />
					</div>
				</div>
			</div>

			{/* ── Row 2 · Per-size detail cards ── */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 16 }}>
				{sizeStats.map((item) => {
					const cfg  = SIZE_CFG[item.eggSize] || SIZE_CFG.medium;
					const pct  = totalStock > 0 ? (item.quantity / totalStock) * 100 : 0;
					const barW = (item.quantity / maxQty) * 100;

					return (
						<div key={item.eggSize} className="card" style={{ borderTop: `4px solid ${cfg.color}` }}>
							{/* Card header */}
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
									<div style={{
										width: 46, height: 46, borderRadius: 10,
										background: cfg.light, border: `2px solid ${cfg.color}`,
										display: 'flex', alignItems: 'center', justifyContent: 'center',
										fontSize: '1.5rem', flexShrink: 0,
									}}>🥚</div>
									<div>
										<div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem' }}>
											{cfg.label}
										</div>
										<StockBadge qty={item.quantity} />
									</div>
								</div>
								<div style={{ textAlign: 'right' }}>
									<div style={{ fontSize: '2.2rem', fontWeight: 800, color: cfg.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
										{item.quantity.toLocaleString()}
									</div>
									<div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
										crates · {pct.toFixed(1)}% of stock
									</div>
								</div>
							</div>

							{/* Stock level bar */}
							<div style={{ marginBottom: 16 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 5 }}>
									<span>Stock level</span>
									<span>{pct.toFixed(1)}% of total inventory</span>
								</div>
								<Bar pct={barW} color={cfg.color} height={10} />
							</div>

							{/* Stat grid */}
							<div style={{
								display: 'grid', gridTemplateColumns: '1fr 1fr',
								gap: '10px 14px', background: 'var(--warm-white)',
								borderRadius: 8, padding: 12, marginBottom: 12,
								fontSize: '0.82rem',
							}}>
								{[
									{ label: 'Total Purchased',   value: `${item.totalPurch.toLocaleString()} crates` },
									{ label: 'Total Sold',        value: `${item.totalSold.toLocaleString()} crates` },
									{ label: 'Sell-Through',      value: `${item.sellThrough.toFixed(1)}%` },
									{ label: 'Avg Sale Price',    value: item.avgUnitPrice > 0 ? `${fmt(item.avgUnitPrice)}/cr` : '—' },
									{ label: 'Avg Cost/Tray',     value: item.avgCostPerTray > 0 ? fmt(item.avgCostPerTray) : '—' },
									{ label: 'Est. Stock Value',  value: item.stockValue > 0 ? fmt(item.stockValue) : '—' },
									{ label: 'Revenue Generated', value: fmt(item.totalRevenue), span: true },
								].map(({ label, value, span }) => (
									<div key={label} style={span ? { gridColumn: '1 / -1' } : {}}>
										<div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>
											{label}
										</div>
										<div style={{ fontWeight: 600 }}>{value}</div>
									</div>
								))}
							</div>

							{/* Last 30 days movement */}
							<div style={{ marginBottom: 12 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 5 }}>
									<span>Last 30 days sold</span>
									<div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
										<span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.last30Qty} crates</span>
										<Trend cur={item.last30Qty} prev={item.prev30Qty} />
									</div>
								</div>
								<Bar pct={(item.last30Qty / maxLast30) * 100} color="var(--success)" height={6} />
							</div>

							{/* Days remaining pill */}
							<div style={{
								borderRadius: 8, padding: '10px 14px',
								background: item.daysRemaining === null ? 'var(--warm-white)'
									: item.daysRemaining < 7  ? 'var(--danger-bg)'
									: item.daysRemaining < 30 ? 'var(--warning-bg)'
									: 'var(--success-bg)',
								display: 'flex', justifyContent: 'space-between', alignItems: 'center',
								fontSize: '0.84rem',
							}}>
								<div>
									<div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
										Est. Days of Stock Remaining
									</div>
									<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
										Based on {item.avgDailySales > 0 ? `${item.avgDailySales.toFixed(1)} crates/day` : 'no recent sales'}
									</div>
								</div>
								<div style={{ textAlign: 'right' }}>
									<div style={{
										fontSize: '1.5rem', fontWeight: 800, lineHeight: 1,
										color: item.daysRemaining === null ? 'var(--text-muted)'
											: item.daysRemaining < 7  ? 'var(--danger)'
											: item.daysRemaining < 30 ? 'var(--warning)'
											: 'var(--success)',
									}}>
										{item.daysRemaining !== null ? item.daysRemaining : '∞'}
									</div>
									{item.daysRemaining !== null && (
										<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>days</div>
									)}
								</div>
							</div>

							{/* Dates row */}
							<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.71rem', color: 'var(--text-muted)' }}>
								<span>Last purchase: {item.lastPurchDate ? fmtDate(item.lastPurchDate) : '—'}</span>
								<span>Last sale: {item.lastSaleDate ? fmtDate(item.lastSaleDate) : '—'}</span>
							</div>
						</div>
					);
				})}
			</div>

			{/* ── Row 3 · Comparison table ── */}
			<div className="card">
				<SectionHead icon="📊" title="Full Stock Comparison" />
				<div className="table-wrap">
					<table>
						<thead>
							<tr>
								{[
									['Egg Size', 'left'],
									['In Stock', 'right'],
									['% Share', 'right'],
									['Purchased', 'right'],
									['Sold', 'right'],
									['Sell-Through', 'right'],
									['Last 30d Sold', 'right'],
									['Avg /Day', 'right'],
									['Days Left', 'right'],
									['Est. Value', 'right'],
									['Revenue', 'right'],
									['Status', 'left'],
								].map(([h, align]) => (
									<th key={h} style={{ ...TH, textAlign: align }}>{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{sizeStats.map((item) => (
								<tr key={item.eggSize}>
									<td style={TD}><EggBadge size={item.eggSize} /></td>
									<td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{item.quantity.toLocaleString()}</td>
									<td style={{ ...TD, textAlign: 'right' }}>
										{totalStock > 0 ? ((item.quantity / totalStock) * 100).toFixed(1) : 0}%
									</td>
									<td style={{ ...TD, textAlign: 'right' }}>{item.totalPurch.toLocaleString()}</td>
									<td style={{ ...TD, textAlign: 'right' }}>{item.totalSold.toLocaleString()}</td>
									<td style={{ ...TD, textAlign: 'right' }}>{item.sellThrough.toFixed(1)}%</td>
									<td style={{ ...TD, textAlign: 'right' }}>
										{item.last30Qty}
										<span style={{ marginLeft: 4 }}><Trend cur={item.last30Qty} prev={item.prev30Qty} /></span>
									</td>
									<td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}>
										{item.avgDailySales > 0 ? item.avgDailySales.toFixed(1) : '—'}
									</td>
									<td style={{ ...TD, textAlign: 'right' }}>
										<DaysBadge days={item.daysRemaining} />
									</td>
									<td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
										{item.stockValue > 0 ? fmt(item.stockValue) : '—'}
									</td>
									<td style={{ ...TD, textAlign: 'right', color: 'var(--success)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
										{fmt(item.totalRevenue)}
									</td>
									<td style={TD}><StockBadge qty={item.quantity} /></td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr style={{ fontWeight: 700, background: 'var(--warm-white)' }}>
								<td style={{ ...TD, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--text-secondary)' }}>
									Totals
								</td>
								<td style={{ ...TD, textAlign: 'right' }}>{totalStock.toLocaleString()}</td>
								<td style={{ ...TD, textAlign: 'right' }}>100%</td>
								<td style={{ ...TD, textAlign: 'right' }}>{totalPurch.toLocaleString()}</td>
								<td style={{ ...TD, textAlign: 'right' }}>{totalSold.toLocaleString()}</td>
								<td style={{ ...TD, textAlign: 'right' }}>{overallSell.toFixed(1)}%</td>
								<td style={{ ...TD, textAlign: 'right' }}>{totalLast30.toLocaleString()}</td>
								<td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}>
									{totalStock > 0 && (totalLast30 / 30) > 0 ? (totalLast30 / 30).toFixed(1) : '—'}
								</td>
								<td style={TD} />
								<td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalStockValue)}</td>
								<td style={{ ...TD, textAlign: 'right', color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalRevenue)}</td>
								<td style={TD} />
							</tr>
						</tfoot>
					</table>
				</div>
			</div>

			{/* ── Row 4 · Distribution charts ── */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

				{/* Stock distribution */}
				<div className="card">
					<SectionHead icon="📦" title="Stock Distribution" />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
						{sizeStats.map((item) => {
							const cfg = SIZE_CFG[item.eggSize] || SIZE_CFG.medium;
							const pct = totalStock > 0 ? (item.quantity / totalStock) * 100 : 0;
							return (
								<div key={item.eggSize}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
											<EggBadge size={item.eggSize} />
											<span style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>
												{item.quantity.toLocaleString()} crates
											</span>
										</div>
										<span style={{ fontWeight: 700, color: cfg.color }}>{pct.toFixed(1)}%</span>
									</div>
									<Bar pct={pct} color={cfg.color} height={10} />
								</div>
							);
						})}
						<div style={{ paddingTop: 10, borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700 }}>
							<span>Total</span>
							<span>{totalStock.toLocaleString()} crates</span>
						</div>
					</div>
				</div>

				{/* Revenue by size */}
				<div className="card">
					<SectionHead icon="💰" title="Revenue by Egg Size" />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
						{[...sizeStats].sort((a, b) => b.totalRevenue - a.totalRevenue).map((item) => {
							const pct = maxRevenue > 0 ? (item.totalRevenue / maxRevenue) * 100 : 0;
							return (
								<div key={item.eggSize}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
											<EggBadge size={item.eggSize} />
											<span style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>
												{item.totalSold.toLocaleString()} crates sold
											</span>
										</div>
										<span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.87rem' }}>
											{fmt(item.totalRevenue)}
										</span>
									</div>
									<Bar pct={pct} color="var(--success)" height={10} />
								</div>
							);
						})}
						<div style={{ paddingTop: 10, borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700 }}>
							<span>Total Revenue</span>
							<span style={{ color: 'var(--success)' }}>{fmt(totalRevenue)}</span>
						</div>
					</div>
				</div>

				{/* 30-day movement */}
				<div className="card">
					<SectionHead icon="📈" title="30-Day Sales Velocity" />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
						{sizeStats.map((item) => {
							const cfg  = SIZE_CFG[item.eggSize] || SIZE_CFG.medium;
							const pct  = (item.last30Qty / maxLast30) * 100;
							return (
								<div key={item.eggSize}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
											<EggBadge size={item.eggSize} />
											<Trend cur={item.last30Qty} prev={item.prev30Qty} />
										</div>
										<div style={{ textAlign: 'right' }}>
											<span style={{ fontWeight: 700, fontSize: '0.87rem' }}>{item.last30Qty}</span>
											<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 4 }}>crates</span>
										</div>
									</div>
									<Bar pct={pct} color={cfg.color} height={10} />
									<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
										avg {item.avgDailySales.toFixed(2)} crates/day · prev 30d: {item.prev30Qty} crates
									</div>
								</div>
							);
						})}
						<div style={{ paddingTop: 10, borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700 }}>
							<span>Total sold (last 30d)</span>
							<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<span>{totalLast30.toLocaleString()} crates</span>
								<Trend cur={totalLast30} prev={totalPrev30} />
							</div>
						</div>
					</div>
				</div>

			</div>

			{/* ── Notes ── */}
			<div className="card no-print">
				<p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
					💡 <strong>Report notes:</strong>
					{' '}Stock levels update automatically on every purchase or sale.
					{' '}<strong>Est. Stock Value</strong> uses the weighted average purchase cost across all orders for that size.
					{' '}<strong>Days Remaining</strong> divides current stock by average daily sales from the past 30 days — shows ∞ when there are no recent sales.
					{' '}<strong>Sell-Through</strong> = total crates sold ÷ total crates purchased.
					{' '}Low stock threshold: 50 crates · Critical threshold: 20 crates.
				</p>
			</div>
		</div>
	);
}
