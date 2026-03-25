// import { useState, useEffect } from "react";
// import { useAuth } from "../../contexts/AuthContext";
// import { accountService, academicService } from "../../services";

// export default function Dashboard() {
//   const { user, isTeacher } = useAuth();
//   const [dashboardData, setDashboardData] = useState(null);
//   const [statsData, setStatsData] = useState(null);
//   const [recentAssignments, setRecentAssignments] = useState([]);
//   const [recentSubmissions, setRecentSubmissions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     fetchDashboardData();
//   }, []);

//   const fetchDashboardData = async () => {
//     try {
//       setLoading(true);

//       // Fetch main dashboard data
//       const { data } = await accountService.getDashboard();
//       setDashboardData(data);

//       // Fetch real-time stats
//       try {
//         const statsResponse = await accountService.getTeacherDashboardStats();
//         setStatsData(statsResponse.data);
//       } catch (err) {
//         console.warn("Failed to fetch teacher dashboard stats", err);
//       }

//       // Fetch recent assignments
//       try {
//         const assignmentsResponse = await academicService.listAssignments();
//         setRecentAssignments(
//           assignmentsResponse.data.results?.slice(0, 5) ||
//             assignmentsResponse.data.slice(0, 5) ||
//             [],
//         );
//       } catch (err) {
//         console.warn("Failed to fetch recent assignments", err);
//       }

//       // Fetch recent submissions
//       try {
//         const submissionsResponse = await academicService.listSubmissions();
//         setRecentSubmissions(
//           submissionsResponse.data.results?.slice(0, 5) ||
//             submissionsResponse.data.slice(0, 5) ||
//             [],
//         );
//       } catch (err) {
//         console.warn("Failed to fetch recent submissions", err);
//       }

//       setError(null);
//     } catch (err) {
//       setError("Failed to load dashboard data");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center py-12">
//         <div className="text-gray-500">Loading dashboard...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
//         {error}
//       </div>
//     );
//   }

//   const classes = dashboardData?.classes || [];
//   const assignmentStats = dashboardData?.assignment_stats || {
//     total_assignments: 0,
//     total_submissions: 0,
//     graded: 0,
//     pending_grading: 0,
//   };
//   const attendanceStats = dashboardData?.attendance_stats || {
//     total_sessions: 0,
//     completed: 0,
//   };
//   const studentsWithUnpaidFees = dashboardData?.students_with_unpaid_fees || [];

//   return (
//     <div>
//       {/* Welcome Section */}
//       <div className="mb-6 rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-6 text-white shadow">
//         <h1 className="text-2xl font-bold">
//           Welcome back, {user?.full_name || user?.username}!
//         </h1>
//         <p className="mt-1 text-sm text-green-100">Teacher Dashboard</p>
//       </div>

//       {/* Stats Cards */}
//       <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
//         {/* Total Classes */}
//         <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm font-medium text-gray-500">Total Classes</p>
//               <p className="mt-1 text-2xl font-semibold text-gray-900">
//                 {classes.length}
//               </p>
//             </div>
//             <div className="rounded-full bg-blue-100 p-3">
//               <svg
//                 className="h-6 w-6 text-blue-600"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
//                 />
//               </svg>
//             </div>
//           </div>
//           <div className="mt-2 text-xs text-gray-500">Assigned this year</div>
//         </div>

//         {/* Total Assignments */}
//         <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm font-medium text-gray-500">
//                 Total Assignments
//               </p>
//               <p className="mt-1 text-2xl font-semibold text-gray-900">
//                 {assignmentStats.total_assignments}
//               </p>
//             </div>
//             <div className="rounded-full bg-purple-100 p-3">
//               <svg
//                 className="h-6 w-6 text-purple-600"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
//                 />
//               </svg>
//             </div>
//           </div>
//           <div className="mt-2 text-xs text-gray-500">Active assignments</div>
//         </div>

//         {/* Submissions to Grade */}
//         <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm font-medium text-gray-500">Submissions</p>
//               <p className="mt-1 text-2xl font-semibold text-gray-900">
//                 {assignmentStats.pending_grading}
//               </p>
//             </div>
//             <div className="rounded-full bg-orange-100 p-3">
//               <svg
//                 className="h-6 w-6 text-orange-600"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
//                 />
//               </svg>
//             </div>
//           </div>
//           <div className="mt-2 text-xs text-gray-500">Pending grading</div>
//         </div>

