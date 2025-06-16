import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTimeoutConfig } from '../config/security';

export const useSessionTimeout = (onTimeout: () => void, onWarning: () => void) => {
  const [isWarningShown, setIsWarningShown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // Get configuration
  const config = getTimeoutConfig();
  
  // If timeout is disabled, don't do anything
  if (!config.enabled) {
    return {
      resetTimeout: () => {},
      extendSession: () => {},
      logoutNow: () => {},
      isWarningShown: false
    };
  }

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      onTimeout();
    } catch (error) {
      console.error('Session timeout - logout error:', error);
      onTimeout();
    }
  }, [onTimeout]);

  const showWarning = useCallback(() => {
    if (!isWarningShown) {
      setIsWarningShown(true);
      onWarning();
      
      // Set final timeout after warning period
      timeoutRef.current = setTimeout(() => {
        logoutUser();
      }, config.warningDuration);
    }
  }, [isWarningShown, onWarning, logoutUser, config.warningDuration]);

  const resetTimeout = useCallback(() => {
    // Don't reset if warning is already shown - user must make a choice
    if (isWarningShown) return;
    
    // Throttle activity resets
    const now = Date.now();
    if (now - lastActivityRef.current < config.activityThrottle) {
      return;
    }
    lastActivityRef.current = now;

    clearAllTimers();
    
    // Set warning timer (triggers before final timeout)
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, config.warningDelay);
  }, [isWarningShown, clearAllTimers, showWarning, config.activityThrottle, config.warningDelay]);

  const extendSession = useCallback(() => {
    setIsWarningShown(false);
    clearAllTimers();
    lastActivityRef.current = Date.now();
    
    // Restart the timeout cycle
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, config.warningDelay);
  }, [clearAllTimers, showWarning, config.warningDelay]);

  const logoutNow = useCallback(() => {
    clearAllTimers();
    logoutUser();
  }, [clearAllTimers, logoutUser]);

  // Set up activity listeners
  useEffect(() => {
    const handleActivity = () => resetTimeout();
    
    // Add event listeners for user activity
    config.activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start the initial timeout
    resetTimeout();

    return () => {
      // Clean up event listeners
      config.activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearAllTimers();
    };
  }, [resetTimeout, clearAllTimers, config.activityEvents]);

  return {
    resetTimeout,
    extendSession,
    logoutNow,
    isWarningShown
  };
}; 