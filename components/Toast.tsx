import React, { useState, useEffect, useCallback } from 'react';

export interface ToastMessage {
    id: number;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
}

interface ToastProps {
    messages: ToastMessage[];
    onDismiss: (id: number) => void;
}

/**
 * Toast notification component for showing temporary feedback messages
 * Messages auto-dismiss after 3 seconds
 */
const Toast: React.FC<ToastProps> = ({ messages, onDismiss }) => {
    useEffect(() => {
        // Auto-dismiss messages after 3 seconds
        const timers = messages.map(msg => {
            return setTimeout(() => {
                onDismiss(msg.id);
            }, 3000);
        });

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [messages, onDismiss]);

    if (messages.length === 0) return null;

    const getStyles = (type: ToastMessage['type']) => {
        switch (type) {
            case 'success':
                return 'bg-green-800/90 border-green-500 text-green-100';
            case 'warning':
                return 'bg-yellow-800/90 border-yellow-500 text-yellow-100';
            case 'error':
                return 'bg-red-800/90 border-red-500 text-red-100';
            default:
                return 'bg-slate-800/90 border-slate-500 text-slate-100';
        }
    };

    const getIcon = (type: ToastMessage['type']) => {
        switch (type) {
            case 'success':
                return '✓';
            case 'warning':
                return '⚠';
            case 'error':
                return '✗';
            default:
                return 'ℹ';
        }
    };

    return (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
            {messages.map(msg => (
                <div
                    key={msg.id}
                    className={`px-4 py-2 rounded-lg border-2 shadow-lg ${getStyles(msg.type)}`}
                    style={{
                        animation: 'toast-fade-in 0.3s ease-out',
                    }}
                >
                    <span className="mr-2">{getIcon(msg.type)}</span>
                    <span className="text-sm font-medium">{msg.message}</span>
                </div>
            ))}
            <style>{`
                @keyframes toast-fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

/**
 * Hook for managing toast messages
 */
export function useToast() {
    const [messages, setMessages] = useState<ToastMessage[]>([]);
    const idCounter = React.useRef(0);

    const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
        const id = idCounter.current++;
        setMessages(prev => [...prev, { id, message, type }]);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
    }, []);

    return { messages, showToast, dismissToast };
}

export default Toast;
