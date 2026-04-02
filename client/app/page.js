"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import { getListings } from "@/lib/api";

export default function Home() {
  const [listings, setListings] = useState([]);
  const [location, setLocation] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [useNearby, setUseNearby] = useState(true);
  const [geoStatus, setGeoStatus] = useState("requesting");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      setUseNearby(false);
      return undefined;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGeoStatus("granted");
        setUseNearby(true);
      },
      () => {
        if (cancelled) return;
        setGeoStatus("denied");
        setUseNearby(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadListings() {
      try {
        setLoading(true);
        const data = await getListings(
          useNearby && userCoords
            ? { lat: userCoords.lat, lng: userCoords.lng }
            : { location: location.trim() }
        );
        if (mounted) setListings(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setListings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadListings();
    return () => {
      mounted = false;
    };
  }, [location, useNearby, userCoords]);

  const showManualFilter = !useNearby || !userCoords;

  const statusMessage = () => {
    if (useNearby && userCoords) {
      return "Showing nearby food";
    }

    if (geoStatus === "requesting") {
      return "Checking your location to find nearby food...";
    }

    if (location.trim()) {
      return `Showing results in ${location.trim()}`;
    }

    if (geoStatus === "denied") {
      return "Location access denied. Showing the area filter instead.";
    }

    if (geoStatus === "unsupported") {
      return "Geolocation is not available in this browser. Showing the area filter instead.";
    }

    return "Showing all locations";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
      <section className="text-center mb-10 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
          Save food. Save money.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
          Buy surplus food from nearby vendors at discounted prices.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Nearby Listings</p>
            <p className="mt-1 text-sm text-gray-500">{statusMessage()}</p>
          </div>
          {userCoords && (
            <button
              type="button"
              onClick={() => setUseNearby((prev) => !prev)}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {useNearby ? "Use Area Filter" : "Use Nearby Results"}
            </button>
          )}
        </div>

        {showManualFilter && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Select your area
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Rawang"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setLocation("")}
              disabled={!location}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        )}
      </section>

      <section>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-64 rounded-2xl border border-gray-200 bg-white shadow-sm animate-pulse"
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-lg font-semibold text-gray-800">No food available yet</p>
            <p className="text-sm text-gray-500 mt-2">Help your community by listing unsold meals.</p>
            <Link
              href="/register"
              className="inline-block mt-5 rounded-full bg-green-500 px-6 py-2.5 text-white font-medium hover:bg-green-600"
            >
              Become a Vendor
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
