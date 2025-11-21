
import React, { useState } from 'react';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';
import { User } from '../types';

interface SignInProps {
    onSignIn: (user: User) => void;
    t: (key: string) => string;
}

const SignIn: React.FC<SignInProps> = ({ onSignIn, t }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleGoogleSignIn = () => {
        // Simulate Google sign-in with a mock user
        onSignIn({ email: 'user.google@example.com' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }
        
        // Mock user database in localStorage
        const users = JSON.parse(localStorage.getItem('nyaya:users') || '{}');

        if (isSignUp) {
            if (users[email]) {
                setError('User with this email already exists.');
                return;
            }
            users[email] = { password }; // In a real app, hash the password
            localStorage.setItem('nyaya:users', JSON.stringify(users));
            onSignIn({ email });
        } else {
            if (!users[email] || users[email].password !== password) {
                setError('Invalid email or password.');
                return;
            }
            onSignIn({ email });
        }
    };
    
    return (
        <AnimatedPageWrapper fullscreen={true}>
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className="relative z-10 text-center p-8 sm:p-12 bg-white/80 dark:bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/50 dark:border-white/10 shadow-2xl max-w-md w-full transition-colors">
                    <div className="flex justify-center mb-8">
                        <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/30">
                            <i className="fas fa-balance-scale text-4xl text-white"></i>
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">{t('header_title')}</h1>
                    <p className="text-base text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        {t('about_desc')}
                    </p>

                    {/* Form for Email/Password */}
                    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('email_address')}
                            className="w-full px-5 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
                        />
                         <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('password')}
                            className="w-full px-5 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
                        />
                        {error && <p className="text-red-500 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-0.5">
                            {isSignUp ? t('create_account') : t('sign_in_prompt').split('? ')[1]}
                        </button>
                    </form>
                    
                    <div className="flex items-center my-6">
                        <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700"></div>
                        <span className="mx-4 text-xs text-gray-400 font-bold uppercase tracking-wider">OR</span>
                        <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                    
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-white font-semibold py-3.5 px-6 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 flex items-center justify-center gap-3 text-sm transform hover:-translate-y-0.5"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.1 6.29C12.09 13.92 17.54 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.66 27.99c-.5-1.5-.78-3.13-.78-4.83s.28-3.33.78-4.83l-8.1-6.29C.94 16.6 0 20.2 0 24s.94 7.4 2.56 11.11l8.1-6.29z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.45 0-11.9-4.42-13.82-10.31l-8.1 6.29C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        {t('sign_in_with_google')}
                    </button>

                    <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline mt-8 transition-colors">
                        {isSignUp ? t('sign_in_prompt') : t('sign_up_prompt')}
                    </button>
                    
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-6">
                        {t('by_signing_in')}
                    </p>
                </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default SignIn;
