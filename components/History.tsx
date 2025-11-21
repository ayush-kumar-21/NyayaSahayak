
import React, { useState, useEffect } from 'react';
import { HistoryItem } from '../types';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface HistoryProps {
    t: (key: string) => string;
    history: HistoryItem[];
    onClearHistory: () => void;
}

const History: React.FC<HistoryProps> = ({ t, history, onClearHistory }) => {
    
    const getHistoryIcon = (type: HistoryItem['type']) => {
        switch (type) {
            case 'CASE_CREATED':
                return 'fa-gavel text-green-600 dark:text-green-400';
            case 'DOCUMENT_ANALYZED':
                return 'fa-file-alt text-blue-600 dark:text-blue-400';
            case 'CHAT_MESSAGE':
                return 'fa-comment-dots text-purple-600 dark:text-purple-400';
            case 'ARGUMENT_ANALYZED':
                return 'fa-balance-scale text-yellow-600 dark:text-yellow-400';
             case 'AUDIO_TRANSCRIBED':
                return 'fa-microphone-alt text-red-600 dark:text-red-400';
            case 'QUANTUM_FINGERPRINT_GENERATED':
                return 'fa-atom text-cyan-600 dark:text-cyan-400';
            case 'DOCUMENT_VERIFIED':
                return 'fa-shield-alt text-teal-600 dark:text-teal-400';
            default:
                return 'fa-history text-gray-400';
        }
    };
    
    const timeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " " + (Math.floor(interval) > 1 ? t('years_ago') : t('year_ago'));
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " " + (Math.floor(interval) > 1 ? t('months_ago') : t('month_ago'));
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " " + (Math.floor(interval) > 1 ? t('days_ago') : t('day_ago'));
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " " + (Math.floor(interval) > 1 ? t('hours_ago') : t('hour_ago'));
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " " + (Math.floor(interval) > 1 ? t('minutes_ago') : t('minute_ago'));
        return Math.floor(seconds) + " " + (Math.floor(seconds) > 1 ? t('seconds_ago') : t('second_ago'));
    };

    const handleClear = () => {
        if (window.confirm(t('confirm_clear_history'))) {
            onClearHistory();
        }
    };

    return (
        <AnimatedPageWrapper>
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('history_title')}</h2>
                    {history.length > 0 && (
                        <button 
                            onClick={handleClear}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center"
                        >
                            <i className="fas fa-trash-alt mr-2"></i>
                            {t('clear_history')}
                        </button>
                    )}
                </div>
                
                {history.length > 0 ? (
                    <div className="space-y-4">
                        {history.map(item => (
                            <div key={item.id} className="flex items-start p-4 bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 transition-colors">
                                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full mr-4">
                                    <i className={`fas ${getHistoryIcon(item.type)}`}></i>
                                </div>
                                <div className="flex-grow">
                                    <p className="text-gray-800 dark:text-gray-200">{item.details}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{timeAgo(item.timestamp)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 transition-colors">
                        <i className="fas fa-history text-4xl mb-3"></i>
                        <p>{t('no_history')}</p>
                    </div>
                )}
            </div>
        </AnimatedPageWrapper>
    );
};

export default History;
