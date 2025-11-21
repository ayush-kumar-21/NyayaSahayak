
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { legalParser } from '../services/legalParser';
import { DocumentAnalysisResult, HistoryItem, QuantumFingerprintResult } from '../types';
import { fileToBase64 } from '../lib/utils';
import Spinner from './common/Spinner';
import { Part } from '@google/genai';
import { gsap } from 'gsap';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface DocumentAnalysisProps {
    t: (key: string) => string;
    logActivity: (type: HistoryItem['type'], details: string) => void;
}

const getEntityColor = (type: string) => {
    switch (type.toUpperCase()) {
        case 'PERSON': return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
        case 'ORGANIZATION': return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
        case 'LOCATION': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
        case 'DATE': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
        default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
};

const DocumentIntegrityView: React.FC<{ t: (key: string) => string; logActivity: (type: HistoryItem['type'], details: string) => void; }> = ({ t, logActivity }) => {
    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationResult, setGenerationResult] = useState<QuantumFingerprintResult | null>(null);
    const [statusText, setStatusText] = useState('');
    const [contentToGenerate, setContentToGenerate] = useState('');
    const [genFiles, setGenFiles] = useState<File[]>([]);
    
    // Verification State
    const [isVerifying, setIsVerifying] = useState(false);
    const [hashToVerify, setHashToVerify] = useState('');
    const [contentToVerify, setContentToVerify] = useState('');
    const [verifyFiles, setVerifyFiles] = useState<File[]>([]);
    const [verificationResult, setVerificationResult] = useState<'match' | 'mismatch' | 'error' | null>(null);

    const statusRef = useRef(null);
    const resultRef = useRef(null);
    const genFileInputRef = useRef<HTMLInputElement>(null);
    const verifyFileInputRef = useRef<HTMLInputElement>(null);

    const handleGenFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setGenFiles(prev => [...prev, ...Array.from(e.target.files || [])]); };
    const removeGenFile = (n: string) => setGenFiles(f => f.filter(x => x.name !== n));
    
    const handleVerifyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setVerifyFiles(prev => [...prev, ...Array.from(e.target.files || [])]); };
    const removeVerifyFile = (n: string) => setVerifyFiles(f => f.filter(x => x.name !== n));

    const handleGenerate = async () => {
        if (!contentToGenerate && genFiles.length === 0) return;
        setIsGenerating(true); setGenerationResult(null);
        
        const statusTimeline = gsap.timeline({
            onComplete: async () => {
                try {
                    let payload: string | Part[] = contentToGenerate;
                    if (genFiles.length > 0) {
                        const fileParts = await Promise.all(genFiles.map(async f => ({ inlineData: { mimeType: f.type, data: await fileToBase64(f) } })));
                        if (contentToGenerate) {
                            fileParts.push({ text: contentToGenerate } as any);
                        }
                        payload = fileParts;
                    }

                    const apiResult = await geminiService.generateQuantumFingerprint(payload, 'en');
                    setGenerationResult(apiResult);
                    logActivity('QUANTUM_FINGERPRINT_GENERATED', t('history_quantum_fingerprinted_generic'));
                } catch (error) { console.error(error); } finally { setIsGenerating(false); setStatusText(''); }
            }
        });
        ["Initializing quantum state...", "Entangling qubits...", "Finalizing report..."].forEach((status) => {
            statusTimeline.to(statusRef.current, { duration: 0.1, onStart: () => setStatusText(status) }).to(statusRef.current, { duration: 1.5 });
        });
    };
    
    const handleVerify = async () => {
        if (!hashToVerify || (!contentToVerify && verifyFiles.length === 0)) return;
        setIsVerifying(true); setVerificationResult(null);
        try {
             let payload: string | Part[] = contentToVerify;
             if (verifyFiles.length > 0) {
                const fileParts = await Promise.all(verifyFiles.map(async f => ({ inlineData: { mimeType: f.type, data: await fileToBase64(f) } })));
                if (contentToVerify) {
                    fileParts.push({ text: contentToVerify } as any);
                }
                payload = fileParts;
             }

            const result = await geminiService.generateQuantumFingerprint(payload, 'en');
            if (result && result.quantumHash) {
                const match = result.quantumHash === hashToVerify.trim();
                setVerificationResult(match ? 'match' : 'mismatch');
                logActivity('DOCUMENT_VERIFIED', t('history_document_verified').replace('{result}', match ? 'Match' : 'Mismatch'));
            } else { setVerificationResult('error'); }
        } catch(e) { setVerificationResult('error'); } finally { setIsVerifying(false); }
    };
    
    useEffect(() => { if (generationResult && resultRef.current) gsap.from(resultRef.current, { duration: 0.8, opacity: 0, y: 30, ease: 'power3.out' }); }, [generationResult]);
    
    return (
        <div className="grid lg:grid-cols-2 gap-8 p-4">
            {/* Generate Column */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-8 border border-gray-200 dark:border-gray-700 flex flex-col shadow-xl transition-all hover:shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center justify-center gap-2">
                    <i className="fas fa-fingerprint text-blue-500"></i> {t('generate_fingerprint')}
                </h3>
                
                {/* File Upload Area */}
                <div onClick={() => genFileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-2xl p-8 mb-4 cursor-pointer transition-colors text-center group">
                    <input ref={genFileInputRef} type="file" multiple onChange={handleGenFileChange} className="hidden" />
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <i className="fas fa-cloud-upload-alt text-2xl text-gray-400 group-hover:text-blue-500 transition-colors"></i>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('drag_and_drop_browse')}</p>
                </div>
                {genFiles.length > 0 && (
                     <div className="mb-4 space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {genFiles.map(f => (
                            <div key={f.name} className="flex justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl text-sm items-center border border-gray-100 dark:border-gray-600">
                                <span className="text-gray-700 dark:text-gray-200 truncate">{f.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); removeGenFile(f.name); }} className="text-gray-400 hover:text-red-500 transition-colors"><i className="fas fa-times"></i></button>
                            </div>
                        ))}
                     </div>
                )}

                <textarea value={contentToGenerate} onChange={(e) => setContentToGenerate(e.target.value)} rows={4} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-sm mb-4 placeholder-gray-400 transition-all" placeholder={t('paste_content_for_fingerprint')} />
                
                <button onClick={handleGenerate} disabled={isGenerating || (!contentToGenerate && genFiles.length === 0)} className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed mt-auto shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5">
                    {isGenerating ? <Spinner /> : t('generate_fingerprint')}
                </button>
                
                {isGenerating && <p ref={statusRef} className="mt-4 text-center text-blue-600 dark:text-blue-400 font-mono text-sm animate-pulse">{statusText}</p>}
                {generationResult && (
                    <div ref={resultRef} className="mt-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2 tracking-wider">{t('quantum_hash')}</label>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-mono break-all leading-relaxed">{generationResult.quantumHash}</div>
                    </div>
                )}
            </div>
            
            {/* Verify Column */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-8 border border-gray-200 dark:border-gray-700 flex flex-col shadow-xl transition-all hover:shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center flex items-center justify-center gap-2">
                    <i className="fas fa-shield-check text-emerald-500"></i> {t('verify_integrity_title')}
                </h3>
                 <div className="space-y-4 flex-grow">
                    <input value={hashToVerify} onChange={(e) => setHashToVerify(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm placeholder-gray-400 transition-all" placeholder={t('paste_hash_placeholder')} />
                    
                    {/* File Upload Area */}
                    <div onClick={() => verifyFileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-2xl p-6 cursor-pointer transition-colors text-center group">
                        <input ref={verifyFileInputRef} type="file" multiple onChange={handleVerifyFileChange} className="hidden" />
                        <i className="fas fa-cloud-upload-alt text-2xl text-gray-400 group-hover:text-emerald-500 mb-2 transition-colors"></i>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('drag_and_drop_browse')}</p>
                    </div>
                     {verifyFiles.length > 0 && (
                         <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {verifyFiles.map(f => (
                                <div key={f.name} className="flex justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl text-sm items-center border border-gray-100 dark:border-gray-600">
                                    <span className="text-gray-700 dark:text-gray-200 truncate">{f.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); removeVerifyFile(f.name); }} className="text-gray-400 hover:text-red-500 transition-colors"><i className="fas fa-times"></i></button>
                                </div>
                            ))}
                         </div>
                    )}

                    <textarea value={contentToVerify} onChange={(e) => setContentToVerify(e.target.value)} rows={3} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none text-sm placeholder-gray-400 transition-all" placeholder={t('paste_content_placeholder')} />
                 </div>
                 
                 <button onClick={handleVerify} disabled={isVerifying || !hashToVerify || (!contentToVerify && verifyFiles.length === 0)} className="w-full mt-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5">
                     {isVerifying ? <Spinner /> : t('verify_button')}
                 </button>
                 
                 {verificationResult && (
                     <div className={`mt-6 p-4 rounded-xl text-center font-bold border ${
                         verificationResult === 'match' 
                         ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                         : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30'
                     }`}>
                         {verificationResult === 'match' ? (
                             <><i className="fas fa-check-circle mr-2"></i> {t('verification_match')}</>
                         ) : verificationResult === 'mismatch' ? (
                             <><i className="fas fa-times-circle mr-2"></i> {t('verification_mismatch')}</>
                         ) : t('verification_error')}
                     </div>
                 )}
            </div>
        </div>
    );
};

