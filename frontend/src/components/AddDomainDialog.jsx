import { useState, useEffect } from "react";

const DOMAIN_REGEX = /^[a-z0-9.-]+\.[a-z]{2,}$/;
const emptyForm = { domain: "", name: "", description: "" };

export default function AddDomainDialog({ open, onClose, onSubmit, loading }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) setForm(emptyForm);
  }, [open]);

  const set = (field) => (e) =>
    setForm((f) => ({
      ...f,
      [field]: field === "domain" ? e.target.value.toLowerCase() : e.target.value
    }));

  const handleSubmit = async () => {
    const result = await onSubmit(form);
    if (result?.success) setForm(emptyForm);
  };

  const domainError = form.domain && !DOMAIN_REGEX.test(form.domain);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Add New Domain</h2>

        <div className="dialog-body">
          <div className="form-group">
            <label htmlFor="d-domain">Domain Name *</label>
            <div className="input-wrapper">
              <input
                id="d-domain"
                className={`form-control${domainError ? " form-control-error" : ""}`}
                type="text"
                placeholder="e.g., mysite.cz"
                value={form.domain}
                onChange={set("domain")}
                disabled={loading}
              />
            </div>
            {domainError && <span className="field-error">Invalid format (e.g., mysite.cz)</span>}
          </div>

          <div className="form-group">
            <label htmlFor="d-name">Display Name</label>
            <div className="input-wrapper">
              <input
                id="d-name"
                className="form-control"
                type="text"
                placeholder="e.g., My Company Site"
                value={form.name}
                onChange={set("name")}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="d-desc">Description</label>
            <div className="input-wrapper">
              <textarea
                id="d-desc"
                className="form-control"
                placeholder="Short description of the site..."
                value={form.description}
                onChange={set("description")}
                disabled={loading}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="dialog-btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="submit-btn dialog-btn-submit" onClick={handleSubmit} disabled={loading || domainError}>
            {loading ? <><div className="spinner"></div>Creating...</> : "Create Domain"}
          </button>
        </div>
      </div>
    </div>
  );
}
