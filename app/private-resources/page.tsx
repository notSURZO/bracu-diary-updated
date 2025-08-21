import DirectoryCard from "@/app/components/resources/DirectoryCard";
import SearchInput from "@/app/components/resources/SearchInput";
import CreateDirectoryModal from "@/app/components/resources/CreateDirectoryModal";
import SortSelect from "../components/resources/SortSelect";
import { headers } from "next/headers";
import PrivateDirectoriesClient from "./PrivateDirectoriesClient";

export const revalidate = 60;

async function getDirectories(searchParams: { q?: string; page?: string; limit?: string; sort?: string }) {
  const qs = new URLSearchParams();
  if (searchParams.q) qs.set("q", searchParams.q);
  if (searchParams.page) qs.set("page", searchParams.page);
  if (searchParams.limit) qs.set("limit", searchParams.limit);
  if (searchParams.sort) qs.set("sort", searchParams.sort);

  const query = qs.toString();
  // Build absolute URL so server-side fetch can resolve it, and forward cookies for Clerk auth
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}/api/private-resource-directories`;
  const url = query ? `${baseUrl}?${query}` : baseUrl;
  const cookie = hdrs.get("cookie") || "";
  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie },
    next: { tags: ["private-resources"], revalidate: 60 },
  });
  if (!res.ok) {
    return { items: [] as Array<{ _id: string; courseCode: string; title: string }>, page: 1, limit: 12 };
  }
  return res.json();
}

export default async function PrivateResourcesPage({ searchParams }: { searchParams: { q?: string; page?: string; limit?: string; sort?: string } }) {
  const data = await getDirectories(searchParams);
  const items: Array<{ _id: string; courseCode: string; title: string }> = data.items || [];

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Private Course Resources</h1>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-[280px] w-[560px] max-w-full">
              <SearchInput placeholder="Search course code or folder title" />
            </div>
            <CreateDirectoryModal isPrivate={true} />
          </div>
          <div className="flex items-center">
            <SortSelect />
          </div>
        </div>
      </div>

      <PrivateDirectoriesClient items={items as any} />
    </div>
  );
}
