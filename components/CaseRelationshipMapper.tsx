
import React, { useEffect, useRef } from 'react';
import { Case } from '../types';
import { gsap } from 'gsap';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface CaseRelationshipMapperProps {
    t: (key: string) => string;
    selectedCase: Case | null;
}

const Node: React.FC<{ x: number; y: number; label: string; type: 'case' | 'person' | 'act' | 'type' }> = ({ x, y, label, type }) => {
    const colors = {
        case: 'bg-red-500',
        person: 'bg-blue-500',
        act: 'bg-green-500',
        type: 'bg-yellow-500 text-black',
    };
    return (
        <div
            className={`absolute px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white font-semibold text-xs sm:text-sm shadow-lg ${colors[type]} node`}
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
        >
            {label}
        </div>
    );
};

const Line: React.FC<{ x1: number; y1: number; x2: number; y2: number; }> = ({ x1, y1, x2, y2 }) => {
    return (
        <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: -1 }}>
            <line x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke="rgb(107 114 128)" strokeWidth="2" />
        </svg>
    );
};

const CaseRelationshipMapper: React.FC<CaseRelationshipMapperProps> = ({ t, selectedCase }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!selectedCase || !containerRef.current) return;

        const nodes = containerRef.current.querySelectorAll('.node');
        const lines = containerRef.current.querySelectorAll('svg line');
        
        const length = (line: SVGLineElement) => {
            const x1 = parseFloat(line.getAttribute('x1')!);
            const y1 = parseFloat(line.getAttribute('y1')!);
            const x2 = parseFloat(line.getAttribute('x2')!);
            const y2 = parseFloat(line.getAttribute('y2')!);
            return Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
        }


        gsap.set(nodes, { opacity: 0, scale: 0.5 });
        lines.forEach(line => {
             const l = length(line as SVGLineElement) * 5; // Approximation
             gsap.set(line, { strokeDasharray: l, strokeDashoffset: l });
        });

        const tl = gsap.timeline();
        tl.to(lines, {
            strokeDashoffset: 0,
            duration: 1,
            stagger: 0.2,
            ease: 'power2.inOut'
        }).to(nodes, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: 'back.out(1.7)'
        }, "-=0.5");

    }, [selectedCase]);

    const renderContent = () => {
        if (!selectedCase) {
            return (
                <div className="flex items-center justify-center h-full text-white">
                    <p>{t('select_case_for_map')}</p>
                </div>
            );
        }

        const nodes = {
            case: { x: 50, y: 50, label: selectedCase.caseNumber, type: 'case' as const },
            petitioner: { x: 20, y: 30, label: selectedCase.petitioner, type: 'person' as const },
            respondent: { x: 80, y: 30, label: selectedCase.respondent, type: 'person' as const },
            act1: selectedCase.invokedActs[0] ? { x: 30, y: 75, label: selectedCase.invokedActs[0], type: 'act' as const } : null,
            act2: selectedCase.invokedActs[1] ? { x: 70, y: 75, label: selectedCase.invokedActs[1], type: 'act' as const } : null,
        };
        
        return (
            <div ref={containerRef} className="relative w-full h-full bg-gray-800/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-gray-700">
                {/* Lines */}
                <Line x1={nodes.case.x} y1={nodes.case.y} x2={nodes.petitioner.x} y2={nodes.petitioner.y} />
                <Line x1={nodes.case.x} y1={nodes.case.y} x2={nodes.respondent.x} y2={nodes.respondent.y} />
                {nodes.act1 && <Line x1={nodes.case.x} y1={nodes.case.y} x2={nodes.act1.x} y2={nodes.act1.y} />}
                {nodes.act2 && <Line x1={nodes.case.x} y1={nodes.case.y} x2={nodes.act2.x} y2={nodes.act2.y} />}
                
                {/* Nodes */}
                {Object.values(nodes).map(node => node && <Node key={node.label} {...node} />)}
            </div>
        );
    }
    
    return (
        <AnimatedPageWrapper>
            <div className="max-w-5xl mx-auto h-full flex flex-col">
                 <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('tab_relationship_mapper')}</h2>
                 <div className="flex-grow">
                    {renderContent()}
                 </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default CaseRelationshipMapper;
