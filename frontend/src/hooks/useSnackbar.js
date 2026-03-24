import { useState } from "react";

export function useSnackbar(defaultSeverity = "error") {
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: defaultSeverity });

  const showSnackbar = (message, severity = defaultSeverity) =>
    setSnackbar({ open: true, message, severity });

  const closeSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  return { snackbar, showSnackbar, closeSnackbar };
}
