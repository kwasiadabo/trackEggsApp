import { useState, useMemo } from 'react';
import { customersApi, salesApi, paymentsApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMsg, fmt, fmtDate } from '../components/ui';

const methodLabel = (m) =>
	m?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Cash';

export default function CustomerStatement() {
	const { data: customers, loading: lC, error: eC } = useFetch(() => customersApi.getAll());
	const { data: allSales,  loading: lS, error: eS } = useFetch(() => salesApi.getAll());
	const { data: allPayments, loading: lP, error: eP } = useFetch(() => paymentsApi.getAll());

	const [customerId, setCustomerId] = useState('');
	const [fromDate, setFromDate]     = useState('');
	const [toDate, setToDate]         = useState('');

	const loading = lC || lS || lP;
	const error   = eC || eS || eP;

	const customer = customers?.find((c) => String(c.id) === String(customerId));

	const statement = useMemo(() => {
		if (!customerId || !allSales || !allPayments) return null;

		const from = fromDate ? new Date(fromDate + 'T00:00:00') : null;
		const to   = toDate   ? new Date(toDate   + 'T23:59:59') : null;

		const custSales    = allSales.filter((s) => String(s.customerId) === String(customerId));
		const custPayments = allPayments.filter((p) => String(p.customerId) === String(customerId));

		// Opening balance = everything before fromDate
		let openingBalance = 0;
		if (from) {
			const preSales    = custSales.filter((s) => new Date(s.saleDate) < from);
			const prePayments = custPayments.filter((p) => new Date(p.paymentDate) < from);
			openingBalance =
				preSales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0) -
				prePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
		}

		// In-period rows
		const inSales = custSales.filter((s) => {
			const d = new Date(s.saleDate);
			return (!from || d >= from) && (!to || d <= to);
		});
		const inPayments = custPayments.filter((p) => {
			const d = new Date(p.paymentDate);
			return (!from || d >= from) && (!to || d <= to);
		});

		const rows = [
			...inSales.map((s) => ({
				date: s.saleDate,
				ref: `S#${s.id}`,
				description: `Sale: ${s.quantity} ${s.eggSize} crates @ ${fmt(s.unitPrice)}`,
				debit: Number(s.totalAmount || 0),
				credit: 0,
				type: 'sale',
			})),
			...inPayments.map((p) => ({
				date: p.paymentDate,
				ref: `P#${p.id}`,
				description: `Payment — ${methodLabel(p.method)}${p.notes ? `: ${p.notes}` : ''}`,
				debit: 0,
				credit: Number(p.amount || 0),
				type: 'payment',
			})),
		].sort((a, b) => new Date(a.date) - new Date(b.date));

		let balance = openingBalance;
		const rowsWithBalance = rows.map((row) => {
			balance += row.debit - row.credit;
			return { ...row, balance };
		});

		const totalDebits  = rows.reduce((s, r) => s + r.debit,  0);
		const totalCredits = rows.reduce((s, r) => s + r.credit, 0);

		return {
			rows: rowsWithBalance,
			openingBalance,
			totalDebits,
			totalCredits,
			closingBalance: openingBalance + totalDebits - totalCredits,
		};
	}, [customerId, fromDate, toDate, allSales, allPayments]);

	const handlePrint = () => {
		const cleanup = () => { document.body.removeAttribute('data-print'); window.removeEventListener('afterprint', cleanup); };
		window.addEventListener('afterprint', cleanup);
		document.body.setAttribute('data-print', 'statement');
		window.print();
	};

	const periodLabel = fromDate || toDate
		? [fromDate && `From ${fmtDate(fromDate + 'T12:00:00')}`, toDate && `To ${fmtDate(toDate + 'T12:00:00')}`]
			.filter(Boolean).join('  ·  ')
		: 'All transactions';

	return (
		<div>
				<div className="section-header">
				<span className="section-title">📄 Customer Statement</span>
			</div>

			{/* ── Filter bar ── */}
			<div className="card statement-filters" style={{ marginBottom: 20 }}>
				<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
					<div className="form-group" style={{ minWidth: 220, flex: '2 1 220px' }}>
						<label>Customer *</label>
						<select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
							<option value="">Select customer…</option>
							{customers?.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
					</div>

					<div className="form-group" style={{ flex: '1 1 150px' }}>
						<label>From Date</label>
						<input
							type="date"
							value={fromDate}
							onChange={(e) => setFromDate(e.target.value)}
						/>
					</div>

					<div className="form-group" style={{ flex: '1 1 150px' }}>
						<label>To Date</label>
						<input
							type="date"
							value={toDate}
							onChange={(e) => setToDate(e.target.value)}
						/>
					</div>

					{statement && (
						<div className="print-actions" style={{ paddingBottom: 1 }}>
							<button className="btn btn-primary" onClick={handlePrint}>
								🖨 Print / Save as PDF
							</button>
						</div>
					)}
				</div>
			</div>

			{/* ── Body ── */}
			{loading ? (
				<Loading />
			) : error ? (
				<ErrorMsg message={error} />
			) : !customerId ? (
				<div className="card">
					<div className="empty">
						<div className="emoji">📄</div>
						<p>Select a customer above to generate their account statement.</p>
					</div>
				</div>
			) : (
				<div className="card statement-card">
					{/* ── Statement header ── */}
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							flexWrap: 'wrap',
							gap: 12,
							marginBottom: 20,
							paddingBottom: 16,
							borderBottom: '2px solid var(--amber)',
						}}
					>
						<div>
							<div
								style={{
									fontFamily: "'DM Serif Display', serif",
									fontSize: '1.5rem',
									color: 'var(--brown)',
									lineHeight: 1.1,
									marginBottom: 4,
								}}
							>
								Account Statement
							</div>
							<div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
								{periodLabel}
							</div>
						</div>
						<div style={{ textAlign: 'right' }}>
							<div
								style={{
									fontFamily: "'DM Serif Display', serif",
									fontSize: '1.1rem',
									color: 'var(--amber-dark)',
									fontWeight: 700,
								}}
							>
								🥚 EggTrack
							</div>
							<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
								Distribution Manager
							</div>
							<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
								Printed: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
							</div>
						</div>
					</div>

					{/* ── Customer info strip ── */}
					<div
						style={{
							background: 'var(--warm-white)',
							borderRadius: 8,
							padding: '12px 16px',
							marginBottom: 20,
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
							gap: 12,
						}}
					>
						<div>
							<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>
								Customer
							</div>
							<div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
								{customer?.name}
							</div>
						</div>
						{customer?.phone && (
							<div>
								<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>
									Phone
								</div>
								<div style={{ fontWeight: 500 }}>{customer.phone}</div>
							</div>
						)}
						{customer?.email && (
							<div>
								<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>
									Email
								</div>
								<div style={{ fontWeight: 500 }}>{customer.email}</div>
							</div>
						)}
						{customer?.address && (
							<div>
								<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>
									Address
								</div>
								<div style={{ fontWeight: 500 }}>{customer.address}</div>
							</div>
						)}
					</div>

					{/* ── Summary stats ── */}
					{statement && (
						<div
							className="stats-grid"
							style={{
								marginBottom: 20,
								gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
							}}
						>
							<div className="stat-card brown">
								<div className="label">Opening Balance</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(Math.abs(statement.openingBalance))}
								</div>
								<div className="sub">
									{statement.openingBalance > 0
										? 'owed (Dr)'
										: statement.openingBalance < 0
										? 'overpaid (Cr)'
										: 'nil'}
								</div>
							</div>
							<div className="stat-card red">
								<div className="label">Total Sales (Dr)</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(statement.totalDebits)}
								</div>
								<div className="sub">{statement.rows.filter((r) => r.type === 'sale').length} invoices</div>
							</div>
							<div className="stat-card green">
								<div className="label">Total Payments (Cr)</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(statement.totalCredits)}
								</div>
								<div className="sub">{statement.rows.filter((r) => r.type === 'payment').length} payments</div>
							</div>
							<div
								className={`stat-card ${
									statement.closingBalance > 0
										? 'red'
										: statement.closingBalance < 0
										? 'green'
										: 'brown'
								}`}
							>
								<div className="label">Closing Balance</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(Math.abs(statement.closingBalance))}
								</div>
								<div className="sub">
									{statement.closingBalance > 0
										? 'amount owed'
										: statement.closingBalance < 0
										? 'credit / overpaid'
										: '✓ fully settled'}
								</div>
							</div>
						</div>
					)}

					{/* ── Transaction table ── */}
					{!statement || statement.rows.length === 0 ? (
						<div className="empty">
							<div className="emoji">📭</div>
							<p>No transactions found for this period.</p>
						</div>
					) : (
						<div className="table-wrap">
							<table>
								<thead>
									<tr>
										<th style={{ width: 100 }}>Date</th>
										<th style={{ width: 70 }}>Ref</th>
										<th>Description</th>
										<th className="text-right" style={{ width: 120 }}>Debit (Dr)</th>
										<th className="text-right" style={{ width: 120 }}>Credit (Cr)</th>
										<th className="text-right" style={{ width: 130 }}>Balance</th>
									</tr>
								</thead>
								<tbody>
									{/* Opening balance row */}
									<tr
										style={{
											background: 'var(--warm-white)',
											fontStyle: 'italic',
											color: 'var(--text-muted)',
										}}
									>
										<td
											colSpan={5}
											style={{ fontSize: '0.82rem', paddingLeft: 12 }}
										>
											{fromDate
												? `Opening balance as at ${fmtDate(fromDate + 'T12:00:00')}`
												: 'Opening balance (all prior transactions)'}
										</td>
										<td
											className="text-right amount"
											style={{ fontWeight: 700, fontStyle: 'normal' }}
										>
											{fmt(Math.abs(statement.openingBalance))}
											{statement.openingBalance > 0 && (
												<span style={{ fontSize: '0.68rem', marginLeft: 3, fontWeight: 400 }}>Dr</span>
											)}
											{statement.openingBalance < 0 && (
												<span style={{ fontSize: '0.68rem', marginLeft: 3, fontWeight: 400 }}>Cr</span>
											)}
										</td>
									</tr>

									{statement.rows.map((row, i) => (
										<tr
											key={i}
											style={
												row.type === 'payment'
													? { background: 'var(--success-bg)' }
													: {}
											}
										>
											<td
												style={{
													whiteSpace: 'nowrap',
													color: 'var(--text-muted)',
													fontSize: '0.84rem',
												}}
											>
												{fmtDate(row.date)}
											</td>
											<td
												style={{
													fontSize: '0.78rem',
													color: 'var(--text-muted)',
													whiteSpace: 'nowrap',
												}}
											>
												{row.ref}
											</td>
											<td style={{ fontSize: '0.875rem' }}>{row.description}</td>
											<td
												className="text-right amount"
												style={{
													color: row.debit
														? 'var(--danger)'
														: 'var(--text-muted)',
													fontSize: '0.875rem',
												}}
											>
												{row.debit ? fmt(row.debit) : '—'}
											</td>
											<td
												className="text-right amount"
												style={{
													color: row.credit
														? 'var(--success)'
														: 'var(--text-muted)',
													fontSize: '0.875rem',
												}}
											>
												{row.credit ? fmt(row.credit) : '—'}
											</td>
											<td
												className="text-right amount"
												style={{
													fontWeight: 700,
													color:
														row.balance > 0
															? 'var(--danger)'
															: row.balance < 0
															? 'var(--success)'
															: 'var(--text-primary)',
												}}
											>
												{fmt(Math.abs(row.balance))}
												{row.balance > 0 && (
													<span style={{ fontSize: '0.68rem', marginLeft: 3, fontWeight: 400 }}>Dr</span>
												)}
												{row.balance < 0 && (
													<span style={{ fontSize: '0.68rem', marginLeft: 3, fontWeight: 400 }}>Cr</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr
										style={{
											background: 'var(--warm-white)',
											fontWeight: 700,
											borderTop: '2px solid var(--border)',
										}}
									>
										<td
											colSpan={3}
											style={{
												textAlign: 'right',
												fontSize: '0.8rem',
												textTransform: 'uppercase',
												letterSpacing: '.04em',
												color: 'var(--text-secondary)',
											}}
										>
											Period Totals / Closing Balance
										</td>
										<td
											className="text-right amount"
											style={{ color: 'var(--danger)' }}
										>
											{fmt(statement.totalDebits)}
										</td>
										<td
											className="text-right amount"
											style={{ color: 'var(--success)' }}
										>
											{fmt(statement.totalCredits)}
										</td>
										<td
											className="text-right amount"
											style={{
												fontSize: '1rem',
												color:
													statement.closingBalance > 0
														? 'var(--danger)'
														: statement.closingBalance < 0
														? 'var(--success)'
														: 'var(--text-primary)',
											}}
										>
											{fmt(Math.abs(statement.closingBalance))}
											{statement.closingBalance > 0 && (
												<span style={{ fontSize: '0.7rem', marginLeft: 3, fontWeight: 400 }}>Dr</span>
											)}
											{statement.closingBalance < 0 && (
												<span style={{ fontSize: '0.7rem', marginLeft: 3, fontWeight: 400 }}>Cr</span>
											)}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					)}

					{/* ── Footer note ── */}
					<div
						style={{
							marginTop: 20,
							paddingTop: 14,
							borderTop: '1px solid var(--border-light)',
							display: 'flex',
							justifyContent: 'space-between',
							flexWrap: 'wrap',
							gap: 8,
							fontSize: '0.75rem',
							color: 'var(--text-muted)',
						}}
					>
						<span>Dr = Debit (amount owed by customer) · Cr = Credit (amount paid by customer)</span>
						<span>
							Generated by EggTrack ·{' '}
							{new Date().toLocaleString('en-GB', {
								day: 'numeric',
								month: 'short',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit',
							})}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
