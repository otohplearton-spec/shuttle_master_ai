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
     * @param redirectUri Optional custom redirect URI (default: window.location.origin)
     */
    login: (redirectUri?: string) => {
        if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: redirectUri || window.location.origin });
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
    },

    /**
     * Share a text message to LINE chats (Share Target Picker)
     * @param text The text message to share
     * @returns Promise<{ success: boolean; error?: string }>
     */
    shareMessage: async (text: string): Promise<{ success: boolean; error?: string }> => {
        if (!liff.isLoggedIn()) return { success: false, error: '尚未登入' };

        if (!liff.isApiAvailable('shareTargetPicker')) {
            console.warn('Share Target Picker is not available');
            return { success: false, error: 'Share Target Picker 不支援此瀏覽器 (請使用 Line App 開啟)' };
        }

        try {
            const res = await liff.shareTargetPicker([
                {
                    type: 'text',
                    text: text
                }
            ]);
            if (res) {
                return { success: true };
            } else {
                return { success: false, error: '使用者取消分享' };
            }
        } catch (error: any) {
            console.error('Share failed', error);
            if (error.code === 'USER_CANCELLED') return { success: false, error: '已取消分享' };
            return { success: false, error: error.message || '分享失敗' };
        }
    }
};
