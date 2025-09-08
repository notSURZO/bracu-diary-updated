'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaCalculator, FaEdit, FaPlusCircle, FaCheckCircle, FaTimesCircle, FaPercent } from 'react-icons/fa';

// --- TYPE DEFINITIONS ---
interface Mark {
  deadlineId: string;
  obtained: number;
  outOf: number;
}
interface CourseMarks {
  quiz: Mark[];
  assignment: Mark[];
  mid: Mark[];
  final: Mark[];
}
interface Deadline {
  _id: string;
  id: string;
  title: string;
  category?: 'Quiz' | 'Assignment' | 'Mid' | 'Final';
}
interface MarksDistribution {
    quiz: string; assignment: string; mid: string; final: string;
    quizNminus1: string; assignmentNminus1: string;
}
interface CourseDetails {
    _id: string;
    theoryMarksDistribution: MarksDistribution[];
    labmarksDistribution: MarksDistribution[];
}

// --- CALCULATION HELPER ---
const calculateFinalMark = (marks: Mark[], nMinusOne: boolean, weight: number): number => {
    if (marks.length === 0 || !weight) return 0;
  
    let marksToConsider = [...marks];
    
    if (nMinusOne && marks.length > 1) {
      const marksWithPercentage = marks.map(m => ({ ...m, percentage: (m.obtained / m.outOf) * 100 }));
      marksWithPercentage.sort((a, b) => a.percentage - b.percentage);
      const lowestMarkDeadlineId = marksWithPercentage[0].deadlineId;
      marksToConsider = marks.filter(m => m.deadlineId !== lowestMarkDeadlineId);
    }
  
    if (marksToConsider.length === 0) return 0;
  
    const totalObtained = marksToConsider.reduce((sum, m) => sum + m.obtained, 0);
    const totalOutOf = marksToConsider.reduce((sum, m) => sum + m.outOf, 0);
    
    if (totalOutOf === 0) return 0;
  
    return (totalObtained / totalOutOf) * weight;
};

