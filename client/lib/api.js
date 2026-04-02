// Central place for all backend calls.
// Every function returns the parsed JSON or throws a descriptive error.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Attach the JWT token stored in localStorage to every authenticated request.
function authHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    ...authHeaders(),
    ...options.headers
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

// --- Auth ---
export const login = (email, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

export const register = (fullName, email, password, role) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName, email, password, role })
  });

function toQueryString(query) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  const result = params.toString();
  return result ? `?${result}` : "";
}

// --- Listings ---
export const getListings = (filters = "") => {
  if (typeof filters === "string") {
    return request(`/listings${filters ? `?location=${encodeURIComponent(filters)}` : ""}`);
  }

  return request(`/listings${toQueryString(filters)}`);
};

export const getListing = (id) => request(`/listings/${id}`);

export const createListing = (payload) =>
  request("/listings", {
    method: "POST",
    body:
      typeof FormData !== "undefined" && payload instanceof FormData
        ? payload
        : JSON.stringify(payload)
  });

export const getVendorListings = () => request("/listings/vendor/me");

// --- Vendors ---
export const registerVendor = (businessNameOrPayload, location, description) => {
  const payload =
    typeof businessNameOrPayload === "object" && businessNameOrPayload !== null
      ? businessNameOrPayload
      : { businessName: businessNameOrPayload, location, description };

  return request("/vendors/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getVendorProfile = () => request("/vendors/me");
export const updateVendorProfile = (payload) =>
  request("/vendors/me", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const getAdminVendors = () => request("/vendors");
export const approveVendor = (vendorId) =>
  request(`/vendors/${vendorId}/approve`, {
    method: "PUT"
  });
export const getAdminStats = () => request("/admin/stats");

// --- Orders ---
export const reserveListing = (listingId, quantity = 1) =>
  request("/orders", {
    method: "POST",
    body: JSON.stringify({ listingId, quantity })
  });

export const getMyOrders = () => request("/orders/my");
export const getVendorOrders = () => request("/orders/vendor");
export const updateOrderStatus = (orderId, status) =>
  request(`/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status })
  });
