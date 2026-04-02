"use client";

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function getUserFromToken() {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");
  if (!token) return null;

  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser?.role) return parsedUser;
    } catch {
      // Ignore malformed local data and fall back to token payload.
    }
  }

  const payload = parseJwt(token);
  if (!payload?.role) return null;

  const derivedUser = {
    id: payload.userId || null,
    role: payload.role
  };

  localStorage.setItem("user", JSON.stringify(derivedUser));
  return derivedUser;
}

export function setAuthSession(user, token) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("auth-changed"));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-changed"));
}
