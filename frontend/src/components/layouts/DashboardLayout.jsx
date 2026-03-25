import React, { useState, useMemo } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileSignature,
  Wallet,
  Bell,
  ClipboardList,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Library,
  CalendarRange,
  UserCircle,
  X,
  GraduationCap,
  BookOpen,
  Building2,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

const navItems = {
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    {
      label: "Academic",
      icon: Library,
      children: [
        {
          to: "/admin/academic/subjects",
          label: "Subjects",
          icon: BookOpen,
        },
        {
          to: "/admin/academic/year",
          label: "Year",
          icon: CalendarRange,
        },
        { to: "/admin/academic/classes", label: 'Classes', icon: GraduationCap },
        { to: "/admin/academinc/departments", label: "Departments", icon: Building2 },
        { to: "/admin/academic/courses", label: "Courses", icon: BookOpen },
        { to: "/admin/academic/enrollment", label: "Enrollment", icon: UserCheck },
      ],

    },


    { to: "/admin/assignments", label: "Assignments", icon: ClipboardList },
    { to: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/admin/examinations", label: "Exams", icon: FileSignature },
    { to: "/admin/fees", label: "Fees", icon: Wallet },
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
  ],
  teacher: [
    { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/teacher/classes", label: "Classes", icon: Users },
    { to: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
    { to: "/teacher/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/teacher/examinations", label: "Exams", icon: FileSignature },
    { to: "/teacher/notifications", label: "Notifications", icon: Bell },
  ],
  student: [
    { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/student/assignments", label: "Assignments", icon: ClipboardList },
    { to: "/student/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/student/examinations", label: "Examinations", icon: FileSignature },
    { to: "/student/result", label: "Results", icon: FileSignature },
    { to: "/student/notifications", label: "Notifications", icon: Bell },
  ],
  parent: [
    { to: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/parent/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/parent/examinations", label: "Examinations", icon: FileSignature },
    { to: "/parent/result", label: "Results", icon: FileSignature },
    { to: "/parent/notifications", label: "Notifications", icon: Bell },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location=useLocation();

  const items = navItems[user?.user_type] || [];

  const [expandedMenus, setExpandedMenus] = useState({ academic: true });

  const academicChildActive = useMemo(
    () => location.pathname.startsWith("/admin/academic/"),
    [location.pathname],
  );

  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden flex-col lg:flex-row">
      {/* Mobile Header - Prevents icon from covering content */}
      <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4 lg:hidden shrink-0">
        <h1 className="text-xl font-bold text-[#3e70fa]">EduFlow</h1>
        <button
          className="rounded-lg p-2 hover:bg-gray-50 transition-colors"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-6 w-6 text-[#3e70fa]" />
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transition-all duration-300 ease-in-out flex flex-col
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-gray-100 bg-white text-[#3e70fa] shadow-sm hover:bg-gray-50 z-50"
        >
          {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={20} />}
        </button>

        {/* Logo Section (Sidebar) */}
        <div
          className={`flex h-20 items-center px-6 transition-all duration-300 ${isCollapsed ? "justify-center" : "justify-between"}`}
        >
          <h1
            className={`cursor-pointer font-bold text-[#3e70fa] transition-all duration-300 ${isCollapsed ? "text-xl" : "text-2xl"}`}
            onClick={() => {
              navigate(`/${user?.user_type}/dashboard`);
              setMobileOpen(false);
            }}
          >
            {isCollapsed ? (
              <p className="text-[10px]">EduFlow</p>
            ) : (
              <p className="text-lg">EduFlow</p>
            )}
          </h1>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* Divider */}

        <div className="">
          <hr className=" h-px border-0 bg-gray-200"></hr>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 overflow-y-auto overflow-x-hidden pt-2">
          {/* {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : ""}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl transition-all duration-200 py-3 ${isCollapsed ? "justify-center" : "px-4"
                } ${isActive
                  ? "bg-gray-200 text-blue-500 shadow-md shadow-blue-50"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#3e70fa]"
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium truncate">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))} */}
          {items.map((item) => {
            if (!item.children) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  title={isCollapsed ? item.label : ""}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl transition-all duration-200 py-3 ${
                      isCollapsed ? "justify-center" : "px-4"
                    } ${
                      isActive
                        ? "bg-gray-200 text-blue-500 shadow-md shadow-blue-50"
                        : "text-gray-500 hover:bg-gray-50 hover:text-[#3e70fa]"
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                </NavLink>
              );
            }

            const menuKey = item.label.toLowerCase();
            const isOpen = !!expandedMenus[menuKey];
            const isParentActive = item.children.some((child) =>
              location.pathname.startsWith(child.to),
            );

            return (
              <div key={item.label} className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!isCollapsed) {
                      toggleMenu(menuKey);
                    }
                  }}
                  title={isCollapsed ? item.label : ""}
                  className={`flex w-full items-center gap-3 rounded-xl py-3 transition-all duration-200 ${
                    isCollapsed ? "justify-center" : "px-4"
                  } ${
                    isParentActive || (menuKey === "academic" && academicChildActive)
                      ? "bg-gray-200 text-blue-500 shadow-md shadow-blue-50"
                      : "text-gray-500 hover:bg-gray-50 hover:text-[#3e70fa]"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      <span className="ml-auto">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    </>
                  )}
                </button>

                {!isCollapsed && isOpen && (
                  <div className="space-y-1 pl-4">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-200 ${
                            isActive
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-500 hover:bg-gray-50 hover:text-[#3e70fa]"
                          }`
                        }
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Profile & Logout */}
        {/* Profile & Logout */}
        <div className="border-t border-gray-100 p-3 space-y-2">
          <Link
            to={`/${user.user_type}/profile`}
            className={`flex items-center gap-3 rounded-xl bg-gray-50 transition-all duration-300 ${isCollapsed ? "justify-center p-2" : "p-3"}`}
          >
            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-[#3e70fa]/10 flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-[#3e70fa]" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-[10px] text-gray-500 capitalize leading-tight">
                  {user?.user_type}
                </p>
              </div>
            )}
          </Link>

          <button
            onClick={logout}
            className={`flex w-full items-center gap-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200 ${isCollapsed ? "justify-center py-3" : "px-4 py-3"
              }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content - Responsive margins */}
      <main
        className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out 
          ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >
        <div className="p-6 lg:p-10 mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}