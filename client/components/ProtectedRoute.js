"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUserFromToken } from "@/lib/auth";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getUserFromToken();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      router.replace("/");
      return;
    }

    const isVendorOnboardingRoute = pathname?.startsWith("/vendor/onboarding");
    const vendorNeedsOnboarding = user.role === "vendor" && user.onboardingCompleted === false;

    if (vendorNeedsOnboarding && !isVendorOnboardingRoute) {
      router.replace("/vendor/onboarding");
      return;
    }

    if (!vendorNeedsOnboarding && isVendorOnboardingRoute && user.role === "vendor") {
      router.replace("/vendor");
      return;
    }

    setAuthorized(true);
  }, [allowedRoles, pathname, router]);

  if (!authorized) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">Checking access...</p>
      </div>
    );
  }

  return children;
}
