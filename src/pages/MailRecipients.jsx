import { useState } from 'react';
import { recipientsApi, emailScheduleApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import {
	Loading,
	ErrorMsg,
	Empty,
	toast,
	fmtDate,
	PrintHeader,
} from '../components/ui';
import Modal from '../components/Modal';
import ConfirmDelete from '../components/ConfirmDelete';

const EMPTY_FORM = { name: '', email: '', isActive: true };

export default function MailRecipients() {
	const { data, loading, error, reload } = useFetch(() => recipientsApi.getAll());
	const { data: scheduleData, reload: reloadSchedule } = useFetch(() => emailScheduleApi.get());

	const [showForm, setShowForm]     = useState(false);
	const [editItem, setEditItem]     = useState(null);
	const [deleteItem, setDeleteItem] = useState(null);
	const [form, setForm]             = useState(EMPTY_FORM);
	const [saving, setSaving]         = useState(false);
	const [deleting, setDeleting]     = useState(false);
	const [search, setSearch]         = useState('');

	// ── Schedule state ─────────────────────────────────────────────────────────
	const [schedHour,   setSchedHour]   = useState('');
	const [schedMinute, setSchedMinute] = useState('');
	const [schedSaving, setSchedSaving] = useState(false);

	// Populate form when schedule loads
	const currentHour   = scheduleData?.hour   ?? '';
	const currentMinute = scheduleData?.minute  ?? '';
	const displayHour   = schedHour   !== '' ? schedHour   : String(currentHour).padStart(2, '0');
	const displayMinute = schedMinute !== '' ? schedMinute : String(currentMinute).padStart(2, '0');

	const handleScheduleSave = async (e) => {
		e.preventDefault();
		const h = parseInt(schedHour   !== '' ? schedHour   : currentHour);
		const m = parseInt(schedMinute !== '' ? schedMinute : currentMinute);
		setSchedSaving(true);
		try {
			await emailScheduleApi.update({ hour: h, minute: m });
			toast(`Report time set to ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ✓`);
			setSchedHour('');
			setSchedMinute('');
			reloadSchedule();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setSchedSaving(false);
		}
	};

	const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setShowForm(true); };
	const openEdit   = (r) => {
		setForm({ name: r.name, email: r.email, isActive: !!r.isActive });
		setEditItem(r);
		setShowForm(true);
	};
	const closeForm = () => { setShowForm(false); setEditItem(null); };

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSaving(true);
		try {
			if (editItem) {
				await recipientsApi.update(editItem.id, form);
				toast('Recipient updated ✓');
			} else {
				await recipientsApi.create(form);
				toast('Recipient added ✓');
			}
			closeForm();
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await recipientsApi.remove(deleteItem.id);
			toast('Recipient removed ✓');
			setDeleteItem(null);
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setDeleting(false);
		}
	};

	const filtered = (data || []).filter((r) => {
		const q = search.toLowerCase();
		return (
			!search ||
			r.name?.toLowerCase().includes(q) ||
			r.email?.toLowerCase().includes(q)
		);
	});

	const activeCount   = (data || []).filter((r) => r.isActive).length;
	const inactiveCount = (data || []).length - activeCount;

	return (
		<div>
			<PrintHeader title="Mail Recipients" />

			<div className="section-header">
				<span className="section-title">📧 Mail Recipients</span>
				<div className="no-print" style={{ display: 'flex', gap: 8 }}>
					<button className="btn btn-secondary" onClick={() => window.print()} style={{ whiteSpace: 'nowrap' }}>🖨 Print</button>
					<button className="btn btn-primary" onClick={openCreate}>+ Add Recipient</button>
				</div>
			</div>

			{/* ── Email Schedule Card ── */}
			<div className="card" style={{ marginBottom: 16 }}>
				<div style={{
					fontWeight: 600,
					letterSpacing: '-0.01em',
					fontSize: '0.95rem',
					marginBottom: 14,
					paddingBottom: 10,
					borderBottom: '1px solid var(--border-light)',
					display: 'flex', alignItems: 'center', gap: 7,
				}}>
					⏰ Daily Report Schedule
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
					<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current:</span>
					<span style={{
						background: 'var(--warm-white)',
						border: '1px solid var(--border)',
						borderRadius: 8,
						padding: '4px 14px',
						fontWeight: 700,
						fontSize: '1rem',
						fontFamily: 'monospace',
						color: 'var(--amber-dark)',
					}}>
						{scheduleData
							? `${String(scheduleData.hour).padStart(2,'0')}:${String(scheduleData.minute).padStart(2,'0')}`
							: '—:——'
						}
					</span>
					<span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
						Africa/Accra (GMT+0) · sends daily to all active recipients
					</span>
				</div>

				<form onSubmit={handleScheduleSave}>
					<div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
						<div className="form-group" style={{ minWidth: 90 }}>
							<label>Hour (0–23)</label>
							<input
								type="number"
								min="0" max="23"
								placeholder={String(currentHour).padStart(2,'0')}
								value={schedHour}
								onChange={(e) => setSchedHour(e.target.value)}
								style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '1rem' }}
							/>
						</div>
						<div style={{ paddingBottom: 10, fontSize: '1.4rem', color: 'var(--text-muted)', fontWeight: 700 }}>:</div>
						<div className="form-group" style={{ minWidth: 90 }}>
							<label>Minute (0–59)</label>
							<input
								type="number"
								min="0" max="59"
								placeholder={String(currentMinute).padStart(2,'0')}
								value={schedMinute}
								onChange={(e) => setSchedMinute(e.target.value)}
								style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '1rem' }}
							/>
						</div>
						<div style={{ paddingBottom: 2 }}>
							<button
								type="submit"
								className="btn btn-primary"
								disabled={schedSaving || (schedHour === '' && schedMinute === '')}
							>
								{schedSaving ? 'Saving…' : '💾 Save Schedule'}
							</button>
						</div>
					</div>
					{(schedHour !== '' || schedMinute !== '') && (
						<div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
							New time:{' '}
							<strong style={{ fontFamily: 'monospace', color: 'var(--amber-dark)' }}>
								{displayHour}:{displayMinute}
							</strong>
							{' '}daily
						</div>
					)}
				</form>
			</div>

			{/* Stats */}
			{!loading && !error && data && (
				<div className="stats-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
					<div className="stat-card amber">
						<div className="label">Total</div>
						<div className="value">{data.length}</div>
						<div className="sub">registered recipients</div>
					</div>
					<div className="stat-card green">
						<div className="label">Active</div>
						<div className="value">{activeCount}</div>
						<div className="sub">will receive emails</div>
					</div>
					<div className="stat-card brown">
						<div className="label">Inactive</div>
						<div className="value">{inactiveCount}</div>
						<div className="sub">currently disabled</div>
					</div>
				</div>
			)}

			<div className="card">
				{loading ? (
					<Loading />
				) : error ? (
					<ErrorMsg message={error} />
				) : !data?.length ? (
					<Empty message="No mail recipients yet. Add one to get started." />
				) : (
					<div className="table-wrap">
						{/* Search */}
						<div className="no-print" style={{ marginBottom: 14 }}>
							<input
								type="text"
								placeholder="🔍 Search by name or email…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								style={{
									padding: '7px 11px',
									borderRadius: 7,
									border: '1px solid var(--border)',
									fontSize: '0.85rem',
									width: '100%',
									maxWidth: 360,
									background: '#fff',
								}}
							/>
						</div>

						{filtered.length === 0 ? (
							<p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '24px 0' }}>
								No recipients match your search.
							</p>
						) : (
							<table>
								<thead>
									<tr>
										<th>Name</th>
										<th>Email Address</th>
										<th>Status</th>
										<th>Added</th>
										<th className="no-print" style={{ width: 110 }}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{filtered.map((r) => (
										<tr key={r.id}>
											<td style={{ fontWeight: 600 }}>{r.name}</td>
											<td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
												<a href={`mailto:${r.email}`} style={{ color: 'var(--amber-dark)' }}>
													{r.email}
												</a>
											</td>
											<td>
												{r.isActive
													? <span className="badge badge-green">✓ Active</span>
													: <span className="badge badge-brown">Inactive</span>
												}
											</td>
											<td style={{ color: 'var(--text-muted)', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
												{fmtDate(r.createdAt)}
											</td>
											<td className="no-print">
												<div style={{ display: 'flex', gap: 5 }}>
													<button
														className="btn btn-secondary"
														style={{ padding: '3px 10px', fontSize: '0.76rem' }}
														onClick={() => openEdit(r)}
														title="Edit recipient"
													>
														✏ Edit
													</button>
													<button
														className="btn btn-danger"
														style={{ padding: '3px 10px', fontSize: '0.76rem' }}
														onClick={() => setDeleteItem(r)}
														title="Remove recipient"
													>
														Del
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr>
										<td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, paddingTop: 10, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
											Total
										</td>
										<td colSpan={3} style={{ paddingTop: 10, fontWeight: 700 }}>
											{filtered.length} recipient{filtered.length !== 1 ? 's' : ''}
											{' '}({filtered.filter((r) => r.isActive).length} active)
										</td>
									</tr>
								</tfoot>
							</table>
						)}
					</div>
				)}
			</div>

			{/* ── Add / Edit modal ── */}
			{showForm && (
				<Modal
					title={editItem ? '✏ Edit Recipient' : '📧 Add Mail Recipient'}
					onClose={closeForm}
				>
					<form onSubmit={handleSubmit}>
						<div className="form-grid">
							<div className="form-group">
								<label>Full Name *</label>
								<input
									name="name"
									value={form.name}
									onChange={handleChange}
									placeholder="e.g. Finance Manager"
									required
								/>
							</div>
							<div className="form-group">
								<label>Email Address *</label>
								<input
									name="email"
									type="email"
									value={form.email}
									onChange={handleChange}
									placeholder="e.g. finance@company.com"
									required
								/>
							</div>
						</div>

						{/* Active toggle */}
						<label style={{
							display: 'flex',
							alignItems: 'center',
							gap: 10,
							marginTop: 16,
							cursor: 'pointer',
							userSelect: 'none',
							fontSize: '0.875rem',
							fontWeight: 500,
						}}>
							<input
								type="checkbox"
								name="isActive"
								checked={form.isActive}
								onChange={handleChange}
								style={{ width: 16, height: 16, accentColor: 'var(--success)', cursor: 'pointer' }}
							/>
							Active — this recipient will receive debtor list emails
						</label>

						<div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
							<button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
							<button type="submit" className="btn btn-primary" disabled={saving}>
								{saving ? 'Saving…' : editItem ? 'Update' : 'Add Recipient'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* ── Delete confirmation ── */}
			{deleteItem && (
				<ConfirmDelete
					message={`Remove ${deleteItem.name} (${deleteItem.email}) from the recipient list?`}
					onConfirm={handleDelete}
					onCancel={() => setDeleteItem(null)}
					loading={deleting}
				/>
			)}
		</div>
	);
}
