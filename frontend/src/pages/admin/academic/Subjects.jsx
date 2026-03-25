import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  AlertCircle,
  BookOpen,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api from "../../../services/api";

const semesterOptions = [
  { value: 1, label: "Semester 1" },
  { value: 2, label: "Semester 2" },
  { value: 3, label: "Semester 3" },
  { value: 4, label: "Semester 4" },
  { value: 5, label: "Semester 5" },
  { value: 6, label: "Semester 6" },
  { value: 7, label: "Semester 7" },
  { value: 8, label: "Semester 8" },
];

const yearOptions = [1, 2, 3, 4, 5];

const subjectSchema = yup.object({
  name: yup.string().trim().required("Subject name is required").max(120, "Too long"),
  code: yup.string().trim().required("Subject code is required").max(20, "Too long"),
  course: yup
    .number()
    .typeError("Course is required")
    .required("Course is required")
    .integer("Invalid course"),
  semester: yup
    .number()
    .typeError("Semester is required")
    .required("Semester is required")
    .min(1)
    .max(8),
  year: yup
    .number()
    .typeError("Year is required")
    .required("Year is required")
    .min(1)
    .max(5),
  credits: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? undefined : value))
    .nullable()
    .min(0, "Credits cannot be negative")
    .max(100, "Credits look invalid"),
  description: yup.string().max(500, "Description is too long"),
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

