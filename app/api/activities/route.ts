import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Activity from '@/lib/models/Activity';
import { auth } from '@clerk/nextjs/server';

// GET - Fetch user activities with pagination and filtering
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const action = searchParams.get('action'); // Filter by action type
    const resourceType = searchParams.get('resourceType'); // Filter by resource type
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = { userId };
    if (action && action !== 'all') query.action = action;
    if (resourceType && resourceType !== 'all') query.resourceType = resourceType;
    
    // Get activities with pagination
    const activities = await Activity.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Activity.countDocuments(query);
    
    // Get activity counts by type for filter options
    const activityCounts = await Activity.aggregate([
      { $match: { userId } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return NextResponse.json({
      success: true,
      activities,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      },
      activityCounts
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

// POST - Create a new activity (for internal use)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { action, resourceType, resourceId, details, visibility = 'private' } = body;

    if (!action || !details?.title) {
      return NextResponse.json(
        { error: 'Missing required fields: action and details.title' },
        { status: 400 }
      );
    }

    const activity = new Activity({
      userId,
      action,
      resourceType,
      resourceId,
      details,
      visibility,
      timestamp: new Date()
    });

    await activity.save();

    return NextResponse.json({
      success: true,
      activity
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}

// Clean up duplicate activities
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Find and remove duplicate course enrollment activities
    const duplicateEnrollments = await Activity.aggregate([
      {
        $match: {
          userId,
          action: 'course_enrolled'
        }
      },
      {
        $group: {
          _id: {
            title: '$details.title',
            description: '$details.description'
          },
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    let removedCount = 0;
    for (const duplicate of duplicateEnrollments) {
      // Keep the most recent one, remove the rest
      const sortedIds = duplicate.docs.sort((a: any, b: any) => b.getTimestamp() - a.getTimestamp());
      const toRemove = sortedIds.slice(1); // Remove all but the first (most recent)
      
      if (toRemove.length > 0) {
        await Activity.deleteMany({ _id: { $in: toRemove } });
        removedCount += toRemove.length;
      }
    }

    // Find and remove duplicate course drop activities
    const duplicateDrops = await Activity.aggregate([
      {
        $match: {
          userId,
          action: 'course_dropped'
        }
      },
      {
        $group: {
          _id: {
            title: '$details.title',
            description: '$details.description'
          },
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    for (const duplicate of duplicateDrops) {
      // Keep the most recent one, remove the rest
      const sortedIds = duplicate.docs.sort((a: any, b: any) => b.getTimestamp() - a.getTimestamp());
      const toRemove = sortedIds.slice(1); // Remove all but the first (most recent)
      
      if (toRemove.length > 0) {
        await Activity.deleteMany({ _id: { $in: toRemove } });
        removedCount += toRemove.length;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cleaned up ${removedCount} duplicate activities` 
    });

  } catch (error) {
    console.error('Error cleaning up activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
