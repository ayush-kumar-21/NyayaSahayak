
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
        const rawHtml = marked.parse(text) as string;
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
            <div className="flex h-full w-full gap-4 overflow-hidden">
                {/* Chat History Sidebar */}
                <div className={`${showHistory ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 pointer-events-none'} md:opacity-100 md:pointer-events-auto transition-all duration-300 ease-in-out md:static md:w-64 md:translate-x-0 flex flex-col absolute z-20 h-full`}>
                    <div className="p-4 border-b border-transparent flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('chat_history')}</h3>
                        <button onClick={() => setShowHistory(false)} className="md:hidden text-gray-400 hover:text-gray-800 dark:hover:text-white">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {archivedChats.length > 0 ? (
                            archivedChats.map(chat => (
                                <div key={chat.id} onClick={() => handleLoadChat(chat)} className="p-3 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 cursor-pointer group transition-colors">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{new Date(chat.date).toLocaleDateString()}</p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-800 dark:text-white truncate font-medium">{chat.title}</p>
                                        <button onClick={(e) => handleDeleteChat(chat.id, e)} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1" title={t('delete_chat')}>
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm italic">{t('no_chat_history')}</div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-colors">
                    {/* Chat Header Actions */}
                    <div className="p-3 flex justify-between items-center transition-colors">
                         <div className="flex items-center gap-3">
                            <button onClick={() => setShowHistory(!showHistory)} className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <i className="fas fa-history"></i>
                            </button>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('tab_nyayabot')}</h2>
                            {ragFiles.length > 0 && (
                                <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500 text-purple-600 dark:text-purple-300 text-xs font-bold animate-pulse">
                                    <i className="fas fa-file-medical-alt mr-1"></i> RAG Active
                                </span>
                            )}
                         </div>
                         <div className="flex gap-2">
                             <button onClick={handleClearChat} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('clear_chat')}>
                                 <i className="fas fa-trash"></i> <span className="hidden sm:inline text-sm ml-1">{t('clear_chat')}</span>
                             </button>
                             <button onClick={handleNewChat} className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
                                 <i className="fas fa-plus mr-1"></i> {t('new_chat')}
                             </button>
                         </div>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                        <i className="fas fa-balance-scale text-white text-sm"></i>
                                    </div>
                                )}
                            <div className={`px-4 py-3 rounded-2xl max-w-lg shadow-md ${
                                msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 
                                msg.role === 'model' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-gray-600' : 
                                'bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-sm'
                            }`}>
                                    {msg.role === 'model' ? (
                                        <div className="markdown-content" dangerouslySetInnerHTML={renderBotMessage(msg.content)} />
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}

                                    {msg.role === 'model' && msg.content && (
                                        <div className="mt-2 border-t border-gray-200 dark:border-gray-600/50 pt-1">
                                            <button onClick={() => speak(msg.content)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm" title="Read Aloud">
                                                <i className="fas fa-volume-up"></i>
                                            </button>
                                        </div>
                                    )}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-2 border-t pt-2 border-gray-200 dark:border-gray-600">
                                            <h4 className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">{t('sources')}</h4>
                                            {msg.sources.map((source, i) => (
                                                <a href={source} target="_blank" rel="noopener noreferrer" key={i} className="text-xs text-blue-600 dark:text-blue-400 block truncate hover:underline">{source}</a>
                                            ))}
                                        </div>
                                    )}
                            </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-3 justify-start">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                    <i className="fas fa-balance-scale text-white text-sm"></i>
                                </div>
                                <div className="p-3 rounded-2xl rounded-bl-none bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-md">
                                    <Spinner />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4">
                        {ragFiles.length > 0 && (
                            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t('context_files')}</h4>
                                    <button onClick={() => setRagFiles([])} className="text-xs text-red-500 hover:underline">{t('clear_all')}</button>
                                </div>
                                <div className="max-h-24 overflow-y-auto space-y-1">
                                    {ragFiles.map(file => (
                                        <div key={file.name} className="flex justify-between items-center text-sm bg-white dark:bg-gray-600 p-1 rounded border border-gray-200 dark:border-gray-500">
                                            <span className="truncate text-gray-800 dark:text-white">{file.name}</span>
                                            <button onClick={() => removeFile(file.name)} className="ml-2 text-gray-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                            <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 w-10 h-10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-white transition-colors" disabled={isLoading}>
                                <i className="fas fa-paperclip"></i>
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isRecording ? t('nyayabot_listening') : (ragFiles.length > 0 ? t('ask_about_docs_placeholder') : t('nyayabot_placeholder'))}
                                disabled={isRecording}
                                className="flex-1 p-2 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                            />
                            <button type="button" onClick={toggleRecording} className={`p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'}`} disabled={isLoading}>
                                <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                            </button>
                            <button type="submit" className="p-2 rounded-full bg-blue-600 text-white w-10 h-10 flex items-center justify-center hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-gray-500 transition-colors" disabled={isLoading || isRecording || !input}>
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </AnimatedPageWrapper>
    );
};

export default Nyayabot;
