import liff from '@line/liff';
import { UserProfile } from '../types';

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID;

export const lineService = {
    /**
     * Initialize LIFF SDK
     * @returns {Promise<boolean>} true if the user is already logged in
     */
    init: async (): Promise<boolean> => {
        if (!LIFF_ID) {
            console.warn('LIFF ID is missing in environment variables');
            return false;
        }

        try {
            await liff.init({ liffId: LIFF_ID });
            return liff.isLoggedIn();
        } catch (error) {
            console.error('LIFF initialization failed', error);
            return false;
        }
    },

    /**
     * Trigger LINE Login
     * This will redirect the user to the LINE Login screen
     */
    login: () => {
        if (!liff.isLoggedIn()) {
            // Explicitly redirect back to the current origin (e.g., http://localhost:3000)
            // This URL MUST be added to LINE Developer Console -> LINE Login -> Callback URL
            liff.login({ redirectUri: window.location.origin });
        }
    },

    /**
     * Log out the user
     */
    logout: () => {
        if (liff.isLoggedIn()) {
            liff.logout();
        }
    },

    /**
     * Get the current user's profile
     */
    getProfile: async (): Promise<UserProfile | null> => {
        if (!liff.isLoggedIn()) return null;

        try {
            const profile = await liff.getProfile();
            return {
                userId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
                isPro: false // Default to false, can be fetched from backend later
            };
        } catch (error) {
            console.error('Failed to get user profile', error);
            return null;
        }
    }
};
