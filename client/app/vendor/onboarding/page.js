"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  createListing,
  getVendorProfile,
  registerVendor,
  updateVendorProfile
} from "@/lib/api";
import { getUserFromToken, setAuthSession } from "@/lib/auth";

export default function VendorOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [businessForm, setBusinessForm] = useState({
    businessName: "",
    location: ""
  });
  const [listingForm, setListingForm] = useState({
    title: "",
    price: "",
    quantity: ""
  });

  const [savingBusiness, setSavingBusiness] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadVendorProfile() {
      try {
        const vendor = await getVendorProfile();
        if (!mounted) return;

        setProfile(vendor);
        setBusinessForm({
          businessName: vendor.business_name || "",
          location: vendor.location || ""
        });

        if (vendor.onboarding_completed) {
          router.replace("/vendor");
          return;
        }
      } catch {
        if (!mounted) return;
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadVendorProfile();
    return () => {
      mounted = false;
    };
  }, [router]);

  const businessCompleted = Boolean(profile?.business_name && profile?.location);
  const isApproved = Boolean(profile?.is_approved);
  const onboardingCompleted = Boolean(profile?.onboarding_completed);

  const currentStep = useMemo(() => {
    if (!businessCompleted) return 1;
    if (!isApproved) return 2;
    if (!onboardingCompleted) return 3;
    return 3;
  }, [businessCompleted, isApproved, onboardingCompleted]);

  const progressPercent = useMemo(() => {
    if (onboardingCompleted) return 100;
    if (currentStep === 1) return 33;
    if (currentStep === 2) return 66;
    return 90;
  }, [currentStep, onboardingCompleted]);

  const saveBusinessInfo = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSavingBusiness(true);

    try {
      const payload = {
        businessName: businessForm.businessName.trim(),
        location: businessForm.location.trim()
      };

      let updated;
      if (profile) {
        updated = await updateVendorProfile(payload);
      } else {
        updated = await registerVendor(payload);
      }

      setProfile(updated);
      setMessage("Step 1 completed. Your business profile is saved.");
    } catch (err) {
      setError(err.message || "Failed to save business info");
    } finally {
      setSavingBusiness(false);
    }
  };

  const createFirstListing = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setCreatingListing(true);

    try {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 60 * 60 * 1000);
      const pickupEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

      await createListing({
        title: listingForm.title.trim(),
        description: "First listing from onboarding",
        originalPrice: Number(listingForm.price),
        discountedPrice: Number(listingForm.price),
        quantity: Number(listingForm.quantity),
        pickupStart: pickupStart.toISOString(),
        pickupEnd: pickupEnd.toISOString()
      });

      const updatedProfile = await updateVendorProfile({ onboardingCompleted: true });
      setProfile(updatedProfile);

      const currentUser = getUserFromToken();
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (currentUser && token) {
        setAuthSession(
          {
            ...currentUser,
            onboardingCompleted: true,
            isApproved: Boolean(updatedProfile?.is_approved)
          },
          token
        );
      }

      setMessage("Onboarding completed. Redirecting to your dashboard...");
      setTimeout(() => router.replace("/vendor"), 700);
    } catch (err) {
      setError(err.message || "Failed to create first listing");
    } finally {
      setCreatingListing(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["vendor"]}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Vendor Onboarding</h1>
        <p className="text-sm text-gray-500 mt-2">
          Complete these simple steps to activate your vendor journey.
        </p>

        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Progress: Step {currentStep} of 3
        </p>

        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-600">
            <span>Setup Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-1 ${businessCompleted ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
            >
              1. Business
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${isApproved ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
            >
              2. Approval
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${onboardingCompleted ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
            >
              3. First Listing
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Step 1 - Business Info</h2>
          <p className="mt-1 text-sm text-gray-500">Tell customers where your business is based.</p>

          <form onSubmit={saveBusinessInfo} className="mt-4 grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="businessName">
                Business name
              </label>
              <input
                id="businessName"
                value={businessForm.businessName}
                onChange={(e) =>
                  setBusinessForm((prev) => ({ ...prev, businessName: e.target.value }))
                }
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="location">
                Location
              </label>
              <input
                id="location"
                value={businessForm.location}
                onChange={(e) => setBusinessForm((prev) => ({ ...prev, location: e.target.value }))}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingBusiness}
              className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingBusiness ? "Saving..." : businessCompleted ? "Update Business Info" : "Save and Continue"}
            </button>
          </form>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Step 2 - Approval Status</h2>
          {!businessCompleted ? (
            <p className="mt-2 text-sm text-gray-500">Complete Step 1 first.</p>
          ) : isApproved ? (
            <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Approved. You can now create your first listing.
            </p>
          ) : (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Your account is under review. You can continue with Step 3 once approved.
            </p>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Step 3 - First Listing</h2>
          <p className="mt-1 text-sm text-gray-500">Create your first simple listing to complete onboarding.</p>

          <form onSubmit={createFirstListing} className="mt-4 grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                value={listingForm.title}
                onChange={(e) => setListingForm((prev) => ({ ...prev, title: e.target.value }))}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="price">
                  Price
                </label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={listingForm.price}
                  onChange={(e) => setListingForm((prev) => ({ ...prev, price: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="quantity">
                  Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={listingForm.quantity}
                  onChange={(e) => setListingForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingListing || !isApproved}
              className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {creatingListing ? "Creating..." : "Complete Onboarding"}
            </button>
          </form>
        </section>

        {loading && <p className="mt-4 text-sm text-gray-500">Loading onboarding status...</p>}
      </div>
    </ProtectedRoute>
  );
}
