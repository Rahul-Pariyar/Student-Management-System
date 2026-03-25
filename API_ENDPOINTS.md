# School Management System — API Reference

> **Base URL:** `http://127.0.0.1:8000/api`  
> **Auth:** JWT Bearer token (header `Authorization: Bearer <access_token>`)  
> Roles: **admin**, **teacher**, **student**, **parent**

---

## 1. Authentication

| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| `POST` | `/token/` | `{ username, password }` | `{ access, refresh }` | No |
| `POST` | `/token/refresh/` | `{ refresh }` | `{ access, refresh }` | No |

---

## 2. Accounts (`/api/accounts/`)

### Profile & Auth

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/accounts/me/` | Get current user + role-specific profile | Any |
| `PATCH` | `/accounts/me/` | Update current user fields (first_name, phone, etc.) | Any |
| `POST` | `/accounts/change-password/` | `{ old_password, new_password }` | Any |

### Dashboard (role-based — returns different data per role)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/accounts/dashboard/` | Role-based dashboard data (see below) | Any |
| `GET` | `/accounts/teacher-dashboard-stats/` | Real-time teacher chart data (assignments, attendance per subject) | Teacher |

**Dashboard response by role:**

- **Admin:** `{ total_students, total_teachers, total_parents, total_courses, recent_users[] }`
- **Student:** `{ enrollment, subjects[], recent_assignments[], upcoming_exams[], attendance{}, fees{} }`
- **Teacher:** `{ classes[], assignment_stats{}, attendance_stats{}, students_with_unpaid_fees[] }`
- **Parent:** `{ children[] }` — each child has attendance, unpaid fees, class info

### Admin — User Management

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/accounts/users/` | List all users (filterable by `user_type`, `is_active`; searchable) | Admin |
| `POST` | `/accounts/users/create/` | Create user + profile (see body below) | Admin |
| `GET/PUT/PATCH/DELETE` | `/accounts/users/<user_id>/` | Get/update/delete a user | Admin |
| `POST` | `/accounts/users/<user_id>/reset-password/` | `{ new_password }` | Admin |

**Create user body:**
```json
{
  "username": "john",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "user_type": "student",
  "password": "securepass123",
  "password2": "securepass123",
  "profile": {
    "student_id": "STU001",
    "admission_date": "2025-01-15",
    "guardian_name": "Jane Doe",
    "guardian_phone": "+1234567890",
    "guardian_email": "jane@example.com",
    "emergency_contact": "+1234567890"
  }
}
```

### Messaging (Parent ↔ Teacher)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/accounts/messages/` | Inbox — all messages sent/received by current user | Any |
| `POST` | `/accounts/messages/send/` | Send message `{ recipient, student, subject, message }` | Any |
| `GET` | `/accounts/messages/<message_id>/` | Get full message thread | Any |
| `POST` | `/accounts/messages/<message_id>/` | Reply to message `{ message }` | Any |
| `GET` | `/accounts/contact-teachers/` | List teachers for parent's children | Parent |

---

## 3. Academic (`/api/academic/`)

### Lookup Helpers (for cascading dropdowns)

| Method | Endpoint | Params | Description |
|--------|----------|--------|-------------|
| `GET` | `/academic/lookup/courses/?department=<id>` | `department` | Courses for a department |
| `GET` | `/academic/lookup/classes/?course=<id>` | `course` | Classes for a course |

### Academic Years

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/academic/academic-years/` | List all | Any |
| `POST` | `/academic/academic-years/` | Create | Admin |
| `GET/PUT/DELETE` | `/academic/academic-years/<id>/` | Detail/update/delete | Admin |

### Departments

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/academic/departments/` | List all (includes course_count, hod_name) | Any |
| `POST` | `/academic/departments/` | Create | Admin |
| `GET/PUT/DELETE` | `/academic/departments/<id>/` | Detail/update/delete | Admin |

