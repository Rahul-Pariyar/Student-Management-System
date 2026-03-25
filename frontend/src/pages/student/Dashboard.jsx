import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  ClipboardList,
  BookOpen,
  Users,
  CheckCircle,
  Clock,
  Briefcase,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { accountService } from "../../services";

export default function Dashboard() {
  const { user, isStudent, isTeacher, isParent, isAdmin } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await accountService.getDashboard();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading dashboard...</div>
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

  // Render Student Dashboard
  if (isStudent) {
    return <StudentDashboard user={user} data={dashboardData} />;
  }

  // Render Teacher Dashboard
  if (isTeacher) {
    return <TeacherDashboard user={user} data={dashboardData} />;
  }

  // Render Parent Dashboard
  if (isParent) {
    return <ParentDashboard user={user} data={dashboardData} />;
  }

  // Render Admin Dashboard
  if (isAdmin) {
    return <AdminDashboard user={user} data={dashboardData} />;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Student Dashboard Component
// ─────────────────────────────────────────────────────────────

function StudentDashboard({ user, data }) {
  const attendance = data?.attendance || {
    percentage: 0,
    total: 0,
    present: 0,
    absent: 0,
  };
  const subjects = data?.subjects || [];
  const assignments = data?.recent_assignments || [];
  const upcomingExams = data?.upcoming_exams || [];

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white shadow">
        <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="mt-1 text-sm text-blue-100 capitalize">
          Student - {data?.enrollment?.class_name || "Not enrolled"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Attendance Card */}
        {/* <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Attendance</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {attendance.percentage}%
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Present: {attendance.present} / {attendance.total} sessions
          </div>
        </div> */}

        {/* Current Subjects Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Current Subjects
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {subjects.length}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">This semester</div>
        </div>
        
        {/* Active Assignments Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Active Assignments
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {assignments.length}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <ClipboardList className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Pending submissions</div>
        </div>

        

        {/* Upcoming Exams Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Upcoming Exams
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {upcomingExams.length}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Scheduled exams</div>
        </div>
      </div>

      {/* Attendance Summary Section */}
      {/* <div className="mb-10 rounded-lg border border-gray-200 bg-white p-7 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Attendance Summary
          </h2>
          <Link
            to="/student/attendance"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View Details &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-5 text-center">
            <p className="text-3xl font-bold text-green-600">
              {attendance.present}
            </p>
            <p className="mt-1 text-sm text-green-700">Present Days</p>
          </div>
          <div className="rounded-lg bg-red-50 p-5 text-center">
            <p className="text-3xl font-bold text-red-600">
              {attendance.absent}
            </p>
            <p className="mt-1 text-sm text-red-700">Absent Days</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-5 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {attendance.percentage}%
            </p>
            <p className="mt-1 text-sm text-blue-700">Attendance Rate</p>
          </div>
        </div>
        {/* Progress Bar */}
        {/* <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-600">Overall Attendance</span>
            <span className="font-medium text-gray-900">
              {attendance.percentage}%
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200">
            <div
              className={`h-3 rounded-full ${
                attendance.percentage >= 75
                  ? "bg-green-500"
                  : attendance.percentage >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${attendance.percentage}%` }}
            />
          </div>
          {attendance.percentage < 75 && (
            <p className="mt-2 text-sm text-red-600">
              ⚠️ Your attendance is below 75%. Please improve!
            </p>
          )}
        </div>
      </div> */} 

      {/* Current Subjects Section */}
      <div className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Current Subjects
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow transition-all hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-gray-500">{subject.code}</p>
                </div>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                  {subject.credits} Credits
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Year {subject.year} • Semester {subject.semester}
              </p>
            </div>
          ))}
          {subjects.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              No subjects enrolled
            </div>
          )}
        </div>
      </div>

      {/* Recent Active Assignments Section */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Recent Assignments
          </h2>
          <Link
            to="/student/assignments"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View Details &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {assignment.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
                      {assignment.assignment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {assignment.subject__name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(assignment.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No active assignments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Exams Section */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Upcoming Exams
          </h2>
          <Link
            to="/student/examinations"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View Details &rarr;
          </Link>
        </div>
        <div className="space-y-3">
          {upcomingExams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 shadow transition-all hover:shadow-md"
            >
              <div className="flex items-center space-x-4">
                <div className="rounded-lg bg-orange-100 p-3">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                  <p className="text-sm text-gray-500">
                    {exam.subject__name} • {exam.exam_type__name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {new Date(exam.exam_date).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {exam.start_time} - {exam.end_time}
                </p>
              </div>
            </div>
          ))}
          {upcomingExams.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              No upcoming exams scheduled
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Teacher Dashboard Component
// ─────────────────────────────────────────────────────────────

function TeacherDashboard({ user, data }) {
  const classes = data?.classes || [];
  const assignmentStats = data?.assignment_stats || {
    total_assignments: 0,
    total_submissions: 0,
    graded: 0,
    pending_grading: 0,
  };
  const attendanceStats = data?.attendance_stats || {
    total_sessions: 0,
    completed: 0,
  };
  const studentsWithUnpaidFees = data?.students_with_unpaid_fees || [];

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-8 text-white shadow">
        <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="mt-1 text-sm text-green-100">Teacher</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Classes</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {classes.length}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Assignments
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {assignmentStats.total_assignments}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <ClipboardList className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Submissions</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {assignmentStats.total_submissions}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sessions</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {attendanceStats.completed} / {attendanceStats.total_sessions}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">My Classes</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <div
              key={cls.assignment_id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow"
            >
              <h3 className="font-semibold text-gray-900">{cls.subject}</h3>
              <p className="mt-1 text-sm text-gray-500">{cls.class}</p>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium">{cls.enrolled_students}</span>{" "}
                students enrolled
              </p>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              No classes assigned
            </div>
          )}
        </div>
      </div>

      {/* Pending Grading */}
      <div className="mb-10 rounded-lg border border-gray-200 bg-white p-7 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Grading Summary
          </h2>
          <Link
            to="/teacher/assignments"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View Details &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-5 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {assignmentStats.total_submissions}
            </p>
            <p className="mt-1 text-sm text-blue-700">Total Submissions</p>
          </div>
          <div className="rounded-lg bg-green-50 p-5 text-center">
            <p className="text-3xl font-bold text-green-600">
              {assignmentStats.graded}
            </p>
            <p className="mt-1 text-sm text-green-700">Graded</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-5 text-center">
            <p className="text-3xl font-bold text-orange-600">
              {assignmentStats.pending_grading}
            </p>
            <p className="mt-1 text-sm text-orange-700">Pending Grading</p>
          </div>
        </div>
      </div>

      {/* Students with Unpaid Fees */}
      {studentsWithUnpaidFees.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Students with Unpaid Fees
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {studentsWithUnpaidFees.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {student.student_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Rs. {student.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          student.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : student.status === "partial"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Parent Dashboard Component
// ─────────────────────────────────────────────────────────────

function ParentDashboard({ user, data }) {
  const children = data?.children || [];

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-10 rounded-lg bg-gradient-to-r from-[#2563EB] to-blue-700 p-8 text-white shadow">
        <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="mt-1 text-sm text-purple-100">Parent</p>
      </div>

      {/* Children Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <div
            key={child.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow"
          >
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-lg font-bold text-purple-600">
                {child.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{child.name}</h3>
                <p className="text-sm text-gray-500">{child.class}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Attendance:</span>
                <span className="font-medium text-gray-900">
                  {child.attendance.percentage}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Unpaid Fees:</span>
                <span
                  className={`font-medium ${child.unpaid_fees > 0 ? "text-red-600" : "text-green-600"}`}
                >
                  Rs. {child.unpaid_fees.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
        {children.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
            No children linked to your account
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Admin Dashboard Component
// ─────────────────────────────────────────────────────────────

function AdminDashboard({ user, data }) {
  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 p-8 text-white shadow">
        <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="mt-1 text-sm text-red-100">Administrator</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Students
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {data?.total_students || 0}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Teachers
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {data?.total_teachers || 0}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Parents</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {data?.total_parents || 0}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Courses</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {data?.total_courses || 0}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <BookOpen className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}