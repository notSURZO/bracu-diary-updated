"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <aside className="bg-white w-64 h-screen shadow-lg flex flex-col fixed left-0 top-16 z-40">
      <nav className="mt-8">
        <ul>
          {navItems.map(item => (
            <li key={item.name} className="mb-2">
              <Link href={item.href} className={`flex items-center px-6 py-3 rounded-lg transition-colors
                ${pathname === item.href ? "bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-white font-semibold" : "text-gray-700 hover:bg-blue-50"}`}>
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}