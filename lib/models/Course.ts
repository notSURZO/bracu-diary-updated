import mongoose from "mongoose";

const ClassDetailsSchema = new mongoose.Schema({
  faculty: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  day: {
    type: [String], 
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
});

const SectionSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true
  },
  theory: {
    type: ClassDetailsSchema, 
    required: true
  },
  lab: {
    type: ClassDetailsSchema, 
    required: false
  },
});

// The main Course schema. Each document represents a full course with all its sections.
const CourseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    unique: true
  },
  courseName: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true 
  },
  examDay: {
    type: String,
    required: false
  },
  sections: {
    type: [SectionSchema], 
    required: true
  },
});

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
