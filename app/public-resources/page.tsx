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
    <div className="px-4 py-6 max-w-screen-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Public Course Resources</h1>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0 w-full sm:w-auto">
            <div className="w-full sm:min-w-[280px] sm:w-[560px] max-w-full">
              <SearchInput placeholder="Search course code or folder title" />
            </div>
            {/* Public directories are now automatically generated from Course database */}
            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              📚 All course directories are automatically available
            </div>
          </div>
          <div className="flex items-center">
            <SortSelect />
          </div>
        </div>
      </div>

      {('error' in (data as any) && (data as any).error) ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(data as any).error}
        </div>
      ) : (
        <PublicDirectoriesClient items={items} pagination={pagination} />
      )}
    </div>
  );
}
