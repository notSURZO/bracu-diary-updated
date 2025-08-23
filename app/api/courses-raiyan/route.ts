import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/lib/models/Course";
import mongoose from "mongoose";

export async function GET() {
  await connectToDatabase();
  const courses = await Course.find({});
  return NextResponse.json(courses);
}

export async function POST(req: Request) {
  await connectToDatabase();
  const { ids } = await req.json();
  // Convert to ObjectId
  const objectIds = ids.map((id: string) => new mongoose.Types.ObjectId(id));
  const courses = await Course.find({ _id: { $in: objectIds } });
  return NextResponse.json(courses);
}