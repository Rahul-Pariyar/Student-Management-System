import { useState, useEffect } from 'react';
import { examService } from '../../services';
import { Filter, List, Loader2, CalendarDays, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function Examinations() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examTypes, setExamTypes] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [filters, setFilters] = useState({ exam_type: '', subject: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchExams = async (page = 1, activeFilters = filters) => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (activeFilters.exam_type) params.exam_type = activeFilters.exam_type;
      if (activeFilters.subject) params.subject = activeFilters.subject;
      const res = await examService.listExams(params);
      const data = res.data;
      if (data?.results) {
        setExams(data.results);
        setTotalCount(data.count ?? 0);
      } else {
        setExams(data ?? []);
        setTotalCount((data ?? []).length);
      }
      // Build subject options from first page load
      if (page === 1 && !activeFilters.exam_type && !activeFilters.subject) {
        const subjectMap = new Map();
        (data?.results ?? data ?? []).forEach(e => subjectMap.set(e.subject, e.subject_name));
        setSubjectOptions([...subjectMap].map(([id, name]) => ({ id, name })));
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
      setError('Failed to load examination data.');
    } finally {
      setLoading(false);
    }
  };

  // Load exam types and exams on mount
  useEffect(() => {
    const init = async () => {
      try {
        const typesRes = await examService.listTypes();
        setExamTypes(typesRes.data?.results ?? typesRes.data ?? []);
      } catch (err) {
        console.error('Error fetching exam types:', err);
      }
      fetchExams(1);
    };
    init();
  }, []);

  const handleFilter = () => {
    setCurrentPage(1);
    fetchExams(1, filters);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchExams(page);
  };

  const handleFilterChange = (e) => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const getExamStatus = (exam) => {
    const today = new Date().toISOString().split('T')[0];
    if (exam.exam_date > today) return { label: 'Upcoming', color: 'bg-[#3B82F6]' };
    if (exam.exam_date === today) return { label: 'Today', color: 'bg-[#F59E0B]' };
    return { label: 'Completed', color: 'bg-[#10B981]' };
  };

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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Examinations</h1>
        </div>
        <p className="mt-1 text-slate-500 font-medium">View upcoming and past examination schedules</p>
      </header>

      {/* Filter Section */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-200/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Exam Type</label>
            <select
              name="exam_type"
              value={filters.exam_type}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Types</option>
              {examTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Subject</label>
            <select
              name="subject"
              value={filters.subject}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Subjects</option>
              {subjectOptions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleFilter}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-2.5 font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98]"
          >
            <Filter size={18} />
            Filter
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 p-5 font-bold text-slate-800 bg-slate-50/50">
          <List size={20} className="text-indigo-500" />
          <span>All Examinations</span>
          <span className="ml-auto text-xs font-medium text-slate-400">{totalCount} exam(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed min-w-[900px]">
            <thead className="bg-white text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <tr>
                <th className="w-[18%] px-5 py-4 whitespace-nowrap">Exam Name</th>
                <th className="w-[14%] px-5 py-4 whitespace-nowrap">Subject</th>
                <th className="w-[10%] px-5 py-4 whitespace-nowrap">Class</th>
                <th className="w-[13%] px-5 py-4 whitespace-nowrap">Date</th>
                <th className="w-[13%] px-5 py-4 whitespace-nowrap">Time</th>
                <th className="w-[11%] px-5 py-4 whitespace-nowrap text-center">Total Marks</th>
                <th className="w-[10%] px-5 py-4 whitespace-nowrap text-center">Pass Marks</th>
                <th className="w-[11%] px-5 py-4 whitespace-nowrap text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center">
                    <Loader2 className="mx-auto animate-spin text-indigo-500" size={32} />
                  </td>
                </tr>
              ) : exams.length > 0 ? (
                exams.map((exam) => {
                  const status = getExamStatus(exam);
                  return (
                    <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 truncate">{exam.name}</td>
                      <td className="px-5 py-4 text-slate-600 font-medium truncate">{exam.subject_name}</td>
                      <td className="px-5 py-4 text-slate-500 text-sm">{exam.class_name}</td>
                      <td className="px-5 py-4 text-slate-600 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={14} className="text-slate-400 shrink-0" />
                          {exam.exam_date}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          {exam.start_time?.slice(0, 5)} – {exam.end_time?.slice(0, 5)}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700 text-center">{exam.total_marks}</td>
                      <td className="px-5 py-4 text-slate-500 text-center">{exam.passing_marks}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex rounded-full ${status.color} px-4 py-1 text-[10px] font-black uppercase text-white tracking-wider`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400 font-medium">No examinations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-sm text-slate-500">
            Page {currentPage} of {totalPages} &mdash; {totalCount} total
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => handlePageChange(item)}
                    className={`min-w-[32px] rounded-lg border px-2 py-1 text-sm font-medium transition-colors ${
                      currentPage === item
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
