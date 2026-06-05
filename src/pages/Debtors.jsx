import { useState } from 'react';
import { debtorsApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMsg, Empty, fmt, fmtDate, PrintHeader } from '../components/ui';

export default function Debtors() {
	const { data, loading, error } = useFetch(() => debtorsApi.get());

	const totalDebt = data?.reduce((s, d) => s + Number(d.balance), 0) || 0;
	const overdueCount = data?.filter((d) => d.overdue).length || 0;
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');

	// const filteredData = (data || []).filter((d) =>
	// 	d?.customerName?.toLowerCase().includes((search || '').toLowerCase()),
	// );
	const filteredData = (data || []).filter((d) => {
		const matchesSearch =
			d.customerName?.toLowerCase().includes(search.toLowerCase()) ||
			d.phone?.toLowerCase().includes(search.toLowerCase());

		const matchesStatus =
			statusFilter === 'all' ||
			(statusFilter === 'overdue' && d.overdue) ||
			(statusFilter === 'pending' && !d.overdue);

		return matchesSearch && matchesStatus;
	});
	const totalBalance = filteredData.reduce(
		(sum, d) => sum + Number(d.balance || 0),
		0,
	);

	return (
		<div>
			<PrintHeader title="Outstanding Balances" />
			<div className="section-header no-print" style={{ marginBottom: 16 }}>
				<span className="section-title">⚠️ Debtors</span>
				<button className="btn btn-secondary" onClick={() => window.print()} style={{ whiteSpace: 'nowrap' }}>🖨 Print</button>
			</div>
			<div className="stats-grid" style={{ marginBottom: 24 }}>
				<div className="stat-card red">
					<div className="label">Total Outstanding</div>
					<div className="value" style={{ fontSize: '1.4rem' }}>
						{fmt(totalDebt)}
					</div>
					<div className="sub">{data?.length || 0} customers with debt</div>
				</div>
				<div className="stat-card amber">
					<div className="label">Overdue Accounts</div>
					<div className="value">{overdueCount}</div>
					<div className="sub">over 30 days unpaid</div>
				</div>
			</div>

			<div className="card">
				<div className="card-title">⚠️ Outstanding Balances</div>
				<div
					className="no-print"
					style={{
						display: 'flex',
						gap: '12px',
						marginBottom: '16px',
						flexWrap: 'wrap',
					}}
				>
					<input
						type="text"
						placeholder="Search customer or phone..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={{
							width: '250px',
							padding: '8px 12px',
							border: '1px solid #ddd',
							borderRadius: '6px',
						}}
					/>

					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						style={{
							padding: '8px 12px',
							border: '1px solid #ddd',
							borderRadius: '6px',
						}}
					>
						<option value="all">All Statuses</option>
						<option value="pending">Pending</option>
						<option value="overdue">Overdue</option>
					</select>
				</div>
				{loading ? (
					<Loading />
				) : error ? (
					<ErrorMsg message={error} />
				) : !data?.length ? (
					<div className="empty">
						<div className="emoji">🎉</div>
						<p>No outstanding debts. All accounts settled!</p>
					</div>
				) : (
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Customer</th>
									<th>Contact</th>
									<th className="text-right">Total Sales</th>
									<th className="text-right">Total Paid</th>
									<th className="text-right">Balance</th>
									<th>Last Sale</th>
									<th>Days Due</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{filteredData.map((d) => (
									<tr key={d.customerId}>
										<td style={{ fontWeight: 600 }}>{d.customerName}</td>
										<td style={{ color: 'var(--text-muted)' }}>
											{d.phone || '—'}
										</td>
										<td className="text-right amount">{fmt(d.totalSales)}</td>
										<td
											className="text-right amount"
											style={{ color: 'var(--success)' }}
										>
											{fmt(d.totalPaid)}
										</td>
										<td
											className="text-right amount"
											style={{ color: 'var(--danger)', fontWeight: 700 }}
										>
											{fmt(d.balance)}
										</td>
										<td>{fmtDate(d.lastSaleDate)}</td>
										<td className={d.overdue ? 'overdue' : ''}>
											{d.daysDue} days
										</td>
										<td>
											{d.overdue ? (
												<span className="badge badge-red">OVERDUE</span>
											) : (
												<span className="badge badge-amber">Pending</span>
											)}
										</td>
									</tr>
								))}
								<tfoot>
									<tr
										style={{
											background: '#f8f9fa',
											fontWeight: 700,
										}}
									>
										<td colSpan="4" style={{ textAlign: 'right' }}>
											Total Outstanding Balance:
										</td>

										<td
											className="text-right amount"
											style={{
												color: 'var(--danger)',
												fontSize: '1.05rem',
											}}
										>
											{fmt(totalBalance)}
										</td>

										<td colSpan="3"></td>
									</tr>
								</tfoot>
							</tbody>
							{filteredData.length === 0 && (
								<tr>
									<td
										colSpan={8}
										style={{ textAlign: 'center', padding: '1rem' }}
									>
										No customers found.
									</td>
								</tr>
							)}
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
