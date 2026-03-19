import { useState } from 'react';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    domain: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const validateDomain = (domain) => {
    // Basic domain validation logic conforming to backend requirements
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);
  };

  const handleChange = (e) => {
    // Username, email, domain must be lowercase. Email and domain shouldn't have spaces.
    const field = e.target.name;
    let value = e.target.value;
    
    if (field !== 'password') {
       value = value.toLowerCase().trim();
    }
    
    setFormData({ ...formData, [field]: value });
    if (error) setError('');
  };

  const handlePasswordChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email || !formData.password || !formData.domain) {
      setError('Please fill in all fields.');
      return;
    }

    if (!validateDomain(formData.domain)) {
      setError('Invalid domain format. Use lowercase letters, numbers, hyphens, and a valid extension (e.g., mojefirma.cz).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8765/api/register', {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      setSuccessData({
        domain: data.domain,
        ftpLogin: data.ftpLogin,
        password: formData.password
      });
      
    } catch (err) {
      setError(`Error: ${err.message || 'Failed to connect to the server. Make sure the backend is running.'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setFormData({ username: '', email: '', password: '', domain: '' });
  };

  return (
    <div className="app-container">
      <div className="brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <img src="/logo_nova-host.svg" alt="NovaHost Logo" width="48" height="48" />
          <h1 style={{ marginBottom: 0 }}>Nova<span>Host</span></h1>
        </div>
        <p>Premium web hosting for your next big project.</p>
      </div>

      <div className="auth-card">
        {successData ? (
          <div className="alert alert-success">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 600 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Hosting Ready!
            </div>
            <span style={{marginTop: '0.5rem'}}>Domain <strong>{successData.domain}</strong> has been successfully created and configured on the Apache server!</span>
            
            <div className="success-details">
              <p>FTP Host: <span>localhost (Port 21)</span></p>
              <p>FTP Login: <span>{successData.ftpLogin}</span></p>
              <p>FTP Password: <span>(Your Password)</span></p>
            </div>
            
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
              <strong>How to check:</strong> Add <code>127.0.0.1 {successData.domain}</code> to your <code>/etc/hosts</code> file and open http://{successData.domain}.
            </div>

            <button className="btn-secondary" onClick={resetForm}>
              Create Another Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Username</label>
              <div className="input-wrapper">
                <input
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
              <label>Email Address</label>
              <div className="input-wrapper">
                <input
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
              <label>Password (for FTP and Portal)</label>
              <div className="input-wrapper">
                <input
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
              <label>Domain Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  name="domain"
                  className="form-control"
                  placeholder="e.g., mojefirma.cz"
                  value={formData.domain}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
                Must follow domain name rules (lowercase letters, hyphens, dots).
              </small>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner"></div> Processing...
                </>
              ) : (
                'Register Hosting'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
