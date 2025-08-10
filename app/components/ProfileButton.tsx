"use client";
import { UserButton } from "@clerk/nextjs";

export default function ProfileButton() {
  return (
    <div className="ml-4">
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}