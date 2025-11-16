export async function withErrorRecovery<T,>(
    apiCall: () => Promise<T>,
    fallbackResponse: T,
    retries = 3,
    initialDelay = 1000,
    timeout = 90000
): Promise<T> {
    let delay = initialDelay;

    for (let i = 0; i < retries; i++) {
        try {
            const timeoutPromise = new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), timeout)
            );
            
            const result = await Promise.race([apiCall(), timeoutPromise]);
            return result;

        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) {
                console.error('All retries failed. Returning fallback response.');
                return fallbackResponse;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
    return fallbackResponse;
}