import { useState } from "react";
import LanguageIcon from "@mui/icons-material/Language";
import ConfirmDialog from "./ConfirmDialog";
import AppSnackbar from "./AppSnackbar";
import { useSnackbar } from "../hooks/useSnackbar";

export default function DomainCard({ domain, onDelete }) {
  const [showFtp, setShowFtp] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  const handleDelete = async () => {
    setDeleting(true);
    const result = await onDelete(domain.domain);
    setDeleting(false);
    if (result.success) {
      showSnackbar(`Domain ${domain.domain} deleted.`, "success");
    } else {
      setConfirmOpen(false);
      showSnackbar(result.error || "Failed to delete domain.", "error");
    }
  };

  return (
    <>
      <div className="domain-card">
        <div className="domain-card-icon">
          <LanguageIcon sx={{ fontSize: 28 }} />
        </div>
        <div className="domain-card-body">
          <span className="domain-card-name">{domain.name || domain.domain}</span>
          <span className="domain-card-host">{domain.domain}</span>
          {domain.description && (
            <span className="domain-card-desc">{domain.description}</span>
          )}
          {domain.ftp_login && (
            <div className="domain-ftp">
              <button
                className="domain-ftp-toggle"
                onClick={() => setShowFtp((v) => !v)}
              >
                FTP {showFtp ? "▲" : "▼"}
              </button>
              {showFtp && (
                <div className="domain-ftp-info">
                  <span><b>Host:</b> localhost:21</span>
                  <span><b>Login:</b> {domain.ftp_login}</span>
                  <span><b>Password:</b> {domain.ftp_password}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="domain-card-actions">
          <a
            className="domain-card-link"
            href={`http://${domain.domain}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open ↗
          </a>
          <button
            className="domain-card-delete"
            onClick={() => setConfirmOpen(true)}
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Domain"
        message={`Are you sure you want to delete "${domain.domain}"? This will remove all files and cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={deleting}
      />

      <AppSnackbar {...snackbar} onClose={closeSnackbar} />
    </>
  );
}
