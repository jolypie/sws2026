import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API } from "../api/config";
import { useSnackbar } from "../hooks/useSnackbar";
import AuthBrand from "../components/AuthBrand";
import FormField from "../components/FormField";
import AppSnackbar from "../components/AppSnackbar";

export default function Login() {
  const navigate = useNavigate();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("error");

  useEffect(() => { document.title = "Login — NovaHost"; }, []);

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "username" ? value.toLowerCase().trim() : value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      showSnackbar("Please fill in username and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed.");

      localStorage.setItem("authToken", data.token);
      navigate("/dashboard");
    } catch (err) {
      showSnackbar(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <AuthBrand subtitle="Sign in to manage your hosting account." />

      <div className="auth-card">
        <form onSubmit={handleLogin}>
          <FormField
            id="username"
            label="Username"
            name="username"
            placeholder="e.g., johndoe"
            value={formData.username}
            onChange={handleChange}
            disabled={loading}
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
          />

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <><div className="spinner"></div>Signing in...</> : "Login"}
          </button>

          <div className="login-wrapper">
            <p>Don&apos;t have an account? <Link to="/register">Register</Link></p>
          </div>
        </form>
      </div>

      <AppSnackbar {...snackbar} onClose={closeSnackbar} />
    </div>
  );
}
