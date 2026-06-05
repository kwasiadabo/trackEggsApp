import { useState } from 'react';
import { authApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMsg, Empty, toast, fmtDate, PrintHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const ROLE_MAP = { 1: 'admin', 2: 'manager', 3: 'viewer' };
const ROLE_COLORS = { admin: 'badge-red', manager: 'badge-green', viewer: 'badge-amber' };

export default function Users() {
  const { user: me, isAdmin } = useAuth();
  const { data: users,  loading, error, reload } = useFetch(() => authApi.listUsers());
  const { data: roles }                           = useFetch(() => authApi.listRoles());

  const [editItem,  setEditItem]  = useState(null);
  const [showNew,   setShowNew]   = useState(false);
  const [showPwd,   setShowPwd]   = useState(false);
  const [form,      setForm]      = useState({});
  const [newForm,   setNewForm]   = useState({ name: '', email: '', password: '', roleId: 3 });
  const [pwdForm,   setPwdForm]   = useState({ currentPassword: '', newPassword: '' });
  const [saving,    setSaving]    = useState(false);

  if (!isAdmin) return (
    <div className="card" style={{ textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: '2.5rem' }}>🔒</div>
      <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Admin access required.</p>
    </div>
  );

  const openEdit = u => { setForm({ name: u.name, email: u.email, roleId: u.roleId, isActive: u.isActive }); setEditItem(u); };
  const closeEdit = () => { setEditItem(null); };

  const handleEditChange = e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
  };

  const handleUpdate = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.updateUser(editItem.id, { ...form, roleId: parseInt(form.roleId) });
      toast('User updated ✓');
      closeEdit(); reload();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.register({ ...newForm, roleId: parseInt(newForm.roleId) });
      toast('User registered ✓');
      setShowNew(false);
      setNewForm({ name: '', email: '', password: '', roleId: 3 });
      reload();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.changePassword(pwdForm);
      toast('Password changed ✓');
      setShowPwd(false);
      setPwdForm({ currentPassword: '', newPassword: '' });
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      await authApi.updateUser(u.id, { isActive: !u.isActive });
      toast(u.isActive ? 'User deactivated' : 'User activated ✓');
      reload();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div>
      <PrintHeader title="User Management" />
      <div className="section-header">
        <span className="section-title">🔐 User Management</span>
        <div className="no-print" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ whiteSpace: 'nowrap' }}>🖨 Print</button>
          <button className="btn btn-secondary" onClick={() => setShowPwd(true)}>🔑 Change My Password</button>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New User</button>
        </div>
      </div>

      {/* Roles reference card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Role Permissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { role: 'admin',   color: '#c62828', desc: 'Full access — create, read, update, delete & manage users' },
            { role: 'manager', color: '#2e7d32', desc: 'Read + create + edit. Cannot delete records or manage users' },
            { role: 'viewer',  color: '#1565c0', desc: 'Read-only access to all modules' },
          ].map(r => (
            <div key={r.role} style={{ borderLeft: `3px solid ${r.color}`, paddingLeft: 12 }}>
              <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', color: r.color, letterSpacing: '0.05em' }}>{r.role}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <Loading /> : error ? <ErrorMsg message={error} /> : !users?.length ? <Empty /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th>
                  <th>Status</th><th>Last Login</th><th>Joined</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.name}
                      {u.id === me?.id && <span style={{ marginLeft: 6, fontSize: '0.7rem', background: 'var(--warm-white)', padding: '1px 6px', borderRadius: 8, color: 'var(--text-muted)' }}>you</span>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td><span className={`badge ${ROLE_COLORS[u.role] || 'badge-brown'}`}>{u.role}</span></td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'Never'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{fmtDate(u.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => openEdit(u)}>Edit</button>
                        {u.id !== me?.id && (
                          <button
                            className={`btn ${u.isActive ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            onClick={() => toggleActive(u)}
                          >
                            {u.isActive ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit user modal */}
      {editItem && (
        <Modal title={`✏ Edit — ${editItem.name}`} onClose={closeEdit} width={440}>
          <form onSubmit={handleUpdate}>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Full Name</label>
                <input name="name" value={form.name} onChange={handleEditChange} required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select name="roleId" value={form.roleId} onChange={handleEditChange}>
                  {roles?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end', paddingTop: 22 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" name="isActive" checked={!!form.isActive} onChange={handleEditChange} />
                  Account active
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" type="button" onClick={closeEdit}>Cancel</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Update User'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* New user modal */}
      {showNew && (
        <Modal title="👤 Register New User" onClose={() => setShowNew(false)} width={440}>
          <form onSubmit={handleRegister}>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Full Name *</label>
                <input name="name" value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Email *</label>
                <input name="email" type="email" value={newForm.email} onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input name="password" type="password" value={newForm.password} onChange={e => setNewForm(p => ({ ...p, password: e.target.value }))} required minLength={6} placeholder="Min 6 characters" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={newForm.roleId} onChange={e => setNewForm(p => ({ ...p, roleId: e.target.value }))}>
                  {roles?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" type="button" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Registering…' : 'Register User'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change my password modal */}
      {showPwd && (
        <Modal title="🔑 Change Password" onClose={() => setShowPwd(false)} width={380}>
          <form onSubmit={handleChangePassword}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>Current Password *</label>
                <input type="password" value={pwdForm.currentPassword} onChange={e => setPwdForm(p => ({ ...p, currentPassword: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>New Password *</label>
                <input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))} required minLength={6} placeholder="Min 6 characters" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" type="button" onClick={() => setShowPwd(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Change Password'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
