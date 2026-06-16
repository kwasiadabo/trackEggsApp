import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
	{ to: '/',          icon: '📊', label: 'Dashboard' },
	{ to: '/purchases', icon: '🚚', label: 'Purchases' },
	{ to: '/inventory', icon: '📦', label: 'Inventory' },
	{ to: '/sales',     icon: '🛒', label: 'Sales' },
	{ to: '/customers', icon: '👥', label: 'Customers' },
	{ to: '/payments',  icon: '💳', label: 'Payments' },
	{ to: '/debtors',   icon: '⏰', label: 'Debtors' },
	{ to: '/expenses',  icon: '💸', label: 'Expenses' },
	{ to: '/bank',      icon: '🏦', label: 'Bank Ledger' },
	{ to: '/statement', icon: '📄', label: 'Statement' },
];

const SETTINGS_LINKS = [
	{ to: '/farm-setup',      icon: '🌾', label: 'Farm Setup',      managerOnly: true },
	{ to: '/mail-recipients', icon: '📧', label: 'Mail Recipients', managerOnly: true },
	{ to: '/change-password', icon: '🔑', label: 'Change Password' },
	{ to: '/users',           icon: '👤', label: 'Users',           adminOnly: true },
];

const ROLE_COLORS = {
	admin:   'var(--amber)',
	manager: 'var(--success)',
	viewer:  '#2563eb',
};

export default function Sidebar({ open, onClose }) {
	const { user, logout, isAdmin, isManager } = useAuth();
	const navigate = useNavigate();

	const [installPrompt, setInstallPrompt] = useState(null);
	const [installed, setInstalled] = useState(false);

	useEffect(() => {
		const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
		window.addEventListener('beforeinstallprompt', handler);
		window.addEventListener('appinstalled', () => setInstalled(true));
		return () => {
			window.removeEventListener('beforeinstallprompt', handler);
		};
	}, []);

	const handleInstall = async () => {
		if (!installPrompt) return;
		installPrompt.prompt();
		const { outcome } = await installPrompt.userChoice;
		if (outcome === 'accepted') setInstalled(true);
		setInstallPrompt(null);
	};

	const handleLogout = async () => {
		await logout();
		navigate('/login');
	};

	const handleNavClick = () => onClose();

	const visibleSettings = SETTINGS_LINKS.filter(
		(l) => (!l.adminOnly || isAdmin) && (!l.managerOnly || isManager),
	);

	return (
		<>
			{open && <div className="sidebar-backdrop" onClick={onClose} />}

			<aside className={`sidebar${open ? ' sidebar-open' : ''}`}>

				{/* Brand */}
				<div className="sidebar-brand">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
						<div>
							<h1>🥚 EggTrack</h1>
							<p>Distribution Manager</p>
						</div>
						<button
							className="sidebar-close-btn"
							onClick={onClose}
							aria-label="Close menu"
						>
							✕
						</button>
					</div>
				</div>

				{/* Navigation */}
				<nav className="sidebar-nav">
					{NAV_LINKS.map(({ to, icon, label }) => (
						<NavLink
							key={to}
							to={to}
							end={to === '/'}
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
							onClick={handleNavClick}
						>
							<span className="nav-icon">{icon}</span>
							{label}
						</NavLink>
					))}

					{visibleSettings.length > 0 && (
						<>
							<div style={{
								height: 1,
								background: 'rgba(255,255,255,.08)',
								margin: '10px 4px',
							}} />
							{visibleSettings.map(({ to, icon, label }) => (
								<NavLink
									key={to}
									to={to}
									className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
									onClick={handleNavClick}
								>
									<span className="nav-icon">{icon}</span>
									{label}
								</NavLink>
							))}
						</>
					)}
				</nav>

				{/* User info + logout */}
				{user && (
					<div className="sidebar-user">
						<div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
							<div style={{
								width: 32, height: 32, borderRadius: '50%',
								background: 'var(--amber)', color: '#fff',
								display: 'flex', alignItems: 'center', justifyContent: 'center',
								fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
							}}>
								{(user.name || user.email || '?')[0].toUpperCase()}
							</div>
							<div style={{ minWidth: 0 }}>
								<div style={{
									fontSize: '0.82rem', fontWeight: 600, color: '#fff',
									whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
								}}>
									{user.name || user.email}
								</div>
								<div style={{
									fontSize: '0.68rem',
									color: ROLE_COLORS[user.role] || 'rgba(255,255,255,.5)',
									textTransform: 'capitalize', fontWeight: 500,
								}}>
									{user.role}
								</div>
							</div>
						</div>
						<button className="sidebar-logout-btn" onClick={handleLogout}>
							🚪 Sign out
						</button>
					</div>
				)}

				{/* Footer */}
				<div className="sidebar-footer">
					{installPrompt && !installed && (
						<button
							onClick={handleInstall}
							style={{
								width: '100%', marginBottom: 8,
								padding: '7px 10px',
								background: 'rgba(255,255,255,.08)',
								border: '1px solid rgba(255,255,255,.15)',
								borderRadius: 8,
								color: 'rgba(255,255,255,.75)',
								fontSize: '0.78rem', fontWeight: 500,
								cursor: 'pointer',
								display: 'flex', alignItems: 'center', gap: 6,
							}}
						>
							📲 Install App
						</button>
					)}
					EggTrack v1.0 · {new Date().getFullYear()}
				</div>

			</aside>
		</>
	);
}
