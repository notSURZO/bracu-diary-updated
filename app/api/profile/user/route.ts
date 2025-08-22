import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import _ from 'lodash';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ message: 'Email parameter is missing' }, { status: 400 });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userObj = user.toObject();
    
    // Define default values for all fields to ensure the frontend always receives a complete object
    const defaults = {
      bio: '',
      address: '',
      department: '',
      phone: '',
      dateOfBirth: null,
      bloodGroup: '',
      theme_color: 'blue', // Default theme
      socialMedia: { 
          linkedin: '', github: '', facebook: '', 
          instagram: '', snapchat: '', twitter: '', 
          website: '', youtube: ''
      },
      education: { school: '', college: '' },
      connections: [],
    };

    // Deep merge the defaults with the user object from the database.
    // This ensures that any fields missing from the DB document are added before sending.
    const populatedUser = _.merge({}, defaults, userObj);

    return NextResponse.json({ user: populatedUser });

  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: message }, { status: 500 });
  }
}