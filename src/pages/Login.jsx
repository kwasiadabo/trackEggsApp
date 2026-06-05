import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState({ email: '', password: '' });
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleChange = (e) =>
		setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			await login(form.email, form.password);
			navigate('/');
		} catch (err) {
			setError(err.message || 'Login failed');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background:
					'linear-gradient(135deg, #3d2008 0%, #7a4520 50%, #d4750a 100%)',
			}}
		>
			<div
				style={{
					background: '#fff',
					borderRadius: 16,
					padding: '40px 36px',
					width: '100%',
					maxWidth: 400,
					boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
				}}
			>
				{/* Brand */}
				<div style={{ textAlign: 'center', marginBottom: 32 }}>
					<div style={{ fontSize: '3rem', lineHeight: 1 }}>🥚</div>
					<h1
						style={{
							fontFamily: 'DM Serif Display, serif',
							fontSize: '1.8rem',
							color: 'var(--brown)',
							margin: '8px 0 4px',
							letterSpacing: '-0.02em',
						}}
					>
						EggTrack
					</h1>
					<p
						style={{
							color: 'var(--text-muted)',
							fontSize: '0.82rem',
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
						}}
					>
						Distribution Management
					</p>
				</div>

				{error && (
					<div
						style={{
							background: 'var(--danger-bg)',
							color: 'var(--danger)',
							border: '1px solid #ffcdd2',
							borderRadius: 8,
							padding: '10px 14px',
							marginBottom: 20,
							fontSize: '0.875rem',
						}}
					>
						⚠ {error}
					</div>
				)}

				<form onSubmit={handleSubmit}>
					<div className="form-group" style={{ marginBottom: 16 }}>
						<label>Email address</label>
						<input
							name="email"
							type="email"
							value={form.email}
							onChange={handleChange}
							placeholder="admin@eggtrack.app"
							required
							autoFocus
							style={{ width: '100%' }}
						/>
					</div>
					<div className="form-group" style={{ marginBottom: 24 }}>
						<label>Password</label>
						<input
							name="password"
							type="password"
							value={form.password}
							onChange={handleChange}
							placeholder="••••••••"
							required
							style={{ width: '100%' }}
						/>
					</div>
					<button
						className="btn btn-primary"
						type="submit"
						disabled={loading}
						style={{
							width: '100%',
							justifyContent: 'center',
							padding: '11px 18px',
							fontSize: '0.95rem',
						}}
					>
						{loading ? 'Signing in…' : 'Sign In'}
					</button>
				</form>

				{/* Seed account hint */}
				{/* <div style={{ marginTop: 24, padding: '12px 14px', background: 'var(--warm-white)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <strong>Seed accounts</strong> (password: <code style={{ background: 'var(--border-light)', padding: '1px 5px', borderRadius: 4 }}>Admin@123</code>)
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              ['admin@eggtrack.app',   'Admin'],
              ['manager@eggtrack.app', 'Manager'],
              ['viewer@eggtrack.app',  'Viewer'],
            ].map(([email, role]) => (
              <button
                key={email}
                type="button"
                onClick={() => setForm({ email, password: 'Admin@123' })}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-secondary)' }}
              >
                <span style={{ fontWeight: 600 }}>{role}:</span> {email}
              </button>
            ))}
          </div>
        </div> */}
			</div>
		</div>
	);
}
