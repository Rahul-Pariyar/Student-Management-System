import React, { useState, useEffect, useMemo } from 'react';
import { attendanceService, academicService } from '../../services';
import { Filter, Calendar, CheckCircle, XCircle, Search, ClipboardList, Loader2 } from 'lucide-react';

const unwrap = (data) => (Array.isArray(data) ? data : data?.results || []);

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`${color} flex items-center justify-between rounded-2xl p-6 text-white shadow-lg shadow-slate-200`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{label}</p>
        <p className="mt-1 text-3xl font-black">{value}</p>
      </div>
      <div className="rounded-xl bg-white/20 p-2.5">{icon}</div>
    </div>
  );
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [filters, setFilters] = useState({ subject: '', class: '', date_from: '', date_to: '' });
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Compute stats from records
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const absent = total - present;
    const presentPct = total > 0 ? ((present / total) * 100).toFixed(2) : '0.00';
    return { presentPct, total, present, absent };
  }, [records]);

  // Load dropdown data from student's active enrollments
  useEffect(() => {
    (async () => {
      try {
        const [enrollRes, classRes] = await Promise.all([
          academicService.listEnrollments(),
          academicService.listClasses(),
        ]);
        const enrollments = unwrap(enrollRes.data).filter(e => e.is_active);
        const allClasses = unwrap(classRes.data);

        // Unique enrolled classes
        const classMap = new Map();
        enrollments.forEach(e => classMap.set(e.class_enrolled, e.class_name));
        setEnrolledClasses([...classMap].map(([id, name]) => ({ id, name })));

        // Subjects matching enrolled course + semester
        const subjectMap = new Map();
        const subjectFetches = [...classMap.keys()].map(classId => {
          const cls = allClasses.find(c => c.id === classId);
          return cls ? academicService.listSubjects({ course: cls.course, semester: cls.semester }) : null;
        }).filter(Boolean);

        const results = await Promise.all(subjectFetches);
        results.forEach(res => unwrap(res.data).forEach(s => subjectMap.set(s.id, s.name)));
        setAvailableSubjects([...subjectMap].map(([id, name]) => ({ id, name })));
      } catch (err) {
        console.error('Failed to load enrollment data:', err);
      }
    })();
  }, []);

  // Fetch attendance records
  const fetchAttendance = async () => {
    setLoading(true);
    setFiltersApplied(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await attendanceService.viewAttendance(params);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => { fetchAttendance(); }, []);

  // const handleFilterChange = (e) => setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
//   const handleFilterChange = (e) => {
//   setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
//   setRecords([]);
// };
  const handleFilterChange = (e) => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
    setRecords([]);
    setFiltersApplied(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">View Attendance</h1>
        <p className="mt-1 text-slate-500 font-medium">View attendance records and statistics</p>
      </header>

      <div className="flex flex-col gap-8">
        {/* Main Content */}
        <main className="flex-1 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {/* <StatCard label="Attendance %" value={`${stats.presentPct}%`} color="bg-[#10B981]" icon={<CheckCircle size={24} />} />
            <StatCard label="Total Sessions" value={stats.total} color="bg-[#3B82F6]" icon={<Calendar size={24} />} />
            <StatCard label="Present" value={stats.present} color="bg-[#059669]" icon={<CheckCircle size={24} />} />
            <StatCard label="Absent / Other" value={stats.absent} color="bg-[#EF4444]" icon={<XCircle size={24} />} /> */}

            {/* <StatCard label="Attendance %" value={filters.subject ? `${stats.presentPct}%` : '—'} color="bg-[#10B981]" icon={<CheckCircle size={24} />} />
            <StatCard label="Total Sessions" value={filters.subject ? stats.total : '—'} color="bg-[#3B82F6]" icon={<Calendar size={24} />} />
            <StatCard label="Present" value={filters.subject ? stats.present : '—'} color="bg-[#059669]" icon={<CheckCircle size={24} />} />
            <StatCard label="Absent / Other" value={filters.subject ? stats.absent : '—'} color="bg-[#EF4444]" icon={<XCircle size={24} />} /> */}
            <StatCard label="Attendance %" value={filtersApplied ? `${stats.presentPct}%` : '—'} color="bg-[#10B981]" icon={<CheckCircle size={24} />} />
            <StatCard label="Total Sessions" value={filtersApplied ? stats.total : '—'} color="bg-[#3B82F6]" icon={<Calendar size={24} />} />
            <StatCard label="Present" value={filtersApplied ? stats.present : '—'} color="bg-[#059669]" icon={<CheckCircle size={24} />} />
            <StatCard label="Absent / Other" value={filtersApplied ? stats.absent : '—'} color="bg-[#EF4444]" icon={<XCircle size={24} />} />
          </div>

          {/* Filters - horizontal */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-4">
              <Filter size={18} className="text-indigo-500" /> Filters 
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Subject</label>
                <select name="subject" value={filters.subject} onChange={handleFilterChange} className={inputClass}>
                  <option value="" disabled>--Select Subject--</option>
                  {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {/* <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Class</label>
                <select name="class" onChange={handleFilterChange} className={inputClass}>
                  <option value="">All classes</option>
                  {enrolledClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div> */}
              <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Date From</label>
                <input name="date_from" type="date" onChange={handleFilterChange} className={inputClass} />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Date To</label>
                <input name="date_to" type="date" onChange={handleFilterChange} className={inputClass} />
              </div>
              <button onClick={fetchAttendance} className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-2.5 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                <Search size={18} /> Apply
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 p-5 font-bold text-slate-800 bg-slate-50/50">
              <ClipboardList size={20} className="text-indigo-500" /> Attendance Records
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Marked By</th>
                    <th className="px-6 py-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <Loader2 className="mx-auto animate-spin text-indigo-500" size={32} />
                        <p className="mt-2 text-slate-500 font-medium">Loading records...</p>
                      </td>
                    </tr>
                  ) : records.length > 0 ? (
                    records.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="whitespace-nowrap px-6 py-5 font-semibold text-slate-700">
                          {row.session_date || (row.marked_at ? new Date(row.marked_at).toLocaleDateString() : '-')}
                        </td>
                        <td className="px-6 py-5 text-slate-700">{row.subject_name || '-'}</td>
                        <td className="px-6 py-5 text-slate-700">{row.class_name || '-'}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase text-white ${row.status === 'present' || row.status === 'late' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-slate-600">{row.marked_by || '-'}</td>
                        <td className="px-6 py-5 text-slate-400 italic text-xs">{row.remarks || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="py-10 text-center text-slate-400">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}