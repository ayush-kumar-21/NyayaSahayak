
import { Case } from '../types';

const mockCasesEn: Case[] = [
    {
        id: '1',
        title: "State of Maharashtra vs. Raj Sharma",
        caseNumber: "CR/0255/2023",
        petitioner: "State of Maharashtra",
        respondent: "Raj Sharma",
        invokedActs: ["Indian Penal Code, 1860, Sec 302", "Arms Act, 1959, Sec 25"],
        filingDate: "2023-01-15",
        lastHearingDate: "2024-05-20",
        complexityScore: 8.5,
        summary: "A criminal case involving charges of murder and illegal possession of firearms. The prosecution alleges that the respondent, Raj Sharma, was involved in a fatal shooting. Key evidence includes eyewitness testimony and forensic reports.",
        pii: {
            "Raj Sharma": "[REDACTED_PERSON]",
            "CR/0255/2023": "[REDACTED_CASE_ID]",
        },
        priority: 'High',
        caseType: 'Criminal',
    },
    {
        id: '2',
        title: "Priya Singh vs. ABC Corporation",
        caseNumber: "CIV/1089/2022",
        petitioner: "Priya Singh",
        respondent: "ABC Corporation",
        invokedActs: ["Consumer Protection Act, 2019", "Contract Act, 1872"],
        filingDate: "2022-11-02",
        lastHearingDate: "2024-06-10",
        complexityScore: 6.2,
        summary: "A civil suit filed by Priya Singh against ABC Corporation for breach of contract and providing deficient services. The petitioner claims financial damages due to the respondent's failure to deliver on a service agreement.",
        pii: {
            "Priya Singh": "[REDACTED_PERSON]",
            "ABC Corporation": "[REDACTED_ORGANIZATION]",
        },
        priority: 'Medium',
        caseType: 'Civil',
    },
    {
        id: '3',
        title: "Union of India vs. Environmental Activists Group",
        caseNumber: "PIL/0045/2024",
        petitioner: "Union of India",
        respondent: "Environmental Activists Group",
        invokedActs: ["National Green Tribunal Act, 2010", "Environmental Protection Act, 1986"],
        filingDate: "2024-02-10",
        lastHearingDate: "2024-07-01",
        complexityScore: 9.1,
        summary: "A Public Interest Litigation (PIL) concerning the environmental clearance for a major infrastructure project. The respondent group has challenged the clearance, citing potential ecological damage.",
        priority: 'High',
        caseType: 'PIL',
    },
    {
        id: '4',
        title: "Anjali Verma vs. Sunil Verma",
        caseNumber: "FAM/0312/2023",
        petitioner: "Anjali Verma",
        respondent: "Sunil Verma",
        invokedActs: ["Hindu Marriage Act, 1955", "Domestic Violence Act, 2005"],
        filingDate: "2023-08-25",
        lastHearingDate: "2024-06-28",
        complexityScore: 5.5,
        summary: "A family court matter regarding a petition for divorce and allegations of domestic violence. The case involves matters of child custody and alimony.",
        pii: {
            "Anjali Verma": "[REDACTED_PERSON]",
            "Sunil Verma": "[REDACTED_PERSON]",
        },
        priority: 'Low',
        caseType: 'Divorce',
    },
];

