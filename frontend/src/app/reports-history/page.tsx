
"use client";

import React, { useEffect, useState } from "react";
import { reportsAPI, HazardReport, HazardReportData } from "../../lib/api";
import { useRouter } from "next/navigation";
import UpdateReportModal from "../../Components/UpdateReportModal";
import DeleteReportModal from "../../Components/DeleteReportModal";

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
	const [updateLoading, setUpdateLoading] = useState(false);
	const [showUpdateModal, setShowUpdateModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
	const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
		show: false,
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
		setSnackbar({ show: true, message, type });
		setTimeout(() => {
			setSnackbar({ show: false, message: "", type: 'success' });
		}, 3000);
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

	return (
		<main className="min-h-screen  bg-white/40  p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header Section */}
				<div className="page-header " color="primary">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<h1 className="text-3xl font-bold text-white mb-2">Hazard Report History</h1>
							<p className="text-gray-200">Track and manage your submitted hazard reports</p>
						</div>
						<button
							onClick={() => router.push('/home')}
							className="btn-primary shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
						>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
							</svg>
							Submit New Report
						</button>
					</div>
				</div>

				{/* Content Section */}
				{loading ? (
					<div className="flex justify-center items-center py-20">
						<div className="loading-spinner h-12 w-12"></div>
					</div>
				) : error ? (
					<div className="alert-high text-center">
						<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<p className="font-medium">{error}</p>
					</div>
				) : reports.length === 0 ? (
					<div className="card text-center">
						<div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
							<svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<h3 className="section-title mb-2">No Reports Yet</h3>
						<p className="text-gray-500 mb-6">You haven&apos;t submitted any hazard reports yet.</p>
						<button
							onClick={() => router.push('/home')}
							className="btn-primary"
						>
							Submit Your First Report
						</button>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{reports.map((report) => {
							// Add null check for report object
							if (!report || !report.id) {
								console.warn('Invalid report object:', report);
								return null;
							}
							
							return (
								<div key={report.id} className="relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200 rounded-xl">
									{/* Glass Card with Backdrop Blur */}
									<div className="bg-black/60 backdrop-blur-3xl rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300">
										{/* Card Header */}
										<div className="card-header">
											<div className="flex justify-between items-start">
												<h3 className="text-white font-semibold text-lg leading-tight drop-shadow-sm">{report.title || 'Untitled Report'}</h3>
												<span className={`badge backdrop-blur-sm bg-white/20 text-white border border-white/30 ${
													report.status === 'resolved' 
														? 'badge-success' 
														: report.status === 'active' 
														? 'badge-warning' 
														: 'badge-neutral'
												}`}>
													{report.status || 'unknown'}
												</span>
											</div>
											<div className="flex justify-between items-center mt-2">
												<p className="text-gray-300 text-sm drop-shadow-sm">
													{report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Unknown date'}
												</p>
												{/* Time Ago Field */}
												<div className="flex items-center gap-1 text-xs text-gray-300 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20">
													<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
													<span className="font-medium">
														{report.created_at ? getTimeAgo(report.created_at) : 'Unknown'}
													</span>
												</div>
											</div>
										</div>

										{/* Glass Card Content */}
										<div className="p-4 backdrop-blur-sm bg-white/80 border-t border-white/20">
											<p className="text-gray-700 text-sm mb-4 line-clamp-3 font-medium">
												{report.description || 'No description provided'}
											</p>

											{/* Hazard Type & Severity */}
											<div className="flex flex-wrap gap-2 mb-4">
												<span className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm">
													{report.hazard_type}
												</span>
												<span className={`badge backdrop-blur-sm border border-white/30 font-medium shadow-md ${
													report.severity_level === 'high' 
														? 'bg-red-500/80 text-white border-red-300/50'
														: report.severity_level === 'medium'
														? 'bg-orange-500/80 text-white border-orange-300/50'
														: 'bg-blue-500/80 text-white border-blue-300/50'
												}`}>
													{report.severity_level} severity
												</span>
											</div>

											{/* Images */}
											{report.images && report.images.length > 0 && (
												<div className="flex gap-2 mb-4 overflow-x-auto">
													{report.images.slice(0, 3).map((img, index) => (
														<div key={img} className="relative flex-shrink-0">
															<img
																src={reportsAPI.getImageUrl(img)}
																alt={img}
																className="w-16 h-16 object-cover rounded-lg border-2 border-white/50 hover:border-teal-400/70 transition-all duration-200 shadow-lg backdrop-blur-sm"
															/>
															{index === 2 && report.images && report.images.length > 3 && (
																<div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
																	<span className="text-white text-xs font-bold drop-shadow-md">+{report.images.length - 3}</span>
																</div>
															)}
														</div>
													))}
												</div>
											)}

											{/* Location */}
											{report.location && (
												<div className="flex items-center gap-2 mb-4 text-xs text-gray-600 bg-white/60 backdrop-blur-sm p-2 rounded-lg border border-white/30 shadow-sm">
													<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
													</svg>
													<span className="truncate font-medium">{report.location.address || `${report.location.lat}, ${report.location.lng}`}</span>
												</div>
											)}
										</div>

										{/* Glass Card Actions */}
										<div className="shadow-lg bg-white/50 backdrop-blur-3xl px-4 py-3 flex gap-2">
											<button
												onClick={() => handleUpdate(report)}
												className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2 backdrop-blur-sm bg-teal-500/90 hover:bg-teal-600/90 border border-white/30 shadow-lg"
											>
												<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
												Update
											</button>
											<button
												onClick={() => handleDeleteClick(report)}
												disabled={deleteLoading === report.id}
												className="btn-danger flex-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 backdrop-blur-sm bg-red-500/90 hover:bg-red-600/90 border border-white/30 shadow-lg"
											>
												{deleteLoading === report.id ? (
													<div className="loading-spinner h-4 w-4 border-white"></div>
												) : (
													<>
														<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
														</svg>
														Delete
													</>
												)}
											</button>
										</div>
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

			{/* Snackbar */}
			{snackbar.show && (
				<div className={`snackbar ${
					snackbar.type === 'success' 
						? 'snackbar-success' 
						: 'snackbar-error'
				}`}>
					<div className="flex items-center gap-3">
						{snackbar.type === 'success' ? (
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						) : (
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						)}
						<span className="font-medium">{snackbar.message}</span>
					</div>
				</div>
			)}
		</main>
	);
};

export default ReportsHistoryPage;
