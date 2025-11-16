
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { legalParser } from '../services/legalParser';
// FIX: Import HistoryItem to correctly type the logActivity prop.
import { DocumentAnalysisResult, HistoryItem } from '../types';
import { fileToBase64 } from '../lib/utils';
import Spinner from './common/Spinner';
import { Part } from '@google/genai';
import { gsap } from 'gsap';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

// FIX: Added the `logActivity` prop to fix a type error in App.tsx and to enable logging when documents are analyzed.
interface DocumentAnalysisProps {
    t: (key: string) => string;
    logActivity: (type: HistoryItem['type'], details: string) => void;
}

const getEntityColor = (type: string) => {
    switch (type.toUpperCase()) {
        case 'PERSON':
            return 'bg-blue-900 text-blue-200';
        case 'ORGANIZATION':
            return 'bg-green-900 text-green-200';
        case 'LOCATION':
            return 'bg-purple-900 text-purple-200';
        case 'DATE':
            return 'bg-yellow-900 text-yellow-200';
        default:
            return 'bg-gray-700 text-gray-200';
    }
};

const getEntityIcon = (type: string) => {
    switch (type.toUpperCase()) {
        case 'PERSON':
            return 'fa-user';
        case 'ORGANIZATION':
            return 'fa-building';
        case 'LOCATION':
            return 'fa-map-marker-alt';
        case 'DATE':
            return 'fa-calendar-alt';
        default:
            return 'fa-tag';
    }
};

const getFileTypeIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'fa-file-image';
    if (fileType.startsWith('audio/')) return 'fa-file-audio';
    if (fileType.startsWith('video/')) return 'fa-file-video';
    if (fileType === 'application/pdf') return 'fa-file-pdf';
    if (fileType.includes('document') || fileType.includes('text')) return 'fa-file-alt';
    return 'fa-file';
};

