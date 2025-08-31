
"use client";

import React, { useEffect, useState } from "react";
import { reportsAPI, HazardReport, HazardReportData } from "../../lib/api";
import { useRouter } from "next/navigation";
import UpdateReportModal from "@/Components/UpdateReportModal";
import DeleteReportModal from "@/Components/DeleteReportModal";
import Header  from "@/Components/layout/Header";
import { Snackbar, SnackbarStack } from '@/Components/Snackbar';

const ReportsHistoryPage = () => {
	const router = useRouter();

	// Helper function to calculate time ago
	const getTimeAgo = (dateString: string) => {
		const now = new Date();
		const past = new Date(dateString);
		const diffInMs = now.getTime() - past.getTime();
		
		const seconds = Math.floor(diffInMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		const weeks = Math.floor(days / 7);
		const months = Math.floor(days / 30);
		const years = Math.floor(days / 365);

		if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
		if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
		if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
		if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
		if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
		if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
		if (seconds > 0) return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
		return 'Just now';
	};
	const [reports, setReports] = useState<HazardReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
	// Track expanded descriptions to improve UX for long text
	const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
	const [updateLoading, setUpdateLoading] = useState(false);
	const [showUpdateModal, setShowUpdateModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
		open: false,
		message: "",
		type: 'success'
	});
	const [updateForm, setUpdateForm] = useState<Partial<HazardReportData>>({
		title: "",
		description: "",
		hazard_type: 'pothole',
		severity_level: 'medium'
	});

	const fetchReports = async () => {
		try {
			const response = await reportsAPI.getUserReports();
			console.log('API Response:', response); // Debug log
			console.log('Reports array:', response.reports); // Debug log
			setReports(response.reports || []); // Ensure it's an array
		} catch (err: unknown) {
			console.error('Fetch error:', err); // Debug log
			const error = err as { message?: string }
			setError(error?.message || "Failed to fetch reports.");
		}
	};

	useEffect(() => {
		const loadReports = async () => {
			setLoading(true);
			await fetchReports();
			setLoading(false);
		};
		loadReports();
	}, []);

	const showSnackbar = (message: string, type: 'success' | 'error' = 'success') => {
		setSnackbar({ open: true, message, type });
	};

	const handleUpdateFormChange = (field: keyof HazardReportData, value: string) => {
		setUpdateForm(prev => ({
			...prev,
			[field]: value
		}));
	};

	const handleUpdate = (report: HazardReport) => {
		setSelectedReport(report);
		setUpdateForm({
			title: report.title,
			description: report.description || "",
			hazard_type: report.hazard_type,
			severity_level: report.severity_level
		});
		setShowUpdateModal(true);
	};

	const handleUpdateSubmit = async () => {
		if (!selectedReport) return;

		setUpdateLoading(true);
		try {
			await reportsAPI.updateReport(selectedReport.id, updateForm);
			
			// Refetch all reports to get the latest data from server
			await fetchReports();
			
			setShowUpdateModal(false);
			setSelectedReport(null);
			// Reset form
			setUpdateForm({
				title: "",
				description: "",
				hazard_type: 'pothole',
				severity_level: 'medium'
			});
			showSnackbar("Report updated successfully!");
		} catch (err: unknown) {
			const error = err as { message?: string }
			showSnackbar(error?.message || "Failed to update report", 'error');
		} finally {
			setUpdateLoading(false);
		}
	};

	const handleDeleteClick = (report: HazardReport) => {
		setSelectedReport(report);
		setShowDeleteModal(true);
	};

	const handleDelete = async () => {
		if (!selectedReport) {
			return;
		}

		setDeleteLoading(selectedReport.id);
		try {
			await reportsAPI.deleteReport(selectedReport.id);
			
			// Refetch all reports to get the latest data from server
			await fetchReports();
			
			setShowDeleteModal(false);
			setSelectedReport(null);
			showSnackbar("Report deleted successfully!");
		} catch (err: unknown) {
			const error = err as { message?: string }
			showSnackbar(error?.message || "Failed to delete report", 'error');
		} finally {
			setDeleteLoading(null);
		}
	};

	// Color helpers
	const getTypeClasses = (type: string) => {
		const key = type?.toLowerCase();
		if (key.includes('accident')) return 'bg-red-600/90 text-white';
		if (key.includes('pothole')) return 'bg-yellow-400/90 text-black';
		if (key.includes('natural') || key.includes('disaster')) return 'bg-green-600/90 text-white';
		if (key.includes('construct')) return 'bg-amber-900/80 text-amber-50';
		return 'bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 text-white';
	};

	const getSeverityClasses = (level: string) => {
		const key = level?.toLowerCase();
		if (key === 'high' || key === 'high risk') return 'bg-red-600/90 text-white';
		if (key === 'medium') return 'bg-yellow-400/90 text-black';
		return 'bg-green-600/90 text-white'; // low
	};

	const toggleExpand = (id: number) => {
		setExpandedDescriptions(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	};

	return (
		
		<main className="relative min-h-screen bg-white overflow-hidden">
			<Header />
			<div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-500/30 blur-xl" />
			<div className="pointer-events-none absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" />
			<div className="relative px-4 sm:px-8 py-10 max-w-7xl mx-auto">
				<div className="mb-10">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
						<div className="space-y-3">
							<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-black drop-shadow-sm">Hazard Report History</h1>
							<p className="text-sm md:text-base text-black/40 font-medium">Track, update and manage your submitted hazard reports.</p>
						</div>
						<div className="flex items-center gap-3 w-full sm:w-auto">
							
							<button
								onClick={() => router.push('/home')}
								className="relative inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white text-sm tracking-wide bg-green-900 shadow-lg shadow-black/30 ring-1 ring-white/20 hover:from-brand-500 hover:via-brand-500 hover:to-brand-300 transition-all focus:outline-none focus:ring-4 focus:ring-brand-400/40"
							>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
								</svg>
								Submit New Report
								<span className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity" />
							</button>
						</div>
					</div>
				</div>

				{loading ? (
					<div className="flex justify-center items-center py-24">
						<div className="animate-spin rounded-full h-14 w-14 border-4 border-white/20 border-t-brand-400"></div>
					</div>
				) : error ? (
					<div className="text-center py-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
						<div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-2 ring-red-400/30">
							<svg className="w-8 h-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						</div>
						<p className="font-semibold text-red-200">{error}</p>
					</div>
				) : reports.length === 0 ? (
					<div className="text-center py-20 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
						<div className="w-24 h-24 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
							<svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
						</div>
						<h3 className="text-xl font-bold text-white mb-2">No Reports Yet</h3>
						<p className="text-brand-100/70 mb-8">You haven&apos;t submitted any hazard reports yet.</p>
						
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
						{reports.map((report) => {
							if (!report || !report.id) { console.warn('Invalid report object:', report); return null; }
							const statusColor = report.status === 'resolved' ? 'bg-green-500/90 ring-1 ring-green-300/50' : report.status === 'active' ? 'bg-amber-500/90 ring-1 ring-amber-300/50' : 'bg-gray-500/70 ring-1 ring-gray-300/40';
							const isExpanded = expandedDescriptions.has(report.id);
							const desc = report.description || 'No description provided';
							const isLong = desc.length > 140; // threshold for showing toggle
							return (
								<div key={report.id} className="group relative rounded-2xl overflow-hidden hover:shadow-2xl transition-all backdrop-blur-xl bg-black/40 border border-white/10 flex flex-col min-h-[350px]">
									{/* Part 1: Title / Status / Duration & Date */}
									<div className="relative p-5 space-y-3 bg-green-700">
										<div className="flex items-start justify-between gap-4">
											<h3 className="text-base font-semibold tracking-tight text-white drop-shadow-sm leading-snug line-clamp-2">{report.title || 'Untitled Report'}</h3>
											<span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide text-white shadow ${statusColor}`}>{report.status || 'unknown'}</span>
										</div>
										<div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
											<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/15 ring-1 ring-white/20 text-white"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{report.created_at ? getTimeAgo(report.created_at) : 'Unknown'}</span>
											<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/15 ring-1 ring-white/20 text-white">{report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Unknown date'}</span>
										</div>
									</div>

									{/* Part 2: Type / Level / Description / Images / Location */}
									<div className="relative p-5 space-y-4 bg-white flex-grow flex flex-col">
										{/* Type & Severity chips first */}
										<div className="flex flex-wrap gap-2">
											<span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide shadow ring-1 ring-white/10 ${getTypeClasses(report.hazard_type)}`}>{report.hazard_type}</span>
											<span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide shadow ring-1 ring-white/10 ${getSeverityClasses(report.severity_level)}`}>{report.severity_level} risk</span>
										</div>
										{/* Description */}
										<div className="relative">
											<p className={`mt-1 text-sm leading-relaxed text-gray-700 font-medium break-words ${!isExpanded ? 'line-clamp-4' : ''}`}>{desc}</p>
											{!isExpanded && isLong && (
												<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/90 to-white/0" aria-hidden="true" />
											)}
											{isLong && (
												<button onClick={() => toggleExpand(report.id)} className="mt-2 inline-flex items-center text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors">
													{isExpanded ? 'Show less' : 'Show more'}
												</button>
											)}
										</div>
										{/* Images */}
										{report.images && report.images.length > 0 && (
											<div className="flex gap-2 overflow-x-auto pb-1">
												{report.images.slice(0, 3).map((img, index) => (
													<div key={img} className="relative flex-shrink-0">
														<img src={reportsAPI.getImageUrl(img)} alt={img} className="w-16 h-16 object-cover rounded-lg border border-white/20 shadow-inner shadow-black/30 ring-1 ring-white/10 hover:ring-brand-400/60 transition-all" />
														{index === 2 && report.images && report.images.length > 3 && (
															<div className="absolute inset-0 rounded-lg bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20"><span className="text-white text-xs font-bold">+{(report.images?.length || 0) - 3}</span></div>
														)}
													</div>
												))}
											</div>
										)}
										{/* Location */}
										{report.location && (
											<div className="flex items-center gap-2 text-xs text-gray-700 bg-gray-100 px-3 py-2 rounded-lg ring-1 ring-gray-300 mt-auto"><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="truncate font-medium">{report.location.address || `${report.location.lat}, ${report.location.lng}`}</span></div>
										)}
									</div>

									{/* Part 3: Actions */}
									<div className="relative flex gap-2 p-4 bg-green-700">
										<button onClick={() => handleUpdate(report)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold tracking-wide text-white bg-green-500 hover:bg-green-600 shadow shadow-black/40 ring-1 ring-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400/40"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Update</button>
										<button onClick={() => handleDeleteClick(report)} disabled={deleteLoading === report.id} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold tracking-wide text-white bg-gradient-to-r from-red-600 via-red-500 to-red-400 shadow shadow-black/40 ring-1 ring-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:from-red-500 hover:via-red-500 hover:to-red-300 transition-all focus:outline-none focus:ring-2 focus:ring-red-400/40">
											{deleteLoading === report.id ? (<div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete</>)}
										</button>
									</div>
								</div>
							);
						}).filter(Boolean)}
					</div>
				)}
			</div>

			{/* Update Modal */}
			<UpdateReportModal
				show={showUpdateModal}
				selectedReport={selectedReport}
				updateForm={updateForm}
				updateLoading={updateLoading}
				onClose={() => setShowUpdateModal(false)}
				onSubmit={handleUpdateSubmit}
				onFormChange={handleUpdateFormChange}
			/>

			{/* Delete Modal */}
			<DeleteReportModal
				show={showDeleteModal}
				selectedReport={selectedReport}
				deleteLoading={deleteLoading}
				onClose={() => setShowDeleteModal(false)}
				onDelete={handleDelete}
			/>

			<SnackbarStack>
				<Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} />
			</SnackbarStack>
		</main>
	);
};

export default ReportsHistoryPage;
