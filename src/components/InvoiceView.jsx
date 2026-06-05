import Modal from './Modal';
import { fmt, fmtDate } from './ui';

// Printable invoice — used after creation and when re-viewing from the table.
// Props:
//   invoiceNo  – string
//   customer   – { name, phone, address }
//   saleDate   – ISO date string
//   items      – [{ eggSize, quantity, unitPrice, totalAmount }]
//   notes      – string | null
//   onClose    – fn

export default function InvoiceView({ invoiceNo, customer, saleDate, items, notes, onClose }) {
	const grandTotal  = items.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
	const totalCrates = items.reduce((s, i) => s + Number(i.quantity    || 0), 0);
	const printedAt   = new Date().toLocaleString('en-GB', {
		day: 'numeric', month: 'short', year: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});

	const handlePrint = () => {
		const cleanup = () => {
			document.body.removeAttribute('data-print');
			window.removeEventListener('afterprint', cleanup);
		};
		window.addEventListener('afterprint', cleanup);
		document.body.setAttribute('data-print', 'invoice');
		window.print();
	};

	return (
		<>
			{/* Print CSS — scoped to invoice mode */}
			<style>{`
				@media print {
					body[data-print="invoice"] .sidebar,
					body[data-print="invoice"] .topbar,
					body[data-print="invoice"] .hamburger-btn,
					body[data-print="invoice"] .section-header,
					body[data-print="invoice"] .sales-table-card,
					body[data-print="invoice"] .stats-grid,
					body[data-print="invoice"] .invoice-actions,
					body[data-print="invoice"] .modal-close-btn { display: none !important; }

					body[data-print="invoice"] .main  { margin-left: 0 !important; }
					body[data-print="invoice"] .page-content { padding: 0 !important; }
					body[data-print="invoice"] .modal-overlay {
						position: static !important;
						background: none !important;
						padding: 0 !important;
						display: block !important;
					}
					body[data-print="invoice"] .modal-box {
						box-shadow: none !important;
						border: none !important;
						border-radius: 0 !important;
						max-width: 100% !important;
						max-height: none !important;
						width: 100% !important;
					}
					body[data-print="invoice"] .modal-header { display: none !important; }
					body[data-print="invoice"] .modal-body   { padding: 8mm 10mm !important; }
					body { background: white !important; }
				}
			`}</style>

			<Modal title={`Invoice — ${invoiceNo}`} onClose={onClose}>
				<div>
					{/* ── Invoice document ── */}
					<div style={{ fontFamily: 'inherit' }}>

						{/* Header */}
						<div style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							marginBottom: 20,
							paddingBottom: 16,
							borderBottom: '3px solid var(--amber)',
							flexWrap: 'wrap',
							gap: 12,
						}}>
							<div>
								<div style={{
									fontFamily: "'DM Serif Display', serif",
									fontSize: '1.8rem',
									color: 'var(--amber-dark)',
									letterSpacing: '-0.02em',
									lineHeight: 1,
								}}>
									🥚 EggTrack
								</div>
								<div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3, letterSpacing: '.05em', textTransform: 'uppercase' }}>
									Distribution Manager
								</div>
							</div>
							<div style={{ textAlign: 'right' }}>
								<div style={{
									fontSize: '1.6rem',
									fontWeight: 800,
									letterSpacing: '.08em',
									textTransform: 'uppercase',
									color: 'var(--text-primary)',
								}}>
									Invoice
								</div>
								<div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
									<span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{invoiceNo}</span>
								</div>
								<div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 3 }}>
									Date: <strong>{fmtDate(saleDate + 'T12:00:00')}</strong>
								</div>
							</div>
						</div>

						{/* Bill To */}
						<div style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
							gap: 16,
							marginBottom: 20,
						}}>
							<div style={{ background: 'var(--warm-white)', borderRadius: 8, padding: '12px 16px' }}>
								<div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
									Bill To
								</div>
								<div style={{ fontWeight: 700, fontSize: '1rem' }}>{customer?.name}</div>
								{customer?.phone && (
									<div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 3 }}>
										{customer.phone}
									</div>
								)}
								{customer?.address && (
									<div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 2 }}>
										{customer.address}
									</div>
								)}
							</div>
							<div style={{ background: 'var(--warm-white)', borderRadius: 8, padding: '12px 16px' }}>
								<div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
									Invoice Details
								</div>
								{[
									{ label: 'Invoice No',  value: invoiceNo },
									{ label: 'Invoice Date', value: fmtDate(saleDate + 'T12:00:00') },
									{ label: 'Line Items',  value: `${items.length} item${items.length !== 1 ? 's' : ''}` },
									{ label: 'Total Crates', value: `${totalCrates} crates` },
								].map(({ label, value }) => (
									<div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 3 }}>
										<span style={{ color: 'var(--text-muted)' }}>{label}</span>
										<span style={{ fontWeight: 600 }}>{value}</span>
									</div>
								))}
							</div>
						</div>

						{/* Line items table */}
						<div style={{ marginBottom: 16, overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
								<thead>
									<tr style={{ background: 'var(--warm-white)' }}>
										{[
											['#',           'center', 36],
											['Description', 'left',   null],
											['Qty (crates)', 'right', 100],
											['Unit Price',  'right',  110],
											['Amount',      'right',  110],
										].map(([h, align, w]) => (
											<th key={h} style={{
												padding: '9px 12px',
												textAlign: align,
												fontSize: '0.71rem',
												textTransform: 'uppercase',
												letterSpacing: '.04em',
												color: 'var(--text-muted)',
												borderBottom: '2px solid var(--border)',
												borderTop: '1px solid var(--border)',
												whiteSpace: 'nowrap',
												width: w || undefined,
											}}>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{items.map((item, i) => (
										<tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
											<td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
												{i + 1}
											</td>
											<td style={{ padding: '10px 12px', fontWeight: 500 }}>
												<span style={{ textTransform: 'capitalize' }}>{item.eggSize}</span> Eggs
											</td>
											<td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
												{Number(item.quantity).toLocaleString()}
											</td>
											<td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
												{fmt(item.unitPrice)}
											</td>
											<td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
												{fmt(item.totalAmount || Number(item.quantity) * Number(item.unitPrice))}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr>
										<td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, borderTop: '2px solid var(--border)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
											Total ({totalCrates} crates)
										</td>
										<td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: 'var(--success)', borderTop: '2px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
											{fmt(grandTotal)}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>

						{/* Amount due box */}
						<div style={{
							display: 'flex',
							justifyContent: 'flex-end',
							marginBottom: 20,
						}}>
							<div style={{
								background: 'var(--success-bg)',
								border: '1px solid #a5d6a7',
								borderRadius: 10,
								padding: '14px 20px',
								textAlign: 'right',
								minWidth: 220,
							}}>
								<div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--success)', marginBottom: 4 }}>
									Amount Due
								</div>
								<div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
									{fmt(grandTotal)}
								</div>
							</div>
						</div>

						{/* Notes */}
						{notes && (
							<div style={{
								background: 'var(--warm-white)',
								borderRadius: 8,
								padding: '10px 14px',
								marginBottom: 16,
								fontSize: '0.84rem',
							}}>
								<span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Notes: </span>
								<span style={{ color: 'var(--text-secondary)' }}>{notes}</span>
							</div>
						)}

						{/* Footer */}
						<div style={{
							borderTop: '1px solid var(--border-light)',
							paddingTop: 14,
							display: 'flex',
							justifyContent: 'space-between',
							flexWrap: 'wrap',
							gap: 8,
							fontSize: '0.75rem',
							color: 'var(--text-muted)',
						}}>
							<span>Thank you for your business!</span>
							<span>Printed: {printedAt} · EggTrack Distribution Manager</span>
						</div>
					</div>

					{/* ── Action buttons ── */}
					<div className="invoice-actions" style={{ display: 'flex', gap: 10, marginTop: 20 }}>
						<button className="btn btn-primary" onClick={handlePrint}>
							🖨 Print / Save as PDF
						</button>
						<button className="btn btn-secondary" onClick={onClose}>
							Close
						</button>
					</div>
				</div>
			</Modal>
		</>
	);
}