const mockCasesHi: Case[] = [
    {
        id: '1',
        title: "महाराष्ट्र राज्य बनाम राज शर्मा",
        caseNumber: "CR/0255/2023",
        petitioner: "महाराष्ट्र राज्य",
        respondent: "राज शर्मा",
        invokedActs: ["भारतीय दंड संहिता, 1860, धारा 302", "शस्त्र अधिनियम, 1959, धारा 25"],
        filingDate: "2023-01-15",
        lastHearingDate: "2024-05-20",
        complexityScore: 8.5,
        summary: "हत्या और आग्नेयास्त्रों के अवैध कब्जे के आरोपों से जुड़ा एक आपराधिक मामला। अभियोजन पक्ष का आरोप है कि प्रतिवादी, राज शर्मा, एक घातक गोलीबारी में शामिल था। मुख्य सबूतों में प्रत्यक्षदर्शी गवाही और फोरेंसिक रिपोर्ट शामिल हैं।",
        pii: { "राज शर्मा": "[REDACTED_PERSON]" },
        priority: 'High',
        caseType: 'Criminal',
    },
    {
        id: '2',
        title: "प्रिया सिंह बनाम एबीसी कॉर्पोरेशन",
        caseNumber: "CIV/1089/2022",
        petitioner: "प्रिया सिंह",
        respondent: "एबीसी कॉर्पोरेशन",
        invokedActs: ["उपभोक्ता संरक्षण अधिनियम, 2019", "अनुबंध अधिनियम, 1872"],
        filingDate: "2022-11-02",
        lastHearingDate: "2024-06-10",
        complexityScore: 6.2,
        summary: "प्रिया सिंह द्वारा एबीसी कॉर्पोरेशन के खिलाफ अनुबंध के उल्लंघन और दोषपूर्ण सेवाएं प्रदान करने के लिए दायर एक दीवानी मुकदमा। याचिकाकर्ता का दावा है कि प्रतिवादी द्वारा सेवा समझौते पर खरा न उतरने के कारण वित्तीय क्षति हुई है।",
        pii: { "प्रिया सिंह": "[REDACTED_PERSON]" },
        priority: 'Medium',
        caseType: 'Civil',
    },
     // Simplified remaining cases for brevity in Hindi
    {
        id: '3',
        title: "भारत संघ बनाम पर्यावरण समूह",
        caseNumber: "PIL/0045/2024",
        petitioner: "भारत संघ",
        respondent: "पर्यावरण समूह",
        invokedActs: ["राष्ट्रीय हरित अधिकरण अधिनियम"],
        filingDate: "2024-02-10",
        lastHearingDate: "2024-07-01",
        complexityScore: 9.1,
        summary: "एक प्रमुख बुनियादी ढांचा परियोजना के लिए पर्यावरण मंजूरी से संबंधित एक जनहित याचिका।",
        priority: 'High',
        caseType: 'PIL',
    },
    {
        id: '4',
        title: "अंजलि वर्मा बनाम सुनील वर्मा",
        caseNumber: "FAM/0312/2023",
        petitioner: "अंजलि वर्मा",
        respondent: "सुनील वर्मा",
        invokedActs: ["हिंदू विवाह अधिनियम, 1955"],
        filingDate: "2023-08-25",
        lastHearingDate: "2024-06-28",
        complexityScore: 5.5,
        summary: "तलाक और घरेलू हिंसा के आरोपों से संबंधित एक पारिवारिक मामला।",
        priority: 'Low',
        caseType: 'Divorce',
    },
];

const mockCasesOr: Case[] = [
    {
        id: '1',
        title: "ମହାରାଷ୍ଟ୍ର ରାଜ୍ୟ ବନାମ ରାଜ ଶର୍ମା",
        caseNumber: "CR/0255/2023",
        petitioner: "ମହାରାଷ୍ଟ୍ର ରାଜ୍ୟ",
        respondent: "ରାଜ ଶର୍ମା",
        invokedActs: ["ଭାରତୀୟ ଦଣ୍ଡ ସଂହିତା, ୧୮୬୦, ଧାରା ୩୦୨", "ଅସ୍ତ୍ରଶସ୍ତ୍ର ଆଇନ, ୧୯୫୯, ଧାରା ୨୫"],
        filingDate: "2023-01-15",
        lastHearingDate: "2024-05-20",
        complexityScore: 8.5,
        summary: "ହତ୍ୟା ଏବଂ ବେଆଇନ ଅସ୍ତ୍ରଶସ୍ତ୍ର ରଖିବା ଅଭିଯୋଗରେ ଏକ ଫୌଜଦାରୀ ମାମଲା। ଅଭିଯୋଜକ ପକ୍ଷ ଅଭିଯୋଗ କରିଛନ୍ତି ଯେ ଉତ୍ତରଦାତା ରାଜ ଶର୍ମା ଏକ ଘାତକ ଗୁଳିକାଣ୍ଡରେ ସମ୍ପୃକ୍ତ ଥିଲେ। ମୁଖ୍ୟ ପ୍ରମାଣ ମଧ୍ୟରେ ପ୍ରତ୍ୟକ୍ଷଦର୍ଶୀଙ୍କ ସାକ୍ଷ୍ୟ ଏବଂ ଫୋରେନସିକ୍ ରିପୋର୍ଟ ଅନ୍ତର୍ଭୁକ୍ତ।",
        pii: { "ରାଜ ଶର୍ମା": "[REDACTED_PERSON]" },
        priority: 'High',
        caseType: 'Criminal',
    },
    {
        id: '2',
        title: "ପ୍ରିୟା ସିଂ ବନାମ ଏବିସି କର୍ପୋରେସନ୍",
        caseNumber: "CIV/1089/2022",
        petitioner: "ପ୍ରିୟା ସିଂ",
        respondent: "ଏବିସି କର୍ପୋରେସନ୍",
        invokedActs: ["ଉପଭୋକ୍ତା ସୁରକ୍ଷା ଆଇନ, ୨୦୧୯", "ଚୁକ୍ତିନାମା ଆଇନ, ୧୮୭୨"],
        filingDate: "2022-11-02",
        lastHearingDate: "2024-06-10",
        complexityScore: 6.2,
        summary: "ଚୁକ୍ତିନାମା ଉଲ୍ଲଂଘନ ଏବଂ ତ୍ରୁଟିପୂର୍ଣ୍ଣ ସେବା ପାଇଁ ପ୍ରିୟା ସିଂ ଏବିସି କର୍ପୋରେସନ୍ ବିରୁଦ୍ଧରେ ଦାୟର କରିଥିବା ଏକ ଦେୱାନୀ ମାମଲା।",
        priority: 'Medium',
        caseType: 'Civil',
    }
];

