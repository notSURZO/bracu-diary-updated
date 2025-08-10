"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { FaHome, FaBook, FaUsers, FaCalendarAlt, FaChalkboardTeacher, FaCalendarCheck, FaUserCircle } from "react-icons/fa";

const navItems = [
  { name: "Home", href: "/dashboard", icon: <FaHome /> },
  { name: "Profile", href: "/profile", icon: <FaUserCircle /> },
  { name: "Book Shelf", href: "/bookshelf", icon: <FaBook /> },
  { name: "Committee", href: "/committee", icon: <FaUsers /> },
  { name: "Calendar", href: "/calendar", icon: <FaCalendarAlt /> },
  { name: "Courses", href: "/courses", icon: <FaChalkboardTeacher /> },
  { name: "Events", href: "/events", icon: <FaCalendarCheck /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className="bg-white w-64 h-screen shadow-lg flex flex-col">
      <nav className="mt-16">
        <ul>
          {navItems.map(item =>
            item.name !== "Courses" ? (
              <li key={item.name} className="mb-2">
                <Link href={item.href} className={`flex items-center px-6 py-3 rounded-lg transition-colors
                  ${pathname === item.href ? "bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-white font-semibold" : "text-gray-700 hover:bg-blue-50"}`}>
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            ) : (
              <li key={item.name} className="mb-2 relative">
                <button
                  type="button"
                  className={`flex items-center w-full px-6 py-3 rounded-lg transition-colors
                    ${pathname === item.href ? "bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-white font-semibold" : "text-gray-700 hover:bg-blue-50"}`}
                  onClick={() => setDropdownOpen((open) => !open)}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                  <svg className="ml-auto" width="16" height="16" fill="currentColor">
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-6 top-14 z-50 bg-white rounded-lg shadow-lg border border-gray-200 w-48"
                  >
                    <Link
                      href="/courses"
                      className="block w-full px-6 py-3 text-left font-bold text-indigo-700 hover:bg-indigo-50 rounded-t-lg"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Manage Courses
                    </Link>
                    <Link
                      href="/courses/my"
                      className="block w-full px-6 py-3 text-left font-bold text-indigo-700 hover:bg-indigo-50 rounded-b-lg"
                      onClick={() => setDropdownOpen(false)}
                    >
                      My Courses
                    </Link>
                  </div>
                )}
              </li>
            )
          )}
        </ul>
      </nav>
    </aside>
  );
}