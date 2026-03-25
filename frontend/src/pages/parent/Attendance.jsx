import React, { useState, useEffect, useMemo } from 'react';
import { attendanceService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { Filter, Calendar, CheckCircle, XCircle, Search, ClipboardList, Loader2 } from 'lucide-react';

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
  const { user } = useAuth();
  const children = user?.profile?.children || [];

  const [selectedChild, setSelectedChild] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [filters, setFilters] = useState({ subject: '', date_from: '', date_to: '' });

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(String(children[0].id));
    }
  }, [children]);

  // Fetch available subjects when child changes - extract from attendance records
  useEffect(() => {
    if (!selectedChild || records.length === 0) {
      setAvailableSubjects([]);
      return;
    }
    
    // Extract unique subjects from attendance records
    const subjectMap = new Map();
    records.forEach(record => {
      if (record.subject_name) {
        // We need to get subject ID from the session's teacher assignment
        // Since we don't have direct subject_id in the record, we'll use subject_name as identifier
        subjectMap.set(record.subject_name, record.subject_name);
      }
    });
    
    const subjects = Array.from(subjectMap).map(([name]) => ({ id: name, name }));
    setAvailableSubjects(subjects);
  }, [selectedChild, records]);

  // Compute stats from records — filtered by subject if selected (client-side)
  const filteredRecords = useMemo(() => {
    if (!filters.subject) return records;
    return records.filter(r => r.subject_name === filters.subject);
  }, [records, filters.subject]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const absent = total - present;
    const presentPct = total > 0 ? ((present / total) * 100).toFixed(2) : '0.00';
    return { presentPct, total, present, absent };
  }, [filteredRecords]);

  const fetchAttendance = async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const params = { student: selectedChild };
      if (filters.subject) params.subject = filters.subject;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const { data } = await attendanceService.viewAttendance(params);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when child selection changes
  useEffect(() => {
    if (selectedChild) {
      setFilters({ subject: '', date_from: '', date_to: '' }); // Reset filters
      fetchAttendance();
    }
  }, [selectedChild]);

  const handleFilterChange = (e) => setFilters(f => ({ ...f, [e.target.name]: e.target.value }));

  const selectedChildName = children.find(c => String(c.id) === selectedChild)?.user?.full_name
    || children.find(c => String(c.id) === selectedChild)?.student_id
    || 'Child';

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Child's Attendance</h1>
        <p className="mt-1 text-slate-500 font-medium">View attendance records for your children</p>
      </header>

      <div className="flex flex-col gap-8">
        <main className="flex-1 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <StatCard label="Attendance %" value={`${stats.presentPct}%`} color="bg-[#10B981]" icon={<CheckCircle size={24} />} />
            <StatCard label="Total Sessions" value={stats.total} color="bg-[#3B82F6]" icon={<Calendar size={24} />} />
            <StatCard label="Present" value={stats.present} color="bg-[#059669]" icon={<CheckCircle size={24} />} />
            <StatCard label="Absent / Other" value={stats.absent} color="bg-[#EF4444]" icon={<XCircle size={24} />} />
          </div>

          {/* Filters */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-4">
              <Filter size={18} className="text-indigo-500" /> Filters
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px]">
                <label className={labelClass}>Select Child</label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a child</option>
                  {children.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.user?.full_name || c.student_id || `Child #${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className={labelClass}>Subject</label>
                <select name="subject" value={filters.subject} onChange={handleFilterChange} className={inputClass}>
                  <option value="">All Subjects</option>
                  {availableSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Date From</label>
                <input name="date_from" type="date" value={filters.date_from} onChange={handleFilterChange} className={inputClass} />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Date To</label>
                <input name="date_to" type="date" value={filters.date_to} onChange={handleFilterChange} className={inputClass} />
              </div>
              <button onClick={fetchAttendance} className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-2.5 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                <Search size={18} /> Apply
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 p-5 font-bold text-slate-800 bg-slate-50/50">
              <ClipboardList size={20} className="text-indigo-500" /> Attendance Records — {selectedChildName}
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
                  ) : filteredRecords.length > 0 ? (
                    filteredRecords.map(row => (
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
                    <tr><td colSpan="6" className="py-10 text-center text-slate-400">
                      {selectedChild ? 'No records found.' : 'Select a child to view attendance.'}
                    </td></tr>
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
