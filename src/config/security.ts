// Security Configuration
export const SECURITY_CONFIG = {
  // Session timeout settings
  SESSION_TIMEOUT: {
    // Total session duration before timeout (10 minutes in production, 2 minutes in development)
    DURATION: process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : 10 * 60 * 1000,
    
    // Warning duration before timeout (2 minutes in production, 30 seconds in development)
    WARNING_DURATION: process.env.NODE_ENV === 'development' ? 30 * 1000 : 2 * 60 * 1000,
    
    // Activity throttle (minimum time between activity resets)
    ACTIVITY_THROTTLE: 1000,
    
    // Events that count as user activity
    ACTIVITY_EVENTS: [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]
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

// Helper functions
export const getSessionTimeoutDuration = () => SECURITY_CONFIG.SESSION_TIMEOUT.DURATION;
export const getWarningDuration = () => SECURITY_CONFIG.SESSION_TIMEOUT.WARNING_DURATION;
export const isSessionTimeoutEnabled = () => SECURITY_CONFIG.FEATURES.ENABLE_SESSION_TIMEOUT;
export const isActivityTrackingEnabled = () => SECURITY_CONFIG.FEATURES.ENABLE_ACTIVITY_TRACKING;

// Development helpers
export const isDevelopmentMode = () => process.env.NODE_ENV === 'development';
export const getTimeoutSettings = () => ({
  timeout: getSessionTimeoutDuration(),
  warning: getWarningDuration(),
  isDev: isDevelopmentMode()
}); 