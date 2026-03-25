import React, { useState, useEffect, useCallback } from 'react';
import { examService, academicService } from '../../services';
import api from '../../services/api';
import {
  BookOpen, CalendarDays, Award, BarChart2,
  X, Loader2, CheckCircle, AlertCircle,
  Filter, Users, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';

const unwrap = (d) => (Array.isArray(d) ? d : d?.results ?? []);

function getExamStatus(examDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(examDate);
  if (d < today) return 'completed';
  if (d.toDateString() === today.toDateString()) return 'today';
  return 'upcoming';
}

const STATUS_CFG = {
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  today:     { label: 'Today',     cls: 'bg-amber-100 text-amber-700' },
  upcoming:  { label: 'Upcoming',  cls: 'bg-blue-100 text-blue-700' },
};

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition';
const labelCls = 'block text-sm font-semibold text-slate-600 mb-1.5';

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Examinations() {
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [filterAssignment, setFilterAssignment] = useState('');

  const [gradeExam, setGradeExam] = useState(null);
  const [statsExam, setStatsExam] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  useEffect(() => {
    academicService.listTeacherAssignments()
      .then((res) => setAssignments(unwrap(res.data)))
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, []);

  const loadExams = useCallback(
    async (customFilter, page = currentPage) => {
      setLoadingExams(true);
      const fa = customFilter !== undefined ? customFilter : filterAssignment;
      const params = { page, page_size: PAGE_SIZE };
      if (fa) {
        const a = assignments.find((x) => String(x.id) === String(fa));
        if (a) { params.subject = a.subject; params.class_for = a.class_assigned; }
      }
      try {
        const { data } = await examService.listExams(params);
        setExams(unwrap(data));
        setTotalCount(data.count ?? 0);
      } catch {
        setExams([]);
        setTotalCount(0);
      } finally {
        setLoadingExams(false);
      }
    },
    [assignments, filterAssignment, currentPage],
  );

  useEffect(() => {
    if (!loadingInit) loadExams();
  }, [loadingInit, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilter = () => { setCurrentPage(1); loadExams(filterAssignment, 1); };

  if (loadingInit) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
          <span className="rounded-full bg-indigo-600 p-2 text-white"><BookOpen size={18} /></span>
          Examinations
        </h1>
      </div>

      {/* Filter */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className={labelCls}>Filter by Subject / Class</label>
            <select value={filterAssignment} onChange={(e) => setFilterAssignment(e.target.value)} className={inputCls}>
              <option value="">All My Examinations</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>{a.subject_name} — {a.class_name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleFilter}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            <Filter size={16} /> Apply Filter
          </button>
          {filterAssignment && (
            <button onClick={() => { setFilterAssignment(''); setCurrentPage(1); loadExams('', 1); }}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-500 transition hover:bg-slate-50">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Exam Table */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 p-4 font-bold text-slate-800">
          <FileText size={18} className="text-indigo-500" /> My Examinations
          {!loadingExams && (
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">{totalCount}</span>
          )}
        </div>

        {loadingExams ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : exams.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No examinations found</p>
            <p className="mt-1 text-sm">No examinations assigned to your subjects yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4">Exam Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Marks</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((exam) => {
                  const st = getExamStatus(exam.exam_date);
                  const cfg = STATUS_CFG[st];
                  return (
                    <tr key={exam.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-semibold text-slate-900">{exam.name}</td>
                      <td className="px-6 py-4 text-slate-500">{exam.exam_type_name}</td>
                      <td className="px-6 py-4 text-slate-600">{exam.subject_name}</td>
                      <td className="max-w-[200px] px-6 py-4 text-xs text-slate-400">{exam.class_name}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} className="text-slate-400" />
                          {new Date(exam.exam_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {exam.total_marks}<span className="ml-1 text-xs font-normal text-slate-400">(pass {exam.passing_marks})</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {st === 'completed' ? (
                            <button onClick={() => setGradeExam(exam)} title="Enter / View Grades"
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700">
                              <Award size={13} /> Grades
                            </button>
                          ) : (
                            <span title="Grades can only be entered for completed exams"
                              className="flex cursor-not-allowed items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400">
                              <Award size={13} /> Grades
                            </span>
                          )}
                          <button onClick={() => setStatsExam(exam)} title="Stats" className="rounded-lg bg-indigo-50 p-1.5 text-indigo-500 transition hover:bg-indigo-100"><BarChart2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs text-slate-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1 || loadingExams}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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
                  <span key={`e${idx}`} className="px-1 text-xs text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    disabled={loadingExams}
                    className={`min-w-[32px] rounded-lg border px-2 py-1 text-xs font-semibold transition ${p === currentPage ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages || loadingExams}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {gradeExam && <EnterGradesModal exam={gradeExam} onClose={() => setGradeExam(null)} onSaved={() => { setGradeExam(null); loadExams(); }} />}
      {statsExam && <StatsModal exam={statsExam} onClose={() => setStatsExam(null)} />}    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENTER GRADES MODAL
   ═══════════════════════════════════════════════════════════════ */
function EnterGradesModal({ exam, onClose, onSaved }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // For internal exams: { [student_id]: { [component_id]: marks } }
  const [internalMarks, setInternalMarks] = useState({});
  // For internal exams: { [student_id]: external_marks }
  const [externalMarks, setExternalMarks] = useState({});

  const components = exam.has_internal ? (exam.internal_components ?? []) : [];
  const externalMax = exam.has_internal ? exam.total_marks - exam.internal_max : exam.total_marks;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [studentsRes, resultsRes] = await Promise.all([
          api.get(`/academic/classes/${exam.class_for}/students/`),
          examService.listResults({ examination: exam.id }),
        ]);
        const existing = unwrap(resultsRes.data);
        const raw = Array.isArray(studentsRes.data) ? studentsRes.data : studentsRes.data?.results ?? [];

        // If internal exam, also load existing internal marks
        let existingInternal = [];
        if (exam.has_internal) {
          const intRes = await examService.getInternalMarks(exam.id);
          existingInternal = Array.isArray(intRes.data) ? intRes.data : [];
        }

        setStudents(raw.map((s) => {
          const ex = existing.find((r) => r.student === s.student_id);
          return { student_id: s.student_id, name: s.name, marks: ex ? String(ex.marks_obtained) : '', remarks: ex?.remarks ?? '', external_marks: ex?.external_marks != null ? String(ex.external_marks) : '' };
        }));

        if (exam.has_internal) {
          const intMap = {};
          existingInternal.forEach((m) => {
            if (!intMap[m.student]) intMap[m.student] = {};
            intMap[m.student][m.component] = String(m.marks_obtained);
          });
          setInternalMarks(intMap);
        }
      } catch { setError('Failed to load student list.'); } finally { setLoading(false); }
    })();
  }, [exam]);

  const updateField = (idx, key, val) =>
    setStudents((p) => p.map((s, i) => i === idx ? { ...s, [key]: val } : s));

  const setInternal = (studentId, compId, val) =>
    setInternalMarks((p) => ({ ...p, [studentId]: { ...(p[studentId] ?? {}), [compId]: val } }));

  const gradePreview = (marks) => {
    if (marks === '' || marks === null) return null;
    const pct = (Number(marks) / exam.total_marks) * 100;
    if (pct >= 90) return 'A+'; if (pct >= 80) return 'A'; if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';  if (pct >= 50) return 'C+'; if (pct >= 40) return 'C';
    if (pct >= 30) return 'D';  return 'F';
  };

  // Compute preview final for internal exams
  const computeFinal = (studentId) => {
    const intTotal = components.reduce((s, c) => {
      const v = internalMarks[studentId]?.[c.id];
      return s + (v !== undefined && v !== '' ? Number(v) : 0);
    }, 0);
    const ext = externalMarks[studentId];
    if (ext === undefined || ext === '') return null;
    return intTotal + Number(ext);
  };

  const validateBeforeSubmit = () => {
    setError('');
    if (exam.has_internal) {
      const anyFilled = students.some((s) => {
        const hasInt = components.some((c) => internalMarks[s.student_id]?.[c.id] !== undefined && internalMarks[s.student_id]?.[c.id] !== '');
        const hasExt = externalMarks[s.student_id] !== undefined && externalMarks[s.student_id] !== '';
        return hasInt || hasExt;
      });
      if (!anyFilled) { setError('Enter marks for at least one student.'); return; }
    } else {
      const toSubmit = students.filter((s) => s.marks !== '');
      if (!toSubmit.length) { setError('Enter marks for at least one student.'); return; }
      if (toSubmit.some((s) => Number(s.marks) < 0 || Number(s.marks) > exam.total_marks)) {
        setError(`Marks must be 0–${exam.total_marks}.`); return;
      }
    }
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      if (exam.has_internal) {
        // Save internal marks
        const intResults = students
          .filter((s) => components.some((c) => internalMarks[s.student_id]?.[c.id] !== ''))
          .map((s) => ({
            student: s.student_id,
            marks: Object.fromEntries(
              components
                .filter((c) => internalMarks[s.student_id]?.[c.id] !== undefined && internalMarks[s.student_id]?.[c.id] !== '')
                .map((c) => [c.id, Number(internalMarks[s.student_id][c.id])])
            ),
            remarks: s.remarks,
          }));
        if (intResults.length) await examService.saveInternalMarks(exam.id, { results: intResults });

        // Save external marks
        const extResults = students
          .filter((s) => externalMarks[s.student_id] !== undefined && externalMarks[s.student_id] !== '')
          .map((s) => ({
            student: s.student_id,
            external_marks: Number(externalMarks[s.student_id]),
            remarks: s.remarks,
          }));
        if (extResults.length) await examService.saveExternalMarks(exam.id, { results: extResults });

        const saved = Math.max(intResults.length, extResults.length);
        setSuccess(`Saved for ${saved} student(s)!`);
      } else {
        const toSubmit = students.filter((s) => s.marks !== '');
        await examService.enterResults(exam.id, {
          results: toSubmit.map((s) => ({ student: s.student_id, marks_obtained: Number(s.marks), remarks: s.remarks })),
        });
        setSuccess(`Saved for ${toSubmit.length} student(s)!`);
      }
      setTimeout(() => onSaved(), 1200);
    } catch (err) { setError(err.response?.data?.detail || 'Failed to save results.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900"><Award size={20} className="text-emerald-600" /> Enter Grades</h2>
            <p className="mt-0.5 text-xs text-slate-500"><span className="font-semibold text-slate-700">{exam.name}</span> · {exam.subject_name} · Total: {exam.total_marks} · Pass: {exam.passing_marks}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={22} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
          ) : error && !students.length ? (
            <div className="py-12 text-center text-red-400"><AlertCircle size={32} className="mx-auto mb-2" /><p>{error}</p></div>
          ) : !students.length ? (
            <div className="py-12 text-center text-slate-400"><Users size={36} className="mx-auto mb-3 opacity-30" /><p>No students enrolled.</p></div>
          ) : (
            <>
              {error && <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle size={15} className="shrink-0" />{error}</div>}
              {success && <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle size={15} className="shrink-0" />{success}</div>}
              <p className="mb-4 text-xs text-slate-400">{students.length} student(s) — leave marks blank to skip.</p>

              {exam.has_internal && (
                <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-purple-50 px-4 py-3 text-xs text-purple-700">
                  <span className="font-semibold">Internal components:</span>
                  {components.map((c) => (
                    <span key={c.id} className="rounded-full bg-purple-100 px-2.5 py-0.5 font-bold">{c.name} ({c.max_marks})</span>
                  ))}
                  <span className="ml-auto">External max: <span className="font-bold">{externalMax}</span></span>
                </div>
              )}

              <div className="space-y-3">
                {students.map((s, idx) => {
                  if (exam.has_internal) {
                    const intTotal = components.reduce((sum, c) => {
                      const v = internalMarks[s.student_id]?.[c.id];
                      return sum + (v !== undefined && v !== '' ? Number(v) : 0);
                    }, 0);
                    const ext = externalMarks[s.student_id];
                    const final = (ext !== undefined && ext !== '') ? intTotal + Number(ext) : null;
                    const g = final !== null ? gradePreview(final) : null;
                    const passed = final !== null && final >= exam.passing_marks;
                    return (
                      <div key={s.student_id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="mb-3 text-sm font-semibold text-slate-800">{s.name}</p>
                        <div className="flex flex-wrap gap-3">
                          {components.map((c) => (
                            <div key={c.id} className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-slate-400">{c.name} (/{c.max_marks})</span>
                              <input
                                type="number" min="0" max={c.max_marks}
                                value={internalMarks[s.student_id]?.[c.id] ?? ''}
                                onChange={(e) => setInternal(s.student_id, c.id, e.target.value)}
                                placeholder="—"
                                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                              />
                            </div>
                          ))}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400">External (/{externalMax})</span>
                            <input
                              type="number" min="0" max={externalMax}
                              value={externalMarks[s.student_id] ?? ''}
                              onChange={(e) => setExternalMarks((p) => ({ ...p, [s.student_id]: e.target.value }))}
                              placeholder="—"
                              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                            />
                          </div>
                          {final !== null && (
                            <div className="flex flex-col items-center justify-end gap-1">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Final</span>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                {final}/{exam.total_marks} {g} {passed ? '✓' : '✗'}
                              </span>
                            </div>
                          )}
                        </div>
                        <input type="text" value={s.remarks} onChange={(e) => updateField(idx, 'remarks', e.target.value)}
                          placeholder="Remarks (optional)" className="mt-2.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 outline-none focus:border-blue-400" />
                      </div>
                    );
                  }

                  // Standard (no internal)
                  const g = gradePreview(s.marks);
                  const passed = s.marks !== '' && Number(s.marks) >= exam.passing_marks;
                  return (
                    <div key={s.student_id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex-1 text-sm font-semibold text-slate-800">{s.name}</div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" max={exam.total_marks} value={s.marks}
                              onChange={(e) => updateField(idx, 'marks', e.target.value)} placeholder="—"
                              className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                            <span className="text-xs text-slate-400">/ {exam.total_marks}</span>
                          </div>
                          {g && <span className={`rounded-full px-3 py-1 text-xs font-bold ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{g} {passed ? '✓' : '✗'}</span>}
                        </div>
                      </div>
                      <input type="text" value={s.remarks} onChange={(e) => updateField(idx, 'remarks', e.target.value)}
                        placeholder="Remarks (optional)" className="mt-2.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 outline-none focus:border-blue-400" />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {!loading && students.length > 0 && (
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button onClick={onClose} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={validateBeforeSubmit} disabled={saving || !!success}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />} Save Results
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100"><CheckCircle size={18} className="text-emerald-600" /></div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Save Results</h3>
            </div>
            <p className="mb-1 text-sm text-slate-600">Save grades for <span className="font-semibold">"{exam.name}"</span>?</p>
            <p className="mb-6 text-xs text-slate-400">{students.filter((s) => s.marks !== '').length} student(s) will have their results recorded. This will overwrite any existing results.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmit}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                <CheckCircle size={14} /> Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATS MODAL
   ═══════════════════════════════════════════════════════════════ */
const GRADE_CLR = { 'A+':'bg-emerald-500', A:'bg-emerald-400', 'B+':'bg-blue-400', B:'bg-blue-300', 'C+':'bg-amber-400', C:'bg-amber-300', D:'bg-orange-400', F:'bg-red-500' };

function StatsModal({ exam, onClose }) {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([examService.getExamStats(exam.id), examService.listResults({ examination: exam.id })])
      .then(([sRes, rRes]) => { setStats(sRes.data); setResults(unwrap(rRes.data)); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [exam]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900"><BarChart2 size={20} className="text-indigo-600" /> Exam Results & Stats</h2>
            <p className="mt-0.5 text-xs text-slate-500">{exam.name} · {exam.subject_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={22} /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
          ) : !stats || stats.total_students === 0 ? (
            <div className="py-14 text-center text-slate-400">
              <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No results entered yet.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { l:'Total', v:stats.total_students, c:'bg-slate-50 text-slate-700' },
                  { l:'Passed', v:stats.passed, c:'bg-emerald-50 text-emerald-700' },
                  { l:'Failed', v:stats.failed, c:'bg-red-50 text-red-600' },
                  { l:'Pass %', v:`${stats.pass_percentage}%`, c:'bg-blue-50 text-blue-700' },
                ].map((x) => (
                  <div key={x.l} className={`rounded-xl ${x.c} p-4 text-center`}>
                    <p className="text-2xl font-black">{x.v}</p>
                    <p className="mt-1 text-xs font-semibold opacity-70">{x.l}</p>
                  </div>
                ))}
              </div>

              <div className="mb-5 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                Average: <span className="font-black">{stats.average_marks}</span> <span className="opacity-60">/ {exam.total_marks}</span>
              </div>

              {Object.keys(stats.grade_distribution ?? {}).length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 text-sm font-bold text-slate-600">Grade Distribution</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.grade_distribution).map(([g, c]) => (
                      <span key={g} className={`${GRADE_CLR[g] ?? 'bg-gray-400'} rounded-full px-4 py-1.5 text-sm font-bold text-white`}>{g}: {c}</span>
                    ))}
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <p className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">Student Scores</p>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <tr><th className="px-4 py-3 text-left">Student</th><th className="px-4 py-3 text-center">Marks</th><th className="px-4 py-3 text-center">%</th><th className="px-4 py-3 text-center">Grade</th><th className="px-4 py-3 text-center">Result</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {results.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-700">{r.student_name}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-700">{r.marks_obtained}<span className="text-xs font-normal text-slate-400">/{r.total_marks}</span></td>
                            <td className="px-4 py-3 text-center text-slate-500">{r.percentage}%</td>
                            <td className="px-4 py-3 text-center"><span className={`${GRADE_CLR[r.grade] ?? 'bg-gray-400'} rounded-full px-2.5 py-0.5 text-xs font-bold text-white`}>{r.grade}</span></td>
                            <td className="px-4 py-3 text-center"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.is_passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{r.is_passed ? 'Pass' : 'Fail'}</span></td>
                          </tr>
                        ))}
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
  );
}