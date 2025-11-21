
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SignIn from './components/SignIn';
import CaseIntakeTriage from './components/CaseIntakeTriage';
import DocumentAnalysis from './components/DocumentAnalysis';
import Nyayabot from './components/Nyaayabot';
import LegalTechHub from './components/LegalTechHub';
import CaseRelationshipMapper from './components/CaseRelationshipMapper';
import JusticeTimeline from './components/JusticeTimeline';
import JudicialWellness from './components/JudicialWellness';
import LitigantHappiness from './components/LitigantHappiness';
import About from './components/About';
import History from './components/History';
import NetworkBackground from './components/common/NetworkBackground';
import { useLocalization, Language } from './hooks/useLocalization';
import { getMockCases } from './constants/mockData';
import { Case, User, ChatMessage, HistoryItem } from './types';

const App: React.FC = () => {
    // --- Authentication and User State ---
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('currentUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    // --- Global Application State ---
    const [activeTab, setActiveTab] = useState('About');
    const [language, setLanguage] = useState<Language>('en');
    const { t } = useLocalization(language);
    
    // --- Theme State ---
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (localStorage.getItem('theme')) {
            return localStorage.getItem('theme') as 'light' | 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // --- User-Specific Data State ---
    const [allCases, setAllCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [activityHistory, setActivityHistory] = useState<HistoryItem[]>([]);

    // --- Judicial Wellness Timer State ---
    const [breakTime, setBreakTime] = useState(2 * 60 * 60); // 2 hours in seconds
    const [isBreakTimerRunning, setIsBreakTimerRunning] = useState(false);
    
    // --- Data Loading Effect ---
    useEffect(() => {
        if (currentUser) {
            // Load user-specific data from localStorage
            const userCases = JSON.parse(localStorage.getItem(`nyaya:cases:${currentUser.email}`) || '[]');
            const mockCases = getMockCases(language);
            const combinedCases = [...mockCases, ...userCases];
            setAllCases(combinedCases);

            const userChatHistory = JSON.parse(localStorage.getItem(`nyaya:chatHistory:${currentUser.email}`) || '[]');
            setChatHistory(userChatHistory.length > 0 ? userChatHistory : [{ role: 'model', content: t('nyayabot_welcome') }]);

            const userActivityHistory = JSON.parse(localStorage.getItem(`nyaya:history:${currentUser.email}`) || '[]');
            setActivityHistory(userActivityHistory);
            
            // Set default selected case
            setSelectedCase(combinedCases[0] || null);
        } else {
            // Clear data when logged out
            setAllCases([]);
            setSelectedCase(null);
            setChatHistory([]);
            setActivityHistory([]);
        }
    }, [currentUser, language, t]);


    // --- Data Persistence Effects ---
    useEffect(() => {
        if (currentUser) {
             const userCases = allCases.filter(c => c.userId === currentUser.email);
             localStorage.setItem(`nyaya:cases:${currentUser.email}`, JSON.stringify(userCases));
        }
    }, [allCases, currentUser]);
    
    useEffect(() => {
        if (currentUser) {
            // If we have more than just the welcome message, save it.
            // If it's just the welcome message (or empty), we treat it as "cleared" and remove from storage.
            if (chatHistory.length > 1) {
                localStorage.setItem(`nyaya:chatHistory:${currentUser.email}`, JSON.stringify(chatHistory));
            } else if (chatHistory.length <= 1) {
                 // Double check it's a model message or empty
                 const isReset = chatHistory.length === 0 || (chatHistory.length === 1 && chatHistory[0].role === 'model');
                 if (isReset) {
                     localStorage.removeItem(`nyaya:chatHistory:${currentUser.email}`);
                 }
            }
        }
    }, [chatHistory, currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`nyaya:history:${currentUser.email}`, JSON.stringify(activityHistory));
        }
    }, [activityHistory, currentUser]);


    // --- Core Logic Functions ---
    const logActivity = (type: HistoryItem['type'], details: string) => {
        const newHistoryItem: HistoryItem = {
            id: new Date().toISOString() + Math.random(),
            timestamp: new Date().toISOString(),
            type,
            details,
        };
        setActivityHistory(prev => [newHistoryItem, ...prev]);
    };

    const clearActivityHistory = () => {
        setActivityHistory([]);
    };

    const handleSignIn = (user: User) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        setCurrentUser(user);
    };

    const handleSignOut = () => {
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
        setActiveTab('About');
    };

    const handleSetChatHistory = (history: ChatMessage[]) => {
        setChatHistory(history);
        // Only log if it's a user message addition, not a clear or system reset
        if (history.length > chatHistory.length) {
            const lastMessage = history[history.length - 1];
            if (lastMessage && lastMessage.role === 'user') {
                logActivity('CHAT_MESSAGE', `Sent message: "${lastMessage.content.substring(0, 30)}..."`);
            }
        }
    };
    
    // Timer Logic
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        if (isBreakTimerRunning && breakTime > 0) {
            timer = setTimeout(() => setBreakTime(prev => prev - 1), 1000);
        } else if (breakTime === 0) {
            alert(t('break_time_alert'));
            setIsBreakTimerRunning(false);
            setBreakTime(2 * 60 * 60);
        }
        return () => { if (timer) clearTimeout(timer); };
    }, [isBreakTimerRunning, breakTime, t]);

    // --- Content Rendering ---
    const renderContent = () => {
        switch (activeTab) {
            case 'Case Triage':
                return <CaseIntakeTriage 
                            t={t} 
                            allCases={allCases}
                            setAllCases={setAllCases}
                            selectedCase={selectedCase} 
                            setSelectedCase={setSelectedCase} 
                            language={language} 
                            currentUser={currentUser!}
                            logActivity={logActivity}
                        />;
            case 'Document Analysis':
                return <DocumentAnalysis t={t} logActivity={logActivity} />;
            case 'NYAYABOT':
                return <Nyayabot t={t} messages={chatHistory} setMessages={handleSetChatHistory} currentUser={currentUser!} />;
            case 'Legal Tech Hub':
                return <LegalTechHub t={t} />;
            case 'Case Maps':
                return <CaseRelationshipMapper t={t} selectedCase={selectedCase} />;
            case 'Justice Timeline':
                return <JusticeTimeline t={t} selectedCase={selectedCase} language={language} />;
            case 'Judicial Wellness':
                return <JudicialWellness 
                            t={t} 
                            breakTime={breakTime} 
                            setBreakTime={setBreakTime}
                            isBreakTimerRunning={isBreakTimerRunning} 
                            setIsBreakTimerRunning={setIsBreakTimerRunning} 
                        />;
            case 'Litigant Happiness':
                return <LitigantHappiness t={t} />;
            case 'History':
                return <History t={t} history={activityHistory} onClearHistory={clearActivityHistory} />;
            case 'About':
            default:
                return <About t={t} />;
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-300 relative selection:bg-blue-500 selection:text-white">
            {/* Persistent 3D Network Background */}
            <NetworkBackground />

            {currentUser ? (
                 <>
                    <div className="z-20 relative">
                        <Header 
                            activeTab={activeTab} 
                            setActiveTab={setActiveTab} 
                            language={language} 
                            setLanguage={setLanguage} 
                            t={t}
                            onSignOut={handleSignOut}
                            theme={theme}
                            toggleTheme={toggleTheme}
                        />
                    </div>
                    <main key={activeTab} className="flex-grow p-4 overflow-y-auto relative z-10">
                        {renderContent()}
                    </main>
                 </>
            ) : (
                <div className="relative z-10 w-full h-full">
                     <SignIn onSignIn={handleSignIn} t={t} />
                </div>
            )}
        </div>
    );
};

export default App;
