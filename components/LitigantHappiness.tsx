
import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { mockNpsData } from '../constants/mockData';
import { gsap } from 'gsap';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface LitigantHappinessProps {
    t: (key: string) => string;
}

const LitigantHappiness: React.FC<LitigantHappinessProps> = ({ t }) => {
    const [npsScore, setNpsScore] = useState<number | null>(null);
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const npsScoreRef = useRef(null);
    
    const overallNps = ((mockNpsData[0].value - mockNpsData[2].value) / (mockNpsData[0].value + mockNpsData[1].value + mockNpsData[2].value)) * 100;

    useEffect(() => {
        if(npsScoreRef.current){
             gsap.from(npsScoreRef.current, {
                textContent: 0,
                duration: 2,
                ease: "power1.inOut",
                snap: { textContent: 0.1 },
                onUpdate: function() {
                    if (npsScoreRef.current) {
                        // @ts-ignore
                        npsScoreRef.current.innerHTML = parseFloat(this.targets()[0].textContent).toFixed(1);
                    }
                }
            });
        }
    }, [overallNps]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (npsScore !== null) {
            console.log({ npsScore, feedback });
            setSubmitted(true);
        }
    }

    if(submitted){
        return (
            <AnimatedPageWrapper>
                <div className="w-full h-full flex items-center justify-center">
                    <div className="max-w-4xl mx-auto text-center bg-white/80 dark:bg-gray-800/60 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t('thank_you')}</h2>
                        <p className="text-gray-600 dark:text-gray-200">{t('feedback_submitted_successfully')}</p>
                    </div>
                </div>
            </AnimatedPageWrapper>
        )
    }

    return (
        <AnimatedPageWrapper>
            <div className="max-w-4xl mx-auto flex flex-col justify-center h-full">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">{t('tab_litigant_happiness')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Feedback Form */}
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-lg transition-colors">
                        <h3 className="font-semibold mb-4 text-lg text-gray-900 dark:text-white">{t('submit_feedback')}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">{t('nps_question')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from({ length: 11 }, (_, i) => i).map(score => (
                                        <button
                                            key={score}
                                            type="button"
                                            onClick={() => setNpsScore(score)}
                                            className={`w-10 h-10 rounded-full font-bold transition-all transform hover:scale-110 text-gray-800 ${
                                                npsScore === score 
                                                ? 'bg-blue-500 text-white ring-2 ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-800 ring-blue-500' 
                                                : score <= 6 ? 'bg-red-200 hover:bg-red-300' 
                                                : score <= 8 ? 'bg-yellow-200 hover:bg-yellow-300' 
                                                : 'bg-green-200 hover:bg-green-300'
                                            }`}
                                        >
                                            {score}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="feedback" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t('additional_comments')}</label>
                                <textarea
                                    id="feedback"
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    rows={4}
                                    className="w-full p-2 border rounded-xl bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                                    placeholder={t('share_experience_placeholder')}
                                />
                            </div>
                            <button type="submit" disabled={npsScore === null} className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 transition-colors">
                                {t('submit')}
                            </button>
                        </form>
                    </div>
                    {/* Analytics Panel */}
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-lg transition-colors">
                        <h3 className="font-semibold mb-4 text-lg text-gray-900 dark:text-white">{t('overall_happiness_index')}</h3>
                        <div className="text-center mb-4">
                            <p className="text-gray-500 dark:text-gray-400">{t('net_promoter_score')}</p>
                            <p ref={npsScoreRef} className={`text-5xl font-bold ${overallNps > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                {overallNps.toFixed(1)}
                            </p>
                        </div>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                                <BarChart data={mockNpsData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} tick={{fill: '#9ca3af'}}/>
                                    <Tooltip 
                                        cursor={{fill: 'rgba(200,200,200,0.1)'}} 
                                        contentStyle={{
                                            backgroundColor: 'var(--tooltip-bg)', 
                                            border: '1px solid var(--tooltip-border)',
                                            borderRadius: '8px'
                                        }}
                                        itemStyle={{ color: 'var(--tooltip-text)' }}
                                    />
                                    <Bar dataKey="value" barSize={20} radius={[0, 10, 10, 0]}>
                                        {mockNpsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            {/* Helper to set CSS variables for tooltip */}
                            <style>{`
                                :root { --tooltip-bg: rgba(255, 255, 255, 0.9); --tooltip-border: #e5e7eb; --tooltip-text: #111827; }
                                .dark { --tooltip-bg: rgba(31, 41, 55, 0.9); --tooltip-border: #4b5563; --tooltip-text: #f3f4f6; }
                            `}</style>
                        </div>
                    </div>
                </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default LitigantHappiness;