function getSubjectCourse(subject) {
  if (!subject) return null;
  if (typeof subject.course === "object" && subject.course !== null) {
    return subject.course;
  }
  return null;
}

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(subjectSchema),
    defaultValues: {
      name: "",
      code: "",
      course: "",
      semester: "",
      year: "",
      credits: "",
      description: "",
    },
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [subjectsRes, coursesRes] = await Promise.all([
        api.get("/academic/subjects/"),
        api.get("/academic/courses/"),
      ]);

      setSubjects(normalizeList(subjectsRes.data));
      setCourses(normalizeList(coursesRes.data));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to fetch subject data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const applyBackendErrors = (errData) => {
    const fields = ["name", "code", "course", "semester", "year", "credits", "description"];

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
    setSelectedSubject(null);
    reset({
      name: "",
      code: "",
      course: "",
      semester: "",
      year: "",
      credits: "",
      description: "",
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (item) => {
    const courseObj = getSubjectCourse(item);
    setIsEditMode(true);
    setSelectedSubject(item);
    reset({
      name: item.name || "",
      code: item.code || "",
      course: item.course ?? courseObj?.id ?? "",
      semester: item.semester ?? "",
      year: item.year ?? "",
      credits: item.credits ?? "",
      description: item.description || "",
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setIsEditMode(false);
    setSelectedSubject(null);
  };

  const onSubmit = async (formData) => {
    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        course: Number(formData.course),
        semester: Number(formData.semester),
        year: Number(formData.year),
        description: formData.description?.trim() || "",
      };

      if (formData.credits !== "" && formData.credits !== null && formData.credits !== undefined) {
        payload.credits = Number(formData.credits);
      }

      if (isEditMode && selectedSubject) {
        await api.patch(`/academic/subjects/${selectedSubject.id}/`, payload);
        setSuccessMsg("Subject updated successfully.");
      } else {
        await api.post("/academic/subjects/", payload);
        setSuccessMsg("Subject created successfully.");
      }

      closeFormModal();
      fetchData();
    } catch (err) {
      if (err?.response?.data && typeof err.response.data === "object") {
        applyBackendErrors(err.response.data);
      } else {
        setFormError("root", {
          type: "server",
          message: getErrorMessage(err, "Failed to save subject."),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const approved = window.confirm("Are you sure you want to delete this subject?");
    if (!approved) return;

    try {
      setDeletingId(id);
      await api.delete(`/academic/subjects/${id}/`);
      setSuccessMsg("Subject deleted successfully.");
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete subject."));
    } finally {
      setDeletingId(null);
    }
  };

  const courseNameById = useMemo(() => {
    return courses.reduce((acc, course) => {
      acc[course.id] = course.name;
      return acc;
    }, {});
  }, [courses]);

  const visibleSubjects = useMemo(() => {
    let result = subjects;

    if (courseFilter !== "all") {
      result = result.filter((item) => {
        const courseObj = getSubjectCourse(item);
        const cid = item.course ?? courseObj?.id;
        return String(cid) === courseFilter;
      });
    }

    if (semesterFilter !== "all") {
      result = result.filter((item) => String(item.semester) === semesterFilter);
    }

    if (yearFilter !== "all") {
      result = result.filter((item) => String(item.year) === yearFilter);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((item) => {
        const courseObj = getSubjectCourse(item);
        const courseName = courseObj?.name || courseNameById[item.course] || "";
        const haystack = [
          item.name,
          item.code,
          courseName,
          item.description,
          `semester ${item.semester}`,
          `year ${item.year}`,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return result;
  }, [subjects, courseFilter, semesterFilter, yearFilter, searchText, courseNameById]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Subject Management</h1>
            <p className="mt-1 text-sm text-gray-500">Create and manage subjects by course, semester, and year.</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            <Plus size={18} />
            <span>Create Subject</span>
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

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by subject, code, course..."
              className="block w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="lg:col-span-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Semesters</option>
              {semesterOptions.map((semester) => (
                <option key={semester.value} value={semester.value}>
                  {semester.label}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  Year {year}
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
                  <th className="px-6 py-4 font-semibold text-gray-900">Subject</th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 md:table-cell">Code</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Course</th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 lg:table-cell">Semester</th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 lg:table-cell">Year</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  Array(6)
                    .fill(0)
                    .map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-6 py-5"><div className="h-4 w-40 rounded bg-gray-200" /></td>
                        <td className="hidden px-6 py-5 md:table-cell"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                        <td className="px-6 py-5"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                        <td className="hidden px-6 py-5 lg:table-cell"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                        <td className="hidden px-6 py-5 lg:table-cell"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                        <td className="px-6 py-5"><div className="ml-auto h-4 w-20 rounded bg-gray-200" /></td>
                      </tr>
                    ))
                ) : visibleSubjects.length > 0 ? (
                  visibleSubjects.map((item) => {
                    const courseObj = getSubjectCourse(item);
                    const courseName = courseObj?.name || courseNameById[item.course] || "N/A";
                    return (
                      <tr key={item.id} className="group transition-colors hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100">
                              <BookOpen size={16} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{item.name || "N/A"}</p>
                              <p className="text-xs text-gray-500 md:hidden">{item.code || "N/A"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-6 py-4 text-gray-700 md:table-cell">{item.code || "N/A"}</td>
                        <td className="px-6 py-4 text-gray-700">{courseName}</td>
                        <td className="hidden px-6 py-4 text-gray-700 lg:table-cell">Semester {item.semester ?? "N/A"}</td>
                        <td className="hidden px-6 py-4 text-gray-700 lg:table-cell">Year {item.year ?? "N/A"}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                              title="Edit Subject"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Delete Subject"
                            >
                              {deletingId === item.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <BookOpen size={24} />
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No subjects found</h3>
                      <p className="mt-1 text-sm text-gray-500">Try adjusting filters or create a subject.</p>
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
                      {isEditMode ? "Edit Subject" : "Create Subject"}
                    </h3>
                    <p className="text-left text-xs text-gray-500">Set subject details and course mapping.</p>
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
                <form id="subject-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {errors.root?.message && (
                    <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      {errors.root.message}
                    </div>
                  )}

                  <div className="rounded-xl bg-indigo-50/50 p-6 ring-1 ring-indigo-200 shadow-sm">
                    <label className="mb-4 flex items-center gap-2 text-sm font-bold text-indigo-900">
                      <BookOpen size={16} /> Subject Information
                    </label>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Subject Name
                        </label>
                        <input
                          type="text"
                          {...register("name")}
                          className={`${inputBaseClass} ${errors.name ? errorInputClass : ""}`}
                          placeholder="Data Structures"
                        />
                        {errors.name && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Code
                        </label>
                        <input
                          type="text"
                          {...register("code")}
                          className={`${inputBaseClass} ${errors.code ? errorInputClass : ""}`}
                          placeholder="CSE201"
                        />
                        {errors.code && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.code.message}</p>
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
                              {course.name}
                            </option>
                          ))}
                        </select>
                        {errors.course && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.course.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Credits
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          {...register("credits")}
                          className={`${inputBaseClass} ${errors.credits ? errorInputClass : ""}`}
                          placeholder="4"
                        />
                        {errors.credits && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.credits.message}</p>
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
                          {semesterOptions.map((semester) => (
                            <option key={semester.value} value={semester.value}>
                              {semester.label}
                            </option>
                          ))}
                        </select>
                        {errors.semester && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.semester.message}</p>
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
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              Year {year}
                            </option>
                          ))}
                        </select>
                        {errors.year && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.year.message}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          {...register("description")}
                          className={`${inputBaseClass} ${errors.description ? errorInputClass : ""}`}
                          placeholder="Optional details about this subject"
                        />
                        {errors.description && (
                          <p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.description.message}</p>
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
                  form="subject-form"
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
                    "Create Subject"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}