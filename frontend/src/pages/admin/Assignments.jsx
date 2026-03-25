import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  ClipboardList,
  CheckCircle,
} from "lucide-react";
import api from "../../services/api";

const ASSIGNMENT_TYPES = ["homework", "project", "lab", "presentation", "quiz"];

const assignmentSchema = yup.object({
  title: yup
    .string()
    .required("Title is required.")
    .max(200, "Title must be at most 200 characters."),
  description: yup.string().required("Description is required."),
  assignment_type: yup
    .string()
    .required("Assignment type is required.")
    .oneOf(ASSIGNMENT_TYPES, "Invalid assignment type."),
  subject: yup
    .number()
    .typeError("Subject is required.")
    .required("Subject is required.")
    .positive("Subject is required."),
  class_assigned: yup
    .number()
    .typeError("Class is required.")
    .required("Class is required.")
    .positive("Class is required."),
  due_date: yup.string().required("Due date is required."),
  max_marks: yup
    .number()
    .typeError("Max marks must be a number.")
    .required("Max marks is required.")
    .positive("Max marks must be a positive number.")
    .integer("Max marks must be a whole number."),
  instructions: yup.string().notRequired().default(""),
});

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(assignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      assignment_type: "homework",
      subject: "",
      class_assigned: "",
      due_date: "",
      max_marks: 100,
      instructions: "",
    },
  });

  useEffect(() => {
    fetchAssignments();
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const fetchAssignments = async (type = filterType, cls = filterClass) => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (type) params.assignment_type = type;
      if (cls) params.class_assigned = cls;
      const res = await api.get("/academic/assignments/", { params });
      setAssignments(res.data.results || res.data || []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Failed to load assignments",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [subjectsRes, classesRes] = await Promise.all([
        api.get("/academic/subjects/"),
        api.get("/academic/classes/"),
      ]);
      setSubjects(subjectsRes.data.results || subjectsRes.data || []);
      setClasses(classesRes.data.results || classesRes.data || []);
    } catch {
      // dropdowns fail silently — form selects will be empty
    }
  };

  const fetchSubmissions = async (assignmentId) => {
    try {
      const res = await api.get(
        `/academic/submissions/?assignment=${assignmentId}`,
      );
      setSubmissions(res.data.results || res.data || []);
    } catch {
      setSubmissions([]);
    }
  };

  const applyBackendErrors = (errData) => {
    if (typeof errData === "object" && errData !== null) {
      const fieldNames = [
        "title",
        "description",
        "assignment_type",
        "subject",
        "class_assigned",
        "due_date",
        "max_marks",
        "instructions",
      ];
      for (const field of fieldNames) {
        if (errData[field]) {
          const msg = Array.isArray(errData[field])
            ? errData[field].join(" ")
            : String(errData[field]);
          setFormError(field, { type: "server", message: msg });
        }
      }
      if (errData.non_field_errors) {
        const msg = Array.isArray(errData.non_field_errors)
          ? errData.non_field_errors.join(" ")
          : String(errData.non_field_errors);
        setFormError("root", { type: "server", message: msg });
      }
      if (errData.detail) {
        setFormError("root", {
          type: "server",
          message: String(errData.detail),
        });
      }
    }
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      if (selectedAssignment) {
        await api.patch(
          `/academic/assignments/${selectedAssignment.id}/`,
          data,
        );
        setSuccessMsg("Assignment updated successfully.");
      } else {
        await api.post("/academic/assignments/", data);
        setSuccessMsg("Assignment created successfully.");
      }
      closeModal();
      fetchAssignments();
    } catch (err) {
      if (err.response?.data) {
        applyBackendErrors(err.response.data);
      } else {
        setFormError("root", {
          type: "server",
          message: "Failed to save assignment. Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedAssignment(null);
    reset({
      title: "",
      description: "",
      assignment_type: "homework",
      subject: "",
      class_assigned: "",
      due_date: "",
      max_marks: 100,
      instructions: "",
    });
    setShowModal(true);
  };

  const handleEdit = (assignment) => {
    setSelectedAssignment(assignment);
    reset({
      title: assignment.title || "",
      description: assignment.description || "",
      assignment_type: assignment.assignment_type || "homework",
      subject: assignment.subject || "",
      class_assigned: assignment.class_assigned || "",
      due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : "",
      max_marks: assignment.max_marks ?? 100,
      instructions: assignment.instructions || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAssignment(null);
    reset();
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      setDeleteId(id);
      await api.delete(`/academic/assignments/${id}/`);
      setSuccessMsg("Assignment deleted successfully.");
      fetchAssignments();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Failed to delete assignment.",
      );
    } finally {
      setDeleteId(null);
    }
  };

  const handleViewSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    await fetchSubmissions(assignment.id);
    setShowSubmissionModal(true);
  };

  const handleGradeSubmission = async (submissionId, marks, feedback) => {
    try {
      await api.post(`/academic/submissions/${submissionId}/grade/`, {
        marks_obtained: marks,
        feedback,
      });
      fetchSubmissions(selectedAssignment.id);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.marks_obtained?.[0] ||
          "Failed to grade submission.",
      );
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

  const getAssignmentTypeBadge = (type) => {
    const colors = {
      homework: "bg-blue-100 text-blue-800",
      project: "bg-purple-100 text-purple-800",
      lab: "bg-green-100 text-green-800",
      presentation: "bg-yellow-100 text-yellow-800",
      quiz: "bg-red-100 text-red-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const inputCls = (field) =>
    `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
      errors[field] ? "border-red-400" : "border-gray-300"
    }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-indigo-600" />
            Assignments
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage homework, projects, and quizzes
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm sm:text-base"
        >
          <Plus className="h-4 w-4" />
          Create Assignment
        </button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="homework">Homework</option>
            <option value="project">Project</option>
            <option value="lab">Lab Work</option>
            <option value="presentation">Presentation</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>
        <div className="flex-1 min-w-[160px] relative">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Class</label>
          <input
            type="text"
            placeholder="Search class..."
            value={classSearch}
            onChange={(e) => { setClassSearch(e.target.value); setClassDropdownOpen(true); }}
            onFocus={() => setClassDropdownOpen(true)}
            onBlur={() => setTimeout(() => setClassDropdownOpen(false), 150)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          {filterClass && (
            <button
              type="button"
              onClick={() => { setFilterClass(""); setClassSearch(""); }}
              className="absolute right-2 top-[30px] text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {classDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
              <div
                className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
                onMouseDown={() => { setFilterClass(""); setClassSearch(""); setClassDropdownOpen(false); }}
              >
                All Classes
              </div>
              {classes
                .filter((c) => c.name.toLowerCase().includes(classSearch.toLowerCase()))
                .map((c) => (
                  <div
                    key={c.id}
                    onMouseDown={() => { setFilterClass(c.id); setClassSearch(c.name); setClassDropdownOpen(false); }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 ${filterClass === c.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                  >
                    {c.name}
                  </div>
                ))}
            </div>
          )}
        </div>
        <button
          onClick={() => fetchAssignments(filterType, filterClass)}
          className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Apply
        </button>
        {(filterType || filterClass) && (
          <button
            onClick={() => { setFilterType(""); setFilterClass(""); fetchAssignments("", ""); }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        {assignments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No assignments found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Submissions
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap max-w-[200px] truncate">
                      {assignment.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getAssignmentTypeBadge(assignment.assignment_type)}`}
                      >
                        {assignment.assignment_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {assignment.subject_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {assignment.class_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(assignment.due_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                      {assignment.submission_count ?? 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewSubmissions(assignment)}
                          title="View Submissions"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(assignment)}
                          title="Edit"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id)}
                          disabled={deleteId === assignment.id}
                          title="Delete"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                        >
                          {deleteId === assignment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedAssignment ? "Edit Assignment" : "Create Assignment"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body — scrollable */}
            <form
              onSubmit={rhfHandleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {errors.root && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.root.message}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    {...register("title")}
                    className={inputCls("title")}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="3"
                    {...register("description")}
                    className={inputCls("description")}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Type + Max Marks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register("assignment_type")}
                      className={inputCls("assignment_type")}
                    >
                      <option value="homework">Homework</option>
                      <option value="project">Project</option>
                      <option value="lab">Lab Work</option>
                      <option value="presentation">Presentation</option>
                      <option value="quiz">Quiz</option>
                    </select>
                    {errors.assignment_type && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.assignment_type.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Marks <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      {...register("max_marks")}
                      className={inputCls("max_marks")}
                    />
                    {errors.max_marks && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.max_marks.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subject + Class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register("subject")}
                      className={inputCls("subject")}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register("class_assigned")}
                      className={inputCls("class_assigned")}
                    >
                      <option value="">Select Class</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {errors.class_assigned && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.class_assigned.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    {...register("due_date")}
                    className={inputCls("due_date")}
                  />
                  {errors.due_date && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.due_date.message}
                    </p>
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions
                  </label>
                  <textarea
                    rows="2"
                    {...register("instructions")}
                    className={inputCls("instructions")}
                  />
                  {errors.instructions && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.instructions.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer — sticky bottom */}
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-white flex-shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {selectedAssignment ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-800 truncate pr-4">
                Submissions for: {selectedAssignment?.title}
              </h2>
              <button
                onClick={() => setShowSubmissionModal(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Assignment Information */}
              {selectedAssignment && (
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-md font-semibold text-gray-800 mb-3">
                    Assignment Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Title:</span>
                      <p className="text-gray-900">
                        {selectedAssignment.title}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Type:</span>
                      <p className="text-gray-900 capitalize">
                        {selectedAssignment.assignment_type}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Subject:
                      </span>
                      <p className="text-gray-900">
                        {selectedAssignment.subject_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Class:</span>
                      <p className="text-gray-900">
                        {selectedAssignment.class_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Due Date:
                      </span>
                      <p className="text-gray-900">
                        {formatDate(selectedAssignment.due_date)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Max Marks:
                      </span>
                      <p className="text-gray-900">
                        {selectedAssignment.max_marks}
                      </p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <span className="font-medium text-gray-600">
                        Description:
                      </span>
                      <p className="text-gray-900 mt-1">
                        {selectedAssignment.description}
                      </p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <span className="font-medium text-gray-600">
                        Total Submissions:
                      </span>
                      <p className="text-gray-900 font-semibold text-lg">
                        {submissions.length}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submissions Table */}
              {submissions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No submissions yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                          Student
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                          Submitted At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                          Marks
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                          Feedback
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {sub.student_name || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {formatDate(sub.submitted_at)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sub.is_late ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
                            >
                              {sub.is_late ? "Late" : "On Time"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                            {sub.marks_obtained ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                            {sub.feedback || "-"}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {!sub.marks_obtained ? (
                              <button
                                onClick={() => {
                                  const marks = prompt("Enter marks:");
                                  const feedback = prompt("Enter feedback:");
                                  if (marks)
                                    handleGradeSubmission(
                                      sub.id,
                                      marks,
                                      feedback || "",
                                    );
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                              >
                                Grade
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Graded
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}