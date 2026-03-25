import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileSignature,
  Loader2,
} from "lucide-react";
import { accountService, academicService } from "../../services";

export default function Classes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all teacher's classes from dashboard
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const { data } = await accountService.getDashboard();
        const classList = data?.classes || [];
        setClasses(classList);

        // Pre-select from query param or first class
        const preselect = searchParams.get("assignmentId");
        const match = classList.find(
          (c) => String(c.assignment_id) === preselect,
        );
        if (match) setSelectedClass(match);
        else if (classList.length > 0) setSelectedClass(classList[0]);
      } catch {
        setError("Failed to load classes");
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [searchParams]);

  // Fetch students when selected class changes
  const fetchStudents = useCallback(async () => {
    if (!selectedClass?.class_id) return;
    try {
      setStudentsLoading(true);
      const { data } = await academicService.listEnrollments({
        class_enrolled: selectedClass.class_id,
        is_active: true,
      });
      setStudents(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error("Failed to load students:", err);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleClassChange = (e) => {
    const cls = classes.find((c) => String(c.assignment_id) === e.target.value);
    setSelectedClass(cls || null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading classes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-16 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-600">
          No Classes Assigned
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          You don't have any classes assigned for the current academic year.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Top Bar: Dropdown + Action Buttons */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Class Selector */}
        <div className="relative w-full sm:max-w-xs">
          <label
            htmlFor="classSelect"
            className="mb-1 block text-sm font-medium text-gray-600"
          >
            Select Class
          </label>
          <div className="relative">
            <select
              id="classSelect"
              value={selectedClass?.assignment_id || ""}
              onChange={handleClassChange}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {classes.map((cls) => (
                <option key={cls.assignment_id} value={cls.assignment_id}>
                  {cls.subject} — {cls.class}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Action Buttons */}
        {selectedClass && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                navigate(
                  `/teacher/attendance?assignmentId=${selectedClass.assignment_id}`,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <CalendarCheck className="h-4 w-4" />
              Take Attendance
            </button>
            {/* <button
              onClick={() =>
                navigate(
                  `/teacher/examinations?assignmentId=${selectedClass.assignment_id}`,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors"
            >
              <FileSignature className="h-4 w-4" />
              Create Exam
            </button> */}
            <button
              onClick={() =>
                navigate(
                  `/teacher/assignments?assignmentId=${selectedClass.assignment_id}`,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Create Assignment
            </button>
          </div>
        )}
      </div>

      {/* Class Info Card */}
      {selectedClass && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-400">Subject</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {selectedClass.subject}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-400">Class</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {selectedClass.class}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-400">
              Enrolled Students
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {selectedClass.enrolled_students}
            </p>
          </div>
        </div>
      )}

      {/* Students Table */}
      {selectedClass && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <Users className="h-5 w-5 text-gray-500" />
              Students
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {students.length} students
            </span>
          </div>

          {studentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                Loading students...
              </span>
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              No students enrolled in this class.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Enrolled On
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-gray-900">
                        {student.student_name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                        {student.enrollment_date}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            student.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {student.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}