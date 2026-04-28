import React, { useState, useRef } from 'react';
import {
    ArrowRight, ArrowLeft, CheckCircle, Plus, Trash2,
    Layout, Target, HardDrive, FileText, PieChart,
    AlertCircle, X, Play, Loader2, ChevronDown, ChevronUp,
    Clipboard, Sparkles, MoveUp, MoveDown, Eye, RotateCcw,
    Wand2, FileSearch
} from 'lucide-react';
import { supabase } from '../services/auth';
import { createProject, scanDrive, startScan, startProcessing, parseRubric } from '../services/api';

// ─── Donut Chart ──────────────────────────────────────────────────────────────
const DonutChart = ({ criteria }) => {
    const size = 120;
    const stroke = 14;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const cx = size / 2;
    const cy = size / 2;
    const total = criteria.reduce((a, c) => a + (parseInt(c.weight) || 0), 0);

    const COLORS = [
        '#ffffff', '#a3a3a3', '#525252', '#d4d4d4',
        '#737373', '#e5e5e5', '#404040', '#c0c0c0'
    ];

    let offset = 0;
    const segments = criteria.map((c, i) => {
        const pct = total > 0 ? (parseInt(c.weight) || 0) / 100 : 0;
        const dash = pct * circ;
        const gap = circ - dash;
        const seg = (
            <circle
                key={c.id}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset * circ}
                strokeLinecap="butt"
                style={{ transition: 'all 0.4s ease' }}
            />
        );
        offset += pct;
        return seg;
    });

    return (
        <svg width={size} height={size}
            style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
            {segments}
            <text
                x={cx} y={cy}
                textAnchor="middle" dominantBaseline="middle"
                fill={total === 100 ? '#4ade80' : total > 100 ? '#f87171' : '#9ca3af'}
                fontSize="18" fontWeight="700" fontFamily="monospace"
                style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}
            >
                {total}%
            </text>
        </svg>
    );
};

// ─── Criterion Card ───────────────────────────────────────────────────────────
const CriterionCard = ({ criterion, index, total, onChange, onDelete, onMove }) => {
    const [collapsed, setCollapsed] = useState(false);
    const descLen = criterion.description?.length || 0;
    const descOk = descLen >= 80;

    return (
        <div className={`bg-black/30 border rounded-xl overflow-hidden transition-all duration-200 ${collapsed ? 'border-white/10' : 'border-white/15'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                    <button onClick={() => onMove(index, 'up')} disabled={index === 0}
                        className="p-0.5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors">
                        <MoveUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => onMove(index, 'down')} disabled={index === total - 1}
                        className="p-0.5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors">
                        <MoveDown className="w-3 h-3" />
                    </button>
                </div>

                <input
                    type="text"
                    value={criterion.name}
                    onChange={e => onChange(criterion.id, 'name', e.target.value)}
                    placeholder="Criterion Name"
                    className="flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-gray-600 focus:outline-none"
                    onClick={e => e.stopPropagation()}
                />

                <div className="flex items-center gap-1.5">
                    <input
                        type="number" min="0" max="100"
                        value={criterion.weight}
                        onChange={e => onChange(criterion.id, 'weight', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="w-12 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs font-mono text-center focus:outline-none focus:border-white/30"
                        onClick={e => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-500">%</span>
                </div>

                <div className="flex items-center gap-1 ml-1">
                    <button onClick={() => setCollapsed(c => !c)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                        {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <button onClick={() => onDelete(criterion.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                    <textarea
                        rows={3}
                        value={criterion.description}
                        onChange={e => onChange(criterion.id, 'description', e.target.value)}
                        placeholder="Describe what this criterion measures. Be specific — the AI uses this to assess each submission."
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-gray-600 focus:border-white/25 focus:outline-none resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${descOk ? 'bg-green-500' : descLen > 0 ? 'bg-yellow-500' : 'bg-gray-600'}`} />
                            <span className={`text-xs ${descOk ? 'text-green-500/70' : descLen > 0 ? 'text-yellow-500/70' : 'text-gray-600'}`}>
                                {descOk ? 'Good description' : `${descLen}/80 chars — be more specific`}
                            </span>
                        </div>
                        <span className="text-xs font-mono text-gray-600">{descLen}</span>
                    </div>
                    <input
                        type="range" min="0" max="100"
                        value={criterion.weight}
                        onChange={e => onChange(criterion.id, 'weight', parseInt(e.target.value))}
                        className="w-full accent-white"
                    />
                </div>
            )}
        </div>
    );
};

