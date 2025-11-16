
import React from 'react';
import { HistoryItem } from '../types';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface HistoryProps {
    t: (key: string) => string;
    history: HistoryItem[];
}

const History: React.FC<HistoryProps> = ({ t, history }) => {
    
    const getHistoryIcon = (type: HistoryItem['type']) => {
        switch (type) {
            case 'CASE_CREATED':
                return 'fa-gavel text-green-400';
            case 'DOCUMENT_ANALYZED':
                return 'fa-file-alt text-blue-400';
            case 'CHAT_MESSAGE':
                return 'fa-comment-dots text-purple-400';
            case 'ARGUMENT_ANALYZED':
                return 'fa-balance-scale text-yellow-400';
             case 'AUDIO_TRANSCRIBED':
                return 'fa-microphone-alt text-red-400';
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


    return (
        <AnimatedPageWrapper>
            <div className="max-w-4xl mx-auto bg-gray-900/60 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border border-gray-700/50 h-full overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('history_title')}</h2>
                {history.length > 0 ? (
                    <div className="space-y-4">
                        {history.map(item => (
                            <div key={item.id} className="flex items-start p-4 bg-gray-800/70 rounded-xl border border-gray-700">
                                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gray-700 rounded-full mr-4">
                                    <i className={`fas ${getHistoryIcon(item.type)}`}></i>
                                </div>
                                <div className="flex-grow">
                                    <p className="text-gray-200">{item.details}</p>
                                    <p className="text-xs text-gray-400 mt-1">{timeAgo(item.timestamp)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        <i className="fas fa-history text-4xl mb-3"></i>
                        <p>{t('no_history')}</p>
                    </div>
                )}
            </div>
        </AnimatedPageWrapper>
    );
};

export default History;
