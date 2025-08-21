import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import ConditionalHeader from './components/ConditionalHeader';
import { ToastContainer } from 'react-toastify';
import FriendsSidebarGate from './components/FriendsSidebarGate';
import 'react-toastify/dist/ReactToastify.css';


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BracU Diary",
  description: "Your personalized university companion for BRAC University",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      afterSignOutUrl = "/sign-in"
      appearance={{
        cssLayerName: 'clerk',
      }}
    >
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <body className="flex flex-col min-h-screen" suppressHydrationWarning>
          <ConditionalHeader />
          {/* Spacer to offset the fixed header height so content never hides behind it */}
          <div className="h-24" aria-hidden />
          <main className="flex-grow pl-64">{children}</main>
          <FriendsSidebarGate />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}