const DocumentAnalysis: React.FC<DocumentAnalysisProps> = ({ t, logActivity }) => {
    const [mode, setMode] = useState<'analysis' | 'integrity'>('analysis');
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
    const [highlightedSummary, setHighlightedSummary] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (selectedFiles: FileList | null) => { if (selectedFiles) setFiles(prev => [...prev, ...Array.from(selectedFiles)]); };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files);
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); };
    const handleDragEvents = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(e.type !== 'dragleave'); };
    const removeFile = (n: string) => setFiles(f => f.filter(x => x.name !== n));
    const handleAnalyze = useCallback(async () => {
        if (files.length === 0) return;
        setIsLoading(true); setResult(null); setHighlightedSummary('');
        try {
            const fileParts = await Promise.all(files.map(async f => ({ inlineData: { mimeType: f.type, data: await fileToBase64(f) } })));
            const res = await geminiService.analyzeDocuments(fileParts);
            setResult(res);
            if (res.summary) {
                setHighlightedSummary(legalParser.highlightLegalTerms(res.summary));
                logActivity('DOCUMENT_ANALYZED', t('history_doc_analyzed').replace('{files}', files.map(f => f.name).join(', ')));
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [files, t, logActivity]);
    
    return (
        <AnimatedPageWrapper>
            <div className="max-w-7xl mx-auto h-full flex flex-col">
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white tracking-tight">{t('tab_document_analysis')}</h2>
                
                <div className="flex justify-center mb-8">
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded-2xl inline-flex border border-gray-200 dark:border-gray-700 shadow-sm">
                        <button onClick={() => setMode('analysis')} className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${mode === 'analysis' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{t('doc_analysis_mode_analysis')}</button>
                        <button onClick={() => setMode('integrity')} className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${mode === 'integrity' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{t('doc_analysis_mode_integrity')}</button>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                {mode === 'analysis' ? (
                    <div className="space-y-8 p-4">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-10 text-center border border-gray-200 dark:border-gray-700 shadow-xl transition-all">
                            <div
                                onDragEnter={handleDragEvents} onDragOver={handleDragEvents} onDragLeave={handleDragEvents} onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-300 group ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            >
                                <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 group-hover:text-blue-500 transition-colors"></i>
                                </div>
                                <p className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('drag_and_drop')}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('or_click_to_browse')}</p>
                            </div>
                            {files.length > 0 && (
                                <div className="mt-6 grid gap-3 max-w-2xl mx-auto">
                                    {files.map((file) => (
                                        <div key={file.name} className="flex items-center justify-between bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <i className="fas fa-file-alt"></i>
                                                </div>
                                                <span className="text-sm font-medium text-gray-800 dark:text-white truncate">{file.name}</span>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); removeFile(file.name); }} className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all"><i className="fas fa-times"></i></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button onClick={handleAnalyze} disabled={isLoading || files.length === 0} className="mt-8 px-10 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 transform hover:-translate-y-1">
                                {isLoading ? <Spinner /> : t('analyze_documents')}
                            </button>
                        </div>

                        {result && (
                            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-200 dark:border-gray-700 animate-fade-in-up shadow-2xl">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">{t('severity')}</p>
                                        <p className={`text-2xl font-bold ${result.severity === 'High' ? 'text-red-600 dark:text-red-400' : result.severity === 'Medium' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{result.severity}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">{t('confidence_score')}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(result.confidenceScore * 100).toFixed(0)}%</p>
                                            <div className="h-1.5 flex-grow bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{width: `${result.confidenceScore * 100}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">{t('recommended_court')}</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{result.recommendedCourt}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><i className="fas fa-align-left text-blue-500"></i> {t('summary')}</h4>
                                        <div className="prose prose-lg prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightedSummary }}></div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-white uppercase mb-4 tracking-wide">{t('key_legal_issues')}</h4>
                                            <ul className="space-y-3">
                                                {result.keyLegalIssues.map((issue, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                        <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 shadow-sm shadow-blue-500/50"></span>
                                                        {issue}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-white uppercase mb-4 tracking-wide">{t('identified_entities')}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {result.identifiedEntities.map((entity, i) => (
                                                    <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm ${getEntityColor(entity.type)}`}>{entity.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <DocumentIntegrityView t={t} logActivity={logActivity} />
                )}
                </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default DocumentAnalysis;
