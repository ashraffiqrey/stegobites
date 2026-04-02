"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getMyOrders } from "@/lib/api";

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        const data = await getMyOrders();
        if (mounted) setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load orders");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ProtectedRoute allowedRoles={["customer"]}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">My Orders</h1>
        <p className="text-sm text-gray-500 mb-8">Track your reserved meals and pickup status.</p>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
          {loading ? (
            <p className="text-sm text-gray-400">Loading orders...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-400">No orders yet. Browse listings and reserve a meal.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="pb-2 pr-4">Listing</th>
                    <th className="pb-2 pr-4">Vendor</th>
                    <th className="pb-2 pr-4">Qty</th>
                    <th className="pb-2 pr-4">Total</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium">{o.title}</td>
                      <td className="py-2 pr-4 text-gray-500">{o.business_name}</td>
                      <td className="py-2 pr-4">{o.quantity}</td>
                      <td className="py-2 pr-4">${Number(o.total_price).toFixed(2)}</td>
                      <td className="py-2">
                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">
                          {o.status}
                        </span>
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
