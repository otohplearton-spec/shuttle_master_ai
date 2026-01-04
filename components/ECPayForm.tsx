import React, { useEffect, useRef } from 'react';

// Use a flexible index signature since GAS returns many different ECPay params
export interface ECPayPaymentData {
    actionUrl: string; // The URL to submit to
    [key: string]: string | number; // All other ECPay params (MerchantID, PaymentType, etc.)
}

interface ECPayFormProps {
    paymentData: ECPayPaymentData;
}

const ECPayForm: React.FC<ECPayFormProps> = ({ paymentData }) => {
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (paymentData && formRef.current) {
            console.log("Submitting ECPay Form...", paymentData);
            formRef.current.submit();
        }
    }, [paymentData]);

    if (!paymentData) return null;

    // Destructure actionUrl out, keep the rest as payload
    const { actionUrl, ...payload } = paymentData;

    return (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-lg font-bold text-slate-600">正在轉導至綠界金流...</p>

            <form ref={formRef} method="POST" action={actionUrl} style={{ display: 'none' }}>
                {Object.entries(payload).map(([key, value]) => (
                    <input key={key} type="hidden" name={key} value={value} />
                ))}
            </form>
        </div>
    );
};

export default ECPayForm;