const mockCasesSa: Case[] = [
    {
        id: '1',
        title: "महाराष्ट्रराज्यम् विरुद्धं राजशर्मा",
        caseNumber: "CR/0255/2023",
        petitioner: "महाराष्ट्रराज्यम्",
        respondent: "राजशर्मा",
        invokedActs: ["भारतीयदण्डसंहिता, १८६०, धारा ३०२", "शस्त्रअधिनियमः, १९५९, धारा २५"],
        filingDate: "2023-01-15",
        lastHearingDate: "2024-05-20",
        complexityScore: 8.5,
        summary: "हत्यायाः तथा अवैधशस्त्रास्त्राणां धारनस्य आरोपैः युक्तम् एकम् आपराधिकं प्रकरणम्। अभियोजनपक्षः आरोपयति यत् प्रतिवादी राजशर्मा एकस्मिन् घातक-गोलिका-काण्डे संलिप्तः आसीत्। मुख्य-प्रमाणेषु प्रत्यक्षदर्शिनः साक्ष्यं तथा च फोरेंसिक-प्रतिवेदनम् अन्तर्भवति।",
        pii: { "राजशर्मा": "[REDACTED_PERSON]" },
        priority: 'High',
        caseType: 'Criminal',
    },
    {
        id: '2',
        title: "प्रियासिहः विरुद्धं एबीसी-निगमः",
        caseNumber: "CIV/1089/2022",
        petitioner: "प्रियासिहः",
        respondent: "एबीसी-निगमः",
        invokedActs: ["उपभोक्तृ-संरक्षण-अधिनियमः, २०१९"],
        filingDate: "2022-11-02",
        lastHearingDate: "2024-06-10",
        complexityScore: 6.2,
        summary: "अनुबन्ध-उल्लङ्घनार्थं तथा च दोषपूर्ण-सेवानां प्रदानार्थं एबीसी-निगमस्य विरुद्धं प्रियासिंहेन दाखिलः एकः दीवानी-वादः।",
        priority: 'Medium',
        caseType: 'Civil',
    }
];

