// Security configuration for the application
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env?.DEV;

export const SECURITY_CONFIG = {
  // Session timeout configuration
  sessionTimeout: {
    // Enable/disable session timeout feature
    enabled: true,
    
    // Total session timeout in seconds (10 minutes for both dev and prod)
    totalTimeoutSeconds: 10 * 60, // 10 minutes
    
    // Warning time in seconds (show warning 2 minutes before timeout)
    warningTimeSeconds: 2 * 60, // 2 minutes
    
    // Activity throttle interval (prevent excessive timeout resets)
    activityThrottleMs: 1000, // 1 second
    
    // Events that count as user activity
    activityEvents: [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ] as const
  },

  // Authentication settings
  AUTH: {
    // Storage key for auth tokens
    STORAGE_KEY: 'junyper-auth-token',
    
    // Enable debug mode for auth
    DEBUG: false,
    
    // Auto refresh tokens
    AUTO_REFRESH: true,
    
    // Persist sessions across browser restarts
    PERSIST_SESSION: true
  },

  // Additional security features
  FEATURES: {
    // Enable session timeout
    ENABLE_SESSION_TIMEOUT: true,
    
    // Enable activity tracking
    ENABLE_ACTIVITY_TRACKING: true,
    
    // Enable warning modal
    ENABLE_WARNING_MODAL: true,
    
    // Log security events
    LOG_SECURITY_EVENTS: true
  }
} as const;

// Helper to get timeout configuration
export const getTimeoutConfig = () => {
  const config = SECURITY_CONFIG.sessionTimeout;
  
  return {
    totalTimeout: config.totalTimeoutSeconds * 1000, // Convert to milliseconds
    warningDelay: (config.totalTimeoutSeconds - config.warningTimeSeconds) * 1000, // When to show warning
    warningDuration: config.warningTimeSeconds * 1000, // How long warning is shown
    activityThrottle: config.activityThrottleMs,
    activityEvents: config.activityEvents,
    enabled: config.enabled
  };
};

export const isSessionTimeoutEnabled = () => SECURITY_CONFIG.FEATURES.ENABLE_SESSION_TIMEOUT;
export const isActivityTrackingEnabled = () => SECURITY_CONFIG.FEATURES.ENABLE_ACTIVITY_TRACKING;

// Development helpers
export const isDevelopmentMode = () => process.env.NODE_ENV === 'development' || import.meta.env?.DEV;
export const getTimeoutSettings = () => ({
  timeout: getTimeoutConfig().totalTimeout,
  warning: getTimeoutConfig().warningDuration,
  isDev: isDevelopmentMode()
}); 