import api from './api'

// ── Authentication ──────────────────────────────────────────
export const authService = {
  login: (username, password) =>
    api.post('/token/', { username, password }),

  refreshToken: (refresh) =>
    api.post('/token/refresh/', { refresh }),
}

// ── Accounts ────────────────────────────────────────────────
export const accountService = {
  getMe: () => api.get('/accounts/me/'),
  updateMe: (data) => api.patch('/accounts/me/', data),
  changePassword: (data) => api.post('/accounts/change-password/', data),
  getDashboard: () => api.get('/accounts/dashboard/'),
  getTeacherDashboardStats: () => api.get('/accounts/teacher-dashboard-stats/'),

  // Admin user management
  listUsers: (params) => api.get('/accounts/users/', { params }),
  createUser: (data) => api.post('/accounts/users/create/', data),
  getUser: (id) => api.get(`/accounts/users/${id}/`),
  updateUser: (id, data) => api.patch(`/accounts/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/accounts/users/${id}/`),
  resetPassword: (id, data) => api.post(`/accounts/users/${id}/reset-password/`, data),

  // Messaging
  getInbox: () => api.get('/accounts/messages/inbox/'),
  sendMessage: (data) => api.post('/accounts/messages/send/'),
  getMessageThread: (id) => api.get(`/accounts/messages/${id}/`),
  replyToMessage: (id, data) => api.post(`/accounts/messages/${id}/`, data),
  getContactTeachers: () => api.get('/accounts/contact-teachers/'),
}

// ── Academic ────────────────────────────────────────────────
export const academicService = {
  // Academic years
  listAcademicYears: () => api.get('/academic/academic-years/'),
  createAcademicYear: (data) => api.post('/academic/academic-years/', data),

  // Departments
  listDepartments: () => api.get('/academic/departments/'),
  createDepartment: (data) => api.post('/academic/departments/', data),

  // Courses
  listCourses: () => api.get('/academic/courses/'),
  createCourse: (data) => api.post('/academic/courses/', data),
  getCourse: (id) => api.get(`/academic/courses/${id}/`),
  updateCourse: (id, data) => api.patch(`/academic/courses/${id}/`, data),
  deleteCourse: (id) => api.delete(`/academic/courses/${id}/`),
  getCoursesByDepartment: (deptId) => api.get(`/academic/departments/${deptId}/courses/`),

  // Subjects
  listSubjects: (params) => api.get('/academic/subjects/', { params }),
  createSubject: (data) => api.post('/academic/subjects/', data),
  getSubject: (id) => api.get(`/academic/subjects/${id}/`),
  updateSubject: (id, data) => api.patch(`/academic/subjects/${id}/`, data),
  deleteSubject: (id) => api.delete(`/academic/subjects/${id}/`),

  // Classes
  listClasses: () => api.get('/academic/classes/'),
  createClass: (data) => api.post('/academic/classes/', data),
  getClass: (id) => api.get(`/academic/classes/${id}/`),
  updateClass: (id, data) => api.patch(`/academic/classes/${id}/`, data),
  deleteClass: (id) => api.delete(`/academic/classes/${id}/`),
  getClassesByCourse: (courseId) => api.get(`/academic/courses/${courseId}/classes/`),

  // Enrollments
  listEnrollments: (params) => api.get('/academic/enrollments/', { params }),
  createEnrollment: (data) => api.post('/academic/enrollments/', data),
  deleteEnrollment: (id) => api.delete(`/academic/enrollments/${id}/`),

  // Teacher assignments
  listTeacherAssignments: (params) => api.get('/academic/teacher-assignments/', { params }),
  createTeacherAssignment: (data) => api.post('/academic/teacher-assignments/', data),
  deleteTeacherAssignment: (id) => api.delete(`/academic/teacher-assignments/${id}/`),

  // Assignments
  listAssignments: (params) => api.get('/academic/assignments/', { params }),
  createAssignment: (data) => api.post('/academic/assignments/', data),
  getAssignment: (id) => api.get(`/academic/assignments/${id}/`),
  updateAssignment: (id, data) => api.patch(`/academic/assignments/${id}/`, data),
  deleteAssignment: (id) => api.delete(`/academic/assignments/${id}/`),

  // Submissions
  listSubmissions: (params) => api.get('/academic/submissions/', { params }),
  createSubmission: (data) => api.post('/academic/submissions/', data),
  gradeSubmission: (id, data) => api.post(`/academic/submissions/${id}/grade/`, data),

  // Reports
  getClassStudents: (assignmentId) => api.get(`/academic/teacher-assignments/${assignmentId}/students/`),
  getEnrollmentReport: () => api.get('/academic/reports/enrollment/'),
}

