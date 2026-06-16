import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
	// ... your existing links unchanged
];

const ROLE_COLORS = {
	admin: 'var(--amber)',
	manager: 'var(--success)',
	viewer: '#2563eb',
};

export default function Sidebar({ open, onClose }) {
	const { user, logout, isAdmin, isManager } = useAuth();
	const navigate = useNavigate();

	// PWA install prompt
	const [installPrompt, setInstallPrompt] = useState(null);
	const [installed, setInstalled] = useState(false);

	useEffect(() => {
		const handler = (e) => {
			e.preventDefault();
			setInstallPrompt(e);
		};
		window.addEventListener('beforeinstallprompt', handler);
		window.addEventListener('appinstalled', () => setInstalled(true));
		return () => window.removeEventListener('beforeinstallprompt', handler);
	}, []);

	const handleInstall = async () => {
		if (!installPrompt) return;
		installPrompt.prompt();
		const { outcome } = await installPrompt.userChoice;
		if (outcome === 'accepted') setInstalled(true);
		setInstallPrompt(null);
	};

	// ... handleLogout, handleNavClick unchanged

	return (
		<>
			{/* ... all your existing JSX unchanged ... */}

			{/* Replace your sidebar-footer div with this: */}
			<div className="sidebar-footer">
				{installPrompt && !installed && (
					<button
						onClick={handleInstall}
						style={{
							width: '100%',
							marginBottom: 8,
							padding: '7px 10px',
							background: 'rgba(255,255,255,0.08)',
							border: '1px solid rgba(255,255,255,0.15)',
							borderRadius: 8,
							color: 'rgba(255,255,255,0.75)',
							fontSize: '0.78rem',
							fontWeight: 500,
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: 6,
							transition: 'background 0.15s',
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.background = 'rgba(255,255,255,0.14)')
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
						}
					>
						📲 Install App
					</button>
				)}
				EggTrack v1.0 · {new Date().getFullYear()}
			</div>
		</>
	);
}
