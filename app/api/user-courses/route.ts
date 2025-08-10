import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function POST(req: Request) {
  await connectToDatabase();
  const { email, selectedCourses } = await req.json();
  await User.findOneAndUpdate(
    { email },
    { $set: { enrolledCourses: selectedCourses } },
    { new: true }
  );
  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  await connectToDatabase();
  const { email, selectedCourses } = await req.json();
  await User.findOneAndUpdate(
    { email },
    { $set: { enrolledCourses: selectedCourses } },
    { new: true }
  );
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const user = await User.findOne({ email });
  return NextResponse.json({ enrolledCourses: user?.enrolledCourses || [] });
}