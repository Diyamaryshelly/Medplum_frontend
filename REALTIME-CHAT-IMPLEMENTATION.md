# Real-Time Chat Implementation

## Overview
The chat system now has enhanced real-time capabilities with WebSocket support, automatic polling fallback, and visual connection status indicators.

## Features Implemented

### 1. **WebSocket Real-Time Updates** ✅
- Uses Medplum's built-in WebSocket subscription system
- Automatically connects to `ws://localhost:8103/ws/subscriptions-r4`
- Subscribes to `Communication` resource changes
- Real-time message delivery without page refresh

### 2. **Polling Fallback** ✅
- Automatic polling every 5 seconds as a fallback
- Ensures messages are received even if WebSocket fails
- Can be disabled once WebSocket is confirmed working

### 3. **Connection Status Indicator** ✅
- **Live** (Green badge with WiFi icon) - WebSocket connected
- **Reconnecting...** (Yellow badge with WiFi-off icon) - Connection lost, attempting to reconnect
- Visual feedback for users about connection state

### 4. **Manual Refresh Button** ✅
- Refresh icon in the header
- Allows users to manually fetch latest messages
- Shows spinning animation while refreshing

### 5. **Debug Logging** ✅
- Console logs for WebSocket events:
  - Connection opened
  - Connection closed
  - Subscription connected
  - Messages received
  - Errors

## How It Works

### WebSocket Flow
```
1. App starts → initWebSocketManager(medplum)
2. User logs in → ChatContext subscribes to Communication changes
3. Message sent → Server creates Communication resource
4. WebSocket receives update → ChatContext processes bundle
5. UI updates automatically → New message appears
```

### Subscription Query
```typescript
Communication?part-of:missing=true&subject=Patient/{patientId}
```

This subscribes to:
- Top-level threads (part-of:missing=true)
- For the specific patient
- Any changes trigger a WebSocket message

### Message Processing
```typescript
useSubscription(
  `Communication?${getQueryString(subscriptionQuery)}`,
  async (bundle: Bundle) => {
    const communication = bundle.entry?.[1]?.resource as Communication;
    // Sync the thread
    setThreads((prev) => syncResourceArray(prev, communication));
    // Sync the thread messages
    receiveThread(communication.id!);
  }
);
```

## Configuration

### Environment Variables
```bash
# .env.local
EXPO_PUBLIC_MEDPLUM_BASE_URL=http://localhost:8103
```

The WebSocket URL is automatically derived:
- HTTP: `http://localhost:8103` → WebSocket: `ws://localhost:8103/ws/subscriptions-r4`
- HTTPS: `https://api.medplum.com` → WebSocket: `wss://api.medplum.com/ws/subscriptions-r4`

### Server Configuration
The Medplum server must have WebSocket support enabled (already configured):
```typescript
// packages/server/src/ws/routes.ts
export function initWebSockets(server: http.Server): void {
  wsServer = new WebSocketServer({
    noServer: true,
    maxPayload: bytes(getConfig().maxJsonSize) as number,
  });
}
```

## Testing Real-Time Updates

### Test Scenario 1: Same Device
1. Open two browser tabs
2. Log in as Patient in Tab 1
3. Log in as Practitioner in Tab 2
4. Send message from Tab 1
5. **Expected**: Message appears in Tab 2 within 1-2 seconds

### Test Scenario 2: Different Devices
1. Open app on Device A (Patient)
2. Open app on Device B (Practitioner)
3. Send message from Device A
4. **Expected**: Message appears on Device B within 1-2 seconds

### Test Scenario 3: Connection Loss
1. Send a message
2. Disconnect network
3. **Expected**: Status changes to "Reconnecting..."
4. Reconnect network
5. **Expected**: Status changes to "Live", messages sync

## Troubleshooting

### Messages Not Appearing Automatically

**Check 1: WebSocket Connection**
```javascript
// Open browser console (F12)
// Look for these logs:
[App] Medplum Base URL: http://localhost:8103
[App] Initializing WebSocket Manager
[ChatContext] WebSocket opened
[ChatContext] Subscription connected
```

**Check 2: Server Running**
```bash
# Ensure Medplum server is running
cd medplum
npm run dev

# Check if WebSocket endpoint is accessible
curl http://localhost:8103/ws/subscriptions-r4
```

