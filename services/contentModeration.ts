
// This is a mock service. A real implementation would use a sophisticated API.
const blocklist = ['inappropriate', 'offensive', 'harmful'];

export const contentModeration = {
    check: (text: string): boolean => {
        const lowercasedText = text.toLowerCase();
        for (const word of blocklist) {
            if (lowercasedText.includes(word)) {
                console.warn(`Content moderation triggered for word: ${word}`);
                return false; // Content is inappropriate
            }
        }
        return true; // Content is appropriate
    }
};
