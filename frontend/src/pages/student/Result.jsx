import React, { useState, useEffect } from 'react';
import { examService, feeService } from '../../services';
import { 
  Menu, Filter, Lock, AlertTriangle, 
  Phone, Mail, List, Info, Loader2 
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

export default function ExamResults() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ gpa: '0.00', count: 0, avg: '0%', grade: '-' });
  const [unpaidFees, setUnpaidFees] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [types, setTypes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student fees to determine payment status
        const feesRes = await feeService.listStudentFees();
        const allFees = feesRes.data?.results ?? feesRes.data ?? [];
        const unpaid = allFees.filter(
          (f) => ['pending', 'partial', 'overdue'].includes(f.payment_status)
        );

        if (unpaid.length > 0) {
          // Student has unpaid fees — results are blocked
          setIsPaid(false);
          setUnpaidFees(unpaid);
        } else {
          // All fees paid — fetch results and exam types
          setIsPaid(true);
          const [resultsRes, typesRes] = await Promise.all([
            examService.listResults(),
            examService.listTypes(),
          ]);
          const resultData = resultsRes.data?.results ?? resultsRes.data ?? [];
          const typeData   = typesRes.data?.results   ?? typesRes.data   ?? [];
          setResults(resultData);
          setTypes(typeData);
          setStats(computeStats(resultData));
        }
      } catch (err) {
        console.error('Error fetching exam data', err);
        setError('Failed to load examination data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

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

  // Filter results by selected exam type
  const filteredResults = selectedExam
    ? results.filter((r) => String(r.exam_type) === selectedExam)
    : results;

  // Compute stats based on filtered results
  // const filteredStats = computeStats(filteredResults);
  const filteredStats = selectedExam ? computeStats(filteredResults) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 text-[#1E293B]">
          <h1 className="text-3xl font-bold tracking-tight">Exam Results</h1>
        </div>
        <p className="mt-1 text-slate-500 font-medium">View and manage examination results</p>
      </header>

      {isPaid ? (
        /* --- VIEW 1: USER HAS PAID (Accessible) --- */
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Top Filter Bar */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/60">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Exam</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="" disabled>--Select Exam Type--</option>
                  {types.map((t) => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
              </select>
              <button
                onClick={() => setSelectedExam('')}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
              >
                <Filter size={18} />
                Clear Filter
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* <ResultStatCard label="Current GPA" value={filteredStats.gpa} color="bg-[#10B981]" />
            <ResultStatCard label="Exams Taken" value={filteredStats.count} color="bg-[#06B6D4]" />
            <ResultStatCard label="Average Score" value={filteredStats.avg} color="bg-[#FBBF24]" />
            <ResultStatCard label="Overall Grade" value={filteredStats.grade} color="bg-[#3B82F6]" /> */}

          <ResultStatCard label="Current GPA" value={filteredStats?.gpa ?? '—'} color="bg-[#10B981]" />
          <ResultStatCard label="Exams Taken" value={filteredStats?.count ?? '—'} color="bg-[#06B6D4]" />
          <ResultStatCard label="Average Score" value={filteredStats?.avg ?? '—'} color="bg-[#FBBF24]" />
          <ResultStatCard label="Overall Grade" value={filteredStats?.grade ?? '—'} color="bg-[#3B82F6]" />
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 p-5 font-bold text-slate-800 bg-slate-50/50">
              <List size={20} className="text-indigo-500" />
              <span>All Examination Results</span>
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
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                        No results found{selectedExam ? ' for the selected exam' : ''}.
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
        /* --- VIEW 2: USER HAS NOT PAID (Restricted) --- */
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          {/* Warning Alert Card */}
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
                  You have unpaid fees totaling:{' '}
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
                          Rs. {Number(fee.balance_amount || 0).toLocaleString()}
                        </span>
                        <span className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase text-white ${
                          fee.payment_status === 'overdue' ? 'bg-black' : 'bg-orange-500'
                        }`}>
                          {fee.payment_status}
                        </span>
                      </div>
                      {fee.fee_structure_info?.due_date && (
                        <p className="text-xs font-bold text-red-800 ml-3">
                          Due Date: {fee.fee_structure_info.due_date}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-xl bg-yellow-100/60 p-4 flex gap-3 items-center border border-yellow-200">
                  <Info className="text-yellow-700 shrink-0" size={20} />
                  <p className="text-sm font-semibold text-yellow-800">
                    <span className="font-bold">Important:</span> Your exam results are currently hidden due to unpaid fees. Please clear all outstanding payments to view your results.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-6 text-sm font-bold text-red-800">
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    Contact Administration: <span className="font-medium">Visit the admin office to make a payment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    Or: <span className="font-medium">Contact your class teacher for assistance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Locked Results Placeholder */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
             <div className="flex items-center gap-2 border-b border-slate-100 p-4 font-bold text-slate-400 bg-slate-50/30">
                <Lock size={16} />
                <span>Results Locked</span>
             </div>
             <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                <div className="rounded-3xl bg-slate-100 p-8 mb-4">
                  <Lock size={64} />
                </div>
                <h3 className="text-3xl font-bold text-slate-400">Results are currently unavailable</h3>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for Exam Stats
function ResultStatCard({ label, value, color }) {
  return (
    <div className={`${color} rounded-2xl p-8 text-center text-white shadow-lg shadow-slate-200 transition-transform hover:scale-[1.02]`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest opacity-90">{label}</p>
    </div>
  );
}