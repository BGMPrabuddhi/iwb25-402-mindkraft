import React from 'react';
import { HazardReport, HazardReportData } from '../lib/api';

interface UpdateReportModalProps {
  show: boolean;
  selectedReport: HazardReport | null;
  updateForm: Partial<HazardReportData>;
  updateLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (field: keyof HazardReportData, value: string) => void;
}

const UpdateReportModal: React.FC<UpdateReportModalProps> = ({
  show,
  selectedReport,
  updateForm,
  updateLoading,
  onClose,
  onSubmit,
  onFormChange,
}) => {
  if (!show || !selectedReport) return null;

  return (
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
              value={updateForm.title || ''}
              onChange={(e) => onFormChange('title', e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">
              Description
            </label>
            <textarea
              value={updateForm.description || ''}
              onChange={(e) => onFormChange('description', e.target.value)}
              rows={3}
              className="form-input resize-none"
            />
          </div>
          <div>
            <label className="form-label">
              Hazard Type
            </label>
            <select
              value={updateForm.hazard_type || 'pothole'}
              onChange={(e) => onFormChange('hazard_type', e.target.value)}
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
              value={updateForm.severity_level || 'medium'}
              onChange={(e) => onFormChange('severity_level', e.target.value)}
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
            onClick={onClose}
            className="btn-danger flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
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
  );
};

export default UpdateReportModal;
