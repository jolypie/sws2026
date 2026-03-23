import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

export default function AppSnackbar({ open, message, severity, onClose }) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert severity={severity} onClose={onClose}>
        {message}
      </Alert>
    </Snackbar>
  );
}
