import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, RefreshCw, FileText, CheckCircle2, XCircle,
    Clock, Loader2, ChevronRight, Database, Layers,
    HardDrive, ExternalLink, RotateCcw, Activity, FolderOpen
} from 'lucide-react';
import { supabase } from '../services/auth';
import { getProjectDetails, reEvaluate } from '../services/api';

// ─── Status badge helper ────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        completed: { color: 'bg-green-500/10 text-green-400 border-green-500/20', dot: 'bg-green-400', label: 'Completed' },
        processing: { color: 'bg-blue-500/10  text-blue-400  border-blue-500/20', dot: 'bg-blue-400 animate-pulse', label: 'Processing' },
        pending: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-400', label: 'Pending' },
        failed: { color: 'bg-red-500/10   text-red-400    border-red-500/20', dot: 'bg-red-400', label: 'Failed' },
    };
    const s = map[status] || map.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    );
};

// ─── Stat card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub }) => (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
        <div className="p-2.5 bg-white/5 rounded-xl text-gray-400">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <div className="text-2xl font-bold font-mono">{value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
            {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
        </div>
    </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
const ProjectDetail = ({ projectId, onBack, onReEvaluate }) => {
    const [project, setProject] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isReEval, setIsReEval] = useState(false);
    const [reEvalMsg, setReEvalMsg] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [pollTimer, setPollTimer] = useState(null);

    const fetchDetails = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const data = await getProjectDetails(session.access_token, projectId);
            setProject(data.project);
            setSubmissions(data.submissions || []);
        } catch (e) {
            console.error('ProjectDetail fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    // Auto-poll every 5s while any submission is processing/pending
    useEffect(() => {
        const hasActive = submissions.some(s =>
            s.processing_status === 'processing' || s.processing_status === 'pending'
        );
        if (hasActive) {
            const t = setTimeout(fetchDetails, 5000);
            setPollTimer(t);
        } else {
            if (pollTimer) clearTimeout(pollTimer);
        }
        return () => clearTimeout(pollTimer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submissions]);

    const handleReEvaluate = async () => {
        setIsReEval(true);
        setReEvalMsg('Resetting submissions…');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');
            await reEvaluate(session.access_token, projectId);
            // Navigate to the Processing page
            if (onReEvaluate) onReEvaluate();
        } catch (e) {
            setReEvalMsg(`Error: ${e.message}`);
            setIsReEval(false);
            setTimeout(() => setReEvalMsg(''), 4000);
        }
    };

    // ──── Derived stats ───────────────────────────────────────────────────────
    const totalSlides = submissions.reduce((a, s) => a + (s.slide_count || 0), 0);
    const completed = submissions.filter(s => s.processing_status === 'completed').length;
    const failed = submissions.filter(s => s.processing_status === 'failed').length;
    const processing = submissions.filter(s => ['processing', 'pending'].includes(s.processing_status)).length;
    const totalMB = (submissions.reduce((a, s) => a + (s.file_size_bytes || 0), 0) / (1024 * 1024)).toFixed(1);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20">

            {/* ── Navbar ── */}
            <nav className="fixed top-0 w-full z-40 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-sm">Dashboard</span>
                        </button>
                        <span className="text-white/20">/</span>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white text-black font-bold rounded-md flex items-center justify-center text-xs">H</div>
                            <span className="font-semibold text-sm truncate max-w-[200px]">
                                {project?.project_name || '…'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchDetails}
                            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleReEvaluate}
                            disabled={isReEval}
                            className="flex items-center gap-2 px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                        >
                            {isReEval
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <RotateCcw className="w-4 h-4" />
                            }
                            <span>{isReEval ? 'Re-evaluating…' : 'Re-Evaluate All'}</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 pt-28 pb-16">

                {/* ── Re-eval toast ── */}
                {reEvalMsg && (
                    <div className="mb-6 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Activity className="w-4 h-4 text-white" />
                        {reEvalMsg}
                    </div>
                )}

                {/* ── Header ── */}
                <div className="mb-10">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                            <FolderOpen className="w-6 h-6 text-gray-300" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{project?.project_name}</h1>
                            {project?.description && (
                                <p className="text-gray-500 mt-1 text-sm max-w-2xl">{project.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                                <StatusBadge status={project?.status} />
                                <span className="text-xs text-gray-600">
                                    Created {new Date(project?.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {project?.drive_folder_url && (
                                    <a
                                        href={project.drive_folder_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Drive Folder
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stats row ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <StatCard icon={FileText} label="Submissions" value={submissions.length} />
                    <StatCard icon={Layers} label="Slides Extracted" value={totalSlides} />
                    <StatCard icon={CheckCircle2} label="Completed" value={completed}
                        sub={failed > 0 ? `${failed} failed` : undefined} />
                    <StatCard icon={HardDrive} label="Total Size" value={`${totalMB} MB`} />
                </div>

                {/* ── Submissions table ── */}
                <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden">
                    {/* Table header */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold">Submissions</span>
                            <span className="text-xs text-gray-600 font-mono">{submissions.length} files</span>
                        </div>
                        {processing > 0 && (
                            <div className="flex items-center gap-2 text-xs text-blue-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {processing} processing — auto-refreshing
                            </div>
                        )}
                    </div>

                    {submissions.length === 0 ? (
                        <div className="py-20 text-center text-gray-600">
                            <FileText className="w-10 h-10 mx-auto mb-4 opacity-30" />
                            <p className="text-sm">No submissions found. Try Re-Evaluate All to scan &amp; process.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {submissions.map((sub, idx) => (
                                <div key={sub.submission_id}>
                                    {/* Row */}
                                    <div
                                        className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors group"
                                        onClick={() => setExpandedId(expandedId === sub.submission_id ? null : sub.submission_id)}
                                    >
                                        {/* Index */}
                                        <span className="w-6 text-xs text-gray-700 font-mono shrink-0">{String(idx + 1).padStart(2, '0')}</span>

                                        {/* File icon */}
                                        <div className="p-2 bg-white/5 rounded-lg shrink-0">
                                            <FileText className="w-4 h-4 text-gray-400" />
                                        </div>

                                        {/* Team + filename */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm truncate group-hover:text-white transition-colors">
                                                {sub.team_name}
                                            </div>
                                            <div className="text-xs text-gray-600 truncate font-mono mt-0.5">
                                                {sub.drive_file_name}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="shrink-0">
                                            <StatusBadge status={sub.processing_status} />
                                        </div>

                                        {/* Slides */}
                                        <div className="shrink-0 text-right hidden sm:block">
                                            <div className="text-sm font-mono font-bold">
                                                {sub.slide_count > 0 ? sub.slide_count : '—'}
                                            </div>
                                            <div className="text-[10px] text-gray-600 uppercase tracking-wide">slides</div>
                                        </div>

                                        {/* Size */}
                                        <div className="shrink-0 text-right hidden md:block w-16">
                                            <div className="text-xs text-gray-500 font-mono">
                                                {sub.file_size_bytes
                                                    ? `${(sub.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                                                    : '—'
                                                }
                                            </div>
                                        </div>

                                        {/* Drive link + expand */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {sub.drive_file_url && (
                                                <a
                                                    href={sub.drive_file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    className="p-1.5 text-gray-600 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                    title="Open in Drive"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                            <ChevronRight
                                                className={`w-4 h-4 text-gray-700 transition-transform duration-200 ${expandedId === sub.submission_id ? 'rotate-90 text-white' : 'group-hover:text-gray-400'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Expanded detail panel */}
                                    {expandedId === sub.submission_id && (
                                        <div className="px-6 pb-5 bg-white/[0.01] border-t border-white/5">
                                            <SubmissionDetail submissionId={sub.submission_id} status={sub.processing_status} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// ─── Expanded sub-component: shows slide previews ────────────────────────────
const SubmissionDetail = ({ submissionId, status }) => {
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSlides = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const resp = await fetch(
                    `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/submissions/${submissionId}/slides`,
                    { headers: { 'Authorization': `Bearer ${session.access_token}` } }
                );
                if (resp.ok) {
                    const d = await resp.json();
                    setSlides(d.slides || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchSlides();
    }, [submissionId]);

    if (status === 'pending' || status === 'processing') {
        return (
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting content — check back soon…
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-400">
                <XCircle className="w-4 h-4" />
                Extraction failed. Use Re-Evaluate All to retry.
            </div>
        );
    }

    if (loading) {
        return <div className="mt-4 w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />;
    }

    if (slides.length === 0) {
        return <p className="mt-4 text-sm text-gray-600">No slide data found yet.</p>;
    }

    return (
        <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                {slides.length} slide{slides.length !== 1 ? 's' : ''} extracted
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {slides.map(slide => (
                    <div
                        key={slide.slide_id}
                        className="bg-[#111] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                Slide {slide.slide_number}
                            </span>
                            {slide.complexity_score != null && (
                                <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                                    complexity {(slide.complexity_score * 100).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-4 font-mono">
                            {slide.text_content?.trim() || '(no text content)'}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectDetail;
