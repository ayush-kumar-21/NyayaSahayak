
import React, { useState } from 'react';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface AboutProps {
    t: (key: string) => string;
}

const About: React.FC<AboutProps> = ({ t }) => {
    return (
        <AnimatedPageWrapper>
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className="relative z-10 text-center p-8 bg-white/70 dark:bg-black/40 backdrop-blur-lg rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl transition-colors">
                    <i className="fas fa-balance-scale text-6xl text-blue-600 dark:text-blue-400 mb-4"></i>
                    <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">{t('header_title')}</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {t('about_desc')}
                    </p>
                </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default About;
