import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

interface UseSessionTimeoutOptions {
  timeoutDuration?: number; // in milliseconds
  warningDuration?: number; // in milliseconds
  onWarning?: () => void;
  onTimeout?: () => void;
}

export function useSessionTimeout({
  timeoutDuration = 10 * 60 * 1000, // 10 minutes
  warningDuration = 2 * 60 * 1000,  // 2 minutes warning
  onWarning,
  onTimeout
}: UseSessionTimeoutOptions = {}) {
  // If timeout is disabled (duration is 0), return inactive state
  const isDisabled = timeoutDuration === 0;
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeoutDuration);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    console.log('Session timeout - logging out user');
    clearTimers();
    setIsWarningShown(false);
    
    try {
      await supabase.auth.signOut();
      onTimeout?.();
    } catch (error) {
      console.error('Error during timeout logout:', error);
      // Force logout by clearing local storage and reloading
      localStorage.clear();
      window.location.href = '/auth';
    }
  }, [clearTimers, onTimeout]);

  // Handle warning display
  const handleWarning = useCallback(() => {
    console.log('Session timeout warning triggered');
    setIsWarningShown(true);
    onWarning?.();

    // Start countdown
    const warningStartTime = Date.now();
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - warningStartTime;
      const remaining = warningDuration - elapsed;
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);
  }, [warningDuration, onWarning]);

  // Reset the timeout timers
  const resetTimeout = useCallback(() => {
    clearTimers();
    setIsWarningShown(false);
    setTimeRemaining(timeoutDuration);
    lastActivityRef.current = Date.now();

    // Set warning timer
    warningTimeoutRef.current = setTimeout(handleWarning, timeoutDuration - warningDuration);
    
    // Set logout timer
    timeoutRef.current = setTimeout(handleTimeout, timeoutDuration);
  }, [timeoutDuration, warningDuration, handleWarning, handleTimeout, clearTimers]);

  // Extend session (called when user interacts during warning)
  const extendSession = useCallback(() => {
    console.log('Session extended by user action');
    resetTimeout();
  }, [resetTimeout]);

  // Track user activity
  const trackActivity = useCallback(() => {
    const now = Date.now();
    // Throttle activity tracking to avoid excessive resets
    if (now - lastActivityRef.current > 1000) { // Only reset if more than 1 second since last activity
      resetTimeout();
    }
  }, [resetTimeout]);

  // Set up activity listeners
  useEffect(() => {
    // Don't set up listeners if timeout is disabled
    if (isDisabled) return;

    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, trackActivity, true);
    });

    // Initialize timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity, true);
      });
      clearTimers();
    };
  }, [trackActivity, resetTimeout, clearTimers, isDisabled]);

  // Listen for auth state changes to clear timers on logout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearTimers();
        setIsWarningShown(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [clearTimers]);

  // Format time remaining for display
  const formatTimeRemaining = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    isWarningShown,
    timeRemaining: formatTimeRemaining(timeRemaining),
    timeRemainingMs: timeRemaining,
    extendSession,
    resetTimeout
  };
} 