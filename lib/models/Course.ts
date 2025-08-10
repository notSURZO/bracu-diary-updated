import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema({
  name: String,
  faculty: String,
  section: String,
  time: String,
  examDay: String,
});

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);