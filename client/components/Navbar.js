"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuthSession, getUserFromToken } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Keep auth state in sync after login/register/logout.
  useEffect(() => {
    const syncUser = () => {
      setUser(getUserFromToken());
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("auth-changed", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("auth-changed", syncUser);
    };
  }, []);

  const logout = () => {
    clearAuthSession();
    setUser(null);
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 border-b border-gray-200 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-extrabold text-green-500 tracking-tight">
          StegoBites
        </Link>

        {/* Right-side links */}
        <div className="flex items-center gap-4 sm:gap-6 text-sm font-medium">
          {user ? (
            <>
              {user.role === "vendor" ? (
                <>
                  {user.onboardingCompleted === false ? (
                    <Link href="/vendor/onboarding" className="text-gray-600 hover:text-green-600">
                      Vendor Onboarding
                    </Link>
                  ) : (
                    <>
                      <Link href="/vendor" className="text-gray-600 hover:text-green-600">
                        Vendor Dashboard
                      </Link>
                      <Link href="/vendor/listings" className="text-gray-600 hover:text-green-600">
                        Listings
                      </Link>
                      <Link href="/vendor/orders" className="text-gray-600 hover:text-green-600">
                        Orders
                      </Link>
                    </>
                  )}
                </>
              ) : user.role === "admin" ? (
                <Link href="/admin" className="text-gray-600 hover:text-green-600">
                  Admin Dashboard
                </Link>
              ) : (
                <Link href="/orders" className="text-gray-600 hover:text-green-600">
                  My Orders
                </Link>
              )}
              <button
                onClick={logout}
                className="rounded-full bg-gray-100 px-4 py-1.5 text-gray-700 hover:bg-gray-200"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/" className="text-gray-600 hover:text-green-600">
                Browse
              </Link>
              <Link
                href="/login"
                className="text-gray-600 hover:text-green-600"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-green-500 px-4 py-1.5 text-white hover:bg-green-600"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
