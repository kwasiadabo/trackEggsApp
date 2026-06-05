import Modal from './Modal';

export default function ConfirmDelete({ message, onConfirm, onCancel, loading }) {
  return (
    <Modal title="⚠ Confirm Delete" onClose={onCancel} width={400}>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
        {message || 'This action cannot be undone. The record will be soft-deleted and removed from all views.'}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting…' : 'Yes, Delete'}
        </button>
      </div>
    </Modal>
  );
}
