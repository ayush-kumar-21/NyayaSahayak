
export interface User {
    email: string;
}

export interface HistoryItem {
    id: string;
    timestamp: string;
    type: 'CASE_CREATED' | 'DOCUMENT_ANALYZED' | 'CHAT_MESSAGE' | 'ARGUMENT_ANALYZED' | 'AUDIO_TRANSCRIBED' | 'QUANTUM_FINGERPRINT_GENERATED' | 'DOCUMENT_VERIFIED';
    details: string;
}

export interface Case {
    id: string;
    title: string;
    caseNumber: string;
    petitioner: string;
    respondent: string;
    invokedActs: string[];
    filingDate: string;
    lastHearingDate: string;
    complexityScore: number;
    summary: string;
    notes?: string;
    pii?: { [key: string]: string };
    priority?: 'High' | 'Medium' | 'Low';
    caseType: 'Criminal' | 'Civil' | 'Family' | 'PIL' | 'Divorce';
    userId?: string; // To associate case with a user
}

export interface PredictionResult {
    priority: 'High' | 'Medium' | 'Low';
    rationale: string;
    contributingFactors: string[];
    legalCitations: string[];
}

export interface DocumentAnalysisResult {
    summary: string;
    severity: 'High' | 'Medium' | 'Low';
    confidenceScore: number;
    recommendedCourt: string;
    keyLegalIssues: string[];
    identifiedEntities: { name: string; type: string; }[];
    potentialPrecedents: string[];
}

export interface QuantumFingerprintResult {
    quantumHash: string;
    integrityStatus: 'Verified & Secure' | 'Potential Tampering Detected';
    anomaliesDetected: string[];
    verificationTimestamp: string;
}

export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    content: string;
    sources?: string[];
}