// ── Attendance ──────────────────────────────────────────────
export const attendanceService = {
  listSessions: (params) => api.get('/attendance/sessions/', { params }),
  createSession: (data) => api.post('/attendance/sessions/', data),
  getRecords: (params) => api.get('/attendance/records/', { params }),
  bulkMark: (data) => api.post('/attendance/mark/', data),
  getStudentsForAssignment: (params) =>
    api.get('/attendance/students/', { params }),
  viewAttendance: (params) => api.get('/attendance/view/', { params }),
  getReports: (params) => api.get('/attendance/reports/', { params }),
}

// ── Examination ─────────────────────────────────────────────
export const examService = {
  listTypes: () => api.get('/examination/types/'),
  createType: (data) => api.post('/examination/types/', data),
  listExams: (params) => api.get('/examination/exams/', { params }),
  createExam: (data) => api.post('/examination/exams/', data),
  getExam: (id) => api.get(`/examination/exams/${id}/`),
  updateExam: (id, data) => api.patch(`/examination/exams/${id}/`, data),
  deleteExam: (id) => api.delete(`/examination/exams/${id}/`),
  listResults: (params) => api.get('/examination/results/', { params }),
  enterResults: (examId, data) => api.post(`/examination/exams/${examId}/enter-results/`, data),
  getExamStats: (examId) => api.get(`/examination/exams/${examId}/stats/`),
  // Internal marks
  getInternalMarks: (examId, params) => api.get(`/examination/exams/${examId}/internal-marks/`, { params }),
  saveInternalMarks: (examId, data) => api.post(`/examination/exams/${examId}/internal-marks/`, data),
  saveExternalMarks: (examId, data) => api.post(`/examination/exams/${examId}/external-marks/`, data),
  // Result publications (keyed by class + exam type)
  getPublications: (classId) => api.get(`/examination/classes/${classId}/publications/`),
  togglePublication: (classId, examTypeId) => api.post(`/examination/classes/${classId}/publications/${examTypeId}/toggle/`),
}

// ── Fees ────────────────────────────────────────────────────
export const feeService = {
  // Categories
  listCategories: (params) => api.get('/fees/categories/', { params }),
  createCategory: (data) => api.post('/fees/categories/', data),
  updateCategory: (id, data) => api.patch(`/fees/categories/${id}/`, data),
  deleteCategory: (id) => api.delete(`/fees/categories/${id}/`),

  // Structures
  listStructures: (params) => api.get('/fees/structures/', { params }),
  createStructure: (data) => api.post('/fees/structures/', data),
  updateStructure: (id, data) => api.patch(`/fees/structures/${id}/`, data),
  deleteStructure: (id) => api.delete(`/fees/structures/${id}/`),
  getStructure: (id) => api.get(`/fees/structures/${id}/`),

  listStudentFees: (params) => api.get('/fees/student-fees/', { params }),
  getStudentFee: (id) => api.get(`/fees/student-fees/${id}/`),
  updateStudentFee: (id, data) => api.patch(`/fees/student-fees/${id}/`, data),
  deleteStudentFee: (id) => api.delete(`/fees/student-fees/${id}/`),
  makePayment: (data) => api.post('/fees/payments/make/', data),
  listPayments: (params) => api.get('/fees/payments/', { params }),
  listWaivers: (params) => api.get('/fees/waivers/', { params }),
  createWaiver: (data) => api.post('/fees/waivers/', data),
  getFeeSummary: (params) => api.get('/fees/summary/', { params }),
}

// ── Notifications ───────────────────────────────────────────
export const notificationService = {
  list: (params) => api.get('/notifications/', { params }),
  create: (data) => api.post('/notifications/create/', data),
  markAsRead: (id) => api.post(`/notifications/${id}/mark-read/`),
  getUnreadCount: () => api.get('/notifications/unread-count/'),
  getRecent: () => api.get('/notifications/recent/'),
}
