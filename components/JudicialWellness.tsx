
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface JudicialWellnessProps {
    t: (key: string) => string;
    breakTime: number;
    isBreakTimerRunning: boolean;
    setIsBreakTimerRunning: (isRunning: boolean) => void;
}

const JudicialWellness: React.FC<JudicialWellnessProps> = ({ t, breakTime, isBreakTimerRunning, setIsBreakTimerRunning }) => {
    const [caseLoad, setCaseLoad] = useState(128);
    const [stressLevel, setStressLevel] = useState(65); // percentage
    
    const caseLoadRef = useRef(null);

    useEffect(() => {
        gsap.to(caseLoadRef.current, {
            textContent: caseLoad,
            duration: 1.5,
            ease: "power1.inOut",
            snap: { textContent: 1 },
        });
        
        gsap.from('.stress-bar', {
            width: '0%',
            duration: 1.5,
            ease: 'power3.out'
        });

    }, [caseLoad, stressLevel]);

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStressLevelText = () => {
        if (stressLevel > 75) return t('stress_high');
        if (stressLevel > 50) return t('stress_moderate');
        return t('stress_low');
    }

    return (
        <AnimatedPageWrapper>
            <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
                 <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('tab_judicial_wellness')}</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Case Load Meter */}
                    <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 p-6 rounded-2xl shadow-lg text-center">
                        <h3 className="font-semibold text-gray-400">{t('case_load_meter')}</h3>
                        <p ref={caseLoadRef} className="text-5xl font-bold text-blue-400 mt-2">0</p>
                        <p className="text-sm text-gray-300">{t('cases_this_month')}</p>
                    </div>
                    
                    {/* Stress Level */}
                    <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 p-6 rounded-2xl shadow-lg">
                        <h3 className="font-semibold text-gray-400 text-center">{t('estimated_stress_level')}</h3>
                        <div className="w-full bg-gray-700 rounded-full h-4 mt-4 overflow-hidden">
                             <div 
                                className="bg-gradient-to-r from-green-400 to-red-500 h-4 rounded-full stress-bar"
                                style={{ width: `${stressLevel}%` }}>
                             </div>
                        </div>
                        <p className="text-center text-sm mt-2 text-white">{getStressLevelText()}</p>
                    </div>

                    {/* Break Reminder */}
                    <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 p-6 rounded-2xl shadow-lg text-center">
                        <h3 className="font-semibold text-gray-400">{t('break_reminder')}</h3>
                        <p className="text-5xl font-mono font-bold text-green-400 mt-2">{formatTime(breakTime)}</p>
                        <button onClick={() => setIsBreakTimerRunning(!isBreakTimerRunning)} className="mt-2 px-4 py-2 text-sm rounded-lg text-white bg-gray-600 hover:bg-gray-500">
                            {isBreakTimerRunning ? t('pause_timer') : t('start_timer')}
                        </button>
                    </div>
                 </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default JudicialWellness;