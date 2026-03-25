import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import DashboardLayout from './components/layouts/DashboardLayout'

// Auth
import Login from './pages/auth/Login'
import NotFound from './pages/NotFound'
import Profile from './pages/common/Profile'
import Notifications from './pages/common/Notification'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminAssignments from './pages/admin/Assignments'
import AdminAttendance from './pages/admin/Attendance'
import AdminExaminations from './pages/admin/Examinations'
import AdminFees from './pages/admin/Fees'
import AdminClasses from './pages/admin/academic/Classes'
import AdminDepartments from './pages/admin/academic/Departments'
import AdminYear from './pages/admin/academic/Year'
import AdminCourses from './pages/admin/academic/Courses'
import AdminSubjects from './pages/admin/academic/Subjects'
import AdminEnrollment from './pages/admin/academic/Enrollment'


// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard'
import Classes from './pages/teacher/Classes'
import TeacherAssignments from './pages/teacher/Assignments'
import TeacherAttendance from './pages/teacher/Attendance'
import TeacherExaminations from './pages/teacher/Examinations'

// Student pages
import StudentDashboard from './pages/student/Dashboard'
import StudentAssignments from './pages/student/Assignments'
import StudentAttendance from './pages/student/Attendance'
import StudentResult from './pages/student/Result'
import StudentExaminations from './pages/student/Examinations'

// Parent pages
import ParentDashboard from './pages/parent/Dashboard'
import ParentAttendance from './pages/parent/Attendance'
import ParentResult from './pages/parent/Result'
import ParentExaminations from './pages/parent/Examinations'

// Redirects /dashboard to the correct role-based dashboard
function RoleDashboardRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.user_type}/dashboard`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* ── Admin routes ── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/assignments" element={<AdminAssignments />} />
          <Route path="/admin/attendance" element={<AdminAttendance />} />
          <Route path="/admin/examinations" element={<AdminExaminations />} />
          <Route path="/admin/fees" element={<AdminFees />} />
          <Route path="/admin/notifications" element={<Notifications />} />
          <Route path="/admin/profile" element={<Profile />} />
          <Route path="/admin/academic/classes" element={<AdminClasses/>} />
          <Route path="/admin/academic/year" element={<AdminYear/>} />
          <Route path="/admin/academic/courses" element={<AdminCourses/>} />
          <Route path="/admin/academic/subjects" element={<AdminSubjects/>} />
          <Route path="/admin/academinc/departments" element={<AdminDepartments />} />
          <Route path="/admin/academic/enrollment" element={<AdminEnrollment />} />
        </Route>

        {/* ── Teacher routes ── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/classes" element={<Classes />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/examinations" element={<TeacherExaminations />} />
          <Route path="/teacher/notifications" element={<Notifications />} />
          <Route path="/teacher/profile" element={<Profile />} />
        </Route>

        {/* ── Student routes ── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/attendance" element={<StudentAttendance />} />
          <Route path="/student/result" element={<StudentResult />} />
          <Route path="/student/examinations" element={<StudentExaminations />} />
          <Route path="/student/notifications" element={<Notifications />} />
          <Route path="/student/profile" element={<Profile />} />
        </Route>

        {/* ── Parent routes ── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['parent']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/parent/attendance" element={<ParentAttendance />} />
          <Route path="/parent/result" element={<ParentResult />} />
          <Route path="/parent/examinations" element={<ParentExaminations />} />
          <Route path="/parent/notifications" element={<Notifications />} />
          <Route path="/parent/profile" element={<Profile />} />
        </Route>

        {/* Convenience redirects */}
        <Route path="/dashboard" element={<RoleDashboardRedirect />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
