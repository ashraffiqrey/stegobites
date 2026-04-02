import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "StegoBites - Save food, save money",
  description: "Buy surplus food from nearby vendors at discounted prices."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 text-center text-xs text-gray-500 py-6">
          Copyright {new Date().getFullYear()} StegoBites. Reducing food waste, one meal at a time.
        </footer>
      </body>
    </html>
  );
}
