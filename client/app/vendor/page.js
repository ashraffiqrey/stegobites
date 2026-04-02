"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getVendorOrders,
  getVendorProfile,
  updateOrderStatus,
  updateVendorProfile
} from "@/lib/api";

export default function VendorDashboardPage() {
  const [totals, setTotals] = useState({ totalOrders: 0, completedOrders: 0, estimatedEarnings: 0 });
  const [orders, setOrders] = useState([]);
  const [businessLocation, setBusinessLocation] = useState("");
  const [coordinates, setCoordinates] = useState({ latitude: "", longitude: "" });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSummary() {
      try {
        const [vendorProfile, vendorOrders] = await Promise.all([getVendorProfile(), getVendorOrders()]);

        if (!mounted) return;

        const normalizedOrders = Array.isArray(vendorOrders) ? vendorOrders : [];
        const completedOrders = normalizedOrders.filter((order) => order.status === "picked_up").length;

        setBusinessLocation(vendorProfile?.location || "");
        setCoordinates({
          latitude: vendorProfile?.latitude ?? "",
          longitude: vendorProfile?.longitude ?? ""
        });

        setOrders(normalizedOrders);

        setTotals({
          totalOrders: normalizedOrders.length,
          completedOrders,
          estimatedEarnings: completedOrders * 2
        });
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load dashboard summary");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      mounted = false;
    };
  }, []);

  const saveBusinessLocation = async () => {
    const trimmed = businessLocation.trim();
    if (!trimmed) {
      setLocationMessage("Business location is required.");
      return;
    }

    setLocationMessage("");
    setSavingLocation(true);

    try {
      const payload = { location: trimmed };

      if (coordinates.latitude !== "" && coordinates.longitude !== "") {
        payload.latitude = Number(coordinates.latitude);
        payload.longitude = Number(coordinates.longitude);
      }

      const updated = await updateVendorProfile(payload);
      setBusinessLocation(updated?.location || trimmed);
      setCoordinates({
        latitude: updated?.latitude ?? coordinates.latitude,
        longitude: updated?.longitude ?? coordinates.longitude
      });
      setLocationMessage("Business location updated.");
    } catch (err) {
      setLocationMessage(err.message || "Failed to update location");
    } finally {
      setSavingLocation(false);
    }
  };

  const useCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationMessage("Geolocation is not available in this browser.");
      return;
    }

    setLocationMessage("");
    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationMessage("Coordinates captured from your current location.");
        setDetectingLocation(false);
      },
      () => {
        setLocationMessage("Unable to get your current location.");
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000
      }
    );
  };

  const markAsPickedUp = async (orderId) => {
    setError("");
    setUpdatingId(orderId);

    try {
      await updateOrderStatus(orderId, "picked_up");

      setOrders((prev) => {
        const nextOrders = prev.map((order) =>
          order.id === orderId ? { ...order, status: "picked_up" } : order
        );
        const completedOrders = nextOrders.filter((order) => order.status === "picked_up").length;

        setTotals({
          totalOrders: nextOrders.length,
          completedOrders,
          estimatedEarnings: completedOrders * 2
        });

        return nextOrders;
      });
    } catch (err) {
      setError(err.message || "Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === "picked_up") return "bg-emerald-50 text-emerald-700";
    if (status === "cancelled") return "bg-red-50 text-red-600";
    return "bg-yellow-50 text-yellow-700";
  };

  const getStatusLabel = (status) => {
    if (status === "picked_up") return "Picked Up";
    if (status === "cancelled") return "Cancelled";
    return "Reserved";
  };

  return (
    <ProtectedRoute allowedRoles={["vendor"]}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Vendor Dashboard</h1>
        <p className="text-sm text-gray-500 mb-8">Overview of your marketplace activity.</p>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Orders</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading ? "..." : totals.totalOrders}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Completed Orders</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading ? "..." : totals.completedOrders}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Estimated Earnings</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {loading ? "..." : `$${totals.estimatedEarnings.toFixed(2)}`}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Business Location</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="businessLocation" className="block text-sm font-medium text-gray-700 mb-1">
                Business Location
              </label>
              <input
                id="businessLocation"
                type="text"
                value={businessLocation}
                onChange={(e) => setBusinessLocation(e.target.value)}
                placeholder="e.g. Rawang"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="businessLatitude" className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                id="businessLatitude"
                type="number"
                step="any"
                value={coordinates.latitude}
                onChange={(e) => setCoordinates((prev) => ({ ...prev, latitude: e.target.value }))}
                placeholder="3.139"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="businessLongitude" className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                id="businessLongitude"
                type="number"
                step="any"
                value={coordinates.longitude}
                onChange={(e) => setCoordinates((prev) => ({ ...prev, longitude: e.target.value }))}
                placeholder="101.6869"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={saveBusinessLocation}
              disabled={savingLocation}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingLocation ? "Saving..." : "Save Location"}
            </button>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={detectingLocation}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {detectingLocation ? "Detecting..." : "Use Current Location"}
            </button>
          </div>
          {locationMessage && <p className="mt-2 text-sm text-gray-600">{locationMessage}</p>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Listings</h2>
            <p className="text-sm text-gray-500">Create and update your food listings.</p>
          </div>

          <Link
            href="/vendor/listings"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Create New Listing
          </Link>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Vendor Orders</h2>
            <p className="text-sm text-gray-500">Track and complete orders from your listings.</p>
          </div>

          <Link
            href="/vendor/orders"
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            View Orders
          </Link>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Orders</h2>

          {loading ? (
            <p className="text-sm text-gray-400">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-400">No incoming orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="pb-2 pr-4">Listing</th>
                    <th className="pb-2 pr-4">Quantity</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium">{order.title}</td>
                      <td className="py-2 pr-4">{order.quantity}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {order.status === "reserved" ? (
                          <button
                            type="button"
                            onClick={() => markAsPickedUp(order.id)}
                            disabled={updatingId === order.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {updatingId === order.id ? "Updating..." : "Mark as Picked Up"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
