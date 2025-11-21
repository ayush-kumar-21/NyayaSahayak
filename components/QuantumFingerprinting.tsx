
import React, { useState, useEffect, useRef } from 'react';
import { Case, QuantumFingerprintResult, HistoryItem } from '../types';
import { geminiService } from '../services/geminiService';
import Spinner from './common/Spinner';
import { gsap } from 'gsap';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface QuantumFingerprintingProps {
    t: (key: string) => string;
    selectedCase: Case | null;
    logActivity: (type: HistoryItem['type'], details: string) => void;
}

const QuantumFingerprinting: React.FC<QuantumFingerprintingProps> = ({ t, selectedCase, logActivity }) => {
    // State for generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationResult, setGenerationResult] = useState<QuantumFingerprintResult | null>(null);
    const [statusText, setStatusText] = useState('');
    const statusRef = useRef(null);
    const resultRef = useRef(null);
    
    // State for verification
    const [isVerifying, setIsVerifying] = useState(false);
    const [hashToVerify, setHashToVerify] = useState('');
    const [contentToVerify, setContentToVerify] = useState('');
    const [verificationResult, setVerificationResult] = useState<'match' | 'mismatch' | 'error' | null>(null);


    const handleGenerate = async () => {
        if (!selectedCase) return;
        setIsGenerating(true);
        setGenerationResult(null);

        const statusTimeline = gsap.timeline({
            onComplete: async () => {
                try {
                    const apiResult = await geminiService.generateQuantumFingerprint(selectedCase.summary, 'en');
                    setGenerationResult(apiResult);
                    logActivity('QUANTUM_FINGERPRINT_GENERATED', t('history_quantum_fingerprinted').replace('{caseNumber}', selectedCase.caseNumber));
                } catch (error) {
                    console.error("Fingerprinting failed:", error);
                } finally {
                    setIsGenerating(false);
                    setStatusText('');
                }
            }
        });

        const statuses = ["Initializing quantum state...", "Entangling document data qubits...", "Collapsing superposition to generate hash...", "Finalizing integrity report..."];
        statuses.forEach((status) => {
            statusTimeline.to(statusRef.current, { duration: 0.1, onStart: () => setStatusText(status) }).to(statusRef.current, { duration: 1.5 });
        });
    };
    
    const handleVerify = async () => {
        if (!hashToVerify || !contentToVerify) return;
        setIsVerifying(true);
        setVerificationResult(null);

        try {
            const result = await geminiService.generateQuantumFingerprint(contentToVerify, 'en');
            if (result && result.quantumHash) {
                const match = result.quantumHash === hashToVerify.trim();
                setVerificationResult(match ? 'match' : 'mismatch');
                logActivity('DOCUMENT_VERIFIED', t('history_document_verified').replace('{result}', match ? 'Match' : 'Mismatch'));
            } else {
                 setVerificationResult('error');
            }
        } catch(e) {
            setVerificationResult('error');
            console.error("Verification failed", e);
        } finally {
            setIsVerifying(false);
        }
    };
    
    useEffect(() => {
        if (generationResult && resultRef.current) {
            gsap.from(resultRef.current, { duration: 0.8, opacity: 0, y: 30, ease: 'power3.out' });
        }
    }, [generationResult]);
    
    const VerificationResultDisplay = () => {
        if (!verificationResult) return null;

        const resultInfo = {
            match: {
                text: t('verification_match'),
                icon: 'fa-check-circle',
                color: 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50',
            },
            mismatch: {
                text: t('verification_mismatch'),
                icon: 'fa-exclamation-triangle',
                color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50',
            },
            error: {
                text: t('verification_error'),
                icon: 'fa-times-circle',
                color: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50',
            }
        };
        const currentResult = resultInfo[verificationResult];

        return (
            <div className={`p-4 rounded-lg mt-4 text-center ${currentResult.color}`}>
                <i className={`fas ${currentResult.icon} mr-2`}></i>
                <span className="font-semibold">{currentResult.text}</span>
            </div>
        )
    }

    return (
        <AnimatedPageWrapper>
            <div className="w-full h-full flex items-center justify-center">
                <div className="max-w-3xl w-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden transition-colors">
                    <h2 className="text-2xl font-bold p-4 text-center text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700/50">{t('tab_quantum_fingerprinting')}</h2>
                    <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-4 px-6">{t('quantum_fingerprinting_desc')}</p>
                    
                    <div className="p-4 sm:p-6">
                        {/* Generation Section */}
                        <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-transparent dark:border-none">
                             {!selectedCase ? (
                                <>
                                <i className="fas fa-atom text-4xl text-cyan-600 dark:text-cyan-400 mb-3"></i>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('select_case_for_fingerprint')}</h3>
                                </>
                             ) : (
                                <>
                                <h3 className="text-md font-semibold text-gray-500 dark:text-gray-300">Generate Fingerprint for Case:</h3>
                                <p className="text-lg font-bold text-gray-900 dark:text-white mb-4">{selectedCase.title}</p>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-500 dark:disabled:to-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto shadow-lg hover:shadow-cyan-500/50 transform hover:-translate-y-1"
                                >
                                    {isGenerating ? <Spinner /> : <i className="fas fa-atom"></i>}
                                    {isGenerating ? t('generating_fingerprint') : t('generate_fingerprint')}
                                </button>
                                </>
                             )}
                        </div>

                        {isGenerating && <div className="mt-4 text-center"><p ref={statusRef} className="text-cyan-600 dark:text-cyan-300 font-mono animate-pulse">{statusText}</p></div>}
                        
                        {generationResult && (
                            <div ref={resultRef} className="mt-4 text-left bg-gray-100 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white text-center">{t('quantum_fingerprint_report')}</h4>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">{t('quantum_hash')}</label>
                                    <pre className="p-2 bg-white dark:bg-gray-800 rounded-md mt-1 text-cyan-600 dark:text-cyan-300 text-xs break-all font-mono whitespace-pre-wrap border border-gray-200 dark:border-gray-700"><code>{generationResult.quantumHash}</code></pre>
                                </div>
                            </div>
                        )}
                        
                        {/* Verification Section */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                             <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-4">{t('verify_integrity_title')}</h3>
                             <div className="space-y-4">
                                <textarea
                                    value={hashToVerify}
                                    onChange={(e) => setHashToVerify(e.target.value)}
                                    rows={2}
                                    className="w-full p-2 border rounded-xl bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono text-sm transition-colors"
                                    placeholder={t('paste_hash_placeholder')}
                                />
                                <textarea
                                    value={contentToVerify}
                                    onChange={(e) => setContentToVerify(e.target.value)}
                                    rows={6}
                                    className="w-full p-2 border rounded-xl bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                                    placeholder={t('paste_content_placeholder')}
                                />
                                <button
                                    onClick={handleVerify}
                                    disabled={isVerifying || !hashToVerify || !contentToVerify}
                                    className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {isVerifying ? <Spinner /> : <i className="fas fa-shield-alt"></i>}
                                    {isVerifying ? t('verifying_button') : t('verify_button')}
                                </button>
                             </div>
                             {verificationResult && <VerificationResultDisplay/>}
                        </div>
                    </div>
                </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default QuantumFingerprinting;
