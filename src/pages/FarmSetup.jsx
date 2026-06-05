import { useState } from 'react';
import { farmsApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import {
	Loading, ErrorMsg, Empty, toast, fmtDate, PrintHeader,
} from '../components/ui';
import Modal from '../components/Modal';
import ConfirmDelete from '../components/ConfirmDelete';

const EMPTY_FORM = { name: '', location: '', contact: '', isActive: true };

export default function FarmSetup() {
	const { data, loading, error, reload } = useFetch(() => farmsApi.getAll());

	const [showForm, setShowForm]     = useState(false);
	const [editItem, setEditItem]     = useState(null);
	const [deleteItem, setDeleteItem] = useState(null);
	const [form, setForm]             = useState(EMPTY_FORM);
	const [saving, setSaving]         = useState(false);
	const [deleting, setDeleting]     = useState(false);
	const [search, setSearch]         = useState('');

	const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setShowForm(true); };
	const openEdit   = (r) => {
		setForm({ name: r.name, location: r.location || '', contact: r.contact || '', isActive: !!r.isActive });
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
				await farmsApi.update(editItem.id, form);
				toast('Farm updated ✓');
			} else {
				await farmsApi.create(form);
				toast('Farm added ✓');
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
			await farmsApi.remove(deleteItem.id);
			toast('Farm removed ✓');
			setDeleteItem(null);
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setDeleting(false);
		}
	};

	const filtered = (data || []).filter((f) => {
		const q = search.toLowerCase();
		return (
			!search ||
			f.name?.toLowerCase().includes(q) ||
			f.location?.toLowerCase().includes(q) ||
			f.contact?.toLowerCase().includes(q)
		);
	});

	const activeCount = (data || []).filter((f) => f.isActive).length;

	return (
		<div>
			<PrintHeader title="Farm Setup" />

			<div className="section-header">
				<span className="section-title">🏡 Farm Setup</span>
				<div className="no-print" style={{ display: 'flex', gap: 8 }}>
					<button className="btn btn-secondary" onClick={() => window.print()} style={{ whiteSpace: 'nowrap' }}>🖨 Print</button>
					<button className="btn btn-primary" onClick={openCreate}>+ Add Farm</button>
				</div>
			</div>

			{/* Stats */}
			{!loading && !error && data && (
				<div className="stats-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
					<div className="stat-card amber">
						<div className="label">Total Farms</div>
						<div className="value">{data.length}</div>
						<div className="sub">registered suppliers</div>
					</div>
					<div className="stat-card green">
						<div className="label">Active</div>
						<div className="value">{activeCount}</div>
						<div className="sub">available for purchases</div>
					</div>
					<div className="stat-card brown">
						<div className="label">Inactive</div>
						<div className="value">{data.length - activeCount}</div>
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
					<Empty message="No farms yet. Add one to populate the purchase form dropdown." />
				) : (
					<div className="table-wrap">
						<div className="no-print" style={{ marginBottom: 14 }}>
							<input
								type="text"
								placeholder="🔍 Search farms…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								style={{
									padding: '7px 11px', borderRadius: 7,
									border: '1px solid var(--border)', fontSize: '0.85rem',
									width: '100%', maxWidth: 340, background: '#fff',
								}}
							/>
						</div>

						{filtered.length === 0 ? (
							<p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '20px 0' }}>
								No farms match your search.
							</p>
						) : (
							<table>
								<thead>
									<tr>
										<th>#</th>
										<th>Farm Name</th>
										<th>Location</th>
										<th>Contact</th>
										<th>Status</th>
										<th>Added</th>
										<th className="no-print" style={{ width: 110 }}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{filtered.map((f, i) => (
										<tr key={f.id}>
											<td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{i + 1}</td>
											<td style={{ fontWeight: 600 }}>{f.name}</td>
											<td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{f.location || '—'}</td>
											<td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{f.contact  || '—'}</td>
											<td>
												{f.isActive
													? <span className="badge badge-green">✓ Active</span>
													: <span className="badge badge-brown">Inactive</span>
												}
											</td>
											<td style={{ color: 'var(--text-muted)', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
												{fmtDate(f.createdAt)}
											</td>
											<td className="no-print">
												<div style={{ display: 'flex', gap: 5 }}>
													<button
														className="btn btn-secondary"
														style={{ padding: '3px 10px', fontSize: '0.76rem' }}
														onClick={() => openEdit(f)}
													>
														✏ Edit
													</button>
													<button
														className="btn btn-danger"
														style={{ padding: '3px 10px', fontSize: '0.76rem' }}
														onClick={() => setDeleteItem(f)}
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
										<td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, paddingTop: 10, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
											Total
										</td>
										<td colSpan={3} style={{ paddingTop: 10, fontWeight: 700 }}>
											{filtered.length} farm{filtered.length !== 1 ? 's' : ''} ({filtered.filter((f) => f.isActive).length} active)
										</td>
									</tr>
								</tfoot>
							</table>
						)}
					</div>
				)}
			</div>

			{/* Add / Edit modal */}
			{showForm && (
				<Modal title={editItem ? '✏ Edit Farm' : '🏡 Add Farm'} onClose={closeForm}>
					<form onSubmit={handleSubmit}>
						<div className="form-grid">
							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label>Farm Name *</label>
								<input
									name="name"
									value={form.name}
									onChange={handleChange}
									placeholder="e.g. Golden Farms"
									required
								/>
							</div>
							<div className="form-group">
								<label>Location</label>
								<input
									name="location"
									value={form.location}
									onChange={handleChange}
									placeholder="e.g. Accra, Ghana"
								/>
							</div>
							<div className="form-group">
								<label>Contact</label>
								<input
									name="contact"
									value={form.contact}
									onChange={handleChange}
									placeholder="Phone or email"
								/>
							</div>
						</div>

						<label style={{
							display: 'flex', alignItems: 'center', gap: 10,
							marginTop: 16, cursor: 'pointer', userSelect: 'none',
							fontSize: '0.875rem', fontWeight: 500,
						}}>
							<input
								type="checkbox"
								name="isActive"
								checked={form.isActive}
								onChange={handleChange}
								style={{ width: 16, height: 16, accentColor: 'var(--success)', cursor: 'pointer' }}
							/>
							Active — this farm will appear in the purchases dropdown
						</label>

						<div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
							<button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
							<button type="submit" className="btn btn-primary" disabled={saving}>
								{saving ? 'Saving…' : editItem ? 'Update' : 'Add Farm'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{deleteItem && (
				<ConfirmDelete
					message={`Remove "${deleteItem.name}" from the farm list?`}
					onConfirm={handleDelete}
					onCancel={() => setDeleteItem(null)}
					loading={deleting}
				/>
			)}
		</div>
	);
}
