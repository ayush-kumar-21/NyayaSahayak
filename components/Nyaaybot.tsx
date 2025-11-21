
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob, Part } from "@google/genai";
import { geminiService } from '../services/geminiService';
import { contentModeration } from '../services/contentModeration';
import { ChatMessage } from '../types';
import Spinner from './common/Spinner';
import { gsap } from 'gsap';
import { fileToBase64 } from '../lib/utils';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

type LiveSession = Awaited<ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>>;

interface NyayabotProps {
    t: (key: string) => string;
    messages: ChatMessage[];
    setMessages: (messages: ChatMessage[]) => void;
}

// Helper functions for Live API audio streaming
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


const Nyayabot: React.FC<NyayabotProps> = ({ t, messages, setMessages }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [ragFiles, setRagFiles] = useState<File[]>([]);
    
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const liveSessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    // stableTranscriptRef holds fully finalized sentences
    const stableTranscriptRef = useRef('');
    // volatileTranscriptRef accumulates chunks (deltas) for the current active sentence
    const volatileTranscriptRef = useRef('');

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            const lastMessage = chatContainerRef.current.lastElementChild;
            if (lastMessage && messages.length > 1) { // Animate only new messages
                gsap.from(lastMessage, {
                    duration: 0.5,
                    opacity: 0,
                    y: 20,
                    ease: 'power3.out'
                });
            }
        }
    }, [messages]);
    
    const handleSend = useCallback(async (text: string) => {
        const userMessage = text.trim();
        if (!userMessage) return;

        if (!contentModeration.check(userMessage)) {
            setMessages([...messages, { role: 'user', content: userMessage }, { role: 'system', content: t('moderation_blocked') }]);
            return;
        }

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

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

            const response = await geminiService.chatWithNyayabot(userMessage, fileParts, newMessages);
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const sources = groundingChunks?.map((chunk: any) => chunk.web.uri);
            
            const modelResponse: ChatMessage = { role: 'model', content: response.text, sources };
            setMessages([...newMessages, modelResponse]);
        } catch (error) {
            console.error("Error chatting with Nyayabot:", error);
            setMessages([...newMessages, { role: 'system', content: t('error_occurred') }]);
        } finally {
            setIsLoading(false);
        }
    }, [ragFiles, t, messages, setMessages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend(input);
        setInput('');
    };

    const stopRecording = useCallback(() => {
        if (!isRecording) return;
        setIsRecording(false);
    
        liveSessionRef.current?.close();
        liveSessionRef.current = null;
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        
        if (scriptProcessorRef.current && inputAudioContextRef.current) {
             scriptProcessorRef.current.disconnect(inputAudioContextRef.current.destination);
             scriptProcessorRef.current = null;
        }
       
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
             inputAudioContextRef.current.close();
             inputAudioContextRef.current = null;
        }

    }, [isRecording]);

    const startRecording = useCallback(async () => {
        setIsRecording(true);
        setInput('');
        stableTranscriptRef.current = '';
        volatileTranscriptRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        const transcription = message.serverContent?.inputTranscription;
                        if (transcription) {
                            const { text, isFinal } = transcription;
                            
                            // Accumulate the incoming delta text into the volatile buffer
                            volatileTranscriptRef.current += text;
                            
                            // Update UI to show stable history + current active sentence
                            setInput(stableTranscriptRef.current + volatileTranscriptRef.current);

                            if (isFinal) {
                                // When final, commit the volatile buffer to stable history
                                stableTranscriptRef.current += volatileTranscriptRef.current + ' ';
                                volatileTranscriptRef.current = '';
                                // Update UI one last time for this segment
                                setInput(stableTranscriptRef.current);
                            }
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setMessages([...messages, { role: 'system', content: t('speech_error') }]);
                        stopRecording();
                    },
                    onclose: (e: CloseEvent) => {
                         if (isRecording) {
                           stopRecording();
                         }
                    },
                },
                config: {
                    inputAudioTranscription: {},
                    responseModalities: [Modality.AUDIO], // Required for Live API
                },
            });

            sessionPromise.then(session => {
                liveSessionRef.current = session;
            }).catch(err => {
                console.error("Failed to connect to live session:", err);
                setMessages([...messages, { role: 'system', content: t('voice_input_error') }]);
                stopRecording();
            });

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setMessages([...messages, { role: 'system', content: t('mic_access_denied') }]);
            setIsRecording(false);
        }
    }, [stopRecording, t, messages, setMessages]);

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };
    
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, [stopRecording]);
    
    const speak = (text: string) => {
        const strippedText = text.replace(/<[^>]*>?/gm, '');
        const utterance = new SpeechSynthesisUtterance(strippedText);
        utterance.lang = 'en-IN';
        window.speechSynthesis.speak(utterance);
    };
    
    const formatBotMessage = (text: string) => {
        if (!text) return { __html: '' };
        let html = text
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            // Headings
            .replace(/^### (.*$)/gim, '<h5 class="font-bold text-lg mt-4 mb-2 text-gray-200">$1</h5>')
            .replace(/^## (.*$)/gim, '<h4 class="font-bold text-xl mt-4 mb-2 text-gray-200">$1</h4>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-100">$1</strong>')
            // Ordered Lists
            .replace(/^(\d+\.)\s(.*)/gm, '<div class="flex items-start mt-1 pl-2"><span class="mr-2 w-6 flex-shrink-0 text-gray-400">$1</span><span class="flex-1">$2</span></div>')
            // Unordered Lists
            .replace(/^\*\s(.*)/gm, '<div class="flex items-start mt-1"><span class="mr-2 mt-1.5 text-blue-400 text-xs">&#9679;</span><span class="flex-1">$1</span></div>')
            // Newlines
            .replace(/\n/g, '<br />');
    
        // Cleanup extra breaks after block elements
        html = html.replace(/(<\/h5>|<\/h4>|<\/div>)<br \/>/g, '$1');
    
        return { __html: html };
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setRagFiles(prev => [...prev, ...Array.from(event.target.files)]);
        }
    };

    const removeFile = (fileName: string) => {
        setRagFiles(files => files.filter(f => f.name !== fileName));
    };

    return (
        <AnimatedPageWrapper>
            <div className="flex flex-col h-full max-w-3xl mx-auto bg-gray-800/60 backdrop-blur-md rounded-2xl shadow-xl border border-gray-700">
                <h2 className="p-4 border-b border-gray-700 text-lg font-bold text-center text-white">{t('tab_nyayabot')}</h2>
                <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                         <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && (
                                <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-balance-scale text-blue-300 text-lg"></i>
                                </div>
                            )}
                           <div className={`px-4 py-3 rounded-2xl max-w-lg ${
                               msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 
                               msg.role === 'model' ? 'bg-gray-700 text-gray-200 rounded-bl-none' : 
                               'bg-red-900/50 text-red-200 text-sm'
                           }`}>
                                {msg.role === 'model' ? (
                                    <div className="leading-relaxed" dangerouslySetInnerHTML={formatBotMessage(msg.content)} />
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}

                                {msg.role === 'model' && msg.content && (
                                    <div className="mt-2">
                                        <button onClick={() => speak(msg.content)} className="text-gray-400 hover:text-gray-200 text-sm">
                                            <i className="fas fa-volume-up"></i>
                                        </button>
                                    </div>
                                )}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-2 border-t pt-2 border-gray-600">
                                        <h4 className="text-xs font-semibold mb-1">{t('sources')}</h4>
                                        {msg.sources.map((source, i) => (
                                            <a href={source} target="_blank" rel="noopener noreferrer" key={i} className="text-xs text-blue-400 block truncate hover:underline">{source}</a>
                                        ))}
                                    </div>
                                )}
                           </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3 justify-start">
                             <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-balance-scale text-blue-300 text-lg"></i>
                            </div>
                            <div className="p-3 rounded-2xl rounded-bl-none bg-gray-700">
                                <Spinner />
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-700">
                    {ragFiles.length > 0 && (
                        <div className="mb-2 p-2 bg-gray-700 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                                 <h4 className="text-xs font-semibold uppercase text-gray-400">{t('context_files')}</h4>
                                 <button onClick={() => setRagFiles([])} className="text-xs text-red-400 hover:underline">{t('clear_all')}</button>
                            </div>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                                {ragFiles.map(file => (
                                    <div key={file.name} className="flex justify-between items-center text-sm bg-gray-600 p-1 rounded">
                                        <span className="truncate text-white">{file.name}</span>
                                        <button onClick={() => removeFile(file.name)} className="ml-2 text-gray-400 hover:text-red-400"><i className="fas fa-times"></i></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full bg-gray-600 w-10 h-10 flex items-center justify-center hover:bg-gray-500 text-white" disabled={isLoading}>
                            <i className="fas fa-paperclip"></i>
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isRecording ? t('nyayabot_listening') : (ragFiles.length > 0 ? t('ask_about_docs_placeholder') : t('nyayabot_placeholder'))}
                            disabled={isRecording}
                            className="flex-1 p-2 border rounded-xl bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 text-white placeholder-gray-400"
                        />
                         <button type="button" onClick={toggleRecording} className={`p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-600 text-white'}`} disabled={isLoading}>
                            <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                        </button>
                        <button type="submit" className="p-2 rounded-full bg-blue-500 text-white w-10 h-10 flex items-center justify-center hover:bg-blue-600 disabled:bg-gray-400" disabled={isLoading || isRecording || !input}>
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default Nyayabot;