const DocumentAnalysis: React.FC<DocumentAnalysisProps> = ({ t, logActivity }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
    const [highlightedSummary, setHighlightedSummary] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (result) {
            gsap.from('.analysis-result-section > *', {
                duration: 0.5,
                opacity: 0,
                y: 20,
                stagger: 0.1,
                ease: 'power3.out'
            });
        }
    }, [result]);

    const handleFiles = (selectedFiles: FileList | null) => {
        if (selectedFiles) {
            const newFiles = Array.from(selectedFiles);
            setFiles(prev => [...prev, ...newFiles.filter(nf => !prev.some(pf => pf.name === nf.name))]);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFiles(event.target.files);
    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
    };

    const handleDragEvents = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === 'dragenter' || event.type === 'dragover') {
            setIsDragging(true);
        } else if (event.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    const removeFile = (fileName: string) => {
        setFiles(files.filter(f => f.name !== fileName));
    };

    const handleAnalyze = useCallback(async () => {
        if (files.length === 0) return;
        setIsLoading(true);
        setResult(null);
        setHighlightedSummary('');

        try {
            const fileParts: Part[] = await Promise.all(
                files.map(async (file) => {
                    const base64Data = await fileToBase64(file);
                    return {
                        inlineData: {
                            mimeType: file.type,
                            data: base64Data,
                        },
                    };
                })
            );

            const analysisResult = await geminiService.analyzeDocuments(fileParts);
            setResult(analysisResult);
            if (analysisResult && analysisResult.summary) {
                setHighlightedSummary(legalParser.highlightLegalTerms(analysisResult.summary));
                const fileNames = files.map(f => f.name).join(', ');
                logActivity('DOCUMENT_ANALYZED', t('history_doc_analyzed').replace('{files}', fileNames));
            }
        } catch (error) {
            console.error("Error analyzing documents:", error);
        } finally {
            setIsLoading(false);
        }
    }, [files, t, logActivity]);
    
    return (
        <AnimatedPageWrapper>
            <div className="max-w-4xl mx-auto bg-gray-900/60 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border border-gray-700/50 h-full overflow-y-auto">
                <h2 className="text-2xl font-bold mb-2 text-center text-white">{t('tab_document_analysis')}</h2>
                <p className="text-center text-gray-400 mb-6">{t('document_analysis_desc')}</p>
                
                <div className="bg-gray-800/60 p-6 rounded-xl shadow-inner border border-gray-700">
                    <div
                        onDragEnter={handleDragEvents}
                        onDragOver={handleDragEvents}
                        onDragLeave={handleDragEvents}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-900/40' : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700/50'}`}
                    >
                        <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                        <i className={`fas fa-cloud-upload-alt text-4xl mb-3 transition-colors ${isDragging ? 'text-blue-400' : 'text-gray-400'}`}></i>
                        <p className="font-semibold text-gray-200">{t('drag_and_drop')}</p>
                        <p className="text-sm text-gray-400">{t('or_click_to_browse')}</p>
                    </div>

                    {files.length > 0 && (
                         <div className="mt-4 space-y-2">
                            {files.map((file) => (
                                 <div key={file.name} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg animate-fade-in-up">
                                     <div className="flex items-center gap-3">
                                        <i className={`fas ${getFileTypeIcon(file.type)} text-blue-400 text-lg`}></i>
                                        <span className="text-sm font-medium text-gray-200">{file.name}</span>
                                     </div>
                                     <button onClick={() => removeFile(file.name)} className="text-gray-400 hover:text-red-500 transition-colors">
                                        <i className="fas fa-times-circle"></i>
                                     </button>
                                 </div>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || files.length === 0}
                        className="mt-6 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/50 transform hover:-translate-y-0.5"
                    >
                        {isLoading ? <Spinner /> : <i className="fas fa-microscope"></i>}
                        {t('analyze_documents')}
                    </button>
                </div>

                {result && (
                    <div className="mt-6 bg-gray-800/60 p-6 rounded-xl shadow-sm analysis-result-section border border-gray-700">
                        <h3 className="text-xl font-bold mb-4 text-white">{t('analysis_result')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
                            <div className="bg-gray-700 p-3 rounded-xl">
                                <p className="text-sm font-semibold text-gray-400">{t('severity')}</p>
                                <p className="text-lg font-bold text-white">{result.severity}</p>
                            </div>
                            <div className="bg-gray-700 p-3 rounded-xl">
                                <p className="text-sm font-semibold text-gray-400">{t('confidence_score')}</p>
                                <p className="text-lg font-bold text-white">{(result.confidenceScore * 100).toFixed(1)}%</p>
                            </div>
                            <div className="bg-gray-700 p-3 rounded-xl">
                                <p className="text-sm font-semibold text-gray-400">{t('recommended_court')}</p>
                                <p className="text-lg font-bold text-white">{result.recommendedCourt}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                 <h4 className="font-semibold mb-2 text-lg text-white">{t('summary')}</h4>
                                 <div className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightedSummary }}></div>
                            </div>

                            <hr className="border-gray-700"/>

                            {result.keyLegalIssues && result.keyLegalIssues.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 text-lg text-white">{t('key_legal_issues')}</h4>
                                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                                        {result.keyLegalIssues.map((issue, index) => <li key={index}>{issue}</li>)}
                                    </ul>
                                </div>
                            )}
                            
                            {result.identifiedEntities && result.identifiedEntities.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 text-lg text-white">{t('identified_entities')}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {result.identifiedEntities.map((entity, index) => (
                                            <span key={index} className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center ${getEntityColor(entity.type)}`}>
                                                <i className={`fas ${getEntityIcon(entity.type)} mr-1.5`}></i>
                                                {entity.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {result.potentialPrecedents && result.potentialPrecedents.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 text-lg text-white">{t('potential_precedents')}</h4>
                                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                                        {result.potentialPrecedents.map((precedent, index) => <li key={index}>{precedent}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AnimatedPageWrapper>
    );
};

export default DocumentAnalysis;
