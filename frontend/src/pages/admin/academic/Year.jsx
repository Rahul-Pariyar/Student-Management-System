import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
	AlertCircle,
	CalendarDays,
	Edit2,
	Loader2,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	X,
} from "lucide-react";
import api from "../../../services/api";

const academicYearSchema = yup.object({
	year: yup
		.string()
		.required("Academic year is required")
		.matches(/^\d{4}-\d{4}$/, "Use format YYYY-YYYY")
		.test("year-order", "Second year must be greater than first", (value) => {
			if (!value || !/^\d{4}-\d{4}$/.test(value)) return true;
			const [start, end] = value.split("-").map(Number);
			return end > start;
		}),
	start_date: yup.string().required("Start date is required"),
	end_date: yup
		.string()
		.required("End date is required")
		.test("end-after-start", "End date must be after start date", function (value) {
			const { start_date } = this.parent;
			if (!start_date || !value) return true;
			return new Date(value) > new Date(start_date);
		}),
	is_current: yup.boolean().default(false),
});

const inputBaseClass =
	"block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20";

const errorInputClass =
	"border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-200";

function normalizeList(data) {
	if (Array.isArray(data)) return data;
	if (data?.results && Array.isArray(data.results)) return data.results;
	return [];
}

function getErrorMessage(err, fallback = "Something went wrong") {
	const data = err?.response?.data;
	if (typeof data === "string") return data;
	if (data?.detail) return String(data.detail);
	if (data?.non_field_errors?.length) return data.non_field_errors.join(" ");
	return fallback;
}

