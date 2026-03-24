import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { parseJwtPayload } from "../utils/jwt";

export function useAuth() {
  const navigate = useNavigate();

  const authFetch = useCallback(
    (url, options = {}) => {
      const token = localStorage.getItem("authToken");
      return fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {})
        }
      }).then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("authToken");
          navigate("/login");
          throw new Error("Unauthorized");
        }
        return res;
      });
    },
    [navigate]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    navigate("/login");
  }, [navigate]);

  function getUser() {
    const token = localStorage.getItem("authToken");
    if (!token) return null;
    return parseJwtPayload(token);
  }

  return { authFetch, logout, getUser };
}
