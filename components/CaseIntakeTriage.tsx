
import React, { useState, useEffect } from 'react';
import { Case, PredictionResult, User, HistoryItem } from '../types';
import { geminiService } from '../services/geminiService';
import { piiService } from '../services/piiService';
import Spinner from './common/Spinner';
import Modal from './common/Modal';
import { Language, useLocalization } from '../hooks/useLocalization';
import AnimatedPageWrapper from './common/AnimatedPageWrapper';

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
type PriorityFilter = 'All' | 'High' | 'Medium' | 'Low';

const StatCard: React.FC<{ icon: string; value: number; title: string; subtitle: string; color: string; formatNumber: (n: number) => string }> = ({ icon, value, title, subtitle, color, formatNumber }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full group">
        <div className="flex justify-between items-start mb-3">
            <div>
                 <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                 <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatNumber(value)}</h3>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} bg-opacity-10 dark:bg-opacity-20 group-hover:scale-110 transition-transform duration-300`}>
                <i className={`fas ${icon} text-lg ${color.replace('bg-', 'text-')}`}></i>
            </div>
        </div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{subtitle}</p>
    </div>
);

const CaseCard: React.FC<{ caseData: Case; isSelected: boolean; onSelect: () => void; formatNumber: (n: string) => string }> = ({ caseData, isSelected, onSelect, formatNumber }) => {
    const typeColors: { [key in Case['caseType']]: string } = {
        Criminal: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30',
        Civil: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30',
        Family: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30',
        Divorce: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30',
        PIL: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30',
    };
    
    return (
        <div 
            onClick={onSelect} 
            className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border mb-2 ${
                isSelected 
                    ? 'bg-white dark:bg-gray-700 border-blue-500 shadow-md ring-1 ring-blue-500/20' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/50 px-2 py-0.5 rounded">{formatNumber(caseData.caseNumber)}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${typeColors[caseData.caseType]}`}>
                    {caseData.caseType}
                </span>
            </div>
            <h3 className={`font-semibold text-sm leading-snug mb-3 ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                {caseData.title}
            </h3>
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50 dark:border-gray-700/50">
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px] flex items-center gap-1.5">
                    <i className="fas fa-user-circle"></i> {caseData.petitioner}
                </span>
                {caseData.priority && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        caseData.priority === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 
                        caseData.priority === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    }`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${
                            caseData.priority === 'High' ? 'bg-red-500' : 
                            caseData.priority === 'Medium' ? 'bg-amber-500' : 
                            'bg-emerald-500'
                         }`}></span>
                        {caseData.priority}
                    </span>
                )}
            </div>
        </div>
    );
};

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

    const inputClass = "w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm placeholder-gray-400";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('create_new_case')}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input name="caseNumber" value={newCaseData.caseNumber} onChange={handleChange} placeholder={t('case_number')} className={inputClass} />
                    <select name="caseType" value={newCaseData.caseType} onChange={handleChange} className={inputClass}>
                        <option value="Civil">{t('case_type_civil')}</option>
                        <option value="Criminal">{t('case_type_criminal')}</option>
                        <option value="Family">{t('case_type_family')}</option>
                        <option value="Divorce">Divorce</option>
                        <option value="PIL">Public Interest Litigation</option>
                    </select>
                </div>
                <input name="title" value={newCaseData.title} onChange={handleChange} placeholder={t('case_title')} className={inputClass} />
                <div className="grid grid-cols-2 gap-4">
                    <input name="petitioner" value={newCaseData.petitioner} onChange={handleChange} placeholder={t('petitioner')} className={inputClass} />
                    <input name="respondent" value={newCaseData.respondent} onChange={handleChange} placeholder={t('respondent')} className={inputClass} />
                </div>
                <textarea name="summary" value={newCaseData.summary} onChange={handleChange} placeholder={t('case_summary')} className={`${inputClass} resize-none h-32`}></textarea>
                <input name="invokedActs" value={newCaseData.invokedActs} onChange={handleChange} placeholder={t('acts_involved')} className={inputClass} />
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                <button onClick={onClose} className="px-5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">{t('cancel')}</button>
                <button onClick={handleSubmit} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20">{t('create')}</button>
            </div>
        </Modal>
    );
};

const PredictionResultDisplay: React.FC<{ prediction: PredictionResult; t: (key: string) => string; }> = ({ prediction, t }) => {
    const priorityConfig: { [key in PredictionResult['priority']]: { color: string, bg: string, icon: string } } = {
        High: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10', icon: 'fa-exclamation-triangle' },
        Medium: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10', icon: 'fa-exclamation-circle' },
        Low: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10', icon: 'fa-check-circle' },
    };
    
    const config = priorityConfig[prediction.priority];

    return (
        <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-fade-in-up shadow-sm">
            <div className="flex items-center gap-4 mb-5 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <i className={`fas fa-brain text-purple-600 dark:text-purple-400 text-lg`}></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('prediction_result_header')}</h3>
                <div className={`ml-auto px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${config.bg} ${config.color} border-opacity-50`}>
                    <i className={`fas ${config.icon}`}></i>
                    {prediction.priority} Priority
                </div>
            </div>
            
            <div className="space-y-5">
                <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('rationale')}</h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 leading-relaxed">
                        {prediction.rationale}
                    </p>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('contributing_factors')}</h4>
                        <ul className="space-y-2">
                            {prediction.contributingFactors.map((factor, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <i className="fas fa-caret-right text-blue-500 mt-1"></i>
                                    {factor}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('legal_citations')}</h4>
                        <div className="flex flex-wrap gap-2">
                            {prediction.legalCitations.map((citation, index) => (
                                <span key={index} className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-mono rounded-lg border border-gray-200 dark:border-gray-600">
                                    {citation}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CaseIntakeTriage: React.FC<CaseIntakeTriageProps> = ({ t, allCases, setAllCases, selectedCase, setSelectedCase, language, currentUser, logActivity }) => {
    const { formatNumber } = useLocalization(language);
    const [isLoading, setIsLoading] = useState(false);
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [isPiiModalOpen, setIsPiiModalOpen] = useState(false);
    const [detectedPii, setDetectedPii] = useState<{ [key: string]: string }>({});
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filteredCases, setFilteredCases] = useState<Case[]>(allCases);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCaseType, setActiveCaseType] = useState<CaseTypeFilter>('All');
    const [activePriority, setActivePriority] = useState<PriorityFilter>('All');
    const [mobileTab, setMobileTab] = useState<'list' | 'details'>('list');
    
    // Notes State
    const [notes, setNotes] = useState('');

    useEffect(() => {
        let cases = [...allCases];
        const lowercasedSearch = searchTerm.toLowerCase();
        
        if (activeCaseType !== 'All') {
            cases = cases.filter(c => c.caseType === activeCaseType);
        }

        if (activePriority !== 'All') {
            cases = cases.filter(c => c.priority === activePriority);
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
    }, [searchTerm, activeCaseType, activePriority, allCases]);

    useEffect(() => {
        if (selectedCase) {
            setPrediction(null);
            setNotes(selectedCase.notes || '');
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
            complexityScore: Math.round(Math.random() * 5 + 3),
            filingDate: today,
            lastHearingDate: today,
            userId: currentUser.email
        };
        setAllCases(prev => [newCase, ...prev]);
        setSelectedCase(newCase);
        logActivity('CASE_CREATED', t('history_case_created').replace('{title}', newCase.title));
    };

    const handleCaseSelect = (caseData: Case) => {
        setSelectedCase(caseData);
        setMobileTab('details');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveNotes = () => {
        if (!selectedCase) return;
        const updatedCases = allCases.map(c => 
            c.id === selectedCase.id ? { ...c, notes } : c
        );
        setAllCases(updatedCases);
        // Update current selected object too
        setSelectedCase({ ...selectedCase, notes });
        alert('Notes saved successfully.'); // Simple feedback
    };
    
    // Calculate counts based on mutual filtering (Case Type <-> Priority)
    const caseTypeFilters: { label: string; type: CaseTypeFilter; count: number }[] = [
        { label: 'All', type: 'All' },
        { label: 'Civil', type: 'Civil' },
        { label: 'Criminal', type: 'Criminal' },
        { label: 'Family', type: 'Family' },
        { label: 'Divorce', type: 'Divorce' },
        { label: 'PIL', type: 'PIL' },
    ].map(f => ({
        label: f.label,
        type: f.type as CaseTypeFilter,
        count: allCases.filter(c => 
            (f.type === 'All' || c.caseType === f.type) && 
            (activePriority === 'All' || c.priority === activePriority)
        ).length
    }));

    const priorityFilters: { label: string; type: PriorityFilter; count: number; color: string }[] = [
        { label: 'All', type: 'All', count: 0, color: 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300' },
        { label: 'High', type: 'High', count: 0, color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' },
        { label: 'Medium', type: 'Medium', count: 0, color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
        { label: 'Low', type: 'Low', count: 0, color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' },
    ].map(f => ({
        label: f.label,
        type: f.type as PriorityFilter,
        color: f.color,
        count: allCases.filter(c => 
            (activeCaseType === 'All' || c.caseType === activeCaseType) && 
            (f.type === 'All' || c.priority === f.type)
        ).length
    }));

    // Complexity Color Logic
    const getComplexityColor = (score: number) => {
        if (score >= 8) return 'text-red-600 dark:text-red-400';
        if (score >= 5) return 'text-amber-600 dark:text-amber-400';
        return 'text-emerald-600 dark:text-emerald-400';
    };
    
    return (
        <AnimatedPageWrapper>
        <div className="flex flex-col h-full space-y-4 max-w-full mx-auto">
            {/* Stats Row */}
            <div className={`${mobileTab === 'details' ? 'hidden lg:grid' : 'grid'} grid-cols-2 lg:grid-cols-4 gap-4 lg:flex-shrink-0`}>
                <StatCard icon="fa-fire" value={3} title="Critical Cases" subtitle="Needs Attention" color="bg-red-500" formatNumber={formatNumber} />
                <StatCard icon="fa-clock" value={8} title="Pending Review" subtitle="Expedited" color="bg-amber-500" formatNumber={formatNumber} />
                <StatCard icon="fa-gavel" value={24} title="Active Trials" subtitle="In Progress" color="bg-blue-500" formatNumber={formatNumber} />
                <StatCard icon="fa-check-double" value={156} title="Closed Cases" subtitle="This Month" color="bg-emerald-500" formatNumber={formatNumber} />
            </div>

            {/* Main Layout */}
            <div className="flex-grow lg:grid lg:grid-cols-12 gap-6 lg:overflow-hidden min-h-[600px]">
                {/* Sidebar */}
                <div className={`${mobileTab === 'list' ? 'flex' : 'hidden'} lg:flex lg:col-span-4 flex-col gap-3 h-full lg:overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-lg transition-all`}>
                    <div className="relative">
                        <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full py-2.5 pl-10 pr-10 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/50 outline-none text-gray-900 dark:text-gray-200 text-sm placeholder-gray-400 transition-all"
                            placeholder={t('search_by_title_number')}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <i className="fas fa-times-circle"></i>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        {/* Case Type Filters */}
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                            {caseTypeFilters.map(filter => (
                                <button
                                    key={filter.type}
                                    onClick={() => setActiveCaseType(filter.type)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                                        activeCaseType === filter.type 
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {filter.label} <span className="opacity-75 ml-1">({formatNumber(filter.count)})</span>
                                </button>
                            ))}
                        </div>
                        
                        {/* Priority Filters */}
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 border-b border-gray-100 dark:border-gray-700/50 mb-1">
                            {priorityFilters.map(filter => (
                                <button
                                    key={filter.type}
                                    onClick={() => setActivePriority(filter.type)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                                        activePriority === filter.type 
                                        ? `ring-1 ring-blue-400 dark:ring-white ${filter.color} shadow-sm`
                                        : `${filter.color} opacity-70 hover:opacity-100 hover:bg-opacity-70`
                                    }`}
                                >
                                    {filter.label} <span className="opacity-75 ml-1">({formatNumber(filter.count)})</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center px-1 mt-1">
                         <h3 className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('case_list_header')}</h3>
                         <button onClick={() => setIsCreateModalOpen(true)} className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded-lg transition-colors" title={t('create_new_case')}>
                             <i className="fas fa-plus"></i>
                         </button>
                    </div>
                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                        {filteredCases.length > 0 ? filteredCases.map(caseData => (
                            <CaseCard 
                                key={caseData.id}
                                caseData={caseData}
                                isSelected={selectedCase?.id === caseData.id}
                                onSelect={() => handleCaseSelect(caseData)}
                                formatNumber={formatNumber}
                            />
                        )) : (
                            <div className="text-center py-12 text-gray-500"><p className="text-sm">{t('no_cases_found')}</p></div>
                        )}
                    </div>
                </div>

                {/* Detail View */}
                <div className={`${mobileTab === 'details' ? 'flex' : 'hidden'} lg:flex lg:col-span-8 flex-col h-full lg:overflow-y-auto rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-2xl relative transition-colors`}>
                    {selectedCase ? (
                        <div className="animate-fade-in-up w-full">
                            <div className="lg:hidden p-4 border-b border-gray-100 dark:border-gray-700">
                                <button onClick={() => setMobileTab('list')} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
                                    <i className="fas fa-arrow-left"></i> Back to List
                                </button>
                            </div>
                            
                            {/* Header Banner */}
                            <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-mono border border-gray-300 dark:border-gray-600">
                                                {formatNumber(selectedCase.caseNumber)}
                                            </span>
                                            {/* Complexity Score Badge */}
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Complexity</span>
                                                <span className={`text-xs font-bold ${getComplexityColor(selectedCase.complexityScore)}`}>
                                                    {formatNumber(selectedCase.complexityScore)}/10
                                                </span>
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-2">{selectedCase.title}</h2>
                                    </div>
                                    <button
                                        onClick={handlePredict}
                                        disabled={isLoading}
                                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap transform hover:-translate-y-0.5"
                                    >
                                        {isLoading ? <Spinner /> : (
                                            <>AI Triage <i className="fas fa-magic"></i></>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-5 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t('petitioner')}</p>
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{selectedCase.petitioner}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t('respondent')}</p>
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{selectedCase.respondent}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t('filing_date')}</p>
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 font-mono">{formatNumber(selectedCase.filingDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t('last_hearing')}</p>
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 font-mono">{formatNumber(selectedCase.lastHearingDate)}</p>
                                    </div>
                                </div>

                                {/* Summary */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                        <i className="fas fa-align-left text-gray-400"></i> {t('case_summary')}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed bg-white dark:bg-gray-900/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">{selectedCase.summary}</p>
                                </div>

                                {/* Invoked Acts */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                        <i className="fas fa-gavel text-gray-400"></i> {t('invoked_acts')}
                                    </h3>
                                    <div className="flex flex-wrap gap-2.5">
                                        {selectedCase.invokedActs.map(act => (
                                            <span key={act} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600">
                                                {formatNumber(act)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Case Notes Section */}
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                            <i className="fas fa-sticky-note text-gray-400"></i> {t('case_notes')}
                                        </h3>
                                        <button onClick={handleSaveNotes} className="text-xs px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-semibold transition-colors">
                                            <i className="fas fa-save mr-1"></i> {t('save_notes')}
                                        </button>
                                    </div>
                                    <textarea 
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full h-32 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none placeholder-gray-400 transition-all"
                                        placeholder={t('add_notes_placeholder')}
                                    ></textarea>
                                </div>

                                {prediction && !isLoading && <PredictionResultDisplay prediction={prediction} t={t} />}
                            </div>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-6">
                                <i className="far fa-folder-open text-4xl opacity-40"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">{t('select_case_prompt')}</h3>
                            <p className="text-sm max-w-xs text-gray-500">{t('select_case_instructions')}</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isPiiModalOpen} onClose={() => setIsPiiModalOpen(false)} title={t('pii_modal_title')}>
                    <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">{t('pii_modal_desc')}</p>
                    <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto custom-scrollbar mb-4">
                        <ul className="space-y-2">
                            {Object.entries(detectedPii).map(([key, value]) => (
                                <li key={key} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <span className="font-mono text-red-600 dark:text-red-400 text-xs">{key}</span>
                                    <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                                    <span className="font-mono text-green-600 dark:text-green-400 text-xs">{value}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsPiiModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors">{t('pii_modal_cancel')}</button>
                        <button onClick={handlePiiConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors font-medium">{t('pii_modal_confirm')}</button>
                    </div>
            </Modal>
            <CreateCaseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateCase} t={t} />
        </div>
        </AnimatedPageWrapper>
    );
};

export default CaseIntakeTriage;
