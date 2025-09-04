'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Function to generate SVG icons
const getSvgIcon = (path: string, viewBox: string = "0 0 24 24"): React.ReactElement => (
  <svg className="mr-3 text-lg" fill="currentColor" viewBox={viewBox} width="1em" height="1em">
    <path d={path} />
  </svg>
);

// SVG icons
const Icons = {
  FaHome: getSvgIcon("M12 5.69L19 12V20H5V12L12 5.69ZM12 3.14L3 12H6V22H18V12H21L12 3.14Z"),
  FaUserCircle: getSvgIcon("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.93 0 3.5 1.57 3.5 3.5S13.93 12 12 12s-3.5-1.57-3.5-3.5S10.07 5 12 5zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.88 6-3.88s5.97 1.89 6 3.88c-1.29 1.94-3.5 3.22-6 3.22z"),
  FaRegFolder: getSvgIcon("M10 4H4c-1.11 0-2 .89-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"),
  FaPlus: getSvgIcon("M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"),
  FaRegFileAlt: getSvgIcon("M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"),
  FaRegCopy: getSvgIcon("M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"),
  FaGlobe: getSvgIcon("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.47-7-7.93 0-.12.01-.24.02-.36l6.98-.36V19.93zm6.97-1.74c-.2-.72-.34-1.46-.34-2.2v-4h3.01c-.02 1.25-.23 2.44-.59 3.53l-2.08 2.77zM12 4.07c1.47 0 2.87.35 4.14.97L15 6H9c-.83 0-1.5.67-1.5 1.5V10h-2.1c-.2-.72-.34-1.46-.34-2.2C5.06 5.51 8.24 4.07 12 4.07zm-7.96 4.19c-.06.49-.09 1-.09 1.54 0 4.46 3.05 7.44 7 7.93V4.07C8.24 4.51 5.06 5.95 4.04 8.26zM19.98 12c0-1.25-.23-2.44-.59-3.53l-2.08-2.77c-.2-.72-.34-1.46-.34-2.2V7.5c0-.83-.67-1.5-1.5-1.5H9c-.83 0-1.5.67-1.5 1.5V10h-2.1c-.06.49-.09 1-.09 1.54C5.06 14.49 8.24 15.93 12 15.93c3.76 0 6.94-1.44 7.96-4.19zM15 12V8h3.01c-.02 1.25-.23 2.44-.59 3.53L15 12.07z"),
  FaLock: getSvgIcon("M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V ten10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"),
  FaRegClock: getSvgIcon("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11V7h1.5v3.25L16.25 13l-.75.75L12.5 10.75V7z"),
  FaCalculator: getSvgIcon("M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 16H6v-4h5v4zm3 0h-2v-4h2v4zm3 0h-2v-4h2v4zm0-6H6v-4h11v4z"),
  FaCalendarCheck: getSvgIcon("M19 4h-3V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 1.99 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"),
  FaChartLine: getSvgIcon("M16 18H8v-2h8v2zM16 14H8v-2h8v2zM16 10H8V8h8v2zM21 6H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12z")
};

// Navigation data
const navItems = [
  { name: 'Home', href: '/', icon: Icons.FaHome },
  { name: 'Profile', href: '/profile', icon: Icons.FaUserCircle },
  {
    name: 'Courses',
    href: '#',
    icon: Icons.FaRegFolder,
    subItems: [
      { name: 'Enroll', href: '/enroll', icon: Icons.FaPlus },
  // Link to the courses list page for dynamic selection
  { name: 'Course Reviews', href: '/courses', icon: Icons.FaRegFileAlt },
    ],
  },
  {
    name: 'Manage Resources',
    href: '#',
    icon: Icons.FaRegCopy,
    subItems: [
      { name: 'Public Resources', href: '/public-resources', icon: Icons.FaGlobe },
      { name: 'Private Resources', href: '/private-resources', icon: Icons.FaLock },
    ],
  },
  { name: 'Manage Deadlines', href: '/manage-deadlines', icon: Icons.FaRegClock },
  { name: 'Marks Calculation', href: '/marks-calculation', icon: Icons.FaCalculator },
  { name: 'Events', href: '/events', icon: Icons.FaCalendarCheck },
  { name: 'Recent Activities', href: '/activities', icon: Icons.FaChartLine },
];

interface OpenDropdownsState {
  [key: string]: boolean;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps): React.ReactElement {
  const [openDropdowns, setOpenDropdowns] = useState<OpenDropdownsState>({});
  const pathname = usePathname();

  // Auto-open dropdown if current path matches one of its sub-items
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.subItems?.some((sub) => sub.href === pathname)) {
        setOpenDropdowns((prev) => ({ ...prev, [item.name]: true }));
      }
    });
  }, [pathname]);

  const handleDropdownToggle = (itemName: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpenDropdowns((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  const NavContent = (
    <nav className="p-4">
      <ul>
        {navItems.map((item) => {
            const isActive = !item.subItems && (pathname === item.href || pathname.startsWith(`${item.href}/`));

            return (
              <li key={item.name} className="mb-2">
                <div className={`flex items-center px-6 py-3 rounded-lg transition-colors text-gray-700 hover:bg-blue-100`}>
                  {item.subItems ? (
                    <button
                      type="button"
                      className="flex items-center w-full text-left cursor-pointer focus:outline-none"
                      onClick={handleDropdownToggle(item.name)}
                    >
                      {item.icon}
                      {item.name}
                      <svg
                        className={`ml-auto transform transition-transform ${openDropdowns[item.name] ? 'rotate-180' : ''}`}
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M7 10l5 5 5-5z" />
                      </svg>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center w-full relative ${isActive ? 'text-[oklch(42.4%_0.199_265.638)] font-semibold' : 'text-gray-700'}`}
                    >
                      {item.icon}
                      {item.name}
                      {isActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[oklch(42.4%_0.199_265.638)]"></span>}
                    </Link>
                  )}
                </div>

                {item.subItems && openDropdowns[item.name] && (
                  <ul className="ml-8 mt-2 border-l-2 border-gray-200 pl-4">
                    {item.subItems.map((subItem) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <li key={subItem.name} className="mb-2">
                          <Link
                            href={subItem.href}
                            className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm relative ${
                              isSubActive
                                ? 'text-[oklch(42.4%_0.199_265.638)] font-semibold'
                                : 'text-gray-600 hover:bg-blue-50'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {subItem.icon}
                            {subItem.name}
                            {isSubActive && (
                              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[oklch(42.4%_0.199_265.638)]"></span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed top-24 left-0 h-[calc(100vh-6rem)] w-64 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 z-40 rounded-lg overflow-y-auto">
        {NavContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold">Menu</span>
              <button onClick={onClose} className="text-gray-600">✕</button>
            </div>
            {NavContent}
          </aside>
        </div>
      )}
    </>
  );
}
