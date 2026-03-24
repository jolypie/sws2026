export function parseJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    return JSON.parse(atob(base64Url.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function isTokenValid(token) {
  if (!token) return false;
  const payload = parseJwtPayload(token);
  return !!payload && Date.now() / 1000 < payload.exp;
}
