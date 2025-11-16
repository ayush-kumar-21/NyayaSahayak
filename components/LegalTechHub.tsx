
import React, { useState, useRef, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import Spinner from './common/Spinner';
import { Part } from '@google/genai';
import { fileToBase64 } from '../lib/utils';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';


interface LegalTechHubProps {
    t: (key: string) => string;
}

const LegalTechHub: React.FC<LegalTechHubProps> = ({ t }) => {
    const [activeTool, setActiveTool] = useState('transcriber');

    const ToolButton: React.FC<{ toolId: string, icon: string, name: string }> = ({ toolId, icon, name }) => (
        <button onClick={() => setActiveTool(toolId)} className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg w-full border ${activeTool === toolId ? 'bg-blue-900/50 border-blue-500' : 'bg-gray-800/60 hover:bg-gray-700/60 border-gray-700'}`}>
            <i className={`fas ${icon} text-3xl mb-2 ${activeTool === toolId ? 'text-blue-400' : 'text-gray-400'}`}></i>
            <span className="text-sm font-medium text-white">{name}</span>
        </button>
    );

    return (
        <AnimatedPageWrapper>
            <div className="max-w-6xl mx-auto h-full flex flex-col">
                 <h2 className="text-2xl font-bold mb-6 text-center text-white flex-shrink-0">{t('tab_legal_tech_hub')}</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 flex-shrink-0">
                    <ToolButton toolId="transcriber" icon="fa-microphone-alt" name={t('tool_audio_transcriber')} />
                    <ToolButton toolId="analyzer" icon="fa-balance-scale-right" name={t('tool_argument_analyzer')} />
                    <ToolButton toolId="tutor" icon="fa-graduation-cap" name={t('tool_ai_tutor')} />
                 </div>
                 <div className="bg-gray-900/60 backdrop-blur-md p-4 md:p-6 rounded-2xl border border-gray-700 flex-grow overflow-y-auto">
                    <div key={activeTool} className="content-animate">
                        {activeTool === 'transcriber' && <AudioTranscriber t={t} />}
                        {activeTool === 'analyzer' && <ArgumentAnalyzer t={t} />}
                        {activeTool === 'tutor' && <AITutor t={t} />}
                    </div>
                 </div>
            </div>
        </AnimatedPageWrapper>
    );
};

// --- Sub-components for each tool ---

const AudioTranscriber: React.FC<{ t: (key: string) => string }> = ({ t }) => {
    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    // File upload state
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // Shared state
    const [transcription, setTranscription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const resetState = () => {
        setTranscription('');
        setAudioBlob(null);
        setUploadedFile(null);
    };

    const handleStartRecording = async () => {
        resetState();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                audioChunksRef.current = [];
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            // Stop all media tracks to release the microphone
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
    };

    const handleTranscribeRecording = async () => {
        if (!audioBlob) return;
        setIsLoading(true);
        setTranscription('');
        try {
            const base64Data = await fileToBase64(new File([audioBlob], "audio.webm", {type: 'audio/webm'}));
            const audioPart: Part = { inlineData: { mimeType: 'audio/webm', data: base64Data }};
            const result = await geminiService.transcribeAudio(audioPart);
            setTranscription(result);
        } catch (error) {
            console.error("Transcription failed:", error);
            setTranscription(t('transcription_error'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            resetState();
            setUploadedFile(file);
        }
    };

    const handleTranscribeFile = async () => {
        if (!uploadedFile) return;
        setIsLoading(true);
        setTranscription('');
        try {
            const base64Data = await fileToBase64(uploadedFile);
            const audioPart: Part = { inlineData: { mimeType: uploadedFile.type, data: base64Data } };
            const result = await geminiService.transcribeAudio(audioPart);
            setTranscription(result);
        } catch (error) {
            console.error("Transcription failed:", error);
            setTranscription(t('transcription_file_error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
             <div>
                <h4 className="text-lg font-semibold mb-3 text-gray-200">{t('option_1_record_audio')}</h4>
                <div className="flex flex-wrap items-center gap-4">
                     <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                        {isRecording ? t('stop_recording') : t('record_audio')}
                    </button>
                    <button onClick={handleTranscribeRecording} disabled={!audioBlob || isLoading} className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                        {t('transcribe_recording')}
                    </button>
                </div>
                 {audioBlob && <p className="text-sm text-gray-400 mt-2">{t('audio_recorded_ready')}</p>}
            </div>

            <hr className="border-gray-700" />

            <div>
                 <h4 className="text-lg font-semibold mb-3 text-gray-200">{t('option_2_upload_audio')}</h4>
                 <div className="flex flex-wrap items-center gap-4">
                    <label className="px-4 py-2 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-700 cursor-pointer transition-colors">
                        {t('upload_audio_file')}
                        <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    <button onClick={handleTranscribeFile} disabled={!uploadedFile || isLoading} className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                        {t('transcribe_file')}
                    </button>
                 </div>
                 {uploadedFile && <p className="text-sm text-gray-400 mt-2">{t('file_selected')}{uploadedFile.name}</p>}
            </div>

            {(isLoading || transcription) && (
                <div className="mt-6">
                    <hr className="border-gray-700 mb-6" />
                    {isLoading ? <Spinner /> : (
                        <div>
                            <h4 className="text-lg font-semibold text-white">{t('transcription')}:</h4>
                            <div className="p-4 bg-gray-800 rounded-xl mt-2 whitespace-pre-wrap border border-gray-700 text-gray-200">{transcription}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface ArgumentAnalysisResult {
    introduction: string;
    strengths: string[];
    weaknesses: string[];
    counterarguments: string[];
    strategicRecommendations: string;
}

const ArgumentAnalyzer: React.FC<{ t: (key: string) => string }> = ({ t }) => {
    const [argument, setArgument] = useState('');
    const [analysis, setAnalysis] = useState<ArgumentAnalysisResult | string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAnalyze = async () => {
        if (!argument) return;
        setIsLoading(true);
        setAnalysis(null);
        try {
            const result = await geminiService.analyzeArgument(argument);
            setAnalysis(result);
        } catch (error) {
            console.error(error);
            setAnalysis(t('analysis_error'));
        } finally {
            setIsLoading(false);
        }
    }

    const renderAnalysis = () => {
        if (typeof analysis === 'string') {
            return <p className="p-3 bg-gray-700 rounded-xl mt-2 whitespace-pre-wrap text-white">{analysis}</p>;
        }
        if (!analysis) return null;

        return (
            <div className="p-4 bg-gray-800 rounded-xl mt-2 space-y-4 border border-gray-700">
                <p className="text-gray-300">{analysis.introduction}</p>
                
                {analysis.strengths?.length > 0 && (
                    <div>
                        <h5 className="font-semibold text-md text-gray-200 border-b border-gray-600 pb-1 mb-2">{t('strengths')}</h5>
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                            {analysis.strengths.map((item, index) => <li key={`strength-${index}`}>{item}</li>)}
                        </ul>
                    </div>
                )}

                {analysis.weaknesses?.length > 0 && (
                     <div>
                        <h5 className="font-semibold text-md text-gray-200 border-b border-gray-600 pb-1 mb-2">{t('weaknesses')}</h5>
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                            {analysis.weaknesses.map((item, index) => <li key={`weakness-${index}`}>{item}</li>)}
                        </ul>
                    </div>
                )}
                
                {analysis.counterarguments?.length > 0 && (
                     <div>
                        <h5 className="font-semibold text-md text-gray-200 border-b border-gray-600 pb-1 mb-2">{t('counterarguments')}</h5>
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                            {analysis.counterarguments.map((item, index) => <li key={`counter-${index}`}>{item}</li>)}
                        </ul>
                    </div>
                )}

                {analysis.strategicRecommendations && (
                    <div>
                        <h5 className="font-semibold text-md text-gray-200 border-b border-gray-600 pb-1 mb-2">{t('strategic_recommendations')}</h5>
                        <p className="mt-1 text-gray-300 whitespace-pre-wrap">{analysis.strategicRecommendations}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <textarea value={argument} onChange={e => setArgument(e.target.value)} rows={8} className="w-full p-2 border rounded-xl bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400" placeholder={t('argument_placeholder')}></textarea>
            <button onClick={handleAnalyze} disabled={!argument || isLoading} className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
                {isLoading ? <Spinner /> : <i className="fas fa-balance-scale"></i>}
                {t('analyze_argument')}
            </button>
            {analysis && (
                 <div>
                    <h3 className="text-lg font-bold text-white mt-4">{t('argument_analysis')}:</h3>
                    {renderAnalysis()}
                </div>
            )}
        </div>
    );
};

const getFileTypeIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'fa-file-image';
    if (fileType.startsWith('audio/')) return 'fa-file-audio';
    if (fileType.startsWith('video/')) return 'fa-file-video';
    if (fileType === 'application/pdf') return 'fa-file-pdf';
    if (fileType.includes('document') || fileType.includes('text')) return 'fa-file-alt';
    return 'fa-file';
};

const AITutor: React.FC<{ t: (key: string) => string }> = ({ t }) => {
    const [caseType, setCaseType] = useState('Civil');
    const [walkthrough, setWalkthrough] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ragFiles, setRagFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGetWalkthrough = async () => {
        setIsLoading(true);
        setWalkthrough('');
        try {
            const fileParts: Part[] = await Promise.all(
                ragFiles.map(async (file) => {
                    const base64Data = await fileToBase64(file);
                    return {
                        inlineData: {
                            mimeType: file.type,
                            data: base64Data,
                        },
                    };
                })
            );
            const result = await geminiService.getProceduralWalkthrough(caseType, fileParts);
            setWalkthrough(result);
        } catch (error) {
            console.error(error);
            setWalkthrough(t('walkthrough_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleFiles = (selectedFiles: FileList | null) => {
        if (selectedFiles) {
            const newFiles = Array.from(selectedFiles);
            setRagFiles(prev => [...prev, ...newFiles.filter(nf => !prev.some(pf => pf.name === nf.name))]);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFiles(event.target.files);
    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); event.stopPropagation();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
    };
    const handleDragEvents = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); event.stopPropagation();
        if (event.type === 'dragenter' || event.type === 'dragover') setIsDragging(true);
        else if (event.type === 'dragleave') setIsDragging(false);
    };
    const removeFile = (fileName: string) => {
        setRagFiles(ragFiles.filter(f => f.name !== fileName));
    };
    
    // Helper to format markdown-like text to HTML for better readability
    const formatWalkthrough = (text: string) => {
        if (!text) return { __html: '' };
        const html = text
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-100">$1</strong>')
            .replace(/^#+\s(.*)/gm, '<h4 class="text-lg font-bold mt-4 mb-2 text-gray-200">$1</h4>')
            .replace(/^\d+\.\s(.*)/gm, '<p class="flex ml-2"><span class="w-8 flex-shrink-0 text-gray-400">$&</span><span>$1</span></p>')
            .replace(/^\*\s(.*)/gm, '<div class="flex items-start ml-4"><span class="mr-2 mt-1 text-gray-400">•</span><span>$1</span></div>')
            .replace(/\n/g, '<br />');
        return { __html: html };
    };

    const caseTypes = ['Civil', 'Criminal', 'Family', 'Corporate'];

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-lg font-semibold mb-2 text-white">{t('personalize_with_docs')}</h4>
                <p className="text-sm text-gray-400 mb-3">{t('personalize_with_docs_desc')}</p>
                <div
                    onDragEnter={handleDragEvents} onDragOver={handleDragEvents} onDragLeave={handleDragEvents} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700/50'}`}
                >
                    <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                    <i className={`fas fa-cloud-upload-alt text-3xl mb-2 transition-colors ${isDragging ? 'text-blue-400' : 'text-gray-400'}`}></i>
                    <p className="font-semibold text-gray-200">{t('drag_and_drop_browse')}</p>
                </div>
                {ragFiles.length > 0 && (
                     <div className="mt-4 space-y-2">
                        {ragFiles.map((file) => (
                             <div key={file.name} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                                 <div className="flex items-center gap-3">
                                    <i className={`fas ${getFileTypeIcon(file.type)} text-blue-400 text-lg`}></i>
                                    <span className="text-sm font-medium text-white">{file.name}</span>
                                 </div>
                                 <button onClick={() => removeFile(file.name)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <i className="fas fa-times-circle"></i>
                                 </button>
                             </div>
                        ))}
                    </div>
                )}
            </div>
             <hr className="border-gray-700"/>
            <div className="flex items-center gap-4">
                <select value={caseType} onChange={e => setCaseType(e.target.value)} className="p-2 border rounded-xl bg-gray-700 border-gray-600 text-white">
                    {caseTypes.map(ct => <option key={ct} value={ct}>{t(`case_type_${ct.toLowerCase()}`)}</option>)}
                </select>
                <button onClick={handleGetWalkthrough} disabled={isLoading} className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2">
                     {isLoading ? <Spinner /> : <i className="fas fa-play"></i>}
                     {t('get_walkthrough')}
                </button>
            </div>
             {(isLoading || walkthrough) && (
                 <div className="mt-4">
                    <h4 className="font-semibold text-lg text-white">{t('case_walkthrough_title',).replace('{caseType}', t(`case_type_${caseType.toLowerCase()}`))}</h4>
                    {isLoading ? <div className="p-4 flex justify-center"><Spinner /></div> : (
                        <div 
                            className="p-4 bg-gray-800 rounded-xl mt-2 text-gray-300 leading-relaxed border border-gray-700"
                            dangerouslySetInnerHTML={formatWalkthrough(walkthrough)}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default LegalTechHub;
