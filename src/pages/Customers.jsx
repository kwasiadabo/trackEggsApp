import { useState } from 'react';
import { customersApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMsg, Empty, toast, fmtDate, PrintHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDelete from '../components/ConfirmDelete';

const EMPTY_FORM = { name: '', phone: '', address: '', email: '' };

export default function Customers() {
	const { isManager, isAdmin } = useAuth();
	const { data, loading, error, reload } = useFetch(() =>
		customersApi.getAll(),
	);

	const [showForm, setShowForm] = useState(false);
	const [editItem, setEditItem] = useState(null);
	const [deleteItem, setDeleteItem] = useState(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [search, setSearch] = useState('');

	const openCreate = () => {
		setForm(EMPTY_FORM);
		setEditItem(null);
		setShowForm(true);
	};
	const openEdit = (rec) => {
		setForm({
			name: rec.name,
			phone: rec.phone || '',
			address: rec.address || '',
			email: rec.email || '',
		});
		setEditItem(rec);
		setShowForm(true);
	};
	const closeForm = () => {
		setShowForm(false);
		setEditItem(null);
	};

	const handleChange = (e) =>
		setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSaving(true);
		try {
			if (editItem) {
				await customersApi.update(editItem.id, form);
				toast('Customer updated ✓');
			} else {
				await customersApi.create(form);
				toast('Customer added ✓');
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
			await customersApi.remove(deleteItem.id);
			toast('Customer deleted ✓');
			setDeleteItem(null);
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setDeleting(false);
		}
	};
	const filteredData = data?.filter((c) => {
		const q = search.toLowerCase();

		return (
			c.name?.toLowerCase().includes(q) ||
			c.phone?.toLowerCase().includes(q) ||
			c.address?.toLowerCase().includes(q) ||
			c.email?.toLowerCase().includes(q)
		);
	});

	return (
		<div>
			<PrintHeader title="All Customers" />
			<div className="section-header">
				<span className="section-title">👥 All Customers</span>
				<div className="no-print" style={{ display: 'flex', gap: 8 }}>
					<button className="btn btn-secondary" onClick={() => window.print()} style={{ whiteSpace: 'nowrap' }}>🖨 Print</button>
					{isManager && (
						<button className="btn btn-primary" onClick={openCreate}>+ Add Customer</button>
					)}
				</div>
			</div>

			<div className="card">
				{loading ? (
					<Loading />
				) : error ? (
					<ErrorMsg message={error} />
				) : !data?.length ? (
					<Empty message="No customers yet." />
				) : (
					<div className="table-wrap">
						<div
							className="no-print"
							style={{
								display: 'flex',
								gap: 10,
								marginBottom: 12,
								alignItems: 'center',
								flexWrap: 'wrap',
							}}
						>
							<input
								type="text"
								placeholder="Search customers..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid #ccc',
									borderRadius: 6,
									minWidth: 250,
								}}
							/>

							<button
								className="btn btn-secondary"
								onClick={() => setSearch('')}
								disabled={!search}
							>
								Reset
							</button>
						</div>
						<table>
							<thead>
								<tr>
									<th>#</th>
									<th>Name</th>
									<th>Phone</th>
									<th>Location</th>
									<th>Email</th>
									<th>Joined</th>
									{isManager && <th style={{ width: 90 }}>Actions</th>}
								</tr>
							</thead>
							<tbody>
								{filteredData.map((c, i) => (
									<tr key={c.id}>
										<td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
										<td style={{ fontWeight: 600 }}>{c.name}</td>
										<td>{c.phone || '—'}</td>
										<td>{c.address || '—'}</td>
										<td>{c.email || '—'}</td>
										<td>{fmtDate(c.createdAt)}</td>
										{isManager && (
											<td>
												<div style={{ display: 'flex', gap: 6 }}>
													<button
														className="btn btn-secondary"
														style={{ padding: '4px 10px', fontSize: '0.78rem' }}
														onClick={() => openEdit(c)}
													>
														Edit
													</button>
													{isAdmin && (
														<button
															className="btn btn-danger"
															style={{
																padding: '4px 10px',
																fontSize: '0.78rem',
															}}
															onClick={() => setDeleteItem(c)}
														>
															Del
														</button>
													)}
												</div>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{showForm && (
				<Modal
					title={editItem ? '✏ Edit Customer' : '👤 Add Customer'}
					onClose={closeForm}
				>
					<form onSubmit={handleSubmit}>
						<div className="form-grid">
							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label>Full Name *</label>
								<input
									name="name"
									value={form.name}
									onChange={handleChange}
									required
								/>
							</div>
							<div className="form-group">
								<label>Phone</label>
								<input
									name="phone"
									value={form.phone}
									onChange={handleChange}
								/>
							</div>
							<div className="form-group">
								<label>Email</label>
								<input
									name="email"
									type="email"
									value={form.email}
									onChange={handleChange}
								/>
							</div>
							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label>Location</label>
								<input
									name="address"
									value={form.address}
									onChange={handleChange}
								/>
							</div>
						</div>
						<div
							style={{
								display: 'flex',
								gap: 10,
								marginTop: 20,
								justifyContent: 'flex-end',
							}}
						>
							<button
								className="btn btn-secondary"
								type="button"
								onClick={closeForm}
							>
								Cancel
							</button>
							<button
								className="btn btn-primary"
								type="submit"
								disabled={saving}
							>
								{saving ? 'Saving…' : editItem ? 'Update' : 'Add'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{deleteItem && (
				<ConfirmDelete
					message={`Delete customer "${deleteItem.name}"? This will fail if they have active sales records.`}
					onConfirm={handleDelete}
					onCancel={() => setDeleteItem(null)}
					loading={deleting}
				/>
			)}
		</div>
	);
}
