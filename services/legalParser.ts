
// A list of common legal statutes and terms in India for highlighting
const legalTerms = [
    'Indian Penal Code', 'IPC', 'Code of Criminal Procedure', 'CrPC', 'Indian Evidence Act',
    'Civil Procedure Code', 'CPC', 'Constitution of India', 'Article', 'Section', 'Sec',
    'Consumer Protection Act', 'Contract Act', 'Arms Act', 'National Green Tribunal Act',
    'Environmental Protection Act', 'Hindu Marriage Act', 'Domestic Violence Act',
    'petitioner', 'respondent', 'plaintiff', 'defendant', 'affidavit', 'jurisdiction',
    'subpoena', 'litigation', 'arbitration', 'mediation', 'precedent'
];

// Create a regex from the terms list, ensuring whole words are matched
const highlightingRegex = new RegExp(`\\b(${legalTerms.join('|')})\\b`, 'gi');

export const legalParser = {
    highlightLegalTerms: (text: string): string => {
        if (!text) return '';
        return text.replace(highlightingRegex, (match) => 
            `<strong class="text-blue-400 dark:text-blue-300 font-semibold">${match}</strong>`
        );
    }
};
