import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
	{ to: '/', icon: '📊', label: 'Dashboard' },
	{ to: '/purchases', icon: '🚚', label: 'Farm Purchases' },
	{ to: '/inventory', icon: '📦', label: 'Inventory/Stock' },
	{ to: '/sales', icon: '🛒', label: 'Sales' },
	{ to: '/customers', icon: '👥', label: 'Customers' },
	{ to: '/payments', icon: '💳', label: 'Payments' },
	{ to: '/debtors', icon: '⚠️', label: 'Debtors' },
	{ to: '/expenses', icon: '💸', label: 'Expenses' },
	{ to: '/statement', icon: '📄', label: 'Customer Statement' },
	{ to: '/bank', icon: '🏦', label: 'Bank Ledger', managerOnly: true },
	{ to: '/users', icon: '🔐', label: 'Users', adminOnly: true },
	{
		to: '/mail-recipients',
		icon: '📧',
		label: 'Mail Recipients',
		adminOnly: true,
	},
	{ to: '/farm-setup', icon: '🏡', label: 'Farm Setup', managerOnly: true },
];

const ROLE_COLORS = { admin: '#d4750a', manager: '#2e7d32', viewer: '#1565c0' };

export default function Sidebar({ open, onClose }) {
	const { user, logout, isAdmin, isManager } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		await logout();
		onClose?.();
		navigate('/login');
	};

	const handleNavClick = () => {
		onClose?.();
	};

	return (
		<>
			{/* Backdrop overlay — mobile only */}
			{open && (
				<div
					className="sidebar-backdrop"
					onClick={onClose}
					aria-hidden="true"
				/>
			)}

			<aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
				{/* Brand + mobile close button */}
				<div className="sidebar-brand">
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}
					>
						<h1>🥚 EggTrack</h1>
						<button
							className="sidebar-close-btn"
							onClick={onClose}
							aria-label="Close menu"
						>
							✕
						</button>
					</div>
					<p>Distribution Manager</p>
				</div>

				<nav className="sidebar-nav">
					{links
						.filter(
							(l) => (!l.adminOnly || isAdmin) && (!l.managerOnly || isManager),
						)
						.map(({ to, icon, label }) => (
							<NavLink
								key={to}
								to={to}
								end={to === '/'}
								className={({ isActive }) =>
									`nav-link${isActive ? ' active' : ''}`
								}
								onClick={handleNavClick}
							>
								<span className="nav-icon">{icon}</span>
								{label}
							</NavLink>
						))}
				</nav>

				{/* User info */}
				{user && (
					<div className="sidebar-user">
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 10,
								marginBottom: 10,
							}}
						>
							<div
								style={{
									width: 34,
									height: 34,
									borderRadius: '50%',
									background: ROLE_COLORS[user.role] || 'var(--amber)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: '0.9rem',
									fontWeight: 700,
									color: '#fff',
									flexShrink: 0,
								}}
							>
								{user.name?.charAt(0).toUpperCase()}
							</div>
							<div style={{ overflow: 'hidden', flex: 1 }}>
								<div
									style={{
										fontSize: '0.85rem',
										fontWeight: 600,
										color: '#fff',
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
								>
									{user.name}
								</div>
								<div
									style={{
										fontSize: '0.7rem',
										color: 'rgba(255,255,255,0.4)',
										textTransform: 'uppercase',
										letterSpacing: '0.05em',
									}}
								>
									{user.role}
								</div>
							</div>
						</div>
						<NavLink
							to="/change-password"
							className={({ isActive }) =>
								`nav-link${isActive ? ' active' : ''}`
							}
							onClick={handleNavClick}
							style={{ marginBottom: 6, fontSize: '0.82rem' }}
						>
							<span className="nav-icon">🔑</span>
							Change Password
						</NavLink>
						<button className="sidebar-logout-btn" onClick={handleLogout}>
							<span>↩</span> Sign out
						</button>
					</div>
				)}

				<div className="sidebar-footer">
					EggTrack v1.0 · {new Date().getFullYear()}
				</div>
			</aside>
		</>
	);
}
