import CourseResourceClient from "./CourseResourceClient";
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
  const items: Array<{ _id: string; title: string; description?: string; file: any; ownerUserId: string; kind?: 'file' | 'youtube'; youtube?: { url: string; videoId: string }; createdAt?: string; upvoters?: string[]; downvoters?: string[]; ownerDisplayName?: string }> = data.items || [];

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
    <CourseResourceClient 
      initialItems={items} 
      courseCode={courseCode} 
      initialAvatars={avatars}
    />
  );
}
