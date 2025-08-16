
"use client";

import React, { useEffect, useState } from "react";
import { reportsAPI, HazardReport, HazardReportData } from "../../lib/api";
import { useRouter } from "next/navigation";

const ReportsHistoryPage = () => {
	const router = useRouter();
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
			const response = await reportsAPI.getReports();
			console.log('API Response:', response); // Debug log
			console.log('Reports array:', response.reports); // Debug log
			setReports(response.reports || []); // Ensure it's an array
		} catch (err: any) {
			console.error('Fetch error:', err); // Debug log
			setError(err.message || "Failed to fetch reports.");
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
		} catch (err: any) {
			showSnackbar(err.message || "Failed to update report", 'error');
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
		} catch (err: any) {
			showSnackbar(err.message || "Failed to delete report", 'error');
		} finally {
			setDeleteLoading(null);
		}
	};

	return (
		<main className="min-h-screen gradient-bg p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header Section */}
				<div className="page-header">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<h1 className="text-3xl font-bold text-white mb-2">Hazard Report History</h1>
							<p className="text-gray-200">Track and manage your submitted hazard reports</p>
						</div>
						<button
							onClick={() => router.push('/home')}
							className="btn-primary shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
						<p className="text-gray-500 mb-6">You haven't submitted any hazard reports yet.</p>
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
								<div key={report.id} className="card p-0 overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
									{/* Card Header */}
									<div className="card-header">
										<div className="flex justify-between items-start">
											<h3 className="text-white font-semibold text-lg leading-tight">{report.title || 'Untitled Report'}</h3>
											<span className={`badge ${
												report.status === 'resolved' 
													? 'badge-success' 
													: report.status === 'active' 
													? 'badge-warning' 
													: 'badge-neutral'
											}`}>
												{report.status || 'unknown'}
											</span>
										</div>
										<p className="text-gray-300 text-sm mt-2">
											{report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Unknown date'}
										</p>
									</div>

									{/* Card Content */}
									<div className="p-4">
										<p className="text-gray-600 text-sm mb-4 line-clamp-3">
											{report.description || 'No description provided'}
										</p>

										{/* Hazard Type & Severity */}
										<div className="flex flex-wrap gap-2 mb-4">
											<span className="bg-secondary text-white px-3 py-1 rounded-full text-xs font-medium">
												{report.hazard_type}
											</span>
											<span className={`badge ${
												report.severity_level === 'high' 
													? 'badge-error'
													: report.severity_level === 'medium'
													? 'badge-warning'
													: 'badge-info'
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
															className="w-16 h-16 object-cover rounded-lg border-2 border-gray-100 hover:border-secondary-primary transition-colors"
														/>
														{index === 2 && report.images && report.images.length > 3 && (
															<div className="absolute inset-0 bg-black bg-opacity-60 rounded-lg flex items-center justify-center">
																<span className="text-white text-xs font-medium">+{report.images.length - 3}</span>
															</div>
														)}
													</div>
												))}
											</div>
										)}

										{/* Location */}
										{report.location && (
											<div className="flex items-center gap-2 mb-4 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
												<svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
												</svg>
												<span className="truncate">{report.location.address || `${report.location.lat}, ${report.location.lng}`}</span>
											</div>
										)}
									</div>

									{/* Card Actions */}
									<div className="border-t bg-gray-50 px-4 py-3 flex gap-2">
										<button
											onClick={() => handleUpdate(report)}
											className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
											Update
										</button>
										<button
											onClick={() => handleDeleteClick(report)}
											disabled={deleteLoading === report.id}
											className="btn-danger flex-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
							);
						}).filter(Boolean)}
					</div>
				)}
			</div>

			{/* Update Modal */}
			{showUpdateModal && selectedReport && (
				<div className="modal-overlay">
					<div className="modal-container w-full max-w-md">
						<div className="modal-header">
							<h2 className="text-xl font-bold text-white flex items-center gap-2">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
								</svg>
								Update Report
							</h2>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="form-label">
									Title
								</label>
								<input
									type="text"
									value={updateForm.title}
									onChange={(e) => setUpdateForm({...updateForm, title: e.target.value})}
									className="form-input"
								/>
							</div>
							<div>
								<label className="form-label">
									Description
								</label>
								<textarea
									value={updateForm.description}
									onChange={(e) => setUpdateForm({...updateForm, description: e.target.value})}
									rows={3}
									className="form-input resize-none"
								/>
							</div>
							<div>
								<label className="form-label">
									Hazard Type
								</label>
								<select
									value={updateForm.hazard_type}
									onChange={(e) => setUpdateForm({...updateForm, hazard_type: e.target.value as any})}
									className="form-input"
								>
									<option value="pothole">Pothole</option>
									<option value="accident">Accident</option>
									<option value="Natural disaster">Natural Disaster</option>
									<option value="construction">Construction</option>
								</select>
							</div>
							<div>
								<label className="form-label">
									Severity Level
								</label>
								<select
									value={updateForm.severity_level}
									onChange={(e) => setUpdateForm({...updateForm, severity_level: e.target.value as any})}
									className="form-input"
								>
									<option value="low">Low</option>
									<option value="medium">Medium</option>
									<option value="high">High</option>
								</select>
							</div>
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setShowUpdateModal(false)}
								className="btn-outline flex-1"
							>
								Cancel
							</button>
							<button
								onClick={handleUpdateSubmit}
								disabled={updateLoading}
								className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
							>
								{updateLoading ? (
									<>
										<div className="loading-spinner h-4 w-4 border-white"></div>
										Updating...
									</>
								) : (
									'Update Report'
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && selectedReport && (
				<div className="modal-overlay">
					<div className="modal-container w-full max-w-md">
						<div className="modal-header-danger">
							<h2 className="text-xl font-bold text-white flex items-center gap-2">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
								Confirm Delete
							</h2>
						</div>
						<div className="p-6">
							<p className="text-gray-700 mb-4">
								Are you sure you want to delete the report:
							</p>
							<div className="bg-gray-50 rounded-lg p-3 mb-4 border-l-4 border-primary">
								<p className="font-semibold text-primary">"{selectedReport.title}"</p>
							</div>
							<div className="alert-high text-sm">
								⚠️ This action cannot be undone.
							</div>
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setShowDeleteModal(false)}
								className="btn-outline flex-1"
							>
								Cancel
							</button>
							<button
								onClick={handleDelete}
								disabled={deleteLoading === selectedReport?.id}
								className="btn-danger flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
							>
								{deleteLoading === selectedReport?.id ? (
									<>
										<div className="loading-spinner h-4 w-4 border-white"></div>
										Deleting...
									</>
								) : (
									<>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
										Yes, Delete
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

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
