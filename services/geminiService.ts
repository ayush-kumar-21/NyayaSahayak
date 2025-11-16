import { GoogleGenAI, Type, GenerateContentResponse, Part } from "@google/genai";
import { PredictionResult, Case, DocumentAnalysisResult, ChatMessage } from "../types";
import { withErrorRecovery } from "../lib/withErrorRecovery";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const predictCaseOutcomeInternal = async (sanitizedCase: Case, language: string): Promise<PredictionResult> => {
    const langMap: { [key: string]: string } = {
        en: 'English',
        hi: 'Hindi',
        ta: 'Tamil',
        te: 'Telugu',
        bn: 'Bengali'
    };
    const targetLanguage = langMap[language as keyof typeof langMap] || 'English';

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: `Analyze the following Indian legal case and provide a triage assessment. The entire JSON response, including all text fields like rationale and contributingFactors, must be in ${targetLanguage}. Case Data: ${JSON.stringify(sanitizedCase)}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    priority: {
                        type: Type.STRING,
                        description: 'Priority level of the case (High, Medium, or Low).',
                    },
                    rationale: {
                        type: Type.STRING,
                        description: 'A detailed explanation for the assigned priority.',
                    },
                    contributingFactors: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Top 3-5 factors influencing the priority.',
                    },
                    legalCitations: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Relevant legal acts or precedents.',
                    },
                },
                required: ["priority", "rationale", "contributingFactors", "legalCitations"],
            },
        },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

const analyzeDocumentsInternal = async (parts: Part[]): Promise<DocumentAnalysisResult> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: { parts: [...parts, { text: "Analyze the provided Indian legal documents. Summarize them, assess severity, provide a confidence score for your analysis, and recommend the appropriate court. Also, extract the key legal issues, identify all entities (people, organizations, locations, dates), and list any potential legal precedents or cited case laws." }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A concise summary of the document's content." },
                    severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "The severity or urgency of the case based on the document." },
                    confidenceScore: { type: Type.NUMBER, description: "A score from 0.0 to 1.0 indicating the confidence in the analysis." },
                    recommendedCourt: { type: Type.STRING, description: "The appropriate court in the Indian legal system for this matter." },
                    keyLegalIssues: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "A list of the main legal questions or points of contention."
                    },
                    identifiedEntities: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE'] }
                            },
                            required: ["name", "type"]
                        },
                        description: "A list of named entities found in the document."
                    },
                    potentialPrecedents: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "A list of relevant case laws, statutes, or legal precedents mentioned or implied."
                    }
                },
                required: ["summary", "severity", "confidenceScore", "recommendedCourt", "keyLegalIssues", "identifiedEntities", "potentialPrecedents"],
            },
        }
    });

    return JSON.parse(response.text.trim());
};

const chatWithNayaaybotInternal = async (message: string, ragParts?: Part[], history: ChatMessage[] = []): Promise<GenerateContentResponse> => {
    const useGoogleSearch = !ragParts || ragParts.length === 0;

    // Map the app's message history to the format Gemini expects.
    // We slice because the last message in history is the new user message, which we'll handle separately.
    const contents = history.slice(0, -1).filter(msg => msg.role === 'user' || msg.role === 'model').map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));

    // Prepare the parts for the current user message
    const currentMessageParts: Part[] = [];
    let finalMessage = message;

    if (ragParts && ragParts.length > 0) {
        currentMessageParts.push(...ragParts);
        finalMessage = `Based ONLY on the context from the provided document(s), answer the following question. If the answer is not in the documents, say that you cannot find the answer in the provided context. Question: ${message}`;
    }
    currentMessageParts.push({ text: finalMessage });

    // Add the current user message to the contents array
    contents.push({ role: 'user', parts: currentMessageParts });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        systemInstruction: "You are NYAAYBOT, an expert assistant on the Constitution of India and user-provided legal documents. When documents are provided, base your answers solely on their content. When no documents are provided, answer user questions accurately and cite your sources when available from Google Search. Keep answers concise and clear.",
        tools: useGoogleSearch ? [{ googleSearch: {} }] : [],
    });
    return response;
};


const fallbackPrediction: PredictionResult = {
    priority: 'Medium',
    rationale: 'Could not retrieve AI analysis due to a network error. This is a fallback response.',
    contributingFactors: ['API communication failure'],
    legalCitations: ['N/A']
};

const fallbackDocAnalysis: DocumentAnalysisResult = {
    summary: 'Could not analyze document due to an error.',
    severity: 'Medium',
    confidenceScore: 0.0,
    recommendedCourt: 'N/A',
    keyLegalIssues: ['Error retrieving data.'],
    identifiedEntities: [],
    potentialPrecedents: ['N/A']
};


export const geminiService = {
    predictCaseOutcome: (sanitizedCase: Case, language: string) => withErrorRecovery(() => predictCaseOutcomeInternal(sanitizedCase, language), fallbackPrediction),
    analyzeDocuments: (parts: Part[]) => withErrorRecovery(() => analyzeDocumentsInternal(parts), fallbackDocAnalysis),
    chatWithNayaaybot: chatWithNayaaybotInternal,
    transcribeAudio: async (audioPart: Part) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [audioPart, {text: "Transcribe this audio recording."}] }
        });
        return response.text;
    },
    analyzeArgument: async (argument: string) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `You are a helpful legal assistant. Analyze the following legal argument in a neutral and objective tone. Do not express personal opinions or excitement. Identify its strengths (if any), weaknesses, potential counterarguments, and provide strategic recommendations for a legal professional. Argument: "${argument}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        introduction: {
                            type: Type.STRING,
                            description: "A brief, neutral introduction to the analysis of the argument provided."
                        },
                        strengths: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of potential strengths or valid points within the argument, if any."
                        },
                        weaknesses: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of weaknesses, logical fallacies, or legally unsupported claims in the argument."
                        },
                        counterarguments: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of potential counterarguments to refute the provided statement."
                        },
                        strategicRecommendations: {
                            type: Type.STRING,
                            description: "Actionable strategic advice for a legal professional on how to address this argument."
                        }
                    },
                    required: ["introduction", "strengths", "weaknesses", "counterarguments", "strategicRecommendations"]
                }
            }
        });
        return JSON.parse(response.text.trim());
    },
    getProceduralWalkthrough: async (caseType: string, ragParts?: Part[]) => {
        const promptParts: Part[] = [];
        let promptText = `Provide a step-by-step procedural walkthrough for a "${caseType}" case in the Indian legal system. Be comprehensive and clear.`;
    
        if (ragParts && ragParts.length > 0) {
            promptParts.push(...ragParts);
            promptText = `Based *only* on the provided legal document(s), generate a detailed, step-by-step procedural walkthrough for a "${caseType}" case. If the documents do not contain enough information, state that clearly.`;
        }
        promptParts.push({ text: promptText });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: promptParts }
        });
        return response.text;
    }
};

// Simple Anomaly Detector (logs to console)
export const anomalyDetector = {
    logEvent: (message: string, data: any) => {
        console.warn(`[ANOMALY DETECTED] ${message}`, data);
    }
};