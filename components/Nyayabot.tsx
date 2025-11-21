
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob, Part } from "@google/genai";
import { geminiService } from '../services/geminiService';
import { contentModeration } from '../services/contentModeration';
import { ChatMessage, User } from '../types';
import Spinner from './common/Spinner';
import { gsap } from 'gsap';
import { fileToBase64 } from '../lib/utils';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';
import { marked } from 'marked';

type LiveSession = Awaited<ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>>;

interface NyayabotProps {
    t: (key: string) => string;
    messages: ChatMessage[];
    setMessages: (messages: ChatMessage[]) => void;
    currentUser: User;
}

interface ArchivedChat {
    id: string;
    title: string;
    date: string;
    messages: ChatMessage[];
}

// --- Audio Helper Functions ---

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before scaling to avoid overflow/distortion
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const Nyayabot: React.FC<NyayabotProps> = ({ t, messages, setMessages, currentUser }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [ragFiles, setRagFiles] = useState<File[]>([]);
    
    // Chat History State
    const [showHistory, setShowHistory] = useState(false);
    const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Live API Refs
    const liveSessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    // Recording state ref for async callbacks
    const isRecordingRef = useRef(false);
    
    // Transcripts
    const stableTranscriptRef = useRef('');
    const volatileTranscriptRef = useRef('');
    const outputTranscriptRef = useRef('');

    // Keep a ref to messages to access current state in callbacks
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    // Load archived chats
    useEffect(() => {
        const saved = localStorage.getItem(`nyaya:archivedChats:${currentUser.email}`);
        if (saved) {
            setArchivedChats(JSON.parse(saved));
        }
    }, [currentUser]);

    const saveHistory = (chats: ArchivedChat[]) => {
        setArchivedChats(chats);
        localStorage.setItem(`nyaya:archivedChats:${currentUser.email}`, JSON.stringify(chats));
    };

    const archiveCurrentChat = () => {
        // Only archive if there is at least one user message
        const hasUserMessage = messages.some(m => m.role === 'user');
        if (!hasUserMessage) return;

        const firstUserMsg = messages.find(m => m.role === 'user');
        const title = firstUserMsg ? firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '') : 'Conversation';
        
        const newChat: ArchivedChat = {
            id: Date.now().toString(),
            title,
            date: new Date().toISOString(),
            messages: [...messages]
        };

        const newHistory = [newChat, ...archivedChats];
        saveHistory(newHistory);
    };

    const handleNewChat = () => {
        archiveCurrentChat();
        setMessages([{ role: 'model', content: t('nyayabot_welcome') }]);
        setRagFiles([]); 
        if (window.innerWidth < 1024) setShowHistory(false);
    };

    const handleClearChat = () => {
        if (window.confirm(t('confirm_clear'))) {
             setMessages([{ role: 'model', content: t('nyayabot_welcome') }]);
             setRagFiles([]); 
        }
    };

    const handleLoadChat = (chat: ArchivedChat) => {
        archiveCurrentChat();
        setMessages(chat.messages);
        setRagFiles([]);
        if (window.innerWidth < 1024) setShowHistory(false);
    };

    const handleDeleteChat = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newHistory = archivedChats.filter(c => c.id !== id);
        saveHistory(newHistory);
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            const lastMessage = chatContainerRef.current.lastElementChild;
            if (lastMessage && messages.length > 1) { 
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
        if (!isRecordingRef.current) return;
        setIsRecording(false);
    
        try {
            // 1. Close Live Session
            liveSessionRef.current?.close();
            liveSessionRef.current = null;
            
            // 2. Stop Media Stream (Mic)
            mediaStreamRef.current?.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
            
            // 3. Clean up Input Audio Context & Script Processor
            if (scriptProcessorRef.current) {
                scriptProcessorRef.current.disconnect();
                scriptProcessorRef.current = null;
            }
            if (inputAudioContextRef.current) {
                if (inputAudioContextRef.current.state !== 'closed') {
                    inputAudioContextRef.current.close();
                }
                inputAudioContextRef.current = null;
            }

            // 4. Stop all Output Audio Sources
            audioSourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) {}
            });
            audioSourcesRef.current.clear();

            // 5. Close Output Audio Context
            if (outputAudioContextRef.current) {
                if (outputAudioContextRef.current.state !== 'closed') {
                    outputAudioContextRef.current.close();
                }
                outputAudioContextRef.current = null;
            }
            
            // 6. Commit any final transcription to chat history
            if (outputTranscriptRef.current) {
                setMessages([...messagesRef.current, { role: 'model', content: outputTranscriptRef.current }]);
                outputTranscriptRef.current = '';
            }
        } catch (error) {
            console.error("Error stopping recording:", error);
        }
    }, [setMessages]);

    const startRecording = useCallback(async () => {
        if (!process.env.API_KEY) {
            alert("API Key is missing. Cannot start Live API.");
            return;
        }

        setIsRecording(true);
        setInput('');
        stableTranscriptRef.current = '';
        volatileTranscriptRef.current = '';
        outputTranscriptRef.current = '';
        nextStartTimeRef.current = 0;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            // Initialize Output Audio Context for Playback
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        // Initialize Input Audio Context for Microphone
                        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            if (!isRecordingRef.current) return;
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            // CRITICAL: Use sessionPromise to ensure we use the resolved session
                            sessionPromise.then((session) => {
                                if (isRecordingRef.current) {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                }
                            }).catch(e => console.debug("Send audio failed (session likely closed)", e));
                        };
                        
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // --- Handle Audio Output ---
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            try {
                                const pcmData = decode(base64Audio);
                                const audioBuffer = await decodeAudioData(pcmData, outputAudioContextRef.current, 24000, 1);
                                
                                const source = outputAudioContextRef.current.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputAudioContextRef.current.destination);
                                
                                // Ensure gapless playback
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                
                                audioSourcesRef.current.add(source);
                                source.onended = () => audioSourcesRef.current.delete(source);
                            } catch (err) {
                                console.error("Error decoding/playing audio:", err);
                            }
                        }

                        // --- Handle Interruption ---
                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(src => {
                                try { src.stop(); } catch (e) {}
                            });
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            outputTranscriptRef.current = ''; // Clear potentially stale transcript
                        }

                        // --- Handle Transcriptions ---
                        // 1. User Input Transcription
                        const inputTranscription = message.serverContent?.inputTranscription;
                        if (inputTranscription) {
                            const { text, isFinal } = inputTranscription;
                            volatileTranscriptRef.current += text;
                            setInput(stableTranscriptRef.current + volatileTranscriptRef.current);
                            if (isFinal) {
                                stableTranscriptRef.current += volatileTranscriptRef.current + ' ';
                                volatileTranscriptRef.current = '';
                                setInput(stableTranscriptRef.current);
                            }
                        }
                        
                        // 2. Model Output Transcription
                        const outputTranscription = message.serverContent?.outputTranscription;
                        if (outputTranscription && outputTranscription.text) {
                             outputTranscriptRef.current += outputTranscription.text;
                        }
                        
                        // 3. Turn Complete
                        if (message.serverContent?.turnComplete) {
                            // Optional: Could log or update UI state here
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setMessages([...messagesRef.current, { role: 'system', content: t('error_occurred') + " (Connection Error)" }]);
                        stopRecording();
                    },
                    onclose: (e: CloseEvent) => {
                         console.log("Session closed", e);
                         if (isRecordingRef.current) {
                             stopRecording();
                         }
                    },
                },
                config: {
                    inputAudioTranscription: {},
                    outputAudioTranscription: {}, // Enable model text transcription
                    responseModalities: [Modality.AUDIO], 
                },
            });

            sessionPromise.then(session => {
                liveSessionRef.current = session;
            }).catch(err => {
                console.error("Failed to connect to live session:", err);
                setMessages([...messagesRef.current, { role: 'system', content: t('error_occurred') + " (Network Error)" }]);
                stopRecording();
            });

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setMessages([...messagesRef.current, { role: 'system', content: t('mic_access_denied') }]);
            setIsRecording(false);
        }
    }, [stopRecording, t, setMessages]);

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };
    
    useEffect(() => {
        return () => {
            if (isRecordingRef.current) stopRecording();
        };
    }, [stopRecording]);
    
    const speak = (text: string) => {
        const strippedText = text.replace(/[\#\*\_\`\[\]\(\)\>\-]/g, ''); 
        const utterance = new SpeechSynthesisUtterance(strippedText);
        utterance.lang = 'en-IN';
        window.speechSynthesis.speak(utterance);
    };
    
    const renderBotMessage = (text: string) => {
        if (!text) return { __html: '' };
        // Ensure breaks are handled correctly for chat messages
        const rawHtml = marked.parse(text, { breaks: true, gfm: true }) as string;
        return { __html: rawHtml };
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
            <div className="flex h-full w-full max-w-full gap-0 overflow-hidden">
                {/* Chat History Sidebar */}
                <div className={`${showHistory ? 'w-72 translate-x-0 opacity-100' : 'w-0 -translate-x-10 opacity-0 pointer-events-none'} transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] flex flex-col h-full border-r border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg`}>
                    <div className="p-5 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('chat_history')}</h3>
                        <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {archivedChats.length > 0 ? (
                            archivedChats.map(chat => (
                                <div key={chat.id} onClick={() => handleLoadChat(chat)} className="p-3.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 cursor-pointer group transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">{new Date(chat.date).toLocaleDateString()}</p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium leading-snug">{chat.title}</p>
                                        <button onClick={(e) => handleDeleteChat(chat.id, e)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1" title={t('delete_chat')}>
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500 opacity-60">
                                <i className="far fa-comment-dots text-2xl mb-2"></i>
                                <span className="text-xs italic">{t('no_chat_history')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    {/* Chat Header Actions */}
                    <div className="px-6 py-4 flex justify-between items-center z-10">
                         <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setShowHistory(!showHistory)} 
                                className={`p-2.5 rounded-xl transition-all duration-200 ${showHistory ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                <i className="fas fa-history text-lg"></i>
                            </button>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">{t('tab_nyayabot')}</h2>
                            {ragFiles.length > 0 && (
                                <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span> RAG Active
                                </span>
                            )}
                         </div>
                         <div className="flex gap-3">
                             <button onClick={handleClearChat} className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all font-medium text-sm border border-transparent hover:border-red-100 dark:hover:border-red-900/30" title={t('clear_chat')}>
                                 <i className="fas fa-trash mr-2"></i> {t('clear_chat')}
                             </button>
                             <button onClick={handleNewChat} className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 text-sm font-bold transition-all shadow-lg shadow-gray-500/20 transform hover:-translate-y-0.5">
                                 <i className="fas fa-plus mr-2"></i> {t('new_chat')}
                             </button>
                         </div>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 px-4 sm:px-8 pb-4 overflow-y-auto space-y-6 custom-scrollbar scroll-smooth">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                                {msg.role === 'model' && (
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg transform translate-y-2">
                                        <i className="fas fa-balance-scale text-white text-sm"></i>
                                    </div>
                                )}
                            <div className={`px-6 py-4 rounded-[20px] max-w-2xl shadow-sm transition-all ${
                                msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-blue-500/20' : 
                                msg.role === 'model' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700 shadow-gray-200/50 dark:shadow-none' : 
                                'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-100 dark:border-red-900/30'
                            }`}>
                                    {msg.role === 'model' ? (
                                        <div className="markdown-content" dangerouslySetInnerHTML={renderBotMessage(msg.content)} />
                                    ) : (
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    )}

                                    {msg.role === 'model' && msg.content && (
                                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                            <button onClick={() => speak(msg.content)} className="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition-colors" title="Read Aloud">
                                                <i className="fas fa-volume-up"></i>
                                            </button>
                                            {/* Placeholder for Copy/Like/Dislike could go here */}
                                        </div>
                                    )}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">{t('sources')}</h4>
                                            <div className="space-y-1">
                                                {msg.sources.map((source, i) => (
                                                    <a href={source} target="_blank" rel="noopener noreferrer" key={i} className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline truncate">
                                                        <i className="fas fa-external-link-alt text-[10px] opacity-70"></i> {source}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                            </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-4 justify-start">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <i className="fas fa-balance-scale text-white text-sm"></i>
                                </div>
                                <div className="p-4 rounded-2xl rounded-bl-none bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <Spinner />
                                </div>
                            </div>
                        )}
                        <div className="h-4"></div> {/* Spacer */}
                    </div>

                    <div className="p-6 pt-2 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-gray-900 dark:via-gray-900 z-10">
                        {ragFiles.length > 0 && (
                            <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm flex flex-wrap gap-2">
                                {ragFiles.map(file => (
                                    <div key={file.name} className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                        <i className="fas fa-file-alt opacity-70"></i>
                                        <span className="truncate max-w-[150px]">{file.name}</span>
                                        <button onClick={() => removeFile(file.name)} className="ml-1 hover:text-red-500 transition-colors"><i className="fas fa-times"></i></button>
                                    </div>
                                ))}
                                <button onClick={() => setRagFiles([])} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1">
                                    {t('clear_all')}
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="relative flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/30 border border-gray-100 dark:border-gray-700">
                            <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                            
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all" disabled={isLoading} title="Attach Files">
                                <i className="fas fa-paperclip text-lg"></i>
                            </button>
                            
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isRecording ? t('nyayabot_listening') : (ragFiles.length > 0 ? t('ask_about_docs_placeholder') : t('nyayabot_placeholder'))}
                                disabled={isRecording}
                                className="flex-1 p-2 bg-transparent border-none focus:ring-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-base"
                            />
                            
                            <div className="flex items-center gap-1 pr-1">
                                <button type="button" onClick={toggleRecording} className={`p-3 rounded-xl transition-all duration-200 ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`} disabled={isLoading} title={isRecording ? "Stop Recording" : "Voice Input"}>
                                    <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-lg`}></i>
                                </button>
                                <button type="submit" className={`p-3 rounded-xl transition-all duration-200 ${input ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 transform hover:scale-105' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`} disabled={isLoading || isRecording || !input}>
                                    <i className="fas fa-paper-plane text-lg"></i>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default Nyayabot;
