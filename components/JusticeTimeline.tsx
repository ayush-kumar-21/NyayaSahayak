
import React, { useEffect, useRef } from 'react';
import { Case } from '../types';
import { gsap } from 'gsap';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface JusticeTimelineProps {
    t: (key: string) => string;
    selectedCase: Case | null;
}

const JusticeTimeline: React.FC<JusticeTimelineProps> = ({ t, selectedCase }) => {
    const timelineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!selectedCase || !timelineRef.current) return;

        const events = timelineRef.current.querySelectorAll('.timeline-event');
        const line = timelineRef.current.querySelector('.timeline-line-path');
        
        gsap.set(events, { opacity: 0, x: -30 });
        if (line) {
            gsap.set(line, { scaleY: 0, transformOrigin: 'top' });
        }

        const tl = gsap.timeline();
        if(line) {
             tl.to(line, {
                scaleY: 1,
                duration: 1,
                ease: 'power2.inOut'
            });
        }
       
        tl.to(events, {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.2,
            ease: 'power3.out'
        }, "-=0.5");

    }, [selectedCase]);

    const renderContent = () => {
        if (!selectedCase) {
            return (
                <div className="flex items-center justify-center h-full text-white">
                    <p>{t('select_case_for_timeline')}</p>
                </div>
            );
        }

        const filingDate = new Date(selectedCase.filingDate);
        const lastHearingDate = new Date(selectedCase.lastHearingDate);
        const today = new Date();
        const duration = Math.round((today.getTime() - filingDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Mock benchmark: 2 years for this case type
        const projectedJudgmentDate = new Date(filingDate);
        projectedJudgmentDate.setFullYear(projectedJudgmentDate.getFullYear() + 2);

        const isDelayed = today > projectedJudgmentDate;

        const timelineEvents = [
            { date: filingDate, title: t('filing_date_title'), icon: 'fa-file-alt' },
            { date: lastHearingDate, title: t('last_hearing_date_title'), icon: 'fa-gavel' },
            { date: projectedJudgmentDate, title: t('projected_judgment_date_title'), icon: 'fa-calendar-check', isProjected: true },
        ].sort((a,b) => a.date.getTime() - b.date.getTime());

        return (
            <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-700">
                <div className="text-center mb-6">
                <p className="text-gray-300">{t('case_duration_so_far')}</p>
                <p className="text-3xl font-bold text-blue-400">{t('days_duration').replace('{count}', duration.toString())}</p>
                {isDelayed && <p className="text-red-400 font-semibold mt-1">{t('potential_delay_detected')}</p>}
                </div>
                <div ref={timelineRef} className="relative ml-4 py-4">
                    <div className="absolute top-0 left-0 h-full w-0.5 bg-gray-600 timeline-line-path"></div>
                    {timelineEvents.map((event, index) => (
                        <div key={index} className="mb-8 flex items-center w-full timeline-event">
                        <div className="absolute -left-4 bg-blue-500 text-white rounded-full h-8 w-8 flex items-center justify-center z-10">
                            <i className={`fas ${event.icon}`}></i>
                        </div>
                        <div className={`ml-10 p-4 rounded-xl w-full text-white ${event.isProjected ? 'bg-yellow-900/50 border-l-4 border-yellow-400' : 'bg-gray-700'}`}>
                            <h4 className="font-semibold">{event.title}</h4>
                            <p className="text-sm text-gray-400">{event.date.toLocaleDateString()}</p>
                        </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }


    return (
        <AnimatedPageWrapper>
            <div className="max-w-3xl mx-auto h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('tab_justice_timeline')}</h2>
                {renderContent()}
            </div>
        </AnimatedPageWrapper>
    );
};

export default JusticeTimeline;
