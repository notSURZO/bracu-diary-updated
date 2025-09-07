import SearchInput from "@/app/components/resources/SearchInput";
import CreateDirectoryModal from "@/app/components/resources/CreateDirectoryModal";
import SortSelect from "../components/resources/SortSelect";
import { headers } from "next/headers";
import PublicDirectoriesClient from "./PublicDirectoriesClient";

export const revalidate = 0;

async function getDirectories(params: { q?: string; page?: string; limit?: string; sort?: string }) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", params.page);
  // Set default limit to 50 to show more courses
  qs.set("limit", params.limit || "50");
  if (params.sort) qs.set("sort", params.sort);

  const query = qs.toString();
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}/api/resource-directories`;
  const url = query ? `${baseUrl}?${query}` : baseUrl;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    let message = `Failed to load resources (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    return { items: [] as Array<{ _id: string; courseCode: string; title: string }>, page: 1, limit: 12, error: message } as any;
  }
  return res.json();
}

export default async function PublicResourcesPage({ searchParams }: { readonly searchParams: Promise<{ q?: string; page?: string; limit?: string; sort?: string }> }) {
  const sp = await searchParams;
  const data = await getDirectories(sp);
  const items: Array<{ _id: string; courseCode: string; title: string; updatedAt: string; }> = (data.items || []).map((d: any) => ({
    _id: String(d._id),
    courseCode: String(d.courseCode),
    title: String(d.title),
    updatedAt: String(d.updatedAt || d.createdAt || new Date().toISOString()),
  }));

  const pagination = data.page && data.limit && data.total ? {
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: Math.ceil(data.total / data.limit)
  } : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-8 max-w-screen-2xl mx-auto">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight">Public Courses</h1>
                <p className="text-gray-600 text-lg mt-2 leading-relaxed">Browse and access course materials from all departments</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:min-w-[320px] sm:w-[600px] max-w-full">
                <SearchInput placeholder="Search course code or folder title" />
              </div>
              <div className="flex items-center">
                <SortSelect />
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {('error' in (data as any) && (data as any).error) ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Error loading resources</span>
              </div>
              <p className="mt-1">{(data as any).error}</p>
            </div>
          ) : (
            <PublicDirectoriesClient items={items} pagination={pagination} />
          )}
        </div>
      </div>
    </div>
  );
}
