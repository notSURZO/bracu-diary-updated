import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../../lib/mongodb';
import User, { IUser } from '../../../lib/models/User';

// Function to escape special regex characters
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const excludeEmail = searchParams.get('excludeEmail')?.trim().toLowerCase();

  console.log('Search query:', query, 'Exclude email:', excludeEmail);

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  if (excludeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(excludeEmail)) {
    return NextResponse.json({ error: 'Invalid excludeEmail format' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    // Escape the query for regex safety
    const escapedQuery = escapeRegex(query);

    // Aggregation pipeline
    const pipeline: any[] = [
      // Stage 1: Split name into words
      {
        $addFields: {
          nameWords: { $split: ['$name', ' '] }
        }
      },
      // Stage 2: Union of first word, second word, and username matches
      {
        $facet: {
          firstWordMatches: [
            {
              $match: {
                'nameWords.0': { $regex: '^' + escapedQuery, $options: 'i' },
                ...(excludeEmail ? { email: { $ne: excludeEmail } } : {})
              }
            },
            { $addFields: { matchType: 'firstWord' } }
          ],
          secondWordMatches: [
            {
              $match: {
                'nameWords.1': { $regex: '^' + escapedQuery, $options: 'i' },
                ...(excludeEmail ? { email: { $ne: excludeEmail } } : {}),
                'nameWords.0': { $not: { $regex: '^' + escapedQuery, $options: 'i' } }
              }
            },
            { $addFields: { matchType: 'secondWord' } }
          ],
          usernameMatches: [
            {
              $match: {
                username: { $regex: '^' + escapedQuery, $options: 'i' },
                ...(excludeEmail ? { email: { $ne: excludeEmail } } : {}),
                nameWords: {
                  $not: {
                    $elemMatch: { $regex: '^' + escapedQuery, $options: 'i' }
                  }
                }
              }
            },
            { $addFields: { matchType: 'username' } }
          ]
        }
      },
      // Stage 3: Combine results
      {
        $project: {
          combined: {
            $concatArrays: ['$firstWordMatches', '$secondWordMatches', '$usernameMatches']
          }
        }
      },
      { $unwind: '$combined' },
      { $replaceRoot: { newRoot: '$combined' } },
      // Stage 4: Sort by matchType and name
      {
        $sort: {
          matchType: 1,
          name: 1
        }
      },
      // Stage 5: Limit to 10 results
      {
        $limit: 10
      },
      // Stage 6: Project required fields
      {
        $project: {
          name: 1,
          username: 1,
          email: 1,
          student_ID: 1,
          picture_url: 1,
          connectionRequests: 1,
          connections: 1,
          _id: 1
        }
      }
    ];

    console.log('MongoDB pipeline:', JSON.stringify(pipeline, null, 2));

    const users = await User.aggregate(pipeline).exec();

    console.log('Found users:', users);

    if (users.length === 0) {
      console.log('No users found for query:', query);
    }

    if (excludeEmail && users.some((user: any) => user.email.toLowerCase() === excludeEmail)) {
      console.warn('Warning: excludeEmail found in results:', excludeEmail);
    }

    const results = users.map((user: any) => ({
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      student_ID: user.student_ID,
      picture_url: user.picture_url,
      connectionRequests: user.connectionRequests || [],
      connections: user.connections || []
    }));

    console.log('Returning results:', results);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}