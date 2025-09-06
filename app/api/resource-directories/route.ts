import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';
import CourseResource from '@/lib/models/CourseResource';
import Course from '@/lib/models/Course';

// GET /api/resource-directories?q=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const sortParam = (searchParams.get('sort') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // Build search filter for courses
    const courseMatch: any = {};
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const anchored = `^${safe}`;
      courseMatch.$or = [
        { courseCode: { $regex: anchored, $options: 'i' } },
        { courseName: { $regex: anchored, $options: 'i' } },
      ];
    }

    // Default: Course Code A–Z when empty
    let sort: Record<string, 1 | -1> = { courseCode: 1, courseName: 1 };
    switch (sortParam) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'code_asc':
        sort = { courseCode: 1, courseName: 1 };
        break;
      case 'code_desc':
        sort = { courseCode: -1, courseName: 1 };
        break;
      case 'title_asc':
        sort = { courseName: 1 };
        break;
      case 'title_desc':
        sort = { courseName: -1 };
        break;
      // default handled above
    }

    // First, ensure all courses have directories created (one-time setup)
    // This is done efficiently by checking if directories exist for all courses
    const allCourses = await Course.find(courseMatch).sort(sort).lean();
    
    // Batch create missing directories for all courses
    const existingDirectories = await CourseResourceDirectory.find({
      courseCode: { $in: allCourses.map(c => c.courseCode) },
      isSubdirectory: { $ne: true },
      visibility: 'public'
    }).select('courseCode').lean();
    
    const existingCourseCodes = new Set(existingDirectories.map(d => d.courseCode));
    const missingCourses = allCourses.filter(c => !existingCourseCodes.has(c.courseCode));
    
    // Create missing directories in batches
    if (missingCourses.length > 0) {
      const directoriesToCreate = [];
      const subdirectoriesToCreate = [];
      
      for (const course of missingCourses) {
        const courseData = course as any;
        
        // Main directory
        directoriesToCreate.push({
          courseCode: courseData.courseCode,
          title: courseData.courseName,
          ownerUserId: 'system',
          visibility: 'public',
          isSubdirectory: false
        });
      }
      
      // Create main directories
      if (directoriesToCreate.length > 0) {
        await CourseResourceDirectory.insertMany(directoriesToCreate);
      }
      
      // Create subdirectories for courses with labs
      const createdDirectories = await CourseResourceDirectory.find({
        courseCode: { $in: missingCourses.map(c => c.courseCode) },
        isSubdirectory: { $ne: true },
        visibility: 'public'
      }).lean();
      
      for (const course of missingCourses) {
        const courseData = course as any;
        const hasLab = courseData.sections?.some((section: any) => section.lab);
        
        if (hasLab) {
          const mainDir = createdDirectories.find(d => d.courseCode === courseData.courseCode);
          if (mainDir) {
            subdirectoriesToCreate.push(
              {
                courseCode: courseData.courseCode,
                title: `${courseData.courseName} - Theory`,
                ownerUserId: 'system',
                visibility: 'public',
                parentDirectoryId: mainDir._id,
                isSubdirectory: true,
                subdirectoryType: 'theory'
              },
              {
                courseCode: courseData.courseCode,
                title: `${courseData.courseName} - Lab`,
                ownerUserId: 'system',
                visibility: 'public',
                parentDirectoryId: mainDir._id,
                isSubdirectory: true,
                subdirectoryType: 'lab'
              }
            );
          }
        }
      }
      
      // Create subdirectories
      if (subdirectoriesToCreate.length > 0) {
        await CourseResourceDirectory.insertMany(subdirectoriesToCreate);
      }
    }
    
    // Now use proper database pagination for the main query
    const total = await CourseResourceDirectory.countDocuments({
      isSubdirectory: { $ne: true },
      visibility: 'public'
    });
    
    // Get paginated main directories directly from database
    const mainDirectories = await CourseResourceDirectory.find({
      isSubdirectory: { $ne: true },
      visibility: 'public'
    })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
    
    // Get resource counts for the paginated directories only
    const directoriesWithCounts = await Promise.all(
      mainDirectories.map(async (dir) => {
        const resourceCount = await CourseResource.countDocuments({
          courseCode: dir.courseCode,
          visibility: 'public',
          $or: [
            { directoryId: { $exists: false } },
            { directoryId: null }
          ]
        });
        
        return {
          ...dir,
          resourceCount
        };
      })
    );
    
    const items = directoriesWithCounts;

    return NextResponse.json({ items, page, limit, total });
  } catch (e) {
    console.error('directories GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/resource-directories
// NOTE: Public directories are now automatically generated from Course database
// This endpoint is kept for backward compatibility but returns an informative message
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({ 
      message: 'Public course directories are now automatically generated from the course database. No manual creation needed.',
      info: 'All courses in the database will automatically appear as public resource directories. For courses with lab sections, Theory and Lab subdirectories will be created automatically.',
      status: 'automatic'
    }, { status: 200 });
  } catch (e) {
    console.error('directories POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
