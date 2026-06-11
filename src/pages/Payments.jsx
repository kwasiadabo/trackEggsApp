import { useState } from 'react';
import { paymentsApi, customersApi, salesApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import {
	Loading,
	ErrorMsg,
	Empty,
	toast,
	fmt,
	fmtDate,
	PrintHeader,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDelete from '../components/ConfirmDelete';

function normalisePhone(phone) {
	if (!phone) return null;
	const digits = phone.replace(/\D/g, '');
	if (digits.startsWith('233')) return '+' + digits;
	if (digits.startsWith('0') && digits.length === 10) return '+233' + digits.slice(1);
	return '+' + digits;
}

function buildPaymentWhatsAppUrl(receipt) {
	const phone = normalisePhone(receipt.customerPhone);
	const text = [
		`*EggTrack Payment Receipt — ${receipt.receiptNo}*`,
		`Date: ${receipt.paymentDate}`,
		`Customer: ${receipt.customerName}`,
		'',
		`Amount Paid: GH₵${Number(receipt.amount).toFixed(2)}`,
		`Method: ${receipt.method?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
		receipt.linkedSale
			? `For Sale: Sale #${receipt.linkedSale.id} — ${receipt.linkedSale.eggSize} × ${receipt.linkedSale.quantity} crates (GH₵${Number(receipt.linkedSale.totalAmount).toFixed(2)})`
			: '',
		receipt.notes ? `Notes: ${receipt.notes}` : '',
		'',
		'✅ PAYMENT CONFIRMED',
		'Thank you for your payment!',
	]
		.filter((l) => l !== undefined)
		.join('\n')
		.trim();
	return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : null;
}

const METHODS = ['cash', 'mobile_money', 'bank_transfer', 'cheque'];
const EMPTY_FORM = {
	customerId: '',
	saleId: '',
	amount: '',
	paymentDate: '',
	method: 'cash',
	notes: '',
};

export default function Payments() {
	const { isManager, isAdmin } = useAuth();
	const {
		data: payments,
		loading,
		error,
		reload,
	} = useFetch(() => paymentsApi.getAll());
	const { data: customers } = useFetch(() => customersApi.getAll());
	const { data: sales } = useFetch(() => salesApi.getAll());

	const [showForm, setShowForm] = useState(false);
	const [editItem, setEditItem] = useState(null);
	const [deleteItem, setDeleteItem] = useState(null);
	const [receipt, setReceipt] = useState(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [search, setSearch] = useState('');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [selectedCustomer, setSelectedCustomer] = useState('');
	const [selectedMethod, setSelectedMethod] = useState('');

	const openCreate = () => {
		setForm(EMPTY_FORM);
		setEditItem(null);
		setShowForm(true);
	};
	const openEdit = (rec) => {
		setForm({
			customerId: rec.customerId,
			saleId: rec.saleId || '',
			amount: rec.amount,
			paymentDate: rec.paymentDate?.split('T')[0] || '',
			method: rec.method || 'cash',
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
	const filteredSales =
		sales?.filter((s) => String(s.customerId) === String(form.customerId)) ||
		[];

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSaving(true);
		try {
			if (editItem) {
				await paymentsApi.update(editItem.id, form);
				toast('Payment updated ✓');
				closeForm();
			} else {
				const customerObj = customers?.find((c) => String(c.id) === String(form.customerId));
				const customerName = customerObj?.name || 'Customer';
				const customerPhone = customerObj?.phone || null;
				const linkedSale = form.saleId
					? filteredSales.find((s) => String(s.id) === String(form.saleId))
					: null;
				const snapshot = { ...form };
				const res = await paymentsApi.create(form);
				const createdId = res?.data?.data?.id || res?.data?.id;
				closeForm();
				setReceipt({
					receiptNo: `PAY-${createdId || Date.now()}`,
					customerName,
					customerPhone,
					amount: snapshot.amount,
					method: snapshot.method,
					paymentDate: snapshot.paymentDate || new Date().toISOString().split('T')[0],
					notes: snapshot.notes,
					linkedSale,
					generatedAt: new Date(),
				});
				toast('Payment recorded ✓');
			}
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
			await paymentsApi.remove(deleteItem.id);
			toast('Payment deleted ✓');
			setDeleteItem(null);
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setDeleting(false);
		}
	};
	const methodLabel = (m) =>
		m?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

	const customerOptions = Array.from(
		new Set((payments ?? []).map((p) => p.customerName).filter(Boolean)),
	);

	const methodOptions = Array.from(
		new Set((payments ?? []).map((p) => p.method).filter(Boolean)),
	);

	const filteredPayments = (payments ?? []).filter((p) => {
		const q = search.toLowerCase();

		const matchesSearch =
			!search ||
			p.customerName?.toLowerCase().includes(q) ||
			methodLabel(p.method)?.toLowerCase().includes(q) ||
			p.amount?.toString().includes(q) ||
			(p.saleId?.toString() || '').includes(q);

		const paymentDate = new Date(p.paymentDate);

		const matchesFromDate = !fromDate || paymentDate >= new Date(fromDate);

		const matchesToDate = !toDate || paymentDate <= new Date(toDate);

		const matchesCustomer =
			!selectedCustomer || p.customerName === selectedCustomer;

		const matchesMethod = !selectedMethod || p.method === selectedMethod;

		return (
			matchesSearch &&
			matchesFromDate &&
			matchesToDate &&
			matchesCustomer &&
			matchesMethod
		);
	});

	const resetFilters = () => {
		setSearch('');
		setFromDate('');
		setToDate('');
		setSelectedCustomer('');
		setSelectedMethod('');
	};
	const totalPayments = filteredPayments.reduce(
		(sum, p) => sum + Number(p.amount || 0),
		0,
	);
	return (
		<div>
				{/* ── Receipt card ── */}
			{receipt && (
				<div
					className="card payment-receipt-card"
					style={{ marginBottom: 20, maxWidth: 480 }}
				>
					{/* Receipt header */}
					<div style={{
						textAlign: 'center',
						paddingBottom: 14,
						marginBottom: 14,
						borderBottom: '2px dashed var(--border)',
					}}>
						<div style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', color: 'var(--amber-dark)' }}>
							🥚 EggTrack
						</div>
						<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
							Distribution Manager
						</div>
						<div style={{
							marginTop: 10,
							fontSize: '1rem',
							fontWeight: 700,
							letterSpacing: '.1em',
							textTransform: 'uppercase',
							color: 'var(--text-primary)',
						}}>
							Payment Receipt
						</div>
					</div>

					{/* Meta row */}
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.8rem', flexWrap: 'wrap', gap: 4 }}>
						<div>
							<span style={{ color: 'var(--text-muted)' }}>Receipt No: </span>
							<span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{receipt.receiptNo}</span>
						</div>
						<div>
							<span style={{ color: 'var(--text-muted)' }}>Date: </span>
							<span style={{ fontWeight: 600 }}>{fmtDate(receipt.paymentDate + 'T12:00:00')}</span>
						</div>
					</div>

					{/* Dashed divider */}
					<div style={{ borderTop: '1px dashed var(--border)', marginBottom: 12 }} />

					{/* Customer */}
					<div style={{ marginBottom: 12, fontSize: '0.85rem' }}>
						<span style={{ color: 'var(--text-muted)' }}>Received from: </span>
						<span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{receipt.customerName}</span>
					</div>

					<div style={{ borderTop: '1px dashed var(--border)', marginBottom: 12 }} />

					{/* Payment details */}
					{[
						{ label: 'Amount Paid', value: fmt(receipt.amount), highlight: true },
						{ label: 'Payment Method', value: methodLabel(receipt.method) },
						receipt.linkedSale && {
							label: 'For Sale',
							value: `Sale #${receipt.linkedSale.id} — ${receipt.linkedSale.eggSize} × ${receipt.linkedSale.quantity} crates (${fmt(receipt.linkedSale.totalAmount)})`,
						},
						receipt.notes && { label: 'Notes', value: receipt.notes },
					].filter(Boolean).map(({ label, value, highlight }) => (
						<div key={label} style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							marginBottom: 8,
							fontSize: highlight ? '0.95rem' : '0.84rem',
							gap: 12,
						}}>
							<span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
							<span style={{
								fontWeight: highlight ? 800 : 500,
								color: highlight ? 'var(--success)' : 'var(--text-primary)',
								textAlign: 'right',
							}}>
								{value}
							</span>
						</div>
					))}

					<div style={{ borderTop: '1px dashed var(--border)', margin: '12px 0' }} />

					{/* Confirmed stamp */}
					<div style={{
						textAlign: 'center',
						padding: '8px 0',
						fontSize: '0.9rem',
						fontWeight: 700,
						color: 'var(--success)',
						letterSpacing: '.05em',
					}}>
						✅ PAYMENT CONFIRMED
					</div>

					<div style={{ borderTop: '1px dashed var(--border)', margin: '12px 0' }} />

					{/* Footer */}
					<div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
						Thank you for your payment!<br />
						<span style={{ fontSize: '0.7rem' }}>
							Generated{' '}
							{receipt.generatedAt.toLocaleString('en-GB', {
								day: 'numeric', month: 'short', year: 'numeric',
								hour: '2-digit', minute: '2-digit',
							})}
						</span>
					</div>

					{/* Actions */}
					<div className="receipt-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
						<button className="btn btn-primary" onClick={() => {
							const cleanup = () => { document.body.removeAttribute('data-print'); window.removeEventListener('afterprint', cleanup); };
							window.addEventListener('afterprint', cleanup);
							document.body.setAttribute('data-print', 'receipt');
							window.print();
						}}>
							🖨 Print Receipt
						</button>
						<button
							className="btn btn-primary"
							style={{ background: '#25D366', borderColor: '#25D366' }}
							onClick={() => {
								const url = buildPaymentWhatsAppUrl(receipt);
								if (!url) { toast('No phone number saved for this customer', 'error'); return; }
								window.open(url, '_blank', 'noopener');
							}}
						>
							📲 Send via WhatsApp
						</button>
						<button className="btn btn-secondary" onClick={() => setReceipt(null)}>
							Dismiss
						</button>
					</div>
				</div>
			)}

			<PrintHeader title="All Payments" />
			<div className="section-header">
				<span className="section-title">💳 All Payments</span>
				<div className="no-print" style={{ display: 'flex', gap: 8 }}>
					<button className="btn btn-secondary" onClick={() => window.print()} style={{ whiteSpace: 'nowrap' }}>🖨 Print</button>
					{isManager && (
						<button className="btn btn-primary" onClick={openCreate}>+ Record Payment</button>
					)}
				</div>
			</div>

			<div className="card payments-table-card">
				{loading ? (
					<Loading />
				) : error ? (
					<ErrorMsg message={error} />
				) : !payments?.length ? (
					<Empty message="No payments yet." />
				) : (
					<div className="table-wrap">
						<div
							className="no-print"
							style={{
								display: 'flex',
								gap: 10,
								marginBottom: 12,
								flexWrap: 'wrap',
							}}
						>
							<input
								type="text"
								placeholder="Search payments..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid var(--border)',
									borderRadius: 6,
									minWidth: 180,
								}}
							/>

							<input
								type="date"
								value={fromDate}
								onChange={(e) => setFromDate(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid var(--border)',
									borderRadius: 6,
									minWidth: 250,
								}}
							/>

							<input
								type="date"
								value={toDate}
								onChange={(e) => setToDate(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid var(--border)',
									borderRadius: 6,
									minWidth: 250,
								}}
							/>

							<select
								value={selectedCustomer}
								onChange={(e) => setSelectedCustomer(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid var(--border)',
									borderRadius: 6,
									minWidth: 250,
								}}
							>
								<option value="">All Customers</option>

								{customerOptions.map((customer) => (
									<option key={customer} value={customer}>
										{customer}
									</option>
								))}
							</select>

							<select
								value={selectedMethod}
								onChange={(e) => setSelectedMethod(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid var(--border)',
									borderRadius: 6,
									minWidth: 250,
								}}
							>
								<option value="">All Methods</option>

								{methodOptions.map((method) => (
									<option key={method} value={method}>
										{methodLabel(method)}
									</option>
								))}
							</select>

							<button className="btn btn-secondary" onClick={resetFilters}>
								Reset
							</button>
						</div>
						<table>
							<thead>
								<tr>
									<th>Date</th>
									<th>Customer</th>
									<th>Method</th>
									<th className="text-right">Amount</th>
									<th>Linked Sale</th>
									{isManager && <th style={{ width: 90 }}>Actions</th>}
								</tr>
							</thead>
							<tbody>
								{filteredPayments.map((p) => (
									<tr key={p.id}>
										<td>{fmtDate(p.paymentDate)}</td>
										<td style={{ fontWeight: 500 }}>{p.customerName}</td>
										<td>
											<span className="badge badge-green">
												{methodLabel(p.method)}
											</span>
										</td>
										<td
											className="text-right amount"
											style={{ color: 'var(--success)' }}
										>
											{fmt(p.amount)}
										</td>
										<td style={{ color: 'var(--text-muted)' }}>
											{p.saleId ? `Sale #${p.saleId}` : '—'}
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
										colSpan={isManager ? 3.5 : 2.5}
										style={{
											textAlign: 'right',
											fontWeight: 700,
											paddingTop: 15,
										}}
									>
										Total Payments
									</td>

									<td
										className="text-right amount"
										style={{
											fontWeight: 700,
											color: 'var(--success)',
											paddingTop: 12,
										}}
									>
										{fmt(totalPayments)}
									</td>

									<td />

									{isManager && <td />}
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>

			{showForm && (
				<Modal
					title={editItem ? '✏ Edit Payment' : '💳 Record Payment'}
					onClose={closeForm}
				>
					<form onSubmit={handleSubmit}>
						<div className="form-grid">
							<div className="form-group">
								<label>Customer *</label>
								<select
									name="customerId"
									value={form.customerId}
									onChange={handleChange}
									required
									disabled={!!editItem}
								>
									<option value="">Select…</option>
									{customers?.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							</div>
							<div className="form-group">
								<label>Link to Sale (optional)</label>
								<select
									name="saleId"
									value={form.saleId}
									onChange={handleChange}
									disabled={!form.customerId || !!editItem}
								>
									<option value="">— General payment —</option>
									{filteredSales.map((s) => (
										<option key={s.id} value={s.id}>
											{fmtDate(s.saleDate)} — {s.eggSize} × {s.quantity} (
											{fmt(s.totalAmount)})
										</option>
									))}
								</select>
							</div>
							<div className="form-group">
								<label>Amount (GH₵) *</label>
								<input
									name="amount"
									type="number"
									min="0.01"
									step="0.01"
									value={form.amount}
									onChange={handleChange}
									required
								/>
							</div>
							<div className="form-group">
								<label>Method</label>
								<select
									name="method"
									value={form.method}
									onChange={handleChange}
								>
									{METHODS.map((m) => (
										<option key={m} value={m}>
											{methodLabel(m)}
										</option>
									))}
								</select>
							</div>
							<div className="form-group">
								<label>Payment Date</label>
								<input
									name="paymentDate"
									type="date"
									value={form.paymentDate}
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
								{saving ? 'Saving…' : editItem ? 'Update' : 'Record'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{deleteItem && (
				<ConfirmDelete
					message={`Delete payment of ${fmt(deleteItem.amount)} from ${deleteItem.customerName}?`}
					onConfirm={handleDelete}
					onCancel={() => setDeleteItem(null)}
					loading={deleting}
				/>
			)}
		</div>
	);
}
