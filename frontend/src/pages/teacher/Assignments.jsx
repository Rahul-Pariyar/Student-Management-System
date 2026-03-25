import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Eye, Pencil, Trash2, X, Plus } from "lucide-react";
import { academicService } from "../../services";

const ASSIGNMENT_TYPES = [
  { value: "homework", label: "Homework" },
  { value: "project", label: "Project" },
  { value: "lab", label: "Lab Work" },
  { value: "presentation", label: "Presentation" },
  { value: "quiz", label: "Quiz" },
];

// ── Modal ────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
    <div className="relative w-full max-w-2xl flex flex-col bg-white rounded-xl shadow-2xl max-h-[90vh]">
      <div className="flex items-center justify-between p-5 border-b shrink-0">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1">{children}</div>
      {footer && (
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white shrink-0 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  </div>
);

// ── Assignment form fields ─────────────────────────────────────────
// Defined OUTSIDE the parent component to prevent unmount/remount on every
// parent re-render (which would reset the file input visually).
const AssignmentFormFields = ({
  form,
  teacherAssignments,
  onFileChange,
  fileLabel,
}) => {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register("title")}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.title ? "border-red-400" : "border-gray-300"}`}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register("description")}
          rows={3}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.description ? "border-red-400" : "border-gray-300"}`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">
            {errors.description.message}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register("assignment_type")}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.assignment_type ? "border-red-400" : "border-gray-300"}`}
          >
            {ASSIGNMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.assignment_type && (
            <p className="mt-1 text-xs text-red-500">
              {errors.assignment_type.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Max Marks <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            {...register("max_marks")}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.max_marks ? "border-red-400" : "border-gray-300"}`}
          />
          {errors.max_marks && (
            <p className="mt-1 text-xs text-red-500">
              {errors.max_marks.message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <select
            {...register("subject")}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.subject ? "border-red-400" : "border-gray-300"}`}
          >
            <option value="">Select Subject</option>
            {[...new Set(teacherAssignments.map((ta) => ta.subject))].map(
              (id) => {
                const ta = teacherAssignments.find((t) => t.subject === id);
                return (
                  <option key={id} value={id}>
                    {ta?.subject_name}
                  </option>
                );
              },
            )}
          </select>
          {errors.subject && (
            <p className="mt-1 text-xs text-red-500">
              {errors.subject.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Class <span className="text-red-500">*</span>
          </label>
          <select
            {...register("class_assigned")}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.class_assigned ? "border-red-400" : "border-gray-300"}`}
          >
            <option value="">Select Class</option>
            {teacherAssignments.map((ta) => (
              <option key={ta.id} value={ta.class_assigned}>
                {ta.class_name}
              </option>
            ))}
          </select>
          {errors.class_assigned && (
            <p className="mt-1 text-xs text-red-500">
              {errors.class_assigned.message}
            </p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          Due Date <span className="text-red-500">*</span>
        </label>
        <input
          type="datetime-local"
          {...register("due_date")}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.due_date ? "border-red-400" : "border-gray-300"}`}
        />
        {errors.due_date && (
          <p className="mt-1 text-xs text-red-500">{errors.due_date.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          Instructions
        </label>
        <textarea
          {...register("instructions")}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          Attachment
        </label>
        <input
          type="file"
          onChange={(e) => onFileChange(e.target.files[0] || null)}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {fileLabel && (
          <p className="mt-1 text-xs text-green-600">Selected: {fileLabel}</p>
        )}
      </div>
    </div>
  );
};

const assignmentSchema = yup.object({
  title: yup
    .string()
    .required("Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: yup.string().required("Description is required"),
  assignment_type: yup
    .string()
    .oneOf(
      ASSIGNMENT_TYPES.map((t) => t.value),
      "Invalid assignment type",
    )
    .required("Type is required"),
  subject: yup
    .number()
    .typeError("Subject is required")
    .required("Subject is required"),
  class_assigned: yup
    .number()
    .typeError("Class is required")
    .required("Class is required"),
  due_date: yup.string().required("Due date is required"),
  max_marks: yup
    .number()
    .typeError("Max marks is required")
    .required("Max marks is required")
    .min(1, "Max marks must be at least 1")
    .integer("Max marks must be a whole number"),
  instructions: yup.string().notRequired(),
});

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [createAttachment, setCreateAttachment] = useState(null);
  const [editAttachment, setEditAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const createForm = useForm({
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

  const editForm = useForm({
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
    fetchData();
  }, []);

  const fetchData = async (type = filterType, subject = filterSubject) => {
    try {
      setLoading(true);
      const params = {};
      if (type) params.assignment_type = type;
      if (subject) params.subject = subject;
      const [assignRes, taRes] = await Promise.all([
        academicService.listAssignments(params),
        academicService.listTeacherAssignments(),
      ]);
      setAssignments(assignRes.data.results || assignRes.data || []);
      setTeacherAssignments(taRes.data.results || taRes.data || []);
      setError(null);
    } catch (err) {
      setError("Failed to load assignments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildFormData = (values, file) => {
    const fd = new FormData();
    Object.entries(values).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") fd.append(key, val);
    });
    if (file) fd.append("attachment", file);
    return fd;
  };

  const onCreateSubmit = async (values) => {
    setSubmitting(true);
    try {
      await academicService.createAssignment(
        buildFormData(values, createAttachment),
      );
      setSuccessMessage("Assignment created successfully!");
      setShowCreateModal(false);
      createForm.reset();
      setCreateAttachment(null);
      fetchData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      alert("Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const onEditSubmit = async (values) => {
    setSubmitting(true);
    try {
      await academicService.updateAssignment(
        selectedAssignment.id,
        buildFormData(values, editAttachment),
      );
      setSuccessMessage("Assignment updated successfully!");
      setShowEditModal(false);
      editForm.reset();
      setEditAttachment(null);
      setSelectedAssignment(null);
      fetchData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      alert("Failed to update assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const getAssignmentTypeColor = (type) => {
    const colors = {
      homework: "bg-blue-100 text-blue-800",
      project: "bg-purple-100 text-purple-800",
      lab: "bg-green-100 text-green-800",
      presentation: "bg-orange-100 text-orange-800",
      quiz: "bg-red-100 text-red-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const handleDeleteAssignment = async (id) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await academicService.deleteAssignment(id);
      setSuccessMessage("Assignment deleted successfully!");
      fetchData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      alert("Failed to delete assignment");
    }
  };

  const handleViewAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setShowViewModal(true);
  };

  const handleEditClick = (assignment) => {
    setSelectedAssignment(assignment);
    editForm.reset({
      title: assignment.title,
      description: assignment.description,
      assignment_type: assignment.assignment_type,
      subject: assignment.subject,
      class_assigned: assignment.class_assigned,
      due_date: assignment.due_date?.slice(0, 16) || "",
      max_marks: assignment.max_marks,
      instructions: assignment.instructions || "",
    });
    setEditAttachment(null);
    setShowEditModal(true);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage assignments for your classes
          </p>
        </div>
        <button
          onClick={() => {
            createForm.reset();
            setCreateAttachment(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Assignment
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Types</option>
            {ASSIGNMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Subjects</option>
            {[...new Map(teacherAssignments.map((ta) => [ta.subject, ta])).values()].map((ta) => (
              <option key={ta.subject} value={ta.subject}>{ta.subject_name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchData(filterType, filterSubject)}
          className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Apply
        </button>
        {(filterType || filterSubject) && (
          <button
            onClick={() => { setFilterType(""); setFilterSubject(""); fetchData("", ""); }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No assignments found.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {assignment.title}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${getAssignmentTypeColor(assignment.assignment_type)}`}
                      >
                        {assignment.assignment_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {assignment.class_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(assignment.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewAssignment(assignment)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEditClick(assignment)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-5 w-5" />
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

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <Modal
          title="Create Assignment"
          onClose={() => setShowCreateModal(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-assignment-form"
                disabled={submitting}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-gray-400"
              >
                {submitting ? "Creating..." : "Create Assignment"}
              </button>
            </>
          }
        >
          <form
            id="create-assignment-form"
            onSubmit={createForm.handleSubmit(onCreateSubmit)}
          >
            <AssignmentFormFields
              form={createForm}
              teacherAssignments={teacherAssignments}
              onFileChange={setCreateAttachment}
              fileLabel={createAttachment?.name}
            />
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {showViewModal && selectedAssignment && (
        <Modal
          title="Assignment Details"
          onClose={() => setShowViewModal(false)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {selectedAssignment.title}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedAssignment.description}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-bold">Subject:</span>{" "}
                {selectedAssignment.subject_name}
              </div>
              <div>
                <span className="font-bold">Class:</span>{" "}
                {selectedAssignment.class_name}
              </div>
              <div>
                <span className="font-bold">Due:</span>{" "}
                {new Date(selectedAssignment.due_date).toLocaleString()}
              </div>
              <div>
                <span className="font-bold">Marks:</span>{" "}
                {selectedAssignment.max_marks}
              </div>
            </div>
            {selectedAssignment.instructions && (
              <div>
                <span className="font-bold text-sm">Instructions:</span>
                <p className="text-sm text-gray-600">
                  {selectedAssignment.instructions}
                </p>
              </div>
            )}
            {selectedAssignment.attachment && (
              <div>
                <span className="font-bold text-sm">Attachment:</span>{" "}
                <a
                  href={selectedAssignment.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {selectedAssignment.attachment.split("/").pop()}
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAssignment && (
        <Modal
          title="Edit Assignment"
          onClose={() => setShowEditModal(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-assignment-form"
                disabled={submitting}
                className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:bg-gray-400"
              >
                {submitting ? "Updating..." : "Update Assignment"}
              </button>
            </>
          }
        >
          <form
            id="edit-assignment-form"
            onSubmit={editForm.handleSubmit(onEditSubmit)}
          >
            <AssignmentFormFields
              form={editForm}
              teacherAssignments={teacherAssignments}
              onFileChange={setEditAttachment}
              fileLabel={editAttachment?.name}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}