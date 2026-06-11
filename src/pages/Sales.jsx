import { useState } from 'react';
import { salesApi, customersApi, paymentsApi, bankApi } from '../services/api';
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
import InvoiceView from '../components/InvoiceView';

const EGG_SIZES = ['small', 'medium', 'large', 'xlarge', 'pullet'];
const PAYMENT_METHODS = ['cash', 'mobile_money', 'bank_transfer', 'cheque'];
const methodLabel = (m) =>
	m?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const EMPTY_FORM = {
	customerId: '',
	eggSize: 'large',
	quantity: '',
	unitPrice: '',
	saleDate: '',
	notes: '',
	bankAccountId: '',
};

export default function Sales() {
	const { isManager, isAdmin } = useAuth();
	const {
		data: sales,
		loading,
		error,
		reload,
	} = useFetch(() => salesApi.getAll());
	const { data: customers }     = useFetch(() => customersApi.getAll());
	const { data: bankAccounts }  = useFetch(() => bankApi.getAccounts());

	const [showForm, setShowForm] = useState(false);
	const [editItem, setEditItem] = useState(null);
	const [deleteItem, setDeleteItem] = useState(null);
	const [lastReceipt, setLastReceipt] = useState(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [search, setSearch] = useState('');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [selectedCustomer, setSelectedCustomer] = useState('');
	const [paymentSale, setPaymentSale] = useState(null);
	const [paymentForm, setPaymentForm] = useState({});
	const [paymentSaving, setPaymentSaving] = useState(false);
	const [paymentReceipt, setPaymentReceipt] = useState(null);

	// ── Invoice state ──────────────────────────────────────────────────────────
	const EMPTY_LINE = { eggSize: 'large', quantity: '', unitPrice: '' };
	const [showInvoiceForm, setShowInvoiceForm] = useState(false);
	const [invoiceCustomerId, setInvoiceCustomerId] = useState('');
	const [invoiceDate, setInvoiceDate] = useState('');
	const [invoiceNotes, setInvoiceNotes] = useState('');
	const [invoiceLines, setInvoiceLines] = useState([{ ...EMPTY_LINE }]);
	const [invoiceSaving, setInvoiceSaving] = useState(false);
	const [invoiceData, setInvoiceData] = useState(null); // populated after save or "View"

	const openInvoiceForm = () => {
		setInvoiceCustomerId('');
		setInvoiceDate('');
		setInvoiceNotes('');
		setInvoiceLines([{ ...EMPTY_LINE }]);
		setShowInvoiceForm(true);
	};
	const closeInvoiceForm = () => setShowInvoiceForm(false);

	const updateLine = (i, field, value) =>
		setInvoiceLines((prev) =>
			prev.map((ln, idx) => (idx === i ? { ...ln, [field]: value } : ln)),
		);
	const addLine = () => setInvoiceLines((prev) => [...prev, { ...EMPTY_LINE }]);
	const removeLine = (i) =>
		setInvoiceLines((prev) => prev.filter((_, idx) => idx !== i));

	const invoiceTotal = invoiceLines.reduce(
		(s, ln) => s + (Number(ln.quantity) || 0) * (Number(ln.unitPrice) || 0),
		0,
	);

	const handleInvoiceSubmit = async (e) => {
		e.preventDefault();
		if (invoiceLines.some((ln) => !ln.quantity || !ln.unitPrice)) {
			toast('Fill in quantity and unit price for every line', 'error');
			return;
		}
		setInvoiceSaving(true);
		try {
			const res = await salesApi.createInvoice({
				customerId: invoiceCustomerId,
				saleDate: invoiceDate || new Date().toISOString().split('T')[0],
				notes: invoiceNotes,
				items: invoiceLines.map((ln) => ({
					eggSize: ln.eggSize,
					quantity: Number(ln.quantity),
					unitPrice: Number(ln.unitPrice),
				})),
			});
			const { invoiceNo, sales: invoiceSales, customer } = res.data.data;
			const customerObj =
				customer ||
				customers?.find((c) => String(c.id) === String(invoiceCustomerId)) ||
				{};
			closeInvoiceForm();
			setInvoiceData({
				invoiceNo,
				customer: customerObj,
				saleDate: invoiceDate || new Date().toISOString().split('T')[0],
				items: invoiceSales,
				notes: invoiceNotes,
			});
			toast(`Invoice ${invoiceNo} created ✓`);
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setInvoiceSaving(false);
		}
	};

	// Re-open invoice from a table row that already has an invoiceNo
	const viewInvoice = (invoiceNo) => {
		const rows = (sales || []).filter((s) => s.invoiceNo === invoiceNo);
		if (!rows.length) return;
		const cust = customers?.find(
			(c) => String(c.id) === String(rows[0].customerId),
		) || { name: rows[0].customerName };
		setInvoiceData({
			invoiceNo,
			customer: cust,
			saleDate: rows[0].saleDate,
			items: rows,
			notes: rows[0].notes || '',
		});
	};

	const openCreate = () => {
		setForm(EMPTY_FORM);
		setEditItem(null);
		setShowForm(true);
	};
	const openEdit = (rec) => {
		setForm({
			customerId: rec.customerId,
			eggSize: rec.eggSize,
			quantity: rec.quantity,
			unitPrice: rec.unitPrice,
			saleDate: rec.saleDate?.split('T')[0] || '',
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
				await salesApi.update(editItem.id, form);
				toast('Sale updated & inventory adjusted ✓');
				closeForm();
			} else {
				const res = await salesApi.create(form);
				setLastReceipt(res.data.receipt);
				toast('Sale recorded ✓');
				closeForm();
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
			await salesApi.remove(deleteItem.id);
			toast('Sale deleted & inventory returned ✓');
			setDeleteItem(null);
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setDeleting(false);
		}
	};

	const totalAmount =
		form.quantity && form.unitPrice
			? Number(form.quantity) * Number(form.unitPrice)
			: null;

	const openPayment = (sale) => {
		setPaymentSale(sale);
		setPaymentForm({
			customerId: sale.customerId,
			saleId: sale.id,
			amount: sale.totalAmount,
			paymentDate: '',
			method: 'cash',
			notes: '',
		});
	};
	const closePayment = () => setPaymentSale(null);
	const handlePaymentChange = (e) =>
		setPaymentForm((p) => ({ ...p, [e.target.name]: e.target.value }));

	const handlePaymentSubmit = async (e) => {
		e.preventDefault();
		setPaymentSaving(true);
		try {
			const snapshot = { ...paymentForm };
			const sale = paymentSale;
			const res = await paymentsApi.create(paymentForm);
			const createdId = res?.data?.data?.id || res?.data?.id;
			closePayment();
			setPaymentReceipt({
				receiptNo: `PAY-${createdId || Date.now()}`,
				customerName: sale.customerName,
				amount: snapshot.amount,
				method: snapshot.method,
				paymentDate:
					snapshot.paymentDate || new Date().toISOString().split('T')[0],
				notes: snapshot.notes,
				linkedSale: sale,
				generatedAt: new Date(),
			});
			toast('Payment recorded ✓');
			reload();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setPaymentSaving(false);
		}
	};

	const resetFilters = () => {
		setSearch('');
		setFromDate('');
		setToDate('');
		setSelectedCustomer('');
	};
	const filtercustomers = Array.from(
		new Set(sales?.map((s) => s.customerName).filter(Boolean)),
	);

	const filteredSales = sales?.filter((s) => {
		const q = search.toLowerCase();

		const matchesSearch =
			!search.trim() ||
			s.customerName?.toLowerCase().includes(q) ||
			s.eggSize?.toLowerCase().includes(q) ||
			s.quantity?.toString().includes(q) ||
			s.unitPrice?.toString().includes(q) ||
			fmtDate(s.saleDate)?.toLowerCase().includes(q);

		const saleDate = new Date(s.saleDate);

		const matchesFromDate = !fromDate || saleDate >= new Date(fromDate);
		const matchesToDate = !toDate || saleDate <= new Date(toDate);

		const matchesCustomer =
			!selectedCustomer || s.customerName === selectedCustomer;

		return matchesSearch && matchesFromDate && matchesToDate && matchesCustomer;
	});

	const totalSalesAmount =
		filteredSales?.reduce((sum, s) => {
			return sum + Number(s.totalAmount || 0);
		}, 0) || 0;

	return (
		<div>
			{/* ── Payment receipt card ── */}
			{paymentReceipt && (
				<div
					className="card pay-receipt-card"
					style={{ marginBottom: 20, maxWidth: 480 }}
				>
					<div
						style={{
							textAlign: 'center',
							paddingBottom: 14,
							marginBottom: 14,
							borderBottom: '2px dashed var(--border)',
						}}
					>
						<div
							style={{
								fontWeight: 800,
								fontSize: '1.3rem',
								letterSpacing: '-0.02em',
								color: 'var(--amber-dark)',
							}}
						>
							🥚 EggTrack
						</div>
						<div
							style={{
								fontSize: '0.75rem',
								color: 'var(--text-muted)',
								letterSpacing: '.06em',
								textTransform: 'uppercase',
							}}
						>
							Distribution Manager
						</div>
						<div
							style={{
								marginTop: 10,
								fontSize: '1rem',
								fontWeight: 700,
								letterSpacing: '.1em',
								textTransform: 'uppercase',
							}}
						>
							Payment Receipt
						</div>
					</div>

					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							marginBottom: 12,
							fontSize: '0.8rem',
							flexWrap: 'wrap',
							gap: 4,
						}}
					>
						<div>
							<span style={{ color: 'var(--text-muted)' }}>Receipt No: </span>
							<span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
								{paymentReceipt.receiptNo}
							</span>
						</div>
						<div>
							<span style={{ color: 'var(--text-muted)' }}>Date: </span>
							<span style={{ fontWeight: 600 }}>
								{fmtDate(paymentReceipt.paymentDate + 'T12:00:00')}
							</span>
						</div>
					</div>

					<div
						style={{ borderTop: '1px dashed var(--border)', marginBottom: 12 }}
					/>

					<div style={{ marginBottom: 12, fontSize: '0.85rem' }}>
						<span style={{ color: 'var(--text-muted)' }}>Received from: </span>
						<span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
							{paymentReceipt.customerName}
						</span>
					</div>

					<div
						style={{ borderTop: '1px dashed var(--border)', marginBottom: 12 }}
					/>

					{[
						{
							label: 'Amount Paid',
							value: fmt(paymentReceipt.amount),
							highlight: true,
						},
						{
							label: 'Payment Method',
							value: methodLabel(paymentReceipt.method),
						},
						paymentReceipt.linkedSale && {
							label: 'For Sale',
							value: `Sale #${paymentReceipt.linkedSale.id} — ${paymentReceipt.linkedSale.eggSize} × ${paymentReceipt.linkedSale.quantity} crates (${fmt(paymentReceipt.linkedSale.totalAmount)})`,
						},
						paymentReceipt.notes && {
							label: 'Notes',
							value: paymentReceipt.notes,
						},
					]
						.filter(Boolean)
						.map(({ label, value, highlight }) => (
							<div
								key={label}
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'flex-start',
									marginBottom: 8,
									fontSize: highlight ? '0.95rem' : '0.84rem',
									gap: 12,
								}}
							>
								<span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
									{label}
								</span>
								<span
									style={{
										fontWeight: highlight ? 800 : 500,
										color: highlight ? 'var(--success)' : 'var(--text-primary)',
										textAlign: 'right',
									}}
								>
									{value}
								</span>
							</div>
						))}

					<div
						style={{ borderTop: '1px dashed var(--border)', margin: '12px 0' }}
					/>
					<div
						style={{
							textAlign: 'center',
							padding: '8px 0',
							fontSize: '0.9rem',
							fontWeight: 700,
							color: 'var(--success)',
							letterSpacing: '.05em',
						}}
					>
						✅ PAYMENT CONFIRMED
					</div>
					<div
						style={{ borderTop: '1px dashed var(--border)', margin: '12px 0' }}
					/>

					<div
						style={{
							textAlign: 'center',
							fontSize: '0.75rem',
							color: 'var(--text-muted)',
							marginBottom: 14,
						}}
					>
						Thank you for your payment!
						<br />
						<span style={{ fontSize: '0.7rem' }}>
							Generated{' '}
							{paymentReceipt.generatedAt.toLocaleString('en-GB', {
								day: 'numeric',
								month: 'short',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit',
							})}
						</span>
					</div>

					<div
						className="pay-receipt-actions"
						style={{ display: 'flex', gap: 10 }}
					>
						<button
							className="btn btn-primary"
							onClick={() => {
								const cleanup = () => {
									document.body.removeAttribute('data-print');
									window.removeEventListener('afterprint', cleanup);
								};
								window.addEventListener('afterprint', cleanup);
								document.body.setAttribute('data-print', 'receipt');
								window.print();
							}}
						>
							🖨 Print Receipt
						</button>
						<button
							className="btn btn-secondary"
							onClick={() => setPaymentReceipt(null)}
						>
							Dismiss
						</button>
					</div>
				</div>
			)}

			{/* Receipt banner */}
			{lastReceipt && (
				<div
					className="card last-receipt-banner"
					style={{
						marginBottom: 20,
						borderLeft: '4px solid var(--success)',
						background: 'var(--success-bg)',
					}}
				>
					<div
						style={{
							fontWeight: 700,
							color: 'var(--success)',
							marginBottom: 8,
						}}
					>
						✅ Receipt — {lastReceipt.receiptNo}
					</div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
							gap: 6,
							fontSize: '0.875rem',
						}}
					>
						<div>
							<span style={{ color: 'var(--text-muted)' }}>Customer: </span>
							<b>{lastReceipt.customer}</b>
						</div>
						<div>
							<span style={{ color: 'var(--text-muted)' }}>Egg Size: </span>
							{lastReceipt.eggSize}
						</div>
						<div>
							<span style={{ color: 'var(--text-muted)' }}>Quantity: </span>
							{lastReceipt.quantity} crates
						</div>
						<div>
							<span style={{ color: 'var(--text-muted)' }}>Total: </span>
							<b style={{ color: 'var(--success)' }}>
								{fmt(lastReceipt.totalAmount)}
							</b>
						</div>
					</div>
					<button
						className="btn btn-secondary"
						style={{ marginTop: 10 }}
						onClick={() => setLastReceipt(null)}
					>
						Dismiss
					</button>
				</div>
			)}

			<PrintHeader title="Sales History" />
			<div className="section-header">
				<span className="section-title">📋 Sales History</span>
				<div className="no-print" style={{ display: 'flex', gap: 8 }}>
					<button
						className="btn btn-secondary"
						onClick={() => window.print()}
						style={{ whiteSpace: 'nowrap' }}
					>
						🖨 Print
					</button>
					{isManager && (
						<button
							className="btn btn-primary"
							onClick={openInvoiceForm}
							style={{ whiteSpace: 'nowrap' }}
						>
							🧾 New Invoice
						</button>
					)}
				</div>
			</div>

			{!loading && !error && filteredSales && (
				<div
					className="stats-grid"
					style={{
						marginBottom: 16,
						gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
					}}
				>
					<div className="stat-card amber">
						<div className="label">Sales</div>
						<div className="value">{filteredSales.length}</div>
						<div className="sub">transactions</div>
					</div>
					<div className="stat-card green">
						<div className="label">Revenue</div>
						<div className="value" style={{ fontSize: '1.2rem' }}>
							{fmt(totalSalesAmount)}
						</div>
						<div className="sub">total amount</div>
					</div>
					<div className="stat-card brown">
						<div className="label">Customers</div>
						<div className="value">
							{new Set(filteredSales.map((s) => s.customerId)).size}
						</div>
						<div className="sub">unique</div>
					</div>
				</div>
			)}

			<div className="card sales-table-card">
				{loading ? (
					<Loading />
				) : error ? (
					<ErrorMsg message={error} />
				) : !sales?.length ? (
					<Empty message="No sales yet. Use 🧾 New Invoice to record sales." />
				) : (
					<div className="table-wrap">
						<div
							className="no-print"
							style={{
								display: 'flex',
								gap: 8,
								marginBottom: 14,
								flexWrap: 'wrap',
								alignItems: 'center',
							}}
						>
							<input
								type="text"
								placeholder="🔍 Search sales…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								style={{
									padding: '7px 11px',
									borderRadius: 7,
									border: '1px solid var(--border)',
									fontSize: '0.85rem',
									minWidth: 180,
									flex: '1 1 180px',
									background: '#fff',
								}}
							/>
							<select
								value={selectedCustomer}
								onChange={(e) => setSelectedCustomer(e.target.value)}
								style={{
									padding: '7px 11px',
									borderRadius: 7,
									border: '1px solid var(--border)',
									fontSize: '0.85rem',
									minWidth: 160,
									flex: '1 1 160px',
									background: '#fff',
									color: selectedCustomer
										? 'var(--text-primary)'
										: 'var(--text-muted)',
								}}
							>
								<option value="">All Customers</option>
								{filtercustomers.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
							<div
								style={{
									display: 'flex',
									gap: 6,
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<span
									style={{
										fontSize: '0.78rem',
										color: 'var(--text-muted)',
										whiteSpace: 'nowrap',
									}}
								>
									From
								</span>
								<input
									type="date"
									value={fromDate}
									onChange={(e) => setFromDate(e.target.value)}
									style={{
										padding: '7px 10px',
										borderRadius: 7,
										border: '1px solid var(--border)',
										fontSize: '0.85rem',
										background: '#fff',
									}}
								/>
								<span
									style={{
										fontSize: '0.78rem',
										color: 'var(--text-muted)',
										whiteSpace: 'nowrap',
									}}
								>
									To
								</span>
								<input
									type="date"
									value={toDate}
									onChange={(e) => setToDate(e.target.value)}
									style={{
										padding: '7px 10px',
										borderRadius: 7,
										border: '1px solid var(--border)',
										fontSize: '0.85rem',
										background: '#fff',
									}}
								/>
							</div>
							<button
								className="btn btn-secondary"
								onClick={resetFilters}
								style={{ whiteSpace: 'nowrap' }}
							>
								↺ Reset
							</button>
						</div>
						<table>
							<thead>
								<tr>
									<th>Date</th>
									<th>Customer</th>
									<th>Size</th>
									<th className="text-right">Qty</th>
									<th className="text-right">Unit Price</th>
									<th className="text-right">Total</th>
									{isManager && (
										<th style={{ width: 190, whiteSpace: 'nowrap' }}>
											Actions
										</th>
									)}
								</tr>
							</thead>
							<tbody>
								{filteredSales.length === 0 ? (
									<tr>
										<td
											colSpan={isManager ? 7 : 6}
											style={{
												textAlign: 'center',
												padding: '32px 16px',
												color: 'var(--text-muted)',
												fontSize: '0.875rem',
											}}
										>
											No matching sales found.
										</td>
									</tr>
								) : (
									filteredSales.map((s) => (
										<tr key={s.id}>
											<td style={{ whiteSpace: 'nowrap' }}>
												<div>{fmtDate(s.saleDate)}</div>
												{s.invoiceNo && (
													<div style={{ marginTop: 3 }}>
														<span
															className="badge badge-amber"
															style={{
																fontSize: '0.63rem',
																letterSpacing: '.03em',
															}}
														>
															{s.invoiceNo}
														</span>
													</div>
												)}
											</td>
											<td style={{ fontWeight: 500 }}>{s.customerName}</td>
											<td>
												<EggBadge size={s.eggSize} />
											</td>
											<td className="text-right">{s.quantity}</td>
											<td className="text-right amount">{fmt(s.unitPrice)}</td>
											<td
												className="text-right amount"
												style={{ color: 'var(--success)' }}
											>
												{fmt(s.totalAmount)}
											</td>
											{isManager && (
												<td>
													<div
														style={{
															display: 'flex',
															gap: 5,
															flexWrap: 'nowrap',
															alignItems: 'center',
														}}
													>
														{s.invoiceNo && (
															<button
																className="btn btn-secondary"
																style={{
																	padding: '3px 10px',
																	fontSize: '0.76rem',
																}}
																onClick={() => viewInvoice(s.invoiceNo)}
																title="View invoice"
															>
																🧾
															</button>
														)}
														<button
															className="btn btn-primary"
															style={{
																padding: '3px 10px',
																fontSize: '0.76rem',
																gap: 4,
															}}
															onClick={() => openPayment(s)}
															title="Receive payment for this sale"
														>
															💳 Pay
														</button>
														<button
															className="btn btn-secondary"
															style={{
																padding: '3px 10px',
																fontSize: '0.76rem',
															}}
															onClick={() => openEdit(s)}
															title="Edit sale"
														>
															✏ Edit
														</button>
														{isAdmin && (
															<button
																className="btn btn-danger"
																style={{
																	padding: '3px 10px',
																	fontSize: '0.76rem',
																}}
																onClick={() => setDeleteItem(s)}
																title="Delete sale"
															>
																Del
															</button>
														)}
													</div>
												</td>
											)}
										</tr>
									))
								)}
							</tbody>
							<tfoot>
								<tr>
									<td
										colSpan={5}
										style={{
											textAlign: 'right',
											fontWeight: 700,
											paddingTop: 12,
											color: 'var(--text-secondary)',
											fontSize: '0.8rem',
											textTransform: 'uppercase',
											letterSpacing: '.04em',
										}}
									>
										Total ({filteredSales?.length ?? 0} sales)
									</td>

									<td
										className="text-right amount"
										style={{
											fontWeight: 700,
											color: 'var(--success)',
											paddingTop: 12,
										}}
									>
										{fmt(totalSalesAmount)}
									</td>

									{isManager && <td />}
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>

			{showForm && (
				<Modal
					title={editItem ? '✏ Edit Sale' : '🛒 New Sale'}
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
								<label>Quantity (crates) *</label>
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
								<label>Unit Price (GH₵) *</label>
								<input
									name="unitPrice"
									type="number"
									min="0.01"
									step="0.01"
									value={form.unitPrice}
									onChange={handleChange}
									required
								/>
							</div>
							<div className="form-group">
								<label>Sale Date</label>
								<input
									name="saleDate"
									type="date"
									value={form.saleDate}
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
							{!editItem && bankAccounts?.length > 0 && (
								<div className="form-group" style={{ gridColumn: '1 / -1' }}>
									<label>Deposit to bank account <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
									<select name="bankAccountId" value={form.bankAccountId} onChange={handleChange}>
										<option value="">— No deposit —</option>
										{bankAccounts.map((a) => (
											<option key={a.id} value={a.id}>
												{a.accountName} — {a.bankName}
											</option>
										))}
									</select>
								</div>
							)}
						</div>
						{totalAmount !== null && (
							<p
								style={{
									marginTop: 12,
									color: 'var(--success)',
									fontWeight: 600,
								}}
							>
								Total: {fmt(totalAmount)}
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

			{deleteItem && (
				<ConfirmDelete
					message={`Delete sale of ${deleteItem.quantity} ${deleteItem.eggSize} crates to ${deleteItem.customerName}? Inventory will be returned.`}
					onConfirm={handleDelete}
					onCancel={() => setDeleteItem(null)}
					loading={deleting}
				/>
			)}

			{/* ── Invoice creation modal ── */}
			{showInvoiceForm && (
				<Modal title="🧾 New Invoice" onClose={closeInvoiceForm}>
					<form onSubmit={handleInvoiceSubmit}>
						<div className="form-grid" style={{ marginBottom: 16 }}>
							<div className="form-group">
								<label>Customer *</label>
								<select
									value={invoiceCustomerId}
									onChange={(e) => setInvoiceCustomerId(e.target.value)}
									required
								>
									<option value="">Select customer…</option>
									{customers?.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							</div>
							<div className="form-group">
								<label>Invoice Date</label>
								<input
									type="date"
									value={invoiceDate}
									onChange={(e) => setInvoiceDate(e.target.value)}
								/>
							</div>
							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label>Notes</label>
								<input
									value={invoiceNotes}
									onChange={(e) => setInvoiceNotes(e.target.value)}
									placeholder="Optional notes for this invoice"
								/>
							</div>
						</div>

						{/* Line items */}
						<div style={{ marginBottom: 4 }}>
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
								<span style={{ textAlign: 'right' }}>Unit Price</span>
								<span style={{ textAlign: 'right' }}>Subtotal</span>
								<span />
							</div>

							{invoiceLines.map((ln, i) => {
								const sub =
									(Number(ln.quantity) || 0) * (Number(ln.unitPrice) || 0);
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
											{EGG_SIZES.map((sz) => (
												<option key={sz} value={sz}>
													{sz.charAt(0).toUpperCase() + sz.slice(1)}
												</option>
											))}
										</select>
										<input
											type="number"
											min="1"
											placeholder="Qty"
											value={ln.quantity}
											onChange={(e) =>
												updateLine(i, 'quantity', e.target.value)
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
										<input
											type="number"
											min="0.01"
											step="0.01"
											placeholder="GH₵"
											value={ln.unitPrice}
											onChange={(e) =>
												updateLine(i, 'unitPrice', e.target.value)
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
												color: sub ? 'var(--success)' : 'var(--text-muted)',
											}}
										>
											{sub ? fmt(sub) : '—'}
										</div>
										<button
											type="button"
											onClick={() => removeLine(i)}
											disabled={invoiceLines.length === 1}
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
												opacity: invoiceLines.length === 1 ? 0.3 : 1,
											}}
										>
											×
										</button>
									</div>
								);
							})}
						</div>

						<button
							type="button"
							onClick={addLine}
							className="btn btn-secondary"
							style={{
								marginBottom: 16,
								fontSize: '0.82rem',
								padding: '5px 12px',
							}}
						>
							+ Add Line
						</button>

						{/* Grand total */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-end',
								alignItems: 'center',
								gap: 12,
								padding: '10px 14px',
								background: 'var(--success-bg)',
								borderRadius: 8,
								marginBottom: 20,
							}}
						>
							<span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
								Invoice Total ({invoiceLines.length} line
								{invoiceLines.length !== 1 ? 's' : ''})
							</span>
							<span
								style={{
									fontWeight: 800,
									fontSize: '1.15rem',
									color: 'var(--success)',
								}}
							>
								{fmt(invoiceTotal)}
							</span>
						</div>

						<div
							style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
						>
							<button
								type="button"
								className="btn btn-secondary"
								onClick={closeInvoiceForm}
							>
								Cancel
							</button>
							<button
								type="submit"
								className="btn btn-primary"
								disabled={invoiceSaving || !invoiceCustomerId}
							>
								{invoiceSaving ? 'Creating…' : '🧾 Create Invoice'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* ── Invoice view (after creation or re-open from row) ── */}
			{invoiceData && (
				<InvoiceView
					invoiceNo={invoiceData.invoiceNo}
					customer={invoiceData.customer}
					saleDate={invoiceData.saleDate}
					items={invoiceData.items}
					notes={invoiceData.notes}
					onClose={() => setInvoiceData(null)}
				/>
			)}

			{paymentSale && (
				<Modal
					title={`💳 Receive Payment — ${paymentSale.customerName}`}
					onClose={closePayment}
				>
					<form onSubmit={handlePaymentSubmit}>
						<div className="form-grid">
							<div className="form-group">
								<label>Linked Sale</label>
								<input
									readOnly
									value={`${fmtDate(paymentSale.saleDate)} — ${paymentSale.eggSize} × ${paymentSale.quantity} (${fmt(paymentSale.totalAmount)})`}
									style={{
										background: 'var(--warm-white)',
										cursor: 'default',
									}}
								/>
							</div>
							<div className="form-group">
								<label>Amount (GH₵) *</label>
								<input
									name="amount"
									type="number"
									min="0.01"
									step="0.01"
									value={paymentForm.amount}
									onChange={handlePaymentChange}
									required
								/>
							</div>
							<div className="form-group">
								<label>Method</label>
								<select
									name="method"
									value={paymentForm.method}
									onChange={handlePaymentChange}
								>
									{PAYMENT_METHODS.map((m) => (
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
									value={paymentForm.paymentDate}
									onChange={handlePaymentChange}
								/>
							</div>
							<div className="form-group">
								<label>Notes</label>
								<input
									name="notes"
									value={paymentForm.notes}
									onChange={handlePaymentChange}
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
								onClick={closePayment}
							>
								Cancel
							</button>
							<button
								className="btn btn-primary"
								type="submit"
								disabled={paymentSaving}
							>
								{paymentSaving ? 'Saving…' : 'Record Payment'}
							</button>
						</div>
					</form>
				</Modal>
			)}
		</div>
	);
}
