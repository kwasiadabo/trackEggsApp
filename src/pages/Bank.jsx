import { useState, useRef, useEffect } from 'react';
import { bankApi } from '../services/api';
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

function SearchableSelect({ options, value, onChange, placeholder = 'Search…', required }) {
	const [query, setQuery] = useState('');
	const [open, setOpen] = useState(false);
	const wrapRef = useRef(null);

	const filtered = options.filter((o) =>
		o.toLowerCase().includes(query.toLowerCase()),
	);

	useEffect(() => {
		const fn = (e) => {
			if (!wrapRef.current?.contains(e.target)) {
				setOpen(false);
				setQuery('');
			}
		};
		document.addEventListener('mousedown', fn);
		return () => document.removeEventListener('mousedown', fn);
	}, []);

	const select = (opt) => {
		onChange(opt);
		setOpen(false);
		setQuery('');
	};

	return (
		<div ref={wrapRef} style={{ position: 'relative' }}>
			<div
				onClick={() => setOpen((o) => !o)}
				style={{
					padding: '8px 12px',
					border: '1px solid var(--border)',
					borderRadius: 8,
					background: '#fff',
					cursor: 'pointer',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					fontSize: '0.9rem',
					color: value ? 'inherit' : 'var(--text-muted)',
					minHeight: 38,
				}}
			>
				<span>{value || placeholder}</span>
				<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 8 }}>
					{open ? '▲' : '▼'}
				</span>
			</div>

			{open && (
				<div
					style={{
						position: 'absolute',
						top: 'calc(100% + 4px)',
						left: 0,
						right: 0,
						zIndex: 200,
						background: '#fff',
						border: '1px solid var(--border)',
						borderRadius: 8,
						boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
					}}
				>
					<input
						autoFocus
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Type to search…"
						style={{
							width: '100%',
							border: 'none',
							borderBottom: '1px solid var(--border)',
							padding: '8px 12px',
							fontSize: '0.875rem',
							outline: 'none',
							borderRadius: '8px 8px 0 0',
							boxSizing: 'border-box',
						}}
					/>
					<div style={{ maxHeight: 200, overflowY: 'auto' }}>
						{filtered.length ? (
							filtered.map((opt) => (
								<div
									key={opt}
									onMouseDown={() => select(opt)}
									style={{
										padding: '8px 12px',
										cursor: 'pointer',
										fontSize: '0.875rem',
										background: opt === value ? 'var(--cream)' : undefined,
										fontWeight: opt === value ? 600 : undefined,
									}}
									onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cream)')}
									onMouseLeave={(e) =>
										(e.currentTarget.style.background =
											opt === value ? 'var(--cream)' : '')
									}
								>
									{opt}
								</div>
							))
						) : (
							<div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
								No banks found
							</div>
						)}
					</div>
				</div>
			)}

			{/* Invisible input so the browser enforces `required` on the form */}
			<input
				tabIndex={-1}
				style={{ opacity: 0, height: 0, position: 'absolute', pointerEvents: 'none' }}
				value={value}
				onChange={() => {}}
				required={required}
			/>
		</div>
	);
}

const GHANA_BANKS = [
	'Absa Bank Ghana',
	'Access Bank Ghana',
	'Agricultural Development Bank (ADB)',
	'Cal Bank',
	'Consolidated Bank Ghana (CBG)',
	'Ecobank Ghana',
	'FBN Bank Ghana',
	'Fidelity Bank Ghana',
	'First Atlantic Bank',
	'First National Bank Ghana',
	'GCB Bank',
	'Ghana Commercial Bank',
	'Guaranty Trust Bank Ghana',
	'National Investment Bank (NIB)',
	'OmniBSIC Bank',
	'Prudential Bank',
	'Republic Bank Ghana',
	'Societe Generale Ghana',
	'Stanbic Bank Ghana',
	'Standard Chartered Bank Ghana',
	'United Bank for Africa (UBA)',
	'Universal Merchant Bank (UMB)',
	'Zenith Bank Ghana',
];

