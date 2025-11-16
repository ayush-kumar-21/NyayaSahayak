
import React, { useState, useEffect } from 'react';
import type { Language } from '../hooks/useLocalization';
// FIX: Import Translations type for strong typing of the 't' function prop.
import type { Translations } from '../constants/localization';

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    // FIX: Use a specific key type instead of 'any' for better type safety. This fixes the type inference for the 'tab' variable in the map function.
    t: (key: keyof Translations['en']) => string;
    onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, language, setLanguage, t, onSignOut }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const header = document.querySelector('header');
        if (!header) return;
        const handleScroll = () => {
            if (window.scrollY > 10) {
                header.classList.add('shadow-lg', 'bg-white/80', 'dark:bg-gray-800/80', 'backdrop-blur-lg');
            } else {
                header.classList.remove('shadow-lg', 'bg-white/80', 'dark:bg-gray-800/80', 'backdrop-blur-lg');
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const tabs = [
        t('tab_about'), t('tab_case_triage'), t('tab_document_analysis'), t('tab_nyaaybot'), t('tab_legal_tech_hub'),
        t('tab_relationship_mapper'), t('tab_justice_timeline'), t('tab_judicial_wellness'),
        t('tab_litigant_happiness'), t('tab_history')
    ];

    const tabKeyMap: { [key: string]: string } = {
        [t('tab_case_triage')]: 'Case Triage',
        [t('tab_document_analysis')]: 'Document Analysis',
        [t('tab_nyaaybot')]: 'NYAAYBOT',
        [t('tab_legal_tech_hub')]: 'Legal Tech Hub',
        [t('tab_relationship_mapper')]: 'Case Maps',
        [t('tab_justice_timeline')]: 'Justice Timeline',
        [t('tab_judicial_wellness')]: 'Judicial Wellness',
        [t('tab_litigant_happiness')]: 'Litigant Happiness',
        [t('tab_about')]: 'About',
        [t('tab_history')]: 'History',
    };
    
    const realTabName = Object.keys(tabKeyMap).find(key => tabKeyMap[key] === activeTab) || activeTab;

    const languages: { code: Language; name: string }[] = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'हिन्दी' },
        { code: 'ta', name: 'தமிழ்' },
        { code: 'te', name: 'తెలుగు' },
        { code: 'bn', name: 'বাংলা' },
    ];

    // FIX: Explicitly type NavLink as a React.FC to ensure TypeScript recognizes it as a React component that accepts special props like 'key'.
    const NavLink: React.FC<{ tab: string }> = ({ tab }) => (
        <button
            onClick={() => { setActiveTab(tabKeyMap[tab]); setIsMenuOpen(false); }}
            className={`relative whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                realTabName === tab
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
        >
             {realTabName === tab && (
                <span
                    className="absolute inset-0 bg-blue-600 rounded-lg -z-10"
                    style={{ animation: 'pill-pop 0.3s ease-out' }}
                ></span>
            )}
            <span className="relative z-10">{tab}</span>
        </button>
    );

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40 transition-all duration-300">
            <style>
                {`
                    @keyframes pill-pop {
                        from { transform: scale(0.8); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                `}
            </style>
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <i className="fas fa-balance-scale text-2xl text-blue-600 dark:text-blue-400"></i>
                        <h1 className="text-xl font-bold ml-3 text-gray-800 dark:text-white">{t('header_title')}</h1>
                    </div>
                    <div className="hidden md:flex items-center space-x-1">
                         <div className="flex-shrink-0 overflow-x-auto py-2">
                           <nav className="flex space-x-1">
                             {tabs.map(tab => <NavLink key={tab} tab={tab} />)}
                           </nav>
                         </div>
                    </div>
                    <div className="flex items-center space-x-3">
                         <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as Language)}
                            className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {languages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                         <button
                            onClick={onSignOut}
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                         >
                            <i className="fas fa-sign-out-alt"></i>
                            Sign Out
                         </button>
                        <div className="md:hidden">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                                <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
             {isMenuOpen && (
                <div className="md:hidden">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {tabs.map(tab => <NavLink key={tab} tab={tab} />)}
                        <button
                            onClick={onSignOut}
                            className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                         >
                            <i className="fas fa-sign-out-alt"></i>
                            Sign Out
                         </button>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
