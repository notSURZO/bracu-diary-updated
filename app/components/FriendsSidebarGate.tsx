"use client";

import { usePathname } from "next/navigation";
import FriendsSidebar from "./FriendsSidebar";

export default function FriendsSidebarGate() {
  const pathname = usePathname();
  // Show friends sidebar only on private resources section
  const show = pathname?.startsWith("/private-resources");
  if (!show) return null;
  return <FriendsSidebar />;
}
