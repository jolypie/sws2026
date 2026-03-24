export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">{title}</h2>
        <div className="dialog-body">
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>{message}</p>
        </div>
        <div className="dialog-actions">
          <button className="dialog-btn-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className="dialog-btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <><div className="spinner"></div>Deleting...</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
