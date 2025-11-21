
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';
import { useLocalization } from '../hooks/useLocalization';

interface JudicialWellnessProps {
    t: (key: string) => string;
    breakTime: number;
    setBreakTime: React.Dispatch<React.SetStateAction<number>>;
    isBreakTimerRunning: boolean;
    setIsBreakTimerRunning: (isRunning: boolean) => void;
}

const JudicialWellness: React.FC<JudicialWellnessProps> = ({ t, breakTime, setBreakTime, isBreakTimerRunning, setIsBreakTimerRunning }) => {
    const [caseLoad, setCaseLoad] = useState(128);
    const [stressLevel, setStressLevel] = useState(65); // percentage
    
    // Timer input states
    const [customHours, setCustomHours] = useState(0);
    const [customMinutes, setCustomMinutes] = useState(30);
    const [customSeconds, setCustomSeconds] = useState(0);
    
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

    const handleSetTimer = () => {
        const totalSeconds = (customHours * 3600) + (customMinutes * 60) + customSeconds;
        if(totalSeconds > 0) {
            setBreakTime(totalSeconds);
            setIsBreakTimerRunning(false);
        }
    }

    const handleReset = () => {
        setBreakTime(2 * 60 * 60); // Reset to 2 hours default
        setIsBreakTimerRunning(false);
        // Also reset inputs to default suggestion (30 mins)
        setCustomHours(0);
        setCustomMinutes(30);
        setCustomSeconds(0);
    }

    const toggleTimer = () => {
        setIsBreakTimerRunning(!isBreakTimerRunning);
    }

    const inputClass = "w-16 p-2 text-center rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono text-lg";

    return (
        <AnimatedPageWrapper>
            <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
                 <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">{t('tab_judicial_wellness')}</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Case Load Meter */}
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-lg text-center transition-colors">
                        <h3 className="font-semibold text-gray-600 dark:text-gray-400">{t('case_load_meter')}</h3>
                        <p ref={caseLoadRef} className="text-5xl font-bold text-blue-600 dark:text-blue-400 mt-2">0</p>
                        <p className="text-sm text-gray-500 dark:text-gray-300">{t('cases_this_month')}</p>
                    </div>
                    
                    {/* Stress Level */}
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-lg transition-colors">
                        <h3 className="font-semibold text-gray-600 dark:text-gray-400 text-center">{t('estimated_stress_level')}</h3>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mt-4 overflow-hidden">
                             <div 
                                className="bg-gradient-to-r from-green-400 to-red-500 h-4 rounded-full stress-bar"
                                style={{ width: `${stressLevel}%` }}>
                             </div>
                        </div>
                        <p className="text-center text-sm mt-2 text-gray-900 dark:text-white">{getStressLevelText()}</p>
                    </div>

                    {/* Break Reminder */}
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-lg text-center transition-colors">
                        <h3 className="font-semibold text-gray-600 dark:text-gray-400">{t('break_reminder')}</h3>
                        <p className="text-5xl font-mono font-bold text-green-600 dark:text-green-400 mt-2 mb-4">{formatTime(breakTime)}</p>
                        
                        <div className="space-y-4">
                             <div className="flex items-center justify-center gap-2">
                                <button onClick={toggleTimer} className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${isBreakTimerRunning ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}>
                                    {isBreakTimerRunning ? <><i className="fas fa-pause mr-2"></i>{t('pause_timer')}</> : <><i className="fas fa-play mr-2"></i>{t('start_timer')}</>}
                                </button>
                                <button onClick={handleReset} className="px-4 py-2 rounded-lg text-gray-700 dark:text-white bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors" title={t('reset')}>
                                    <i className="fas fa-redo"></i>
                                </button>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">{t('custom_timer_duration')}</p>
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="flex flex-col items-center">
                                            <input 
                                                type="number" 
                                                min="0"
                                                max="23"
                                                value={customHours} 
                                                onChange={(e) => setCustomHours(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                                                className={inputClass}
                                                placeholder="HH"
                                            />
                                            <span className="text-[10px] text-gray-500 mt-1">HH</span>
                                        </div>
                                        <span className="text-2xl font-bold text-gray-400 dark:text-gray-500 pb-5">:</span>
                                        <div className="flex flex-col items-center">
                                            <input 
                                                type="number" 
                                                min="0"
                                                max="59"
                                                value={customMinutes} 
                                                onChange={(e) => setCustomMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                                className={inputClass}
                                                placeholder="MM"
                                            />
                                            <span className="text-[10px] text-gray-500 mt-1">MM</span>
                                        </div>
                                        <span className="text-2xl font-bold text-gray-400 dark:text-gray-500 pb-5">:</span>
                                        <div className="flex flex-col items-center">
                                            <input 
                                                type="number" 
                                                min="0"
                                                max="59"
                                                value={customSeconds} 
                                                onChange={(e) => setCustomSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                                className={inputClass}
                                                placeholder="SS"
                                            />
                                            <span className="text-[10px] text-gray-500 mt-1">SS</span>
                                        </div>
                                    </div>
                                    <button onClick={handleSetTimer} className="w-full px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 font-medium transition-colors">
                                        {t('set')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default JudicialWellness;
