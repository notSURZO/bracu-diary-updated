import ResourceCard from "@/app/components/resources/ResourceCard";
import SearchInput from "@/app/components/resources/SearchInput";
import UploadPublicResourceForm from "@/app/components/resources/UploadPublicResourceForm";
import { SignedIn } from "@clerk/nextjs";
import { clerkClient as getClerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";

export const revalidate = 60;

async function getResources(courseCode: string, params: { q?: string; page?: string; limit?: string }) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);

  const query = qs.toString();
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const queryString = query ? `?${query}` : '';
  const url = `${proto}://${host}/api/public-resources/by-course/${encodeURIComponent(courseCode)}${queryString}`;
  const res = await fetch(url, { 
    next: { 
      tags: ["public-resources", `public-resources:${courseCode}`], 
      revalidate: 0 
    } 
  });
  if (!res.ok) {
    return { items: [], page: 1, limit: 12, total: 0 } as any;
  }
  return res.json();
}

export default async function CoursePublicResourcesPage({ params, searchParams }: Readonly<{ params: Promise<{ courseCode: string }>; searchParams: Promise<{ q?: string; page?: string; limit?: string }> }>) {
  const { courseCode: raw } = await params;
  const sp = await searchParams;
  const courseCode = decodeURIComponent(raw).toUpperCase();
  const data = await getResources(courseCode, sp);
  const items: Array<{ _id: string; title: string; description?: string; file: any; ownerUserId: string }> = data.items || [];

  // Client-side prefix filter for instant updates
  const q = (sp.q || "").trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => {
        const t = (it.title || "").toLowerCase();
        const d = (it.description || "").toLowerCase();
        return t.startsWith(q) || d.startsWith(q);
      })
    : items;

  // Fetch uploader avatars (best-effort)
  const avatars = await Promise.all(
    items.map(async (it) => {
      try {
        const client = await (getClerkClient as any)();
        const user = await client.users.getUser(it.ownerUserId);
        return user.imageUrl || null;
      } catch {
        return null;
      }
    })
  );

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{courseCode} Public Resources</h1>
        <SearchInput placeholder="Search title or description" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
          No resources found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r, idx) => (
            <ResourceCard key={r._id} title={r.title} description={r.description} file={r.file} ownerAvatarUrl={avatars[idx]} />
          ))}
        </div>
      )}
      <SignedIn>
        <UploadPublicResourceForm courseCode={courseCode} />
      </SignedIn>
    </div>
  );
}