const mockCasesUr: Case[] = [
    {
        id: '1',
        title: "ریاست مہاراشٹر بمقابلہ راج شرما",
        caseNumber: "CR/0255/2023",
        petitioner: "ریاست مہاراشٹر",
        respondent: "راج شرما",
        invokedActs: ["تعزیرات ہند، 1860، دفعہ 302", "آرمز ایکٹ، 1959، دفعہ 25"],
        filingDate: "2023-01-15",
        lastHearingDate: "2024-05-20",
        complexityScore: 8.5,
        summary: "قتل اور آتشیں اسلحہ کے غیر قانونی قبضے کے الزامات پر مبنی ایک فوجداری مقدمہ۔ استغاثة کا الزام ہے کہ جواب دہندہ، راج شرما، ایک مہلک فائرنگ میں ملوث تھا۔ کلیدی شواہد میں عینی شاہدین کی گواہی اور فرانزک رپورٹس شامل ہیں۔",
        pii: { "راج شرما": "[REDACTED_PERSON]" },
        priority: 'High',
        caseType: 'Criminal',
    },
    {
        id: '2',
        title: "پریا سنگھ بمقابلہ اے بی سی کارپوریشن",
        caseNumber: "CIV/1089/2022",
        petitioner: "پریا سنگھ",
        respondent: "اے بی سی کارپوریشن",
        invokedActs: ["کنزیومر پروٹیکشن ایکٹ، 2019"],
        filingDate: "2022-11-02",
        lastHearingDate: "2024-06-10",
        complexityScore: 6.2,
        summary: "معاہدے کی خلاف ورزی اور ناقص خدمات فراہم کرنے پر اے بی سی کارپوریشن کے خلاف پریا سنگھ کی طرف سے دائر کیا گیا دیوانی مقدمہ۔",
        priority: 'Medium',
        caseType: 'Civil',
    }
];

const mockCasesAs: Case[] = [
    {
        id: '1',
        title: "মহাৰাষ্ট্ৰ ৰাজ্য বনাম ৰাজ শৰ্মা",
        caseNumber: "CR/0255/2023",
        petitioner: "মহাৰাষ্ট্ৰ ৰাজ্য",
        respondent: "ৰাজ শৰ্মা",
        invokedActs: ["ভাৰতীয় দণ্ডবিধি, ১৮৬০, ধাৰা ৩০২", "অস্ত্ৰ আইন, ১৯৫৯, ধাৰা ২৫"],
        filingDate: "2023-01-15",
        lastHearingDate: "2024-05-20",
        complexityScore: 8.5,
        summary: "হত্যা আৰু অবৈধভাৱে আগ্নেয়াস্ত্ৰ ৰখাৰ অভিযোগ জড়িত এটা ফৌজ্জদাৰী গোচৰ। চৰকাৰী পক্ষই অভিযোগ কৰিছে যে উত্তৰদাতা ৰাজ শৰ্মা এটা মাৰাত্মক গুলীচালনাৰ ঘটনাত জড়িত আছিল। মূল প্ৰমাণবোৰৰ ভিতৰত আছে প্ৰত্যক্ষদৰ্শীৰ সাক্ষ্য আৰু ফৰেনচিক ৰিপৰ্ট।",
        pii: { "ৰাজ শৰ্মা": "[REDACTED_PERSON]" },
        priority: 'High',
        caseType: 'Criminal',
    },
    {
        id: '2',
        title: "প্ৰিয়া সিং বনাম এবিচি কৰ্পোৰেচন",
        caseNumber: "CIV/1089/2022",
        petitioner: "প্ৰিয়া সিং",
        respondent: "এবিচি কৰ্পোৰেচন",
        invokedActs: ["গ্ৰাহক সুৰক্ষা আইন, ২০১৯"],
        filingDate: "2022-11-02",
        lastHearingDate: "2024-06-10",
        complexityScore: 6.2,
        summary: "চুক্তি উলংঘন আৰু ত্ৰুটিপূৰ্ণ সেৱা প্ৰদানৰ বাবে এবিচি কৰ্পোৰেচনৰ বিৰুদ্ধে প্ৰিয়া সিঙে দাখিল কৰা এটা দেৱানী গোচৰ।",
        priority: 'Medium',
        caseType: 'Civil',
    }
];


export const mockNpsData = [
    { name: 'Promoters', value: 65, fill: '#4ade80' },
    { name: 'Passives', value: 25, fill: '#facc15' },
    { name: 'Detractors', value: 10, fill: '#f87171' },
];

export const getMockCases = (language: string): Case[] => {
    switch (language) {
        case 'hi': return mockCasesHi;
        case 'or': return mockCasesOr;
        case 'sa': return mockCasesSa;
        case 'ur': return mockCasesUr;
        case 'as': return mockCasesAs;
        // Fallback to Hindi for other Devanagari-ish languages if specific mock data isn't available, 
        // or En if script is different.
        case 'mr': return mockCasesHi; // Using Hindi mock as placeholder for Marathi (usually shared script)
        case 'ne': return mockCasesHi; // Using Hindi mock as placeholder for Nepali
        // Fallback to English for others for now
        case 'en':
        default:
            return mockCasesEn;
    }
};
