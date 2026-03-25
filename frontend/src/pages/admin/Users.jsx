import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  UserPlus,
  MoreVertical,
  Eye,
  Info,
} from "lucide-react";
import api from "../../services/api";

const schema = yup.object().shape({
  username: yup
    .string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters"),
  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email format"),
  first_name: yup.string().required("First name is required"),
  last_name: yup.string().required("Last name is required"),
  password: yup.string().when("$isEdit", {
    is: (val) => val === true,
    then: (schema) =>
      schema
        .nullable()
        .notRequired()
        .transform((v) => (v === "" ? null : v)),
    otherwise: (schema) =>
      schema
        .required("Password is required")
        .min(8, "Password must be at least 8 characters"),
  }),
  password2: yup.string().when("password", {
    is: (val) => val && val.length > 0,
    then: (schema) =>
      schema
        .oneOf([yup.ref("password")], "Passwords must match")
        .required("Please confirm your password"),
    otherwise: (schema) => schema.nullable().notRequired(),
  }),
  phone_number: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(/^\+?1?\d{9,15}$/, {
      message: "Invalid phone number format",
      excludeEmptyString: true,
    }),
  address: yup.string().nullable(),
  date_of_birth: yup.string().nullable(),
  user_type: yup
    .string()
    .oneOf(["student", "teacher", "parent", "admin"])
    .required("User type is required"),
  profile: yup.object().when(["user_type", "$isEdit"], ([userType, isEdit]) => {
    if (isEdit) {
      return yup.object().nullable();
    }

    if (userType === "student") {
      return yup.object().shape({
        student_id: yup.string().required("Student ID is required"),
        admission_date: yup.string().required("Admission date is required"),
        guardian_name: yup.string().required("Guardian name is required"),
        guardian_phone: yup.string().required("Guardian phone is required"),
        guardian_email: yup
          .string()
          .email("Invalid email format"),
        emergency_contact: yup
          .string(),
        blood_group: yup.string().nullable(),
      });
    }

    if (userType === "teacher") {
      return yup.object().shape({
        employee_id: yup.string().required("Employee ID is required"),
        qualification: yup.string().required("Qualification is required"),
        experience_years: yup
          .number()
          .typeError("Experience must be a number")
          .integer("Experience must be a whole number")
          .min(0, "Experience cannot be negative")
          .required("Experience years is required"),
        specialization: yup.string().required("Specialization is required"),
        joining_date: yup.string().required("Joining date is required"),
      });
    }

    if (userType === "parent") {
      return yup.object().shape({
        occupation: yup.string().required("Occupation is required"),
      });
    }

    if (userType === "admin") {
      return yup.object().shape({
        employee_id: yup.string().required("Employee ID is required"),
        department: yup.string().required("Department is required"),
      });
    }

    return yup.object().nullable();
  }),
});

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserType, setSelectedUserType] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Parent-child linking state
  const [linkedChildren, setLinkedChildren] = useState([]);
  const [childSearchQuery, setChildSearchQuery] = useState("");
  const [childSearchResults, setChildSearchResults] = useState([]);
  const [childSearching, setChildSearching] = useState(false);
  const [linkingChild, setLinkingChild] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    context: { isEdit: isEditMode },
    defaultValues: {
      user_type: "student",
      profile: {
        blood_group: "",
      },
    },
  });

  const currentUserType = watch("user_type");

  const fetchUsers = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const params = { page, page_size: PAGE_SIZE };
      if (selectedUserType !== "all") params.user_type = selectedUserType;
      if (searchQuery) params.search = searchQuery;

      const response = await api.get("/accounts/users/", { params });
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        setUsers(response.data.results);
        setTotalCount(response.data.count ?? 0);
      } else if (Array.isArray(response.data)) {
        setUsers(response.data);
        setTotalCount(response.data.length);
      } else {
        setUsers([]);
        setTotalCount(0);
      }
      setError(null);
    } catch (err) {
      setError("Failed to fetch users. Please try again.");
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedUserType, searchQuery, currentPage]);

  // Debounce search/filter changes — reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedUserType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when page changes (but not on search/filter — those reset to 1 above)
  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);

      const profile = data.profile || {};

      if (isEditMode) {
        const updatePayload = {
          username: data.username,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number || "",
          address: data.address || "",
          date_of_birth: data.date_of_birth || null,
          is_active: data.is_active === "true",
        };

        await api.patch(`/accounts/users/${selectedUser.id}/`, updatePayload);

        // Password updates are handled by the dedicated backend endpoint.
        if (data.password && data.password.length > 0) {
          await api.post(`/accounts/users/${selectedUser.id}/reset-password/`, {
            new_password: data.password,
          });
        }
      } else {
        const createPayload = {
          username: data.username,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          user_type: data.user_type,
          phone_number: data.phone_number || "",
          address: data.address || "",
          date_of_birth: data.date_of_birth || null,
          password: data.password,
          password2: data.password2,
        };

        if (data.user_type === "student") {
          createPayload.profile = {
            student_id: profile.student_id,
            admission_date: profile.admission_date,
            guardian_name: profile.guardian_name,
            guardian_phone: profile.guardian_phone,
            guardian_email: profile.guardian_email,
            emergency_contact: profile.emergency_contact,
            blood_group: profile.blood_group || "",
          };
        } else if (data.user_type === "teacher") {
          createPayload.profile = {
            employee_id: profile.employee_id,
            qualification: profile.qualification,
            experience_years: Number(profile.experience_years),
            specialization: profile.specialization,
            joining_date: profile.joining_date,
          };
        } else if (data.user_type === "parent") {
          createPayload.profile = {
            occupation: profile.occupation,
          };
        } else if (data.user_type === "admin") {
          createPayload.profile = {
            employee_id: profile.employee_id,
            department: profile.department,
          };
        }

        const created = await api.post("/accounts/users/create/", createPayload);
        // Link any staged children for a new parent
        if (data.user_type === "parent" && linkedChildren.length > 0) {
          const newParentId = created.data.id;
          await Promise.all(
            linkedChildren.map((child) =>
              api.post(`/accounts/users/${newParentId}/link-student/`, { student_id: child.id })
            )
          );
        }
      }

      setIsModalOpen(false);
      reset();
      fetchUsers(currentPage);
    } catch (err) {
      const errorMsg = err.response?.data
        ? JSON.stringify(err.response.data)
        : `Failed to ${isEditMode ? "update" : "create"} user`;
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsEditMode(true);
    setLinkedChildren([]);
    setChildSearchQuery("");
    setChildSearchResults([]);
    const formData = {
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number || "",
      address: user.address || "",
      date_of_birth: user.date_of_birth || "",
      user_type: user.user_type,
      is_active: user.is_active ? "true" : "false",
      profile: user.profile || { blood_group: "" },
    };
    reset(formData);
    if (user.user_type === "parent") {
      api.get(`/accounts/users/${user.id}/children/`).then((r) => setLinkedChildren(r.data)).catch(() => {});
    }
    setIsModalOpen(true);
  };

  const handleView = (user) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/accounts/users/${userId}/`);
      fetchUsers(currentPage);
    } catch (err) {
      setError("Failed to delete user.");
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await api.patch(`/accounts/users/${user.id}/`, { is_active: !user.is_active });
      fetchUsers(currentPage);
    } catch {
      setError('Failed to update user status.');
    }
  };

  const handleChildSearch = useCallback(async (q) => {
    setChildSearchQuery(q);
    if (!q.trim()) { setChildSearchResults([]); return; }
    setChildSearching(true);
    try {
      const r = await api.get('/accounts/students/search/', { params: { q } });
      // Filter out already linked
      const linkedIds = new Set(linkedChildren.map((c) => c.id));
      setChildSearchResults(r.data.filter((s) => !linkedIds.has(s.id)));
    } catch { setChildSearchResults([]); }
    finally { setChildSearching(false); }
  }, [linkedChildren]);

  const handleLinkChild = async (student) => {
    setChildSearchQuery("");
    setChildSearchResults([]);
    // In edit mode: persist immediately. In create mode: stage locally.
    if (isEditMode && selectedUser) {
      setLinkingChild(true);
      try {
        await api.post(`/accounts/users/${selectedUser.id}/link-student/`, { student_id: student.id });
      } catch {
        setError("Failed to link student.");
        setLinkingChild(false);
        return;
      }
      setLinkingChild(false);
    }
    setLinkedChildren((prev) => [...prev, student]);
  };

  const handleUnlinkChild = async (student) => {
    // In edit mode: persist immediately. In create mode: just remove from staged list.
    if (isEditMode && selectedUser) {
      try {
        await api.delete(`/accounts/users/${selectedUser.id}/link-student/`, { data: { student_id: student.id } });
      } catch {
        setError("Failed to unlink student.");
        return;
      }
    }
    setLinkedChildren((prev) => prev.filter((c) => c.id !== student.id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              User Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage all students, teachers, parents and administrators.
            </p>
          </div>
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedUser(null);
              setLinkedChildren([]);
              setChildSearchQuery("");
              setChildSearchResults([]);
              reset({
                user_type: "student",
                username: "",
                email: "",
                first_name: "",
                last_name: "",
                password: "",
                password2: "",
                phone_number: "",
                address: "",
                date_of_birth: "",
                profile: {
                  blood_group: "",
                  guardian_email: "",
                  employee_id: "",
                  qualification: "",
                  experience_years: "",
                  specialization: "",
                  joining_date: "",
                  occupation: "",
                  department: "",
                },
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            <UserPlus size={18} />
            <span>Create New User</span>
          </button>
        </div>

        {/* Filters/Search Bar */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="relative lg:col-span-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, username or email..."
              className="block w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative lg:col-span-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="block w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={selectedUserType}
              onChange={(e) => setSelectedUserType(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="parent">Parents</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={18} className="text-red-400 hover:text-red-500" />
            </button>
          </div>
        )}

        {/* User Table Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">
                    User
                  </th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 sm:table-cell">
                    Role
                  </th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 lg:table-cell">
                    Contact
                  </th>
                  <th className="hidden px-6 py-4 font-semibold text-gray-900 xl:table-cell">
                    Status
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
                    .map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-10 w-10 rounded-full bg-gray-200" />
                        </td>
                        <td colSpan={4} className="px-6 py-4">
                          <div className="h-4 w-full rounded bg-gray-200" />
                        </td>
                      </tr>
                    ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="group hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 ring-2 ring-indigo-100">
                            {user.profile_picture ? (
                              <img
                                src={user.profile_picture}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserIcon size={20} />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {user.full_name || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[120px]">
                              @{user.username || "username"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 sm:table-cell">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
                            user.user_type === "admin"
                              ? "bg-purple-50 text-purple-700 ring-purple-600/20"
                              : user.user_type === "teacher"
                                ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                                : user.user_type === "student"
                                  ? "bg-green-50 text-green-700 ring-green-600/20"
                                  : "bg-orange-50 text-orange-700 ring-orange-600/20"
                          }`}
                        >
                          {user.user_type || "N/A"}
                        </span>
                      </td>
                      <td className="hidden px-6 py-4 lg:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail size={14} className="shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {user.email || "No email"}
                            </span>
                          </div>
                          {user.phone_number ? (
                            <div className="flex items-center gap-2 text-gray-500">
                              <Phone size={14} className="shrink-0" />
                              <span>{user.phone_number}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400 text-xs italic">
                              <Phone size={14} className="shrink-0" />
                              <span>Not provided</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 xl:table-cell">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            user.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-green-600" : "bg-red-600"}`}
                          />
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(user)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-100 shadow-sm"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-100 shadow-sm"
                            title="Edit User"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`p-1.5 rounded-lg transition-colors border shadow-sm ${user.is_active ? 'text-green-600 hover:text-red-600 hover:bg-red-50 border-green-100' : 'text-red-500 hover:text-green-600 hover:bg-green-50 border-red-100'}`}
                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            <UserCheck size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-100 shadow-sm"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <Search size={24} />
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No users found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search or filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1 || loading}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`e${idx}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      disabled={loading}
                      className={`min-w-[32px] rounded-lg border px-2 py-1 text-xs font-semibold transition ${p === currentPage ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages || loading}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Modal Overlay */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 backdrop-blur-sm bg-gray-900/40">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl transition-all sm:my-8 scale-in">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                    {isEditMode ? <Edit2 size={20} /> : <UserPlus size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isEditMode ? "Edit User" : "Create New User"}
                    </h3>
                    <p className="text-xs text-gray-500 text-left">
                      {isEditMode
                        ? `Updating profile for ${selectedUser?.full_name}`
                        : "Fill in the details to register a new user."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-2 text-gray-400 transition-hover hover:bg-gray-100 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content - Scrollable Form */}
              <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-6 py-8">
                <form
                  id="user-form"
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-10"
                >
                  {/* Role Selection */}
                  <div className="rounded-xl bg-indigo-50/50 p-6 ring-1 ring-indigo-200 shadow-sm">
                    <label className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                      <Info size={16} /> Basic Account Details
                    </label>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          Role
                        </label>
                        <select
                          {...register("user_type")}
                          disabled={isEditMode}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm disabled:bg-gray-100"
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="parent">Parent</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      {isEditMode && (
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Account Status
                          </label>
                          <select
                            {...register("is_active")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          Username
                        </label>
                        <input
                          type="text"
                          {...register("username")}
                          className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all ${errors.username ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-200" : "border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"}`}
                          placeholder="johndoe"
                        />
                        {errors.username && (
                          <p className="mt-1.5 text-xs font-medium text-red-600 text-left">
                            {errors.username.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          Email Address
                        </label>
                        <input
                          type="email"
                          {...register("email")}
                          className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all ${errors.email ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-200" : "border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"}`}
                          placeholder="john@example.com"
                        />
                        {errors.email && (
                          <p className="mt-1.5 text-xs font-medium text-red-600 text-left">
                            {errors.email.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="px-1">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-6 border-l-4 border-indigo-600 pl-3">
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          First Name
                        </label>
                        <input
                          type="text"
                          {...register("first_name")}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          placeholder="John"
                        />
                        {errors.first_name && (
                          <p className="mt-1.5 text-xs font-medium text-red-600 text-left">
                            {errors.first_name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          Last Name
                        </label>
                        <input
                          type="text"
                          {...register("last_name")}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          placeholder="Doe"
                        />
                        {errors.last_name && (
                          <p className="mt-1.5 text-xs font-medium text-red-600 text-left">
                            {errors.last_name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          {...register("phone_number")}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          placeholder="+1234567890"
                        />
                        {errors.phone_number && (
                          <p className="mt-1.5 text-xs font-medium text-red-600 text-left">
                            {errors.phone_number.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          {...register("date_of_birth")}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          Address
                        </label>
                        <input
                          type="text"
                          {...register("address")}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          placeholder="Street, city, state"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Section */}
                  <div className="px-1 border-t border-gray-50 pt-8">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-1 text-left">
                      Security
                    </h4>
                    <p className="text-xs text-gray-500 mb-6 text-left">
                      {isEditMode
                        ? "Leave blank to keep current password"
                        : "Required for new users"}
                    </p>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          {isEditMode ? "New Password" : "Password"}
                        </label>
                        <input
                          type="password"
                          {...register("password")}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          placeholder="••••••••"
                        />
                        {errors.password && (
                          <p className="mt-1.5 text-xs font-medium text-red-600 text-left">
                            {errors.password.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          {...register("password2")}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          placeholder="••••••••"
                        />
                        {errors.password2 && (
                          <p className="mt-1.5 text-xs font-medium text-red-600 text-left">
                            {errors.password2.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Student Specific Fields */}
                  {currentUserType === "student" && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 shadow-inner">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-8 border-l-4 border-emerald-500 pl-3 text-left">
                        Academic & Guardian Information
                      </h4>
                      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Student ID
                          </label>
                          <input
                            type="text"
                            {...register("profile.student_id")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                            placeholder="STU-2024-001"
                          />
                          {errors.profile?.student_id && (
                            <p className="mt-1.5 text-xs font-medium text-red-600 text-left">
                              {errors.profile.student_id.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Admission Date
                          </label>
                          <input
                            type="date"
                            {...register("profile.admission_date")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Blood Group
                          </label>
                          <select
                            {...register("profile.blood_group")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          >
                            <option value="">N/A</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Guardian Name
                          </label>
                          <input
                            type="text"
                            {...register("profile.guardian_name")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                            placeholder="Full Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Guardian Phone
                          </label>
                          <input
                            type="text"
                            {...register("profile.guardian_phone")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Guardian Email
                          </label>
                          <input
                            type="email"
                            {...register("profile.guardian_email")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                            placeholder="guardian@example.com"
                          />
                          {errors.profile?.guardian_email && (
                            <p className="mt-1.5 text-xs font-medium text-red-600 text-left">
                              {errors.profile.guardian_email.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Emergency Contact
                          </label>
                          <input
                            type="text"
                            {...register("profile.emergency_contact")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentUserType === "teacher" && !isEditMode && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 shadow-inner">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-8 border-l-4 border-blue-500 pl-3 text-left">
                        Teacher Profile Information
                      </h4>
                      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Employee ID
                          </label>
                          <input
                            type="text"
                            {...register("profile.employee_id")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Qualification
                          </label>
                          <input
                            type="text"
                            {...register("profile.qualification")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Experience (Years)
                          </label>
                          <input
                            type="number"
                            min="0"
                            {...register("profile.experience_years")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Joining Date
                          </label>
                          <input
                            type="date"
                            {...register("profile.joining_date")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Specialization
                          </label>
                          <input
                            type="text"
                            {...register("profile.specialization")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentUserType === "parent" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-8 shadow-inner">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-6 border-l-4 border-amber-500 pl-3 text-left">
                        Parent Profile Information
                      </h4>

                      {!isEditMode && (
                        <div className="mb-6">
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Occupation
                          </label>
                          <input
                            type="text"
                            {...register("profile.occupation")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 text-left">
                          Linked Children{" "}
                          {!isEditMode && (
                            <span className="font-normal normal-case text-gray-400">
                              (optional — can be added now or later)
                            </span>
                          )}
                        </p>

                        {linkedChildren.length === 0 ? (
                          <p className="text-xs text-gray-400 italic mb-3">No children linked yet.</p>
                        ) : (
                          <ul className="space-y-2 mb-3">
                            {linkedChildren.map((child) => (
                              <li key={child.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {child.user?.full_name || child.user?.username || "—"}
                                  </p>
                                  <p className="text-xs text-gray-500">ID: {child.student_id}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkChild(child)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove"
                                >
                                  <X size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="relative">
                          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400">
                            <Search size={14} className="text-gray-400 shrink-0" />
                            <input
                              type="text"
                              placeholder="Search student by name or ID..."
                              className="flex-1 text-sm outline-none bg-transparent"
                              value={childSearchQuery}
                              onChange={(e) => handleChildSearch(e.target.value)}
                            />
                            {childSearching && <RefreshCw size={13} className="animate-spin text-gray-400" />}
                          </div>
                          {childSearchResults.length > 0 && (
                            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-44 overflow-y-auto">
                              {childSearchResults.map((s) => (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    disabled={linkingChild}
                                    onClick={() => handleLinkChild(s)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-indigo-50 transition-colors disabled:opacity-50"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {s.user?.full_name || s.user?.username}
                                      </p>
                                      <p className="text-xs text-gray-500">ID: {s.student_id}</p>
                                    </div>
                                    <UserPlus size={14} className="text-indigo-500 shrink-0" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentUserType === "admin" && !isEditMode && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 shadow-inner">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-8 border-l-4 border-purple-500 pl-3 text-left">
                        Admin Profile Information
                      </h4>
                      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Employee ID
                          </label>
                          <input
                            type="text"
                            {...register("profile.employee_id")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 text-left">
                            Department
                          </label>
                          <input
                            type="text"
                            {...register("profile.department")}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-8 py-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  form="user-form"
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : isEditMode ? (
                    "Save Changes"
                  ) : (
                    "Register User"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {isViewModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50">
            <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl animate-scale-in">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    {selectedUser.profile_picture ? (
                      <img
                        src={selectedUser.profile_picture}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon size={20} />
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {selectedUser.full_name || selectedUser.username}
                    </h3>
                    <p className="text-xs text-gray-500 capitalize">
                      {selectedUser.user_type || "N/A"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-4 max-h-[65vh] overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <p className="text-[11px] text-gray-500">Email</p>
                    <p className="text-sm text-gray-900 break-all">
                      {selectedUser.email || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <p className="text-[11px] text-gray-500">Role</p>
                    <p className="text-sm text-gray-900 capitalize">
                      {selectedUser.user_type || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <p className="text-[11px] text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">
                      {selectedUser.phone_number || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-[11px] text-gray-500">Address</p>
                    <p className="text-sm text-gray-900">
                      {selectedUser.address || "N/A"}
                    </p>
                  </div>
                  {selectedUser.user_type === "student" &&
                    selectedUser.profile && (
                      <>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                          <p className="text-[11px] text-gray-500">
                            Student ID
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedUser.profile.student_id || "N/A"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                          <p className="text-[11px] text-gray-500">
                            Blood Group
                          </p>
                          <p className="text-sm text-gray-900">
                            {selectedUser.profile.blood_group || "N/A"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                          <p className="text-[11px] text-gray-500">
                            Guardian Name
                          </p>
                          <p className="text-sm text-gray-900">
                            {selectedUser.profile.guardian_name || "N/A"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                          <p className="text-[11px] text-gray-500">
                            Guardian Phone
                          </p>
                          <p className="text-sm text-gray-900">
                            {selectedUser.profile.guardian_phone || "N/A"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 sm:col-span-2">
                          <p className="text-[11px] text-gray-500">Current Class</p>
                          <p className="text-sm text-gray-900">
                            {selectedUser.profile.current_enrollment?.class_name || "Not enrolled"}
                          </p>
                        </div>
                      </>
                    )}
                </div>
              </div>

              <div className="border-t border-gray-100 px-5 py-4 flex justify-end">
                <button
                  onClick={() => setIsViewModalOpen(false)}
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
        .scale-in {
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