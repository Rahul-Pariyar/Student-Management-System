import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  Heart,
  BookOpen,
  UserPlus,
  School,
  ClipboardList,
  FileText,
  CalendarCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import api from "../../services/api";

function Dashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_parents: 0,
    total_courses: 0,
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);
  const [recentClasses, setRecentClasses] = useState([]);
  const [recentExams, setRecentExams] = useState([]);

  const [feeSummary, setFeeSummary] = useState({
    total_due: 0,
    total_collected: 0,
    pending_count: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardRes, coursesRes, classesRes, examsRes, feesRes] =
        await Promise.all([
          api.get("/accounts/dashboard/"),
          api.get("/academic/courses/"),
          api.get("/academic/classes/?ordering=-id"),
          api.get("/examination/exams/"),
          api.get("/fees/summary/").catch(() => ({ data: {} })),
        ]);

      setStats({
        total_students: dashboardRes.data.total_students || 0,
        total_teachers: dashboardRes.data.total_teachers || 0,
        total_parents: dashboardRes.data.total_parents || 0,
        total_courses: dashboardRes.data.total_courses || 0,
      });

      setRecentUsers(dashboardRes.data.recent_users || []);
      setRecentCourses(coursesRes.data.results || coursesRes.data || []);
      setRecentClasses(classesRes.data.results || classesRes.data || []);

      const allExams = examsRes.data.results || examsRes.data || [];
      const upcomingExams = allExams.filter(
        (exam) => new Date(exam.exam_date) >= new Date(),
      );
      setRecentExams(upcomingExams.slice(0, 5));

      if (feesRes.data) {
        setFeeSummary({
          total_due: Number(feesRes.data.total_due) || 0,
          total_collected: Number(feesRes.data.total_collected) || 0,
          pending_count: Number(feesRes.data.pending_count) || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUserTypeBadge = (userType) => {
    const colors = {
      student: "bg-blue-100 text-blue-800",
      teacher: "bg-green-100 text-green-800",
      parent: "bg-purple-100 text-purple-800",
      admin: "bg-gray-100 text-gray-800",
    };
    return colors[userType] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of school management system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Students */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">
                Total Students
              </p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats.total_students}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <Link
            to="/admin/users?user_type=student"
            className="text-blue-600 text-sm mt-3 inline-block hover:underline"
          >
            View all students →
          </Link>
        </div>

        {/* Total Teachers */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">
                Total Teachers
              </p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats.total_teachers}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <GraduationCap className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <Link
            to="/admin/users?user_type=teacher"
            className="text-green-600 text-sm mt-3 inline-block hover:underline"
          >
            View all teachers →
          </Link>
        </div>

        {/* Total Parents */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Parents</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats.total_parents}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Heart className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <Link
            to="/admin/users?user_type=parent"
            className="text-purple-600 text-sm mt-3 inline-block hover:underline"
          >
            View all parents →
          </Link>
        </div>

        {/* Total Courses */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Courses</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats.total_courses}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <BookOpen className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <Link
            to="/admin/academic/courses"
            className="text-yellow-600 text-sm mt-3 inline-block hover:underline"
          >
            View all courses →
          </Link>
        </div>
      </div>

      {/* Fee Summary Card */}
      {feeSummary.total_due > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Fee Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Total Due</p>
              <p className="text-2xl font-bold text-red-600">
                Rs.{feeSummary.total_due.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">
                Rs.{feeSummary.total_collected.toFixed(2)}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Pending Payments</p>
              <p className="text-2xl font-bold text-yellow-600">
                {feeSummary.pending_count}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Users - Full Width Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Users</h2>
          <Link
            to="/admin/users"
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
          >
            View Details
          </Link>
        </div>
        {recentUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent users</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.full_name || user.username || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {user.email || "No email"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium Rs.{getUserTypeBadge(user.user_type)}`}
                      >
                        {user.user_type || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upcoming Exams - Full Width Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Upcoming Exams
          </h2>
          <Link
            to="/admin/examinations"
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
          >
            View Details
          </Link>
        </div>
        {recentExams.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No upcoming exams</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentExams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {exam.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {exam.subject_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(exam.exam_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Courses - Full Width Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Recent Courses
          </h2>
          <Link
            to="/admin/academic/courses"
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
          >
            View Details
          </Link>
        </div>
        {recentCourses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No courses available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentCourses.slice(0, 5).map((course) => (
                  <tr key={course.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {course.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {course.code || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {course.department_name || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Classes - Full Width Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Recent Classes
          </h2>
          <Link
            to="/admin/academic/classes"
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
          >
            View Details
          </Link>
        </div>
        {recentClasses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No classes available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year/Semester
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentClasses.slice(0, 5).map((classItem) => (
                  <tr key={classItem.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {classItem.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {classItem.course_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      Year {classItem.year || "?"} - Semester{" "}
                      {classItem.semester || "?"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Link
            to="/admin/users"
            className="flex flex-col items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
          >
            <UserPlus className="w-8 h-8 text-indigo-600 mb-2" />
            <span className="text-sm text-indigo-700 font-medium">
              Add User
            </span>
          </Link>

          <Link
            to="/admin/academic/courses"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
          >
            <BookOpen className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm text-green-700 font-medium">Courses</span>
          </Link>

          <Link
            to="/admin/academic/classes"
            className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition"
          >
            <School className="w-8 h-8 text-yellow-600 mb-2" />
            <span className="text-sm text-yellow-700 font-medium">Classes</span>
          </Link>

          <Link
            to="/admin/examinations"
            className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition"
          >
            <ClipboardList className="w-8 h-8 text-red-600 mb-2" />
            <span className="text-sm text-red-700 font-medium">Exams</span>
          </Link>

          <Link
            to="/admin/assignments"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
          >
            <FileText className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm text-purple-700 font-medium">
              Assignments
            </span>
          </Link>

          <Link
            to="/admin/attendance"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <CalendarCheck className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm text-blue-700 font-medium">
              Attendance
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;