import React, { useState, useEffect } from 'react';
import { examService, feeService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import {
  Filter, Lock, AlertTriangle,
  Phone, Mail, List, Info, Loader2, Users
} from 'lucide-react';

const GRADE_POINTS = {
  'A+': 4.0, 'A': 3.7, 'B+': 3.3, 'B': 3.0,
  'C+': 2.3, 'C': 2.0, 'D': 1.0, 'F': 0.0,
};

function computeStats(results) {
  if (!results.length) return { gpa: '0.00', count: 0, avg: '0%', grade: '-' };
  const count = results.length;
  const totalPct = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
  const avgPct = totalPct / count;
  const totalGp = results.reduce((sum, r) => sum + (GRADE_POINTS[r.grade] || 0), 0);
  const gpa = totalGp / count;
  let overallGrade = '-';
  if (avgPct >= 90) overallGrade = 'A+';
  else if (avgPct >= 80) overallGrade = 'A';
  else if (avgPct >= 70) overallGrade = 'B+';
  else if (avgPct >= 60) overallGrade = 'B';
  else if (avgPct >= 50) overallGrade = 'C+';
  else if (avgPct >= 40) overallGrade = 'C';
  else if (avgPct >= 30) overallGrade = 'D';
  else overallGrade = 'F';
  return { gpa: gpa.toFixed(2), count, avg: `${avgPct.toFixed(1)}%`, grade: overallGrade };
}

function ResultStatCard({ label, value, color }) {
  return (
    <div className={`${color} rounded-2xl p-5 text-white shadow-lg shadow-slate-200`}>
      <p className="text-xs font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

export default function ParentResult() {
  const { user } = useAuth();
  const children = user?.profile?.children || [];

  const [selectedChild, setSelectedChild] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ gpa: '0.00', count: 0, avg: '0%', grade: '-' });
  const [unpaidFees, setUnpaidFees] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState('');
  const [appliedExamType, setAppliedExamType] = useState('');
  const [examTypes, setExamTypes] = useState([]);

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(String(children[0].id));
    }
  }, [children]);

  // Fetch results when child changes
  useEffect(() => {
    if (!selectedChild) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSelectedExamType('');
      setAppliedExamType('');
      try {
        // Check fees for this child
        const feesRes = await feeService.listStudentFees({ student: selectedChild });
        const allFees = feesRes.data?.results ?? feesRes.data ?? [];
        const unpaid = allFees.filter(
          (f) => ['pending', 'partial', 'overdue'].includes(f.payment_status)
        );

        if (unpaid.length > 0) {
          setIsPaid(false);
          setUnpaidFees(unpaid);
          setResults([]);
          setStats(computeStats([]));
        } else {
          setIsPaid(true);
          setUnpaidFees([]);
          const [resultsRes, typesRes] = await Promise.all([
            examService.listResults({ student: selectedChild }),
            examService.listTypes(),
          ]);
          const resultData = resultsRes.data?.results ?? resultsRes.data ?? [];
          const typeData = typesRes.data?.results ?? typesRes.data ?? [];
          setResults(resultData);
          setExamTypes(typeData);
          setStats(computeStats(resultData));
        }
      } catch (err) {
        console.error('Error fetching result data', err);
        setError('Failed to load result data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedChild]);

  const selectedChildObj = children.find(c => String(c.id) === selectedChild);
  const childName = selectedChildObj?.user?.first_name || 'Child';

  // Filter results by applied exam type (only after Filter button is clicked)
  const filteredResults = appliedExamType
    ? results.filter((r) => String(r.exam_type) === appliedExamType)
    : results;

  // Show stats only when a filter has been applied, otherwise show dashes
  const filteredStats = appliedExamType
    ? computeStats(filteredResults)
    : { gpa: '-', count: '-', avg: '-', grade: '-' };

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-red-400 mb-3" size={40} />
          <p className="text-slate-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-2 md:p-4">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Exam Results</h1>
        <p className="mt-1 text-slate-500 font-medium">View your child's examination results</p>
      </header>

      {/* Child Selector */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-200/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-1"><Users size={14} /> Select Child</span>
            </label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>
                  {c.user?.full_name || c.student_id || `Child #${c.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      ) : isPaid ? (
        <div className="space-y-6">
          {/* Exam Type Filter */}
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/60">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Exam Type</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="" disabled>-- Select Exam Type --</option>
                {examTypes.map((t) => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={() => setAppliedExamType(selectedExamType)}
                disabled={!selectedExamType}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Filter size={18} />
                Filter
              </button>
              <button
                onClick={() => { setSelectedExamType(''); setAppliedExamType(''); }}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ResultStatCard label="Current GPA" value={filteredStats.gpa} color="bg-[#10B981]" />
            <ResultStatCard label="Exams Taken" value={filteredStats.count} color="bg-[#06B6D4]" />
            <ResultStatCard label="Average Score" value={filteredStats.avg} color="bg-[#FBBF24]" />
            <ResultStatCard label="Overall Grade" value={filteredStats.grade} color="bg-[#3B82F6]" />
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 p-5 font-bold text-slate-800 bg-slate-50/50">
              <List size={20} className="text-indigo-500" />
              <span>{childName}'s Results</span>
              <span className="ml-auto text-xs font-medium text-slate-400">{filteredResults.length} result(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[850px]">
                <thead className="bg-white text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 whitespace-nowrap">Exam</th>
                    <th className="px-4 py-4 whitespace-nowrap">Subject</th>
                    <th className="px-4 py-4 whitespace-nowrap">Date</th>
                    <th className="px-4 py-4 whitespace-nowrap text-center">Marks</th>
                    <th className="px-4 py-4 whitespace-nowrap text-center">Total</th>
                    <th className="px-4 py-4 whitespace-nowrap">Percentage</th>
                    <th className="px-4 py-4 whitespace-nowrap text-center">Grade</th>
                    <th className="px-4 py-4 whitespace-nowrap text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-medium">
                        No results found{appliedExamType ? ' for the selected exam type' : ''}.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                        <td className="px-4 py-4 font-medium text-slate-700 whitespace-nowrap">{row.exam_name}</td>
                        <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{row.subject_name}</td>
                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{row.exam_date}</td>
                        <td className="px-4 py-4 font-bold text-center">{row.marks_obtained}</td>
                        <td className="px-4 py-4 text-slate-500 text-center">{row.total_marks}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${row.percentage < 60 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                              {row.percentage}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-300" style={{ width: `${Math.min(row.percentage, 100)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-black text-white">
                            {row.grade}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase text-white ${row.is_passed ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {row.is_passed ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* --- Unpaid Fees - Restricted View --- */
        <div className="space-y-6">
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 md:p-8">
            <div className="flex items-start gap-5">
              <div className="rounded-xl bg-red-800 p-3 text-white">
                <Lock size={32} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle size={20} />
                  <h2 className="text-2xl font-bold">Results Access Restricted</h2>
                </div>
                <p className="mt-2 text-lg font-semibold text-red-900">
                  {childName} has unpaid fees totaling:{' '}
                  <span className="font-black text-red-700">
                    Rs. {unpaidFees.reduce((sum, f) => sum + Number(f.balance_amount || 0), 0).toLocaleString()}
                  </span>
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-2 text-red-800/80 font-bold text-sm">
                    <List size={16} />
                    OUTSTANDING FEES:
                  </div>
                  {unpaidFees.map((fee) => (
                    <div key={fee.id} className="space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-bold text-red-800">
                          • {fee.fee_structure_info?.class_name || 'Fee'} — {fee.fee_structure_info?.description || fee.fee_structure_info?.academic_year_label || ''}
                        </span>
                        <span className="rounded-full bg-red-600 px-4 py-1 text-xs font-black text-white">
                          {fee.payment_status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-red-700">
                        Balance: <span className="font-bold">Rs. {Number(fee.balance_amount || 0).toLocaleString()}</span>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-xl bg-white/60 p-5 text-sm text-slate-700">
                  <div className="mb-2 flex items-center gap-2 font-bold">
                    <Info size={16} className="text-red-600" />
                    How to access results:
                  </div>
                  <p className="text-slate-500">
                    Please clear the outstanding fees at the school's fee counter. Once payment is confirmed, results will be available automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
