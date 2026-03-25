import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  AlertCircle,
  BookOpen,
  Edit2,
  Eye,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import api from "../../../services/api";

const classSchema = yup.object({
  name: yup
    .string()
    .required("Class name is required")
    .max(50, "Class name must be at most 50 characters"),
  course: yup
    .number()
    .typeError("Course is required")
    .required("Course is required")
    .positive("Course is required")
    .integer("Course is invalid"),
  year: yup
    .number()
    .typeError("Year is required")
    .required("Year is required")
    .integer("Year must be a whole number")
    .min(1, "Year must be at least 1"),
  semester: yup
    .number()
    .typeError("Semester is required")
    .required("Semester is required")
    .integer("Semester must be a whole number")
    .min(1, "Semester must be at least 1"),
  section: yup
    .string()
    .required("Section is required")
    .max(10, "Section must be at most 10 characters"),
  academic_year: yup
    .number()
    .typeError("Academic year is required")
    .required("Academic year is required")
    .positive("Academic year is required")
    .integer("Academic year is invalid"),
  class_teacher: yup
    .number()
    .transform((value, originalValue) => {
      if (
        originalValue === "" ||
        originalValue === null ||
        originalValue === undefined
      ) {
        return null;
      }
      return value;
    })
    .nullable()
    .notRequired()
    .integer("Teacher profile ID must be a whole number")
    .positive("Teacher profile ID must be positive"),
});

const inputBaseClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20";

const errorInputClass =
  "border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-200";

const yearOptions = [1, 2, 3, 4, 5, 6];
const semesterOptions = [1, 2, 3, 4, 5, 6, 7, 8];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
}

