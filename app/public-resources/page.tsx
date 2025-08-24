import FolderTile from "@/app/components/resources/FolderTile";
import SearchInput from "@/app/components/resources/SearchInput";
import CreateDirectoryModal from "@/app/components/resources/CreateDirectoryModal";
import SortSelect from "../components/resources/SortSelect";
import { headers } from "next/headers";
import PublicDirectoriesClient from "./PublicDirectoriesClient";

export const revalidate = 0;

async function getDirectories(searchParams: { q?: string; page?: string; limit?: string; sort?: string }) {
  const qs = new URLSearchParams();
  if (searchParams.q) qs.set("q", searchParams.q);
  if (searchParams.page) qs.set("page", searchParams.page);
  if (searchParams.limit) qs.set("limit", searchParams.limit);
  if (searchParams.sort) qs.set("sort", searchParams.sort);

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

export default async function PublicResourcesPage({ searchParams }: { readonly searchParams: { q?: string; page?: string; limit?: string; sort?: string } }) {
  const data = await getDirectories(searchParams);
  const items: Array<{ _id: string; courseCode: string; title: string; updatedAt: string; }> = (data.items || []).map((d: any) => ({
    _id: String(d._id),
    courseCode: String(d.courseCode),
    title: String(d.title),
    updatedAt: String(d.updatedAt || d.createdAt || new Date().toISOString()),
  }));

  return (
    <div className="px-4 py-6 max-w-screen-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Public Course Resources</h1>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
            <div className="w-full sm:min-w-[280px] sm:w-[560px] max-w-full">
              <SearchInput placeholder="Search course code or folder title" />
            </div>
            <CreateDirectoryModal />
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
        <PublicDirectoriesClient items={items} />
      )}
    </div>
  );
}