// ─── Rubric Paste Zone ────────────────────────────────────────────────────────
const RubricPasteZone = ({ onParsed }) => {
    const [rawText, setRawText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState('');

    const handleParse = async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const data = await parseRubric(session.access_token, rawText);
            const text = data.content || '';
            const clean = text.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(clean);
            if (!Array.isArray(parsed) || parsed.length < 2) throw new Error('Expected array');
            onParsed(parsed);
        } catch {
            setError('Could not parse the rubric. Try pasting more structured text and retry.');
        } finally {
            setIsParsing(false);
        }
    };

    const charCount = rawText.length;
    const isReady = charCount > 50;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-4 p-5 bg-white/[0.03] border border-white/10 rounded-2xl">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
                    <Wand2 className="w-5 h-5 text-gray-300" />
                </div>
                <div>
                    <h3 className="font-semibold text-white text-sm">Paste your hackathon rubric</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Drop in your evaluation guide, judging criteria, Notion doc, or any text describing how submissions are scored.
                        The AI will extract criteria names, descriptions, and distribute weights automatically.
                    </p>
                </div>
            </div>

            {/* Textarea */}
            <div className="relative">
                <textarea
                    className="w-full h-52 bg-[#060606] border border-white/10 rounded-2xl p-5 text-sm text-white placeholder:text-gray-600 focus:border-white/25 focus:outline-none resize-none font-mono leading-relaxed transition-colors"
                    placeholder={`Paste anything here — e.g:\n\nInnovation & Creativity (30%): How novel and original is the solution? Does it address the problem in an unexpected way?\n\nTechnical Implementation (35%): Code quality, system design, scalability considerations...\n\nBusiness Viability (25%): Market opportunity, go-to-market strategy, monetization model...\n\nPresentation (10%): Clarity of demo, storytelling, team communication...`}
                    value={rawText}
                    onChange={e => { setRawText(e.target.value); setError(''); }}
                />
                {/* Char count */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isReady ? 'bg-green-500' : charCount > 0 ? 'bg-yellow-500' : 'bg-gray-700'}`} />
                    <span className="text-xs font-mono text-gray-600">{charCount}</span>
                </div>
            </div>

            {/* Hint */}
            {!isReady && charCount === 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <FileSearch className="w-3.5 h-3.5" />
                    <span>Works with any format — plain text, copied PDFs, Notion exports, Google Docs</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* CTA */}
            <button
                onClick={handleParse}
                disabled={!isReady || isParsing}
                className="w-full py-3.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all"
            >
                {isParsing ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Parsing your rubric...</span>
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4" />
                        <span>Auto-Parse into Criteria</span>
                    </>
                )}
            </button>
        </div>
    );
};

// ─── Parsed Criteria View ─────────────────────────────────────────────────────
const ParsedCriteriaView = ({ criteria, maxScore, onCriteriaChange, onMaxScoreChange, onReset }) => {
    const totalWeight = criteria.reduce((a, c) => a + (parseInt(c.weight) || 0), 0);
    const isWeightValid = totalWeight === 100;

    const updateCriterion = (id, field, value) => {
        onCriteriaChange(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
    };
    const deleteCriterion = (id) => {
        onCriteriaChange(criteria.filter(c => c.id !== id));
    };
    const moveCriterion = (index, dir) => {
        const arr = [...criteria];
        const swap = dir === 'up' ? index - 1 : index + 1;
        [arr[index], arr[swap]] = [arr[swap], arr[index]];
        onCriteriaChange(arr);
    };
    const addCriterion = () => {
        onCriteriaChange([...criteria, {
            id: Date.now(), name: 'New Criterion', description: '', weight: 0
        }]);
    };

    return (
        <div className="space-y-4">
            {/* Parsed header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-semibold text-white">{criteria.length} criteria extracted</span>
                    <span className="text-xs text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                        AI parsed
                    </span>
                </div>
                <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 border border-white/10 rounded-lg hover:border-white/20"
                >
                    <RotateCcw className="w-3 h-3" />
                    Re-paste rubric
                </button>
            </div>

            {/* Score + Weight bar */}
            <div className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">Score out of</span>
                    <input
                        type="number" min="1" max="1000"
                        value={maxScore}
                        onChange={e => onMaxScoreChange(parseInt(e.target.value) || 10)}
                        className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm font-mono text-white text-center focus:outline-none focus:border-white/30"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${totalWeight > 100 ? 'bg-red-500' : totalWeight === 100 ? 'bg-green-500' : 'bg-white/60'}`}
                            style={{ width: `${Math.min(totalWeight, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between">
                        <span className={`text-xs ${isWeightValid ? 'text-green-400' : totalWeight > 100 ? 'text-red-400' : 'text-gray-500'}`}>
                            {isWeightValid ? '✓ Weights balanced' : totalWeight > 100 ? `${totalWeight - 100}% over budget` : `${100 - totalWeight}% remaining`}
                        </span>
                        <span className={`text-xs font-mono ${isWeightValid ? 'text-green-400' : totalWeight > 100 ? 'text-red-400' : 'text-gray-500'}`}>
                            {totalWeight}/100
                        </span>
                    </div>
                </div>
            </div>

            {/* Criterion Cards */}
            <div className="space-y-2.5">
                {criteria.map((c, i) => (
                    <CriterionCard
                        key={c.id}
                        criterion={c}
                        index={i}
                        total={criteria.length}
                        onChange={updateCriterion}
                        onDelete={deleteCriterion}
                        onMove={moveCriterion}
                    />
                ))}
                <button
                    onClick={addCriterion}
                    disabled={criteria.length >= 7}
                    className="w-full border border-dashed border-white/10 rounded-xl py-3 text-sm text-gray-500 hover:text-white hover:border-white/25 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4" />
                    Add Criterion {criteria.length >= 7 ? '(max 7)' : `(${criteria.length}/7)`}
                </button>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CreateProjectPage = ({ onBack, onLaunch }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [launchStep, setLaunchStep] = useState('');

    // rubricParsed: false = show paste zone, true = show criteria cards
    const [rubricParsed, setRubricParsed] = useState(false);

    const [formData, setFormData] = useState({
        projectName: '',
        projectDesc: '',
        trackMode: 'ps',
        themeDesc: '',
        problemStatements: [{ title: '', desc: '' }],
        maxScore: 10,
        criteria: [],
        driveLink: '',
        driveStatus: 'idle',
        fileCount: 0
    });

    // ── Navigation ──
    const nav = (dir) => {
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep(p => dir === 'next' ? Math.min(p + 1, 3) : Math.max(p - 1, 1));
            setIsAnimating(false);
        }, 200);
    };

    const totalWeight = formData.criteria.reduce((a, c) => a + (parseInt(c.weight) || 0), 0);
    const isWeightValid = totalWeight === 100;

    const handleParsed = (parsed) => {
        const criteria = parsed.map((c, i) => ({
            id: Date.now() + i,
            name: c.name || 'Criterion',
            description: c.description || '',
            weight: parseInt(c.weight) || 0
        }));
        setFormData(f => ({ ...f, criteria }));
        setRubricParsed(true);
    };

    const handleReset = () => {
        setRubricParsed(false);
        setFormData(f => ({ ...f, criteria: [] }));
    };

    // ── Drive ──
    const checkGDrive = async () => {
        const match = formData.driveLink.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
        if (!match) { alert('Invalid Google Drive URL.'); return; }
        setFormData(f => ({ ...f, driveStatus: 'checking' }));
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const result = await scanDrive(session.access_token, match[1]);
            setFormData(f => ({ ...f, driveStatus: 'verified', fileCount: result.total_files }));
        } catch {
            setFormData(f => ({ ...f, driveStatus: 'error' }));
            alert("Failed to scan Drive folder. Make sure it's shared publicly.");
        }
    };

    // ── Launch ──
    const handleLaunch = async () => {
        if (formData.driveStatus !== 'verified') return;
        setIsLaunching(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session.access_token;
            setLaunchStep('creating');
            const payload = {
                project_name: formData.projectName,
                description: formData.projectDesc,
                drive_folder_url: formData.driveLink,
                track_mode: formData.trackMode,
                theme_desc: formData.trackMode === 'theme' ? formData.themeDesc : null,
                problem_statements: formData.trackMode === 'ps'
                    ? formData.problemStatements.map(ps => ({ title: ps.title, description: ps.desc })) : [],
                scoring_criteria: formData.criteria.map(c => ({ name: c.name, weight: c.weight, description: c.description })),
                max_score: formData.maxScore,
                auto_categorization_enabled: true,
                plagiarism_detection_enabled: true
            };
            const project = await createProject(token, payload);
            setLaunchStep('scanning');
            await startScan(token, project.project_id);
            setLaunchStep('processing');
            await startProcessing(token, project.project_id);
            onLaunch();
        } catch (error) {
            alert(`Launch failed: ${error.message}`);
        } finally {
            setIsLaunching(false);
            setLaunchStep('');
        }
    };

    // ── AI Prompt Preview ──
    const previewPrompt = rubricParsed && formData.criteria.length > 0
        ? `You are evaluating a hackathon submission.\n\nScore out of: ${formData.maxScore}\n${formData.criteria.map(c => `\n[${c.name} — ${c.weight}%]\n${c.description || '(no description yet)'}`).join('\n')}`
        : `// Prompt preview will appear\n// once you parse your rubric`;

    // ── Step 2 can proceed ──
    const step2Valid = rubricParsed && formData.criteria.length >= 2 && isWeightValid;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 flex flex-col">

            {/* Header */}
            <nav className="w-full h-14 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Dashboard</span>
                </button>
                <span className="text-sm font-semibold tracking-tight">New Evaluation</span>
                <div className="w-24" />
            </nav>

            {/* Body */}
            <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN */}
                <div className="lg:col-span-7 flex flex-col gap-6">

                    {/* Stepper */}
                    <div className="p-3 bg-white/[0.03] border border-white/8 rounded-2xl flex justify-between items-center relative">
                        <div className="absolute left-10 right-10 top-1/2 h-px bg-white/8 -z-0 pointer-events-none" />
                        {[
                            { id: 1, label: 'Identity', icon: Layout },
                            { id: 2, label: 'Scoring Logic', icon: Target },
                            { id: 3, label: 'Data Source', icon: HardDrive }
                        ].map(step => {
                            const isActive = step.id === currentStep;
                            const isDone = step.id < currentStep;
                            return (
                                <div key={step.id} className="flex flex-col items-center relative z-10 bg-[#050505] px-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300
                                        ${isActive
                                            ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105'
                                            : isDone
                                                ? 'bg-green-500/15 text-green-400 border-green-500/40'
                                                : 'bg-white/5 text-gray-600 border-white/10'
                                        }`}>
                                        {isDone ? <CheckCircle className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                                    </div>
                                    <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-600'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Form Panel */}
                    <div className={`flex-1 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>

                        {/* ── STEP 1: IDENTITY ── */}
                        {currentStep === 1 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-2xl font-bold">Project Identity</h2>
                                    <p className="text-sm text-gray-500 mt-1">Give your evaluation a name and some context.</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Project Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Solana Summer Hackathon 2025"
                                            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:border-white/30 focus:outline-none transition-colors placeholder:text-gray-700"
                                            value={formData.projectName}
                                            onChange={e => setFormData(f => ({ ...f, projectName: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Description <span className="text-gray-600 normal-case">(optional)</span></label>
                                        <textarea
                                            placeholder="Briefly describe the goal and theme of this hackathon to help the AI understand context..."
                                            className="w-full h-28 bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:border-white/30 focus:outline-none transition-colors placeholder:text-gray-700 resize-none leading-relaxed"
                                            value={formData.projectDesc}
                                            onChange={e => setFormData(f => ({ ...f, projectDesc: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Track Mode */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Track Mode</label>
                                    <div className="p-1 bg-white/5 border border-white/8 rounded-xl inline-flex">
                                        {['ps', 'theme'].map(mode => (
                                            <button key={mode}
                                                onClick={() => setFormData(f => ({ ...f, trackMode: mode }))}
                                                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${formData.trackMode === mode ? 'bg-white text-black shadow' : 'text-gray-500 hover:text-white'}`}>
                                                {mode === 'ps' ? 'Problem Statements' : 'Theme Based'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.trackMode === 'ps' ? (
                                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Problem Statements</span>
                                            <button
                                                onClick={() => setFormData(f => ({ ...f, problemStatements: [...f.problemStatements, { title: '', desc: '' }] }))}
                                                className="text-xs flex items-center gap-1 text-gray-500 hover:text-white transition-colors">
                                                <Plus className="w-3 h-3" /> Add
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {formData.problemStatements.map((ps, idx) => (
                                                <div key={idx} className="flex gap-3">
                                                    <div className="flex-1 space-y-2">
                                                        <input type="text" placeholder="PS Title (e.g. DeFi for All)"
                                                            value={ps.title}
                                                            onChange={e => {
                                                                const arr = [...formData.problemStatements];
                                                                arr[idx].title = e.target.value;
                                                                setFormData(f => ({ ...f, problemStatements: arr }));
                                                            }}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-white/25 outline-none placeholder:text-gray-700" />
                                                        <input type="text" placeholder="Short description..."
                                                            value={ps.desc}
                                                            onChange={e => {
                                                                const arr = [...formData.problemStatements];
                                                                arr[idx].desc = e.target.value;
                                                                setFormData(f => ({ ...f, problemStatements: arr }));
                                                            }}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-white/25 outline-none placeholder:text-gray-700" />
                                                    </div>
                                                    <button onClick={() => setFormData(f => ({ ...f, problemStatements: f.problemStatements.filter((_, i) => i !== idx) }))}
                                                        className="h-fit mt-1 p-2 text-gray-600 hover:text-red-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5">
                                        <label className="block text-sm font-medium mb-3">Theme Description</label>
                                        <textarea className="w-full h-28 bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-white/25 outline-none resize-none placeholder:text-gray-700 leading-relaxed"
                                            placeholder="Paste your hackathon theme or track details here..."
                                            value={formData.themeDesc}
                                            onChange={e => setFormData(f => ({ ...f, themeDesc: e.target.value }))} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── STEP 2: SCORING LOGIC ── */}
                        {currentStep === 2 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-2xl font-bold">Scoring Logic</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Paste your hackathon's rubric — the AI extracts criteria and weights automatically.
                                    </p>
                                </div>

                                {/* Paste zone OR parsed criteria */}
                                {!rubricParsed ? (
                                    <RubricPasteZone onParsed={handleParsed} />
                                ) : (
                                    <ParsedCriteriaView
                                        criteria={formData.criteria}
                                        maxScore={formData.maxScore}
                                        onCriteriaChange={c => setFormData(f => ({ ...f, criteria: c }))}
                                        onMaxScoreChange={v => setFormData(f => ({ ...f, maxScore: v }))}
                                        onReset={handleReset}
                                    />
                                )}
                            </div>
                        )}

                        {/* ── STEP 3: DATA SOURCE ── */}
                        {currentStep === 3 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-2xl font-bold">Data Source</h2>
                                    <p className="text-sm text-gray-500 mt-1">Connect the folder containing hackathon submissions (PDFs).</p>
                                </div>
                                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center gap-6">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                        <HardDrive className="w-7 h-7 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                                        Share a Google Drive folder containing submission PDFs. Make sure the folder is set to <span className="text-gray-300">"Anyone with the link can view."</span>
                                    </p>
                                    <div className="w-full max-w-md relative">
                                        <input
                                            type="text"
                                            placeholder="https://drive.google.com/drive/folders/..."
                                            className="w-full bg-[#060606] border border-white/10 rounded-xl py-3.5 pl-4 pr-28 text-sm text-white focus:border-white/30 focus:outline-none placeholder:text-gray-700"
                                            value={formData.driveLink}
                                            onChange={e => setFormData(f => ({ ...f, driveLink: e.target.value, driveStatus: 'idle' }))}
                                        />
                                        <button
                                            onClick={checkGDrive}
                                            disabled={formData.driveStatus === 'checking' || formData.driveStatus === 'verified'}
                                            className="absolute right-2 top-2 bottom-2 bg-white text-black text-sm font-semibold px-4 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                            {formData.driveStatus === 'idle' && 'Connect'}
                                            {formData.driveStatus === 'checking' && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Checking</span>}
                                            {formData.driveStatus === 'verified' && '✓ Done'}
                                            {formData.driveStatus === 'error' && 'Retry'}
                                        </button>
                                    </div>
                                    {formData.driveStatus === 'verified' && (
                                        <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-5 py-2.5 rounded-full border border-green-500/20">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">{formData.fileCount} submissions found</span>
                                        </div>
                                    )}
                                    {formData.driveStatus === 'error' && (
                                        <div className="flex items-center gap-2 text-red-400 text-sm">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Couldn't access the folder — check sharing settings.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Nav Buttons */}
                    <div className="flex justify-between items-center pt-2">
                        <button
                            onClick={() => nav('prev')}
                            disabled={currentStep === 1}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-sm font-medium transition-all hover:bg-white/5 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}>
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>

                        {currentStep < 3 ? (
                            <button
                                onClick={() => nav('next')}
                                disabled={currentStep === 2 && !step2Valid}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                Continue <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleLaunch}
                                disabled={formData.driveStatus !== 'verified' || isLaunching}
                                className={`flex items-center gap-2 px-7 py-2.5 bg-white text-black rounded-xl text-sm font-bold transition-all
                                    ${formData.driveStatus === 'verified' && !isLaunching ? 'hover:bg-gray-100 hover:scale-[1.02]' : 'opacity-40 cursor-not-allowed'}`}>
                                {isLaunching ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {launchStep === 'creating' ? 'Creating...' : launchStep === 'scanning' ? 'Scanning Drive...' : 'Processing...'}
                                    </>
                                ) : (
                                    <><Play className="w-4 h-4 fill-current" /> Launch Evaluation</>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN — Blueprint + Sidebar */}
                <div className="hidden lg:flex lg:col-span-5 flex-col gap-4">
                    <div className="sticky top-20 space-y-4">

                        {/* Blueprint Card */}
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="font-mono text-xs tracking-[0.12em] text-gray-500 uppercase">Project Blueprint</span>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] text-gray-600 uppercase tracking-wider block mb-1">Project</label>
                                    <div className="text-sm font-medium leading-snug">
                                        {formData.projectName || <span className="text-gray-600 italic font-normal">Untitled Project</span>}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-600 uppercase tracking-wider block mb-1.5">Configuration</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-xs border border-white/10 px-2 py-1 rounded-lg bg-white/5 text-gray-400">
                                            {formData.trackMode === 'ps' ? 'Problem Statements' : 'Theme Based'}
                                        </span>
                                        <span className={`text-xs border px-2 py-1 rounded-lg ${rubricParsed && isWeightValid ? 'bg-green-500/10 border-green-500/20 text-green-400' : rubricParsed ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                            {rubricParsed ? `${formData.criteria.length} criteria (${totalWeight}%)` : 'No rubric yet'}
                                        </span>
                                        <span className="text-xs border border-white/10 px-2 py-1 rounded-lg bg-white/5 text-gray-400">
                                            /{formData.maxScore} pts
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-600 uppercase tracking-wider block mb-1.5">Source</label>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${formData.driveStatus === 'verified' ? 'bg-green-500' : formData.driveStatus === 'error' ? 'bg-red-500' : 'bg-gray-700'}`} />
                                        <span className="text-sm text-gray-400">
                                            {formData.driveStatus === 'idle' ? 'Not connected' :
                                                formData.driveStatus === 'checking' ? 'Verifying...' :
                                                    formData.driveStatus === 'verified' ? `${formData.fileCount} files — Google Drive` :
                                                        'Connection error'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Barcode decoration */}
                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-end opacity-20">
                                <div className="flex gap-0.5">
                                    {[3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1].map((w, i) => (
                                        <span key={i} style={{ width: w * 2 }} className="inline-block h-7 bg-white" />
                                    ))}
                                </div>
                                <div className="font-mono text-[10px]">EVAL-2025</div>
                            </div>
                        </div>

                        {/* Weight Donut (step 2, after parse) */}
                        {currentStep === 2 && rubricParsed && formData.criteria.length > 0 && (
                            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <PieChart className="w-4 h-4 text-gray-500" />
                                    <span className="font-mono text-xs tracking-[0.12em] text-gray-500 uppercase">Weight Distribution</span>
                                </div>
                                <div className="flex items-center gap-5">
                                    <DonutChart criteria={formData.criteria} />
                                    <div className="flex-1 space-y-2 min-w-0">
                                        {formData.criteria.map((c, i) => {
                                            const colors = ['bg-white', 'bg-gray-400', 'bg-gray-600', 'bg-gray-300', 'bg-gray-500', 'bg-gray-200', 'bg-gray-700'];
                                            return (
                                                <div key={c.id} className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                                                    <span className="text-xs text-gray-500 truncate flex-1">{c.name || 'Unnamed'}</span>
                                                    <span className="text-xs font-mono text-gray-600 flex-shrink-0">{c.weight}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Prompt Preview (step 2) */}
                        {currentStep === 2 && (
                            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="font-mono text-xs tracking-[0.12em] text-gray-500 uppercase">AI Prompt Preview</span>
                                </div>
                                <pre className="p-4 text-xs text-gray-500 font-mono leading-relaxed whitespace-pre-wrap break-words overflow-auto max-h-56">
                                    {previewPrompt}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateProjectPage;