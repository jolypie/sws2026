import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API } from "../api/config";
import { useSnackbar } from "../hooks/useSnackbar";
import AuthBrand from "../components/AuthBrand";
import FormField from "../components/FormField";
import AppSnackbar from "../components/AppSnackbar";

export default function Register() {
  const navigate = useNavigate();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => { document.title = "Register — NovaHost"; }, []);

  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "password" ? value : value.toLowerCase().trim()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password) {
      showSnackbar("Please fill in all fields.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create account.");

      showSnackbar("Account created! Redirecting to login...", "success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      showSnackbar(`Error: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <AuthBrand subtitle="Premium web hosting for your next big project." />

      <div className="auth-card">
        <form onSubmit={handleSubmit}>
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
            id="email"
            label="Email Address"
            type="email"
            name="email"
            placeholder="john@example.com"
            value={formData.email}
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
            {loading ? <><div className="spinner"></div>Creating account...</> : "Create Account"}
          </button>

          <div className="login-wrapper">
            <p>Already have an account? <Link to="/login">Login</Link></p>
          </div>
        </form>
      </div>

      <AppSnackbar {...snackbar} onClose={closeSnackbar} />
    </div>
  );
}
