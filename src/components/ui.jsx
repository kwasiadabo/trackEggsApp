import { useState, useEffect } from 'react';

// Loading spinner
export function Loading() {
  return (
    <div className="loading">
      <div className="spinner" />
      Loading…
    </div>
  );
}

// Error message
export function ErrorMsg({ message }) {
  return (
    <div style={{ padding: '24px', color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius)', margin: '16px 0', fontSize: '0.9rem' }}>
      ⚠ {message}
    </div>
  );
}

// Empty state
export function Empty({ message = 'No records found.' }) {
  return (
    <div className="empty">
      <div className="emoji">🥚</div>
      <p>{message}</p>
    </div>
  );
}

// Toast notifications
const toasts = [];
let setToastsGlobal = null;

export function ToastContainer() {
  const [list, setList] = useState([]);
  useEffect(() => { setToastsGlobal = setList; }, []);
  return (
    <div className="toast-container">
      {list.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}

export function toast(message, type = 'success') {
  if (!setToastsGlobal) return;
  const id = Date.now();
  setToastsGlobal(prev => [...prev, { id, message, type }]);
  setTimeout(() => {
    setToastsGlobal(prev => prev.filter(t => t.id !== id));
  }, 3500);
}

// Currency formatter
export function fmt(n) {
  return 'GH₵ ' + Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Date formatter
export function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Egg size badge
export function EggBadge({ size }) {
  const map = { small: 'badge-brown', medium: 'badge-amber', large: 'badge-green', xlarge: 'badge-red', pullet: 'badge-brown' };
  return <span className={`badge ${map[size] || 'badge-brown'}`}>{size}</span>;
}

// Print-only page header — hidden on screen, shown when printing
export function PrintHeader({ title }) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="print-only" style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1008' }}>{title}</div>
          <div style={{ fontSize: '0.78rem', color: '#6b4c30', marginTop: 3 }}>Printed: {date}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#6b4c30' }}>
          <div style={{ fontWeight: 700 }}>🥚 EggTrack</div>
          <div>Distribution Manager</div>
        </div>
      </div>
    </div>
  );
}
