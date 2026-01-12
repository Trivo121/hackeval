import React, { useState, useEffect } from 'react';
import {
    ArrowRight, ArrowLeft, CheckCircle, Plus, Trash2,
    Layout, Target, HardDrive, FileText, PieChart,
    AlertCircle, ChevronRight, X, Play
} from 'lucide-react';

const CreateProjectPage = ({ onBack, onLaunch }) => {
    // --- STATE MANAGEMENT ---
    const [currentStep, setCurrentStep] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);

    const [formData, setFormData] = useState({
        // Identity
        projectName: '',
        projectDesc: '',

        // Logic
        trackMode: 'ps', // 'ps' (Problem Statements) or 'theme'
        themeDesc: '',
        problemStatements: [{ title: '', desc: '' }],
        criteria: [
            { id: 1, name: 'Innovation', weight: 40 },
            { id: 2, name: 'Feasibility', weight: 30 },
            { id: 3, name: 'Tech Stack', weight: 30 },
        ],

        // Source
        driveLink: '',
        driveStatus: 'idle', // idle, checking, verified
        fileCount: 0
    });

    // --- ACTIONS ---

    const handleNext = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep(prev => Math.min(prev + 1, 3));
            setIsAnimating(false);
        }, 200);
    };

    const handlePrev = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep(prev => Math.max(prev - 1, 1));
            setIsAnimating(false);
        }, 200);
    };

    // Logic: Criteria Math
    const totalWeight = formData.criteria.reduce((acc, curr) => acc + parseInt(curr.weight || 0), 0);
    const isWeightValid = totalWeight === 100;

    const updateCriteria = (id, field, value) => {
        const newCriteria = formData.criteria.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        );
        setFormData({ ...formData, criteria: newCriteria });
    };

    const addCriterion = () => {
        const newId = Math.max(...formData.criteria.map(c => c.id)) + 1;
        setFormData({
            ...formData,
            criteria: [...formData.criteria, { id: newId, name: 'New Criteria', weight: 0 }]
        });
    };

    // Source: Simulate GDrive Connection
    const checkGDrive = () => {
        setFormData(prev => ({ ...prev, driveStatus: 'checking' }));
        setTimeout(() => {
            setFormData(prev => ({ ...prev, driveStatus: 'verified', fileCount: 42 }));
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 flex flex-col">

            {/* --- HEADER --- */}
            <nav className="w-full h-16 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center space-x-2 cursor-pointer" onClick={onBack}>
                    <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white" />
                    <span className="text-sm font-medium text-gray-400 hover:text-white">Back to Dashboard</span>
                </div>
                <div className="text-lg font-bold tracking-tight">Create New Evaluation</div>
                <div className="w-24"></div> {/* Spacer for center alignment */}
            </nav>

            <div className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* --- LEFT COLUMN: THE WIZARD --- */}
                <div className="lg:col-span-8 flex flex-col">

                    {/* 1. Glassmorphic Stepper */}
                    <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm flex justify-between items-center relative overflow-hidden">
                        {/* Background Progress Bar */}
                        <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-white/10 -z-10" />

                        {[
                            { id: 1, label: "Identity", icon: Layout },
                            { id: 2, label: "Logic", icon: Target },
                            { id: 3, label: "Source", icon: HardDrive }
                        ].map((step) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = step.id < currentStep;

                            return (
                                <div key={step.id} className="flex flex-col items-center bg-[#050505] px-4 z-10">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${isActive ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-110' :
                                            isCompleted ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                                'bg-white/5 text-gray-500 border-white/10'
                                            }`}
                                    >
                                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-xs mt-2 font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* 2. Dynamic Form Container */}
                    <div className={`flex-1 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>

                        {/* STEP 1: IDENTITY */}
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold">Project Identity</h2>
                                    <p className="text-gray-400">Give your hackathon evaluation a name and context.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="block text-sm text-gray-400 mb-2">Project Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Solana Summer Hackathon 2025"
                                            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-white focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all placeholder:text-gray-600"
                                            value={formData.projectName}
                                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-sm text-gray-400 mb-2">Description / Context (Optional)</label>
                                        <textarea
                                            placeholder="Briefly describe the goal of this hackathon to help the AI understand context..."
                                            className="w-full h-32 bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-white focus:border-white/40 focus:outline-none transition-all placeholder:text-gray-600 resize-none"
                                            value={formData.projectDesc}
                                            onChange={(e) => setFormData({ ...formData, projectDesc: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: LOGIC */}
                        {currentStep === 2 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold">Evaluation Logic</h2>
                                    <p className="text-gray-400">Define how the AI should score and rank teams.</p>
                                </div>

                                {/* PS vs Theme Toggle */}
                                <div className="p-1 bg-white/5 border border-white/10 rounded-lg inline-flex">
                                    <button
                                        onClick={() => setFormData({ ...formData, trackMode: 'ps' })}
                                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${formData.trackMode === 'ps' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Problem Statements
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, trackMode: 'theme' })}
                                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${formData.trackMode === 'theme' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Theme Based
                                    </button>
                                </div>

                                {/* Content based on Toggle */}
                                {formData.trackMode === 'ps' ? (
                                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-semibold">Problem Statements</h3>
                                            <button className="text-xs flex items-center space-x-1 text-gray-400 hover:text-white">
                                                <Plus className="w-3 h-3" /> <span>Add Statement</span>
                                            </button>
                                        </div>
                                        {/* List Builder */}
                                        <div className="space-y-3">
                                            {formData.problemStatements.map((ps, idx) => (
                                                <div key={idx} className="flex gap-4">
                                                    <div className="flex-1 space-y-2">
                                                        <input type="text" placeholder="PS Title (e.g. DeFi for All)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-white/40 outline-none" />
                                                        <input type="text" placeholder="Short description..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-white/40 outline-none" />
                                                    </div>
                                                    <button className="h-fit p-2 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-semibold mb-4">Theme Description</h3>
                                        <textarea
                                            className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-white/40 outline-none resize-none"
                                            placeholder="Paste your hackathon theme or track details here..."
                                            value={formData.themeDesc}
                                            onChange={(e) => setFormData({ ...formData, themeDesc: e.target.value })}
                                        />
                                    </div>
                                )}

                                {/* Scoring Criteria Builder */}
                                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-semibold">Scoring Weights</h3>
                                            {!isWeightValid && <span className="text-xs text-red-400 flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> Must equal 100%</span>}
                                        </div>
                                        <button onClick={addCriterion} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors">
                                            + Add Criterion
                                        </button>
                                    </div>

                                    {/* Weight Balancer Visual */}
                                    <div className="h-1 w-full bg-white/10 rounded-full mb-6 overflow-hidden flex">
                                        <div className={`h-full transition-all duration-500 ${totalWeight > 100 ? 'bg-red-500' : 'bg-white'}`} style={{ width: `${Math.min(totalWeight, 100)}%` }} />
                                    </div>
                                    <div className="text-right text-xs text-gray-500 mb-4">{100 - totalWeight}% Remaining</div>

                                    <div className="space-y-4">
                                        {formData.criteria.map((criterion) => (
                                            <div key={criterion.id} className="flex items-center gap-4 group">
                                                <div className="p-2 bg-white/5 rounded-lg cursor-grab active:cursor-grabbing"><Layout className="w-4 h-4 text-gray-500" /></div>
                                                <input
                                                    type="text"
                                                    value={criterion.name}
                                                    onChange={(e) => updateCriteria(criterion.id, 'name', e.target.value)}
                                                    className="flex-1 bg-transparent border-b border-white/10 py-1 text-sm focus:border-white focus:outline-none"
                                                />
                                                <div className="flex items-center gap-2 w-32">
                                                    <input
                                                        type="range"
                                                        min="0" max="100"
                                                        value={criterion.weight}
                                                        onChange={(e) => updateCriteria(criterion.id, 'weight', parseInt(e.target.value))}
                                                        className="w-20 accent-white"
                                                    />
                                                    <span className="text-sm font-mono text-gray-300 w-8 text-right">{criterion.weight}%</span>
                                                </div>
                                                <button className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: SOURCE */}
                        {currentStep === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold">Data Source</h2>
                                    <p className="text-gray-400">Connect the folder containing the hackathon submissions (PDFs).</p>
                                </div>

                                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                                        <HardDrive className="w-8 h-8 text-gray-400" />
                                    </div>

                                    <div className="w-full max-w-lg relative">
                                        <input
                                            type="text"
                                            placeholder="Paste Google Drive Folder Link"
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 pl-4 pr-32 text-white focus:border-white/40 focus:outline-none"
                                            value={formData.driveLink}
                                            onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
                                        />
                                        <button
                                            onClick={checkGDrive}
                                            disabled={formData.driveStatus === 'checking' || formData.driveStatus === 'verified'}
                                            className="absolute right-2 top-2 bottom-2 bg-white text-black font-medium px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {formData.driveStatus === 'idle' && 'Connect'}
                                            {formData.driveStatus === 'checking' && 'Checking...'}
                                            {formData.driveStatus === 'verified' && 'Verified'}
                                        </button>
                                    </div>

                                    {/* Success Message */}
                                    {formData.driveStatus === 'verified' && (
                                        <div className="mt-6 flex items-center space-x-2 text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 animate-in zoom-in duration-300">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">Success: {formData.fileCount} Files Found</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="mt-12 flex justify-between">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 1}
                            className={`px-6 py-3 rounded-full border border-white/10 text-sm font-medium transition-all ${currentStep === 1 ? 'opacity-0 cursor-default' : 'hover:bg-white/5'}`}
                        >
                            Back
                        </button>

                        {currentStep < 3 ? (
                            <button
                                onClick={handleNext}
                                className="px-8 py-3 bg-white text-black rounded-full text-sm font-bold hover:bg-gray-200 transition-all flex items-center space-x-2"
                            >
                                <span>Continue</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={onLaunch}
                                className={`px-8 py-3 bg-gradient-to-r from-white to-gray-400 text-black rounded-full text-sm font-bold transition-all flex items-center space-x-2 ${formData.driveStatus !== 'verified' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                                disabled={formData.driveStatus !== 'verified'}
                            >
                                <span>Launch Evaluation</span>
                                <Play className="w-4 h-4 fill-current" />
                            </button>
                        )}
                    </div>

                </div>

                {/* --- RIGHT COLUMN: BLUEPRINT PANEL --- */}
                <div className="hidden lg:block lg:col-span-4">
                    <div className="sticky top-24">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl">
                            <div className="flex items-center space-x-2 mb-6 pb-6 border-b border-white/5">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <span className="font-mono text-sm tracking-widest text-gray-500 uppercase">Project Blueprint</span>
                            </div>

                            <div className="space-y-6">
                                {/* Project Name */}
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">PROJECT</label>
                                    <div className="font-medium text-lg leading-tight">
                                        {formData.projectName || <span className="text-gray-600 italic">Untitled Project</span>}
                                    </div>
                                </div>

                                {/* Logic Summary */}
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">CONFIGURATION</label>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-xs border border-white/10 px-2 py-1 rounded bg-white/5">
                                            {formData.trackMode === 'ps' ? 'Problem Statements' : 'Theme Based'}
                                        </span>
                                        <span className={`text-xs border border-white/10 px-2 py-1 rounded ${isWeightValid ? 'bg-white/5' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            Criteria: {formData.criteria.length} ({totalWeight}%)
                                        </span>
                                    </div>
                                </div>

                                {/* Source Summary */}
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">SOURCE</label>
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${formData.driveStatus === 'verified' ? 'bg-green-500' : 'bg-gray-600'}`} />
                                        <span className="text-sm text-gray-300">
                                            {formData.driveStatus === 'idle' ? 'Not Connected' :
                                                formData.driveStatus === 'checking' ? 'Verifying...' :
                                                    'GDrive Connected'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Bar Code */}
                            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-end opacity-30">
                                <div className="space-x-1">
                                    {[...Array(12)].map((_, i) => (
                                        <span key={i} className={`inline-block w-${i % 2 === 0 ? '0.5' : '1'} h-8 bg-white`}></span>
                                    ))}
                                </div>
                                <div className="font-mono text-xs">ID-2025-EVAL</div>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreateProjectPage;