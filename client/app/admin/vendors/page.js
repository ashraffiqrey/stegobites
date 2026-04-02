"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { approveVendor, getAdminVendors } from "@/lib/api";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadVendors() {
      try {
        const data = await getAdminVendors();
        if (mounted) setVendors(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load vendors");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadVendors();
    return () => {
      mounted = false;
    };
  }, []);

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

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" }
  ];

  const filteredVendors =
    statusFilter === "all"
      ? vendors
      : vendors.filter((vendor) =>
          statusFilter === "approved" ? vendor.is_approved : !vendor.is_approved
        );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Vendor Approvals</h1>
        <p className="text-sm text-gray-500 mb-8">Review vendor registrations and approve accounts.</p>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-md p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const isActive = statusFilter === option.value;
              const count =
                option.value === "all"
                  ? vendors.length
                  : option.value === "approved"
                  ? vendors.filter((vendor) => vendor.is_approved).length
                  : vendors.filter((vendor) => !vendor.is_approved).length;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {option.label} ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Loading vendors...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-gray-400">No vendors found.</p>
          ) : filteredVendors.length === 0 ? (
            <p className="text-sm text-gray-400">No vendors in this status.</p>
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
                  {filteredVendors.map((vendor) => (
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
      </div>
    </ProtectedRoute>
  );
}