const EMPTY_ACCOUNT = {
	bankName: '',
	accountName: '',
	accountNumber: '',
	branch: '',
};
const EMPTY_DEPOSIT = {
	bankAccountId: '',
	amount: '',
	description: '',
	reference: '',
	transactionDate: '',
};
const EMPTY_WITHDRAWAL = {
	bankAccountId: '',
	amount: '',
	description: '',
	reference: '',
	transactionDate: '',
};

function statusBadge(type, status) {
	if (type === 'deposit')
		return <span className="badge badge-green">Deposit</span>;
	if (status === 'approved')
		return <span className="badge badge-red">Withdrawn</span>;
	if (status === 'pending')
		return <span className="badge badge-amber">Pending Approval</span>;
	return <span className="badge badge-brown">Rejected</span>;
}

export default function Bank() {
	const { isAdmin, isManager } = useAuth();
	const [tab, setTab] = useState('accounts');

	// ── Data ──────────────────────────────────────────────────────────────────
	const {
		data: accounts,
		loading: loadAcc,
		error: errAcc,
		reload: reloadAcc,
	} = useFetch(() => bankApi.getAccounts());
	const {
		data: transactions,
		loading: loadTx,
		error: errTx,
		reload: reloadTx,
	} = useFetch(() => bankApi.getTransactions());

	console.log(accounts);

	// ── Account form state ────────────────────────────────────────────────────
	const [showAccount, setShowAccount] = useState(false);
	const [editAccount, setEditAccount] = useState(null);
	const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);
	const [savingAcc, setSavingAcc] = useState(false);

	// ── Transaction form state ─────────────────────────────────────────────────
	const [showDeposit, setShowDeposit] = useState(false);
	const [showWithdrawal, setShowWithdrawal] = useState(false);
	const [depositForm, setDepositForm] = useState(EMPTY_DEPOSIT);
	const [withdrawalForm, setWithdrawalForm] = useState(EMPTY_WITHDRAWAL);
	const [savingTx, setSavingTx] = useState(false);

	// ── Reject modal state ────────────────────────────────────────────────────
	const [rejectTarget, setRejectTarget] = useState(null);
	const [rejectNote, setRejectNote] = useState('');
	const [savingReject, setSavingReject] = useState(false);

	// ── Filters ───────────────────────────────────────────────────────────────
	const [filterAccount, setFilterAccount] = useState('');
	const [filterType, setFilterType] = useState('');
	const [filterStatus, setFilterStatus] = useState('');

	if (!isManager)
		return (
			<div className="card" style={{ textAlign: 'center', padding: 48 }}>
				<div style={{ fontSize: '2.5rem' }}>🔒</div>
				<p style={{ marginTop: 12, color: 'var(--text-muted)' }}>
					Manager or Admin access required.
				</p>
			</div>
		);

	// ── Computed stats ────────────────────────────────────────────────────────
	const totalBalance = (accounts || []).reduce(
		(s, a) => s + Number(a.balance || 0),
		0,
	);
	const approved = (transactions || []).filter((t) => t.status === 'approved');
	const totalDeposits = approved
		.filter((t) => t.type === 'deposit')
		.reduce((s, t) => s + Number(t.amount), 0);
	const totalWithdrawn = approved
		.filter((t) => t.type === 'withdrawal')
		.reduce((s, t) => s + Number(t.amount), 0);
	const pendingCount = (transactions || []).filter(
		(t) => t.status === 'pending',
	).length;

	const filteredTx = (transactions || []).filter((t) => {
		if (filterAccount && String(t.bankAccountId) !== String(filterAccount))
			return false;
		if (filterType && t.type !== filterType) return false;
		if (filterStatus && t.status !== filterStatus) return false;
		return true;
	});

	// ── Account handlers ──────────────────────────────────────────────────────
	const openCreateAccount = () => {
		setAccountForm(EMPTY_ACCOUNT);
		setEditAccount(null);
		setShowAccount(true);
	};
	const openEditAccount = (a) => {
		setAccountForm({
			bankName: a.bankName,
			accountName: a.accountName,
			accountNumber: a.accountNumber,
			branch: a.branch || '',
		});
		setEditAccount(a);
		setShowAccount(true);
	};

	const handleAccountSubmit = async (e) => {
		e.preventDefault();
		setSavingAcc(true);
		try {
			if (editAccount) {
				await bankApi.updateAccount(editAccount.id, accountForm);
				toast('Account updated ✓');
			} else {
				await bankApi.createAccount(accountForm);
				toast('Bank account added ✓');
			}
			setShowAccount(false);
			setEditAccount(null);
			reloadAcc();
			reloadTx();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setSavingAcc(false);
		}
	};

	// ── Deposit handler ───────────────────────────────────────────────────────
	const handleDepositSubmit = async (e) => {
		e.preventDefault();
		setSavingTx(true);
		try {
			await bankApi.deposit({
				...depositForm,
				bankAccountId: Number(depositForm.bankAccountId),
				amount: Number(depositForm.amount),
			});
			toast('Deposit recorded ✓');
			setShowDeposit(false);
			setDepositForm(EMPTY_DEPOSIT);
			reloadAcc();
			reloadTx();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setSavingTx(false);
		}
	};

	// ── Withdrawal handler ────────────────────────────────────────────────────
	const handleWithdrawalSubmit = async (e) => {
		e.preventDefault();
		setSavingTx(true);
		try {
			const res = await bankApi.withdrawal({
				...withdrawalForm,
				bankAccountId: Number(withdrawalForm.bankAccountId),
				amount: Number(withdrawalForm.amount),
			});
			const msg =
				res.data.data?.status === 'pending'
					? 'Withdrawal request submitted — awaiting admin approval ✓'
					: 'Withdrawal recorded ✓';
			toast(msg);
			setShowWithdrawal(false);
			setWithdrawalForm(EMPTY_WITHDRAWAL);
			reloadAcc();
			reloadTx();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setSavingTx(false);
		}
	};

	// ── Approve / Reject ──────────────────────────────────────────────────────
	const handleApprove = async (id) => {
		try {
			await bankApi.approve(id);
			toast('Withdrawal approved ✓');
			reloadAcc();
			reloadTx();
		} catch (err) {
			toast(err.message, 'error');
		}
	};

	const handleRejectSubmit = async () => {
		setSavingReject(true);
		try {
			await bankApi.reject(rejectTarget.id, { rejectionNote: rejectNote });
			toast('Withdrawal rejected');
			setRejectTarget(null);
			setRejectNote('');
			reloadAcc();
			reloadTx();
		} catch (err) {
			toast(err.message, 'error');
		} finally {
			setSavingReject(false);
		}
	};

	const activeAccounts = (accounts || []).filter((a) => a.isActive);

	return (
		<div>
			<PrintHeader title="Bank Ledger" />

			{/* ── Tab bar ── */}
			<div className="section-header" style={{ marginBottom: 0 }}>
				<span className="section-title">🏦 Bank Ledger</span>
				<div className="no-print" style={{ display: 'flex', gap: 8 }}>
					<button
						className="btn btn-secondary"
						onClick={() => window.print()}
						style={{ whiteSpace: 'nowrap' }}
					>
						🖨 Print
					</button>
					{isManager && tab === 'ledger' && (
						<>
							<button
								className="btn btn-secondary"
								onClick={() => {
									setDepositForm(EMPTY_DEPOSIT);
									setShowDeposit(true);
								}}
							>
								+ Deposit
							</button>
							<button
								className="btn btn-primary"
								onClick={() => {
									setWithdrawalForm(EMPTY_WITHDRAWAL);
									setShowWithdrawal(true);
								}}
							>
								↑ Withdraw
							</button>
						</>
					)}
					{isManager && tab === 'accounts' && (
						<button className="btn btn-primary" onClick={openCreateAccount}>
							+ Add Account
						</button>
					)}
				</div>
			</div>

			<div
				className="no-print"
				style={{
					display: 'flex',
					gap: 0,
					marginBottom: 20,
					borderBottom: '2px solid var(--border)',
					marginTop: 4,
				}}
			>
				{['accounts', 'ledger'].map((t) => (
					<button
						key={t}
						onClick={() => setTab(t)}
						style={{
							padding: '9px 22px',
							background: 'none',
							border: 'none',
							borderBottom:
								tab === t ? '2px solid var(--amber)' : '2px solid transparent',
							marginBottom: -2,
							fontWeight: tab === t ? 700 : 400,
							color: tab === t ? 'var(--amber-dark)' : 'var(--text-secondary)',
							fontSize: '0.9rem',
							cursor: 'pointer',
							textTransform: 'capitalize',
						}}
					>
						{t === 'accounts' ? '🏛 Accounts' : '📋 Ledger'}
					</button>
				))}
			</div>

			{/* ── Pending approvals banner (admin only) ── */}
			{isAdmin && pendingCount > 0 && tab === 'ledger' && (
				<div
					style={{
						background: 'var(--warning-bg)',
						border: '1px solid #fed7aa',
						borderRadius: 10,
						padding: '12px 18px',
						marginBottom: 16,
						display: 'flex',
						alignItems: 'center',
						gap: 10,
					}}
				>
					<span style={{ fontSize: '1.2rem' }}>⚠️</span>
					<span
						style={{
							fontSize: '0.9rem',
							color: 'var(--warning)',
							fontWeight: 600,
						}}
					>
						{pendingCount} withdrawal request{pendingCount > 1 ? 's' : ''}{' '}
						awaiting your approval
					</span>
				</div>
			)}

			{/* ══════════════ ACCOUNTS TAB ══════════════ */}
			{tab === 'accounts' && (
				<>
					{/* Stats */}
					{!loadAcc && !errAcc && accounts && (
						<div
							className="stats-grid"
							style={{
								marginBottom: 16,
								gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
							}}
						>
							<div className="stat-card amber">
								<div className="label">Accounts</div>
								<div className="value">{accounts.length}</div>
								<div className="sub">{activeAccounts.length} active</div>
							</div>
							<div className="stat-card green">
								<div className="label">Total Balance</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(totalBalance)}
								</div>
								<div className="sub">across all accounts</div>
							</div>
							<div className="stat-card brown">
								<div className="label">Total Deposited</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(totalDeposits)}
								</div>
								<div className="sub">approved</div>
							</div>
							<div className="stat-card red">
								<div className="label">Total Withdrawn</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(totalWithdrawn)}
								</div>
								<div className="sub">approved</div>
							</div>
						</div>
					)}

					<div className="card">
						{loadAcc ? (
							<Loading />
						) : errAcc ? (
							<ErrorMsg message={errAcc} />
						) : !accounts?.length ? (
							<Empty message="No bank accounts set up yet. Add one to start tracking deposits and withdrawals." />
						) : (
							<div className="table-wrap">
								<table>
									<thead>
										<tr>
											<th>#</th>
											<th>Bank</th>
											<th>Account Name</th>
											<th>Account Number</th>
											<th>Branch</th>
											<th className="text-right">Balance</th>
											{isAdmin && <th>Status</th>}
											{isAdmin && (
												<th className="no-print" style={{ width: 80 }}>
													Actions
												</th>
											)}
										</tr>
									</thead>
									<tbody>
										{accounts.map((a, i) => (
											<tr key={a.id}>
												<td
													style={{
														color: 'var(--text-muted)',
														fontSize: '0.82rem',
													}}
												>
													{i + 1}
												</td>
												<td style={{ fontWeight: 600 }}>{a.bankName}</td>
												<td>{a.accountName}</td>
												<td
													style={{
														fontFamily: 'monospace',
														fontSize: '0.9rem',
													}}
												>
													{a.accountNumber}
												</td>
												<td
													style={{
														color: 'var(--text-muted)',
														fontSize: '0.85rem',
													}}
												>
													{a.branch || '—'}
												</td>
												<td
													className="text-right amount"
													style={{
														fontWeight: 700,
														color:
															Number(a.balance) >= 0
																? 'var(--success)'
																: 'var(--danger)',
													}}
												>
													{fmt(a.balance)}
												</td>
												{isAdmin && (
													<td>
														<span
															className={`badge ${a.isActive ? 'badge-green' : 'badge-brown'}`}
														>
															{a.isActive ? 'Active' : 'Inactive'}
														</span>
													</td>
												)}
												{isAdmin && (
													<td className="no-print">
														<button
															className="btn btn-secondary"
															style={{
																padding: '3px 10px',
																fontSize: '0.76rem',
															}}
															onClick={() => openEditAccount(a)}
														>
															✏ Edit
														</button>
													</td>
												)}
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr>
											<td
												colSpan={isAdmin ? 5 : 5}
												style={{
													textAlign: 'right',
													fontWeight: 700,
													fontSize: '0.8rem',
													color: 'var(--text-secondary)',
													textTransform: 'uppercase',
													paddingTop: 10,
												}}
											>
												Net Balance
											</td>
											<td
												className="text-right amount"
												style={{
													fontWeight: 700,
													paddingTop: 10,
													color:
														totalBalance >= 0
															? 'var(--success)'
															: 'var(--danger)',
												}}
											>
												{fmt(totalBalance)}
											</td>
											{isAdmin && <td colSpan={2} />}
										</tr>
									</tfoot>
								</table>
							</div>
						)}
					</div>
				</>
			)}

			{/* ══════════════ LEDGER TAB ══════════════ */}
			{tab === 'ledger' && (
				<>
					{/* Stats */}
					{!loadTx && !errTx && transactions && (
						<div
							className="stats-grid"
							style={{
								marginBottom: 16,
								gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
							}}
						>
							<div className="stat-card green">
								<div className="label">Total Deposited</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(totalDeposits)}
								</div>
								<div className="sub">approved deposits</div>
							</div>
							<div className="stat-card red">
								<div className="label">Total Withdrawn</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(totalWithdrawn)}
								</div>
								<div className="sub">approved withdrawals</div>
							</div>
							<div className="stat-card amber">
								<div className="label">Net Balance</div>
								<div className="value" style={{ fontSize: '1.1rem' }}>
									{fmt(totalBalance)}
								</div>
								<div className="sub">across all accounts</div>
							</div>
							<div className="stat-card brown">
								<div className="label">Pending</div>
								<div className="value">{pendingCount}</div>
								<div className="sub">awaiting approval</div>
							</div>
						</div>
					)}

					{/* Filters */}
					<div
						className="no-print card"
						style={{ marginBottom: 12, padding: '12px 16px' }}
					>
						<div
							style={{
								display: 'flex',
								gap: 10,
								flexWrap: 'wrap',
								alignItems: 'center',
							}}
						>
							<select
								value={filterAccount}
								onChange={(e) => setFilterAccount(e.target.value)}
								style={{
									padding: '6px 10px',
									borderRadius: 7,
									border: '1px solid var(--border)',
									fontSize: '0.85rem',
									background: '#fff',
								}}
							>
								<option value="">All accounts</option>
								{(accounts || []).map((a) => (
									<option key={a.id} value={a.id}>
										{a.accountName} — {a.bankName}
									</option>
								))}
							</select>
							<select
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
								style={{
									padding: '6px 10px',
									borderRadius: 7,
									border: '1px solid var(--border)',
									fontSize: '0.85rem',
									background: '#fff',
								}}
							>
								<option value="">All types</option>
								<option value="deposit">Deposits</option>
								<option value="withdrawal">Withdrawals</option>
							</select>
							<select
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								style={{
									padding: '6px 10px',
									borderRadius: 7,
									border: '1px solid var(--border)',
									fontSize: '0.85rem',
									background: '#fff',
								}}
							>
								<option value="">All statuses</option>
								<option value="approved">Approved</option>
								<option value="pending">Pending</option>
								<option value="rejected">Rejected</option>
							</select>
							{(filterAccount || filterType || filterStatus) && (
								<button
									className="btn btn-secondary"
									style={{ padding: '5px 12px', fontSize: '0.82rem' }}
									onClick={() => {
										setFilterAccount('');
										setFilterType('');
										setFilterStatus('');
									}}
								>
									Clear
								</button>
							)}
							<span
								style={{
									marginLeft: 'auto',
									fontSize: '0.82rem',
									color: 'var(--text-muted)',
								}}
							>
								{filteredTx.length} transaction
								{filteredTx.length !== 1 ? 's' : ''}
							</span>
						</div>
					</div>

					<div className="card">
						{loadTx ? (
							<Loading />
						) : errTx ? (
							<ErrorMsg message={errTx} />
						) : !filteredTx.length ? (
							<Empty message="No transactions yet." />
						) : (
							<div className="table-wrap">
								<table>
									<thead>
										<tr>
											<th>Date</th>
											<th>Account</th>
											<th>Type / Status</th>
											<th className="text-right">Amount</th>
											<th>Description</th>
											<th>Reference</th>
											<th>Initiated By</th>
											{isAdmin && (
												<th className="no-print" style={{ width: 160 }}>
													Actions
												</th>
											)}
										</tr>
									</thead>
									<tbody>
										{filteredTx.map((t) => (
											<tr
												key={t.id}
												style={{
													background:
														t.status === 'pending'
															? 'var(--warning-bg)'
															: undefined,
												}}
											>
												<td
													style={{
														whiteSpace: 'nowrap',
														fontSize: '0.83rem',
														color: 'var(--text-muted)',
													}}
												>
													{fmtDate(t.transactionDate)}
												</td>
												<td>
													<div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
														{t.accountName}
													</div>
													<div
														style={{
															fontSize: '0.75rem',
															color: 'var(--text-muted)',
														}}
													>
														{t.bankName}
													</div>
												</td>
												<td>{statusBadge(t.type, t.status)}</td>
												<td
													className={`text-right amount ${t.type === 'deposit' ? '' : 'text-danger'}`}
													style={{
														fontWeight: 700,
														color:
															t.type === 'deposit'
																? 'var(--success)'
																: 'var(--danger)',
													}}
												>
													{t.type === 'withdrawal' ? '−' : '+'}
													{fmt(t.amount)}
												</td>
												<td
													style={{
														color: 'var(--text-secondary)',
														fontSize: '0.85rem',
														maxWidth: 180,
													}}
												>
													{t.description || '—'}
												</td>
												<td
													style={{
														fontFamily: 'monospace',
														fontSize: '0.8rem',
														color: 'var(--text-muted)',
													}}
												>
													{t.reference || '—'}
												</td>
												<td
													style={{
														fontSize: '0.82rem',
														color: 'var(--text-secondary)',
													}}
												>
													{t.initiatedByName}
												</td>
												{isAdmin && (
													<td className="no-print">
														{t.status === 'pending' ? (
															<div style={{ display: 'flex', gap: 5 }}>
																<button
																	className="btn btn-primary"
																	style={{
																		padding: '3px 10px',
																		fontSize: '0.75rem',
																	}}
																	onClick={() => handleApprove(t.id)}
																>
																	✓ Approve
																</button>
																<button
																	className="btn btn-danger"
																	style={{
																		padding: '3px 10px',
																		fontSize: '0.75rem',
																	}}
																	onClick={() => {
																		setRejectTarget(t);
																		setRejectNote('');
																	}}
																>
																	✕ Reject
																</button>
															</div>
														) : t.status === 'rejected' ? (
															<span
																style={{
																	fontSize: '0.78rem',
																	color: 'var(--text-muted)',
																}}
																title={t.rejectionNote || ''}
															>
																Rejected by {t.approvedByName}
															</span>
														) : (
															<span
																style={{
																	fontSize: '0.78rem',
																	color: 'var(--text-muted)',
																}}
															>
																{t.approvedByName
																	? `by ${t.approvedByName}`
																	: '—'}
															</span>
														)}
													</td>
												)}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</>
			)}

			{/* ── Add / Edit Account Modal ── */}
			{showAccount && (
				<Modal
					title={editAccount ? '✏ Edit Bank Account' : '🏛 Add Bank Account'}
					onClose={() => {
						setShowAccount(false);
						setEditAccount(null);
					}}
					width={460}
				>
					<form onSubmit={handleAccountSubmit}>
						<div className="form-grid">
							<div className="form-group">
								<label>Bank Name *</label>
								<SearchableSelect
									options={GHANA_BANKS}
									value={accountForm.bankName}
									onChange={(val) =>
										setAccountForm((p) => ({ ...p, bankName: val }))
									}
									placeholder="— Select bank —"
									required
								/>
							</div>
							<div className="form-group">
								<label>Account Name *</label>
								<input
									value={accountForm.accountName}
									onChange={(e) =>
										setAccountForm((p) => ({
											...p,
											accountName: e.target.value,
										}))
									}
									placeholder="e.g. Main Operations"
									required
								/>
							</div>
							<div className="form-group">
								<label>Account Number *</label>
								<input
									value={accountForm.accountNumber}
									onChange={(e) =>
										setAccountForm((p) => ({
											...p,
											accountNumber: e.target.value,
										}))
									}
									placeholder="e.g. 1234567890"
									required
								/>
							</div>
							<div className="form-group">
								<label>Branch</label>
								<input
									value={accountForm.branch}
									onChange={(e) =>
										setAccountForm((p) => ({ ...p, branch: e.target.value }))
									}
									placeholder="e.g. Accra Main"
								/>
							</div>
						</div>
						{editAccount && (
							<label
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 10,
									marginTop: 14,
									cursor: 'pointer',
									fontSize: '0.875rem',
									fontWeight: 500,
								}}
							>
								<input
									type="checkbox"
									checked={!!accountForm.isActive}
									onChange={(e) =>
										setAccountForm((p) => ({
											...p,
											isActive: e.target.checked,
										}))
									}
									style={{
										width: 16,
										height: 16,
										accentColor: 'var(--success)',
									}}
								/>
								Active — account available for deposits and withdrawals
							</label>
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
								type="button"
								className="btn btn-secondary"
								onClick={() => {
									setShowAccount(false);
									setEditAccount(null);
								}}
							>
								Cancel
							</button>
							<button
								type="submit"
								className="btn btn-primary"
								disabled={savingAcc}
							>
								{savingAcc ? 'Saving…' : editAccount ? 'Update' : 'Add Account'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* ── Record Deposit Modal ── */}
			{showDeposit && (
				<Modal
					title="💰 Record Deposit"
					onClose={() => {
						setShowDeposit(false);
						setDepositForm(EMPTY_DEPOSIT);
					}}
					width={440}
				>
					<form onSubmit={handleDepositSubmit}>
						<div className="form-grid">
							<div className="form-group" style={{ gridColumn: '1/-1' }}>
								<label>Bank Account *</label>
								<select
									value={depositForm.bankAccountId}
									onChange={(e) =>
										setDepositForm((p) => ({
											...p,
											bankAccountId: e.target.value,
										}))
									}
									required
								>
									<option value="">— Select account —</option>
									{activeAccounts.map((a) => (
										<option key={a.id} value={a.id}>
											{a.accountName} — {a.bankName} ({fmt(a.balance)})
										</option>
									))}
								</select>
							</div>
							<div className="form-group">
								<label>Amount (GH₵) *</label>
								<input
									type="number"
									min="0.01"
									step="0.01"
									value={depositForm.amount}
									onChange={(e) =>
										setDepositForm((p) => ({ ...p, amount: e.target.value }))
									}
									placeholder="0.00"
									required
								/>
							</div>
							<div className="form-group">
								<label>Date</label>
								<input
									type="date"
									value={depositForm.transactionDate}
									onChange={(e) =>
										setDepositForm((p) => ({
											...p,
											transactionDate: e.target.value,
										}))
									}
								/>
							</div>
							<div className="form-group" style={{ gridColumn: '1/-1' }}>
								<label>Description</label>
								<input
									value={depositForm.description}
									onChange={(e) =>
										setDepositForm((p) => ({
											...p,
											description: e.target.value,
										}))
									}
									placeholder="e.g. Sales collection for Monday"
								/>
							</div>
							<div className="form-group" style={{ gridColumn: '1/-1' }}>
								<label>Reference</label>
								<input
									value={depositForm.reference}
									onChange={(e) =>
										setDepositForm((p) => ({ ...p, reference: e.target.value }))
									}
									placeholder="e.g. SALE-001, INV-20240604-1234"
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
								type="button"
								className="btn btn-secondary"
								onClick={() => {
									setShowDeposit(false);
									setDepositForm(EMPTY_DEPOSIT);
								}}
							>
								Cancel
							</button>
							<button
								type="submit"
								className="btn btn-primary"
								disabled={savingTx}
							>
								{savingTx ? 'Saving…' : 'Record Deposit'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* ── Request Withdrawal Modal ── */}
			{showWithdrawal && (
				<Modal
					title="↑ Request Withdrawal"
					onClose={() => {
						setShowWithdrawal(false);
						setWithdrawalForm(EMPTY_WITHDRAWAL);
					}}
					width={440}
				>
					<form onSubmit={handleWithdrawalSubmit}>
						<div className="form-grid">
							<div className="form-group" style={{ gridColumn: '1/-1' }}>
								<label>Bank Account *</label>
								<select
									value={withdrawalForm.bankAccountId}
									onChange={(e) =>
										setWithdrawalForm((p) => ({
											...p,
											bankAccountId: e.target.value,
										}))
									}
									required
								>
									<option value="">— Select account —</option>
									{activeAccounts.map((a) => (
										<option key={a.id} value={a.id}>
											{a.accountName} — {a.bankName} ({fmt(a.balance)})
										</option>
									))}
								</select>
							</div>
							<div className="form-group">
								<label>Amount (GH₵) *</label>
								<input
									type="number"
									min="0.01"
									step="0.01"
									value={withdrawalForm.amount}
									onChange={(e) =>
										setWithdrawalForm((p) => ({ ...p, amount: e.target.value }))
									}
									placeholder="0.00"
									required
								/>
							</div>
							<div className="form-group">
								<label>Date</label>
								<input
									type="date"
									value={withdrawalForm.transactionDate}
									onChange={(e) =>
										setWithdrawalForm((p) => ({
											...p,
											transactionDate: e.target.value,
										}))
									}
								/>
							</div>
							<div className="form-group" style={{ gridColumn: '1/-1' }}>
								<label>Purpose / Description *</label>
								<input
									value={withdrawalForm.description}
									onChange={(e) =>
										setWithdrawalForm((p) => ({
											...p,
											description: e.target.value,
										}))
									}
									placeholder="Reason for withdrawal"
									required
								/>
							</div>
							<div className="form-group" style={{ gridColumn: '1/-1' }}>
								<label>Reference</label>
								<input
									value={withdrawalForm.reference}
									onChange={(e) =>
										setWithdrawalForm((p) => ({
											...p,
											reference: e.target.value,
										}))
									}
									placeholder="Optional reference number"
								/>
							</div>
						</div>
						{!isAdmin && (
							<div
								style={{
									background: 'var(--warning-bg)',
									border: '1px solid #fed7aa',
									borderRadius: 8,
									padding: '10px 14px',
									marginTop: 10,
									fontSize: '0.82rem',
									color: 'var(--warning)',
								}}
							>
								⚠ Withdrawal requests require admin approval before funds are
								released.
							</div>
						)}
						<div
							style={{
								display: 'flex',
								gap: 10,
								marginTop: 16,
								justifyContent: 'flex-end',
							}}
						>
							<button
								type="button"
								className="btn btn-secondary"
								onClick={() => {
									setShowWithdrawal(false);
									setWithdrawalForm(EMPTY_WITHDRAWAL);
								}}
							>
								Cancel
							</button>
							<button
								type="submit"
								className="btn btn-primary"
								disabled={savingTx}
							>
								{savingTx
									? 'Submitting…'
									: isAdmin
										? 'Withdraw'
										: 'Submit Request'}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* ── Reject Confirmation Modal ── */}
			{rejectTarget && (
				<Modal
					title="✕ Reject Withdrawal"
					onClose={() => {
						setRejectTarget(null);
						setRejectNote('');
					}}
					width={400}
				>
					<p
						style={{
							marginBottom: 16,
							color: 'var(--text-secondary)',
							fontSize: '0.9rem',
						}}
					>
						Rejecting <strong>{rejectTarget.initiatedByName}</strong>'s
						withdrawal of <strong>{fmt(rejectTarget.amount)}</strong> from{' '}
						<strong>{rejectTarget.accountName}</strong>.
					</p>
					<div className="form-group">
						<label>Rejection reason (optional)</label>
						<input
							value={rejectNote}
							onChange={(e) => setRejectNote(e.target.value)}
							placeholder="e.g. Insufficient documentation"
						/>
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
							onClick={() => {
								setRejectTarget(null);
								setRejectNote('');
							}}
						>
							Cancel
						</button>
						<button
							className="btn btn-danger"
							onClick={handleRejectSubmit}
							disabled={savingReject}
						>
							{savingReject ? 'Rejecting…' : 'Confirm Reject'}
						</button>
					</div>
				</Modal>
			)}
		</div>
	);
}
