import { useState } from 'react';
import { debtorsApi, recipientsApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMsg, fmt, fmtDate, PrintHeader, toast } from '../components/ui';
import Modal from '../components/Modal';

export default function Debtors() {
	const { data, loading, error } = useFetch(() => debtorsApi.get());
	const { data: recipients } = useFetch(() => recipientsApi.getAll());

	const totalDebt = data?.reduce((s, d) => s + Number(d.balance), 0) || 0;
	const overdueCount = data?.filter((d) => d.overdue).length || 0;
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');

	// ── Send report modal ──────────────────────────────────────────────────────
	const [showSendModal, setShowSendModal] = useState(false);
	const [selectedIds, setSelectedIds] = useState([]);
	const [sending, setSending] = useState(false);

	const openSendModal = () => {
		setSelectedIds((recipients || []).filter((r) => r.isActive).map((r) => r.id));
		setShowSendModal(true);
	};
	const closeSendModal = () => setShowSendModal(false);

	const toggleRecipient = (id) => {
		setSelectedIds((p) =>
			p.includes(id) ? p.filter((i) => i !== id) : [...p, id],
		);
	};

	const handleSendReport = async () => {
		setSending(true);
		try {
			const res = await debtorsApi.sendReport(selectedIds);
			toast(res.data?.message || 'Debtors list sent ✓');
			setShowSendModal(false);
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setSending(false);
		}
	};

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
				<div style={{ display: 'flex', gap: 8 }}>
					<button className="btn btn-secondary" onClick={openSendModal} style={{ whiteSpace: 'nowrap' }}>📧 Send to Recipients</button>
					<button className="btn btn-secondary" onClick={() => window.print()} style={{ whiteSpace: 'nowrap' }}>🖨 Print</button>
				</div>
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
							border: '1px solid var(--border)',
							borderRadius: '6px',
						}}
					/>

					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						style={{
							padding: '8px 12px',
							border: '1px solid var(--border)',
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
											background: 'var(--warm-white)',
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

			{/* ── Send to recipients modal ── */}
			{showSendModal && (
				<Modal title="📧 Send Debtors List" onClose={closeSendModal}>
					{!recipients?.length ? (
						<p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
							No mail recipients configured yet. Add one on the Mail
							Recipients page first.
						</p>
					) : (
						<>
							<p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
								Select who should receive the current debtors report by email.
							</p>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
								{recipients.map((r) => (
									<label
										key={r.id}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 10,
											padding: '8px 10px',
											border: '1px solid var(--border)',
											borderRadius: 6,
											cursor: 'pointer',
										}}
									>
										<input
											type="checkbox"
											checked={selectedIds.includes(r.id)}
											onChange={() => toggleRecipient(r.id)}
											style={{ width: 16, height: 16, accentColor: 'var(--success)', cursor: 'pointer' }}
										/>
										<div style={{ flex: 1 }}>
											<div style={{ fontWeight: 600 }}>{r.name}</div>
											<div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.email}</div>
										</div>
										{!r.isActive && <span className="badge badge-brown">Inactive</span>}
									</label>
								))}
							</div>
						</>
					)}

					<div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
						<button type="button" className="btn btn-secondary" onClick={closeSendModal}>Cancel</button>
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleSendReport}
							disabled={sending || !selectedIds.length}
						>
							{sending ? 'Sending…' : `Send to ${selectedIds.length} recipient${selectedIds.length !== 1 ? 's' : ''}`}
						</button>
					</div>
				</Modal>
			)}
		</div>
	);
}
