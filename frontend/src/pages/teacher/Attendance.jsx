import React, { useState, useEffect, useMemo } from 'react';
import { attendanceService, academicService } from '../../services';
import {
  Users, Search, Save, Clock,
  AlertCircle, CalendarCheck, History, Loader2, CheckCircle,
  XCircle, ClipboardList,
} from 'lucide-react';

const unwrap = (d) => (Array.isArray(d) ? d : d?.results || []);
const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#3e70fa] focus:ring-1 focus:ring-[#3e70fa]/20 transition-colors';
const labelClass = 'mb-1 block text-s font-semibold text-gray-500';
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_CFG = {
  present: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Present', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  absent:  { dot: 'bg-red-400',     text: 'text-red-500',     label: 'Absent',  badge: 'bg-red-50 text-red-600 border-red-200' },
  late:    { dot: 'bg-amber-400',   text: 'text-amber-600',   label: 'Late',    badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  excused: { dot: 'bg-gray-400',    text: 'text-gray-500',    label: 'Excused', badge: 'bg-gray-50 text-gray-600 border-gray-200' },
};

/* ═══════════════════════════════════════════════════════════════ */
export default function Attendance() {
  const [tab, setTab] = useState('mark');
  const [assignments, setAssignments] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  useEffect(() => {
    academicService.listTeacherAssignments()
      .then(r => setAssignments(unwrap(r.data)))
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, []);

  if (loadingInit) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {[
            { key: 'mark', icon: <CalendarCheck size={14} />, label: 'Mark Attendance' },
            { key: 'history', icon: <History size={14} />, label: 'History' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mark' ? (
        <MarkTab assignments={assignments} />
      ) : (
        <HistoryTab assignments={assignments} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MARK ATTENDANCE TAB
   ═══════════════════════════════════════════════════════════════ */
function MarkTab({ assignments }) {
  const [selectedTA, setSelectedTA] = useState('');
  const [date, setDate] = useState(today());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [topic, setTopic] = useState('');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const selectedAssignment = assignments.find(a => String(a.id) === String(selectedTA));

  const stats = useMemo(() => ({
    present: students.filter(s => s.status === 'present').length,
    absent:  students.filter(s => s.status === 'absent').length,
    late:    students.filter(s => s.status === 'late').length,
    excused: students.filter(s => s.status === 'excused').length,
  }), [students]);

  const loadStudents = async () => {
    if (!selectedTA) return;
    setLoadingStudents(true);
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await attendanceService.getStudentsForAssignment({ teacher_assignment: selectedTA });
      const list = unwrap(data).map(s => ({ ...s, status: 'present', remarks: '' }));
      setStudents(list);
    } catch {
      setError('Failed to load students.');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const setStatus = (id, status) =>
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));

  const markAll = (status) =>
    setStudents(prev => prev.map(s => ({ ...s, status })));

  const handleSubmit = () => {
    if (!selectedTA || !date || !startTime || !endTime) {
      setError('Please fill all required fields (subject, date, start & end time).');
      return;
    }
    if (students.length === 0) {
      setError('No students loaded.');
      return;
    }
    setError('');
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    try {
      await attendanceService.bulkMark({
        teacher_assignment: Number(selectedTA),
        date,
        start_time: startTime,
        end_time: endTime,
        topic_covered: topic,
        records: students.map(s => ({
          student: s.id,
          status: s.status,
          remarks: s.remarks || '',
        })),
      });
      setSuccessMsg('Attendance saved successfully!');
      setStudents([]);
      setTopic('');
      setStartTime('');
      setEndTime('');
    } catch (e) {
      const detail = e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || 'Failed to save attendance.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Horizontal filter bar ── */}
      <div className="rounded-xl bg-white p-5 border border-gray-100">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className={labelClass}>Subject & Class</label>
            <select
              value={selectedTA}
              onChange={e => { setSelectedTA(e.target.value); setStudents([]); setSuccessMsg(''); }}
              className={inputClass}
            >
              <option value="">-- Select --</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.subject_name} — {a.class_name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[140px]">
            <label className={labelClass}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </div>
          <div className="w-[110px]">
            <label className={labelClass}>Start</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} />
          </div>
          <div className="w-[110px]">
            <label className={labelClass}>End</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputClass} />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className={labelClass}>Topic</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Algebra Ch-3"
              className={inputClass}
            />
          </div>
          <button
            onClick={loadStudents}
            disabled={!selectedTA || loadingStudents}
            className="flex items-center gap-1.5 rounded-lg bg-[#3e70fa] px-4 py-2 text-sm font-medium text-white hover:bg-[#3361db] disabled:opacity-40 transition-colors"
          >
            {loadingStudents ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Load Students
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {/* ── Student table ── */}
      <div className="rounded-xl border border-gray-100 bg-white">
        {/* Info bar + summary */}
        {selectedAssignment && students.length > 0 && (
          <div className="border-b border-gray-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold text-gray-800">
                {selectedAssignment.subject_name} — {selectedAssignment.class_name}
              </p>
              <span className="text-xs text-gray-400">{students.length} students</span>
            </div>
            <div className="flex items-center gap-3">
              {Object.entries(stats).map(([key, val]) => (
                <span key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CFG[key].dot}`} />
                  {STATUS_CFG[key].label}: <span className="font-semibold text-gray-700">{val}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Users size={36} className="mb-2" />
            <p className="text-sm text-gray-400">Select a subject & click "Load Students"</p>
          </div>
        ) : (
          <div>
            {/* bulk actions */}
            <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b border-gray-50 bg-gray-50/50">
              <span className="text-xs text-gray-400 mr-1">Mark all:</span>
              {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => markAll(key)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${cfg.badge} hover:opacity-80`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left bg-gray-50/30">
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 w-10">#</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400">Student</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400">ID</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 text-center">Status</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{s.name}</td>
                      <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{s.student_id}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-center gap-1">
                          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                            <button
                              key={key}
                              onClick={() => setStatus(s.id, key)}
                              title={cfg.label}
                              className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                                s.status === key
                                  ? `border ${cfg.badge}`
                                  : 'text-gray-400 hover:bg-gray-100'
                              }`}
                            >
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={s.remarks || ''}
                          onChange={e => setStudents(prev =>
                            prev.map(st => st.id === s.id ? { ...st, remarks: e.target.value } : st)
                          )}
                          placeholder="Optional"
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#3e70fa]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-4 py-3 border-t border-gray-100">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-[#3e70fa] px-5 py-2 text-sm font-medium text-white hover:bg-[#3361db] disabled:opacity-40 transition-colors"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Attendance
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl border border-gray-100">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <AlertCircle size={20} className="text-gray-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Confirm Submission</h3>
              <p className="mt-1 text-sm text-gray-500">
                Submit attendance for <span className="font-medium text-gray-700">{selectedAssignment?.subject_name}</span> on {date}?
              </p>

              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-left space-y-1">
                {Object.entries(stats).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CFG[key].dot}`} />
                      {STATUS_CFG[key].label}
                    </span>
                    <span className="font-medium text-gray-700">{val}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmit}
                  className="flex-1 rounded-lg bg-[#3e70fa] py-2 text-sm font-medium text-white hover:bg-[#3361db] transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HISTORY TAB
   ═══════════════════════════════════════════════════════════════ */
function HistoryTab({ assignments }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTA, setFilterTA] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    const params = {};
    if (filterTA) params.teacher_assignment = filterTA;
    setLoading(true);
    attendanceService.listSessions(params)
      .then(r => setSessions(unwrap(r.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterTA]);

  const viewSession = async (session) => {
    setSelectedSession(session);
    setLoadingRecords(true);
    try {
      const { data } = await attendanceService.getRecords({ session: session.id });
      setRecords(unwrap(data));
    } catch {
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter */}
      <div className="w-72">
        <label className={labelClass}>Filter by Subject & Class</label>
        <select
          value={filterTA}
          onChange={e => { setFilterTA(e.target.value); setSelectedSession(null); }}
          className={inputClass}
        >
          <option value="">All</option>
          {assignments.map(a => (
            <option key={a.id} value={a.id}>{a.subject_name} — {a.class_name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Sessions list */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="rounded-xl border border-gray-100 bg-white">
            <div className="border-b border-gray-100 px-4 py-2.5">
              <h2 className="text-xs font-semibold text-gray-500">
                <ClipboardList size={13} className="inline mr-1 -mt-0.5" />
                Sessions ({sessions.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">No sessions found</p>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => viewSession(s)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedSession?.id === s.id ? 'bg-blue-50/50 border-l-2 border-[#3e70fa]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">{s.subject_name}</p>
                      <span className="text-[11px] text-gray-400">{s.date}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{s.class_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                      <span><Clock size={11} className="inline mr-0.5" />{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</span>
                      {s.topic_covered && <span className="truncate">· {s.topic_covered}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Session detail / records */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-gray-100 bg-white">
            {!selectedSession ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <History size={32} className="mb-2" />
                <p className="text-sm text-gray-400">Select a session to view records</p>
              </div>
            ) : (
              <>
                <div className="border-b border-gray-100 px-4 py-2.5">
                  <p className="text-sm font-medium text-gray-800">
                    {selectedSession.subject_name} — {selectedSession.class_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedSession.date} · {selectedSession.start_time?.slice(0, 5)} – {selectedSession.end_time?.slice(0, 5)}
                    {selectedSession.topic_covered && <> · {selectedSession.topic_covered}</>}
                  </p>
                </div>

                {loadingRecords ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : records.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-400">No records found</p>
                ) : (
                  <div>
                    {/* summary row */}
                    <div className="flex flex-wrap gap-3 px-4 py-2.5 border-b border-gray-50 bg-gray-50/30">
                      {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                        const count = records.filter(r => r.status === key).length;
                        if (count === 0) return null;
                        return (
                          <span key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}: <span className="font-semibold text-gray-700">{count}</span>
                          </span>
                        );
                      })}
                      <span className="text-xs text-gray-500">
                        Total: <span className="font-semibold text-gray-700">{records.length}</span>
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-left bg-gray-50/30">
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 w-10">#</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400">Student</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 text-center">Status</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r, i) => {
                            const cfg = STATUS_CFG[r.status] || STATUS_CFG.present;
                            return (
                              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                                <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                                <td className="px-4 py-2.5 font-medium text-gray-800">{r.student_name}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                                    {cfg.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-gray-400 text-xs">{r.remarks || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}