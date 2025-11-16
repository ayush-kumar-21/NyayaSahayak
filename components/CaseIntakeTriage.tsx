
import React, { useState, useEffect } from 'react';
import { Case, PredictionResult, User, HistoryItem } from '../types';
import { geminiService } from '../services/geminiService';
import { piiService } from '../services/piiService';
import Spinner from './common/Spinner';
import Modal from './common/Modal';
import { Language } from '../hooks/useLocalization';

// --- Type Definitions ---
interface CaseIntakeTriageProps {
    t: (key: string) => string;
    allCases: Case[];
    setAllCases: React.Dispatch<React.SetStateAction<Case[]>>;
    selectedCase: Case | null;
    setSelectedCase: (caseData: Case | null) => void;
    language: Language;
    currentUser: User;
    logActivity: (type: HistoryItem['type'], details: string) => void;
}
type CaseTypeFilter = 'All' | Case['caseType'];


// --- Hardcoded Data ---
const courtTypes = ['District Court', 'High Court', 'Supreme Court', 'Tribunal'];
const indianStatesAndUTs = [
    'Andaman and Nicobar Islands',
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chandigarh',
    'Chhattisgarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu and Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Ladakh',
    'Lakshadweep',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Puducherry',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal'
];
const courtNumbers = ['Court 01', 'Court 02', 'Court 03', 'Court 04', 'Court 05'];

// --- Reusable Child Components ---

const StatCard: React.FC<{ icon: string; value: number; title: string; subtitle: string; color: string; }> = ({ icon, value, title, subtitle, color }) => (
    <div className="bg-white dark:bg-slate-800/60 p-4 rounded-xl shadow-md flex items-center gap-4 border border-transparent dark:border-slate-700">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
            <i className={`fas ${icon} text-white text-xl`}></i>
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
    </div>
);

const CaseCard: React.FC<{ caseData: Case; isSelected: boolean; onSelect: () => void; }> = ({ caseData, isSelected, onSelect }) => {
    const typeColors: { [key in Case['caseType']]: string } = {
        Criminal: 'bg-red-200 text-red-800 dark:bg-red-900/70 dark:text-red-300',
        Civil: 'bg-blue-200 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300',
        Family: 'bg-green-200 text-green-800 dark:bg-green-900/70 dark:text-green-300',
        Divorce: 'bg-purple-200 text-purple-800 dark:bg-purple-900/70 dark:text-purple-300',
        PIL: 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900/70 dark:text-indigo-300',
    };
    const priorityColors = {
        High: 'bg-red-500 text-white',
        Medium: 'bg-yellow-500 text-white',
        Low: 'bg-green-500 text-white',
    };

    return (
        <div 
            onClick={onSelect} 
            className={`p-3 rounded-lg cursor-pointer transition-all duration-300 border-2 ${
                isSelected 
                    ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500 shadow-lg' 
                    : 'bg-white dark:bg-slate-800/80 border-transparent hover:border-blue-400/50 hover:shadow-md'
            }`}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{caseData.caseNumber}</p>
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate" title={caseData.title}>{caseData.title}</h3>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${typeColors[caseData.caseType]}`}>
                    {caseData.caseType}
                </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                    <i className="fas fa-user-friends text-gray-400"></i>
                    <span className="truncate">{caseData.petitioner}</span>
                </div>
                {caseData.priority && (
                    <span className={`font-bold px-2 py-0.5 rounded-md ${priorityColors[caseData.priority]}`}>
                        {caseData.priority} Priority
                    </span>
                )}
            </div>
        </div>
    );
};

const NoCaseSelected: React.FC<{ t: (key: string) => string }> = ({ t }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-6">
        <i className="far fa-file-alt text-6xl mb-4"></i>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">{t('select_case_prompt')}</h3>
        <p>{t('select_case_instructions')}</p>
    </div>
);

const CreateCaseModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (newCase: Omit<Case, 'id' | 'complexityScore' | 'filingDate' | 'lastHearingDate'>) => void; t: (key: string) => string; }> = ({ isOpen, onClose, onSave, t }) => {
    const [newCaseData, setNewCaseData] = useState({
        title: '',
        caseNumber: `CR/${Math.floor(Math.random() * 1000)}/${new Date().getFullYear()}`,
        petitioner: '',
        respondent: '',
        summary: '',
        caseType: 'Civil' as Case['caseType'],
        invokedActs: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewCaseData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        const finalCaseData = {
            ...newCaseData,
            invokedActs: newCaseData.invokedActs.split(',').map(s => s.trim()).filter(Boolean),
        };
        onSave(finalCaseData);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('create_new_case')}>
            <div className="space-y-4">
                <input name="title" value={newCaseData.title} onChange={handleChange} placeholder={t('case_title')} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                <input name="caseNumber" value={newCaseData.caseNumber} onChange={handleChange} placeholder={t('case_number')} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                <input name="petitioner" value={newCaseData.petitioner} onChange={handleChange} placeholder={t('petitioner')} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                <input name="respondent" value={newCaseData.respondent} onChange={handleChange} placeholder={t('respondent')} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                <textarea name="summary" value={newCaseData.summary} onChange={handleChange} placeholder={t('case_summary')} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" rows={3}></textarea>
                <input name="invokedActs" value={newCaseData.invokedActs} onChange={handleChange} placeholder={t('acts_involved')} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                <select name="caseType" value={newCaseData.caseType} onChange={handleChange} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                    <option value="Civil">{t('case_type_civil')}</option>
                    <option value="Criminal">{t('case_type_criminal')}</option>
                    <option value="Family">{t('case_type_family')}</option>
                    <option value="Divorce">Divorce</option>
                    <option value="PIL">Public Interest Litigation</option>
                </select>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm font-medium">{t('cancel')}</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">{t('create')}</button>
            </div>
        </Modal>
    );
};

