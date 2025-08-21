"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import FriendsSidebar from "./FriendsSidebar";

export default function FriendsSidebarGate() {
  const pathname = usePathname();
  // Show friends sidebar only on private resources section
  const show = pathname?.startsWith("/private-resources");

  useEffect(() => {
    if (!show) return;
    // Add a body class to create right padding so the fixed sidebar never overlays content
    document.body.classList.add("with-right-sidebar");
    return () => {
      document.body.classList.remove("with-right-sidebar");
    };
  }, [show]);

  if (!show) return null;
  return <FriendsSidebar />;
}
