
import React from 'react';

const FloatingShape: React.FC<{ size: number; x: number; y: number; duration: number; delay: number; shape: 'circle' | 'square' | 'triangle' }> =
({ size, x, y, duration, delay, shape }) => {
    const style: React.CSSProperties = {
        width: `${size}px`,
        height: `${size}px`,
        left: `${x}%`,
        top: `${y}%`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
    };

    if (shape === 'circle') {
        return <div className="absolute rounded-full bg-blue-500/20 animate-float" style={style}></div>
    }
    if (shape === 'square') {
        return <div className="absolute bg-green-500/20 animate-float" style={style}></div>
    }
    // triangle
    const triangleStyle: React.CSSProperties = {
        ...style,
        width: 0,
        height: 0,
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size}px solid rgb(234 179 8 / 0.2)`, // yellow-500/20
        backgroundColor: 'transparent'
    };
    return <div className="absolute animate-float" style={triangleStyle}></div>
};

const AnimatedPageWrapper: React.FC<{ children: React.ReactNode, fullscreen?: boolean }> = ({ children, fullscreen = false }) => {
    const heightClass = fullscreen ? 'h-screen' : 'h-full';

    return (
        <div className={`relative w-full flex items-center justify-center overflow-hidden bg-gray-900 ${fullscreen ? '' : 'rounded-2xl'} ${heightClass}`}>
             <style>
                {`
                    @keyframes float {
                        0% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-20px) rotate(180deg); }
                        100% { transform: translateY(0px) rotate(360deg); }
                    }
                    .animate-float {
                        animation-name: float;
                        animation-iteration-count: infinite;
                        animation-timing-function: ease-in-out;
                    }
                    @keyframes background-pan {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    .animated-gradient-page {
                        background-size: 200% 200%;
                        background-image: linear-gradient(-45deg, #1a202c, #2d3748, #4a5568, #2d3748);
                        animation: background-pan 15s ease infinite;
                    }
                `}
            </style>

            <div className="absolute inset-0 animated-gradient-page"></div>

            {/* Floating shapes for "Spline" effect */}
            <FloatingShape size={50} x={10} y={20} duration={15} delay={0} shape="circle" />
            <FloatingShape size={80} x={80} y={30} duration={20} delay={2} shape="square" />
            <FloatingShape size={30} x={25} y={70} duration={18} delay={5} shape="triangle" />
            <FloatingShape size={60} x={90} y={80} duration={12} delay={1} shape="circle" />
            <FloatingShape size={40} x={50} y={10} duration={22} delay={3} shape="square" />
            <FloatingShape size={45} x={15} y={85} duration={16} delay={4} shape="triangle" />

            <div className="relative z-10 w-full h-full overflow-y-auto p-1 sm:p-2 md:p-4">
                {children}
            </div>
        </div>
    );
};

export default AnimatedPageWrapper;
