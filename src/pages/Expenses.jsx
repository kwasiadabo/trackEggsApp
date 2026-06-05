import { useState } from 'react';
import {
	PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
	BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { expensesApi } from '../services/api';
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
import * as XLSX from 'xlsx';

const CATEGORIES = [
	'Transport',
	'Logistics',
	'Utilities',
	'Maintenance',
	'Salaries',
	'Feed',
	'Other',
];
const EMPTY_FORM = {
	category: 'Transport',
	description: '',
	amount: '',
	expenseDate: '',
};

export default function Expenses() {
	const { isManager, isAdmin } = useAuth();
	const { data, loading, error, reload } = useFetch(() => expensesApi.getAll());
	const { data: summary, reload: reloadSum } = useFetch(() =>
		expensesApi.getSummary(),
	);

	const [showForm, setShowForm] = useState(false);
	const [editItem, setEditItem] = useState(null);
	const [deleteItem, setDeleteItem] = useState(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const [search, setSearch] = useState('');
	const [category, setCategory] = useState('all');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [groupBy, setGroupBy] = useState('none');

	const openCreate = () => {
		setForm(EMPTY_FORM);
		setEditItem(null);
		setShowForm(true);
	};
	const openEdit = (rec) => {
		setForm({
			category: rec.category,
			description: rec.description,
			amount: rec.amount,
			expenseDate: rec.expenseDate?.split('T')[0] || '',
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
				await expensesApi.update(editItem.id, form);
				toast('Expense updated ✓');
			} else {
				await expensesApi.create(form);
				toast('Expense recorded ✓');
			}
			closeForm();
			reload();
			reloadSum();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await expensesApi.remove(deleteItem.id);
			toast('Expense deleted ✓');
			setDeleteItem(null);
			reload();
			reloadSum();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setDeleting(false);
		}
	};

	const grandTotal = data?.reduce((s, e) => s + Number(e.amount), 0) || 0;

	const filteredData = (data || []).filter((e) => {
		const matchesSearch =
			e.description?.toLowerCase().includes(search.toLowerCase()) ||
			e.category?.toLowerCase().includes(search.toLowerCase());

		const matchesCategory = category === 'all' || e.category === category;

		const expenseDate = new Date(e.expenseDate);
		const from = fromDate ? new Date(fromDate) : null;
		const to = toDate ? new Date(toDate) : null;

		const matchesDate =
			(!from || expenseDate >= from) && (!to || expenseDate <= to);

		return matchesSearch && matchesCategory && matchesDate;
	});
	const categories = [...new Set(filteredData.map((e) => e.category))];
	const totalExpenses = filteredData.reduce(
		(sum, e) => sum + Number(e.amount || 0),
		0,
	);

	const groupData = (data) => {
		if (groupBy === 'none') return { all: data };

		return data.reduce((acc, item) => {
			let key = 'unknown';

			if (groupBy === 'category') {
				key = item.category;
			}

			if (groupBy === 'month') {
				key = new Date(item.expenseDate).toLocaleString('default', {
					year: 'numeric',
					month: 'long',
				});
			}

			if (!acc[key]) acc[key] = [];
			acc[key].push(item);

			return acc;
		}, {});
	};

	const groupedData = groupData(filteredData);
	const exportToExcel = () => {
		const exportData = filteredData.map((e) => ({
			Date: fmtDate(e.expenseDate),
			Category: e.category,
			Description: e.description,
			Amount: e.amount,
		}));

		const worksheet = XLSX.utils.json_to_sheet(exportData);
		const workbook = XLSX.utils.book_new();

		XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

		XLSX.writeFile(workbook, `expenses_${Date.now()}.xlsx`);
	};
	return (
		<div>
			{/* Category summary */}
			{summary && (
				<div className="stats-grid" style={{ marginBottom: 24 }}>
					{summary.map((s) => (
						<div key={s.category} className="stat-card brown">
							<div className="label">{s.category}</div>
							<div className="value" style={{ fontSize: '1.2rem' }}>
								{fmt(s.total)}
							</div>
							<div className="sub">
								{s.count} transaction{s.count !== 1 ? 's' : ''}
							</div>
						</div>
					))}
					<div className="stat-card red">
						<div className="label">Grand Total</div>
						<div className="value" style={{ fontSize: '1.2rem' }}>
							{fmt(grandTotal)}
						</div>
						<div className="sub">all expenses</div>
					</div>
				</div>
			)}

			{/* ── Charts ── */}
			{summary && summary.length > 0 && (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>

					{/* Pie chart */}
					<div className="card">
						<div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '0.95rem', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
							🥧 Expenses by Category
						</div>
						<ResponsiveContainer width="100%" height={260}>
							<PieChart>
								<Pie
									data={summary}
									dataKey="total"
									nameKey="category"
									cx="50%" cy="50%"
									outerRadius={90}
									label={({ category, percent }) =>
										`${category} ${(percent * 100).toFixed(0)}%`
									}
									labelLine={false}
								>
									{summary.map((_, i) => (
										<Cell
											key={i}
											fill={[
												'#d4750a','#3d2008','#2e7d32','#1565c0',
												'#7a4520','#c62828','#e65100','#6a1b9a',
											][i % 8]}
										/>
									))}
								</Pie>
								<Tooltip
									formatter={(v) => [`GH₵ ${Number(v).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`, 'Amount']}
								/>
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					</div>

					{/* Bar chart */}
					<div className="card">
						<div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '0.95rem', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
							📊 Category Comparison
						</div>
						<ResponsiveContainer width="100%" height={260}>
							<BarChart data={summary} margin={{ top: 4, right: 8, left: 8, bottom: 40 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
								<XAxis
									dataKey="category"
									tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
									angle={-35}
									textAnchor="end"
									interval={0}
								/>
								<YAxis
									tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
									tickFormatter={(v) => `₵${(v / 1000).toFixed(0)}k`}
									width={44}
								/>
								<Tooltip
									formatter={(v) => [`GH₵ ${Number(v).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`, 'Amount']}
								/>
								<Bar dataKey="total" name="Amount" radius={[4, 4, 0, 0]}>
									{summary.map((_, i) => (
										<Cell
											key={i}
											fill={[
												'#d4750a','#3d2008','#2e7d32','#1565c0',
												'#7a4520','#c62828','#e65100','#6a1b9a',
											][i % 8]}
										/>
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			<PrintHeader title="Expense History" />
			<div className="section-header">
				<span className="section-title">💸 Expense History</span>
				<div className="no-print" style={{ display: 'flex', gap: 8 }}>
					<button className="btn btn-secondary" onClick={() => window.print()} style={{ whiteSpace: 'nowrap' }}>🖨 Print</button>
					{isManager && (
						<button className="btn btn-primary" onClick={openCreate}>+ Record Expense</button>
					)}
				</div>
			</div>

			<div className="card">
				{loading ? (
					<Loading />
				) : error ? (
					<ErrorMsg message={error} />
				) : !data?.length ? (
					<Empty message="No expenses yet." />
				) : (
					<div className="table-wrap">
						<div
							className="no-print"
							style={{
								display: 'flex',
								gap: '10px',
								flexWrap: 'wrap',
								marginBottom: '12px',
							}}
						>
							{/* Search */}
							<input
								type="text"
								placeholder="Search description or category..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid #ddd',
									borderRadius: '6px',
									width: '220px',
								}}
							/>

							{/* Category */}
							<select
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid #ddd',
									borderRadius: '6px',
								}}
							>
								<option value="all">All Categories</option>
								{categories.map((c, i) => (
									<option key={i} value={c}>
										{c}
									</option>
								))}
							</select>

							{/* From date */}
							<input
								type="date"
								value={fromDate}
								onChange={(e) => setFromDate(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid #ddd',
									borderRadius: '6px',
								}}
							/>

							{/* To date */}
							<input
								type="date"
								value={toDate}
								onChange={(e) => setToDate(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid #ddd',
									borderRadius: '6px',
								}}
							/>

							{/* Reset */}
							<button
								onClick={() => {
									setSearch('');
									setCategory('all');
									setFromDate('');
									setToDate('');
								}}
								className="btn btn-secondary"
							>
								Reset
							</button>
							<select
								value={groupBy}
								onChange={(e) => setGroupBy(e.target.value)}
								style={{
									padding: '8px 12px',
									border: '1px solid #ddd',
									borderRadius: '6px',
								}}
							>
								<option value="none">No Grouping</option>
								<option value="category">Group by Category</option>
								<option value="month">Group by Month</option>
							</select>
							<button
								onClick={exportToExcel}
								className="btn btn-secondary"
								style={{
									padding: '8px 12px',
									border: '1px solid #ddd',
									borderRadius: '6px',
								}}
							>
								Export Excel
							</button>
						</div>
						<table>
							<thead>
								<tr>
									<th>Date</th>
									<th>Category</th>
									<th>Description</th>
									<th className="text-right">Amount</th>
									{isManager && <th style={{ width: 90 }}>Actions</th>}
								</tr>
							</thead>
							<tbody>
								{Object.entries(groupedData).map(([group, items]) => (
									<>
										{/* Group Header Row */}
										{groupBy !== 'none' && (
											<tr style={{ background: '#eee', fontWeight: 700 }}>
												<td colSpan="5">{group}</td>
											</tr>
										)}

										{/* Items */}
										{items.map((e) => (
											<tr key={e.id}>
												<td>{fmtDate(e.expenseDate)}</td>
												<td>
													<span className="badge badge-brown">
														{e.category}
													</span>
												</td>
												<td>{e.description}</td>
												<td
													className="text-right amount"
													style={{ color: 'var(--danger)' }}
												>
													{fmt(e.amount)}
												</td>

												{isManager && (
													<td>
														<div style={{ display: 'flex', gap: 6 }}>
															<button
																className="btn btn-secondary"
																onClick={() => openEdit(e)}
															>
																Edit
															</button>
															{isAdmin && (
																<button
																	className="btn btn-danger"
																	onClick={() => setDeleteItem(e)}
																>
																	Del
																</button>
															)}
														</div>
													</td>
												)}
											</tr>
										))}
									</>
								))}
							</tbody>
							<tfoot>
								<tr style={{ background: '#f8f9fa', fontWeight: 700 }}>
									<td colSpan="3" style={{ textAlign: 'right' }}>
										Total Expenses:
									</td>

									<td
										className="text-right amount"
										style={{ color: 'var(--danger)' }}
									>
										{fmt(totalExpenses)}
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
					title={editItem ? '✏ Edit Expense' : '💸 Record Expense'}
					onClose={closeForm}
				>
					<form onSubmit={handleSubmit}>
						<div className="form-grid">
							<div className="form-group">
								<label>Category *</label>
								<select
									name="category"
									value={form.category}
									onChange={handleChange}
									required
								>
									{CATEGORIES.map((c) => (
										<option key={c} value={c}>
											{c}
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
							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label>Description *</label>
								<input
									name="description"
									value={form.description}
									onChange={handleChange}
									required
								/>
							</div>
							<div className="form-group">
								<label>Date</label>
								<input
									name="expenseDate"
									type="date"
									value={form.expenseDate}
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
					message={`Delete "${deleteItem.description}" (${fmt(deleteItem.amount)})?`}
					onConfirm={handleDelete}
					onCancel={() => setDeleteItem(null)}
					loading={deleting}
				/>
			)}
		</div>
	);
}