export default function Year() {
	const [years, setYears] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [deletingId, setDeletingId] = useState(null);

	const [error, setError] = useState(null);
	const [successMsg, setSuccessMsg] = useState(null);

	const [searchText, setSearchText] = useState("");
	const [currentFilter, setCurrentFilter] = useState("all");

	const [isFormModalOpen, setIsFormModalOpen] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [selectedYear, setSelectedYear] = useState(null);

	const {
		register,
		handleSubmit,
		reset,
		setError: setFormError,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(academicYearSchema),
		defaultValues: {
			year: "",
			start_date: "",
			end_date: "",
			is_current: false,
		},
	});

	const fetchYears = useCallback(async () => {
		try {
			setLoading(true);
			const response = await api.get("/academic/academic-years/");
			setYears(normalizeList(response.data));
			setError(null);
		} catch (err) {
			setError(getErrorMessage(err, "Failed to fetch academic years."));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchYears();
	}, [fetchYears]);

	useEffect(() => {
		if (successMsg) {
			const timer = setTimeout(() => setSuccessMsg(null), 2800);
			return () => clearTimeout(timer);
		}
	}, [successMsg]);

	const applyBackendErrors = (errData) => {
		const fields = ["year", "start_date", "end_date", "is_current"];

		fields.forEach((field) => {
			if (errData?.[field]) {
				const msg = Array.isArray(errData[field])
					? errData[field].join(" ")
					: String(errData[field]);
				setFormError(field, { type: "server", message: msg });
			}
		});

		if (errData?.non_field_errors) {
			const msg = Array.isArray(errData.non_field_errors)
				? errData.non_field_errors.join(" ")
				: String(errData.non_field_errors);
			setFormError("root", { type: "server", message: msg });
		}

		if (errData?.detail) {
			setFormError("root", { type: "server", message: String(errData.detail) });
		}
	};

	const openCreateModal = () => {
		setIsEditMode(false);
		setSelectedYear(null);
		reset({
			year: "",
			start_date: "",
			end_date: "",
			is_current: false,
		});
		setIsFormModalOpen(true);
	};

	const openEditModal = (yearItem) => {
		setIsEditMode(true);
		setSelectedYear(yearItem);
		reset({
			year: yearItem.year || "",
			start_date: yearItem.start_date || "",
			end_date: yearItem.end_date || "",
			is_current: !!yearItem.is_current,
		});
		setIsFormModalOpen(true);
	};

	const closeFormModal = () => {
		setIsFormModalOpen(false);
		setIsEditMode(false);
		setSelectedYear(null);
	};

	const onSubmit = async (formData) => {
		try {
			setSaving(true);
			const payload = {
				year: formData.year.trim(),
				start_date: formData.start_date,
				end_date: formData.end_date,
				is_current: !!formData.is_current,
			};

			if (isEditMode && selectedYear) {
				await api.patch(`/academic/academic-years/${selectedYear.id}/`, payload);
				setSuccessMsg("Academic year updated successfully.");
			} else {
				await api.post("/academic/academic-years/", payload);
				setSuccessMsg("Academic year created successfully.");
			}

			closeFormModal();
			fetchYears();
		} catch (err) {
			if (err?.response?.data && typeof err.response.data === "object") {
				applyBackendErrors(err.response.data);
			} else {
				setFormError("root", {
					type: "server",
					message: getErrorMessage(err, "Failed to save academic year."),
				});
			}
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id) => {
		const approved = window.confirm("Are you sure you want to delete this academic year?");
		if (!approved) return;

		try {
			setDeletingId(id);
			await api.delete(`/academic/academic-years/${id}/`);
			setSuccessMsg("Academic year deleted successfully.");
			fetchYears();
		} catch (err) {
			setError(getErrorMessage(err, "Failed to delete academic year."));
		} finally {
			setDeletingId(null);
		}
	};

	const visibleYears = useMemo(() => {
		let result = years;

		if (currentFilter === "current") {
			result = result.filter((item) => item.is_current);
		}

		if (searchText.trim()) {
			const q = searchText.trim().toLowerCase();
			result = result.filter((item) => {
				const haystack = [item.year, item.start_date, item.end_date]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();
				return haystack.includes(q);
			});
		}

		return result;
	}, [years, currentFilter, searchText]);

	return (
		<div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
			<div className="mx-auto max-w-7xl">
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
							Academic Year Management
						</h1>
						<p className="mt-1 text-sm text-gray-500">
							Create and manage academic years and current session.
						</p>
					</div>
					<button
						onClick={openCreateModal}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
					>
						<Plus size={18} />
						<span>Create Year</span>
					</button>
				</div>

				{error && (
					<div className="mb-6 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
						<AlertCircle size={20} className="shrink-0" />
						<p className="text-sm font-medium">{error}</p>
						<button onClick={() => setError(null)} className="ml-auto">
							<X size={18} className="text-red-400 hover:text-red-500" />
						</button>
					</div>
				)}

				{successMsg && (
					<div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
						{successMsg}
					</div>
				)}

				<div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
					<div className="relative lg:col-span-8">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search className="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							placeholder="Search by year or date..."
							className="block w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							value={searchText}
							onChange={(e) => setSearchText(e.target.value)}
						/>
					</div>
					<div className="lg:col-span-4">
						<select
							className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							value={currentFilter}
							onChange={(e) => setCurrentFilter(e.target.value)}
						>
							<option value="all">All Years</option>
							<option value="current">Current Only</option>
						</select>
					</div>
				</div>

				<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-gray-200 bg-gray-50">
								<tr>
									<th className="px-6 py-4 font-semibold text-gray-900">Academic Year</th>
									<th className="hidden px-6 py-4 font-semibold text-gray-900 md:table-cell">Start Date</th>
									<th className="hidden px-6 py-4 font-semibold text-gray-900 lg:table-cell">End Date</th>
									<th className="px-6 py-4 font-semibold text-gray-900">Status</th>
									<th className="px-6 py-4 text-right font-semibold text-gray-900">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 bg-white">
								{loading ? (
									Array(5)
										.fill(0)
										.map((_, idx) => (
											<tr key={idx} className="animate-pulse">
												<td className="px-6 py-5"><div className="h-4 w-36 rounded bg-gray-200" /></td>
												<td className="hidden px-6 py-5 md:table-cell"><div className="h-4 w-28 rounded bg-gray-200" /></td>
												<td className="hidden px-6 py-5 lg:table-cell"><div className="h-4 w-28 rounded bg-gray-200" /></td>
												<td className="px-6 py-5"><div className="h-4 w-16 rounded bg-gray-200" /></td>
												<td className="px-6 py-5"><div className="ml-auto h-4 w-20 rounded bg-gray-200" /></td>
											</tr>
										))
								) : visibleYears.length > 0 ? (
									visibleYears.map((item) => (
										<tr key={item.id} className="group transition-colors hover:bg-gray-50/50">
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100">
														<CalendarDays size={16} />
													</div>
													<span className="font-semibold text-gray-900">{item.year || "N/A"}</span>
												</div>
											</td>
											<td className="hidden px-6 py-4 text-gray-700 md:table-cell">{item.start_date || "N/A"}</td>
											<td className="hidden px-6 py-4 text-gray-700 lg:table-cell">{item.end_date || "N/A"}</td>
											<td className="px-6 py-4">
												{item.is_current ? (
													<span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
														Current
													</span>
												) : (
													<span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
														Inactive
													</span>
												)}
											</td>
											<td className="px-6 py-4 text-right">
												<div className="flex items-center justify-end gap-2">
													<button
														onClick={() => openEditModal(item)}
														className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600"
														title="Edit Academic Year"
													>
														<Edit2 size={16} />
													</button>
													<button
														onClick={() => handleDelete(item.id)}
														disabled={deletingId === item.id}
														className="rounded-lg border border-gray-100 p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
														title="Delete Academic Year"
													>
														{deletingId === item.id ? (
															<Loader2 size={16} className="animate-spin" />
														) : (
															<Trash2 size={16} />
														)}
													</button>
												</div>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={5} className="py-12 text-center text-gray-500">
											<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
												<CalendarDays size={24} />
											</div>
											<h3 className="mt-2 text-sm font-semibold text-gray-900">No academic years found</h3>
											<p className="mt-1 text-sm text-gray-500">Try adjusting search/filter or create a year.</p>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				{isFormModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm sm:p-0">
						<div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-8">
							<div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
										{isEditMode ? <Edit2 size={20} /> : <Plus size={20} />}
									</div>
									<div>
										<h3 className="text-lg font-bold text-gray-900">
											{isEditMode ? "Edit Academic Year" : "Create Academic Year"}
										</h3>
										<p className="text-xs text-gray-500 text-left">Manage year boundaries and current session.</p>
									</div>
								</div>
								<button
									onClick={closeFormModal}
									className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
								>
									<X size={20} />
								</button>
							</div>

							<div className="max-h-[calc(90vh-140px)] overflow-y-auto px-6 py-8">
								<form id="academic-year-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
									{errors.root?.message && (
										<div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
											{errors.root.message}
										</div>
									)}

									<div className="rounded-xl bg-indigo-50/50 p-6 ring-1 ring-indigo-200 shadow-sm">
										<label className="mb-4 flex items-center gap-2 text-sm font-bold text-indigo-900">
											<CalendarDays size={16} /> Year Configuration
										</label>

										<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
											<div className="sm:col-span-2">
												<label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
													Academic Year
												</label>
												<input
													type="text"
													{...register("year")}
													className={`${inputBaseClass} ${errors.year ? errorInputClass : ""}`}
													placeholder="2025-2026"
												/>
												{errors.year && (
													<p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.year.message}</p>
												)}
											</div>

											<div>
												<label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
													Start Date
												</label>
												<input
													type="date"
													{...register("start_date")}
													className={`${inputBaseClass} ${errors.start_date ? errorInputClass : ""}`}
												/>
												{errors.start_date && (
													<p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.start_date.message}</p>
												)}
											</div>

											<div>
												<label className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wider text-gray-600">
													End Date
												</label>
												<input
													type="date"
													{...register("end_date")}
													className={`${inputBaseClass} ${errors.end_date ? errorInputClass : ""}`}
												/>
												{errors.end_date && (
													<p className="mt-1.5 text-left text-xs font-medium text-red-600">{errors.end_date.message}</p>
												)}
											</div>

											<div className="sm:col-span-2">
												<label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
													<input type="checkbox" {...register("is_current")} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
													<span className="text-sm font-medium text-gray-700">Mark as current academic year</span>
												</label>
											</div>
										</div>
									</div>
								</form>
							</div>

							<div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-8 py-5">
								<button
									type="button"
									onClick={closeFormModal}
									className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									form="academic-year-form"
									type="submit"
									disabled={saving}
									className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{saving ? (
										<>
											<RefreshCw size={16} className="animate-spin" />
											Saving...
										</>
									) : isEditMode ? (
										"Save Changes"
									) : (
										"Create Year"
									)}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}