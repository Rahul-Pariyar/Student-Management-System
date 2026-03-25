import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { accountService } from "../../services";
import {
  User,
  CalendarCheck,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Users,
  GraduationCap,
  ChevronDown,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await accountService.getDashboard();
      setDashboardData(data);

      if (data?.children && data.children.length > 0) {
        setSelectedChild(data.children[0]);
      }
      setError(null);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChildChange = (e) => {
    const childId = parseInt(e.target.value);
    const child = dashboardData.children.find((c) => c.id === childId);
    setSelectedChild(child);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent"></div>
        <p className="mt-4 text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-700 p-8 text-white shadow-md">
        <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="mt-1 text-sm text-blue-100">Parent Dashboard</p>
      </div>

      {/* Child Selector Dropdown */}
      {dashboardData?.children && dashboardData.children.length > 0 && (
        <div className="mb-8 max-w-xs">
          <label
            htmlFor="childSelect"
            className="block text-sm font-semibold text-gray-600 mb-2"
          >
            Select Child
          </label>
          <div className="relative">
            <select
              id="childSelect"
              value={selectedChild?.id || ""}
              onChange={handleChildChange}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] transition-all"
            >
              {dashboardData.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {/* Selected Child Overview */}
      {selectedChild && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Child Info Card */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-gray-900">
                    {selectedChild.name}
                  </h3>
                  <p className="text-sm text-gray-400">{selectedChild.class}</p>
                </div>
              </div>
            </div>

            {/* Attendance Card */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Attendance
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {selectedChild.attendance.percentage}%
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
                  <CalendarCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Present: {selectedChild.attendance.present} /{" "}
                {selectedChild.attendance.total} days
              </p>
            </div>

            {/* Unpaid Fees Card */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Unpaid Fees
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold ${selectedChild.unpaid_fees > 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    Rs. {selectedChild.unpaid_fees.toFixed(2)}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {selectedChild.unpaid_fees > 0 ? "Payment pending" : "All paid"}
              </p>
            </div>

            {/* Performance Card */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Overall Status
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold ${selectedChild.attendance.percentage >= 75 && selectedChild.unpaid_fees === 0 ? "text-green-600" : "text-yellow-600"}`}
                  >
                    {selectedChild.attendance.percentage >= 75 &&
                    selectedChild.unpaid_fees === 0
                      ? "Good Standing"
                      : "Needs Attention"}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Summary Section */}
          <div className="mb-8 rounded-xl border border-gray-100 bg-white p-7 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-gray-800 flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-[#2563EB]" /> Attendance
              Summary - {selectedChild.name}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-xl bg-green-50 p-5 text-center border border-green-100">
                <p className="text-3xl font-bold text-green-600">
                  {selectedChild.attendance.present}
                </p>
                <p className="mt-1 text-sm text-green-700 font-medium">
                  Present Days
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-5 text-center border border-red-100">
                <p className="text-3xl font-bold text-red-600">
                  {selectedChild.attendance.total -
                    selectedChild.attendance.present}
                </p>
                <p className="mt-1 text-sm text-red-700 font-medium">
                  Absent Days
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-5 text-center border border-blue-100">
                <p className="text-3xl font-bold text-blue-600">
                  {selectedChild.attendance.percentage}%
                </p>
                <p className="mt-1 text-sm text-blue-700 font-medium">
                  Attendance Rate
                </p>
              </div>
            </div>
            <div className="mt-7">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-500 font-medium">
                  Overall Attendance Progress
                </span>
                <span className="font-bold text-gray-900">
                  {selectedChild.attendance.percentage}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${selectedChild.attendance.percentage >= 75 ? "bg-green-500" : selectedChild.attendance.percentage >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${selectedChild.attendance.percentage}%` }}
                />
              </div>
              {selectedChild.attendance.percentage < 75 && (
                <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Attendance is below 75%.
                  Please ensure regular attendance.
                </p>
              )}
            </div>
          </div>

          {/* Fee Status Section */}
          <div className="mb-8 rounded-xl border border-gray-100 bg-white p-7 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#2563EB]" /> Fee Status -{" "}
              {selectedChild.name}
            </h2>
            {selectedChild.unpaid_fees > 0 ? (
              <div className="rounded-xl bg-red-50 p-5 border border-red-100">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-bold text-red-800">
                      Outstanding Payment Required
                    </p>
                    <p className="text-sm text-red-700">
                      Total amount due:{" "}
                      <span className="font-bold">
                        Rs. {selectedChild.unpaid_fees.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-green-50 p-5 border border-green-100">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-bold text-green-800">All Fees Paid</p>
                    <p className="text-sm text-green-700">
                      No outstanding payments for this period.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* No Children Message */}
      {(!dashboardData?.children || dashboardData.children.length === 0) && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-16 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            No Children Linked
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Please contact the school administration to link your children's
            accounts.
          </p>
        </div>
      )}
    </div>
  );
}