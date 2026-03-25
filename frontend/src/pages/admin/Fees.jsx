import React, { useState, useEffect, useMemo } from 'react';
import { feeService, academicService } from '../../services';
import {
  Wallet, PlusCircle, CreditCard, Edit2, Trash2, X, Loader2,
  Filter, Receipt, Settings2, Search, CheckCircle2, AlertCircle,
  Clock, Ban, DollarSign, Users, Tag,
} from 'lucide-react';

const unwrap = (d) => (Array.isArray(d) ? d : d?.results ?? []);
const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition';
const labelCls = 'block text-sm font-semibold text-slate-600 mb-1.5';

const STATUS_CFG = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700',    icon: Clock },
  pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-600',    icon: Clock },
  overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700',        icon: AlertCircle },
  waived:  { label: 'Waived',  cls: 'bg-purple-100 text-purple-700',  icon: Ban },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${cfg.cls}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

function SummaryCard({ label, value, color, icon: Icon }) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-sm ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{label}</p>
        <div className="rounded-xl bg-white/20 p-2"><Icon size={16} /></div>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

export default function FeeManagement() {
  const [activeTab, setActiveTab] = useState('payments');
  const [studentFees, setStudentFees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [categories, setCategories] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        feeService.listStudentFees(),
        feeService.listStructures(),
        feeService.listCategories(),
        academicService.listClasses(),
        academicService.listAcademicYears(),
        feeService.getFeeSummary(),
      ]);
      if (results[0].status === 'fulfilled') setStudentFees(unwrap(results[0].value.data));
      if (results[1].status === 'fulfilled') setStructures(unwrap(results[1].value.data));
      if (results[2].status === 'fulfilled') setCategories(unwrap(results[2].value.data));
      if (results[3].status === 'fulfilled') setClasses(unwrap(results[3].value.data));
      if (results[4].status === 'fulfilled') setAcademicYears(unwrap(results[4].value.data));
      if (results[5].status === 'fulfilled') setSummary(results[5].value.data);
    } catch (err) {
      console.error('Failed to load fee data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  );

  const tabs = [
    { id: 'payments',   label: 'Fee Payments',   icon: <Receipt size={16} /> },
    { id: 'structure',  label: 'Fee Structure',   icon: <Settings2 size={16} /> },
    { id: 'categories', label: 'Fee Categories',  icon: <Tag size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
          <span className="rounded-full bg-emerald-600 p-2 text-white"><Wallet size={20} /></span>
          Fee Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage fee categories, structures and student payments.</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <SummaryCard label="Total Due"        value={`Rs. ${Number(summary.total_due).toLocaleString()}`}        color="bg-slate-700"  icon={DollarSign} />
          <SummaryCard label="Collected"        value={`Rs. ${Number(summary.total_collected).toLocaleString()}`}  color="bg-emerald-600" icon={CheckCircle2} />
          <SummaryCard label="Outstanding"      value={`Rs. ${Number(summary.total_outstanding).toLocaleString()}`} color="bg-red-500"    icon={AlertCircle} />
          <SummaryCard label="Pending Students" value={summary.pending_count}                                       color="bg-amber-500"  icon={Users} />
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 px-6 py-3.5 text-sm font-bold transition-all relative ${
              activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}>
            {tab.icon} {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'payments' && (
          <PaymentsTab studentFees={studentFees} refresh={loadAll} />
        )}
        {activeTab === 'structure' && (
          <StructureTab structures={structures} categories={categories} classes={classes} academicYears={academicYears} refresh={loadAll} />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab categories={categories} refresh={loadAll} />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CATEGORIES TAB
══════════════════════════════════════════════════════ */
function CategoriesTab({ categories, refresh }) {
  const emptyForm = { name: '', description: '', is_optional: false };
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editId) await feeService.updateCategory(editId, form);
      else await feeService.createCategory(form);
      setForm(emptyForm); setEditId(null);
      refresh();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleEdit = (cat) => {
    setEditId(cat.id);
    setForm({ name: cat.name, description: cat.description, is_optional: cat.is_optional });
  };

  const handleDelete = async (id) => {
    try { await feeService.deleteCategory(id); refresh(); }
    catch (err) {
      alert(err.response?.data?.detail ?? 'Cannot delete: this category may be in use.');
    }
    setDeleteId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Tag size={16} className="text-emerald-500" />
            {editId ? 'Edit Category' : 'New Fee Category'}
          </h3>
          {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
          <div>
            <label className={labelCls}>Name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className={inputCls} placeholder="e.g. Tuition, Lab, Hostel" required />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              className={inputCls} rows={2} placeholder="Optional description..." />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_optional}
              onChange={e => setForm(f => ({...f, is_optional: e.target.checked}))}
              className="w-4 h-4 rounded accent-emerald-600" />
            <span className="text-sm text-slate-600 font-medium">Optional (student can opt out)</span>
          </label>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition disabled:opacity-60">
              {saving ? <Loader2 className="mx-auto animate-spin" size={16} /> : editId ? 'Update' : 'Add Category'}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm(emptyForm); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {categories.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No categories yet. Add one to get started.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800">{cat.name}</p>
                      {cat.is_optional && (
                        <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded font-bold uppercase">Optional</span>
                      )}
                      {!cat.is_active && (
                        <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded font-bold uppercase">Inactive</span>
                      )}
                    </div>
                    {cat.description && <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(cat)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setDeleteId(cat.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteId && (
        <ConfirmModal
          message="Delete this fee category? It cannot be deleted if it's used in a fee structure."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   STRUCTURE TAB
══════════════════════════════════════════════════════ */
function StructureTab({ structures, categories, classes, academicYears, refresh }) {
  const emptyMeta = {
    class_assigned: '', academic_year: '', frequency: 'semester',
    due_date: '', late_fee_amount: '', late_fee_applicable_after_days: 7, description: '',
  };
  const [meta, setMeta] = useState(emptyMeta);
  // { [categoryId]: amountString }  — mirrors internalMarks pattern
  const [amounts, setAmounts] = useState({});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [filterClass, setFilterClass] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const activeCategories = categories.filter(c => c.is_active);
  const filtered = filterClass ? structures.filter(s => String(s.class_assigned) === filterClass) : structures;

  const handleChange = e => setMeta(f => ({ ...f, [e.target.name]: e.target.value }));
  const setAmount = (catId, val) => setAmounts(p => ({ ...p, [catId]: val }));

  const totalFee = activeCategories.reduce((s, c) => s + (parseFloat(amounts[c.id]) || 0), 0);

  const handleEdit = (s) => {
    setEditId(s.id);
    setMeta({
      class_assigned: s.class_assigned,
      academic_year: s.academic_year,
      frequency: s.frequency,
      due_date: s.due_date,
      late_fee_amount: s.late_fee_amount,
      late_fee_applicable_after_days: s.late_fee_applicable_after_days,
      description: s.description ?? '',
    });
    const map = {};
    (s.components || []).forEach(c => { map[c.category] = String(c.amount); });
    setAmounts(map);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const components = activeCategories
      .filter(c => parseFloat(amounts[c.id]) > 0)
      .map(c => ({ category: c.id, amount: parseFloat(amounts[c.id]) }));
    if (components.length === 0) { setError('Enter an amount for at least one fee component.'); return; }

    const duplicate = structures.find(s =>
      String(s.class_assigned) === String(meta.class_assigned) &&
      String(s.academic_year) === String(meta.academic_year) &&
      s.frequency === meta.frequency &&
      s.id !== editId
    );
    if (duplicate) {
      setError(`A fee structure for this class, academic year, and frequency already exists (${duplicate.class_name} · ${duplicate.frequency}).`);
      return;
    }
    setError('');
    const payload = {
      ...meta,
      late_fee_amount: parseFloat(meta.late_fee_amount) || 0,
      late_fee_applicable_after_days: parseInt(meta.late_fee_applicable_after_days) || 7,
      components,
    };
    setPendingPayload(payload);
    setShowConfirm(true);
  };

  const handleConfirmedSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      if (editId) await feeService.updateStructure(editId, pendingPayload);
      else await feeService.createStructure(pendingPayload);
      setMeta(emptyMeta); setAmounts({}); setEditId(null);
      refresh();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await feeService.deleteStructure(id); refresh(); } catch { /* ignore */ }
    setDeleteId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <PlusCircle size={16} className="text-emerald-500" />
            {editId ? 'Edit Structure' : 'New Fee Structure'}
          </h3>
          {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Class <span className="text-red-400">*</span></label>
              <select name="class_assigned" value={meta.class_assigned} onChange={handleChange} className={inputCls} required>
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name || `${c.course_name} Y${c.year} S${c.semester} ${c.section}`}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Academic Year <span className="text-red-400">*</span></label>
              <select name="academic_year" value={meta.academic_year} onChange={handleChange} className={inputCls} required>
                <option value="">Select year</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.year}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Frequency <span className="text-red-400">*</span></label>
              <select name="frequency" value={meta.frequency} onChange={handleChange} className={inputCls} required>
                {[['monthly','Monthly'],['quarterly','Quarterly'],['semester','Semester'],['annual','Annual']].map(([k,v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Due Date <span className="text-red-400">*</span></label>
              <input type="date" name="due_date" value={meta.due_date} onChange={handleChange} className={inputCls} required />
            </div>
          </div>

          {/* Fee components — one labeled input per category, same pattern as internal marks */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Fee Components (Rs.)</p>
            {activeCategories.length === 0 ? (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 text-center">
                No categories defined. Add some in the Fee Categories tab first.
              </p>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap gap-4">
                  {activeCategories.map(cat => (
                    <div key={cat.id} className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 whitespace-nowrap">
                        {cat.name}{cat.is_optional ? ' (opt)' : ''}
                      </span>
                      <input
                        type="number" min="0" step="0.01"
                        value={amounts[cat.id] ?? ''}
                        onChange={e => setAmount(cat.id, e.target.value)}
                        placeholder="—"
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                      />
                    </div>
                  ))}
                </div>
                {totalFee > 0 && (
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-xs font-bold text-slate-500">Total</span>
                    <span className="text-sm font-black text-emerald-700">Rs. {totalFee.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Late Fee (Rs.)</label>
              <input type="number" name="late_fee_amount" value={meta.late_fee_amount} onChange={handleChange} className={inputCls} placeholder="0" min="0" />
            </div>
            <div>
              <label className={labelCls}>Grace Days</label>
              <input type="number" name="late_fee_applicable_after_days" value={meta.late_fee_applicable_after_days} onChange={handleChange} className={inputCls} min="0" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea name="description" value={meta.description} onChange={handleChange} className={inputCls} rows={2} placeholder="Optional notes..." />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition disabled:opacity-60">
              {saving ? <Loader2 className="mx-auto animate-spin" size={16} /> : editId ? 'Update' : 'Create Structure'}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setMeta(emptyMeta); setAmounts({}); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="lg:col-span-3 space-y-3">
        <div className="flex items-center gap-3">
          <select className={`${inputCls} max-w-xs`} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name || `Y${c.year} S${c.semester} ${c.section}`}</option>)}
          </select>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} structure(s)</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No fee structures found.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map(s => (
                <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 truncate">{s.class_name}</p>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{s.frequency}</span>
                        {!s.is_active && <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded font-bold">Inactive</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{s.academic_year_label} · Due: {s.due_date}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(s.components || []).map(comp => (
                          <span key={comp.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {comp.category_name}: Rs.{Number(comp.amount).toLocaleString()}
                            {comp.is_optional && <span className="text-slate-400 ml-1">(opt)</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-700">Rs. {Number(s.total_fee).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400">Total</p>
                      </div>
                      <button onClick={() => handleEdit(s)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDeleteId(s.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteId && (
        <ConfirmModal
          message="Delete this fee structure? This cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {showConfirm && pendingPayload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {editId ? 'Confirm Update' : 'Confirm Fee Structure'}
              </h3>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-1.5 text-slate-600">
              <p><span className="font-semibold text-slate-700">Class:</span> {classes.find(c => String(c.id) === String(pendingPayload.class_assigned))?.name ?? pendingPayload.class_assigned}</p>
              <p><span className="font-semibold text-slate-700">Year:</span> {academicYears.find(y => String(y.id) === String(pendingPayload.academic_year))?.year ?? pendingPayload.academic_year}</p>
              <p><span className="font-semibold text-slate-700">Frequency:</span> <span className="capitalize">{pendingPayload.frequency}</span></p>
              <p><span className="font-semibold text-slate-700">Due Date:</span> {pendingPayload.due_date}</p>
              <div className="pt-1 flex flex-wrap gap-1.5">
                {pendingPayload.components.map(comp => {
                  const cat = categories.find(c => c.id === comp.category);
                  return (
                    <span key={comp.category} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                      {cat?.name ?? comp.category}: Rs.{Number(comp.amount).toLocaleString()}
                    </span>
                  );
                })}
              </div>
              <p className="pt-1 font-bold text-slate-800">
                Total: Rs.{pendingPayload.components.reduce((s, c) => s + c.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50">
                Back
              </button>
              <button onClick={handleConfirmedSave}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700">
                {editId ? 'Confirm Update' : 'Confirm & Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PAYMENTS TAB
══════════════════════════════════════════════════════ */
function PaymentsTab({ studentFees, refresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [waiverModal, setWaiverModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return studentFees.filter(sf => {
      const matchSearch = !search || sf.student_name?.toLowerCase().includes(q) || String(sf.student).includes(q);
      const matchStatus = !statusFilter || sf.payment_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [studentFees, search, statusFilter]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input className={`${inputCls} pl-9`} placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select className={`${inputCls} w-40`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-400 font-medium ml-auto">{filtered.length} record(s)</span>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[700px]">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-5 py-4">Student</th>
              <th className="px-5 py-4">Class / Freq</th>
              <th className="px-5 py-4 text-right">Due</th>
              <th className="px-5 py-4 text-right">Paid</th>
              <th className="px-5 py-4 text-right">Balance</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Receipt className="mx-auto text-slate-200 mb-3" size={40} />
                  <p className="text-slate-400 font-medium">
                    {studentFees.length === 0 ? 'No fee records found.' : 'No records match the current filters.'}
                  </p>
                </td>
              </tr>
            ) : filtered.map(sf => (
              <React.Fragment key={sf.id}>
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800">{sf.student_name}</p>
                    <p className="text-xs text-slate-400">ID: {sf.student}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-xs">
                    <p>{sf.fee_structure_info?.class_name ?? '-'}</p>
                    <p className="capitalize text-slate-400">{sf.fee_structure_info?.frequency ?? '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-700">Rs. {Number(sf.amount_due).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right text-emerald-600 font-bold">Rs. {Number(sf.amount_paid).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right text-red-500 font-medium">Rs. {Number(sf.balance_amount).toLocaleString()}</td>
                  <td className="px-5 py-4"><StatusBadge status={sf.payment_status} /></td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setExpandedId(expandedId === sf.id ? null : sf.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition text-xs font-bold">
                        History
                      </button>
                      {sf.payment_status !== 'paid' && sf.payment_status !== 'waived' && (
                        <>
                          <button onClick={() => setPayModal(sf)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Collect Payment">
                            <CreditCard size={15} />
                          </button>
                          <button onClick={() => setWaiverModal(sf)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition" title="Apply Waiver">
                            <Ban size={15} />
                          </button>
                        </>
                      )}
                      <button onClick={() => setEditModal(sf)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDeleteId(sf.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === sf.id && (
                  <tr>
                    <td colSpan={7} className="bg-slate-50/80 px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Payment History</p>
                      {sf.payments?.length > 0 ? (
                        <div className="space-y-2">
                          {sf.payments.map(p => (
                            <div key={p.id} className="flex flex-wrap items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-slate-100 text-sm">
                              <span className="font-bold text-slate-700">Rs. {Number(p.amount).toLocaleString()}</span>
                              <span className="text-slate-500 capitalize">{p.payment_method?.replace('_', ' ')}</span>
                              <span className="text-slate-400 text-xs">{p.payment_date}</span>
                              <span className="text-xs font-mono text-slate-400">{p.receipt_number}</span>
                              {p.collected_by_name && <span className="text-xs text-slate-400">by {p.collected_by_name}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No payments recorded yet.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {payModal && <CollectPaymentModal sf={payModal} onClose={() => setPayModal(null)} refresh={refresh} />}
      {waiverModal && <WaiverModal sf={waiverModal} onClose={() => setWaiverModal(null)} refresh={refresh} />}
      {editModal && <EditStudentFeeModal sf={editModal} onClose={() => setEditModal(null)} refresh={refresh} />}
      {deleteId && (
        <ConfirmModal
          message="Delete this student fee record? This cannot be undone."
          onConfirm={async () => {
            try { await feeService.deleteStudentFee(deleteId); refresh(); }
            catch (err) { alert(err.response?.status === 405 ? 'Delete not supported.' : 'Failed to delete.'); }
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MODAL: EDIT STUDENT FEE
══════════════════════════════════════════════════════ */
function EditStudentFeeModal({ sf, onClose, refresh }) {
  const [form, setForm] = useState({ amount_due: sf.amount_due, payment_status: sf.payment_status, remarks: sf.remarks ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await feeService.updateStudentFee(sf.id, { amount_due: parseFloat(form.amount_due), payment_status: form.payment_status, remarks: form.remarks });
      refresh(); onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to update.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-blue-50/40">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Edit2 className="text-blue-600" size={18} /> Edit Fee Record</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 text-sm">
            <p className="font-bold text-slate-800">{sf.student_name}</p>
            <p className="text-slate-500 text-xs">{sf.fee_structure_info?.class_name} · {sf.fee_structure_info?.frequency}</p>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
          <div>
            <label className={labelCls}>Amount Due (Rs.) <span className="text-red-400">*</span></label>
            <input type="number" value={form.amount_due} onChange={e => setForm(f => ({...f, amount_due: e.target.value}))} className={inputCls} min="0" step="0.01" required />
          </div>
          <div>
            <label className={labelCls}>Override Status</label>
            <select value={form.payment_status} onChange={e => setForm(f => ({...f, payment_status: e.target.value}))} className={inputCls}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea value={form.remarks} onChange={e => setForm(f => ({...f, remarks: e.target.value}))} className={inputCls} rows={2} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-60">
              {saving ? <Loader2 className="mx-auto animate-spin" size={16} /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MODAL: COLLECT PAYMENT
══════════════════════════════════════════════════════ */
function CollectPaymentModal({ sf, onClose, refresh }) {
  const [form, setForm] = useState({ amount: '', payment_method: 'cash', transaction_id: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await feeService.makePayment({ student_fee_id: sf.id, amount: parseFloat(form.amount), payment_method: form.payment_method, transaction_id: form.transaction_id, remarks: form.remarks });
      refresh(); onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Payment failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50/40">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><CreditCard className="text-emerald-600" size={18} /> Collect Payment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
            <p className="font-bold text-slate-800">{sf.student_name}</p>
            <p className="text-slate-500">{sf.fee_structure_info?.class_name} · {sf.fee_structure_info?.frequency}</p>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-slate-500">Due: <strong className="text-slate-700">Rs. {Number(sf.amount_due).toLocaleString()}</strong></span>
              <span className="text-slate-500">Paid: <strong className="text-emerald-600">Rs. {Number(sf.amount_paid).toLocaleString()}</strong></span>
              <span className="text-slate-500">Balance: <strong className="text-red-500">Rs. {Number(sf.balance_amount).toLocaleString()}</strong></span>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
          <div>
            <label className={labelCls}>Amount (Rs.) <span className="text-red-400">*</span></label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} className={inputCls} placeholder="Enter amount" min="1" max={sf.balance_amount} required />
          </div>
          <div>
            <label className={labelCls}>Payment Method <span className="text-red-400">*</span></label>
            <select value={form.payment_method} onChange={e => setForm(f => ({...f, payment_method: e.target.value}))} className={inputCls}>
              {[['cash','Cash'],['bank_transfer','Bank Transfer'],['online','Online'],['cheque','Cheque'],['card','Card']].map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Transaction ID</label>
            <input value={form.transaction_id} onChange={e => setForm(f => ({...f, transaction_id: e.target.value}))} className={inputCls} placeholder="Optional" />
          </div>
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea value={form.remarks} onChange={e => setForm(f => ({...f, remarks: e.target.value}))} className={inputCls} rows={2} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-60">
              {saving ? <Loader2 className="mx-auto animate-spin" size={16} /> : 'Submit Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MODAL: WAIVER
══════════════════════════════════════════════════════ */
function WaiverModal({ sf, onClose, refresh }) {
  const [form, setForm] = useState({ waiver_type: 'scholarship', amount: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isLocked = sf.payment_status === 'paid' || sf.payment_status === 'waived';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await feeService.createWaiver({ student_fee: sf.id, ...form, amount: parseFloat(form.amount) });
      refresh(); onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to apply waiver.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {isLocked ? (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center"><Ban className="text-purple-400" size={22} /></div>
            <p className="text-sm font-semibold text-slate-700">Waiver cannot be applied to a <span className="capitalize font-black">{sf.payment_status}</span> record.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50">Close</button>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-purple-50/40">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Ban className="text-purple-500" size={18} /> Apply Waiver</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <p className="font-bold text-slate-800">{sf.student_name}</p>
                <p className="text-slate-500 text-xs">Balance: Rs. {Number(sf.balance_amount).toLocaleString()}</p>
              </div>
              {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
              <div>
                <label className={labelCls}>Waiver Type</label>
                <select value={form.waiver_type} onChange={e => setForm(f => ({...f, waiver_type: e.target.value}))} className={inputCls}>
                  {[['scholarship','Scholarship'],['financial_aid','Financial Aid'],['merit','Merit Based'],['sibling','Sibling Discount'],['other','Other']].map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Amount (Rs.) <span className="text-red-400">*</span></label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} className={inputCls} placeholder="0" min="1" max={sf.balance_amount} required />
              </div>
              <div>
                <label className={labelCls}>Reason <span className="text-red-400">*</span></label>
                <textarea value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} className={inputCls} rows={3} required />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-60">
                  {saving ? <Loader2 className="mx-auto animate-spin" size={16} /> : 'Apply Waiver'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MODAL: CONFIRM DELETE
══════════════════════════════════════════════════════ */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="text-red-500" size={22} /></div>
        <p className="text-sm font-semibold text-slate-700">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}
