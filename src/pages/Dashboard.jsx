import { useState } from 'react';
import {
	BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid,
	Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
	dashboardApi,
	salesApi,
	purchasesApi,
	customersApi,
	paymentsApi,
	debtorsApi,
	expensesApi,
} from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMsg, fmt, fmtDate, EggBadge } from '../components/ui';

// ── Date helpers ──────────────────────────────────────────────────────────────
const NOW     = new Date();
const T_START = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
const L_START = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1);
const L_END   = new Date(NOW.getFullYear(), NOW.getMonth(), 0, 23, 59, 59);

const inRange = (d, from, to) => {
	const dt = new Date(d);
	return dt >= from && dt <= to;
};

const purchTotal = (p) =>
	Number(p.totalCost || 0) || Number(p.quantity || 0) * Number(p.costPerTray || 0);

// ── Micro components ──────────────────────────────────────────────────────────
const TONE_BG = {
	amber:   'rgba(var(--amber-rgb), .12)',
	success: 'var(--success-bg)',
	danger:  'var(--danger-bg)',
	warning: 'var(--warning-bg)',
	info:    'var(--info-bg)',
	brown:   'var(--warm-white)',
};

function Trend({ cur, prev, invert = false }) {
	if (!prev || prev === 0) return null;
	const pct = ((cur - prev) / Math.abs(prev)) * 100;
	if (Math.abs(pct) < 0.5)
		return <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→ same</span>;
	const up   = pct > 0;
	const good = invert ? !up : up;
	return (
		<span style={{ fontSize: '0.7rem', fontWeight: 600, color: good ? 'var(--success)' : 'var(--danger)' }}>
			{up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% vs last month
		</span>
	);
}

function Bar({ pct, color = 'var(--amber)', height = 7 }) {
	return (
		<div style={{ height, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden', flex: 1 }}>
			<div style={{ height: '100%', width: `${Math.max(Number(pct) || 0, 2)}%`, background: color, borderRadius: 4 }} />
		</div>
	);
}

function CardHead({ icon, title, tone = 'amber' }) {
	return (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			gap: 10,
			marginBottom: 14,
			paddingBottom: 10,
			borderBottom: '1px solid var(--border-light)',
		}}>
			<div style={{
				width: 32, height: 32, borderRadius: 9,
				background: TONE_BG[tone] || TONE_BG.amber,
				display: 'flex', alignItems: 'center', justifyContent: 'center',
				fontSize: '0.95rem', flexShrink: 0,
			}}>
				{icon}
			</div>
			<div style={{
				fontWeight: 600,
				letterSpacing: '-0.01em',
				fontSize: '0.95rem',
				color: 'var(--text-primary)',
			}}>
				{title}
			</div>
		</div>
	);
}

function StatIcon({ icon, tone = 'amber' }) {
	return (
		<div style={{
			width: 28, height: 28, borderRadius: 8,
			background: TONE_BG[tone] || TONE_BG.amber,
			display: 'flex', alignItems: 'center', justifyContent: 'center',
			fontSize: '0.85rem', flexShrink: 0,
		}}>
			{icon}
		</div>
	);
}

function Divider() {
	return <div style={{ height: 1, background: 'var(--border-light)', margin: '8px 0' }} />;
}

const EGG_COLORS = { small: 'var(--brown-light)', medium: 'var(--amber)', large: 'var(--success)' };
const methodLabel = (m) =>
	(m || 'cash').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const METHOD_COLORS = {
	cash:          'var(--success)',
	mobile_money:  'var(--info)',
	momo:          'var(--info)',
	bank_transfer: 'var(--amber)',
	cheque:        'var(--brown-light)',
	credit:        'var(--brown-light)',
};
const methodColor = (m) => METHOD_COLORS[(m || 'cash').toLowerCase()] || 'var(--text-muted)';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
	const { data: kpi, loading, error } = useFetch(() => dashboardApi.get());
	const { data: salesRaw }     = useFetch(() => salesApi.getAll());
	const { data: purchasesRaw } = useFetch(() => purchasesApi.getAll());
	const { data: customersRaw } = useFetch(() => customersApi.getAll());
	const { data: paymentsRaw }  = useFetch(() => paymentsApi.getAll());
	const { data: debtorsRaw }   = useFetch(() => debtorsApi.get());
	const { data: expensesRaw }  = useFetch(() => expensesApi.getAll());

	const [alertExpanded, setAlertExpanded] = useState(true);

	if (loading) return <Loading />;
	if (error)   return <ErrorMsg message={error} />;
	if (!kpi)    return null;

	const {
		inventory     = [],
		totalRevenue  = 0,
		totalSales: salesCount = 0,
		totalPaid     = 0,
		outstandingDebt = 0,
		totalExpenses = 0,
	} = kpi;

	const salesArr    = salesRaw    || [];
	const purchArr    = purchasesRaw || [];
	const custArr     = customersRaw || [];
	const paymentsArr = paymentsRaw  || [];
	const debtorsArr  = debtorsRaw   || [];
	const expensesArr = expensesRaw  || [];

	const totalStock = inventory.reduce((s, i) => s + i.quantity, 0);

	// ── Month slices ──────────────────────────────────────────────────────────
	const tSales  = salesArr.filter((s) => inRange(s.saleDate,     T_START, NOW));
	const lSales  = salesArr.filter((s) => inRange(s.saleDate,     L_START, L_END));
	const tRevenue = tSales.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
	const lRevenue = lSales.reduce((s, r) => s + Number(r.totalAmount || 0), 0);

	const tPay   = paymentsArr.filter((p) => inRange(p.paymentDate,  T_START, NOW));
	const lPay   = paymentsArr.filter((p) => inRange(p.paymentDate,  L_START, L_END));
	const tPaid  = tPay.reduce((s, r) => s + Number(r.amount || 0), 0);
	const lPaid  = lPay.reduce((s, r) => s + Number(r.amount || 0), 0);

	const tPurch     = purchArr.filter((p) => inRange(p.purchaseDate, T_START, NOW));
	const lPurch     = purchArr.filter((p) => inRange(p.purchaseDate, L_START, L_END));
	const tPurchCost = tPurch.reduce((s, r) => s + purchTotal(r), 0);
	const lPurchCost = lPurch.reduce((s, r) => s + purchTotal(r), 0);

	const tExp    = expensesArr.filter((e) => inRange(e.expenseDate, T_START, NOW));
	const lExp    = expensesArr.filter((e) => inRange(e.expenseDate, L_START, L_END));
	const tExpAmt = tExp.reduce((s, r) => s + Number(r.amount || 0), 0);
	const lExpAmt = lExp.reduce((s, r) => s + Number(r.amount || 0), 0);

	// ── Derived KPIs ──────────────────────────────────────────────────────────
	const totalPurchCost    = purchArr.reduce((s, r) => s + purchTotal(r), 0);
	const grossProfit       = totalRevenue - totalPurchCost;
	const netProfit         = grossProfit - totalExpenses;
	const profitMargin      = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
	const collectionRate    = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;
	const avgSaleValue      = salesCount > 0 ? totalRevenue / salesCount : 0;
	const tAvgSale          = tSales.length > 0 ? tRevenue / tSales.length : 0;
	const lAvgSale          = lSales.length > 0 ? lRevenue / lSales.length : 0;
	const totalCratesSold   = salesArr.reduce((s, r) => s + Number(r.quantity || 0), 0);
	const totalCratesBought = purchArr.reduce((s, r) => s + Number(r.quantity || 0), 0);
	const uniqueFarms       = new Set(purchArr.map((p) => p.farmName).filter(Boolean)).size;
	const tGrossProfit      = tRevenue - tPurchCost;
	const lGrossProfit      = lRevenue - lPurchCost;

	// ── Top customers ─────────────────────────────────────────────────────────
	const custMap = {};
	salesArr.forEach((s) => {
		const id = s.customerId;
		if (!custMap[id]) custMap[id] = { id, name: s.customerName, revenue: 0, count: 0, paid: 0 };
		custMap[id].revenue += Number(s.totalAmount || 0);
		custMap[id].count++;
	});
	paymentsArr.forEach((p) => {
		if (custMap[p.customerId]) custMap[p.customerId].paid += Number(p.amount || 0);
	});
	const topCustomers   = Object.values(custMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
	const maxCustRevenue = topCustomers[0]?.revenue || 1;

	// ── Customer chart data (top 8, for Recharts) ─────────────────────────────
	const customerChartData = Object.values(custMap)
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 8)
		.map((c) => ({
			name:     c.name.length > 13 ? c.name.slice(0, 12) + '…' : c.name,
			fullName: c.name,
			Sales:    Math.round(c.revenue * 100) / 100,
			Payments: Math.round(c.paid    * 100) / 100,
			Balance:  Math.max(Math.round((c.revenue - c.paid) * 100) / 100, 0),
		}));

	// ── Sales by egg size ─────────────────────────────────────────────────────
	const salesBySize = {};
	salesArr.forEach((s) => {
		const sz = s.eggSize || 'unknown';
		if (!salesBySize[sz]) salesBySize[sz] = { revenue: 0, quantity: 0, count: 0 };
		salesBySize[sz].revenue  += Number(s.totalAmount || 0);
		salesBySize[sz].quantity += Number(s.quantity    || 0);
		salesBySize[sz].count++;
	});
	const maxSizeRevenue = Math.max(...Object.values(salesBySize).map((v) => v.revenue), 1);

	// ── Purchases by egg size ─────────────────────────────────────────────────
	const purchBySize = {};
	purchArr.forEach((p) => {
		const sz = p.eggSize || 'unknown';
		if (!purchBySize[sz]) purchBySize[sz] = { cost: 0, quantity: 0 };
		purchBySize[sz].cost     += purchTotal(p);
		purchBySize[sz].quantity += Number(p.quantity || 0);
	});
	const maxPurchCost = Math.max(...Object.values(purchBySize).map((v) => v.cost), 1);

	// ── Expenses by category ──────────────────────────────────────────────────
	const expByCat = {};
	expensesArr.forEach((e) => {
		const cat = e.category || 'Other';
		expByCat[cat] = (expByCat[cat] || 0) + Number(e.amount || 0);
	});
	const sortedExpCats = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);
	const maxExpCat     = Math.max(...Object.values(expByCat), 1);

	// ── Payment methods ───────────────────────────────────────────────────────
	const payByMethod = {};
	paymentsArr.forEach((p) => {
		const m = p.method || 'cash';
		payByMethod[m] = (payByMethod[m] || 0) + Number(p.amount || 0);
	});
	const sortedMethods  = Object.entries(payByMethod).sort((a, b) => b[1] - a[1]);
	const totalMethodSum = Object.values(payByMethod).reduce((s, v) => s + v, 0) || 1;
	const maxMethod      = Math.max(...Object.values(payByMethod), 1);

	// ── Debtors ───────────────────────────────────────────────────────────────
	const overdueDebtors   = debtorsArr.filter((d) => d.overdue);
	const topDebtors       = [...debtorsArr].sort((a, b) => b.balance - a.balance).slice(0, 5);
	const sevenDayDebtors  = debtorsArr
		.filter((d) => Number(d.daysDue) > 7 && Number(d.balance) > 0)
		.sort((a, b) => b.balance - a.balance);
	const sevenDayTotal    = sevenDayDebtors.reduce((s, d) => s + Number(d.balance), 0);

	// ── Recent activity ───────────────────────────────────────────────────────
	const recentSales     = [...salesArr]   .sort((a, b) => new Date(b.saleDate)     - new Date(a.saleDate))    .slice(0, 5);
	const recentPayments  = [...paymentsArr].sort((a, b) => new Date(b.paymentDate)  - new Date(a.paymentDate)) .slice(0, 5);
	const recentPurchases = [...purchArr]   .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)).slice(0, 5);

	// ── Inventory ─────────────────────────────────────────────────────────────
	const maxInvQty  = Math.max(...inventory.map((i) => i.quantity), 1);
	const hasLowStock = inventory.some((i) => i.quantity < 50);

	// ── Shared table cell style ───────────────────────────────────────────────
	const th = {
		textAlign: 'left', padding: '6px 8px',
		color: 'var(--text-muted)', fontSize: '0.71rem',
		textTransform: 'uppercase', letterSpacing: '.04em',
		borderBottom: '1px solid var(--border-light)',
		background: 'var(--warm-white)',
	};
	const td = { padding: '8px 8px', fontSize: '0.84rem', borderBottom: '1px solid var(--border-light)' };

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

			{/* ── 7-day overdue alert ──────────────────────────────────────── */}
			{sevenDayDebtors.length > 0 && (
				<div style={{
					border: '1px solid var(--warning)',
					borderLeft: '5px solid var(--warning)',
					background: 'var(--warning-bg)',
					borderRadius: 'var(--radius)',
					padding: '14px 18px',
				}}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
							<span style={{ fontSize: '1.2rem' }}>⏰</span>
							<div>
								<div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--warning)' }}>
									{sevenDayDebtors.length} customer{sevenDayDebtors.length !== 1 ? 's' : ''} with balances outstanding for more than 7 days
								</div>
								<div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
									Total outstanding: <strong>{fmt(sevenDayTotal)}</strong>
								</div>
							</div>
						</div>
						<button
							onClick={() => setAlertExpanded((v) => !v)}
							style={{
								background: 'none', border: '1px solid var(--warning)',
								borderRadius: 6, padding: '4px 12px',
								fontSize: '0.8rem', color: 'var(--warning)',
								cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
							}}
						>
							{alertExpanded ? 'Hide ▲' : 'Show ▼'}
						</button>
					</div>

					{alertExpanded && (
						<div style={{ marginTop: 14, overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
								<thead>
									<tr>
										{['Customer', 'Phone', 'Days Outstanding', 'Balance', 'Status'].map((h, i) => (
											<th key={h} style={{
												textAlign: i >= 2 ? 'right' : 'left',
												padding: '6px 10px',
												fontSize: '0.71rem', textTransform: 'uppercase',
												letterSpacing: '.04em', color: 'var(--text-muted)',
												borderBottom: '1px solid var(--warning)',
												whiteSpace: 'nowrap',
											}}>{h}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{sevenDayDebtors.map((d) => (
										<tr key={d.customerId}>
											<td style={{ padding: '8px 10px', fontWeight: 600 }}>{d.customerName}</td>
											<td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{d.phone || '—'}</td>
											<td style={{ padding: '8px 10px', textAlign: 'right' }}>
												<span style={{
													fontWeight: 700,
													color: d.daysDue > 30 ? 'var(--danger)' : d.daysDue > 14 ? 'var(--warning)' : 'var(--text-primary)',
												}}>
													{d.daysDue} days
												</span>
											</td>
											<td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
												{fmt(d.balance)}
											</td>
											<td style={{ padding: '8px 10px', textAlign: 'right' }}>
												{d.overdue
													? <span className="badge badge-red">Overdue</span>
													: <span className="badge badge-amber">Pending</span>
												}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{/* ── Row 1 · 8 KPI Cards ───────────────────────────────────────── */}
			<div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))' }}>

				<div className="stat-card green">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div className="label" style={{ marginBottom: 0 }}>Total Revenue</div>
						<StatIcon icon="💰" tone="success" />
					</div>
					<div className="value" style={{ fontSize: '1.15rem' }}>{fmt(totalRevenue)}</div>
					<div className="sub">{salesCount} sales · avg {fmt(avgSaleValue)}</div>
					<div style={{ marginTop: 6 }}><Trend cur={tRevenue} prev={lRevenue} /></div>
				</div>

				<div className="stat-card green">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div className="label" style={{ marginBottom: 0 }}>Payments Received</div>
						<StatIcon icon="💵" tone="success" />
					</div>
					<div className="value" style={{ fontSize: '1.15rem' }}>{fmt(totalPaid)}</div>
					<div className="sub">{collectionRate.toFixed(1)}% collection rate</div>
					<div style={{ marginTop: 6 }}><Trend cur={tPaid} prev={lPaid} /></div>
				</div>

				<div className="stat-card red">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div className="label" style={{ marginBottom: 0 }}>Outstanding Debt</div>
						<StatIcon icon="🧾" tone="danger" />
					</div>
					<div className="value" style={{ fontSize: '1.15rem' }}>{fmt(outstandingDebt)}</div>
					<div className="sub">
						{overdueDebtors.length} overdue · {debtorsArr.length} debtors
					</div>
				</div>

				<div className={`stat-card ${netProfit >= 0 ? 'green' : 'red'}`}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div className="label" style={{ marginBottom: 0 }}>Net Profit</div>
						<StatIcon icon={netProfit >= 0 ? '📈' : '📉'} tone={netProfit >= 0 ? 'success' : 'danger'} />
					</div>
					<div className="value" style={{ fontSize: '1.15rem', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
						{fmt(netProfit)}
					</div>
					<div className="sub">{profitMargin.toFixed(1)}% margin</div>
				</div>

				<div className="stat-card amber">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div className="label" style={{ marginBottom: 0 }}>Current Stock</div>
						<StatIcon icon="📦" tone="amber" />
					</div>
					<div className="value">{totalStock.toLocaleString()}</div>
					<div className="sub">crates · {inventory.length} sizes</div>
					{hasLowStock && (
						<div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>
							⚠ Low stock alert
						</div>
					)}
				</div>

				<div className="stat-card amber">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div className="label" style={{ marginBottom: 0 }}>Customers</div>
						<StatIcon icon="👥" tone="amber" />
					</div>
					<div className="value">{custArr.length || Object.keys(custMap).length}</div>
					<div className="sub">active accounts</div>
				</div>

				<div className="stat-card brown">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div className="label" style={{ marginBottom: 0 }}>Purchase Cost</div>
						<StatIcon icon="🚚" tone="brown" />
					</div>
					<div className="value" style={{ fontSize: '1.15rem' }}>{fmt(totalPurchCost)}</div>
					<div className="sub">{purchArr.length} orders · {uniqueFarms} farm{uniqueFarms !== 1 ? 's' : ''}</div>
					<div style={{ marginTop: 6 }}><Trend cur={tPurchCost} prev={lPurchCost} invert /></div>
				</div>

				<div className="stat-card brown">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div className="label" style={{ marginBottom: 0 }}>Total Expenses</div>
						<StatIcon icon="💸" tone="brown" />
					</div>
					<div className="value" style={{ fontSize: '1.15rem' }}>{fmt(totalExpenses)}</div>
					<div className="sub">{expensesArr.length} records · {sortedExpCats.length} categories</div>
					<div style={{ marginTop: 6 }}><Trend cur={tExpAmt} prev={lExpAmt} invert /></div>
				</div>

			</div>

			{/* ── Row 2 · P&L Summary + Collection Rate ────────────────────── */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

				<div className="card">
					<CardHead icon="📊" title="Profitability Overview" tone="success" />
					{[
						{ label: 'Gross Revenue',    value: totalRevenue,   color: 'var(--success)',  bold: false },
						{ label: 'Cost of Purchases (COGS)', value: -totalPurchCost, color: 'var(--danger)', bold: false },
						{ label: 'Gross Profit',     value: grossProfit,    color: grossProfit >= 0 ? 'var(--success)' : 'var(--danger)', bold: true, divBefore: true },
						{ label: 'Operating Expenses', value: -totalExpenses, color: 'var(--danger)', bold: false },
						{ label: 'Net Profit',       value: netProfit,      color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)', bold: true, divBefore: true },
					].map(({ label, value, color, bold, divBefore }) => (
						<div key={label}>
							{divBefore && <Divider />}
							<div style={{
								display: 'flex', justifyContent: 'space-between', alignItems: 'center',
								padding: bold ? '8px 10px' : '6px 0',
								margin: bold ? '2px 0' : 0,
								borderRadius: bold ? 8 : 0,
								background: bold ? (value >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)') : 'transparent',
								fontWeight: bold ? 700 : 400, fontSize: bold ? '0.9rem' : '0.85rem',
							}}>
								<span style={{ color: bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
								<span style={{ color, fontVariantNumeric: 'tabular-nums' }}>
									{value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
								</span>
							</div>
						</div>
					))}
					<Divider />
					<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
						<span>Gross margin</span>
						<span style={{ fontWeight: 600 }}>
							{totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%
						</span>
					</div>
					<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
						<span>Net margin</span>
						<span style={{ fontWeight: 600 }}>{profitMargin.toFixed(1)}%</span>
					</div>
					<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
						<span>Crates sold / bought</span>
						<span style={{ fontWeight: 600 }}>{totalCratesSold.toLocaleString()} / {totalCratesBought.toLocaleString()}</span>
					</div>
				</div>

				<div className="card">
					<CardHead icon="💳" title="Payment Methods" tone="info" />
					{sortedMethods.length === 0 ? (
						<p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No payments recorded.</p>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
							{sortedMethods.map(([method, amount]) => (
								<div key={method}>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.84rem' }}>
										<span style={{ fontWeight: 500 }}>{methodLabel(method)}</span>
										<div>
											<span style={{ fontWeight: 600, color: methodColor(method) }}>{fmt(amount)}</span>
											<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>
												{((amount / totalMethodSum) * 100).toFixed(0)}%
											</span>
										</div>
									</div>
									<Bar pct={(amount / maxMethod) * 100} color={methodColor(method)} />
								</div>
							))}
							<Divider />
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700 }}>
								<span>Total collected</span>
								<span style={{ color: 'var(--success)' }}>{fmt(totalPaid)}</span>
							</div>
						</div>
					)}

					{/* Collection rate bar */}
					<div style={{
						marginTop: 16, padding: 14, borderRadius: 8,
						background: collectionRate >= 80 ? 'var(--success-bg)' : collectionRate >= 50 ? 'var(--warning-bg)' : 'var(--danger-bg)',
					}}>
						<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.84rem' }}>
							<span style={{ fontWeight: 600 }}>Collection Rate</span>
							<span style={{ fontWeight: 700, color: collectionRate >= 80 ? 'var(--success)' : collectionRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
								{collectionRate.toFixed(1)}%
							</span>
						</div>
						<Bar
							pct={collectionRate}
							color={collectionRate >= 80 ? 'var(--success)' : collectionRate >= 50 ? 'var(--warning)' : 'var(--danger)'}
							height={10}
						/>
						<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
							<span>{fmt(totalPaid)} collected</span>
							<span>{fmt(outstandingDebt)} outstanding</span>
						</div>
					</div>
				</div>

			</div>

			{/* ── Row 3 · Monthly Snapshot ─────────────────────────────────── */}
			<div className="card">
				<CardHead icon="📅" title="This Month vs Last Month" tone="amber" />
				<div style={{ overflowX: 'auto' }}>
					<table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse', minWidth: 480 }}>
						<thead>
							<tr>
								{['Metric', 'This Month', 'Last Month', 'Change'].map((h, i) => (
									<th key={h} style={{ ...th, textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{[
								{ label: '# Sales',           cur: tSales.length,    prev: lSales.length,    curF: tSales.length,    prevF: lSales.length },
								{ label: 'Revenue',           cur: tRevenue,          prev: lRevenue,          curF: fmt(tRevenue),    prevF: fmt(lRevenue) },
								{ label: 'Avg Sale Value',    cur: tAvgSale,          prev: lAvgSale,          curF: fmt(tAvgSale),    prevF: fmt(lAvgSale) },
								{ label: 'Payments Received', cur: tPaid,             prev: lPaid,             curF: fmt(tPaid),       prevF: fmt(lPaid) },
								{ label: 'Purchase Cost',     cur: tPurchCost,        prev: lPurchCost,        curF: fmt(tPurchCost),  prevF: fmt(lPurchCost),  invert: true },
								{ label: 'Gross Profit',      cur: tGrossProfit,      prev: lGrossProfit,      curF: fmt(tGrossProfit), prevF: fmt(lGrossProfit) },
								{ label: 'Expenses',          cur: tExpAmt,           prev: lExpAmt,           curF: fmt(tExpAmt),     prevF: fmt(lExpAmt),     invert: true },
							].map(({ label, cur, prev, curF, prevF, invert }) => (
								<tr key={label}>
									<td style={{ ...td, fontWeight: 500 }}>{label}</td>
									<td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{curF}</td>
									<td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{prevF}</td>
									<td style={{ ...td, textAlign: 'right' }}>
										<Trend cur={cur} prev={prev} invert={invert} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* ── Row 4 · Inventory + Sales by Size ───────────────────────── */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

				<div className="card">
					<CardHead icon="📦" title="Current Inventory" tone="amber" />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
						{inventory.length === 0 ? (
							<p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No inventory data.</p>
						) : inventory.map((item) => (
							<div key={item.eggSize}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
									<EggBadge size={item.eggSize} />
									<div>
										<span style={{ fontWeight: 700, fontSize: '1rem' }}>{item.quantity.toLocaleString()}</span>
										<span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 4 }}>crates</span>
										<span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 6 }}>
											({totalStock > 0 ? ((item.quantity / totalStock) * 100).toFixed(0) : 0}%)
										</span>
									</div>
								</div>
								<Bar pct={(item.quantity / maxInvQty) * 100} color={EGG_COLORS[item.eggSize] || 'var(--amber)'} height={8} />
								{item.quantity < 50 && (
									<div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: 3, fontWeight: 600 }}>⚠ Low stock</div>
								)}
							</div>
						))}
						<Divider />
						{[
							{ label: 'Total in stock',    val: `${totalStock.toLocaleString()} crates` },
							{ label: 'Total purchased',   val: `${totalCratesBought.toLocaleString()} crates` },
							{ label: 'Total sold',        val: `${totalCratesSold.toLocaleString()} crates` },
							{ label: 'Sell-through rate', val: `${totalCratesBought > 0 ? ((totalCratesSold / totalCratesBought) * 100).toFixed(1) : 0}%` },
						].map(({ label, val }) => (
							<div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
								<span style={{ color: 'var(--text-muted)' }}>{label}</span>
								<span style={{ fontWeight: 600 }}>{val}</span>
							</div>
						))}
					</div>
				</div>

				<div className="card">
					<CardHead icon="🛒" title="Sales by Egg Size" tone="success" />
					{Object.keys(salesBySize).length === 0 ? (
						<p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No sales data.</p>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
							{Object.entries(salesBySize)
								.sort((a, b) => b[1].revenue - a[1].revenue)
								.map(([size, data]) => (
									<div key={size}>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<EggBadge size={size} />
												<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
													{data.count} sales · {data.quantity.toLocaleString()} crates
												</span>
											</div>
											<span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.87rem' }}>{fmt(data.revenue)}</span>
										</div>
										<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
											<Bar pct={(data.revenue / maxSizeRevenue) * 100} color={EGG_COLORS[size] || 'var(--amber)'} height={8} />
											<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: 28 }}>
												{((data.revenue / (totalRevenue || 1)) * 100).toFixed(0)}%
											</span>
										</div>
									</div>
								))}
							<Divider />
							{[
								{ label: 'Total crates sold', val: totalCratesSold.toLocaleString() },
								{ label: 'Average sale value', val: fmt(avgSaleValue) },
								{ label: 'Total transactions', val: salesCount },
							].map(({ label, val }) => (
								<div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
									<span style={{ color: 'var(--text-muted)' }}>{label}</span>
									<span style={{ fontWeight: 600 }}>{val}</span>
								</div>
							))}
						</div>
					)}
				</div>

			</div>

			{/* ── Row 5 · Top Customers + Debtors ─────────────────────────── */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

				<div className="card">
					<CardHead icon="🏆" title="Top Customers by Revenue" tone="warning" />
					{topCustomers.length === 0 ? (
						<p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No customer data.</p>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
							{topCustomers.map((c, i) => {
								const MEDAL_BG = ['#FFD700', '#C0C0C0', '#CD7F32'];
								return (
									<div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
										<div style={{
											width: 26, height: 26, borderRadius: '50%',
											background: MEDAL_BG[i] || 'var(--warm-white)',
											display: 'flex', alignItems: 'center', justifyContent: 'center',
											fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
											color: i < 3 ? '#fff' : 'var(--text-muted)',
										}}>
											{i + 1}
										</div>
										<div style={{ flex: 1, minWidth: 0 }}>
											<div style={{ fontWeight: 600, fontSize: '0.87rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
												{c.name}
											</div>
											<div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
												<Bar pct={(c.revenue / maxCustRevenue) * 100} color="var(--amber)" height={5} />
											</div>
										</div>
										<div style={{ textAlign: 'right', flexShrink: 0 }}>
											<div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.87rem' }}>{fmt(c.revenue)}</div>
											<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
												{c.count} sale{c.count !== 1 ? 's' : ''}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="card">
					<CardHead icon="⚠️" title="Outstanding Balances" tone="danger" />
					{topDebtors.length === 0 ? (
						<div className="empty" style={{ padding: '20px 0' }}>
							<div className="emoji">🎉</div>
							<p style={{ fontSize: '0.85rem' }}>All accounts settled!</p>
						</div>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{topDebtors.map((d) => (
								<div key={d.customerId} style={{
									display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
									padding: '9px 11px',
									background: d.overdue ? 'var(--danger-bg)' : 'var(--warm-white)',
									borderRadius: 8,
								}}>
									<div>
										<div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{d.customerName}</div>
										<div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
											{d.daysDue} days · last sale {fmtDate(d.lastSaleDate)}
										</div>
									</div>
									<div style={{ textAlign: 'right' }}>
										<div style={{ fontWeight: 700, color: d.overdue ? 'var(--danger)' : 'var(--warning)', fontSize: '0.87rem' }}>
											{fmt(d.balance)}
										</div>
										{d.overdue
											? <span className="badge badge-red"   style={{ fontSize: '0.6rem' }}>OVERDUE</span>
											: <span className="badge badge-amber" style={{ fontSize: '0.6rem' }}>Pending</span>
										}
									</div>
								</div>
							))}
							<Divider />
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700 }}>
								<span style={{ color: 'var(--text-muted)' }}>Total Outstanding</span>
								<span style={{ color: 'var(--danger)' }}>{fmt(outstandingDebt)}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
								<span style={{ color: 'var(--text-muted)' }}>Overdue accounts</span>
								<span style={{ fontWeight: 600, color: 'var(--danger)' }}>{overdueDebtors.length}</span>
							</div>
						</div>
					)}
				</div>

			</div>

			{/* ── Row 6 · Customer Sales vs Payments chart ────────────────── */}
			{customerChartData.length > 0 && (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

					{/* Grouped bar: Sales vs Payments vs Balance per customer */}
					<div className="card" style={{ gridColumn: '1 / -1' }}>
						<CardHead icon="👥" title="Customer Sales vs Payments vs Outstanding Balance" tone="info" />
						<ResponsiveContainer width="100%" height={300}>
							<BarChart
								data={customerChartData}
								margin={{ top: 4, right: 16, left: 8, bottom: 48 }}
								barCategoryGap="28%"
								barGap={3}
							>
								<CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
								<XAxis
									dataKey="name"
									tick={{ fontSize: 11, fill: '#71717a' }}
									angle={-30}
									textAnchor="end"
									interval={0}
								/>
								<YAxis
									tick={{ fontSize: 11, fill: '#71717a' }}
									tickFormatter={(v) => v >= 1000 ? `₵${(v / 1000).toFixed(0)}k` : `₵${v}`}
									width={50}
								/>
								<Tooltip
									contentStyle={{ fontSize: '0.82rem', borderRadius: 8, border: '1px solid #e4e4e7' }}
									formatter={(value, name) => [
										`GH₵ ${Number(value).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`,
										name,
									]}
									labelFormatter={(label, payload) =>
										payload?.[0]?.payload?.fullName || label
									}
								/>
								<Legend wrapperStyle={{ fontSize: '0.82rem', paddingTop: 12 }} />
								<RBar dataKey="Sales"    name="Sales Revenue"       fill="#d97706" radius={[3, 3, 0, 0]} />
								<RBar dataKey="Payments" name="Payments Received"   fill="#16a34a" radius={[3, 3, 0, 0]} />
								<RBar dataKey="Balance"  name="Outstanding Balance" fill="#dc2626" radius={[3, 3, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>

				</div>
			)}

			{/* ── Row 7 · Expenses + Purchases ─────────────────────────────── */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

				<div className="card">
					<CardHead icon="💸" title="Expenses by Category" tone="brown" />
					{sortedExpCats.length === 0 ? (
						<p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No expenses recorded.</p>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
							{sortedExpCats.map(([cat, amount]) => (
								<div key={cat}>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.84rem' }}>
										<span style={{ fontWeight: 500 }}>{cat}</span>
										<div>
											<span style={{ fontWeight: 600 }}>{fmt(amount)}</span>
											<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>
												{((amount / (totalExpenses || 1)) * 100).toFixed(0)}%
											</span>
										</div>
									</div>
									<Bar pct={(amount / maxExpCat) * 100} color="var(--brown-light)" />
								</div>
							))}
							<Divider />
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700 }}>
								<span>Total</span>
								<span>{fmt(totalExpenses)}</span>
							</div>
						</div>
					)}
				</div>

				<div className="card">
					<CardHead icon="🚚" title="Purchases by Egg Size" tone="brown" />
					{Object.keys(purchBySize).length === 0 ? (
						<p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No purchase data.</p>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
							{Object.entries(purchBySize)
								.sort((a, b) => b[1].cost - a[1].cost)
								.map(([size, data]) => (
									<div key={size}>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<EggBadge size={size} />
												<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
													{data.quantity.toLocaleString()} crates
												</span>
											</div>
											<span style={{ fontWeight: 700, fontSize: '0.87rem' }}>{fmt(data.cost)}</span>
										</div>
										<Bar pct={(data.cost / maxPurchCost) * 100} color={EGG_COLORS[size] || 'var(--amber)'} />
									</div>
								))}
							<Divider />
							{[
								{ label: 'Total purchase cost', val: fmt(totalPurchCost) },
								{ label: 'Total crates purchased', val: totalCratesBought.toLocaleString() },
								{ label: 'Farms / suppliers', val: uniqueFarms },
								{ label: 'Total orders', val: purchArr.length },
							].map(({ label, val }) => (
								<div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
									<span style={{ color: 'var(--text-muted)' }}>{label}</span>
									<span style={{ fontWeight: 600 }}>{val}</span>
								</div>
							))}
						</div>
					)}
				</div>

			</div>

			{/* ── Row 7 · Recent Activity ──────────────────────────────────── */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>

				{[
					{
						icon: '🛒', title: 'Recent Sales', items: recentSales, tone: 'success',
						row: (s) => ({
							top: s.customerName,
							sub: `${fmtDate(s.saleDate)} · ${s.quantity} ${s.eggSize} crates`,
							right: fmt(s.totalAmount),
							color: 'var(--success)',
						}),
					},
					{
						icon: '💳', title: 'Recent Payments', items: recentPayments, tone: 'info',
						row: (p) => ({
							top: p.customerName,
							sub: `${fmtDate(p.paymentDate)} · ${methodLabel(p.method)}`,
							right: fmt(p.amount),
							color: 'var(--success)',
						}),
					},
					{
						icon: '🚚', title: 'Recent Purchases', items: recentPurchases, tone: 'brown',
						row: (p) => ({
							top: p.farmName || 'Farm Purchase',
							sub: `${fmtDate(p.purchaseDate)} · ${p.quantity} ${p.eggSize} crates`,
							right: fmt(purchTotal(p)),
							color: 'var(--text-primary)',
						}),
					},
				].map(({ icon, title, items, row, tone }) => (
					<div key={title} className="card">
						<CardHead icon={icon} title={title} tone={tone} />
						{items.length === 0 ? (
							<p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent records.</p>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column' }}>
								{items.map((item, i) => {
									const r = row(item);
									return (
										<div key={item.id} style={{
											display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
											padding: '8px 0',
											borderBottom: i < items.length - 1 ? '1px solid var(--border-light)' : 'none',
										}}>
											<div style={{ minWidth: 0, flex: 1 }}>
												<div style={{ fontWeight: 600, fontSize: '0.87rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
													{r.top}
												</div>
												<div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{r.sub}</div>
											</div>
											<span style={{ fontWeight: 700, color: r.color, fontSize: '0.87rem', whiteSpace: 'nowrap', marginLeft: 10 }}>
												{r.right}
											</span>
										</div>
									);
								})}
							</div>
						)}
					</div>
				))}

			</div>

		</div>
	);
}