**Check 3: Subscription Query**
```javascript
// In browser console, check:
[ChatContext] Received subscription update: {bundle}
[ChatContext] Processing communication: {id}
```

### Polling Fallback

If WebSocket isn't working, the polling fallback will refresh every 5 seconds:
```javascript
// In ChatContext.tsx
const pollInterval = setInterval(() => {
  console.log("[ChatContext] Polling for updates (fallback)");
  refreshThreads();
}, 5000);
```

**To disable polling** (once WebSocket is confirmed working):
```typescript
// Comment out this useEffect in ChatContext.tsx
/*
useEffect(() => {
  if (!profile) return;
  const pollInterval = setInterval(() => {
    refreshThreads();
  }, 5000);
  return () => clearInterval(pollInterval);
}, [profile, refreshThreads]);
*/
```

## Performance Considerations

### Current Setup
- **WebSocket**: Real-time, minimal overhead
- **Polling**: 5-second interval, fallback only
- **Manual Refresh**: On-demand

### Optimization Options

1. **Increase Polling Interval** (if WebSocket works)
   ```typescript
   setInterval(() => refreshThreads(), 30000); // 30 seconds
   ```

2. **Disable Polling** (if WebSocket is reliable)
   ```typescript
   // Remove the polling useEffect entirely
   ```

3. **Smart Polling** (poll only when app is active)
   ```typescript
   useEffect(() => {
     const subscription = AppState.addEventListener('change', (state) => {
       if (state === 'active') {
         refreshThreads();
       }
     });
     return () => subscription.remove();
   }, []);
   ```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ChatContext (React Context)                       │    │
│  │                                                     │    │
│  │  • useSubscription() - WebSocket listener          │    │
│  │  • refreshThreads() - Manual/Polling refresh       │    │
│  │  • sendMessage() - Send new messages               │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          │ WebSocket + HTTP                  │
│                          ▼                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                          │  Medplum Server                    │
├──────────────────────────┼───────────────────────────────────┤
│                          │                                    │
│  ┌───────────────────────▼──────────────────────────────┐   │
│  │  WebSocket Server (/ws/subscriptions-r4)            │   │
│  │                                                       │   │
│  │  • Manages WebSocket connections                     │   │
│  │  • Publishes resource changes via Redis             │   │
│  │  • Sends updates to subscribed clients              │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │                                    │
│                          │ Redis Pub/Sub                      │
│                          ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FHIR API                                            │   │
│  │                                                       │   │
│  │  • POST /fhir/R4/Communication (create message)      │   │
│  │  • GET /fhir/R4/Communication (fetch messages)       │   │
│  │  • Triggers Redis publish on resource changes        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Code Changes Summary

### Files Modified

1. **medplum-chat-app/contexts/ChatContext.tsx**
   - Added debug logging for WebSocket events
   - Added polling fallback (5-second interval)
   - Exposed `refreshThreads` function

2. **medplum-chat-app/hooks/useThreads.tsx**
   - Added `refreshThreads` to return value

3. **medplum-chat-app/components/ThreadListHeader.tsx**
   - Added connection status indicator (Live/Reconnecting)
   - Added manual refresh button
   - Imported `useChatConnectionState` hook

4. **medplum-chat-app/app/(app)/(tabs)/index.tsx**
   - Passed `refreshThreads` to ThreadListHeader
   - Connected refresh button to context

5. **medplum-chat-app/app/_layout.tsx**
   - Added console logging for base URL
   - Added logging for WebSocket manager initialization

## Next Steps

1. **Test WebSocket Connection**
   - Open browser console
   - Check for WebSocket connection logs
   - Send a test message

2. **Monitor Performance**
   - Check network tab for WebSocket frames
   - Monitor CPU/memory usage
   - Adjust polling interval if needed

3. **Production Deployment**
   - Ensure HTTPS/WSS for production
   - Configure proper CORS settings
   - Set up monitoring/alerting

## References

- [Medplum WebSocket Documentation](https://www.medplum.com/docs/subscriptions)
- [FHIR Subscriptions](https://www.hl7.org/fhir/subscription.html)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**Status**: ✅ Implemented
**Last Updated**: $(date)
