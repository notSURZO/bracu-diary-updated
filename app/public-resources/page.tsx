import DirectoryCard from "@/app/components/resources/DirectoryCard";
import SearchInput from "@/app/components/resources/SearchInput";
import CreateDirectoryModal from "@/app/components/resources/CreateDirectoryModal";
import SortSelect from "../components/resources/SortSelect";
import { headers } from "next/headers";

export const revalidate = 60;

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
  const res = await fetch(url,
  {
    next: { tags: ["public-resources"], revalidate: 60 },
  });
  if (!res.ok) {
    return { items: [] as Array<{ _id: string; courseCode: string; title: string }>, page: 1, limit: 12 };
  }
  return res.json();
}

export default async function PublicResourcesPage({ searchParams }: { searchParams: { q?: string; page?: string; limit?: string; sort?: string } }) {
  const data = await getDirectories(searchParams);
  const items: Array<{ _id: string; courseCode: string; title: string }> = data.items || [];

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Public Course Resources</h1>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-[280px] w-[560px] max-w-full">
              <SearchInput placeholder="Search course code or folder title" />
            </div>
            <CreateDirectoryModal />
          </div>
          <div className="flex items-center">
            <SortSelect />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
          No folders found. Try a different search or create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((d) => (
            <DirectoryCard key={d._id} _id={d._id} courseCode={d.courseCode} title={d.title} />
          ))}
        </div>
      )}
    </div>
  );
}
