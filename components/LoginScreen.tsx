import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { lineService } from '../services/lineService';

const GOOGLE_CLIENT_ID = '278653768928-uj8vq1g8bo3q266pd074j27bfjqbbgib.apps.googleusercontent.com';

interface LoginScreenProps {
    onLogin: (user: UserProfile) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [isLoading, setIsLoading] = useState(false);

    // Google Login Handler
    const handleGoogleSuccess = (credentialResponse: any) => {
        if (credentialResponse.credential) {
            try {
                const decoded: any = jwtDecode(credentialResponse.credential);
                console.log('Google User:', decoded);
                const user: UserProfile = {
                    userId: 'google_' + decoded.sub,
                    displayName: decoded.name || decoded.email.split('@')[0],
                    pictureUrl: decoded.picture,
                    isPro: false
                };
                onLogin(user);
            } catch (e) {
                console.error('Google Login Decode Error', e);
            }
        }
    };

    // Use Real LINE Login (LIFF)
    const handleLineLogin = async () => {
        // ... (existing logic)
        setIsLoading(true);
        try {
            const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

            if (isStandalone) {
                const width = 600;
                const height = 700;
                const left = (window.innerWidth - width) / 2;
                const top = (window.innerHeight - height) / 2;
                const popupUrl = window.location.origin + '?line_login_check=true';
                const popup = window.open(popupUrl, 'LINE_LOGIN', `width=${width},height=${height},top=${top},left=${left},status=yes,scrollbars=yes`);
                if (!popup) {
                    lineService.login();
                } else {
                    setTimeout(() => setIsLoading(false), 3000);
                }
            } else {
                lineService.login();
            }
        } catch (error) {
            console.error('Login failed', error);
            setIsLoading(false);
        }
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative">
                    {/* Background Pattern */}
                    <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90"></div>

                    {/* Decorative Circles */}
                    <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white opacity-10 rounded-full"></div>
                    <div className="absolute top-[40px] left-[-40px] w-32 h-32 bg-white opacity-10 rounded-full"></div>

                    <div className="relative pt-12 pb-8 px-6 flex flex-col items-center">
                        {/* Logo / App Icon Placeholder */}
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 z-10">
                            <span className="text-4xl">🏸</span>
                        </div>

                        <h1 className="text-2xl font-black text-slate-800 mb-2">Shuttle Master AI</h1>
                        <p className="text-slate-500 text-sm mb-6 text-center">
                            智能羽球排點系統<br />
                            Smart Badminton Match Scheduler
                        </p>

                        <div className="w-full space-y-4">
                            {/* LINE Login */}
                            <button
                                onClick={handleLineLogin}
                                disabled={isLoading}
                                className="w-full bg-[#06C755] hover:bg-[#05b34c] active:bg-[#04a044] text-white font-bold h-12 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.486 2 2 5.607 2 10.057c0 2.476 1.385 4.69 3.633 6.13-.158.623-.564 1.528-.656 1.751-.091.222-.218.848.497.465.714-.383 3.868-2.183 4.14-2.316.452.127.917.18 1.386.18 5.514 0 10-3.606 10-8.057C21 5.607 16.514 2 12 2zm.725 10.744h-5.26c-.237 0-.43-.193-.43-.43V6.628c0-.237.193-.43.43-.43.237 0 .43.193.43.43v5.046h4.83c.237 0 .43.193.43.43 0 .237-.193.43-.43.43zm2.083 0c-.237 0-.43-.193-.43-.43V6.628c0-.237.193-.43.43-.43.237 0 .43.193.43.43v5.686c0 .237-.193.43-.43.43zm2.593 0h-1.332c-.015 0-.028-.002-.043-.005l-.012.005c-.237 0-.43-.193-.43-.43V6.628c0-.237.193-.43.43-.43.085 0 .166.026.234.07l.012-.006 1.776 2.427V6.628c0-.237.193-.43.43-.43.237 0 .43.193.43.43v5.686c0 .237-.193.43-.43.43-.085 0-.166-.026-.234-.07l-.012.006-1.776-2.427v2.064c0 .237-.193.43-.43.43zm4.569 0h-4.83c-.237 0-.43-.193-.43-.43 0-.237.193-.43.43-.43h4.4v-2.07h-4.4c-.237 0-.43-.193-.43-.43 0-.237.193-.43.43-.43h4.4V6.628c0-.237.193-.43.43-.43.237 0 .43.193.43.43v5.686c0 .237-.193.43-.43.43z" />
                                        </svg>
                                        Log in with LINE
                                    </>
                                )}
                            </button>

                            {/* Google Login Button */}
                            <div className="flex justify-center w-full">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => {
                                        console.log('Google Login Failed');
                                        alert('Google Login Failed');
                                    }}
                                    theme="filled_blue"
                                    size="large"
                                    shape="circle"
                                    width="320"
                                />
                            </div>

                            <p className="text-[10px] text-slate-400 text-center mt-4 mb-2">
                                By logging in, you agree to our Terms of Service <br /> and Privacy Policy.
                            </p>

                            {/* Guest Login Button */}
                            <button
                                onClick={() => {
                                    setIsLoading(true);
                                    setTimeout(() => {
                                        const guestUser: UserProfile = {
                                            userId: 'guest_' + new Date().getTime(),
                                            displayName: '訪客試用',
                                            pictureUrl: '',
                                            isPro: false
                                        };
                                        onLogin(guestUser);
                                        setIsLoading(false);
                                    }, 500);
                                }}
                                disabled={isLoading}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold h-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-70 group"
                            >
                                <span className="mr-2">👻</span>
                                免註冊試用 (Guest Mode)
                            </button>

                            {/* iOS PWA Fallback */}
                            <div className="mt-8 border-t border-slate-100 pt-6">
                                <button
                                    onClick={() => {
                                        const key = prompt('請貼上「登入金鑰」 (JSON格式)');
                                        if (key) {
                                            try {
                                                const user = JSON.parse(key);
                                                if (user && user.userId) {
                                                    onLogin(user);
                                                } else {
                                                    alert('金鑰格式錯誤');
                                                }
                                            } catch (e) {
                                                alert('無效的金鑰');
                                            }
                                        }
                                    }}
                                    className="text-slate-400 text-xs font-bold underline hover:text-indigo-600 transition-colors w-full text-center"
                                >
                                    iOS PWA 無法自動返回？點此手動登入
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer info */}
                    <div className="bg-slate-50 p-4 border-t border-slate-100 text-center space-y-1">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Contact Us: <a href="mailto:shuttlemasterai@outlook.com" className="hover:text-indigo-600 transition-colors">shuttlemasterai@outlook.com</a>
                        </p>
                        <p className="text-[10px] text-slate-400">Version 1.2.3 • Smart Scheduler</p>
                    </div>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};

export default LoginScreen;
