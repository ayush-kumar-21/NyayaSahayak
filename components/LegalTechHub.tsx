
import React, { useState, useRef, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import Spinner from './common/Spinner';
import { Part } from '@google/genai';
import { fileToBase64 } from '../lib/utils';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

interface LegalTechHubProps {
    t: (key: string) => string;
}

const ToolButton: React.FC<{ toolId: string, icon: string, name: string, isActive: boolean, onClick: (id: string) => void }> = ({ toolId, icon, name, isActive, onClick }) => (
    <button 
        onClick={() => onClick(toolId)} 
        className={`
            flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300 w-full h-36 border group relative overflow-hidden
            ${isActive 
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105 z-10' 
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'}
        `}
    >
        {/* Background Effect */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${isActive ? 'bg-white' : 'bg-blue-500'}`}></div>
        
        <div className={`text-4xl mb-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-blue-500'}`}>
             <i className={`fas ${icon}`}></i>
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest text-center transition-colors ${isActive ? 'text-white' : 'group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>{name}</span>
    </button>
);

const LegalTechHub: React.FC<LegalTechHubProps> = ({ t }) => {
    const [activeTool, setActiveTool] = useState('transcriber');

    return (
        <AnimatedPageWrapper>
            <div className="max-w-5xl mx-auto h-full flex flex-col">
                 <h2 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white tracking-tight">{t('tab_legal_tech_hub')}</h2>
                 
                 <div className="grid grid-cols-3 gap-6 mb-8 px-4">
                    <ToolButton toolId="transcriber" icon="fa-microphone-lines" name={t('tool_audio_transcriber')} isActive={activeTool === 'transcriber'} onClick={setActiveTool} />
                    <ToolButton toolId="analyzer" icon="fa-scale-balanced" name={t('tool_argument_analyzer')} isActive={activeTool === 'analyzer'} onClick={setActiveTool} />
                    <ToolButton toolId="tutor" icon="fa-graduation-cap" name={t('tool_ai_tutor')} isActive={activeTool === 'tutor'} onClick={setActiveTool} />
                 </div>
                 
                 <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-3xl p-8 flex-grow overflow-y-auto transition-colors shadow-xl">
                    <div key={activeTool} className="content-animate max-w-3xl mx-auto">
                        {activeTool === 'transcriber' && <AudioTranscriber t={t} />}
                        {activeTool === 'analyzer' && <ArgumentAnalyzer t={t} />}
                        {activeTool === 'tutor' && <AITutor t={t} />}
                    </div>
                 </div>
            </div>
        </AnimatedPageWrapper>
    );
};

const AudioTranscriber: React.FC<{ t: (key: string) => string }> = ({ t }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [transcription, setTranscription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const resetState = () => { setTranscription(''); setAudioBlob(null); setUploadedFile(null); };

    const handleStartRecording = async () => {
        resetState();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = event => { audioChunksRef.current.push(event.data); };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                audioChunksRef.current = [];
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) { console.error("Error accessing microphone:", err); }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
    };

    const handleTranscribeRecording = async () => {
        if (!audioBlob) return;
        setIsLoading(true); setTranscription('');
        try {
            const base64Data = await fileToBase64(new File([audioBlob], "audio.webm", {type: 'audio/webm'}));
            const audioPart: Part = { inlineData: { mimeType: 'audio/webm', data: base64Data }};
            const result = await geminiService.transcribeAudio(audioPart);
            setTranscription(result);
        } catch (error) { setTranscription(t('transcription_error')); } finally { setIsLoading(false); }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) { resetState(); setUploadedFile(file); }
    };

    const handleTranscribeFile = async () => {
        if (!uploadedFile) return;
        setIsLoading(true); setTranscription('');
        try {
            const base64Data = await fileToBase64(uploadedFile);
            const audioPart: Part = { inlineData: { mimeType: uploadedFile.type, data: base64Data } };
            const result = await geminiService.transcribeAudio(audioPart);
            setTranscription(result);
        } catch (error) { setTranscription(t('transcription_file_error')); } finally { setIsLoading(false); }
    };

    return (
        <div className="space-y-8">
             <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest mb-6">{t('option_1_record_audio')}</h4>
                <div className="flex gap-6 items-center">
                     <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-500/40' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-white hover:scale-105'}`}>
                        <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                    </button>
                    {isRecording && <span className="text-red-500 dark:text-red-400 text-sm font-medium animate-pulse">Recording in progress...</span>}
                    {audioBlob && !isRecording && (
                        <button onClick={handleTranscribeRecording} disabled={isLoading} className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                            {t('transcribe_recording')}
                        </button>
                    )}
                </div>
            </div>

            <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50">
                 <h4 className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest mb-6">{t('option_2_upload_audio')}</h4>
                 <div className="flex gap-4 items-center">
                    <label className="px-6 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 cursor-pointer transition-all shadow-sm flex items-center gap-3 text-sm group">
                        <i className="fas fa-cloud-upload-alt text-lg text-gray-400 group-hover:text-blue-500 transition-colors"></i>
                        {uploadedFile ? uploadedFile.name : t('upload_audio_file')}
                        <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    {uploadedFile && (
                        <button onClick={handleTranscribeFile} disabled={isLoading} className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                            {t('transcribe_file')}
                        </button>
                    )}
                 </div>
            </div>

            {(isLoading || transcription) && (
                <div className="mt-8 animate-fade-in-up">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Spinner /></div>
                    ) : (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-md">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{t('transcription')}</h4>
                            <div className="text-gray-800 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{transcription}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface ArgumentAnalysisResult { introduction: string; strengths: string[]; weaknesses: string[]; counterarguments: string[]; strategicRecommendations: string; }

const ArgumentAnalyzer: React.FC<{ t: (key: string) => string }> = ({ t }) => {
    const [argument, setArgument] = useState('');
    const [analysis, setAnalysis] = useState<ArgumentAnalysisResult | string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAnalyze = async () => {
        if (!argument) return;
        setIsLoading(true); setAnalysis(null);
        try {
            const result = await geminiService.analyzeArgument(argument);
            setAnalysis(result);
        } catch (error) { setAnalysis(t('analysis_error')); } finally { setIsLoading(false); }
    }

    const renderAnalysis = () => {
        if (typeof analysis === 'string') return <p className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900">{analysis}</p>;
        if (!analysis) return null;
        return (
            <div className="space-y-6 animate-fade-in-up">
                <p className="text-gray-700 dark:text-gray-300 text-lg italic border-l-4 border-blue-500 pl-6 py-2 bg-blue-50 dark:bg-gray-800/50 rounded-r-xl">{analysis.introduction}</p>
                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                        <h5 className="font-bold text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2"><i className="fas fa-check-circle"></i>{t('strengths')}</h5>
                        <ul className="space-y-2">{analysis.strengths.map((item, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>{item}</li>)}</ul>
                    </div>
                    <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                        <h5 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2"><i className="fas fa-times-circle"></i>{t('weaknesses')}</h5>
                         <ul className="space-y-2">{analysis.weaknesses.map((item, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></span>{item}</li>)}</ul>
                    </div>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h5 className="font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2"><i className="fas fa-chess-knight"></i>{t('strategic_recommendations')}</h5>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{analysis.strategicRecommendations}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
             <textarea value={argument} onChange={e => setArgument(e.target.value)} rows={6} className="w-full p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/50 outline-none text-gray-900 dark:text-white placeholder-gray-400 resize-none transition-all shadow-inner" placeholder={t('argument_placeholder')}></textarea>
            <div className="flex justify-end">
                <button onClick={handleAnalyze} disabled={!argument || isLoading} className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5">
                    {isLoading ? <Spinner /> : t('analyze_argument')}
                </button>
            </div>
            {analysis && <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-8">{renderAnalysis()}</div>}
        </div>
    );
};

const AITutor: React.FC<{ t: (key: string) => string }> = ({ t }) => {
    const [caseType, setCaseType] = useState('Civil');
    const [walkthrough, setWalkthrough] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleGetWalkthrough = async () => {
        setIsLoading(true); setWalkthrough('');
        try { const result = await geminiService.getProceduralWalkthrough(caseType); setWalkthrough(result); } catch (error) { setWalkthrough(t('walkthrough_error')); } finally { setIsLoading(false); }
    };
    const formatWalkthrough = (text: string) => {
        if (!text) return { __html: '' };
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>')
            .replace(/^#+\s(.*)/gm, '<h4 class="text-xl font-bold mt-8 mb-4 text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-gray-700 pb-2">$1</h4>')
            .replace(/^\d+\.\s(.*)/gm, '<div class="flex items-start mt-4 gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl"><span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">$&</span><span class="text-gray-700 dark:text-gray-300 leading-relaxed">$1</span></div>')
            .replace(/^\*\s(.*)/gm, '<div class="ml-12 mt-2 text-gray-600 dark:text-gray-400 text-sm flex items-center gap-2"><span class="w-1 h-1 rounded-full bg-gray-400"></span>$1</div>')
            .replace(/\n/g, ''); // Clean up extra newlines since we are using block elements
        return { __html: html };
    };
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/30 p-6 rounded-2xl border border-gray-200 dark:border-gray-600 transition-colors">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Select Case Type</label>
                    <select value={caseType} onChange={e => setCaseType(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors cursor-pointer">
                        {['Civil', 'Criminal', 'Family', 'Corporate'].map(ct => <option key={ct} value={ct}>{t(`case_type_${ct.toLowerCase()}`)}</option>)}
                    </select>
                </div>
                <button onClick={handleGetWalkthrough} disabled={isLoading} className="px-8 py-3 mt-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:bg-gray-300 dark:disabled:bg-gray-600 shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5">{isLoading ? <Spinner /> : t('get_walkthrough')}</button>
            </div>
             {(isLoading || walkthrough) && (
                 <div className="animate-fade-in-up bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-xl">
                    <h4 className="font-bold text-2xl text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-4 mb-6 flex items-center gap-3">
                        <i className="fas fa-map-signs text-blue-500"></i>
                        {t('case_walkthrough_title',).replace('{caseType}', t(`case_type_${caseType.toLowerCase()}`))}
                    </h4>
                    {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : <div className="prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={formatWalkthrough(walkthrough)} />}
                </div>
            )}
        </div>
    );
};

export default LegalTechHub;
