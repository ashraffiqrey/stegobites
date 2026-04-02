"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getVendorOrders, updateOrderStatus } from "@/lib/api";

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        const data = await getVendorOrders();
        if (mounted) setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load vendor orders");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      mounted = false;
    };
  }, []);

  const markAsPickedUp = async (orderId) => {
    setError("");
    setUpdatingId(orderId);

    try {
      await updateOrderStatus(orderId, "picked_up");
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: "picked_up" } : order
        )
      );
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

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "reserved", label: "Reserved" },
    { value: "picked_up", label: "Picked Up" },
    { value: "cancelled", label: "Cancelled" }
  ];

  const allowedFilterValues = new Set(filterOptions.map((o) => o.value));
  const statusFromQuery = searchParams.get("status") || "all";
  const statusFilter = allowedFilterValues.has(statusFromQuery) ? statusFromQuery : "all";

  const setStatusFilter = (nextStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextStatus === "all") {
      params.delete("status");
    } else {
      params.set("status", nextStatus);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  return (
    <ProtectedRoute allowedRoles={["vendor"]}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Vendor Orders</h1>
        <p className="text-sm text-gray-500 mb-8">Review reservations placed on your listings.</p>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const isActive = statusFilter === option.value;
              const count =
                option.value === "all"
                  ? orders.length
                  : orders.filter((order) => order.status === option.value).length;

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
            <p className="text-sm text-gray-400">Loading orders...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-400">No incoming orders yet.</p>
          ) : filteredOrders.length === 0 ? (
            <p className="text-sm text-gray-400">No orders in this status.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="pb-2 pr-4">Listing</th>
                    <th className="pb-2 pr-4">Customer</th>
                    <th className="pb-2 pr-4">Qty</th>
                    <th className="pb-2 pr-4">Total</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium">{o.title}</td>
                      <td className="py-2 pr-4 text-gray-500">{o.customer_name}</td>
                      <td className="py-2 pr-4">{o.quantity}</td>
                      <td className="py-2 pr-4">${Number(o.total_price).toFixed(2)}</td>
                      <td className="py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                            o.status
                          )}`}
                        >
                          {getStatusLabel(o.status)}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {o.status === "reserved" ? (
                          <button
                            type="button"
                            onClick={() => markAsPickedUp(o.id)}
                            disabled={updatingId === o.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {updatingId === o.id ? "Updating..." : "Mark as Picked Up"}
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
