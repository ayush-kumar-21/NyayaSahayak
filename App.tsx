
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SignIn from './components/SignIn';
import CaseIntakeTriage from './components/CaseIntakeTriage';
import DocumentAnalysis from './components/DocumentAnalysis';
import Nyaaybot from './components/Nyaaybot';
import LegalTechHub from './components/LegalTechHub';
import CaseRelationshipMapper from './components/CaseRelationshipMapper';
import JusticeTimeline from './components/JusticeTimeline';
import JudicialWellness from './components/JudicialWellness';
import LitigantHappiness from './components/LitigantHappiness';
import About from './components/About';
import History from './components/History';
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
            setChatHistory(userChatHistory.length > 0 ? userChatHistory : [{ role: 'model', content: t('nyaaybot_welcome') }]);

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
    }, [currentUser, language]);


    // --- Data Persistence Effects ---
    useEffect(() => {
        if (currentUser) {
             const userCases = allCases.filter(c => c.userId === currentUser.email);
             localStorage.setItem(`nyaya:cases:${currentUser.email}`, JSON.stringify(userCases));
        }
    }, [allCases, currentUser]);
    
    useEffect(() => {
        if (currentUser && chatHistory.length > 1) { // Don't save initial message
            localStorage.setItem(`nyaya:chatHistory:${currentUser.email}`, JSON.stringify(chatHistory));
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
        const lastMessage = history[history.length - 2]; // User message
        if (lastMessage && lastMessage.role === 'user') {
            logActivity('CHAT_MESSAGE', `Sent message: "${lastMessage.content.substring(0, 30)}..."`);
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
            case 'NYAAYBOT':
                return <Nyaaybot t={t} messages={chatHistory} setMessages={handleSetChatHistory} />;
            case 'Legal Tech Hub':
                return <LegalTechHub t={t} />;
            case 'Case Maps':
                return <CaseRelationshipMapper t={t} selectedCase={selectedCase} />;
            case 'Justice Timeline':
                return <JusticeTimeline t={t} selectedCase={selectedCase} />;
            case 'Judicial Wellness':
                return <JudicialWellness t={t} breakTime={breakTime} isBreakTimerRunning={isBreakTimerRunning} setIsBreakTimerRunning={setIsBreakTimerRunning} />;
            case 'Litigant Happiness':
                return <LitigantHappiness t={t} />;
            case 'History':
                return <History t={t} history={activityHistory} />;
            case 'About':
            default:
                return <About t={t} />;
        }
    };

    if (!currentUser) {
        return <SignIn onSignIn={handleSignIn} t={t} />;
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-hidden">
            <Header 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                language={language} 
                setLanguage={setLanguage} 
                t={t}
                onSignOut={handleSignOut}
            />
            <main key={activeTab} className="flex-grow p-2 sm:p-4 lg:p-6 content-animate overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;
