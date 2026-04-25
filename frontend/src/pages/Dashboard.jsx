import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import AddIcon from "@mui/icons-material/Add";

import { useAuth } from "../hooks/useAuth";
import { useDomains } from "../hooks/useDomains";
import DomainCard from "../components/DomainCard";
import AddDomainDialog from "../components/AddDomainDialog";
import EmptyDomains from "../components/EmptyDomains";

export default function Dashboard() {
  const navigate = useNavigate();
  const { authFetch, logout, getUser } = useAuth();
  const { domains, loading, addLoading, addDomain, deleteDomain } = useDomains(authFetch);

  const [user] = useState(() => getUser());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const handleAddDomain = async (form) => {
    if (!form.domain.trim()) {
      showSnackbar("Domain name is required.", "error");
      return { success: false };
    }

    const result = await addDomain(form);

    if (result.success) {
      showSnackbar(`Domain ${result.domain} added successfully!`, "success");
      setDialogOpen(false);
    } else if (!result.unauthorized) {
      showSnackbar(`Error: ${result.error}`, "error");
    }

    return result;
  };

  if (!user) return null;

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-top">
          <div>
            <p className="dashboard-eyebrow">User cabinet</p>
            <h1>Welcome, {user.username}</h1>
            <p className="dashboard-subtitle">
              You are logged in to the hosting management panel.
            </p>
          </div>
          <button className="btn-secondary dashboard-logout" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-block">
            <h3>Account</h3>
            <p>
              Username: <span>{user.username}</span>
            </p>
            <p>
              Email: <span>{user.email}</span>
            </p>
            <p>
              Database:{" "}
              <span
                style={{
                  fontFamily: "monospace",
                  background: "rgba(163,230,53,0.12)",
                  color: "#a3e635",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "0.9em",
                }}
              >
                {user.db_name ?? "—"}
              </span>
            </p>
            <p style={{ color: "var(--text-secondary, #888)", fontSize: "0.8em", marginTop: "0.25rem" }}>
              Your domains and FTP accounts are stored in this isolated database.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Your Domains</h3>
            <Button
              variant="contained"
              sx={{
                background: "#a3e635",
                color: "#0b0f19",
                border: "1px solid #a3e635",
              }}
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              size="small"
            >
              Add Domain
            </Button>
          </div>

          {loading ? (
            <p style={{ color: "var(--text-secondary, #888)" }}>Loading...</p>
          ) : domains.length === 0 ? (
            <EmptyDomains onAdd={() => setDialogOpen(true)} />
          ) : (
            domains.map((d) => (
              <DomainCard
                key={d.domain}
                domain={d}
                onDelete={deleteDomain}
              />
            ))
          )}
        </div>
      </div>

      <AddDomainDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddDomain}
        loading={addLoading}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
