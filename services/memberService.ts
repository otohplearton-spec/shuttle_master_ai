export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-a7DQ1XN1fIV2WzpvsMa6f8KThKKR6OuTciWITU0XlmI9mte8XndXsEtkJxEP_xSt/exec';

export interface MemberStatus {
    isPro: boolean;
    expiryDate?: string;
    message?: string;
}

export interface PaymentResponse {
    success: boolean;
    message?: string;
    paymentUrl?: string;
    transactionId?: string;
    daysAdded?: number;
}

// Assuming UserProfile is defined elsewhere or will be added.
// For the purpose of this edit, we'll assume it looks something like this:
export interface UserProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    // ... other profile fields
}

export const memberService = {
    /**
     * Check membership status from Google Sheet (via GAS)
     * Supports registering new users if they don't exist
     */
    checkMembership: async (userOrId: string | UserProfile): Promise<MemberStatus> => {
        const userId = typeof userOrId === 'string' ? userOrId : userOrId.userId;
        const userData = typeof userOrId === 'object' ? userOrId : null;

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'check_membership',
                    userId: userId,
                    // If we have full user profile, send it to update/create sheet row
                    displayName: userData?.displayName || '',
                    pictureUrl: userData?.pictureUrl || ''
                })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to check membership:', error);
            return { isPro: false };
        }
    },

    /**
     * Request a payment URL from LINE Pay (via GAS)
     */
    requestUpgrade: async (userId: string): Promise<PaymentResponse> => {
        try {
            console.log('Sending Payment Request to GAS...', userId);
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'request_payment',
                    userId: userId,
                    productName: 'ShuttleMaster PRO Upgrade',
                    amount: 1, // NT$1 for testing
                    currency: 'TWD',
                    // Pass current origin dynamically with distinct param name
                    confirmUrl: window.location.origin + "/?orderId=",
                    cancelUrl: window.location.origin + "/"
                })
            });
            const data = await response.json();
            console.log('LINE PAY RESPONSE:', data); // DEBUG LOG

            if (!data.success) {
                console.error("GAS returned error:", data);
            }

            return data;
        } catch (error: any) {
            console.error('Payment request failed', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Confirm a payment transaction (via GAS)
     */
    confirmUpgrade: async (orderId: string): Promise<PaymentResponse> => {
        // Retrieve userId from local storage to ensure we know who to upgrade
        const savedUser = localStorage.getItem('shuttle_master_user');
        const userId = savedUser ? JSON.parse(savedUser).userId : "";

        try {
            console.log('Confirming Payment...', orderId, userId);
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'confirm_payment',
                    transactionId: orderId, // using orderId as transactionId param for GAS
                    userId: userId // Explictly pass userId
                })
            });
            const data = await response.json();
            return data;
        } catch (error: any) {
            console.error('Payment confirm failed', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Redeem an invitation code
     */
    redeemCode: async (userId: string, code: string): Promise<PaymentResponse> => {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'redeem_code',
                    userId: userId,
                    code: code
                })
            });
            const data = await response.json();
            return data;
        } catch (error: any) {
            console.error('Redeem code failed', error);
            return { success: false, message: error.message };
        }
    }
};
