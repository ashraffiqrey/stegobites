"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reserveListing } from "@/lib/api";

// Displays a single food listing in the marketplace grid.
// All data comes from the backend GET /listings endpoint.

export default function ListingCard({ listing }) {
  const router = useRouter();
  const [reserving, setReserving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const {
    id,
    title,
    image_url,
    discounted_price,
    original_price,
    quantity,
    business_name,
    location,
    distance_km,
    pickup_start,
    pickup_end
  } = listing;

  // Format price as currency string.
  const fmt = (val) =>
    Number(val).toLocaleString("en-US", { style: "currency", currency: "MYR" });

  // Short time display for pickup window.
  const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const discount = Math.round((1 - discounted_price / original_price) * 100);

  const onReserve = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    const confirmed = window.confirm("Confirm reservation?");
    if (!confirmed) return;

    try {
      setReserving(true);
      await reserveListing(id, 1);
      window.alert("Reservation successful! Pay at store.");
    } catch (error) {
      window.alert(error.message || "Reservation failed.");
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col">
      {/* Listing image with fallback placeholder. */}
      <div className="relative bg-green-50 h-36 flex items-center justify-center">
        {image_url && !imageError ? (
          <img
            src={image_url}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-4xl text-green-700 font-semibold">No Image</span>
        )}
        {discount > 0 && (
          <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{discount}%
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2">
          {title}
        </h3>

        {business_name && (
          <p className="text-xs text-gray-500">
            {business_name}{location ? ` · ${location}` : ""}
          </p>
        )}

        {distance_km !== undefined && distance_km !== null && (
          <p className="text-xs font-medium text-emerald-700">
            {Number(distance_km).toFixed(1)} km away
          </p>
        )}

        {/* Pickup window */}
        {pickup_start && pickup_end && (
          <p className="text-xs text-gray-400">
            Pickup: {fmtTime(pickup_start)} – {fmtTime(pickup_end)}
          </p>
        )}

        {/* Pricing */}
        <div className="mt-auto pt-2 flex items-end justify-between">
          <div>
            <span className="text-2xl font-extrabold text-green-600">{fmt(discounted_price)}</span>
            <span className="ml-1.5 text-xs text-gray-400 line-through">{fmt(original_price)}</span>
          </div>
          <span className="text-xs font-semibold text-orange-500">
            {quantity} left
          </span>
        </div>

        <button
          onClick={onReserve}
          disabled={reserving || quantity < 1}
          className="mt-3 w-full rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
        >
          {reserving ? "Reserving..." : "Reserve Now"}
        </button>
      </div>
    </div>
  );
}
