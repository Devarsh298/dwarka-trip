import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MobileNavbar from "./components/Navbar";
import UserHeader from "./components/UserHeader";
import { UserProvider } from "./context/UserContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TripWise - Split Trip Expenses with Friends",
  description: "Split trip expenses effortlessly with friends. No sign-ups or passwords required.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TripWise",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-900 text-slate-100 antialiased selection:bg-purple-500 selection:text-white`}>
        <UserProvider>
          <UserHeader />
          <div className="min-h-screen pb-20 sm:pb-0">
            {children}
          </div>
          <MobileNavbar />
        </UserProvider>
      </body>
    </html>
  );
}
