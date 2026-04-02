"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { approveVendor, getAdminStats, getAdminVendors } from "@/lib/api";

export default function AdminDashboardPage() {
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({
    total_orders: 0,
    completed_orders: 0,
    revenue: 0,
    breakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const [vendorData, statsData] = await Promise.all([getAdminVendors(), getAdminStats()]);
        if (!mounted) return;

        setVendors(Array.isArray(vendorData) ? vendorData : []);
        setStats({
          total_orders: Number(statsData?.total_orders || 0),
          completed_orders: Number(statsData?.completed_orders || 0),
          revenue: Number(statsData?.revenue || 0),
          breakdown: Array.isArray(statsData?.breakdown) ? statsData.breakdown : []
        });
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load admin dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const pendingCount = useMemo(
    () => vendors.filter((vendor) => !vendor.is_approved).length,
    [vendors]
  );

  const onApproveVendor = async (vendorId) => {
    setError("");
    setUpdatingId(vendorId);

    try {
      await approveVendor(vendorId);
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === vendorId ? { ...vendor, is_approved: true } : vendor
        )
      );
    } catch (err) {
      setError(err.message || "Failed to approve vendor");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mb-8">Manage vendors and track platform revenue.</p>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Orders</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading ? "..." : stats.total_orders}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Completed Orders</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading ? "..." : stats.completed_orders}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Platform Revenue</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {loading ? "..." : `$${stats.revenue.toFixed(2)}`}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Vendor Approval</h2>
            <span className="text-xs font-semibold rounded-full bg-yellow-50 text-yellow-700 px-3 py-1">
              Pending: {pendingCount}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Loading vendors...</p>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-gray-400">No vendors found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="pb-2 pr-4">Business Name</th>
                    <th className="pb-2 pr-4">Location</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium">{vendor.business_name}</td>
                      <td className="py-2 pr-4 text-gray-600">{vendor.location}</td>
                      <td className="py-2 pr-4">
                        {vendor.is_approved ? (
                          <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {!vendor.is_approved ? (
                          <button
                            type="button"
                            onClick={() => onApproveVendor(vendor.id)}
                            disabled={updatingId === vendor.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {updatingId === vendor.id ? "Approving..." : "Approve Vendor"}
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

        <section className="rounded-2xl border border-gray-200 bg-white shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Vendor</h2>

          {loading ? (
            <p className="text-sm text-gray-400">Loading revenue breakdown...</p>
          ) : stats.breakdown.length === 0 ? (
            <p className="text-sm text-gray-400">No vendor revenue data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="pb-2 pr-4">Vendor Name</th>
                    <th className="pb-2 pr-4">Completed Orders</th>
                    <th className="pb-2">Estimated Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.breakdown.map((row) => (
                    <tr key={row.vendor_id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.business_name}</td>
                      <td className="py-2 pr-4">{row.completed_orders}</td>
                      <td className="py-2">${Number(row.estimated_commission || 0).toFixed(2)}</td>
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
