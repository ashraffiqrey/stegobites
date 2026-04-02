"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { createListing, getVendorListings, registerVendor } from "@/lib/api";

function todayAt(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export default function VendorListingsPage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    originalPrice: "",
    discountedPrice: "",
    quantity: "",
    pickupStart: todayAt(17),
    pickupEnd: todayAt(20)
  });

  const [myListings, setMyListings] = useState([]);
  const [needsVendorProfile, setNeedsVendorProfile] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    businessName: "",
    location: "",
    description: "",
    latitude: "",
    longitude: ""
  });
  const [vendorFormLoading, setVendorFormLoading] = useState(false);
  const [vendorLocationLoading, setVendorLocationLoading] = useState(false);
  const [vendorFormError, setVendorFormError] = useState("");
  const [vendorFormSuccess, setVendorFormSuccess] = useState("");
  const [loadingListings, setLoadingListings] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [submitStage, setSubmitStage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadListings = async () => {
    try {
      const vendorListings = await getVendorListings();
      setNeedsVendorProfile(false);
      setMyListings(Array.isArray(vendorListings) ? vendorListings : []);
    } catch (err) {
      if (err?.message === "Vendor profile not found") {
        setNeedsVendorProfile(true);
        setMyListings([]);
      } else {
        setError(err.message || "Failed to load listings");
      }
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    if (file) {
      setImagePreview(URL.createObjectURL(file));
      return;
    }

    setImagePreview("");
  };

  const handleVendorFormChange = (e) => {
    setVendorForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleVendorRegister = async (e) => {
    e.preventDefault();
    setVendorFormError("");
    setVendorFormSuccess("");
    setVendorFormLoading(true);

    try {
      const payload = {
        businessName: vendorForm.businessName,
        location: vendorForm.location,
        description: vendorForm.description
      };

      if (vendorForm.latitude !== "" && vendorForm.longitude !== "") {
        payload.latitude = Number(vendorForm.latitude);
        payload.longitude = Number(vendorForm.longitude);
      }

      await registerVendor(payload);
      setVendorFormSuccess("Vendor profile created. It may need admin approval before listing.");
      setNeedsVendorProfile(false);
      setLoadingListings(true);
      await loadListings();
    } catch (err) {
      setVendorFormError(err.message || "Failed to create vendor profile");
    } finally {
      setVendorFormLoading(false);
    }
  };

  const useCurrentVendorLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setVendorFormError("Geolocation is not available in this browser.");
      return;
    }

    setVendorFormError("");
    setVendorLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setVendorForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setVendorFormSuccess("Current coordinates added to your vendor profile.");
        setVendorLocationLoading(false);
      },
      () => {
        setVendorFormError("Unable to read your current location.");
        setVendorLocationLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitStage(imageFile ? "Uploading image..." : "Creating listing...");
    setLoading(true);

    try {
      if (needsVendorProfile) {
        setError("Please create your vendor profile first.");
        return;
      }

      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("description", form.description || "");
      payload.append("originalPrice", String(Number(form.originalPrice)));
      payload.append("discountedPrice", String(Number(form.discountedPrice)));
      payload.append("quantity", String(Number(form.quantity)));
      payload.append("pickupStart", new Date(form.pickupStart).toISOString());
      payload.append("pickupEnd", new Date(form.pickupEnd).toISOString());

      if (imageFile) {
        payload.append("image", imageFile);
      }

      await createListing(payload);
      setSuccess("Listing created! It's now visible to customers.");
      setForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        originalPrice: "",
        discountedPrice: "",
        quantity: ""
      }));
      setImageFile(null);
      setImagePreview("");
      setLoadingListings(true);
      await loadListings();
    } catch (err) {
      setError(err.message || "Failed to create listing");
      if (err.message === "Vendor profile not found") {
        setNeedsVendorProfile(true);
      }
    } finally {
      setSubmitStage("");
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <ProtectedRoute allowedRoles={["vendor"]}>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Vendor Listings</h1>
        <p className="text-gray-500 text-sm mb-8">Create and manage your surplus food listings.</p>

        {needsVendorProfile && (
          <section className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-amber-900 mb-2">Complete your vendor profile</h2>
            <p className="text-sm text-amber-800 mb-4">
              Your account is registered as vendor, but your vendor profile is missing.
            </p>

            <form onSubmit={handleVendorRegister} className="grid gap-4">
              <div>
                <label className={labelClass} htmlFor="businessName">Business name *</label>
                <input
                  id="businessName"
                  name="businessName"
                  required
                  value={vendorForm.businessName}
                  onChange={handleVendorFormChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="vendorLocation">Location *</label>
                <input
                  id="vendorLocation"
                  name="location"
                  required
                  value={vendorForm.location}
                  onChange={handleVendorFormChange}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="vendorLatitude">Latitude</label>
                  <input
                    id="vendorLatitude"
                    name="latitude"
                    type="number"
                    step="any"
                    value={vendorForm.latitude}
                    onChange={handleVendorFormChange}
                    className={inputClass}
                    placeholder="3.139"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="vendorLongitude">Longitude</label>
                  <input
                    id="vendorLongitude"
                    name="longitude"
                    type="number"
                    step="any"
                    value={vendorForm.longitude}
                    onChange={handleVendorFormChange}
                    className={inputClass}
                    placeholder="101.6869"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="vendorDescription">Description</label>
                <textarea
                  id="vendorDescription"
                  name="description"
                  rows={2}
                  value={vendorForm.description}
                  onChange={handleVendorFormChange}
                  className={inputClass}
                />
              </div>

              {vendorFormError && <p className="text-sm text-red-600">{vendorFormError}</p>}
              {vendorFormSuccess && <p className="text-sm text-emerald-700">{vendorFormSuccess}</p>}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={vendorFormLoading}
                  className="w-full sm:w-auto rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {vendorFormLoading ? "Saving..." : "Create Vendor Profile"}
                </button>
                <button
                  type="button"
                  onClick={useCurrentVendorLocation}
                  disabled={vendorLocationLoading}
                  className="w-full sm:w-auto rounded-xl border border-amber-300 px-6 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  {vendorLocationLoading ? "Detecting..." : "Use Current Location"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">New Listing</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelClass} htmlFor="title">Title *</label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={form.title}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows={2}
                value={form.description}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="image">Upload Food Image</label>
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-emerald-700"
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="mt-3 h-32 w-full max-w-xs rounded-xl object-cover border border-gray-200"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="originalPrice">Original price ($) *</label>
                <input
                  id="originalPrice"
                  name="originalPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.originalPrice}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="discountedPrice">Discounted price ($) *</label>
                <input
                  id="discountedPrice"
                  name="discountedPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.discountedPrice}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="quantity">Quantity available *</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                required
                value={form.quantity}
                onChange={handleChange}
                className={`${inputClass} max-w-[200px]`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="pickupStart">Pickup from *</label>
                <input
                  id="pickupStart"
                  name="pickupStart"
                  type="datetime-local"
                  required
                  value={form.pickupStart}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pickupEnd">Pickup until *</label>
                <input
                  id="pickupEnd"
                  name="pickupEnd"
                  type="datetime-local"
                  required
                  value={form.pickupEnd}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-emerald-600 text-sm font-medium">{success}</p>}

            <button
              type="submit"
              disabled={loading || needsVendorProfile}
              className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {needsVendorProfile
                ? "Create Vendor Profile First"
                : loading
                ? submitStage || "Creating listing..."
                : "Create Listing"}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">My Listings</h2>

          {loadingListings ? (
            <p className="text-sm text-gray-400">Loading listings...</p>
          ) : myListings.length === 0 ? (
            <p className="text-sm text-gray-400">No listings yet. Create your first one above.</p>
          ) : (
            <div className="space-y-3">
              {myListings.map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-xl border border-gray-100 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{listing.title}</p>
                    <p className="text-sm text-gray-500">
                      ${Number(listing.discounted_price).toFixed(2)} · {listing.quantity} left
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      listing.is_active && listing.quantity > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {listing.is_active && listing.quantity > 0 ? "Active" : "Sold out"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