### Courses

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/academic/courses/` | List (filterable by `department`, searchable) | Any |
| `POST` | `/academic/courses/` | Create | Admin |
| `GET/PUT/DELETE` | `/academic/courses/<id>/` | Detail/update/delete | Admin |

### Subjects

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/academic/subjects/` | List (filterable by `course`, `year`, `semester`) | Any |
| `POST` | `/academic/subjects/` | Create | Admin |
| `GET/PUT/DELETE` | `/academic/subjects/<id>/` | Detail/update/delete | Admin |

### Classes

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/academic/classes/` | List (filterable by `course`, `academic_year`, `year`, `semester`) | Any |
| `POST` | `/academic/classes/` | Create | Admin |
| `GET/PUT/DELETE` | `/academic/classes/<id>/` | Detail (includes subjects + enrolled students) | Admin |
| `GET` | `/academic/classes/<id>/students/` | Students with attendance stats | Any |

### Enrollments

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/academic/enrollments/` | List (filterable by `class_enrolled`, `student`, `is_active`) — scoped by role | Any |
| `POST` | `/academic/enrollments/` | Create enrollment | Admin |
| `GET/PUT/DELETE` | `/academic/enrollments/<id>/` | Detail/update/delete | Admin |
| `GET` | `/academic/enrollments/report/` | Enrollment stats per course/class | Any |

### Teacher Subject Assignments

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/academic/teacher-assignments/` | List (filterable by `teacher`, `class_assigned`, `academic_year`) | Any |
| `POST` | `/academic/teacher-assignments/` | Assign teacher to subject+class | Admin |
| `GET/PUT/DELETE` | `/academic/teacher-assignments/<id>/` | Detail/update/delete | Admin |

### Assignments (Homework/Projects)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/academic/assignments/` | List (scoped by role; filterable by `subject`, `class_assigned`, `assignment_type`) | Any |
| `POST` | `/academic/assignments/` | Create `{ title, description, assignment_type, subject, class_assigned, due_date, max_marks }` | Teacher |
| `GET/PUT/DELETE` | `/academic/assignments/<id>/` | Detail/update/delete | Teacher (write) / Any (read) |

### Submissions

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/academic/submissions/` | List (scoped by role; filterable by `assignment`) | Any |
| `POST` | `/academic/submissions/` | Submit `{ assignment, submission_text, attachment }` | Student |
| `GET` | `/academic/submissions/<id>/` | Detail | Any |
| `POST` | `/academic/submissions/<id>/grade/` | Grade `{ marks_obtained, feedback }` | Teacher |

---

## 4. Attendance (`/api/attendance/`)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/attendance/sessions/` | List sessions (filterable by `teacher_assignment`, `date`, `is_completed`) | Any |
| `POST` | `/attendance/sessions/` | Create empty session | Teacher |
| `GET/PUT/DELETE` | `/attendance/sessions/<id>/` | Session detail | Teacher |
| `GET` | `/attendance/records/` | List records (filterable by `session`, `student`, `status`) — scoped by role | Any |
| `POST` | `/attendance/mark/` | **Bulk mark attendance** (see body below) | Teacher |
| `GET` | `/attendance/students/?teacher_assignment=<id>` | Students enrolled in that class | Any |
| `GET` | `/attendance/view/` | Filtered records (`?subject=&class=&date_from=&date_to=`) | Any |
| `GET` | `/attendance/reports/` | Aggregated report (`?class=&subject=`) | Any |

**Bulk mark attendance body:**
```json
{
  "teacher_assignment": 1,
  "date": "2026-03-01",
  "start_time": "09:00",
  "end_time": "10:00",
  "topic_covered": "Algebra",
  "records": [
    { "student": 1, "status": "present", "remarks": "" },
    { "student": 2, "status": "absent", "remarks": "Sick" }
  ]
}
```

---

