import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import User, { IUser } from '@/lib/models/User';
import CourseResourceDirectory, { ICourseResourceDirectory } from '@/lib/models/CourseResourceDirectory';
import { getConnectionIds } from '@/lib/connections';
import FolderTile from '@/app/components/resources/FolderTile';
import SearchInput from '@/app/components/resources/SearchInput';
import SortSelect from '@/app/components/resources/SortSelect';
import ConnectionDirectoriesClient from './ConnectionDirectoriesClient';

async function getConnectionUserData(clerkId: string): Promise<IUser | null> {
  await connectToDatabase();
  const user = await User.findOne({ clerkId }).lean();
  if (!user) return null;
  return user as unknown as IUser;
}

async function getViewerUserData(clerkId: string): Promise<IUser | null> {
  await connectToDatabase();
  const user = await User.findOne({ clerkId }).lean();
  if (!user) return null;
  return user as unknown as IUser;
}

async function getSharedDirectories(ownerClerkId: string): Promise<ICourseResourceDirectory[]> {
  await connectToDatabase();
  const directories = await CourseResourceDirectory.find({
    ownerUserId: ownerClerkId,
    visibility: 'connections',
  }).sort({ courseCode: 1 }).lean();
  return directories as unknown as ICourseResourceDirectory[];
}

export default async function ConnectionResourcesPage({ params }: { readonly params: { clerkId:string } }) {
  const { userId: viewerId } = await auth();
  const { clerkId: ownerId } = params;

  if (!viewerId) {
    return <div className="p-6 text-center text-gray-600">Please sign in to view this page.</div>;
  }

  if (viewerId === ownerId) {
    // Redirect to their own private resources page if they somehow navigate here
    const { redirect } = await import('next/navigation');
    redirect('/private-resources');
  }

  const [owner, connectionIds, viewer] = await Promise.all([
    getConnectionUserData(ownerId),
    getConnectionIds(ownerId),
    getViewerUserData(viewerId),
  ]);

  if (!owner) {
    return <div className="p-6 text-center text-gray-600">User not found.</div>;
  }

  // Allow if connected via Connection collection OR legacy email-based connections on User model
  const isConnected =
    connectionIds.includes(viewerId) ||
    (!!owner?.connections && !!viewer?.email && owner.connections.includes(viewer.email)) ||
    (!!viewer?.connections && !!owner?.email && viewer.connections.includes(owner.email));

  if (!isConnected) {
    return <div className="p-6 text-center text-gray-600">You do not have permission to view these resources.</div>;
  }

  const directories = await getSharedDirectories(ownerId);
  const items = directories.map((d) => ({
    _id: String(d._id),
    courseCode: String(d.courseCode),
    title: String(d.title),
    updatedAt: String((d as any).updatedAt || (d as any).createdAt || new Date().toISOString()),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">{owner.name}'s Shared Resources</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:min-w-[280px] sm:w-[560px] max-w-full">
          <SearchInput placeholder="Search course code or folder title" />
        </div>
        <div className="flex items-center"><SortSelect /></div>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
          {owner.name} hasn't shared any resources yet.
        </div>
      ) : (
        <ConnectionDirectoriesClient items={items} />
      )}
    </div>
  );
}