//         {/* Sessions Completed */}
//         <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm font-medium text-gray-500">Sessions</p>
//               <p className="mt-1 text-2xl font-semibold text-gray-900">
//                 {attendanceStats.completed} / {attendanceStats.total_sessions}
//               </p>
//             </div>
//             <div className="rounded-full bg-green-100 p-3">
//               <svg
//                 className="h-6 w-6 text-green-600"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
//                 />
//               </svg>
//             </div>
//           </div>
//           <div className="mt-2 text-xs text-gray-500">Completed sessions</div>
//         </div>
//       </div>

//       {/* My Classes Grid */}
//       <div className="mb-6">
//         <h2 className="mb-4 text-lg font-semibold text-gray-800">My Classes</h2>
//         <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
//           {classes.map((cls) => (
//             <div
//               key={cls.assignment_id}
//               className="rounded-lg border border-gray-200 bg-white p-4 shadow transition-all hover:shadow-md"
//             >
//               <div className="mb-2">
//                 <h3 className="font-semibold text-gray-900">{cls.subject}</h3>
//                 <p className="text-sm text-gray-500">{cls.class}</p>
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className="text-xs text-gray-500">
//                   {cls.enrolled_students} students
//                 </span>
//                 <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
//                   ID: {cls.assignment_id}
//                 </span>
//               </div>
//             </div>
//           ))}
//           {classes.length === 0 && (
//             <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
//               No classes assigned
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Assignment & Attendance Stats */}
//       <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
//         {/* Assignment Summary */}
//         <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
//           <h2 className="mb-4 text-lg font-semibold text-gray-800">
//             Assignment Summary
//           </h2>
//           <div className="space-y-4">
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Total Assignments</span>
//               <span className="text-lg font-semibold text-gray-900">
//                 {assignmentStats.total_assignments}
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Total Submissions</span>
//               <span className="text-lg font-semibold text-gray-900">
//                 {assignmentStats.total_submissions}
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Graded</span>
//               <span className="text-lg font-semibold text-green-600">
//                 {assignmentStats.graded}
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Pending Grading</span>
//               <span className="text-lg font-semibold text-orange-600">
//                 {assignmentStats.pending_grading}
//               </span>
//             </div>
//             {/* Progress Bar */}
//             <div className="mt-4 pt-4 border-t border-gray-200">
//               <div className="mb-1 flex justify-between text-sm">
//                 <span className="text-gray-600">Grading Progress</span>
//                 <span className="font-medium text-gray-900">
//                   {assignmentStats.total_submissions > 0
//                     ? Math.round(
//                         (assignmentStats.graded /
//                           assignmentStats.total_submissions) *
//                           100,
//                       )
//                     : 0}
//                   %
//                 </span>
//               </div>
//               <div className="h-2 w-full rounded-full bg-gray-200">
//                 <div
//                   className="h-2 rounded-full bg-green-500"
//                   style={{
//                     width: `${
//                       assignmentStats.total_submissions > 0
//                         ? (assignmentStats.graded /
//                             assignmentStats.total_submissions) *
//                           100
//                         : 0
//                     }%`,
//                   }}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Attendance Summary */}
//         <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
//           <h2 className="mb-4 text-lg font-semibold text-gray-800">
//             Attendance Summary
//           </h2>
//           <div className="space-y-4">
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Total Sessions</span>
//               <span className="text-lg font-semibold text-gray-900">
//                 {attendanceStats.total_sessions}
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Completed Sessions</span>
//               <span className="text-lg font-semibold text-green-600">
//                 {attendanceStats.completed}
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Remaining Sessions</span>
//               <span className="text-lg font-semibold text-orange-600">
//                 {attendanceStats.total_sessions - attendanceStats.completed}
//               </span>
//             </div>
//             {/* Progress Bar */}
//             <div className="mt-4 pt-4 border-t border-gray-200">
//               <div className="mb-1 flex justify-between text-sm">
//                 <span className="text-gray-600">Completion Rate</span>
//                 <span className="font-medium text-gray-900">
//                   {attendanceStats.total_sessions > 0
//                     ? Math.round(
//                         (attendanceStats.completed /
//                           attendanceStats.total_sessions) *
//                           100,
//                       )
//                     : 0}
//                   %
//                 </span>
//               </div>
//               <div className="h-2 w-full rounded-full bg-gray-200">
//                 <div
//                   className="h-2 rounded-full bg-blue-500"
//                   style={{
//                     width: `${
//                       attendanceStats.total_sessions > 0
//                         ? (attendanceStats.completed /
//                             attendanceStats.total_sessions) *
//                           100
//                         : 0
//                     }%`,
//                   }}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Recent Assignments */}
//       <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
//         <h2 className="mb-4 text-lg font-semibold text-gray-800">
//           Recent Assignments
//         </h2>
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Title
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Type
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Class
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Due Date
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Status
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-200 bg-white">
//               {recentAssignments.map((assignment) => (
//                 <tr key={assignment.id} className="hover:bg-gray-50">
//                   <td className="px-4 py-3 text-sm font-medium text-gray-900">
//                     {assignment.title}
//                   </td>
//                   <td className="px-4 py-3 text-sm text-gray-500">
//                     <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
//                       {assignment.assignment_type}
//                     </span>
//                   </td>
//                   <td className="px-4 py-3 text-sm text-gray-500">
//                     {assignment.class_name || "N/A"}
//                   </td>
//                   <td className="px-4 py-3 text-sm text-gray-500">
//                     {new Date(assignment.due_date).toLocaleDateString()}
//                   </td>
//                   <td className="px-4 py-3 text-sm">
//                     <span
//                       className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
//                         assignment.is_active
//                           ? "bg-green-100 text-green-800"
//                           : "bg-gray-100 text-gray-800"
//                       }`}
//                     >
//                       {assignment.is_active ? "Active" : "Inactive"}
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//               {recentAssignments.length === 0 && (
//                 <tr>
//                   <td
//                     colSpan="5"
//                     className="px-4 py-8 text-center text-gray-500"
//                   >
//                     No recent assignments
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Recent Submissions */}
//       <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
//         <h2 className="mb-4 text-lg font-semibold text-gray-800">
//           Recent Submissions
//         </h2>
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Student
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Assignment
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Submitted At
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Status
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                   Grade
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-200 bg-white">
//               {recentSubmissions.map((submission) => (
//                 <tr key={submission.id} className="hover:bg-gray-50">
//                   <td className="px-4 py-3 text-sm text-gray-900">
//                     {submission.student_name}
//                   </td>
//                   <td className="px-4 py-3 text-sm text-gray-500">
//                     {submission.assignment?.title || "N/A"}
//                   </td>
//                   <td className="px-4 py-3 text-sm text-gray-500">
//                     {new Date(submission.submitted_at).toLocaleDateString()}
//                   </td>
//                   <td className="px-4 py-3 text-sm">
//                     <span
//                       className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
//                         submission.is_late
//                           ? "bg-red-100 text-red-800"
//                           : "bg-green-100 text-green-800"
//                       }`}
//                     >
//                       {submission.is_late ? "Late" : "On Time"}
//                     </span>
//                   </td>
//                   <td className="px-4 py-3 text-sm">
//                     {submission.marks_obtained !== null ? (
//                       <span className="font-medium text-gray-900">
//                         {submission.marks_obtained}
//                       </span>
//                     ) : (
//                       <span className="text-gray-400">Not graded</span>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//               {recentSubmissions.length === 0 && (
//                 <tr>
//                   <td
//                     colSpan="5"
//                     className="px-4 py-8 text-center text-gray-500"
//                   >
//                     No recent submissions
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Students with Unpaid Fees */}
//       {studentsWithUnpaidFees.length > 0 && (
//         <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
//           <h2 className="mb-4 text-lg font-semibold text-gray-800">
//             Students with Unpaid Fees
//           </h2>
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                     Student Name
//                   </th>
//                   <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                     Amount Due
//                   </th>
//                   <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
//                     Status
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200 bg-white">
//                 {studentsWithUnpaidFees.map((student, index) => (
//                   <tr key={index} className="hover:bg-gray-50">
//                     <td className="px-4 py-3 text-sm text-gray-900">
//                       {student.student_name}
//                     </td>
//                     <td className="px-4 py-3 text-sm text-gray-900">
//                       Rs. {student.amount.toFixed(2)}
//                     </td>
//                     <td className="px-4 py-3 text-sm">
//                       <span
//                         className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
//                           student.status === "overdue"
//                             ? "bg-red-100 text-red-800"
//                             : student.status === "partial"
//                               ? "bg-yellow-100 text-yellow-800"
//                               : "bg-blue-100 text-blue-800"
//                         }`}
//                       >
//                         {student.status}
//                       </span>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { accountService, academicService } from "../../services";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isTeacher } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch main dashboard data
      const { data } = await accountService.getDashboard();
      setDashboardData(data);

      // Fetch real-time stats
      try {
        const statsResponse = await accountService.getTeacherDashboardStats();
        setStatsData(statsResponse.data);
      } catch (err) {
        console.warn("Failed to fetch teacher dashboard stats", err);
      }

      // Fetch recent assignments
      try {
        const assignmentsResponse = await academicService.listAssignments();
        setRecentAssignments(
          assignmentsResponse.data.results?.slice(0, 5) ||
            assignmentsResponse.data.slice(0, 5) ||
            [],
        );
      } catch (err) {
        console.warn("Failed to fetch recent assignments", err);
      }

      // Fetch recent submissions
      try {
        const submissionsResponse = await academicService.listSubmissions();
        setRecentSubmissions(
          submissionsResponse.data.results?.slice(0, 5) ||
            submissionsResponse.data.slice(0, 5) ||
            [],
        );
      } catch (err) {
        console.warn("Failed to fetch recent submissions", err);
      }

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

  const classes = dashboardData?.classes || [];
  const assignmentStats = dashboardData?.assignment_stats || {
    total_assignments: 0,
    total_submissions: 0,
    graded: 0,
    pending_grading: 0,
  };
  const attendanceStats = dashboardData?.attendance_stats || {
    total_sessions: 0,
    completed: 0,
  };
  const studentsWithUnpaidFees = dashboardData?.students_with_unpaid_fees || [];

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-6 text-white shadow">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="mt-1 text-sm text-green-100">Teacher Dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Classes */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Classes</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {classes.length}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Assigned this year</div>
        </div>

        {/* Total Assignments */}
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
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Active assignments</div>
        </div>

        {/* Submissions to Grade */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Submissions</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {assignmentStats.pending_grading}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <svg
                className="h-6 w-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Pending grading</div>
        </div>

        {/* Sessions Completed */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sessions</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {attendanceStats.completed} / {attendanceStats.total_sessions}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Completed sessions</div>
        </div>
      </div>

      {/* My Classes Grid */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">My Classes</h2>
          <button
            onClick={() => navigate("/teacher/classes")}
            className="flex items-center text-sm font-medium text-green-600 hover:text-green-700"
          >
            View Details
            <svg
              className="ml-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <div
              key={cls.assignment_id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow"
            >
              <div className="mb-2">
                <h3 className="font-semibold text-gray-900">{cls.subject}</h3>
                <p className="text-sm text-gray-500">{cls.class}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {cls.enrolled_students} students
                </span>
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              No classes assigned
            </div>
          )}
        </div>
      </div>

      {/* Assignment & Attendance Stats */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Assignment Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Assignment Summary
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Assignments</span>
              <span className="text-lg font-semibold text-gray-900">
                {assignmentStats.total_assignments}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Submissions</span>
              <span className="text-lg font-semibold text-gray-900">
                {assignmentStats.total_submissions}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Graded</span>
              <span className="text-lg font-semibold text-green-600">
                {assignmentStats.graded}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending Grading</span>
              <span className="text-lg font-semibold text-orange-600">
                {assignmentStats.pending_grading}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">Grading Progress</span>
                <span className="font-medium text-gray-900">
                  {assignmentStats.total_submissions > 0
                    ? Math.round(
                        (assignmentStats.graded /
                          assignmentStats.total_submissions) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{
                    width: `${
                      assignmentStats.total_submissions > 0
                        ? (assignmentStats.graded /
                            assignmentStats.total_submissions) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Attendance Summary
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Sessions</span>
              <span className="text-lg font-semibold text-gray-900">
                {attendanceStats.total_sessions}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed Sessions</span>
              <span className="text-lg font-semibold text-green-600">
                {attendanceStats.completed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Remaining Sessions</span>
              <span className="text-lg font-semibold text-orange-600">
                {attendanceStats.total_sessions - attendanceStats.completed}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">Completion Rate</span>
                <span className="font-medium text-gray-900">
                  {attendanceStats.total_sessions > 0
                    ? Math.round(
                        (attendanceStats.completed /
                          attendanceStats.total_sessions) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{
                    width: `${
                      attendanceStats.total_sessions > 0
                        ? (attendanceStats.completed /
                            attendanceStats.total_sessions) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Assignments */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Recent Assignments
          </h2>
          <button
            onClick={() => navigate("/academic/assignments")}
            className="flex items-center text-sm font-medium text-green-600 hover:text-green-700"
          >
            View Details
            <svg
              className="ml-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Class
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {recentAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {assignment.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
                      {assignment.assignment_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {assignment.class_name || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(assignment.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        assignment.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {assignment.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {recentAssignments.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No recent assignments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Recent Submissions
          </h2>
          <button
            onClick={() => navigate("/academic/submissions")}
            className="flex items-center text-sm font-medium text-green-600 hover:text-green-700"
          >
            View Details
            <svg
              className="ml-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Assignment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Submitted At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {recentSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {submission.student_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {submission.assignment?.title || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(submission.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        submission.is_late
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {submission.is_late ? "Late" : "On Time"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {submission.marks_obtained !== null ? (
                      <span className="font-medium text-gray-900">
                        {submission.marks_obtained}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not graded</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentSubmissions.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No recent submissions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount Due
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {studentsWithUnpaidFees.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {student.student_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Rs. {student.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
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