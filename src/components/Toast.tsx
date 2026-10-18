import React from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'ok' | 'err' | 'info';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-1.5 pointer-events-none w-full max-w-sm px-4">
      {toasts.map(t => {
        const bg = t.type === 'ok' ? 'bg-emerald-600' : t.type === 'err' ? 'bg-red-600' : 'bg-[#181822] border border-white/20';
        const icon = t.type === 'ok' ? 'fa-circle-check' : t.type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-info';
        return (
          <div
            key={t.id}
            className={`toast-enter ${bg} text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 pointer-events-auto max-w-[95vw] border border-white/10`}
          >
            <i className={`fa-solid ${icon} text-sm flex-shrink-0`}></i>
            <span className="truncate">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
};
