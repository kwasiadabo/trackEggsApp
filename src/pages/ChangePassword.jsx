import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { toast } from '../components/ui';

export default function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const forced = user?.mustChangePassword;

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Current password is required';
    if (!form.newPassword) errs.newPassword = 'New password is required';
    else if (form.newPassword.length < 6) errs.newPassword = 'Password must be at least 6 characters';
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      await refreshUser();
      toast('Password changed successfully');
      navigate('/');
    } catch (err) {
      toast(err.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border-light)',
          borderRadius: 16,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 420,
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>🔑</div>
          <h2
            style={{
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontSize: '1.5rem',
              color: 'var(--text-primary)',
              margin: '8px 0 6px',
            }}
          >
            {forced ? 'Set Your Password' : 'Change Password'}
          </h2>
          {forced && (
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                background: 'var(--warning-bg)',
                border: '1px solid #fed7aa',
                borderRadius: 8,
                padding: '10px 14px',
                marginTop: 8,
              }}
            >
              You must set a new password before continuing.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Current password</label>
            <input
              name="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoFocus
              style={{ width: '100%', borderColor: errors.currentPassword ? 'var(--danger)' : undefined }}
            />
            {errors.currentPassword && (
              <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{errors.currentPassword}</span>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>New password</label>
            <input
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="Min. 6 characters"
              style={{ width: '100%', borderColor: errors.newPassword ? 'var(--danger)' : undefined }}
            />
            {errors.newPassword && (
              <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{errors.newPassword}</span>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 28 }}>
            <label>Confirm new password</label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter new password"
              style={{ width: '100%', borderColor: errors.confirmPassword ? 'var(--danger)' : undefined }}
            />
            {errors.confirmPassword && (
              <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{errors.confirmPassword}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {!forced && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
            )}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center', padding: '11px 18px', fontSize: '0.95rem' }}
            >
              {loading ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
