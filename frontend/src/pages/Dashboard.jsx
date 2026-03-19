import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("authUser");

    if (!savedUser) {
      navigate("/login");
      return;
    }

    setUser(JSON.parse(savedUser));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    navigate("/login");
  };

  if (!user) {
    return null;
  }

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

          <button className="btn-secondary dashboard-logout" onClick={handleLogout}>
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
          </div>

          <div className="dashboard-block">
            <h3>Hosting</h3>
            <p>
              Domain: <span>{user.domain}</span>
            </p>
            <p>
              Status: <span>Active</span>
            </p>
          </div>
        </div>

        <div className="dashboard-note">
          This dashboard confirms the login flow, route protection, and
          frontend-backend integration for your hosting system.
        </div>
      </div>
    </div>
  );
}