'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * Hook to automatically track user's online/offline status
 * Updates status when:
 * - User logs in (sets online)
 * - User logs out (sets offline)
 * - User closes tab/browser (sets offline)
 * - User becomes inactive (sets offline after timeout)
 * - User returns to tab (sets online)
 */
export function useOnlineStatus(user: User | null) {
    const supabase = createClient();
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<Date>(new Date());
    const isOnlineRef = useRef<boolean>(false);

    // Update online status in database
    const updateStatus = async (isOnline: boolean) => {
        if (!user) return;
        
        try {
            await supabase.rpc('update_online_status', { p_is_online: isOnline });
            isOnlineRef.current = isOnline;
        } catch (error) {
            console.error('Error updating online status:', error);
        }
    };

    // Heartbeat to keep status fresh (every 30 seconds)
    const sendHeartbeat = async () => {
        if (!user || !isOnlineRef.current) return;
        
        // Only update if user was active in last 2 minutes
        const timeSinceActivity = Date.now() - lastActivityRef.current.getTime();
        if (timeSinceActivity < 2 * 60 * 1000) {
            await updateStatus(true);
        } else {
            // User inactive, set offline
            await updateStatus(false);
        }
    };

    useEffect(() => {
        if (!user) {
            // User logged out, ensure offline
            if (isOnlineRef.current) {
                updateStatus(false);
            }
            return;
        }

        // Set online when user is active
        updateStatus(true);
        lastActivityRef.current = new Date();

        // Track user activity
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        const handleActivity = () => {
            lastActivityRef.current = new Date();
            // If user was offline, set online
            if (!isOnlineRef.current) {
                updateStatus(true);
            }
        };

        // Add activity listeners
        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Heartbeat interval (every 30 seconds)
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30 * 1000);

        // Handle visibility change (tab switching)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab hidden - set offline after 1 minute
                setTimeout(() => {
                    if (document.hidden) {
                        updateStatus(false);
                    }
                }, 60 * 1000);
            } else {
                // Tab visible - set online
                updateStatus(true);
                lastActivityRef.current = new Date();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Handle page unload (browser close, tab close, navigation away)
        const handleBeforeUnload = () => {
            // Note: sendBeacon doesn't support RPC calls, so we'll use a regular fetch
            // For now, we'll rely on the cleanup function
            updateStatus(false);
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
    }, [user]);

    // Also listen for auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    await updateStatus(false);
                } else if (event === 'SIGNED_IN' && session?.user) {
                    await updateStatus(true);
                    lastActivityRef.current = new Date();
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);
}

