import { useState } from "react";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    domain: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  const validateDomain = (domain) => {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);
  };

  const handleChange = (e) => {
    const field = e.target.name;
    let value = e.target.value;

    if (field !== "password") {
      value = value.toLowerCase().trim();
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));

    if (error) {
      setError("");
    }
  };

  const handlePasswordChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password || !formData.domain) {
      setError("Please fill in all fields.");
      return;
    }

    if (!validateDomain(formData.domain)) {
      setError(
        "Invalid domain format. Use lowercase letters, numbers, hyphens, and a valid extension (e.g., mojefirma.cz)."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8765/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      setSuccessData({
        domain: data.domain,
        ftpLogin: data.ftpLogin,
        password: formData.password
      });
    } catch (err) {
      setError(
        `Error: ${err.message || "Failed to connect to the server. Make sure the backend is running."}`
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      domain: ""
    });
  };

  return (
    <div className="app-container">
      <div className="brand auth-brand">
        <div className="brand-header">
          <img
            src="/logo_nova-host.svg"
            alt="NovaHost Logo"
            width="48"
            height="48"
          />
          <h1>
            Nova<span>Host</span>
          </h1>
        </div>
        <p>Premium web hosting for your next big project.</p>
      </div>

      <div className="auth-card">
        {successData ? (
          <div className="alert alert-success">
            <div className="success-title">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Hosting Ready!
            </div>

            <span className="success-message">
              Domain <strong>{successData.domain}</strong> has been successfully
              created and configured on the Apache server.
            </span>

            <div className="success-details">
              <p>
                FTP Host: <span>localhost (Port 21)</span>
              </p>
              <p>
                FTP Login: <span>{successData.ftpLogin}</span>
              </p>
              <p>
                FTP Password: <span>(Your Password)</span>
              </p>
            </div>

            <div className="success-help">
              <strong>How to check:</strong> Add 127.0.0.1 {successData.domain} to
              your hosts file and open http://{successData.domain}.
            </div>

            <button className="btn-secondary" onClick={resetForm}>
              Create Another Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <input
                  id="username"
                  type="text"
                  name="username"
                  className="form-control"
                  placeholder="e.g., johndoe"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password (for FTP and Portal)</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type="password"
                  name="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="domain">Domain Name</label>
              <div className="input-wrapper">
                <input
                  id="domain"
                  type="text"
                  name="domain"
                  className="form-control"
                  placeholder="e.g., mojefirma.cz"
                  value={formData.domain}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <small className="field-hint">
                Must follow domain name rules: lowercase letters, hyphens and dots.
              </small>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Processing...
                </>
              ) : (
                "Register Hosting"
              )}
            </button>

            <div className="login-wrapper">
              <p>
                Already have account? <a href="/login">Login</a>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}