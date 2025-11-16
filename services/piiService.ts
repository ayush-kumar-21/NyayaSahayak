
import { Case } from '../types';

// More robust patterns for detecting various types of PII.
const piiPatterns = {
    // A standard email regex.
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // Catches Indian phone numbers in formats like +91 XXXXXXXXXX, 0XXXXXXXXXX, or XXXXXXXXXX.
    PHONE: /(?:\+91[\s-]?)?(?:[0]?)?[789]\d{9}\b/g,
    // This is a simplistic regex for demonstration. Real PII detection is far more complex.
    PERSON: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    CASE_ID: /[A-Z]{2,3}\/\d{4}\/\d{4}/g,
    ORGANIZATION: /\b[A-Z][a-zA-Z]+ (Corporation|Ltd|Inc)\b/g
};

export const piiService = {
    scan: (caseData: Case): { found: boolean, pii: { [key: string]: string } } => {
        const foundPii: { [key: string]: string } = {};
        let found = false;

        // Combine all relevant text fields, including notes, for a comprehensive scan.
        const textToScan = `${caseData.title} ${caseData.petitioner} ${caseData.respondent} ${caseData.summary} ${caseData.notes || ''}`;
        
        for (const [type, regex] of Object.entries(piiPatterns)) {
            // Ensure regex state is reset for global flags before matching.
            regex.lastIndex = 0;
            const matches = textToScan.match(regex);
            if (matches) {
                found = true;
                matches.forEach(match => {
                    foundPii[match] = `[REDACTED_${type}]`;
                });
            }
        }

        return { found, pii: foundPii };
    },
    
    redact: (caseData: Case, piiToRedact: { [key: string]: string }): Case => {
        let redactedSummary = caseData.summary;
        let redactedTitle = caseData.title;
        let redactedPetitioner = caseData.petitioner;
        let redactedRespondent = caseData.respondent;
        let redactedNotes = caseData.notes || '';

        for (const [original, replacement] of Object.entries(piiToRedact)) {
            // Escape special regex characters from the original string to ensure it's treated as a literal.
            const regex = new RegExp(original.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
            redactedSummary = redactedSummary.replace(regex, replacement);
            redactedTitle = redactedTitle.replace(regex, replacement);
            redactedPetitioner = redactedPetitioner.replace(regex, replacement);
            redactedRespondent = redactedRespondent.replace(regex, replacement);
            if(caseData.notes) {
                redactedNotes = redactedNotes.replace(regex, replacement);
            }
        }

        const redactedCase: Case = {
            ...caseData,
            summary: redactedSummary,
            title: redactedTitle,
            petitioner: redactedPetitioner,
            respondent: redactedRespondent
        };

        // Only add the notes field back if it was originally present.
        if (caseData.notes) {
            redactedCase.notes = redactedNotes;
        }

        return redactedCase;
    }
};
