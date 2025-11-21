
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                // Return only the base64 part
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read file as base64 string.'));
            }
        };
        reader.onerror = error => reject(error);
    });
};

export const getLocalizedNumber = (num: number | string, language: string): string => {
    if (num === undefined || num === null) return '';
    const strNum = String(num);
    
    // Map languages to their numbering system locales
    const localeMap: { [key: string]: string } = {
        hi: 'hi-IN-u-nu-deva', // Devanagari
        mr: 'mr-IN-u-nu-deva',
        sa: 'sa-IN-u-nu-deva',
        ne: 'ne-NP-u-nu-deva',
        mai: 'mai-IN-u-nu-deva',
        doi: 'doi-IN-u-nu-deva',
        kok: 'kok-IN-u-nu-deva',
        ks: 'ks-IN-u-nu-deva', 
        bn: 'bn-IN-u-nu-beng', // Bengali
        as: 'as-IN-u-nu-beng',
        mni: 'mni-IN-u-nu-beng',
        gu: 'gu-IN-u-nu-gujr', // Gujarati
        pa: 'pa-IN-u-nu-guru', // Gurmukhi
        or: 'or-IN-u-nu-orya', // Odia
        te: 'te-IN-u-nu-telu', // Telugu
        kn: 'kn-IN-u-nu-knda', // Kannada
        ml: 'ml-IN-u-nu-mlym', // Malayalam
        ta: 'ta-IN-u-nu-tamldec', // Tamil
        ur: 'ur-PK-u-nu-arabext', // Urdu (Extended Arabic)
        sd: 'sd-IN-u-nu-arabext',
    };

    const locale = localeMap[language];

    // If no specific script locale is found, return the original
    if (!locale || language === 'en') return strNum;

    try {
        // We use Intl.NumberFormat to format, but we need to be careful about 
        // strings that contain non-numeric characters (like "CR/2023").
        // This simple regex replacer works for mixed strings.
        const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
        const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const localizedDigits = digits.map(d => formatter.format(Number(d)));

        return strNum.replace(/\d/g, (d) => localizedDigits[Number(d)]);
    } catch (e) {
        return strNum;
    }
};
