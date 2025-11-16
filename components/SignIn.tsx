
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
                <div className="relative z-10 text-center p-8 sm:p-12 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full">
                    <div className="flex justify-center mb-6">
                        <i className="fas fa-balance-scale text-6xl text-blue-400"></i>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">{t('header_title')}</h1>
                    <p className="text-lg text-gray-300 mb-8">
                        {t('about_desc')}
                    </p>

                    {/* Form for Email/Password */}
                    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('email_address')}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/60 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                         <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('password')}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/60 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button type="submit" className="w-full max-w-xs mx-auto bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
                            {isSignUp ? t('create_account') : t('sign_in_prompt').split('? ')[1]}
                        </button>
                    </form>
                    
                    <div className="flex items-center my-6">
                        <hr className="flex-grow border-gray-600"/>
                        <span className="mx-4 text-gray-400">OR</span>
                        <hr className="flex-grow border-gray-600"/>
                    </div>
                    
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full max-w-xs mx-auto bg-white text-gray-800 font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-3 text-lg transform hover:scale-105"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.1 6.29C12.09 13.92 17.54 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.66 27.99c-.5-1.5-.78-3.13-.78-4.83s.28-3.33.78-4.83l-8.1-6.29C.94 16.6 0 20.2 0 24s.94 7.4 2.56 11.11l8.1-6.29z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.45 0-11.9-4.42-13.82-10.31l-8.1 6.29C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        {t('sign_in_with_google')}
                    </button>

                    <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-sm text-blue-400 hover:underline mt-6">
                        {isSignUp ? t('sign_in_prompt') : t('sign_up_prompt')}
                    </button>
                    
                    <p className="text-xs text-gray-500 mt-8">
                        {t('by_signing_in')}
                    </p>
                </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default SignIn;
