import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { notificationService, accountService } from "../../services";
import {
  Bell,
  Plus,
  CheckCircle2,
  AlertCircle,
  Info,
  Mail,
  User,
  Clock,
  X,
  Filter,
  Layers,
  Send,
  Eye,
  Users,
  Search,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const groupSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  message: yup.string().required("Message is required"),
  notification_type: yup.string().required("Notification type is required"),
  priority: yup.string().required("Priority is required"),
  recipient_group: yup.string().required("Recipient group is required"),
  send_email: yup.boolean(),
});

const individualSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  message: yup.string().required("Message is required"),
  notification_type: yup.string().required("Notification type is required"),
  priority: yup.string().required("Priority is required"),
  send_email: yup.boolean(),
});

export default function Notifications() {
  const { isTeacher, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // "group" or "individual"
  const [sendMode, setSendMode] = useState("group");

  // Individual recipient search
  const [userSearch, setUserSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("student");
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);

  const groupForm = useForm({
    resolver: yupResolver(groupSchema),
    defaultValues: {
      title: "", message: "", notification_type: "general",
      priority: "medium", send_email: false, recipient_group: "",
    },
  });

  const individualForm = useForm({
    resolver: yupResolver(individualSchema),
    defaultValues: {
      title: "", message: "", notification_type: "general",
      priority: "medium", send_email: false,
    },
  });

  const { register, handleSubmit: handleFormSubmit, reset,
    formState: { errors } } = sendMode === "group" ? groupForm : individualForm;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await notificationService.list();
      setNotifications(data.results ?? data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (showCreateModal || showDetailModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showCreateModal, showDetailModal]);

  // Search users for individual send — only when there's actual search text
  useEffect(() => {
    if (sendMode !== "individual" || !userSearch.trim()) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const { data } = await accountService.listUsers({
          user_type: userTypeFilter,
          search: userSearch,
          page_size: 20,
        });
        setUserResults(data.results ?? data);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, userTypeFilter, sendMode]);

  const toggleRecipient = (u) => {
    setSelectedRecipients((prev) =>
      prev.find((r) => r.id === u.id)
        ? prev.filter((r) => r.id !== u.id)
        : [...prev, u]
    );
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, is_read_by_me: true } : n)
      );
      setSelectedNotification((prev) =>
        prev?.id === notificationId ? { ...prev, is_read_by_me: true } : prev
      );
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleViewNotification = (notification) => {
    setSelectedNotification({ ...notification, is_read_by_me: true });
    setShowDetailModal(true);
    if (!notification.is_read_by_me) {
      setNotifications((prev) =>
        prev.map((n) => n.id === notification.id ? { ...n, is_read_by_me: true } : n)
      );
      markAsRead(notification.id);
    }
  };

  const handleCloseDetailModal = () => {
    if (selectedNotification && !selectedNotification.is_read_by_me) {
      setNotifications((prev) =>
        prev.map((n) => n.id === selectedNotification.id ? { ...n, is_read_by_me: true } : n)
      );
      markAsRead(selectedNotification.id);
    }
    setShowDetailModal(false);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    groupForm.reset();
    individualForm.reset();
    setSelectedRecipients([]);
    setUserSearch("");
    setSendMode("group");
  };

  const onSubmit = async (data) => {
    if (sendMode === "individual" && selectedRecipients.length === 0) return;
    setCreating(true);
    try {
      const payload = {
        title: data.title,
        message: data.message,
        notification_type: data.notification_type,
        priority: data.priority,
        send_email: data.send_email,
      };
      if (sendMode === "group") {
        payload.recipient_group = data.recipient_group;
      } else {
        payload.recipient_ids = selectedRecipients.map((r) => r.id);
      }
      await notificationService.create(payload);
      setCreateSuccess(true);
      setTimeout(() => {
        closeCreateModal();
        setCreateSuccess(false);
        fetchNotifications();
      }, 1500);
    } catch (err) {
      console.error("Failed to create notification", err);
    } finally {
      setCreating(false);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    const typeMatch =
      filterType === "all" || notif.notification_type === filterType;
    const priorityMatch =
      filterPriority === "all" || notif.priority === filterPriority;
    return typeMatch && priorityMatch;
  });

  const unreadCount = notifications.filter((n) => !n.is_read_by_me).length;

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-50 text-red-700 border-red-100";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-100";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      default:
        return "bg-green-50 text-green-700 border-green-100";
    }
  };

  const canCreateNotification = isAdmin || isTeacher;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            Stay updated with school activities and alerts
          </p>
        </div>
        {canCreateNotification && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <Plus className="h-4 w-4" /> Create New
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total",
            val: notifications.length,
            icon: Bell,
            color: "text-gray-600",
            bg: "bg-gray-100",
          },
          {
            label: "Unread",
            val: unreadCount,
            icon: AlertCircle,
            color: "text-[#2563EB]",
            bg: "bg-blue-50",
          },
          {
            label: "Read",
            val: notifications.length - unreadCount,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Urgent",
            val: notifications.filter((n) => n.priority === "urgent").length,
            icon: Info,
            color: "text-red-600",
            bg: "bg-red-50",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div
              className={`mb-3 inline-flex rounded-xl ${stat.bg} p-2 ${stat.color}`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              {stat.label}
            </div>
            <div className={`text-2xl font-bold mt-1 ${stat.color}`}>
              {stat.val}
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-500 mr-2">
          <Filter className="h-4 w-4" /> Filters:
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-[#2563EB] outline-none"
        >
          <option value="all">All Types</option>
          <option value="general">General</option>
          <option value="academic">Academic</option>
          <option value="attendance">Attendance</option>
          <option value="exam">Examination</option>
          <option value="fee">Fee</option>
          <option value="event">Event</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-[#2563EB] outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent"></div>
            <p className="mt-4 text-gray-500 font-medium">
              Loading notifications...
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Bell className="mx-auto h-12 w-12 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">No notifications found</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleViewNotification(notif)}
              className={`group relative cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-lg hover:border-blue-200 ${
                notif.is_read_by_me
                  ? "border-gray-100 bg-white"
                  : "border-blue-100 bg-blue-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3
                      className={`text-lg font-bold ${notif.is_read_by_me ? "text-gray-800" : "text-[#2563EB]"}`}
                    >
                      {notif.title}
                    </h3>
                    {!notif.is_read_by_me && (
                      <span className="flex h-2 w-2 rounded-full bg-[#2563EB] animate-pulse"></span>
                    )}
                  </div>
                  <p className="mb-4 text-sm text-gray-600 leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <span
                      className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getPriorityStyles(notif.priority)}`}
                    >
                      {notif.priority}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(notif.created_at).toLocaleDateString()}
                    </div>
                    {notif.sender && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                        <User className="h-3.5 w-3.5" />
                        {notif.sender.username}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="rounded-lg bg-white p-2 text-[#2563EB] shadow-sm border border-gray-100">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">
            <div className="bg-[#2563EB] px-8 py-6 text-white shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                  {selectedNotification.notification_type}
                </span>
                <button
                  onClick={handleCloseDetailModal}
                  className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h2 className="mt-4 text-2xl font-bold leading-tight">
                {selectedNotification.title}
              </h2>
            </div>
            <div className="p-8 overflow-y-auto">
              <p className="whitespace-pre-wrap text-gray-600 leading-relaxed mb-8">
                {selectedNotification.message}
              </p>
              <div className="grid grid-cols-2 gap-6 rounded-2xl bg-gray-50 p-5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Sender
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-sm font-bold text-gray-800">
                    <User className="h-4 w-4 text-[#2563EB]" />{" "}
                    {selectedNotification.sender?.username || "System"}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Sent Date
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Clock className="h-4 w-4 text-[#2563EB]" />{" "}
                    {new Date(selectedNotification.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseDetailModal}
                className="mt-8 w-full rounded-xl bg-[#2563EB] py-3 font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal - FIXED HEIGHT AND OVERFLOW */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6 shrink-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Send className="h-5 w-5 text-[#2563EB]" /> Create Notification
              </h2>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {createSuccess ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="text-xl font-bold text-gray-900">
                  Successfully Sent!
                </p>
                <p className="text-gray-500 mt-2">
                  The notification has been broadcasted.
                </p>
              </div>
            ) : (
              <form
                id="create-notification-form"
                onSubmit={handleFormSubmit(onSubmit)}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 overflow-y-auto px-8 pt-6 pb-2 space-y-5">
                  {/* Send Mode Toggle — only admins can send individual notifications */}
                  {isAdmin && (
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setSendMode("group"); setSelectedRecipients([]); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all ${sendMode === "group" ? "bg-[#2563EB] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                      <Layers className="h-4 w-4" /> Group
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendMode("individual")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all ${sendMode === "individual" ? "bg-[#2563EB] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                      <User className="h-4 w-4" /> Individual
                    </button>
                  </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Title
                    </label>
                    <input
                      type="text"
                      {...register("title")}
                      className={`w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#2563EB] outline-none transition-all ${errors.title ? "border-red-400" : "border-gray-200"}`}
                      placeholder="e.g., Annual Sports Day Update"
                    />
                    {errors.title && (
                      <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Message
                    </label>
                    <textarea
                      {...register("message")}
                      rows={4}
                      className={`w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#2563EB] outline-none transition-all resize-none ${errors.message ? "border-red-400" : "border-gray-200"}`}
                      placeholder="Write your message here..."
                    />
                    {errors.message && (
                      <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Type
                      </label>
                      <select
                        {...register("notification_type")}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#2563EB] outline-none"
                      >
                        <option value="general">General</option>
                        <option value="academic">Academic</option>
                        <option value="attendance">Attendance</option>
                        <option value="exam">Examination</option>
                        <option value="fee">Fee</option>
                        <option value="event">Event</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Priority
                      </label>
                      <select
                        {...register("priority")}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#2563EB] outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {/* Group mode */}
                  {sendMode === "group" && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Recipient Group
                      </label>
                      <div className="relative">
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                          {...register("recipient_group")}
                          className={`w-full rounded-xl border bg-gray-50 pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#2563EB] outline-none ${errors.recipient_group ? "border-red-400" : "border-gray-200"}`}
                        >
                          <option value="">Select group...</option>
                          <option value="all_students">All Students</option>
                          <option value="all_parents">All Parents</option>
                          {isAdmin && (
                            <>
                              <option value="all_teachers">All Teachers</option>
                              <option value="all_users">All Users</option>
                            </>
                          )}
                        </select>
                      </div>
                      {errors.recipient_group && (
                        <p className="mt-1 text-xs text-red-500">{errors.recipient_group.message}</p>
                      )}
                    </div>
                  )}

                  {/* Individual mode — admin only */}
                  {sendMode === "individual" && isAdmin && (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Search Recipients
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={userTypeFilter}
                          onChange={(e) => { setUserTypeFilter(e.target.value); setUserResults([]); setUserSearch(""); }}
                          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#2563EB] outline-none"
                        >
                          <option value="student">Students</option>
                          <option value="parent">Parents</option>
                          {isAdmin && <option value="teacher">Teachers</option>}
                        </select>
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Search by name or username..."
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2563EB] outline-none"
                          />
                        </div>
                      </div>

                      {/* Search results */}
                      {userSearchLoading ? (
                        <div className="text-center py-4 text-sm text-gray-400">Searching...</div>
                      ) : userResults.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                          {userResults.map((u) => {
                            const isSelected = selectedRecipients.some((r) => r.id === u.id);
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => toggleRecipient(u)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}
                              >
                                <span className="font-medium">{u.full_name || u.username}</span>
                                <span className="text-xs text-gray-400">{u.email}</span>
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 ml-2" />}
                              </button>
                            );
                          })}
                        </div>
                      ) : userSearch ? (
                        <p className="text-center py-3 text-sm text-gray-400">No users found</p>
                      ) : null}

                      {/* Selected recipients chips */}
                      {selectedRecipients.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-2">
                            Selected ({selectedRecipients.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedRecipients.map((r) => (
                              <span
                                key={r.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"
                              >
                                {r.full_name || r.username}
                                <button type="button" onClick={() => toggleRecipient(r)}>
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {sendMode === "individual" && selectedRecipients.length === 0 && (
                        <p className="text-xs text-red-500">Select at least one recipient.</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <input
                      type="checkbox"
                      id="send_email"
                      {...register("send_email")}
                      className="h-5 w-5 rounded-md border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <label
                      htmlFor="send_email"
                      className="text-sm font-bold text-blue-900 flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" /> Also send via Email
                    </label>
                  </div>
                </div>
                {/* Fixed footer */}
                <div className="shrink-0 flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-white">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-xl px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || (sendMode === "individual" && selectedRecipients.length === 0)}
                    className="rounded-xl bg-[#2563EB] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:bg-gray-400 transition-all"
                  >
                    {creating ? "Sending..." : "Send Notification"}
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