function extractErrorMessage(err, fallback = "Something went wrong") {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return String(data.detail);
  if (data?.non_field_errors?.length) return data.non_field_errors.join(" ");
  return fallback;
}

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Subject-teacher assignment state
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [assignmentSaving, setAssignmentSaving] = useState(null); // subjectId being saved
  const [assignmentDeleting, setAssignmentDeleting] = useState(null); // assignmentId being deleted
  const [subjectTeacherMap, setSubjectTeacherMap] = useState({}); // subjectId -> teacherProfileId (draft)

  const [searchText, setSearchText] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classDetail, setClassDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(classSchema),
    defaultValues: {
      name: "",
      course: "",
      year: "",
      semester: "",
      section: "",
      academic_year: "",
      class_teacher: "",
    },
  });

  const fetchDropdowns = useCallback(async () => {
    const [coursesRes, academicYearsRes, teacherAssignmentsRes, teachersRes] =
      await Promise.all([
        api.get("/academic/courses/"),
        api.get("/academic/academic-years/"),
        api.get("/academic/teacher-assignments/"),
        api.get("/accounts/users/", { params: { user_type: "teacher", page_size: 200 } }),
      ]);

    setCourses(normalizeList(coursesRes.data));
    setAcademicYears(normalizeList(academicYearsRes.data));

    const assignmentRows = normalizeList(teacherAssignmentsRes.data);
    const dedupedTeacherMap = new Map();

    assignmentRows.forEach((row) => {
      if (row?.teacher) {
        dedupedTeacherMap.set(row.teacher, {
          id: row.teacher,
          name: row.teacher_name || `Teacher #${row.teacher}`,
        });
      }
    });

    setTeacherOptions(Array.from(dedupedTeacherMap.values()));

    // All teachers for subject assignment dropdown
    const teacherUsers = normalizeList(teachersRes.data);
    setAllTeachers(
      teacherUsers
        .filter((u) => u.teacher_profile_id)
        .map((u) => ({
          id: u.teacher_profile_id,
          name: `${u.first_name} ${u.last_name}`.trim() || u.username,
        }))
    );
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (courseFilter !== "all") params.course = courseFilter;
      if (academicYearFilter !== "all")
        params.academic_year = academicYearFilter;
      if (yearFilter !== "all") params.year = yearFilter;
      if (semesterFilter !== "all") params.semester = semesterFilter;

      const response = await api.get("/academic/classes/", { params });
      setClasses(normalizeList(response.data));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to fetch classes."));
    } finally {
      setLoading(false);
    }
  }, [courseFilter, academicYearFilter, yearFilter, semesterFilter]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([fetchDropdowns(), fetchClasses()]);
      } catch (err) {
        setError(
          extractErrorMessage(err, "Failed to load class management data."),
        );
      }
    };
    bootstrap();
  }, [fetchClasses, fetchDropdowns]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const applyBackendErrors = (errData) => {
    const fieldNames = [
      "name",
      "course",
      "year",
      "semester",
      "section",
      "academic_year",
      "class_teacher",
    ];

    fieldNames.forEach((field) => {
      if (errData?.[field]) {
        const msg = Array.isArray(errData[field])
          ? errData[field].join(" ")
          : String(errData[field]);
        setFormError(field, { type: "server", message: msg });
      }
    });

    if (errData?.non_field_errors) {
      const msg = Array.isArray(errData.non_field_errors)
        ? errData.non_field_errors.join(" ")
        : String(errData.non_field_errors);
      setFormError("root", { type: "server", message: msg });
    }

    if (errData?.detail) {
      setFormError("root", { type: "server", message: String(errData.detail) });
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedClass(null);
    reset({
      name: "",
      course: "",
      year: "",
      semester: "",
      section: "",
      academic_year: "",
      class_teacher: "",
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (cls) => {
    setIsEditMode(true);
    setSelectedClass(cls);
    reset({
      name: cls.name || "",
      course: cls.course || "",
      year: cls.year ?? "",
      semester: cls.semester ?? "",
      section: cls.section || "",
      academic_year: cls.academic_year || "",
      class_teacher: cls.class_teacher ?? "",
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setIsEditMode(false);
    setSelectedClass(null);
    reset({
      name: "",
      course: "",
      year: "",
      semester: "",
      section: "",
      academic_year: "",
      class_teacher: "",
    });
  };

  const onSubmit = async (formData) => {
    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        course: Number(formData.course),
        year: Number(formData.year),
        semester: Number(formData.semester),
        section: formData.section.trim(),
        academic_year: Number(formData.academic_year),
        class_teacher:
          formData.class_teacher === "" || formData.class_teacher === null
            ? null
            : Number(formData.class_teacher),
      };

      if (isEditMode && selectedClass) {
        await api.patch(`/academic/classes/${selectedClass.id}/`, payload);
        setSuccessMsg("Class updated successfully.");
      } else {
        await api.post("/academic/classes/", payload);
        setSuccessMsg("Class created successfully.");
      }

      closeFormModal();
      fetchClasses();
    } catch (err) {
      if (err?.response?.data && typeof err.response.data === "object") {
        applyBackendErrors(err.response.data);
      } else {
        setFormError("root", {
          type: "server",
          message: extractErrorMessage(err, "Failed to save class."),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classId) => {
    const approved = window.confirm(
      "Are you sure you want to delete this class?",
    );
    if (!approved) return;

    try {
      setDeletingId(classId);
      await api.delete(`/academic/classes/${classId}/`);
      setSuccessMsg("Class deleted successfully.");
      fetchClasses();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to delete class."));
    } finally {
      setDeletingId(null);
    }
  };

  const fetchSubjectAssignments = useCallback(async (classId) => {
    const res = await api.get("/academic/teacher-assignments/", {
      params: { class_assigned: classId },
    });
    const rows = normalizeList(res.data);
    setSubjectAssignments(rows);
    // Seed the draft map with existing assignments
    const map = {};
    rows.forEach((row) => { map[row.subject] = row.teacher; });
    setSubjectTeacherMap(map);
  }, []);

  const handleSaveSubjectAssignment = async (subject, classDetail) => {
    const teacherId = subjectTeacherMap[subject.id];
    const existing = subjectAssignments.find((a) => a.subject === subject.id);

    try {
      setAssignmentSaving(subject.id);
      if (!teacherId) {
        // Remove assignment if teacher cleared
        if (existing) {
          await api.delete(`/academic/teacher-assignments/${existing.id}/`);
        }
      } else if (existing) {
        // Update
        await api.patch(`/academic/teacher-assignments/${existing.id}/`, {
          teacher: Number(teacherId),
        });
      } else {
        // Create
        await api.post("/academic/teacher-assignments/", {
          teacher: Number(teacherId),
          subject: subject.id,
          class_assigned: classDetail.id,
          academic_year: classDetail.academic_year,
        });
      }
      await fetchSubjectAssignments(classDetail.id);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to save subject assignment."));
    } finally {
      setAssignmentSaving(null);
    }
  };

  const handleView = async (cls) => {
    try {
      setIsDetailModalOpen(true);
      setDetailLoading(true);
      setClassDetail(null);
      setSubjectAssignments([]);
      setSubjectTeacherMap({});

      const [detailRes, studentsRes] = await Promise.all([
        api.get(`/academic/classes/${cls.id}/`),
        api.get(`/academic/classes/${cls.id}/students/`),
      ]);

      const detailData = detailRes.data || {};
      detailData.teacher_students = normalizeList(studentsRes.data);
      setClassDetail(detailData);
      await fetchSubjectAssignments(cls.id);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load class details."));
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredClasses = useMemo(() => {
    if (!searchText.trim()) return classes;
    const q = searchText.toLowerCase();
    return classes.filter((cls) => {
      const composed = [
        cls.name,
        cls.course_name,
        cls.section,
        cls.class_teacher_name,
        cls.academic_year_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return composed.includes(q);
    });
  }, [classes, searchText]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Class Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create, update, view, and manage academic classes.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            <Plus size={18} />
            <span>Create Class</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={18} className="text-red-400 hover:text-red-500" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {successMsg}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by class, course, section..."
              className="block w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <select
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <select
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
            >
              <option value="all">All Years</option>
              {academicYears.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.year}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <select
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="all">All Class Years</option>
              {yearOptions.map((n) => (
                <option key={n} value={n}>
                  Year {n}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <select
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
            >
              <option value="all">All Semesters</option>
              {semesterOptions.map((n) => (
                <option key={n} value={n}>
                  Sem {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">
                    Class
                  </th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 md:table-cell">
                    Course
                  </th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 lg:table-cell">
                    Academic Year
                  </th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 xl:table-cell">
                    Teacher
                  </th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-6 py-5">
                          <div className="h-4 w-48 rounded bg-gray-200" />
                        </td>
                        <td className="hidden px-6 py-5 md:table-cell">
                          <div className="h-4 w-36 rounded bg-gray-200" />
                        </td>
                        <td className="hidden px-6 py-5 lg:table-cell">
                          <div className="h-4 w-24 rounded bg-gray-200" />
                        </td>
                        <td className="hidden px-6 py-5 xl:table-cell">
                          <div className="h-4 w-32 rounded bg-gray-200" />
                        </td>
                        <td className="px-6 py-5">
                          <div className="ml-auto h-4 w-20 rounded bg-gray-200" />
                        </td>
                      </tr>
                    ))
                ) : filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <tr
                      key={cls.id}
                      className="group transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100">
                            <GraduationCap size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {cls.name || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Year {cls.year || "N/A"} • Sem{" "}
                              {cls.semester || "N/A"} • Section{" "}
                              {cls.section || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 md:table-cell text-gray-700">
                        {cls.course_name || "N/A"}
                      </td>
                      <td className="hidden px-6 py-4 lg:table-cell text-gray-700">
                        {cls.academic_year_label || "N/A"}
                      </td>
                      <td className="hidden px-6 py-4 xl:table-cell text-gray-700">
                        {cls.class_teacher_name || "Unassigned"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(cls)}
                            className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(cls)}
                            className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit Class"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(cls.id)}
                            disabled={deletingId === cls.id}
                            className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Delete Class"
                          >
                            {deletingId === cls.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <BookOpen size={24} />
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No classes found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try changing your filters or create a class.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm sm:p-0">
            <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-8">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                    {isEditMode ? <Edit2 size={20} /> : <Plus size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isEditMode ? "Edit Class" : "Create Class"}
                    </h3>
                    <p className="text-xs text-gray-500 text-left">
                      {isEditMode
                        ? "Update class information for this record."
                        : "Create a new class for a course and academic year."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeFormModal}
                  className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-6 py-8">
                <form
                  id="class-form"
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  {errors.root?.message && (
                    <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      {errors.root.message}
                    </div>
                  )}

                  <div className="rounded-xl bg-indigo-50/50 p-6 ring-1 ring-indigo-200 shadow-sm">
                    <label className="mb-4 flex items-center gap-2 text-sm font-bold text-indigo-900">
                      <BookOpen size={16} /> Class Details
                    </label>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Class Name
                        </label>
                        <input
                          type="text"
                          {...register("name")}
                          className={`${inputBaseClass} ${errors.name ? errorInputClass : ""}`}
                          placeholder="BCA Year 1 - A"
                        />
                        {errors.name && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Section
                        </label>
                        <input
                          type="text"
                          {...register("section")}
                          className={`${inputBaseClass} ${errors.section ? errorInputClass : ""}`}
                          placeholder="A"
                        />
                        {errors.section && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.section.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Course
                        </label>
                        <select
                          {...register("course")}
                          className={`${inputBaseClass} ${errors.course ? errorInputClass : ""}`}
                        >
                          <option value="">Select course</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.name} ({course.code})
                            </option>
                          ))}
                        </select>
                        {errors.course && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.course.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Academic Year
                        </label>
                        <select
                          {...register("academic_year")}
                          className={`${inputBaseClass} ${errors.academic_year ? errorInputClass : ""}`}
                        >
                          <option value="">Select academic year</option>
                          {academicYears.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.year}
                              {item.is_current ? " (Current)" : ""}
                            </option>
                          ))}
                        </select>
                        {errors.academic_year && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.academic_year.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Year
                        </label>
                        <select
                          {...register("year")}
                          className={`${inputBaseClass} ${errors.year ? errorInputClass : ""}`}
                        >
                          <option value="">Select year</option>
                          {yearOptions.map((n) => (
                            <option key={n} value={n}>
                              Year {n}
                            </option>
                          ))}
                        </select>
                        {errors.year && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.year.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Semester
                        </label>
                        <select
                          {...register("semester")}
                          className={`${inputBaseClass} ${errors.semester ? errorInputClass : ""}`}
                        >
                          <option value="">Select semester</option>
                          {semesterOptions.map((n) => (
                            <option key={n} value={n}>
                              Semester {n}
                            </option>
                          ))}
                        </select>
                        {errors.semester && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.semester.message}
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Class Teacher (Optional)
                        </label>
                        <select
                          {...register("class_teacher")}
                          className={`${inputBaseClass} ${errors.class_teacher ? errorInputClass : ""}`}
                        >
                          <option value="">Unassigned</option>
                          {teacherOptions.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.name} (Profile #{teacher.id})
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-left text-xs text-gray-500">
                          Teacher options are derived from existing teacher
                          assignments API.
                        </p>
                        {errors.class_teacher && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.class_teacher.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-8 py-5">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  form="class-form"
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : isEditMode ? (
                    "Save Changes"
                  ) : (
                    "Create Class"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Class Details
                </h3>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading
                    details...
                  </div>
                ) : classDetail ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <p className="text-[11px] text-gray-500">Class Name</p>
                        <p className="text-sm font-medium text-gray-900">
                          {classDetail.name || "N/A"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <p className="text-[11px] text-gray-500">Course</p>
                        <p className="text-sm text-gray-900">
                          {classDetail.course_name || "N/A"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <p className="text-[11px] text-gray-500">
                          Academic Year
                        </p>
                        <p className="text-sm text-gray-900">
                          {classDetail.academic_year_label || "N/A"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <p className="text-[11px] text-gray-500">Teacher</p>
                        <p className="text-sm text-gray-900">
                          {classDetail.class_teacher_name || "Unassigned"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 sm:col-span-2">
                        <p className="text-[11px] text-gray-500">
                          Year / Semester / Section
                        </p>
                        <p className="text-sm text-gray-900">
                          Year {classDetail.year || "N/A"} • Semester{" "}
                          {classDetail.semester || "N/A"} • Section{" "}
                          {classDetail.section || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <BookOpen size={16} className="text-indigo-600" />{" "}
                          Subject — Teacher Assignments
                        </h4>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {classDetail.subjects?.length || 0}
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        {classDetail.subjects?.length ? (
                          <div className="space-y-2">
                            {classDetail.subjects.map((subject) => {
                              const existing = subjectAssignments.find((a) => a.subject === subject.id);
                              const isSaving = assignmentSaving === subject.id;
                              return (
                                <div
                                  key={subject.id}
                                  className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                      {subject.name}
                                      <span className="ml-1.5 text-xs text-gray-400">({subject.code})</span>
                                    </p>
                                  </div>
                                  <select
                                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    value={subjectTeacherMap[subject.id] ?? ""}
                                    onChange={(e) =>
                                      setSubjectTeacherMap((prev) => ({
                                        ...prev,
                                        [subject.id]: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">Unassigned</option>
                                    {allTeachers.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleSaveSubjectAssignment(subject, classDetail)}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                  >
                                    {isSaving ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : existing ? (
                                      "Update"
                                    ) : (
                                      "Assign"
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No subjects found for this class/course.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Users size={16} className="text-indigo-600" />{" "}
                          Students
                        </h4>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {classDetail.teacher_students?.length || 0}
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        {classDetail.teacher_students?.length ? (
                          <div className="space-y-2">
                            {classDetail.teacher_students.map((student) => (
                              <div
                                key={student.student_id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                              >
                                <p className="text-sm font-medium text-gray-800">
                                  {student.name}
                                </p>
                                <span className="text-xs text-gray-500">
                                  Attendance: {student.attendance_pct}% (
                                  {student.present}/{student.total_sessions})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No active students found in this class.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-500">
                    Unable to load class details.
                  </p>
                )}
              </div>

              <div className="flex justify-end border-t border-gray-100 px-5 py-4">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .animate-scale-in {
          animation: scale-in 0.2s ease-out forwards;
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}