## 5. Examination (`/api/examination/`)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/examination/types/` | List exam types | Any |
| `POST` | `/examination/types/` | Create exam type | Admin |
| `GET` | `/examination/exams/` | List exams (scoped by role; filterable by `subject`, `class_for`, `exam_type`) | Any |
| `POST` | `/examination/exams/` | Create exam | Teacher |
| `GET/PUT/DELETE` | `/examination/exams/<id>/` | Exam detail | Teacher (write) / Any (read) |
| `GET` | `/examination/results/` | List results (scoped by role; **blocked for students with unpaid fees**) | Any |
| `GET` | `/examination/results/<id>/` | Single result detail | Any |
| `POST` | `/examination/exams/<exam_id>/enter-results/` | **Bulk enter results** (see body below) | Teacher |
| `GET` | `/examination/exams/<exam_id>/stats/` | Exam statistics (pass rate, avg marks, grade distribution) | Any |

**Bulk enter results body:**
```json
{
  "results": [
    { "student": 1, "marks_obtained": 85.0, "remarks": "Good" },
    { "student": 2, "marks_obtained": 42.5, "remarks": "" }
  ]
}
```

---

## 6. Fees (`/api/fees/`)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/fees/structures/` | List fee structures (filterable by `class_assigned`, `academic_year`, `frequency`) | Any |
| `POST` | `/fees/structures/` | Create fee structure | Admin |
| `GET/PUT/DELETE` | `/fees/structures/<id>/` | Detail/update/delete | Admin |
| `GET` | `/fees/student-fees/` | List student fees (scoped by role; filterable by `student`, `payment_status`) | Any |
| `GET/PUT` | `/fees/student-fees/<id>/` | Detail/update | Admin (write) / Any (read) |
| `POST` | `/fees/payments/make/` | Make payment `{ student_fee_id, amount, payment_method, transaction_id }` | Admin |
| `GET` | `/fees/payments/` | List payments (filterable by `student_fee`) | Any |
| `GET/POST` | `/fees/waivers/` | List / create waivers | Admin |
| `GET` | `/fees/summary/` | Fee dashboard stats (total_due, total_collected, pending_count, etc.) | Any |

---

## 7. Notifications (`/api/notifications/`)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/notifications/` | List notifications for current user (filterable by `notification_type`, `priority`) | Any |
| `POST` | `/notifications/create/` | Create notification (see body below) | Any |
| `POST` | `/notifications/<id>/mark-read/` | Mark notification as read | Any |
| `GET` | `/notifications/unread-count/` | `{ unread_count: <int> }` | Any |
| `GET` | `/notifications/recent/` | Latest 5 notifications | Any |

**Create notification body:**
```json
{
  "title": "Fee Reminder",
  "message": "Please pay your fees before the deadline.",
  "notification_type": "fee",
  "priority": "high",
  "recipient_group": "all_students"
}
```
Or with specific recipients:
```json
{
  "title": "Meeting",
  "message": "Parent-teacher meeting on Friday.",
  "notification_type": "general",
  "priority": "medium",
  "recipient_ids": [5, 12, 18]
}
```

---

## Pagination

All list endpoints return paginated responses (20 items per page):

```json
{
  "count": 45,
  "next": "http://127.0.0.1:8000/api/accounts/users/?page=2",
  "previous": null,
  "results": [...]
}
```

## Filtering & Search

- **Filter:** append query params matching `filterset_fields`, e.g. `?user_type=student&is_active=true`
- **Search:** `?search=john` (searches across `search_fields`)
- **Ordering:** `?ordering=-date_joined` (prefix `-` for descending)

## Error Responses

```json
// 400 — Validation error
{ "field_name": ["Error message."] }

// 401 — Unauthenticated
{ "detail": "Authentication credentials were not provided." }

// 403 — Permission denied
{ "detail": "You do not have permission to perform this action." }

// 404 — Not found
{ "detail": "Not found." }
```
