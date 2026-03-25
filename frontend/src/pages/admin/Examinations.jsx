import React, { useState, useEffect, useCallback } from 'react';
import { examService, academicService } from '../../services';
import {
  BookOpen, PlusCircle, CalendarDays, Edit2, Trash2,
  X, Loader2, CheckCircle, AlertCircle, Filter, FileText,
  BarChart2, Award, Send,
} from 'lucide-react';

const unwrap = (d) => (Array.isArray(d) ? d : d?.results ?? []);

function getExamStatus(examDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
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

const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition';
const inputSmCls = 'w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition';
const labelCls = 'block text-sm font-semibold text-slate-600 mb-1.5';

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Examinations() {
  const [exams, setExams] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const [createModal, setCreateModal] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [deleteExam, setDeleteExam] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statsExam, setStatsExam] = useState(null);
  const [publishModal, setPublishModal] = useState(false);

  const [typeModal, setTypeModal] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeDesc, setTypeDesc] = useState('');
  const [typeSaving, setTypeSaving] = useState(false);
  const [typeError, setTypeError] = useState('');

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterTrigger, setFilterTrigger] = useState(0);

  useEffect(() => {
    Promise.all([
      examService.listTypes(),
      academicService.listSubjects(),
      academicService.listClasses(),
    ])
      .then(([tRes, sRes, cRes]) => {
        setExamTypes(unwrap(tRes.data));
        setSubjects(unwrap(sRes.data));
        setClasses(unwrap(cRes.data));
      })
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, []);

  // const loadExams = useCallback(async () => {
  //   setLoadingExams(true);
  //   const params = {};
  //   if (filterType) params.exam_type = filterType;
  //   if (filterSubject) params.subject = filterSubject;
  //   if (filterClass) params.class_for = filterClass;
  //   params.page = page;  
  //   try {
  //     const { data } = await examService.listExams(params);
  //     setExams(unwrap(data));
  //     setTotalCount(data.count ?? 0);
  //   } catch { setExams([]); }
  //   finally { setLoadingExams(false); }
  // }, [filterType, filterSubject, filterClass,page]);

  const loadExams = useCallback(async () => {
  setLoadingExams(true);
  const params = {};
  if (filterType) params.exam_type = filterType;
  if (filterSubject) params.subject = filterSubject;
  if (filterClass) params.class_for = filterClass;
  params.page = page;
  try {
    const { data } = await examService.listExams(params);
    setExams(unwrap(data));
    setTotalCount(data.count ?? 0);
  } catch { setExams([]); setTotalCount(0); }
  finally { setLoadingExams(false); }
}, [filterType, filterSubject, filterClass, page, filterTrigger]);

  // useEffect(() => { if (!loadingInit) loadExams(); }, [loadingInit]); // eslint-disable-line

  useEffect(() => { if (!loadingInit) loadExams(); }, [loadingInit, page, filterTrigger]); // eslint-disable-line

  const handleDeleteConfirm = async () => {
    if (!deleteExam) return;
    setDeleteLoading(true);
    try { await examService.deleteExam(deleteExam.id); setDeleteExam(null); loadExams(); }
    catch {} finally { setDeleteLoading(false); }
  };

  const handleCreateType = async () => {
    if (!typeName.trim()) { setTypeError('Name is required'); return; }
    setTypeSaving(true); setTypeError('');
    try {
      await examService.createType({ name: typeName.trim(), description: typeDesc.trim() });
      const { data } = await examService.listTypes();
      setExamTypes(unwrap(data));
      setTypeName(''); setTypeDesc(''); setTypeModal(false);
    } catch (err) {
      setTypeError(err.response?.data?.name?.[0] || 'Failed to create exam type.');
    } finally { setTypeSaving(false); }
  };

  if (loadingInit) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
          <span className="rounded-full bg-indigo-600 p-2 text-white"><BookOpen size={18} /></span>
          Examination Management
        </h1>
        <div className="flex gap-3">
          <button onClick={() => setTypeModal(true)}
            className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100">
            <Award size={16} /> New Exam Type
          </button>
          <button onClick={() => setPublishModal(true)}
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
            <Send size={16} /> Publish Results
          </button>
          <button onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
            <PlusCircle size={18} /> Create Exam
          </button>
        </div>
      </div>

      {examTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {examTypes.map((t) => (
            <span key={t.id} className="rounded-full bg-indigo-100 px-3.5 py-1.5 text-xs font-bold text-indigo-700">{t.name}</span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px] flex-1">
            <label className={labelCls}>Exam Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={inputCls}>
              <option value="">All Types</option>
              {examTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {/* <div className="min-w-[160px] flex-1">
            <label className={labelCls}>Subject</label>
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={inputCls}>
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div> */}
          <div className="min-w-[160px] flex-1">
            <label className={labelCls}>Class</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className={inputCls}>
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name || String(c)}</option>)}
            </select>
          </div>
          {/* <button onClick={loadExams}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            <Filter size={16} /> Apply
          </button> */}
          <button
            onClick={() => { setPage(1); setFilterTrigger((n) => n + 1); }}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            <Filter size={16} /> Apply
          </button>
          {(filterType || filterSubject || filterClass) && (
            // <button onClick={() => { setFilterType(''); setFilterSubject(''); setFilterClass(''); }}
            //   className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50">Clear
            // </button>
            <button
              onClick={() => { setFilterType(''); setFilterSubject(''); setFilterClass(''); setPage(1); setFilterTrigger((n) => n + 1); }}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Exam Table */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 p-4 font-bold text-slate-800">
          <FileText size={18} className="text-indigo-500" /> All Examinations
          {/* {!loadingExams && <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">{exams.length}</span>} */}
          {!loadingExams && (
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
              {totalCount} total
            </span>
          )}
        </div>
        {loadingExams ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : exams.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No examinations found</p>
            <p className="mt-1 text-sm">Create exams so teachers can enter marks.</p>
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
                      <td className="px-6 py-4 text-slate-500">{exam.exam_type_name}</td>                      <td className="px-6 py-4 text-slate-600">{exam.subject_name}</td>
                      <td className="max-w-[200px] px-6 py-4 text-xs text-slate-400">{exam.class_name}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} className="text-slate-400" />
                          {new Date(exam.exam_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {exam.total_marks}<span className="ml-1 text-xs font-normal text-slate-400">(pass {exam.passing_marks})</span>
                        {exam.has_internal && (
                          <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-600">INT</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setStatsExam(exam)} title="Stats" className="rounded-lg bg-indigo-50 p-1.5 text-indigo-500 transition hover:bg-indigo-100"><BarChart2 size={15} /></button>
                          <button onClick={() => setEditExam(exam)} title="Edit" className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200"><Edit2 size={15} /></button>
                          <button onClick={() => setDeleteExam(exam)} title="Delete" className="rounded-lg bg-red-50 p-1.5 text-red-400 transition hover:bg-red-100"><Trash2 size={15} /></button>
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

      {totalCount > 20 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1 || loadingExams}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs font-bold text-slate-700">
              Page {page} of {Math.ceil(totalCount / 20)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(totalCount / 20) || loadingExams}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {createModal && <ExamFormModal examTypes={examTypes} subjects={subjects} classes={classes} onClose={() => setCreateModal(false)} onSaved={() => { setCreateModal(false); loadExams(); }} />}
      {editExam && <ExamFormModal exam={editExam} examTypes={examTypes} subjects={subjects} classes={classes} onClose={() => setEditExam(null)} onSaved={() => { setEditExam(null); loadExams(); }} />}
      {statsExam && <StatsModal exam={statsExam} onClose={() => setStatsExam(null)} />}
      {publishModal && <PublishModal classes={classes} onClose={() => setPublishModal(false)} />}
      {deleteExam && <ConfirmDeleteModal exam={deleteExam} loading={deleteLoading} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteExam(null)} />}

      {/* Exam Type Modal */}
      {typeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Award size={20} className="text-indigo-600" /> New Exam Type</h2>
              <button onClick={() => setTypeModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            {typeError && <p className="mb-3 text-sm text-red-500">{typeError}</p>}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g. Mid Term, Final" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea rows={2} value={typeDesc} onChange={(e) => setTypeDesc(e.target.value)} className={inputCls + ' resize-none'} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setTypeModal(false)} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreateType} disabled={typeSaving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {typeSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EXAM FORM MODAL — Create / Edit (Admin)
   ═══════════════════════════════════════════════════════════════ */
function ExamFormModal({ exam, examTypes, subjects, classes, onClose, onSaved }) {
  const isEdit = !!exam;

  // Shared form fields (used for single exam and as header defaults for bulk)
  const [form, setForm] = useState({
    name: exam?.name ?? '',
    exam_type: exam?.exam_type ?? '',
    subject: exam?.subject ?? '',
    class_for: exam?.class_for ?? '',
    exam_date: exam?.exam_date ?? '',
    start_time: exam?.start_time?.slice(0, 5) ?? '',
    end_time: exam?.end_time?.slice(0, 5) ?? '',
    total_marks: exam?.total_marks ?? '',
    passing_marks: exam?.passing_marks ?? '',
    instructions: exam?.instructions ?? '',
    has_internal: exam?.has_internal ?? false,
  });
  const [internalComponents, setInternalComponents] = useState(
    exam?.internal_components ?? [{ name: '', max_marks: '' }]
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  // Class-filtered subjects
  const [classSubjects, setClassSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  // Per-row schedule for bulk mode: { [subjectId]: { exam_date, start_time, end_time, total_marks, passing_marks } }
  const [bulkRows, setBulkRows] = useState({});
  const [bulkResult, setBulkResult] = useState(null);

  // When class_for changes, fetch subjects for that class
  useEffect(() => {
    if (!form.class_for) { setClassSubjects([]); setSelectAll(false); setBulkRows({}); return; }
    const cls = classes.find((c) => String(c.id) === String(form.class_for));
    if (!cls) { setClassSubjects([]); return; }
    setLoadingSubjects(true);
    setSelectAll(false);
    setBulkRows({});
    setForm((p) => ({ ...p, subject: '' }));
    academicService.listSubjects({ course: cls.course, year: cls.year, semester: cls.semester })
      .then(({ data }) => setClassSubjects(unwrap(data)))
      .catch(() => setClassSubjects([]))
      .finally(() => setLoadingSubjects(false));
  }, [form.class_for]); // eslint-disable-line

  // When selectAll is toggled on, initialise bulk rows from shared form values
  useEffect(() => {
    if (!selectAll) return;
    const init = {};
    classSubjects.forEach((s) => {
      init[s.id] = {
        exam_date: form.exam_date,
        start_time: form.start_time,
        end_time: form.end_time,
        total_marks: form.total_marks,
        passing_marks: form.passing_marks,
      };
    });
    setBulkRows(init);
  }, [selectAll]); // eslint-disable-line

  const setField = (key) => (e) => {
    setErrors((p) => ({ ...p, [key]: '' }));
    setForm((p) => ({ ...p, [key]: e.target.value }));
  };
  const field = (k) => ({ value: form[k], onChange: setField(k) });

  const setBulkField = (subjectId, key) => (e) => {
    setBulkRows((p) => ({ ...p, [subjectId]: { ...p[subjectId], [key]: e.target.value } }));
  };

  const [showConfirm, setShowConfirm] = useState(false);

  // Validate single-exam mode
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.exam_type) e.exam_type = 'Required';
    if (!form.subject) e.subject = 'Required';
    if (!form.class_for) e.class_for = 'Required';
    if (!form.exam_date) e.exam_date = 'Required';
    if (!form.start_time) e.start_time = 'Required';
    if (!form.end_time) e.end_time = 'Required';
    if (!form.total_marks || Number(form.total_marks) <= 0) e.total_marks = 'Must be > 0';
    if (!form.passing_marks || Number(form.passing_marks) <= 0) e.passing_marks = 'Must be > 0';
    if (form.start_time && form.end_time && form.start_time >= form.end_time) e.end_time = 'Must be after start';
    if (form.passing_marks && form.total_marks && Number(form.passing_marks) > Number(form.total_marks)) e.passing_marks = 'Cannot exceed total';
    if (form.has_internal) {
      const internalMax = internalComponents.reduce((s, c) => s + Number(c.max_marks || 0), 0);
      if (internalComponents.some((c) => !c.name.trim() || !c.max_marks)) e.internal = 'All components need a name and marks.';
      else if (internalMax >= Number(form.total_marks)) e.internal = 'Internal total must be less than total marks.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Validate bulk mode — check every row has required fields
  const validateBulk = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.exam_type) e.exam_type = 'Required';
    if (!form.class_for) e.class_for = 'Required';
    if (form.has_internal) {
      const internalMax = internalComponents.reduce((s, c) => s + Number(c.max_marks || 0), 0);
      if (internalComponents.some((c) => !c.name.trim() || !c.max_marks)) e.internal = 'All components need a name and marks.';
      // Per-row check: internal total must be < each row's total_marks
      const rowInternalViolation = classSubjects.some((s) => {
        const r = bulkRows[s.id] ?? {};
        return r.total_marks && internalMax >= Number(r.total_marks);
      });
      if (rowInternalViolation) e.internal = 'Internal total must be less than each subject\'s total marks.';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return false;
    // Check each row
    let rowsOk = true;
    classSubjects.forEach((s) => {
      const r = bulkRows[s.id] ?? {};
      if (!r.exam_date || !r.start_time || !r.end_time || !r.total_marks || !r.passing_marks) rowsOk = false;
      if (r.start_time && r.end_time && r.start_time >= r.end_time) rowsOk = false;
      if (r.passing_marks && r.total_marks && Number(r.passing_marks) > Number(r.total_marks)) rowsOk = false;
    });
    if (!rowsOk) setApiError('Please fill all schedule fields correctly for each subject.');
    return rowsOk;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBulkResult(null);
    setApiError('');
    if (selectAll && classSubjects.length > 0) {
      if (!validateBulk()) return;
    } else {
      if (!validate()) return;
    }
    setShowConfirm(true);
  };

  const doSave = async () => {
    setShowConfirm(false);
    setBulkResult(null);
    setApiError('');

    if (selectAll && classSubjects.length > 0) {
      setSaving(true);
      const internalPayload = form.has_internal
        ? internalComponents.map((c) => ({ name: c.name.trim(), max_marks: Number(c.max_marks) }))
        : [];
      const results = await Promise.allSettled(
        classSubjects.map((s) => {
          const r = bulkRows[s.id] ?? {};
          return examService.createExam({
            name: form.name.trim() ? `${form.name} - ${s.name}` : s.name,
            exam_type: form.exam_type,
            class_for: form.class_for,
            instructions: form.instructions,
            subject: s.id,
            exam_date: r.exam_date,
            start_time: r.start_time,
            end_time: r.end_time,
            total_marks: r.total_marks,
            passing_marks: r.passing_marks,
            has_internal: form.has_internal,
            internal_components: internalPayload,
          });
        })
      );
      setSaving(false);
      const created = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      setBulkResult({ created, failed });
      if (failed === 0) setTimeout(onSaved, 1200);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        internal_components: form.has_internal
          ? internalComponents.map((c) => ({ name: c.name.trim(), max_marks: Number(c.max_marks) }))
          : [],
      };
      if (isEdit) await examService.updateExam(exam.id, payload);
      else await examService.createExam(payload);
      onSaved();
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object' && !Array.isArray(d))
        setApiError(Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join('; '));
      else setApiError('Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const subjectList = form.class_for ? classSubjects : subjects;
  const subjectDisabled = !form.class_for || loadingSubjects;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 rounded-t-2xl">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900">
            <BookOpen size={20} className="text-blue-600" />
            {isEdit ? 'Edit Examination' : 'Create New Examination'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {apiError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />{apiError}
            </div>
          )}
          {bulkResult && (
            <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${bulkResult.failed === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              {bulkResult.created} exam{bulkResult.created !== 1 ? 's' : ''} created
              {bulkResult.failed > 0 ? `, ${bulkResult.failed} failed` : ' successfully'}.
              {bulkResult.failed === 0 && ' Closing...'}
            </div>
          )}

          {/* ── Common fields ── */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelCls}>Exam Name *</label>
              <input
                type="text" {...field('name')}
                placeholder={selectAll ? 'e.g. Mid-term  (subject name will be appended per exam)' : 'e.g. Mid-term - Math - Class 10A'}
                className={inputCls}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className={labelCls}>Exam Type *</label>
              <select {...field('exam_type')} className={inputCls}>
                <option value="">— Select —</option>
                {examTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {errors.exam_type && <p className="mt-1 text-xs text-red-500">{errors.exam_type}</p>}
            </div>

            <div>
              <label className={labelCls}>Class *</label>
              <select {...field('class_for')} className={inputCls}>
                <option value="">— Select —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name || String(c)}</option>)}
              </select>
              {errors.class_for && <p className="mt-1 text-xs text-red-500">{errors.class_for}</p>}
            </div>

            {/* Subject — hidden in bulk mode */}
            {!selectAll && (
              <div>
                <label className={labelCls}>Subject *</label>
                <select
                  {...field('subject')}
                  className={inputCls + (subjectDisabled ? ' cursor-not-allowed opacity-50' : '')}
                  disabled={subjectDisabled}
                >
                  <option value="">
                    {loadingSubjects ? 'Loading…' : !form.class_for ? '— Select class first —' : '— Select subject —'}
                  </option>
                  {subjectList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.subject && <p className="mt-1 text-xs text-red-500">{errors.subject}</p>}
              </div>
            )}

            {/* Select All toggle — create mode only, class must be chosen */}
            {!isEdit && form.class_for && (
              <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${selectAll ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'} ${!selectAll ? 'md:col-start-2' : 'md:col-span-2'}`}>
                <input
                  id="selectAll"
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => { setSelectAll(e.target.checked); setErrors((p) => ({ ...p, subject: '' })); setApiError(''); }}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  disabled={loadingSubjects || classSubjects.length === 0}
                />
                <label htmlFor="selectAll" className="cursor-pointer text-sm font-semibold text-slate-700">
                  Schedule All Subjects
                  {classSubjects.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600">{classSubjects.length} subjects</span>
                  )}
                  {loadingSubjects && <Loader2 size={12} className="ml-1.5 inline animate-spin text-slate-400" />}
                </label>
                {selectAll && (
                  <span className="ml-auto text-xs text-blue-500">Fill schedule for each subject below</span>
                )}
              </div>
            )}
          </div>

          {/* ── Single exam schedule fields ── */}
          {!selectAll && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={labelCls}>Exam Date *</label>
                <input type="date" {...field('exam_date')} className={inputCls} />
                {errors.exam_date && <p className="mt-1 text-xs text-red-500">{errors.exam_date}</p>}
              </div>
              <div>
                <label className={labelCls}>Start Time *</label>
                <input type="time" {...field('start_time')} className={inputCls} />
                {errors.start_time && <p className="mt-1 text-xs text-red-500">{errors.start_time}</p>}
              </div>
              <div>
                <label className={labelCls}>End Time *</label>
                <input type="time" {...field('end_time')} className={inputCls} />
                {errors.end_time && <p className="mt-1 text-xs text-red-500">{errors.end_time}</p>}
              </div>
              <div>
                <label className={labelCls}>Total Marks *</label>
                <input type="number" min="1" {...field('total_marks')} className={inputCls} />
                {errors.total_marks && <p className="mt-1 text-xs text-red-500">{errors.total_marks}</p>}
              </div>
              <div>
                <label className={labelCls}>Passing Marks *</label>
                <input type="number" min="1" {...field('passing_marks')} className={inputCls} />
                {errors.passing_marks && <p className="mt-1 text-xs text-red-500">{errors.passing_marks}</p>}
                <p className="mt-1 text-xs text-slate-400">Typically 40% of total marks.</p>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Instructions (optional)</label>
                <textarea rows={3} {...field('instructions')} placeholder="Exam instructions..." className={inputCls + ' resize-none'} />
              </div>
            </div>
          )}

          {/* ── Internal Marks toggle (single exam only) ── */}
          {!selectAll && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.has_internal}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, has_internal: e.target.checked }));
                    if (e.target.checked && internalComponents.length === 0)
                      setInternalComponents([{ name: '', max_marks: '' }]);
                  }}
                  className="h-4 w-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-semibold text-slate-700">Include Internal Marks</span>
                {form.has_internal && form.total_marks && (
                  <span className="ml-auto text-xs text-slate-400">
                    External = {Number(form.total_marks) - internalComponents.reduce((s, c) => s + Number(c.max_marks || 0), 0)} marks
                  </span>
                )}
              </label>

              {form.has_internal && (
                <div className="mt-4 space-y-2">
                  {internalComponents.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Component name (e.g. Assignment)"
                        value={comp.name}
                        onChange={(e) => {
                          const updated = [...internalComponents];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setInternalComponents(updated);
                        }}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Max marks"
                        value={comp.max_marks}
                        onChange={(e) => {
                          const updated = [...internalComponents];
                          updated[idx] = { ...updated[idx], max_marks: e.target.value };
                          setInternalComponents(updated);
                        }}
                        className={inputCls + ' w-32'}
                      />
                      <button
                        type="button"
                        onClick={() => setInternalComponents(internalComponents.filter((_, i) => i !== idx))}
                        className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInternalComponents([...internalComponents, { name: '', max_marks: '' }])}
                    className="mt-1 text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    + Add Component
                  </button>
                  {errors.internal && <p className="text-xs text-red-500">{errors.internal}</p>}
                </div>
              )}
            </div>
          )}

          {/* ── Bulk schedule table ── */}
          {selectAll && classSubjects.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 overflow-hidden">
              <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                Per-Subject Schedule
                <span className="ml-2 text-xs font-normal text-blue-500">Each subject can have its own date, time and marks</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left w-40">Subject</th>
                      <th className="px-3 py-3 text-left">Date *</th>
                      <th className="px-3 py-3 text-left">Start *</th>
                      <th className="px-3 py-3 text-left">End *</th>
                      <th className="px-3 py-3 text-left">Total Marks *</th>
                      <th className="px-3 py-3 text-left">Pass Marks *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {classSubjects.map((s) => {
                      const row = bulkRows[s.id] ?? {};
                      const rowErr =
                        (row.start_time && row.end_time && row.start_time >= row.end_time) ||
                        (row.passing_marks && row.total_marks && Number(row.passing_marks) > Number(row.total_marks));
                      return (
                        <tr key={s.id} className={rowErr ? 'bg-red-50' : 'hover:bg-slate-50/60'}>
                          <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">{s.name}</td>
                          <td className="px-3 py-2.5">
                            <input
                              type="date"
                              value={row.exam_date ?? ''}
                              onChange={setBulkField(s.id, 'exam_date')}
                              className={inputSmCls}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="time"
                              value={row.start_time ?? ''}
                              onChange={setBulkField(s.id, 'start_time')}
                              className={inputSmCls}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="time"
                              value={row.end_time ?? ''}
                              onChange={setBulkField(s.id, 'end_time')}
                              className={inputSmCls + (row.start_time && row.end_time && row.start_time >= row.end_time ? ' border-red-400' : '')}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number" min="1"
                              value={row.total_marks ?? ''}
                              onChange={setBulkField(s.id, 'total_marks')}
                              className={inputSmCls + ' w-24'}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number" min="1"
                              value={row.passing_marks ?? ''}
                              onChange={setBulkField(s.id, 'passing_marks')}
                              className={inputSmCls + ' w-24' + (row.passing_marks && row.total_marks && Number(row.passing_marks) > Number(row.total_marks) ? ' border-red-400' : '')}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-blue-100 px-4 py-3 space-y-4">
                <div>
                  <label className={labelCls}>Instructions (optional — applied to all)</label>
                  <textarea rows={2} {...field('instructions')} placeholder="Exam instructions..." className={inputCls + ' resize-none'} />
                </div>

                {/* Bulk internal marks config */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.has_internal}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, has_internal: e.target.checked }));
                        if (e.target.checked && internalComponents.length === 0)
                          setInternalComponents([{ name: '', max_marks: '' }]);
                      }}
                      className="h-4 w-4 rounded accent-indigo-600"
                    />
                    <span className="text-sm font-semibold text-slate-700">Include Internal Marks (applied to all subjects)</span>
                  </label>
                  {form.has_internal && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-slate-400">These components will be added to every exam created. Each subject's total marks must exceed the internal total.</p>
                      {internalComponents.map((comp, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Component name (e.g. Assignment)"
                            value={comp.name}
                            onChange={(e) => {
                              const updated = [...internalComponents];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setInternalComponents(updated);
                            }}
                            className={inputCls}
                          />
                          <input
                            type="number"
                            min="1"
                            placeholder="Max marks"
                            value={comp.max_marks}
                            onChange={(e) => {
                              const updated = [...internalComponents];
                              updated[idx] = { ...updated[idx], max_marks: e.target.value };
                              setInternalComponents(updated);
                            }}
                            className={inputCls + ' w-32'}
                          />
                          <button
                            type="button"
                            onClick={() => setInternalComponents(internalComponents.filter((_, i) => i !== idx))}
                            className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setInternalComponents([...internalComponents, { name: '', max_marks: '' }])}
                        className="mt-1 text-sm font-semibold text-indigo-600 hover:underline"
                      >
                        + Add Component
                      </button>
                      {errors.internal && <p className="text-xs text-red-500">{errors.internal}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button
              type="submit"
              disabled={saving || bulkResult?.failed === 0}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {isEdit ? 'Save Changes' : selectAll ? `Create ${classSubjects.length} Exams` : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Confirmation modal */}
    {showConfirm && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <BookOpen size={18} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Save Changes?' : selectAll ? `Create ${classSubjects.length} Exams?` : 'Create Exam?'}
            </h3>
          </div>
          {selectAll ? (
            <p className="mb-6 text-sm text-slate-500">
              This will create <span className="font-semibold text-slate-700">{classSubjects.length} exams</span> for all subjects in the selected class. Are you sure?
            </p>
          ) : isEdit ? (
            <p className="mb-6 text-sm text-slate-500">
              Save changes to <span className="font-semibold text-slate-700">"{form.name}"</span>?
            </p>
          ) : (
            <p className="mb-6 text-sm text-slate-500">
              Create exam <span className="font-semibold text-slate-700">"{form.name}"</span>? This cannot be undone easily.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowConfirm(false)}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={doSave}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              <CheckCircle size={14} /> Confirm
            </button>
          </div>
        </div>
      </div>
    )}
    </>
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
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900"><BarChart2 size={20} className="text-indigo-600" /> Exam Stats</h2>
            <p className="mt-0.5 text-xs text-slate-500">{exam.name} · {exam.subject_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={22} /></button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
          ) : !stats || stats.total_students === 0 ? (
            <div className="py-14 text-center text-slate-400"><BarChart2 size={40} className="mx-auto mb-3 opacity-30" /><p className="font-medium">No results entered yet.</p></div>
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
                    <p className="text-2xl font-black">{x.v}</p><p className="mt-1 text-xs font-semibold opacity-70">{x.l}</p>
                  </div>
                ))}
              </div>
              <div className="mb-5 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">Average: <span className="font-black">{stats.average_marks}</span> <span className="opacity-60">/ {exam.total_marks}</span></div>
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

/* ═══════════════════════════════════════════════════════════════
   CONFIRM DELETE MODAL
   ═══════════════════════════════════════════════════════════════ */
function ConfirmDeleteModal({ exam, loading, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100"><Trash2 size={18} className="text-red-600" /></div>
          <h3 className="text-lg font-bold text-slate-900">Delete Examination</h3>
        </div>
        <p className="mb-1 text-sm text-slate-600">Delete <span className="font-semibold">"{exam.name}"</span>?</p>
        <p className="mb-6 text-xs text-slate-400">This permanently removes the exam and all associated results.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {loading && <Loader2 size={14} className="animate-spin" />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PUBLISH MODAL  — pick class → checkboxes per exam type → confirm
   ═══════════════════════════════════════════════════════════════ */
function PublishModal({ classes, onClose }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [publications, setPublications] = useState([]);
  const [loadingPubs, setLoadingPubs] = useState(false);

  // pending changes: { [exam_type_id]: bool }
  const [pending, setPending] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load publications when class changes
  useEffect(() => {
    if (!selectedClass) { setPublications([]); setPending({}); return; }
    setLoadingPubs(true);
    setSaveError('');
    examService.getPublications(selectedClass)
      .then(res => {
        const pubs = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
        setPublications(pubs);
        // Initialise pending from current state
        const init = {};
        pubs.forEach(p => { init[p.exam_type] = p.is_published; });
        setPending(init);
      })
      .catch(() => {})
      .finally(() => setLoadingPubs(false));
  }, [selectedClass]);

  const selectedClassName = classes.find(c => String(c.id) === String(selectedClass))?.name ?? '';

  // Which types have a change vs current saved state
  const changedTypes = publications.filter(p => pending[p.exam_type] !== p.is_published);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await Promise.all(
        changedTypes.map(p => examService.togglePublication(selectedClass, p.exam_type))
      );
      // Reload to reflect saved state
      const res = await examService.getPublications(selectedClass);
      const pubs = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      setPublications(pubs);
      const updated = {};
      pubs.forEach(p => { updated[p.exam_type] = p.is_published; });
      setPending(updated);
      setShowConfirm(false);
    } catch {
      setSaveError('Failed to save some changes. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-emerald-50/40">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Send size={18} className="text-emerald-600" /> Publish Results
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Class selector */}
          <div>
            <label className={labelCls}>Select Class</label>
            <select
              value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); setPending({}); setSaveError(''); }}
              className={inputCls}
            >
              <option value="">— Choose a class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name || String(c)}</option>)}
            </select>
          </div>

          {/* Exam type checkboxes */}
          {selectedClass && (
            loadingPubs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-emerald-500" size={26} />
              </div>
            ) : publications.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                No exam types found for this class. Create exams first.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  Check an exam type to publish all its results for <span className="font-semibold text-slate-600">{selectedClassName}</span>. Students and parents will be able to see published results.
                </p>
                {publications.map(pub => {
                  const isChecked = pending[pub.exam_type] ?? pub.is_published;
                  const changed = isChecked !== pub.is_published;
                  return (
                    <label key={pub.exam_type}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      } ${changed ? 'ring-2 ring-amber-300' : ''}`}>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{pub.exam_type_name}</p>
                        {isChecked && pub.published_at && !changed ? (
                          <p className="text-[10px] text-emerald-600 mt-0.5">
                            Published {new Date(pub.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {pub.published_by_name ? ` by ${pub.published_by_name}` : ''}
                          </p>
                        ) : changed ? (
                          <p className="text-[10px] text-amber-600 mt-0.5">Unsaved change</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 mt-0.5">Not published</p>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => setPending(p => ({ ...p, [pub.exam_type]: !isChecked }))}
                        className="w-4 h-4 rounded accent-emerald-600 cursor-pointer shrink-0"
                      />
                    </label>
                  );
                })}
              </div>
            )
          )}

          {saveError && (
            <p className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle size={14} /> {saveError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!selectedClass || changedTypes.length === 0 || loadingPubs}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            <CheckCircle size={14} /> Apply Changes
          </button>
        </div>
      </div>

      {/* Confirmation overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Send size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Publication</h3>
            </div>
            <p className="mb-3 text-sm text-slate-500">
              The following changes will be applied for <span className="font-semibold text-slate-700">{selectedClassName}</span>:
            </p>
            <ul className="mb-5 space-y-1.5">
              {changedTypes.map(p => (
                <li key={p.exam_type} className="flex items-center gap-2 text-sm">
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${pending[p.exam_type] ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span className="font-semibold text-slate-700">{p.exam_type_name}</span>
                  <span className="text-slate-400">→</span>
                  <span className={pending[p.exam_type] ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                    {pending[p.exam_type] ? 'Published' : 'Unpublished'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} disabled={saving}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
