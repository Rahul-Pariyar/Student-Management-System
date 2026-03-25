import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api from "../../../services/api";

// ─── helpers ─────────────────────────────────────────────────────

function Badge({ children, color = "gray" }) {
  const map = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

// ─── Enroll Modal ─────────────────────────────────────────────────

function EnrollModal({ onClose, onSuccess }) {
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [studentSearching, setStudentSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/academic/courses/").then((r) => setCourses(r.data.results ?? r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCourse) { setClasses([]); setSelectedClass(""); return; }
    api.get("/academic/classes/", { params: { course: selectedCourse } })
      .then((r) => setClasses(r.data.results ?? r.data))
      .catch(() => {});
    setSelectedClass("");
  }, [selectedCourse]);

  const searchStudents = useCallback(async (q) => {
    setStudentQuery(q);
    setSelectedStudent(null);
    if (!q.trim()) { setStudentResults([]); return; }
    setStudentSearching(true);
    try {
      const r = await api.get("/accounts/students/search/", { params: { q } });
      setStudentResults(r.data);
    } catch { setStudentResults([]); }
    finally { setStudentSearching(false); }
  }, []);

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedClass) {
      setError("Please select a student and a class.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/academic/enrollments/", {
        student: selectedStudent.id,
        class_enrolled: Number(selectedClass),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : "Enrollment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Plus size={18} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Enroll Student</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          {/* Student search */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Student
            </label>
            {selectedStudent ? (
              <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedStudent.user?.full_name || selectedStudent.user?.username}</p>
                  <p className="text-xs text-gray-500">ID: {selectedStudent.student_id}</p>
                </div>
                <button onClick={() => { setSelectedStudent(null); setStudentQuery(""); }} className="text-gray-400 hover:text-red-500">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by name or student ID..."
                    className="flex-1 text-sm outline-none"
                    value={studentQuery}
                    onChange={(e) => searchStudents(e.target.value)}
                  />
                  {studentSearching && <RefreshCw size={13} className="animate-spin text-gray-400" />}
                </div>
                {studentResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-44 overflow-y-auto">
                    {studentResults.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedStudent(s); setStudentResults([]); setStudentQuery(""); }}
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-indigo-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.user?.full_name || s.user?.username}</p>
                            <p className="text-xs text-gray-500">ID: {s.student_id}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Course */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Course
            </label>
            <select
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">Select course...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Class (Semester / Section)
            </label>
            <select
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!selectedCourse || classes.length === 0}
            >
              <option value="">Select class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Year {c.year}, Sem {c.semester} — Section {c.section} ({c.academic_year_label})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedStudent || !selectedClass}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? <><RefreshCw size={14} className="animate-spin" /> Enrolling...</> : "Enroll"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Upgrade Modal ────────────────────────────────────────────────

function UpgradeModal({ enrollment, onClose, onSuccess }) {
  // enrollment.class_name is a string like "BSc CS - Year 1, Sem 1 - A"
  // We fetch all classes for the same course and show only those with semester > current
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch the current enrollment detail to get the course id and current semester
    api.get(`/academic/enrollments/${enrollment.id}/`)
      .then(async (r) => {
        const classId = r.data.class_enrolled;
        // Get the class detail to know course + current semester
        const classRes = await api.get(`/academic/classes/${classId}/`);
        const { course, semester: currentSem, section } = classRes.data;
        // Fetch all classes for the same course
        const allRes = await api.get("/academic/classes/", { params: { course } });
        const all = allRes.data.results ?? allRes.data;
        // Show only classes with a higher semester (same section preferred but not required)
        const next = all.filter((c) => c.semester > currentSem);
        setAvailableClasses(next);
        // Auto-select the immediate next semester, same section if available
        const suggested = next.find((c) => c.semester === currentSem + 1 && c.section === section)
          ?? next.find((c) => c.semester === currentSem + 1)
          ?? null;
        if (suggested) setSelectedClass(String(suggested.id));
      })
      .catch(() => setError("Failed to load available classes."))
      .finally(() => setLoadingClasses(false));
  }, [enrollment.id]);

  const handleUpgrade = async () => {
    if (!selectedClass) { setError("Please select a new semester/class."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/academic/enrollments/${enrollment.id}/`, { is_active: false });
      await api.post("/academic/enrollments/", {
        student: enrollment.student,
        class_enrolled: Number(selectedClass),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : "Upgrade failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Promote to Next Semester</h3>
              <p className="text-xs text-gray-500">{enrollment.student_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          {/* Current */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
            <p className="text-xs text-gray-500 mb-0.5">Current class</p>
            <p className="font-medium text-gray-900">{enrollment.class_name}</p>
          </div>

          {/* Next semester picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Promote to
            </label>
            {loadingClasses ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <RefreshCw size={14} className="animate-spin" /> Loading...
              </div>
            ) : availableClasses.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No higher semester classes found for this course.</p>
            ) : (
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Select...</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Year {c.year}, Sem {c.semester} — Section {c.section} ({c.academic_year_label})
                  </option>
                ))}
              </select>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Current enrollment will be deactivated and a new one created in the selected semester.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={submitting || !selectedClass || loadingClasses}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {submitting ? <><RefreshCw size={14} className="animate-spin" /> Promoting...</> : "Confirm Promotion"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function Enrollment() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null);

  // filters
  const [filterCourse, setFilterCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [courses, setCourses] = useState([]);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus === "active") params.is_active = true;
      if (filterStatus === "inactive") params.is_active = false;
      const r = await api.get("/academic/enrollments/", { params });
      const data = r.data.results ?? r.data;
      // client-side course filter (enrollment API doesn't filter by course directly)
      setEnrollments(data);
      setError(null);
    } catch {
      setError("Failed to load enrollments.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    api.get("/academic/courses/").then((r) => setCourses(r.data.results ?? r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this enrollment?")) return;
    try {
      await api.delete(`/academic/enrollments/${id}/`);
      fetchEnrollments();
    } catch { setError("Failed to remove enrollment."); }
  };

  // client-side course filter
  const filtered = filterCourse
    ? enrollments.filter((e) => e.class_name?.toLowerCase().includes(
        courses.find((c) => String(c.id) === filterCourse)?.name?.toLowerCase() ?? ""
      ))
    : enrollments;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Enrollment</h1>
            <p className="mt-1 text-sm text-gray-500">Manage student class enrollments and upgrades.</p>
          </div>
          <button
            onClick={() => setShowEnrollModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus size={18} /> Enroll Student
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <button onClick={fetchEnrollments} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">Student</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Class</th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 sm:table-cell">Enrolled On</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <GraduationCap className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                      <p className="text-sm font-medium">No enrollments found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{e.student_name}</p>
                        <p className="text-xs text-gray-400">ID #{e.student}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{e.class_name}</td>
                      <td className="hidden px-6 py-4 text-gray-500 sm:table-cell">
                        {e.enrollment_date ? new Date(e.enrollment_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={e.is_active ? "green" : "red"}>
                          {e.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {e.is_active && (
                            <button
                              onClick={() => setUpgradeTarget(e)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                              title="Promote to next semester"
                            >
                              <ArrowRightLeft size={13} /> Promote
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-100"
                            title="Remove enrollment"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showEnrollModal && (
        <EnrollModal onClose={() => setShowEnrollModal(false)} onSuccess={fetchEnrollments} />
      )}
      {upgradeTarget && (
        <UpgradeModal enrollment={upgradeTarget} onClose={() => setUpgradeTarget(null)} onSuccess={fetchEnrollments} />
      )}
    </div>
  );
}
