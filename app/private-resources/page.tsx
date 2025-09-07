import SearchInput from "@/app/components/resources/SearchInput";
import CreateDirectoryModal from "@/app/components/resources/CreateDirectoryModal";
import ConnectionsDropdown from "@/app/components/resources/ConnectionsDropdown";
import SortSelect from "../components/resources/SortSelect";
import { headers } from "next/headers";
import PrivateDirectoriesClient from "./PrivateDirectoriesClient";

export const revalidate = 60;

async function getDirectories(params: { q?: string; page?: string; limit?: string; sort?: string }) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  if (params.sort) qs.set("sort", params.sort);

  const query = qs.toString();
  // Build absolute URL so server-side fetch can resolve it, and forward cookies for Clerk auth
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}/api/private-resource-directories`;
  const url = query ? `${baseUrl}?${query}` : baseUrl;
  const cookie = hdrs.get("cookie") || "";
  const res = await fetch(url, {
    headers: { cookie },
    next: { tags: ["private-resources"], revalidate: 60 },
  });
  if (!res.ok) {
    return { items: [] as Array<{ _id: string; courseCode: string; title: string; visibility: 'private' | 'connections' | 'public'; ownerUserId: string; updatedAt: string }>, page: 1, limit: 12 };
  }
  return res.json();
}

export default async function PrivateResourcesPage({ searchParams }: { readonly searchParams: Promise<{ q?: string; page?: string; limit?: string; sort?: string }> }) {
  const sp = await searchParams;
  const data = await getDirectories(sp);
  const items: Array<{ _id: string; courseCode: string; title: string; visibility: 'private' | 'connections' | 'public'; ownerUserId: string; updatedAt: string }> = data.items || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-8 max-w-screen-2xl mx-auto">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight">Private Resources</h1>
                <p className="text-gray-600 text-lg mt-2 leading-relaxed">Manage your personal course materials and folders</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 min-w-0 w-full sm:w-auto">
                <div className="w-full sm:min-w-[320px] sm:w-[600px] max-w-full">
                  <SearchInput placeholder="Search course code or folder title" />
                </div>
                <div className="flex gap-3">
                  <CreateDirectoryModal isPrivate={true} />
                  <ConnectionsDropdown />
                </div>
              </div>
              <div className="flex items-center">
                <SortSelect />
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <PrivateDirectoriesClient items={items} />
        </div>
      </div>
    </div>
  );
}
