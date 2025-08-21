import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import User, { IUser } from '@/lib/models/User';
import CourseResourceDirectory, { ICourseResourceDirectory } from '@/lib/models/CourseResourceDirectory';
import { getConnectionIds } from '@/lib/connections';
import DirectoryCard from '@/app/components/resources/DirectoryCard';

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{owner.name}'s Shared Resources</h1>
      {directories.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          {owner.name} hasn't shared any resources yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {directories.map(dir => (
            <DirectoryCard
              key={String(dir._id)}
              _id={String(dir._id)}
              courseCode={dir.courseCode}
              title={dir.title}
              visibility={dir.visibility}
              ownerUserId={dir.ownerUserId}
              updatedAt={dir.updatedAt as unknown as string}
            />
          ))}
        </div>
      )}
    </div>
  );
}
