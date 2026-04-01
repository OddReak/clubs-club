import { useState, useEffect, useCallback } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return mobile;
}

export function useToast() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ show: true, message, type });
    const duration = type === 'success' ? 2000 : type === 'error' ? 4500 : 3000;
    setTimeout(() => setToast(p => ({ ...p, show: false })), duration);
  }, []);

  return { toast, showToast };
}
