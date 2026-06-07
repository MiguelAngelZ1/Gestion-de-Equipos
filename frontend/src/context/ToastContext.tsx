import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/common/Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((titleOrMessage, messageOrType, typeOnly) => {
    let title, message, type;

    if (typeOnly) {
      title = titleOrMessage;
      message = messageOrType;
      type = typeOnly;
    } else if (['success', 'error', 'info', 'warning'].includes(messageOrType)) {
      message = titleOrMessage;
      type = messageOrType;

      const titles = {
        success: 'Éxito',
        error: 'Error',
        info: 'Información',
        warning: 'Atención'
      };
      title = titles[type];
    } else {
      title = titleOrMessage;
      message = messageOrType;
      type = 'success';
    }

    if (message?.toLowerCase() === 'success') message = 'Operación completada con éxito';
    if (message?.toLowerCase() === 'error') message = 'Hubo un problema al procesar la solicitud';

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 left-4 right-4 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-4 w-auto sm:w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
