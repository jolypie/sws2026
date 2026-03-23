import { useState, useEffect } from "react";
import { API } from "../api/config";

export function useDomains(authFetch) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    authFetch(`${API}/api/domains`)
      .then((r) => r.json())
      .then((data) => setDomains(data.domains || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authFetch]);

  async function addDomain(form) {
    setAddLoading(true);
    try {
      const res = await authFetch(`${API}/api/domains`, {
        method: "POST",
        body: JSON.stringify({
          domain: form.domain.trim().toLowerCase(),
          name: form.name.trim() || null,
          description: form.description.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add domain.");

      setDomains((prev) => [
        ...prev,
        {
          domain: data.domain,
          name: data.name,
          description: data.description,
          created_at: new Date().toISOString()
        }
      ]);

      return { success: true, domain: data.domain };
    } catch (err) {
      if (err.message === "Unauthorized") return { success: false, unauthorized: true };
      return { success: false, error: err.message };
    } finally {
      setAddLoading(false);
    }
  }

  return { domains, loading, addLoading, addDomain };
}
