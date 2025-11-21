
import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

const AnimatedPageWrapper: React.FC<{ children: React.ReactNode, fullscreen?: boolean }> = ({ children, fullscreen = false }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    // Smooth Entry Animation
    useLayoutEffect(() => {
        if (contentRef.current) {
            const tl = gsap.timeline();

            // Initial State: Slightly scaled down, blurred, and shifted down
            tl.set(contentRef.current, {
                autoAlpha: 0,
                scale: 0.95,
                filter: "blur(8px)",
                y: 15
            });

            // Animation to Final State
            tl.to(contentRef.current, {
                duration: 0.6,
                scale: 1,
                y: 0,
                autoAlpha: 1,
                filter: "blur(0px)",
                ease: "power2.out",
                clearProps: "all" 
            });
        }
    }, []);

    return (
        <div className={`relative w-full h-full ${fullscreen ? '' : 'rounded-2xl'} overflow-hidden`}>
            {/* Background Gradient Overlay: Provides depth and ensures text readability over the network background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/60 to-white/90 dark:from-gray-900/30 dark:via-gray-900/60 dark:to-gray-900/90 z-0 pointer-events-none transition-colors duration-500"></div>

            {/* Content Container */}
            <div 
                ref={contentRef} 
                className="relative z-10 w-full h-full overflow-y-auto hide-scrollbar p-1 sm:p-2"
            >
                {children}
            </div>
        </div>
    );
};

export default AnimatedPageWrapper;
