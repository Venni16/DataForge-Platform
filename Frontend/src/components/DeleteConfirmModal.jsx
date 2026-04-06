import React from 'react';
import Modal from './Modal.jsx';

/**
 * A specialized modal for dataset deletion confirmation.
 */
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, datasetName }) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Confirm Permanent Deletion"
      maxWidth="440px"
    >
      <div className="delete-modal-body">
        <div className="warning-icon-container">
          <span className="warning-icon">⚠️</span>
        </div>
        
        <p className="warning-text">
          You are about to delete the dataset:
        </p>
        
        <div className="dataset-name-highlight">
          {datasetName || 'Unnamed Dataset'}
        </div>
        
        <p className="warning-desc">
          This action <strong>cannot</strong> be undone. All versions, processed data, and operation history will be wiped from the server.
        </p>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ minWidth: '120px' }}>
            Delete Permanently
          </button>
        </div>
      </div>

      <style jsx>{`
        .delete-modal-body {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .warning-icon-container {
          width: 54px;
          height: 54px;
          background: var(--red-glow);
          border: 1px solid rgba(248, 113, 113, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-4);
        }

        .warning-icon {
          font-size: 1.6rem;
        }

        .warning-text {
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-bottom: var(--space-2);
        }

        .dataset-name-highlight {
          font-family: var(--font-mono);
          font-size: 1rem;
          font-weight: 700;
          color: var(--red);
          background: rgba(248, 113, 113, 0.05);
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(248, 113, 113, 0.15);
          margin-bottom: var(--space-5);
          word-break: break-all;
        }

        .warning-desc {
          font-family: var(--font-body);
          font-size: 0.82rem;
          line-height: 1.5;
          color: var(--text-muted);
          margin-bottom: var(--space-8);
        }

        .modal-actions {
          display: flex;
          gap: var(--space-3);
          width: 100%;
          justify-content: flex-end;
        }
      `}</style>
    </Modal>
  );
};

export default DeleteConfirmModal;
