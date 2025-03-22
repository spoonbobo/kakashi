import React from 'react';
import { ToastContainer, toast, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaCheck, FaTimes } from 'react-icons/fa';

// Export the toast functions for direct use
export const showSuccessToast = (message: string) => {
    return toast.success(message, {
        className: 'professional-toast',
        progressClassName: 'professional-progress',
        icon: <FaCheck color="#4CAF50" size={24} />,
    });
};

export const showErrorToast = (message: string) => {
    return toast.error(message, {
        className: 'professional-toast',
        progressClassName: 'professional-progress',
        icon: <FaTimes color="#F44336" size={24} />,
    });
};

export const showInfoToast = (message: string) => {
    return toast.info(message, {
        className: 'professional-toast',
        progressClassName: 'professional-progress',
    });
};

export const showWarningToast = (message: string) => {
    return toast.warning(message, {
        className: 'professional-toast',
        progressClassName: 'professional-progress',
    });
};

// Reusable Toast Container component
const Toast: React.FC = () => {
    return (
        <>
            <ToastContainer
                position="bottom-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                transition={Slide}
                theme="light"
                limit={3}
                style={{
                    zIndex: 9999,
                    minWidth: '300px'
                }}
            />

            {/* eslint-disable-next-line react/no-unknown-property */}
            <style jsx global>{`
        .professional-toast {
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          padding: 16px !important;
          font-family: system-ui, -apple-system, sans-serif !important;
        }
        
        .professional-toast-body {
          font-size: 14px !important;
          font-weight: 500 !important;
          margin-left: 12px !important;
        }
        
        .professional-progress {
          height: 4px !important;
          background: linear-gradient(to right, #4CAF50, #8BC34A) !important;
        }
        
        .Toastify__toast--error .professional-progress {
          background: linear-gradient(to right, #F44336, #FF9800) !important;
        }
        
        .Toastify__toast {
          min-height: 64px !important;
        }
        
        .Toastify__close-button {
          opacity: 0.7 !important;
          padding: 4px !important;
        }
      `}</style>
        </>
    );
};

export default Toast;