'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

// Constants for timing - optimized for reduced server load
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes (was 30 seconds)
const ACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of inactivity = offline
const ACTIVITY_DEBOUNCE_MS = 60 * 1000; // Only update online status once per minute on activity

/**
 * Hook to automatically track user's online/offline status
 * Optimized for reduced server load:
 * - Heartbeat every 2 minutes (instead of 30 seconds)
 * - Activity updates debounced to max once per minute
 * - Only sends status update when actually changing state
 * 
 * Updates status when:
 * - User logs in (sets online)
 * - User logs out (sets offline)
 * - User closes tab/browser (sets offline)
 * - User becomes inactive for 5 minutes (sets offline)
 * - User returns to tab (sets online)
 */
export function useOnlineStatus(user: User | null) {
    const supabase = createClient();
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<Date>(new Date());
    const lastStatusUpdateRef = useRef<Date>(new Date(0)); // Track last status update time
    const isOnlineRef = useRef<boolean>(false);
    const pendingUpdateRef = useRef<boolean>(false);

    // Update online status in database - with deduplication
    const updateStatus = useCallback(async (isOnline: boolean, force = false) => {
        if (!user) return;
        
        // Skip if status hasn't changed (unless forced)
        if (!force && isOnlineRef.current === isOnline) return;
        
        // For online updates, debounce to avoid rapid-fire updates
        if (isOnline && !force) {
            const timeSinceLastUpdate = Date.now() - lastStatusUpdateRef.current.getTime();
            if (timeSinceLastUpdate < ACTIVITY_DEBOUNCE_MS) {
                // Mark activity but don't send update yet
                lastActivityRef.current = new Date();
                return;
            }
        }

        try {
            // Use fetch with keepalive for reliability
            await fetch('/api/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isOnline }),
                keepalive: true
            });
            isOnlineRef.current = isOnline;
            lastStatusUpdateRef.current = new Date();
        } catch (error) {
            console.error('Error updating online status:', error);
        }
    }, [user]);

    // Heartbeat to keep status fresh (every 2 minutes)
    const sendHeartbeat = useCallback(async () => {
        if (!user || !isOnlineRef.current) return;

        // Only update if user was active within timeout period
        const timeSinceActivity = Date.now() - lastActivityRef.current.getTime();
        if (timeSinceActivity < ACTIVITY_TIMEOUT_MS) {
            await updateStatus(true, true); // Force update for heartbeat
        } else {
            // User inactive, set offline
            await updateStatus(false);
        }
    }, [user, updateStatus]);

    useEffect(() => {
        if (!user) {
            // User logged out, ensure offline
            if (isOnlineRef.current) {
                updateStatus(false);
            }
            return;
        }

        // Set online when user is active
        updateStatus(true, true);
        lastActivityRef.current = new Date();

        // Track user activity - debounced, only update lastActivity timestamp
        // Reduced event set for performance
        const activityEvents = ['mousedown', 'keypress', 'touchstart', 'click'];
        const handleActivity = () => {
            lastActivityRef.current = new Date();
            // If user was offline, set online (will be debounced)
            if (!isOnlineRef.current) {
                updateStatus(true);
            }
        };

        // Add activity listeners with passive flag for performance
        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Heartbeat interval (every 2 minutes instead of 30 seconds)
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

        // Handle visibility change (tab switching)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab hidden - set offline after 2 minutes (was 1 minute)
                setTimeout(() => {
                    if (document.hidden) {
                        updateStatus(false);
                    }
                }, 2 * 60 * 1000);
            } else {
                // Tab visible - set online (will be debounced if recent)
                lastActivityRef.current = new Date();
                updateStatus(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Handle page unload (browser close, tab close, navigation away)
        const handleBeforeUnload = () => {
            if (!user) return;

            // Use sendBeacon for guaranteed execution on unload
            const blob = new Blob([JSON.stringify({ isOnline: false })], { type: 'application/json' });
            navigator.sendBeacon('/api/status', blob);
            isOnlineRef.current = false;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup
        return () => {
            // Remove event listeners
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);

            // Clear heartbeat
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }

            // Set offline on cleanup
            updateStatus(false);
        };
    }, [user, updateStatus, sendHeartbeat]);

    // Also listen for auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    await updateStatus(false);
                } else if (event === 'SIGNED_IN' && session?.user) {
                    await updateStatus(true, true); // Force update on sign in
                    lastActivityRef.current = new Date();
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [updateStatus]);
}