// --- COMPONENT FOR DISPLAYING A SECTION (THEORY/LAB) ---
const MarksSection = ({ title, deadlines, marks, distribution, courseId, onMarksUpdated }: any) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
    const [markData, setMarkData] = useState({ type: 'quiz', obtained: '', outOf: '' });
    const [includedDeadlines, setIncludedDeadlines] = useState<Record<string, boolean>>({});

    // Separate deadlines into pending and updated based on marks presence
    const pendingDeadlines = deadlines.filter((d: Deadline) => {
        const allMarks = [...marks.quiz, ...marks.assignment, ...marks.mid, ...marks.final];
        return !allMarks.some(m => m.deadlineId === d.id);
    });

    const updatedDeadlines = useMemo(() => {
        return deadlines.filter((d: Deadline) => {
            const allMarks = [...marks.quiz, ...marks.assignment, ...marks.mid, ...marks.final];
            return allMarks.some(m => m.deadlineId === d.id);
        });
    }, [deadlines, marks]);

    // Initialize includedDeadlines state when updatedDeadlines change
    useEffect(() => {
        const initialIncluded: Record<string, boolean> = {};
        updatedDeadlines.forEach((d: Deadline) => {
            initialIncluded[d.id] = true;
        });
        setIncludedDeadlines(initialIncluded);
    }, [updatedDeadlines]);

    const openModal = (deadline: Deadline) => {
        setSelectedDeadline(deadline);
        // Pre-fill form with existing data if available
        const allMarks = [...marks.quiz, ...marks.assignment, ...marks.mid, ...marks.final];
        const existingMark = allMarks.find(m => m.deadlineId === deadline.id);
        const deadlineCategory = deadline.category || 'Quiz';
        if (existingMark) {
            setMarkData({ type: deadlineCategory, obtained: String(existingMark.obtained), outOf: String(existingMark.outOf) });
        } else {
            setMarkData({ type: deadlineCategory, obtained: '', outOf: '' });
        }
        setIsModalOpen(true);
    };

    // Handler for toggling included deadlines
    const toggleIncludeDeadline = (deadlineId: string) => {
        setIncludedDeadlines(prev => ({
            ...prev,
            [deadlineId]: !prev[deadlineId],
        }));
    };

    // Filter marks based on includedDeadlines and updatedDeadlines
    const filteredMarks = useMemo(() => {
        const updatedDeadlineIds = new Set(updatedDeadlines.map((d: Deadline) => d.id));
        const filterMarks = (marksArray: Mark[]) => marksArray.filter(m => includedDeadlines[m.deadlineId] !== false && updatedDeadlineIds.has(m.deadlineId));
        return {
            quiz: filterMarks(marks.quiz),
            assignment: filterMarks(marks.assignment),
            mid: filterMarks(marks.mid),
            final: filterMarks(marks.final),
        };
    }, [marks, includedDeadlines, updatedDeadlines]);

    // Calculate marks based on filtered marks
    const calculatedMarks = useMemo(() => {
        if (!distribution) return {};
        return {
            quiz: calculateFinalMark(filteredMarks.quiz, distribution.quizNminus1 === 'Yes', parseFloat(distribution.quiz)),
            assignment: calculateFinalMark(filteredMarks.assignment, distribution.assignmentNminus1 === 'Yes', parseFloat(distribution.assignment)),
            mid: calculateFinalMark(filteredMarks.mid, false, parseFloat(distribution.mid)),
            final: calculateFinalMark(filteredMarks.final, false, parseFloat(distribution.final)),
        };
    }, [filteredMarks, distribution]);

    const handleMarkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeadline) return;

        const response = await fetch('/api/user-marks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            deadlineId: selectedDeadline.id,
            type: markData.type,
            obtained: parseFloat(markData.obtained),
            outOf: parseFloat(markData.outOf)
          }),
        });

        if (response.ok) {
            toast.success('Marks updated successfully!');
        } else {
            toast.error('Failed to update marks');
        }

        onMarksUpdated(); // Callback to refresh data on the parent
        setIsModalOpen(false);
    };

    const totalMarks = Object.values(calculatedMarks).reduce((sum: number, mark: any) => sum + (mark || 0), 0);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
            <h2 className="text-xl font-bold text-brac-navy border-b border-gray-200 pb-3 flex items-center gap-2">
                <FaCalculator className="text-brac-blue" />
                {title} Marks
            </h2>
            
            <div>
                <h3 className="text-lg font-medium text-brac-navy mb-3 flex items-center gap-2">
                    <FaPlusCircle className="text-brac-blue" />
                    Pending Mark Updates
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {pendingDeadlines.length > 0 ? pendingDeadlines.map((d: Deadline) => (
                        <div key={d.id} className="flex justify-between items-center p-3 bg-brac-blue-light rounded-md">
                            <span className="text-sm text-brac-navy"><b>{d.category}</b>: {d.title}</span>
                            
                            <button 
                                onClick={() => openModal(d)} 
                                className="px-3 py-1 bg-brac-blue text-white text-xs rounded-md hover:bg-brac-blue-dark flex items-center gap-1"
                            >
                                <FaEdit size={12} />
                                Update
                            </button>
                        </div>
                    )) : (
                        <div className="p-4 bg-gray-50 rounded-md text-center">
                            <p className="text-sm text-brac-blue">All marks are up to date.</p>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium text-brac-navy mb-3 flex items-center gap-2">
                    <FaCheckCircle className="text-brac-blue" />
                    Marks Updated
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {updatedDeadlines.length > 0 ? updatedDeadlines.map((d: Deadline) => (
                        <div key={d.id} className="flex justify-between items-center p-3 bg-brac-gold-light rounded-md">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={includedDeadlines[d.id] !== false}
                                    onChange={() => toggleIncludeDeadline(d.id)}
                                    className="form-checkbox h-4 w-4 text-brac-blue rounded"
                                />
                                <span className="text-sm text-brac-navy"><b>{d.category}</b>: {d.title}</span>
                            </label>
                            <button 
                                onClick={() => openModal(d)} 
                                className="px-3 py-1 bg-brac-gold text-brac-navy text-xs rounded-md hover:bg-brac-gold-dark flex items-center gap-1"
                            >
                                <FaEdit size={12} />
                                Edit
                            </button>
                        </div>
                    )) : (
                        <div className="p-4 bg-gray-50 rounded-md text-center">
                            <p className="text-sm text-brac-blue">No marks updated yet.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-brac-navy mb-3 flex items-center gap-2">
                    <FaPercent className="text-brac-blue" />
                    Calculated Marks
                </h3>
                <div className="space-y-3 text-sm">
                    {Object.entries(calculatedMarks).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                            <span className="capitalize text-brac-navy font-medium">{key}:</span>
                            <span className="font-semibold text-brac-blue">
                                {Number(value).toFixed(2)} / {distribution?.[key as keyof MarksDistribution]}%
                            </span>
                        </div>
                    ))}
                    <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-200 mt-2">
                        <span className="text-brac-navy">Total:</span>
                        <span className="text-brac-blue">{totalMarks.toFixed(2)}%</span>
                    </div>
                </div>
            </div>
            
            {/* Modal for updating marks */}
            {isModalOpen && selectedDeadline && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
                        <h2 className="text-xl font-bold text-brac-navy mb-4 flex items-center gap-2">
                            <FaEdit className="text-brac-blue" />
                            Update Marks for "{selectedDeadline.title}"
                        </h2>
                        <form onSubmit={handleMarkSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brac-navy mb-1">Type</label>
                                <input
                                    type="text"
                                    value={markData.type}
                                    readOnly
                                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-brac-navy"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brac-navy mb-1">Obtained</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        required 
                                        value={markData.obtained} 
                                        onChange={e => setMarkData({...markData, obtained: e.target.value})} 
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-brac-blue focus:border-brac-blue" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brac-navy mb-1">Out Of</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        required 
                                        value={markData.outOf} 
                                        onChange={e => setMarkData({...markData, outOf: e.target.value})} 
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-brac-blue focus:border-brac-blue" 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="px-4 py-2 bg-gray-200 text-brac-navy rounded-md hover:bg-gray-300 font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-brac-blue text-white rounded-md hover:bg-brac-blue-dark font-medium"
                                >
                                    Save Marks
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


// --- MAIN PAGE COMPONENT ---
export default function MarksPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const router = useRouter();
    const [finishedDeadlines, setFinishedDeadlines] = useState<{ theory: Deadline[], lab: Deadline[] }>({ theory: [], lab: [] });
    const [courseMarks, setCourseMarks] = useState<CourseMarks>({ quiz: [], assignment: [], mid: [], final: [] });
    const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        console.log("Course ID from params:", courseId);
        if (!courseId) return;
        setLoading(true);
        try {
            // First fetch course details to get the original courseId
            const courseRes = await fetch(`/api/courses-surzo/${courseId}`);
            let courseData = null;
            let originalCourseId = courseId;

            if (courseRes.ok) {
                courseData = await courseRes.json();
                originalCourseId = courseData._id; // Use the original courseId for API calls
            } else {
                console.error("Failed to fetch course details:", courseRes.status);
                // Don't throw error for course details, just leave it null
            }

            // Use the original courseId for all other API calls
            const [deadlinesRes, marksRes] = await Promise.all([
                fetch(`/api/get-finished-deadlines?courseId=${originalCourseId}`),
                fetch(`/api/user-marks?courseId=${originalCourseId}`)
            ]);

            // Handle responses more gracefully - don't throw errors for 404s, just set empty data
            let deadlinesData = { deadlines: { theory: [], lab: [] } };
            let marksData = { quiz: [], assignment: [], mid: [], final: [] };

            if (deadlinesRes.ok) {
                deadlinesData = await deadlinesRes.json();
            } else if (deadlinesRes.status === 404) {
                console.log("No deadlines found for course, using empty data");
            } else {
                console.error("Unexpected error fetching deadlines:", deadlinesRes.status);
            }

            if (marksRes.ok) {
                marksData = await marksRes.json();
            } else if (marksRes.status === 404) {
                console.log("No marks found for course, using empty data");
            } else {
                console.error("Unexpected error fetching marks:", marksRes.status);
            }

            console.log("Deadlines data:", deadlinesData);
            console.log("Marks data:", marksData);
            console.log("Course data:", courseData);

            // If the courseId param is different from the original courseId, redirect to original
            if (courseData && courseId !== courseData._id) {
                router.replace(`/marks-calculation/${courseData._id}`);
                return; // Don't set state since we're redirecting
            }

            setFinishedDeadlines(deadlinesData.deadlines || { theory: [], lab: [] });
            setCourseMarks(marksData);
            setCourseDetails(courseData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            // Set empty data on error to prevent the page from breaking
            setFinishedDeadlines({ theory: [], lab: [] });
            setCourseMarks({ quiz: [], assignment: [], mid: [], final: [] });
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brac-blue"></div>
                <span className="ml-3 text-brac-navy">Calculating Marks...</span>
            </div>
        );
    }

    const theoryDistribution = courseDetails?.theoryMarksDistribution?.[0];
    const labDistribution = courseDetails?.labmarksDistribution?.[0];

    return (
        <div className="bg-gray-50 min-h-screen p-4 md:p-6">
            <ToastContainer />
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
                    <h1 className="text-2xl font-bold text-brac-navy mb-2">Marks Calculation</h1>
                    <p className="text-brac-blue">Track and calculate your course marks based on completed deadlines</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {theoryDistribution && (
                        <MarksSection
                            title="Theory"
                            deadlines={finishedDeadlines.theory}
                            marks={courseMarks}
                            distribution={theoryDistribution}
                            courseId={courseId}
                            onMarksUpdated={fetchData}
                        />
                    )}
                    {labDistribution && (
                        <MarksSection
                            title="Lab"
                            deadlines={finishedDeadlines.lab}
                            marks={courseMarks}
                            distribution={labDistribution}
                            courseId={courseId}
                            onMarksUpdated={fetchData}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}