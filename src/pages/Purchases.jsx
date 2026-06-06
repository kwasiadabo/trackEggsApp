import { useState } from 'react';
import { purchasesApi, farmsApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import {
	Loading,
	ErrorMsg,
	Empty,
	toast,
	fmt,
	fmtDate,
	EggBadge,
	PrintHeader,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDelete from '../components/ConfirmDelete';

const EGG_SIZES = ['small', 'medium', 'large'];
const EMPTY_FORM = {
	farmName: '',
	eggSize: 'large',
	quantity: '',
	costPerTray: '',
	purchaseDate: '',
	notes: '',
};

export default function Purchases() {
	const { isManager, isAdmin } = useAuth();
	const { data, loading, error, reload } = useFetch(() =>
		purchasesApi.getAll(),
	);
	const { data: farms } = useFetch(() => farmsApi.getActive());

	// ── Batch-create state ────────────────────────────────────────────────────
	const EMPTY_LINE = { eggSize: 'large', quantity: '', costPerTray: '' };
	const [showBatch, setShowBatch] = useState(false);
	const [batchFarm, setBatchFarm] = useState('');
	const [batchDate, setBatchDate] = useState('');
	const [batchNotes, setBatchNotes] = useState('');
	const [batchLines, setBatchLines] = useState([{ ...EMPTY_LINE }]);
	const [batchSaving, setBatchSaving] = useState(false);

	const openBatch = () => {
		setBatchFarm('');
		setBatchDate('');
		setBatchNotes('');
		setBatchLines([{ ...EMPTY_LINE }]);
		setShowBatch(true);
	};
	const closeBatch = () => setShowBatch(false);

	const updateLine = (i, field, value) =>
		setBatchLines((prev) =>
			prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)),
		);
	const addLine = () => setBatchLines((prev) => [...prev, { ...EMPTY_LINE }]);
	const removeLine = (i) =>
		setBatchLines((prev) => prev.filter((_, idx) => idx !== i));

	const batchTotal = batchLines.reduce(
		(s, l) => s + (Number(l.quantity) || 0) * (Number(l.costPerTray) || 0),
		0,
	);

	const handleBatchSubmit = async (e) => {
		e.preventDefault();
		if (batchLines.some((l) => !l.quantity || !l.costPerTray)) {
			toast('Fill in quantity and cost for every line', 'error');
			return;
		}
		setBatchSaving(true);
		try {
			await purchasesApi.createBatch({
				farmName: batchFarm,
				purchaseDate: batchDate || new Date().toISOString().split('T')[0],
				notes: batchNotes,
				items: batchLines.map((l) => ({
					eggSize: l.eggSize,
					quantity: Number(l.quantity),
					costPerTray: Number(l.costPerTray),
				})),
			});
			toast(
				`${batchLines.length} purchase line${batchLines.length > 1 ? 's' : ''} recorded ✓`,
			);
			closeBatch();
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setBatchSaving(false);
		}
	};

	const [showForm, setShowForm] = useState(false);
	const [editItem, setEditItem] = useState(null); // record being edited
	const [deleteItem, setDeleteItem] = useState(null); // record to delete
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [search, setSearch] = useState('');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');

	const openCreate = () => {
		setForm(EMPTY_FORM);
		setEditItem(null);
		setShowForm(true);
	};
	const openEdit = (rec) => {
		setForm({
			farmName: rec.farmName,
			eggSize: rec.eggSize,
			quantity: rec.quantity,
			costPerTray: rec.costPerTray,
			purchaseDate: rec.purchaseDate?.split('T')[0] || '',
			notes: rec.notes || '',
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
				await purchasesApi.update(editItem.id, form);
				toast('Purchase updated & inventory adjusted ✓');
			} else {
				await purchasesApi.create(form);
				toast('Purchase recorded & inventory updated ✓');
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
			await purchasesApi.remove(deleteItem.id);
			toast('Purchase deleted & inventory reversed ✓');
			setDeleteItem(null);
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setDeleting(false);
		}
	};

	const handleSearchChange = (e) => {
		setSearch(e.target.value);
	};

	const totalCost =
		form.quantity && form.costPerTray
			? (Number(form.quantity) * Number(form.costPerTray)).toFixed(2)
			: null;
	const filteredData = data?.filter((p) => {
		if (!search.trim() && !fromDate && !toDate) return true;
		const q = search.toLowerCase();
		const matchesSearch =
			!search.trim() ||
			p.farmName?.toLowerCase().includes(q) ||
			p.eggSize?.toLowerCase().includes(q) ||
			p.quantity?.toString().includes(q) ||
			p.costPerTray?.toString().includes(q) ||
			fmtDate(p.purchaseDate)?.toLowerCase().includes(q);
		const purchaseDate = new Date(p.purchaseDate);
		const matchesFromDate = !fromDate || purchaseDate >= new Date(fromDate);
		const matchesToDate = !toDate || purchaseDate <= new Date(toDate);
		return matchesSearch && matchesFromDate && matchesToDate;
	});

	const handleFromDateChange = (e) => setFromDate(e.target.value);
	const handleToDateChange = (e) => setToDate(e.target.value);
	const resetFilters = () => {
		setSearch('');
		setFromDate('');
		setToDate('');
	};

	const totalCostSum =
		filteredData?.reduce((sum, p) => {
			return sum + Number(p.totalCost || 0);
		}, 0) || 0;

	return (
		<div>
			<PrintHeader title="Purchase History" />
			<div className="section-header">
				<span className="section-title">📋 Purchase History</span>
				<div className="filter-bar no-print">
					<input
						type="text"
						placeholder="🔍 Search purchases…"
						value={search}
						onChange={handleSearchChange}
					/>
					<input
						type="date"
						value={fromDate}
						onChange={handleFromDateChange}
						title="From date"
					/>
					<input
						type="date"
						value={toDate}
						onChange={handleToDateChange}
						title="To date"
					/>
					<button
						type="button"
						onClick={resetFilters}
						className="btn btn-secondary"
						style={{ whiteSpace: 'nowrap' }}
					>
						↺ Reset
					</button>
					<button
						className="btn btn-secondary"
						onClick={() => window.print()}
						style={{ whiteSpace: 'nowrap' }}
					>
						🖨 Print
					</button>
					{isManager && (
						<button className="btn btn-primary" onClick={openBatch} style={{ whiteSpace: 'nowrap' }}>
							+ New Purchase
						</button>
					)}
				</div>
			</div>

			<div className="card">
				{loading ? (
					<Loading />
				) : error ? (
					<ErrorMsg message={error} />
				) : !data?.length ? (
					<Empty message="No purchases yet." />
				) : (
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>#</th>
									<th>Date</th>
									<th>Farm</th>
									<th>Size</th>
									<th className="text-right">Qty</th>
									<th className="text-right">Cost/Crate</th>
									<th className="text-right">Total</th>
									{isManager && <th style={{ width: 90 }}>Actions</th>}
								</tr>
							</thead>
							<tbody>
								{filteredData.map((p, index) => (
									<tr key={p.id}>
										<td>{index + 1}</td>
										<td>{fmtDate(p.purchaseDate)}</td>
										<td style={{ fontWeight: 500 }}>{p.farmName}</td>
										<td>
											<EggBadge size={p.eggSize} />
										</td>
										<td className="text-right amount">
											{p.quantity.toLocaleString()}
										</td>
										<td className="text-right amount">{fmt(p.costPerTray)}</td>
										<td
											className="text-right amount"
											style={{ color: 'var(--amber-dark)' }}
										>
											{fmt(p.totalCost)}
										</td>
										{isManager && (
											<td>
												<div style={{ display: 'flex', gap: 6 }}>
													<button
														className="btn btn-secondary"
														style={{ padding: '4px 10px', fontSize: '0.78rem' }}
														onClick={() => openEdit(p)}
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
															onClick={() => setDeleteItem(p)}
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
							<tfoot>
								<tr>
									<td
										colSpan={isManager ? 6 : 5}
										style={{
											textAlign: 'right',
											fontWeight: 1000,
											paddingTop: 14,
											fontSize: '1.00rem',
										}}
									>
										Total
									</td>

									<td
										className="text-right amount"
										style={{
											fontWeight: 1000,
											color: 'var(--amber-dark)',
											paddingTop: 14,
											fontSize: '1.00rem',
										}}
									>
										{fmt(totalCostSum)}
									</td>

									{isManager && <td />}
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>

			{/* ── Batch create modal ── */}
			{showBatch && (
				<Modal title="🚚 New Purchase" onClose={closeBatch}>
					<form onSubmit={handleBatchSubmit}>
						{/* Shared fields */}
						<div className="form-grid" style={{ marginBottom: 16 }}>
							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label>Farm *</label>
								<select
									value={batchFarm}
									onChange={(e) => setBatchFarm(e.target.value)}
									required
								>
									<option value="">Select farm…</option>
									{(farms || []).map((f) => (
										<option key={f.id} value={f.name}>
											{f.name}
											{f.location ? ` — ${f.location}` : ''}
										</option>
									))}
								</select>
								{farms?.length === 0 && (
									<span
										style={{
											fontSize: '0.75rem',
											color: 'var(--danger)',
											marginTop: 4,
											display: 'block',
										}}
									>
										No active farms — add farms in Farm Setup first.
									</span>
								)}
							</div>
							<div className="form-group">
								<label>Purchase Date</label>
								<input
									type="date"
									value={batchDate}
									onChange={(e) => setBatchDate(e.target.value)}
								/>
							</div>
							<div className="form-group">
								<label>Notes</label>
								<input
									value={batchNotes}
									onChange={(e) => setBatchNotes(e.target.value)}
									placeholder="Optional"
								/>
							</div>
						</div>

						{/* Line items */}
						<div className="line-items-wrap">
						<div className="line-items-inner">
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 90px 110px 100px 36px',
								gap: 6,
								marginBottom: 6,
								fontSize: '0.72rem',
								color: 'var(--text-muted)',
								textTransform: 'uppercase',
								letterSpacing: '.04em',
								padding: '0 2px',
							}}
						>
							<span>Egg Size</span>
							<span style={{ textAlign: 'right' }}>Qty</span>
							<span style={{ textAlign: 'right' }}>Cost/Crate</span>
							<span style={{ textAlign: 'right' }}>Subtotal</span>
							<span />
						</div>

						{batchLines.map((ln, i) => {
							const sub =
								(Number(ln.quantity) || 0) * (Number(ln.costPerTray) || 0);
							return (
								<div
									key={i}
									style={{
										display: 'grid',
										gridTemplateColumns: '1fr 90px 110px 100px 36px',
										gap: 6,
										marginBottom: 6,
										alignItems: 'center',
									}}
								>
									<select
										value={ln.eggSize}
										onChange={(e) => updateLine(i, 'eggSize', e.target.value)}
										style={{
											padding: '8px 10px',
											border: '1px solid var(--border)',
											borderRadius: 7,
											fontSize: '0.875rem',
										}}
									>
										{EGG_SIZES.map((s) => (
											<option key={s} value={s}>
												{s.charAt(0).toUpperCase() + s.slice(1)}
											</option>
										))}
									</select>
									<input
										type="number"
										min="1"
										placeholder="Qty"
										value={ln.quantity}
										onChange={(e) => updateLine(i, 'quantity', e.target.value)}
										style={{
											padding: '8px 10px',
											border: '1px solid var(--border)',
											borderRadius: 7,
											fontSize: '0.875rem',
											textAlign: 'right',
										}}
										required
									/>
									<input
										type="number"
										min="0.01"
										step="0.01"
										placeholder="GH₵"
										value={ln.costPerTray}
										onChange={(e) =>
											updateLine(i, 'costPerTray', e.target.value)
										}
										style={{
											padding: '8px 10px',
											border: '1px solid var(--border)',
											borderRadius: 7,
											fontSize: '0.875rem',
											textAlign: 'right',
										}}
										required
									/>
									<div
										style={{
											textAlign: 'right',
											fontWeight: 600,
											fontSize: '0.85rem',
											color: sub ? 'var(--amber-dark)' : 'var(--text-muted)',
										}}
									>
										{sub
											? `GH₵ ${sub.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
											: '—'}
									</div>
									<button
										type="button"
										onClick={() => removeLine(i)}
										disabled={batchLines.length === 1}
										style={{
											background: 'none',
											border: '1px solid var(--border)',
											borderRadius: 6,
											cursor: 'pointer',
											color: 'var(--danger)',
											fontWeight: 700,
											fontSize: '1rem',
											lineHeight: 1,
											width: 32,
											height: 32,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											opacity: batchLines.length === 1 ? 0.3 : 1,
										}}
									>
										×
									</button>
								</div>
							);
						})}
						</div>{/* .line-items-inner */}
						</div>{/* .line-items-wrap */}

						<button
							type="button"
							onClick={addLine}
							className="btn btn-secondary"
							style={{
								marginTop: 4,
								marginBottom: 16,
								fontSize: '0.82rem',
								padding: '5px 12px',
							}}
						>
							+ Add
						</button>

						{/* Grand total */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-end',
								alignItems: 'center',
								gap: 12,
								padding: '10px 14px',
								background: 'var(--warning-bg)',
								borderRadius: 8,
								marginBottom: 20,
							}}
						>
							<span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
								Grand Total ({batchLines.length} line
								{batchLines.length !== 1 ? 's' : ''})
							</span>
							<span
								style={{
									fontWeight: 800,
									fontSize: '1.15rem',
									color: 'var(--amber-dark)',
								}}
							>
								GH₵{' '}
								{batchTotal.toLocaleString('en-GH', {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>

						<div
							style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
						>
							<button
								type="button"
								className="btn btn-secondary"
								onClick={closeBatch}
							>
								Cancel
							</button>
							<button
								type="submit"
								className="btn btn-primary"
								disabled={batchSaving || !batchFarm}
							>
								{batchSaving ? 'Saving…' : '🚚 Record Purchase'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* Create / Edit modal */}
			{showForm && (
				<Modal
					title={editItem ? '✏ Edit Purchase' : '🚚 New Purchase'}
					onClose={closeForm}
				>
					<form onSubmit={handleSubmit}>
						<div className="form-grid">
							<div className="form-group">
								<label>Farm *</label>
								<select
									name="farmName"
									value={form.farmName}
									onChange={handleChange}
									required
								>
									<option value="">Select farm…</option>
									{(farms || []).map((f) => (
										<option key={f.id} value={f.name}>
											{f.name}
											{f.location ? ` — ${f.location}` : ''}
										</option>
									))}
								</select>
								{farms?.length === 0 && (
									<span
										style={{
											fontSize: '0.75rem',
											color: 'var(--danger)',
											marginTop: 4,
											display: 'block',
										}}
									>
										No active farms — add farms in Farm Setup first.
									</span>
								)}
							</div>
							<div className="form-group">
								<label>Egg Size *</label>
								<select
									name="eggSize"
									value={form.eggSize}
									onChange={handleChange}
									required
								>
									{EGG_SIZES.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</div>
							<div className="form-group">
								<label>Quantity (Crates) *</label>
								<input
									name="quantity"
									type="number"
									min="1"
									value={form.quantity}
									onChange={handleChange}
									required
								/>
							</div>
							<div className="form-group">
								<label>Cost per Crate (GH₵) *</label>
								<input
									name="costPerTray"
									type="number"
									min="0.01"
									step="0.01"
									value={form.costPerTray}
									onChange={handleChange}
									required
								/>
							</div>
							<div className="form-group">
								<label>Purchase Date</label>
								<input
									name="purchaseDate"
									type="date"
									value={form.purchaseDate}
									onChange={handleChange}
								/>
							</div>
							<div className="form-group">
								<label>Notes</label>
								<input
									name="notes"
									value={form.notes}
									onChange={handleChange}
								/>
							</div>
						</div>
						{totalCost && (
							<p
								style={{
									marginTop: 12,
									color: 'var(--amber-dark)',
									fontWeight: 600,
								}}
							>
								Total: GH₵{' '}
								{Number(totalCost).toLocaleString('en-GH', {
									minimumFractionDigits: 2,
								})}
							</p>
						)}
						{editItem && (
							<p
								style={{
									marginTop: 8,
									fontSize: '0.78rem',
									color: 'var(--text-muted)',
								}}
							>
								⚡ Inventory will be adjusted for the quantity/size difference.
							</p>
						)}
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
								{saving ? 'Saving…' : editItem ? 'Update' : 'Create'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* Delete confirm */}
			{deleteItem && (
				<ConfirmDelete
					message={`Delete purchase of ${deleteItem.quantity} Crates from ${deleteItem.farmName}? Inventory will be reversed.`}
					onConfirm={handleDelete}
					onCancel={() => setDeleteItem(null)}
					loading={deleting}
				/>
			)}
		</div>
	);
}