const PredictionResultDisplay: React.FC<{ prediction: PredictionResult; t: (key: string) => string; }> = ({ prediction, t }) => {
    const priorityColors: { [key in PredictionResult['priority']]: string } = {
        High: 'bg-red-500 text-white',
        Medium: 'bg-yellow-500 text-white',
        Low: 'bg-green-500 text-white',
    };
    const priorityIcons: { [key in PredictionResult['priority']]: string } = {
        High: 'fas fa-exclamation-triangle',
        Medium: 'fas fa-hourglass-half',
        Low: 'fas fa-check-circle',
    };

    return (
        <div className="mt-6 p-4 sm:p-6 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 content-animate">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('prediction_result_header')}</h3>
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-gray-500 dark:text-gray-400 text-sm mb-1">{t('priority')}</h4>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${priorityColors[prediction.priority]}`}>
                         <i className={priorityIcons[prediction.priority]}></i>
                        <span>{prediction.priority}</span>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-500 dark:text-gray-400 text-sm mb-1">{t('rationale')}</h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{prediction.rationale}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-500 dark:text-gray-400 text-sm mb-1">{t('contributing_factors')}</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                        {prediction.contributingFactors.map((factor, index) => (
                            <li key={index}>{factor}</li>
                        ))}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold text-gray-500 dark:text-gray-400 text-sm mb-1">{t('legal_citations')}</h4>
                     <div className="flex flex-wrap gap-2">
                        {prediction.legalCitations.map((citation, index) => (
                             <span key={index} className="bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200 text-xs font-semibold px-3 py-1 rounded-full">{citation}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

const CaseIntakeTriage: React.FC<CaseIntakeTriageProps> = ({ t, allCases, setAllCases, selectedCase, setSelectedCase, language, currentUser, logActivity }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [isPiiModalOpen, setIsPiiModalOpen] = useState(false);
    const [detectedPii, setDetectedPii] = useState<{ [key: string]: string }>({});
    const [caseNotes, setCaseNotes] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filteredCases, setFilteredCases] = useState<Case[]>(allCases);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCaseType, setActiveCaseType] = useState<CaseTypeFilter>('All');
    
    // Apply filters whenever dependencies change
    useEffect(() => {
        let cases = [...allCases];
        const lowercasedSearch = searchTerm.toLowerCase();

        if (activeCaseType !== 'All') {
            cases = cases.filter(c => c.caseType === activeCaseType);
        }

        if (searchTerm) {
            cases = cases.filter(c => 
                c.title.toLowerCase().includes(lowercasedSearch) ||
                c.caseNumber.toLowerCase().includes(lowercasedSearch) ||
                c.petitioner.toLowerCase().includes(lowercasedSearch) ||
                c.respondent.toLowerCase().includes(lowercasedSearch)
            );
        }

        setFilteredCases(cases);
    }, [searchTerm, activeCaseType, allCases]);

    // Update notes and prediction when selected case changes
    useEffect(() => {
        if (selectedCase) {
            setPrediction(null);
            setCaseNotes(selectedCase.notes || '');
        }
    }, [selectedCase]);

    const handlePredict = async () => {
        if (!selectedCase) return;
        setIsLoading(true);
        setPrediction(null);
        
        const piiResult = piiService.scan(selectedCase);
        if (piiResult.found && Object.keys(piiResult.pii).length > 0) {
            setDetectedPii(piiResult.pii);
            setIsPiiModalOpen(true);
        } else {
            await proceedWithPrediction(selectedCase);
        }
    };

    const proceedWithPrediction = async (caseToProcess: Case) => {
        const result = await geminiService.predictCaseOutcome(caseToProcess, language);
        setPrediction(result);
        setIsLoading(false);
    };

    const handlePiiConfirm = async () => {
        if (!selectedCase) return;
        setIsPiiModalOpen(false);
        const redactedCase = piiService.redact(selectedCase, detectedPii);
        await proceedWithPrediction(redactedCase);
    };

    const handleCreateCase = (newCaseData: Omit<Case, 'id' | 'complexityScore' | 'filingDate' | 'lastHearingDate'>) => {
        const today = new Date().toISOString().split('T')[0];
        const newCase: Case = {
            ...newCaseData,
            id: new Date().toISOString() + Math.random(),
            complexityScore: Math.round(Math.random() * 5 + 3), // Mock score
            filingDate: today,
            lastHearingDate: today,
            userId: currentUser.email
        };
        setAllCases(prev => [newCase, ...prev]);
        setSelectedCase(newCase);
        logActivity('CASE_CREATED', t('history_case_created').replace('{title}', newCase.title));
    };
    
    const caseTypeFilters: { label: string; type: CaseTypeFilter; count: number }[] = [
        { label: 'All Cases', type: 'All', count: allCases.length },
        { label: 'Civil Cases', type: 'Civil', count: allCases.filter(c => c.caseType === 'Civil').length },
        { label: 'Criminal Cases', type: 'Criminal', count: allCases.filter(c => c.caseType === 'Criminal').length },
        { label: 'Family Cases', type: 'Family', count: allCases.filter(c => c.caseType === 'Family').length },
        { label: 'Divorce Cases', type: 'Divorce', count: allCases.filter(c => c.caseType === 'Divorce').length },
    ];
    
    return (
        <div className="text-gray-800 dark:text-gray-200 h-full flex flex-col space-y-4">
            <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Case Intake & Triage</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Efficiently manage and prioritize incoming cases with intelligent triage system</p>
            </div>
            
            {/* Court Selection */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800/80 dark:to-purple-800/80 p-4 rounded-xl shadow-lg text-white">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div>
                        <label className="block text-xs font-semibold mb-1 opacity-80">Court Type</label>
                        <select className="w-full p-2 rounded-lg bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white">
                            {courtTypes.map(type => <option key={type} className="text-black">{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1 opacity-80">Location</label>
                        <select className="w-full p-2 rounded-lg bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white">
                            {indianStatesAndUTs.map(s => <option key={s} className="text-black">{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-xs font-semibold mb-1 opacity-80">Court Number</label>
                        <select className="w-full p-2 rounded-lg bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white">
                            {courtNumbers.map(s => <option key={s} className="text-black">{s}</option>)}
                        </select>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="font-semibold text-sm sm:text-base">Today: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>
            
            {/* Stats Cards */}
            <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="fa-exclamation-triangle" value={3} title="CRITICAL CASES" subtitle="Immediate attention required" color="bg-red-500" />
                <StatCard icon="fa-hourglass-half" value={8} title="HIGH PRIORITY" subtitle="Expedited processing" color="bg-yellow-500" />
                <StatCard icon="fa-chart-line" value={24} title="IN PROGRESS" subtitle="Active proceedings" color="bg-blue-500" />
                <StatCard icon="fa-check-circle" value={156} title="COMPLETED" subtitle="This month" color="bg-green-500" />
            </div>

            {/* Main two-column layout */}
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">

                {/* Left Column */}
                <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
                    {/* Search & Filter */}
                    <div className="flex-shrink-0 bg-white dark:bg-slate-800/60 p-4 rounded-xl shadow-md border border-gray-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200">{t('filters')}</h3>
                            <button onClick={() => { setSearchTerm(''); setActiveCaseType('All'); }} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{t('clear')}</button>
                        </div>
                        <div className="relative mb-4">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t('search_by_title_number')}
                            />
                        </div>
                        <div className="space-y-2">
                             {caseTypeFilters.map(filter => (
                                <button
                                    key={filter.type}
                                    onClick={() => setActiveCaseType(filter.type)}
                                    className={`w-full text-left p-2 rounded-lg flex justify-between items-center transition-colors ${
                                        activeCaseType === filter.type ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span>{filter.label}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${activeCaseType === filter.type ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'}`}>{filter.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Case Queue */}
                    <div className="bg-white dark:bg-slate-800/60 p-4 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 flex-grow flex flex-col overflow-hidden">
                         <div className="flex-shrink-0 flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200">{t('case_list_header')}</h3>
                            <button onClick={() => setIsCreateModalOpen(true)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                                <i className="fas fa-plus mr-2"></i>{t('create_new_case')}
                            </button>
                        </div>
                        <div className="flex-grow space-y-2 overflow-y-auto pr-2">
                            {filteredCases.length > 0 ? filteredCases.map(caseData => (
                                <CaseCard 
                                    key={caseData.id}
                                    caseData={caseData}
                                    isSelected={selectedCase?.id === caseData.id}
                                    onSelect={() => setSelectedCase(caseData)}
                                />
                            )) : (
                                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                    <i className="fas fa-folder-open text-3xl mb-2"></i>
                                    <p>{t('no_cases_found')}</p>
                                    <p className="text-sm">{t('try_adjusting_filters')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800/60 p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-y-auto">
                    {selectedCase ? (
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-800 dark:text-white">{selectedCase.title}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono">{selectedCase.caseNumber}</p>
                            
                            <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl mb-4">
                                <p className="mb-4 text-gray-700 dark:text-gray-300">{selectedCase.summary}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                                    <div><strong className="block text-gray-500 dark:text-gray-400">{t('petitioner')}</strong> {selectedCase.petitioner}</div>
                                    <div><strong className="block text-gray-500 dark:text-gray-400">{t('respondent')}</strong> {selectedCase.respondent}</div>
                                    <div><strong className="block text-gray-500 dark:text-gray-400">{t('filing_date')}</strong> {selectedCase.filingDate}</div>
                                    <div><strong className="block text-gray-500 dark:text-gray-400">{t('last_hearing')}</strong> {selectedCase.lastHearingDate}</div>
                                </div>
                                <div>
                                    <strong className="block text-gray-500 dark:text-gray-400 mb-2">{t('invoked_acts')}</strong>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCase.invokedActs.map(act => (
                                            <span key={act} className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-1 rounded-full">{act}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                onClick={handlePredict}
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-gray-400 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Spinner /> : <i className="fas fa-gavel"></i>}
                                {t('predict_outcome_button')}
                            </button>
                            
                            {/* Prediction Result Section */}
                            { isLoading &&
                                <div className="mt-6 flex justify-center items-center p-8 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                                    <Spinner />
                                </div>
                            }
                            { prediction && !isLoading &&
                                <PredictionResultDisplay prediction={prediction} t={t} />
                            }

                        </div>
                    ) : (
                       <NoCaseSelected t={t} />
                    )}
                </div>
            </div>

            <Modal isOpen={isPiiModalOpen} onClose={() => setIsPiiModalOpen(false)} title={t('pii_modal_title')}>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('pii_modal_desc')}</p>
                    <div className="mt-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-h-40 overflow-y-auto">
                        <ul className="text-sm">
                            {Object.entries(detectedPii).map(([key, value]) => (
                                <li key={key} className="flex items-center">
                                    <span className="font-mono text-red-500 dark:text-red-400">{key}</span>
                                    <i className="fas fa-arrow-right mx-2 text-gray-400"></i>
                                    <span className="font-mono text-green-600 dark:text-green-400">{value}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={() => setIsPiiModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm font-medium">{t('pii_modal_cancel')}</button>
                        <button onClick={handlePiiConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">{t('pii_modal_confirm')}</button>
                    </div>
                </Modal>
            <CreateCaseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateCase} t={t} />
        </div>
    );
};

export default CaseIntakeTriage;
