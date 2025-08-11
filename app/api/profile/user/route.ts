import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  // Always return address, department, and phone fields, even if missing
  const userObj = user.toObject();
  if (!('bio' in userObj)) userObj.bio = '';
  if (!('address' in userObj)) userObj.address = '';
  if (!('department' in userObj)) userObj.department = '';
  if (!('phone' in userObj)) userObj.phone = '';
  return NextResponse.json({ user: userObj });
  } catch (error) {
    let message = 'Unknown error';
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
