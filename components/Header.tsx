
import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import type { Language } from '../hooks/useLocalization';
import type { Translations } from '../constants/localization';

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof Translations['en']) => string;
    onSignOut: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, language, setLanguage, t, onSignOut, theme, toggleTheme }) => {

    const tabs = [
        t('tab_about'), t('tab_case_triage'), t('tab_document_analysis'), t('tab_nyayabot'), t('tab_legal_tech_hub'),
        t('tab_relationship_mapper'), t('tab_justice_timeline'), t('tab_judicial_wellness'),
        t('tab_litigant_happiness'), t('tab_history')
    ];

    const tabKeyMap: { [key: string]: string } = {
        [t('tab_case_triage')]: 'Case Triage',
        [t('tab_document_analysis')]: 'Document Analysis',
        [t('tab_nyayabot')]: 'NYAYABOT',
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
        { code: 'mr', name: 'मराठी' },
        { code: 'gu', name: 'ગુજરાતી' },
        { code: 'kn', name: 'ಕನ್ನಡ' },
        { code: 'ml', name: 'മലയാളം' },
        { code: 'pa', name: 'ਪੰਜਾਬੀ' },
        { code: 'or', name: 'ଓଡ଼ିଆ' },
        { code: 'sa', name: 'संस्कृतम्' },
        { code: 'ur', name: 'اردو' },
        { code: 'as', name: 'অসমীয়া' },
        { code: 'mai', name: 'मैथिली' },
        { code: 'sat', name: 'संताली' },
        { code: 'ks', name: 'कश्मीरी' },
        { code: 'kok', name: 'कोंकणी' },
        { code: 'sd', name: 'सिंधी' },
        { code: 'doi', name: 'डोगरी' },
        { code: 'mni', name: 'मणिपुरी' },
        { code: 'brx', name: 'बड़ो' },
        { code: 'ne', name: 'नेपाली' },
    ];

    // Refs for animation
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const indicatorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const activeIndex = tabs.findIndex(t => t === realTabName);
        const activeElement = tabsRef.current[activeIndex];
        const indicator = indicatorRef.current;

        if (activeElement && indicator) {
            gsap.to(indicator, {
                x: activeElement.offsetLeft,
                y: activeElement.offsetTop,
                width: activeElement.offsetWidth,
                height: activeElement.offsetHeight,
                duration: 0.6,
                ease: "power3.out",
                overwrite: true
            });
        }
    }, [realTabName, tabs, language]);

    return (
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 z-50 sticky top-0 transition-all duration-300">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-18 py-3">
                    {/* Left: Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-300">
                            <i className="fas fa-balance-scale text-white text-lg"></i>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('header_title')}</h1>
                    </div>
                    
                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                         {/* Theme Toggle */}
                        <button 
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none flex items-center justify-center"
                            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
                        </button>

                        <div className="relative">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as Language)}
                                className="appearance-none bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm font-medium py-2.5 pl-4 pr-10 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all cursor-pointer"
                            >
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                            <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"></i>
                        </div>
                        
                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        
                        <button
                            onClick={onSignOut}
                            className="w-10 h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center"
                            title="Sign Out"
                        >
                            <i className="fas fa-power-off text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-t border-gray-100 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-full px-2 sm:px-4 overflow-x-auto hide-scrollbar">
                    <div className="relative flex w-fit mx-auto space-x-1 py-1.5" ref={containerRef}>
                        {/* Sliding Indicator */}
                        <div 
                            ref={indicatorRef}
                            className="absolute rounded-lg z-0 pointer-events-none shiny-gradient opacity-90"
                            style={{ height: '100%', width: 0, left: 0, top: 0 }}
                        />
                        
                        {tabs.map((tab, index) => {
                            const isActive = realTabName === tab;
                            return (
                                <button
                                    key={tab}
                                    ref={el => { tabsRef.current[index] = el; }}
                                    onClick={() => setActiveTab(tabKeyMap[tab])}
                                    className={`
                                        relative z-10 px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 rounded-lg
                                        ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
                                    `}
                                >
                                    {tab}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
