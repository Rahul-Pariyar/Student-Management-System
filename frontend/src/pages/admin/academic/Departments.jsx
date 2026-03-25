import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  AlertCircle, Building2, Edit2, Loader2,
  Plus, RefreshCw, Search, Trash2, X,
} from "lucide-react";
import api from "../../../services/api";

const schema = yup.object({
  name: yup.string().required("Name is required").max(100),
  code: yup.string().required("Code is required").max(10),
  description: yup.string().nullable(),
  head_of_department: yup
    .number()
    .transform((v, o) => (o === "" || o == null ? null : v))
    .nullable()
    .notRequired()
    .positive()
    .integer(),
});

const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20";
const errClass = "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200";

function normalize(data) {
  if (Array.isArray(data)) return data;
  if (data?.results) return data.results;
  return [];
}

function extractError(err, fallback = "Something went wrong") {
  const d = err?.response?.data;
  if (!d) return fallback;
  if (typeof d === "string") return d;
  if (d.detail) return String(d.detail);
  if (d.non_field_errors) return d.non_field_errors.join(" ");
  const first = Object.values(d)[0];
  return Array.isArray(first) ? first.join(" ") : String(first ?? fallback);
}

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selected, setSelected] = useState(null);

  const { register, handleSubmit, reset, setError: setFormError, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: "", code: "", description: "", head_of_department: "" },
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [deptRes, assignmentsRes] = await Promise.all([
        api.get("/academic/departments/"),
        api.get("/academic/teacher-assignments/"),
      ]);
      setDepartments(normalize(deptRes.data));
      // Dedupe teachers from assignments (same pattern as Classes.jsx)
      const map = new Map();
      normalize(assignmentsRes.data).forEach((row) => {
        if (row?.teacher) {
          map.set(row.teacher, {
            id: row.teacher,
            name: row.teacher_name || `Teacher #${row.teacher}`,
          });
        }
      });
      setTeachers(Array.from(map.values()));
      setError(null);
    } catch (err) {
      setError(extractError(err, "Failed to load departments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 2800);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const openCreate = () => {
    setIsEditMode(false);
    setSelected(null);
    reset({ name: "", code: "", description: "", head_of_department: "" });
    setIsModalOpen(true);
  };

  const openEdit = (dept) => {
    setIsEditMode(true);
    setSelected(dept);
    reset({
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
      head_of_department: dept.head_of_department ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    reset({ name: "", code: "", description: "", head_of_department: "" });
  };

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      const payload = {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || "",
        head_of_department: data.head_of_department || null,
      };
      if (isEditMode) {
        await api.patch(`/academic/departments/${selected.id}/`, payload);
        setSuccessMsg("Department updated.");
      } else {
        await api.post("/academic/departments/", payload);
        setSuccessMsg("Department created.");
      }
      closeModal();
      fetchAll();
    } catch (err) {
      const d = err?.response?.data;
      if (d && typeof d === "object") {
        ["name", "code", "description", "head_of_department"].forEach((f) => {
          if (d[f]) setFormError(f, { type: "server", message: Array.isArray(d[f]) ? d[f].join(" ") : d[f] });
        });
        if (d.non_field_errors || d.detail) {
          setFormError("root", { type: "server", message: extractError(err) });
        }
      } else {
        setFormError("root", { type: "server", message: extractError(err, "Failed to save department.") });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department? This may affect linked courses.")) return;
    try {
      setDeletingId(id);
      await api.delete(`/academic/departments/${id}/`);
      setSuccessMsg("Department deleted.");
      fetchAll();
    } catch (err) {
      setError(extractError(err, "Failed to delete department."));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return departments;
    const q = search.toLowerCase();
    return departments.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    );
  }, [departments, search]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Departments</h1>
            <p className="mt-1 text-sm text-gray-500">Manage academic departments.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* <button onClick={fetchAll} className="rounded-lg border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-100">
              <RefreshCw size={16} />
            </button> */}
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            >
              <Plus size={18} /> Add Department
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X size={18} /></button>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {successMsg}
          </div>
        )}

        {/* Search */}
        <div className="mb-6 relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or code..."
            className="block w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">Department</th>
                <th className="hidden px-6 py-4 font-semibold text-gray-900 sm:table-cell">Code</th>
                <th className="hidden px-6 py-4 font-semibold text-gray-900 md:table-cell">Head</th>
                <th className="hidden px-6 py-4 font-semibold text-gray-900 lg:table-cell">Courses</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-40 rounded bg-gray-200" /></td>
                    <td className="hidden px-6 py-4 sm:table-cell"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="hidden px-6 py-4 md:table-cell"><div className="h-4 w-32 rounded bg-gray-200" /></td>
                    <td className="hidden px-6 py-4 lg:table-cell"><div className="h-4 w-10 rounded bg-gray-200" /></td>
                    <td className="px-6 py-4"><div className="ml-auto h-4 w-16 rounded bg-gray-200" /></td>
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{dept.name}</p>
                          {dept.description && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{dept.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 sm:table-cell">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700">
                        {dept.code}
                      </span>
                    </td>
                    <td className="hidden px-6 py-4 md:table-cell text-gray-600 text-sm">
                      {dept.hod_name || <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="hidden px-6 py-4 lg:table-cell text-gray-600 text-sm">
                      {dept.course_count ?? 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(dept)}
                          className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          disabled={deletingId === dept.id}
                          className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === dept.id
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <Building2 size={24} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">No departments found</p>
                    <p className="mt-1 text-sm text-gray-500">Create your first department to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  {isEditMode ? <Edit2 size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {isEditMode ? "Edit Department" : "Add Department"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isEditMode ? "Update department details." : "Create a new academic department."}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-5">
              {errors.root?.message && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {errors.root.message}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                    Department Name
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    placeholder="e.g. Management"
                    className={`${inputClass} ${errors.name ? errClass : ""}`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                    Code
                  </label>
                  <input
                    type="text"
                    {...register("code")}
                    placeholder="e.g. MGMT"
                    className={`${inputClass} ${errors.code ? errClass : ""}`}
                  />
                  {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                  Description (optional)
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  placeholder="Brief description of the department..."
                  className={`${inputClass} resize-none ${errors.description ? errClass : ""}`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                  Head of Department (optional)
                </label>
                <select
                  {...register("head_of_department")}
                  className={`${inputClass} ${errors.head_of_department ? errClass : ""}`}
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {errors.head_of_department && (
                  <p className="mt-1 text-xs text-red-600">{errors.head_of_department.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {isEditMode ? "Save Changes" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
