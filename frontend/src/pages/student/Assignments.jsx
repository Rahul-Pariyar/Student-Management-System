import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { academicService } from "../../services";

// Validation schema using yup
const submissionSchema = yup.object({
  submission_text: yup
    .string()
    .min(10, "Submission text must be at least 10 characters")
    .required("Submission text is required"),
  attachment: yup
    .mixed()
    .nullable()
    .test("fileSize", "File size too large (max 5MB)", (value) => {
      if (!value || value.length === 0) return true;
      return value[0].size <= 5 * 1024 * 1024;
    })
    .test("fileType", "Unsupported file type", (value) => {
      if (!value || value.length === 0) return true;
      return [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/jpeg",
        "image/png",
        "application/zip",
        "application/x-zip-compressed",
      ].includes(value[0].type);
    }),
});

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(submissionSchema),
    mode: "onChange",
  });

  // Fetch assignments
  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async (type = filterType, subject = filterSubject) => {
    try {
      setLoading(true);
      const params = {};
      if (type) params.assignment_type = type;
      if (subject) params.subject = subject;
      const { data } = await academicService.listAssignments(params);
      setAssignments(data.results || data);
      setError(null);
    } catch (err) {
      setError("Failed to load assignments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle View button click
  const handleView = (assignment) => {
    setSelectedAssignment(assignment);
    setViewModalOpen(true);
  };

  // Handle Submit button click
  const handleSubmitClick = (assignment) => {
    setSelectedAssignment(assignment);
    setSubmitModalOpen(true);
    setSubmitSuccess(false);
    reset({ submission_text: "", attachment: null });
  };

  // Handle form submission
  const onCreateSubmission = async (data) => {
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("assignment", selectedAssignment.id); // Ensure this field is set
      formData.append("submission_text", data.submission_text);
      if (data.attachment && data.attachment[0]) {
        console.log("Attachment Size:", data.attachment[0]?.size);
        console.log("Attachment Type:", data.attachment[0]?.type);
        formData.append("attachment", data.attachment[0]);
      }

      console.log("FormData:", Object.fromEntries(formData.entries())); // Debugging

      await academicService.createSubmission(formData);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitModalOpen(false);
        fetchAssignments();
      }, 1500);
    } catch (err) {
      console.error("Submission Error:", err.response?.data || err.message);
      alert("Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  // Download assignment attachment
  const handleDownload = (attachmentUrl, fileName) => {
    const link = document.createElement("a");
    link.href = attachmentUrl;
    link.download = fileName || "assignment";
    link.target = "_blank";
    link.click();
  };

  // Derive unique subjects from loaded assignments for the filter dropdown
  const subjectOptions = [...new Map(
    assignments.map((a) => [a.subject, { id: a.subject, name: a.subject_name }])
  ).values()].filter((s) => s.id);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-800">Assignments</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="homework">Homework</option>
            <option value="project">Project</option>
            <option value="lab">Lab Work</option>
            <option value="presentation">Presentation</option>
            <option value="quiz">Quiz</option>
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
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchAssignments(filterType, filterSubject)}
          className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Apply
        </button>
        {(filterType || filterSubject) && (
          <button
            onClick={() => { setFilterType(""); setFilterSubject(""); fetchAssignments("", ""); }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Assignments Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Max Marks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No assignments found
                </td>
              </tr>
            ) : (
              assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {assignment.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
                      {assignment.assignment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {assignment.subject_name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {assignment.class_name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(assignment.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {assignment.max_marks}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(assignment)}
                        className="rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleSubmitClick(assignment)}
                        className="rounded bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
                      >
                        Submit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {viewModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedAssignment.title}
              </h2>
              <button
                onClick={() => setViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Assignment Type
                </label>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {selectedAssignment.assignment_type}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Description
                </label>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {selectedAssignment.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Subject
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedAssignment.subject_name || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Class
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedAssignment.class_name || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Teacher
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedAssignment.teacher_name || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Max Marks
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedAssignment.max_marks}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Assigned Date
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(
                      selectedAssignment.assigned_date,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Due Date
                  </label>
                  <p
                    className={`mt-1 text-sm ${
                      new Date(selectedAssignment.due_date) < new Date()
                        ? "text-red-600 font-medium"
                        : "text-gray-900"
                    }`}
                  >
                    {new Date(selectedAssignment.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedAssignment.instructions && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Instructions
                  </label>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                    {selectedAssignment.instructions}
                  </p>
                </div>
              )}

              {selectedAssignment.attachment && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Attachment
                  </label>
                  <div className="mt-2 flex items-center space-x-2">
                    <button
                      onClick={() =>
                        handleDownload(
                          selectedAssignment.attachment,
                          selectedAssignment.attachment.split("/").pop(),
                        )
                      }
                      className="flex items-center rounded bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download Attachment
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setViewModalOpen(false)}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  handleSubmitClick(selectedAssignment);
                }}
                className="rounded bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
              >
                Submit Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {submitModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                Submit: {selectedAssignment.title}
              </h2>
              <button
                onClick={() => setSubmitModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {submitSuccess ? (
              <div className="rounded-lg bg-green-50 p-6 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="mt-2 text-lg font-medium text-green-800">
                  Submission Successful!
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onCreateSubmission)}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="submission_text"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Submission Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="submission_text"
                    rows={5}
                    {...register("submission_text")}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      errors.submission_text
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                    placeholder="Write your submission here..."
                  />
                  {errors.submission_text && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.submission_text.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="attachment"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Attachment (Optional)
                  </label>
                  <input
                    type="file"
                    id="attachment"
                    {...register("attachment")}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {errors.attachment && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.attachment.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Accepted: PDF, DOC, DOCX, TXT, JPG, PNG, ZIP (Max 5MB)
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setSubmitModalOpen(false)}
                    className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}