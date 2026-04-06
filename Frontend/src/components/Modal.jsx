import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

/**
 * A reusable, glassmorphic modal component that matches the 
 * Retro-Futuristic / Industrial vibe of DataPrep Pro.
 */
const Modal = ({ isOpen, onClose, title, children, maxWidth = '500px' }) => {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content fade-in-up" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(9, 9, 12, 0.75);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          background: var(--bg-elevated);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-lg);
          width: 100%;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6), 
                      0 0 0 1px rgba(245, 158, 11, 0.05);
          position: relative;
          overflow: hidden;
        }

        .modal-content::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--amber), transparent);
          opacity: 0.6;
        }

        .modal-header {
          padding: var(--space-4) var(--space-6);
          border-bottom: 1px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
        }

        .modal-title {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .modal-close-btn {
          font-size: 1.5rem;
          color: var(--text-muted);
          transition: color 0.2s ease;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
        }

        .modal-close-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .modal-body {
          padding: var(--space-6);
        }

        .fade-in-up {
          animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Modal;
