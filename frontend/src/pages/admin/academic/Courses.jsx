import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  AlertCircle,
  BookOpen,
  Edit2,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api from "../../../services/api";

const courseSchema = yup.object({
  name: yup
    .string()
    .required("Course name is required")
    .max(100, "Course name must be at most 100 characters"),
  code: yup
    .string()
    .required("Course code is required")
    .max(20, "Course code must be at most 20 characters"),
  department: yup
    .number()
    .typeError("Department is required")
    .required("Department is required")
    .positive("Department is required")
    .integer("Department is invalid"),
  duration_years: yup
    .number()
    .typeError("Duration is required")
    .required("Duration is required")
    .integer("Duration must be a whole number")
    .min(1, "Duration must be at least 1 year"),
  description: yup.string().nullable().max(1000, "Description is too long"),
});

const inputBaseClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20";

const errorInputClass =
  "border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-200";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
}

function getErrorMessage(err, fallback = "Something went wrong") {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return String(data.detail);
  if (data?.non_field_errors?.length) return data.non_field_errors.join(" ");
  return fallback;
}

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetail, setCourseDetail] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(courseSchema),
    defaultValues: {
      name: "",
      code: "",
      department: "",
      duration_years: 4,
      description: "",
    },
  });

  const fetchDropdowns = useCallback(async () => {
    const response = await api.get("/academic/departments/");
    setDepartments(normalizeList(response.data));
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (departmentFilter !== "all") params.department = departmentFilter;
      if (searchText.trim()) params.search = searchText.trim();

      const response = await api.get("/academic/courses/", { params });
      setCourses(normalizeList(response.data));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to fetch courses."));
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, searchText]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([fetchDropdowns(), fetchCourses()]);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load course management data."));
      }
    };
    bootstrap();
  }, [fetchDropdowns, fetchCourses]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const applyBackendErrors = (errData) => {
    const fields = ["name", "code", "department", "duration_years", "description"];

    fields.forEach((field) => {
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
    setSelectedCourse(null);
    reset({
      name: "",
      code: "",
      department: "",
      duration_years: 4,
      description: "",
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (course) => {
    setIsEditMode(true);
    setSelectedCourse(course);
    reset({
      name: course.name || "",
      code: course.code || "",
      department: course.department || "",
      duration_years: course.duration_years || 4,
      description: course.description || "",
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setIsEditMode(false);
    setSelectedCourse(null);
    reset({
      name: "",
      code: "",
      department: "",
      duration_years: 4,
      description: "",
    });
  };

  const onSubmit = async (formData) => {
    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        department: Number(formData.department),
        duration_years: Number(formData.duration_years),
        description: formData.description?.trim() || "",
      };

      if (isEditMode && selectedCourse) {
        await api.patch(`/academic/courses/${selectedCourse.id}/`, payload);
        setSuccessMsg("Course updated successfully.");
      } else {
        await api.post("/academic/courses/", payload);
        setSuccessMsg("Course created successfully.");
      }

      closeFormModal();
      fetchCourses();
    } catch (err) {
      if (err?.response?.data && typeof err.response.data === "object") {
        applyBackendErrors(err.response.data);
      } else {
        setFormError("root", {
          type: "server",
          message: getErrorMessage(err, "Failed to save course."),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (courseId) => {
    const approved = window.confirm("Are you sure you want to delete this course?");
    if (!approved) return;

    try {
      setDeletingId(courseId);
      await api.delete(`/academic/courses/${courseId}/`);
      setSuccessMsg("Course deleted successfully.");
      fetchCourses();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete course."));
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = async (course) => {
    try {
      setIsDetailModalOpen(true);
      setDetailLoading(true);
      const response = await api.get(`/academic/courses/${course.id}/`);
      setCourseDetail(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load course details."));
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const visibleCourses = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return courses;

    return courses.filter((course) => {
      const haystack = [
        course.name,
        course.code,
        course.department_name,
        String(course.duration_years || ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [courses, searchText]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Course Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage courses with department and duration details.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            <Plus size={18} />
            <span>Create Course</span>
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
          <div className="relative lg:col-span-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by course name or code..."
              className="block w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="lg:col-span-4">
            <select
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
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
                  <th className="px-6 py-4 font-semibold text-gray-900">Course</th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 md:table-cell">Department</th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 lg:table-cell">Duration</th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 xl:table-cell">Stats</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-900">Actions</th>
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
                          <div className="h-4 w-24 rounded bg-gray-200" />
                        </td>
                        <td className="px-6 py-5">
                          <div className="ml-auto h-4 w-20 rounded bg-gray-200" />
                        </td>
                      </tr>
                    ))
                ) : visibleCourses.length > 0 ? (
                  visibleCourses.map((course) => (
                    <tr key={course.id} className="group transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100">
                            <BookOpen size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{course.name || "N/A"}</p>
                            <p className="text-xs text-gray-500">Code: {course.code || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 text-gray-700 md:table-cell">
                        {course.department_name || "N/A"}
                      </td>
                      <td className="hidden px-6 py-4 text-gray-700 lg:table-cell">
                        {course.duration_years || "N/A"} years
                      </td>
                      <td className="hidden px-6 py-4 text-gray-700 xl:table-cell">
                        <span className="mr-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          {course.subject_count ?? 0} subjects
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          {course.class_count ?? 0} classes
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(course)}
                            className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(course)}
                            className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit Course"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            disabled={deletingId === course.id}
                            className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Delete Course"
                          >
                            {deletingId === course.id ? (
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
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No courses found</h3>
                      <p className="mt-1 text-sm text-gray-500">Try changing your filters or create a course.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm sm:p-0">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-8">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                    {isEditMode ? <Edit2 size={20} /> : <Plus size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isEditMode ? "Edit Course" : "Create Course"}
                    </h3>
                    <p className="text-xs text-gray-500 text-left">
                      {isEditMode
                        ? "Update course details."
                        : "Create a new course for a department."}
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
                <form id="course-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {errors.root?.message && (
                    <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      {errors.root.message}
                    </div>
                  )}

                  <div className="rounded-xl bg-indigo-50/50 p-6 ring-1 ring-indigo-200 shadow-sm">
                    <label className="mb-4 flex items-center gap-2 text-sm font-bold text-indigo-900">
                      <BookOpen size={16} /> Course Details
                    </label>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Course Name
                        </label>
                        <input
                          type="text"
                          {...register("name")}
                          className={`${inputBaseClass} ${errors.name ? errorInputClass : ""}`}
                          placeholder="Bachelor of Computer Applications"
                        />
                        {errors.name && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Course Code
                        </label>
                        <input
                          type="text"
                          {...register("code")}
                          className={`${inputBaseClass} ${errors.code ? errorInputClass : ""}`}
                          placeholder="BCA"
                        />
                        {errors.code && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.code.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Department
                        </label>
                        <select
                          {...register("department")}
                          className={`${inputBaseClass} ${errors.department ? errorInputClass : ""}`}
                        >
                          <option value="">Select department</option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                        {errors.department && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.department.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Duration (Years)
                        </label>
                        <input
                          type="number"
                          min="1"
                          {...register("duration_years")}
                          className={`${inputBaseClass} ${errors.duration_years ? errorInputClass : ""}`}
                        />
                        {errors.duration_years && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.duration_years.message}
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Description (Optional)
                        </label>
                        <textarea
                          rows={4}
                          {...register("description")}
                          className={`${inputBaseClass} ${errors.description ? errorInputClass : ""}`}
                          placeholder="Brief description about this course"
                        />
                        {errors.description && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">
                            {errors.description.message}
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
                  form="course-form"
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
                    "Create Course"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 className="text-base font-semibold text-gray-900">Course Details</h3>
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
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading details...
                  </div>
                ) : courseDetail ? (
                  <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 sm:col-span-2">
                      <p className="text-[11px] text-gray-500">Course Name</p>
                      <p className="text-sm font-medium text-gray-900">{courseDetail.name || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">Course Code</p>
                      <p className="text-sm text-gray-900">{courseDetail.code || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">Department</p>
                      <p className="text-sm text-gray-900">{courseDetail.department_name || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">Duration</p>
                      <p className="text-sm text-gray-900">{courseDetail.duration_years || "N/A"} years</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">Subjects</p>
                      <p className="text-sm text-gray-900">{courseDetail.subject_count ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">Classes</p>
                      <p className="text-sm text-gray-900">{courseDetail.class_count ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 sm:col-span-2">
                      <p className="text-[11px] text-gray-500">Description</p>
                      <p className="text-sm text-gray-900">{courseDetail.description || "N/A"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-500">Unable to load course details.</p>
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
    </div>
  );
}