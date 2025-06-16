# Security Features

## Session Timeout Implementation

### Overview
The application implements an automatic session timeout feature to enhance security by logging out inactive users after a specified period of inactivity.

### Features

#### ✅ **Activity-Based Timeout**
- **Duration**: 10 minutes of inactivity
- **Warning**: 2 minutes before timeout
- **Activity Detection**: Mouse movements, clicks, keyboard input, scrolling, and touch events
- **Throttling**: Activity tracking is throttled to 1 second intervals to prevent excessive resets

#### ✅ **User-Friendly Warning System**
- **Modal Warning**: Displays 2 minutes before timeout
- **Live Countdown**: Shows exact time remaining
- **User Actions**: 
  - "Stay Logged In" - Extends session
  - "Logout Now" - Immediate logout
- **Visual Design**: Professional modal with amber warning colors and security messaging

#### ✅ **Configurable Settings**
All timeout settings are centralized in `src/config/security.ts`:

```typescript
export const SECURITY_CONFIG = {
  SESSION_TIMEOUT: {
    DURATION: 10 * 60 * 1000,        // 10 minutes
    WARNING_DURATION: 2 * 60 * 1000, // 2 minutes warning
    ACTIVITY_THROTTLE: 1000,         // 1 second throttle
    ACTIVITY_EVENTS: [               // Events that count as activity
      'mousedown', 'mousemove', 'keypress', 
      'scroll', 'touchstart', 'click'
    ]
  },
  FEATURES: {
    ENABLE_SESSION_TIMEOUT: true,    // Can be disabled
    ENABLE_ACTIVITY_TRACKING: true,
    ENABLE_WARNING_MODAL: true,
    LOG_SECURITY_EVENTS: true
  }
}
```

#### ✅ **Robust Implementation**
- **Memory Management**: Proper cleanup of timers and event listeners
- **Error Handling**: Graceful fallback if logout fails
- **Auth Integration**: Seamless integration with Supabase authentication
- **Development Tools**: Test component for development/debugging

### Technical Implementation

#### Core Components

1. **`useSessionTimeout` Hook** (`src/hooks/useSessionTimeout.ts`)
   - Manages timeout logic and activity tracking
   - Handles timer management and cleanup
   - Integrates with Supabase auth state changes

2. **`SessionTimeoutWarning` Component** (`src/components/SessionTimeoutWarning.tsx`)
   - Professional warning modal with countdown
   - User action buttons (extend/logout)
   - Accessible design with proper ARIA labels

3. **Security Configuration** (`src/config/security.ts`)
   - Centralized security settings
   - Helper functions for easy configuration
   - Feature flags for enabling/disabling functionality

#### Activity Tracking
The system tracks these user activities:
- `mousedown` - Mouse button presses
- `mousemove` - Mouse movement
- `keypress` - Keyboard input
- `scroll` - Page scrolling
- `touchstart` - Touch screen interactions
- `click` - Click events

#### Timer Management
- **Main Timer**: Counts down from 10 minutes
- **Warning Timer**: Triggers warning at 8 minutes (2 minutes before timeout)
- **Countdown Timer**: Updates warning modal every second
- **Activity Throttle**: Prevents excessive timer resets

### Security Benefits

1. **Prevents Unauthorized Access**: Automatically logs out inactive users
2. **Reduces Session Hijacking Risk**: Limits exposure time of active sessions
3. **Compliance Ready**: Helps meet security compliance requirements
4. **User Awareness**: Clear warnings help users understand security measures
5. **Configurable**: Can be adjusted based on security requirements

### Usage

#### For Developers

**Enable/Disable Feature:**
```typescript
// In src/config/security.ts
FEATURES: {
  ENABLE_SESSION_TIMEOUT: true, // Set to false to disable
}
```

**Adjust Timeout Duration:**
```typescript
SESSION_TIMEOUT: {
  DURATION: 15 * 60 * 1000,        // 15 minutes instead of 10
  WARNING_DURATION: 3 * 60 * 1000, // 3 minutes warning instead of 2
}
```

**Development Testing:**
- A test component appears in development mode (bottom-right corner)
- Shows current timeout status and allows manual testing
- Displays configuration values and warning state

#### For Users

1. **Normal Usage**: No action required - activity automatically resets timeout
2. **Warning Appears**: Choose "Stay Logged In" to continue or "Logout Now" to exit
3. **Automatic Logout**: If no action taken, user is logged out after countdown

### Browser Compatibility

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Touch devices supported
- ✅ Keyboard navigation accessible

### Performance Considerations

- **Lightweight**: Minimal performance impact
- **Throttled**: Activity tracking limited to 1-second intervals
- **Memory Efficient**: Proper cleanup prevents memory leaks
- **Event Delegation**: Uses efficient event handling

### Future Enhancements

Potential improvements that could be added:

1. **Server-Side Validation**: Validate session timeout on server
2. **Multiple Tab Support**: Coordinate timeout across browser tabs
3. **Customizable Warnings**: Allow users to set their own timeout preferences
4. **Activity Logging**: Log security events for audit purposes
5. **Progressive Warnings**: Multiple warning stages (5min, 2min, 30sec)

### Testing

#### Manual Testing
1. Log into the application
2. Stop all activity (don't move mouse or press keys)
3. Wait 8 minutes - warning modal should appear
4. Test both "Stay Logged In" and "Logout Now" buttons
5. Test automatic logout after 2-minute countdown

#### Development Testing
- Use the development test component (bottom-right corner)
- Adjust timeout values in config for faster testing
- Check browser console for security event logs

### Security Best Practices

This implementation follows security best practices:

- ✅ **Defense in Depth**: Multiple layers of session protection
- ✅ **User Transparency**: Clear communication about security measures
- ✅ **Graceful Degradation**: Fallback mechanisms if primary logout fails
- ✅ **Configurable Security**: Adjustable based on risk assessment
- ✅ **Audit Trail**: Logging of security events for monitoring

---

*This session timeout feature significantly enhances the application's security posture by automatically protecting against unauthorized access from unattended sessions.* 