import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Activity from '@/lib/models/Activity';
import { auth } from '@clerk/nextjs/server';

// DELETE - Delete a specific activity
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;

    // Find the activity and verify ownership
    const activity = await Activity.findOne({ 
      _id: id, 
      userId 
    });

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found or access denied' }, 
        { status: 404 }
      );
    }

    // Delete the activity
    await Activity.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      message: 'Activity deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
