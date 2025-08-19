import React from 'react';
import { HazardReport } from '../lib/api';

interface DeleteReportModalProps {
  show: boolean;
  selectedReport: HazardReport | null;
  deleteLoading: number | null;
  onClose: () => void;
  onDelete: () => void;
}

const DeleteReportModal: React.FC<DeleteReportModalProps> = ({
  show,
  selectedReport,
  deleteLoading,
  onClose,
  onDelete,
}) => {
  if (!show || !selectedReport) return null;

  return (
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
            onClick={onClose}
            className="btn-outline flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
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
  );
};

export default DeleteReportModal;
