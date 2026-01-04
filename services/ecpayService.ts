import { memberService } from './memberService';

// Define the response from GAS for ECPay
export interface ECPayInitResponse {
    success: boolean;
    message?: string;
    paymentData?: {
        MerchantID: string;
        TradeInfo: string;
        TradeSha: string;
        Version: string;
        actionUrl: string;
    };
}

export const ecpayService = {
    /**
     * Initialize a payment request by calling GAS.
     * GAS/Backend will generate the necessary ECPay parameters and signature (MacValue).
     */
    createPayment: async (userId: string, planName: string, amount: number, days: number = 30): Promise<ECPayInitResponse> => {
        try {
            // We reuse the memberService's endpoint logic but with a new action
            // Assuming memberService has the base URL logic or we can import GOOGLE_SCRIPT_URL
            // For now, we'll use memberService structure or fetch directly if exported.
            // Re-using the GOOGLE_SCRIPT_URL from memberService would be ideal if exported.
            // Since it is exported:
            const { GOOGLE_SCRIPT_URL } = await import('./memberService');

            console.log('Requesting ECPay params from GAS...');
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'ecpay_create_order',
                    userId: userId,
                    planName: planName,
                    amount: amount,
                    days: days, // Pass days to GAS
                    // Front-end return URL (where ECPay redirects user after payment)
                    clientBackUrl: window.location.origin,
                })
            });

            const data = await response.json();
            return data;
        } catch (error: any) {
            console.error('ECPay init failed:', error);
            return { success: false, message: error.message };
        }
    }
};
