import mongoose from "mongoose";

const MarksSchema = new mongoose.Schema({
  quiz: {
    type: String,
    default: ''
  },
  assignment: {
    type: String,
    default: ''
  },
  mid: {
    type: String,
    default: ''
  },
  final: {
    type: String,
    default: ''
  }  ,
  quizNminus1: {
    type: String,
    default: 'No'
  },
  assignmentNminus1: {
    type: String,
    default: 'No'
  }
})



const DeadlineSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  submissionLink: {
    type: String,
    default: ''
  },
  lastDate: {
    type: Date,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdByName: {
    type: String,
    default: 'Unknown'
  },
  createdByStudentId: {
    type: String,
    default: 'Unknown'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['theory', 'lab'],
    required: false
  },
  agrees: { 
    type: [String], 
    default: [] 
  },
  disagrees: { 
    type: [String], 
    default: [] 
  }
});

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
  deadlines: {
    type: [DeadlineSchema],
    default: []
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
  theoryMarksDistribution: {
    type: [MarksSchema],
    default: []
  },
  labmarksDistribution: {
    type: [MarksSchema],
    default: []
  }
});

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);