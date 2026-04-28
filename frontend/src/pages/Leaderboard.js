import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, RefreshCw, Trophy, Medal, Search,
    ChevronUp, ChevronDown, ChevronsUpDown, Download,
    Star, Layers, TrendingUp, Users,
    Crown, Award, ExternalLink, BarChart2, Minus
} from 'lucide-react';
import { supabase } from '../services/auth';

// ─── Rank Badge ───────────────────────────────────────────────────────────────
const RankBadge = ({ rank }) => {
    if (rank === 1) return (
        <div className="w-8 h-8 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-yellow-400" />
        </div>
    );
    if (rank === 2) return (
        <div className="w-8 h-8 rounded-full bg-gray-400/10 border border-gray-400/25 flex items-center justify-center shrink-0">
            <Medal className="w-4 h-4 text-gray-300" />
        </div>
    );
    if (rank === 3) return (
        <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-orange-400" />
        </div>
    );
    return (
        <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/8 flex items-center justify-center shrink-0">
            <span className="text-xs font-mono text-gray-500">{rank}</span>
        </div>
    );
};

// ─── Score Bar ────────────────────────────────────────────────────────────────
const ScoreBar = ({ score, maxScore, rank }) => {
    const pct = Math.min((score / maxScore) * 100, 100);
    const barColor =
        rank === 1 ? 'bg-yellow-400/70' :
            rank === 2 ? 'bg-gray-300/70' :
                rank === 3 ? 'bg-orange-400/70' :
                    'bg-white/40';

    return (
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
                className={`h-full ${barColor} transition-all duration-700 ease-out`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, accent }) => (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
        <div className={`p-2.5 rounded-xl border ${accent || 'bg-white/5 border-white/10 text-gray-400'}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <div className="text-2xl font-bold font-mono">{value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
            {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
        </div>
    </div>
);

// ─── Podium Card (top 3) ──────────────────────────────────────────────────────
const PodiumCard = ({ entry, maxScore, onClick }) => {
    const configs = {
        1: {
            ring: 'border-yellow-500/30 shadow-[0_0_30px_-8px_rgba(234,179,8,0.25)]',
            badge: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
            label: '1st Place',
            icon: Crown,
            iconColor: 'text-yellow-400',
            height: 'md:h-52',
        },
        2: {
            ring: 'border-gray-400/20',
            badge: 'bg-gray-400/10 border-gray-400/25 text-gray-300',
            label: '2nd Place',
            icon: Medal,
            iconColor: 'text-gray-300',
            height: 'md:h-44',
        },
        3: {
            ring: 'border-orange-500/20',
            badge: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
            label: '3rd Place',
            icon: Award,
            iconColor: 'text-orange-400',
            height: 'md:h-40',
        },
    };
    const c = configs[entry.rank];
    const IconComp = c.icon;
    const pct = Math.min(((entry.total_score ?? 0) / maxScore) * 100, 100).toFixed(1);

    return (
        <div
            onClick={() => onClick && onClick(entry)}
            className={`group bg-[#0A0A0A] border ${c.ring} rounded-3xl p-6 flex flex-col gap-4 cursor-pointer hover:bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 ${c.height} justify-end`}
        >
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${c.badge}`}>
                <IconComp className={`w-5 h-5 ${c.iconColor}`} />
            </div>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{c.label}</p>
                <h3 className="text-lg font-bold text-white leading-tight truncate group-hover:text-white transition-colors">
                    {entry.team_name}
                </h3>
                {entry.drive_file_name && (
                    <p className="text-xs text-gray-600 font-mono truncate mt-0.5">{entry.drive_file_name}</p>
                )}
            </div>
            <div>
                <div className="flex items-end justify-between mb-2">
                    <span className="text-3xl font-bold font-mono text-white">
                        {(entry.total_score ?? 0).toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 font-mono mb-1">/ {maxScore}</span>
                </div>
                <ScoreBar score={entry.total_score ?? 0} maxScore={maxScore} rank={entry.rank} />
                <p className="text-[10px] text-gray-600 mt-1.5 font-mono">{pct}% of max</p>
            </div>
        </div>
    );
};

// ─── Sort Button ──────────────────────────────────────────────────────────────
const SortButton = ({ label, field, sortConfig, onSort }) => {
    const isActive = sortConfig.field === field;
    return (
        <button
            onClick={() => onSort(field)}
            className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold transition-colors ${isActive ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
        >
            {label}
            {isActive ? (
                sortConfig.dir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
            ) : (
                <ChevronsUpDown className="w-3 h-3 opacity-40" />
            )}
        </button>
    );
};

// ─── Score Delta chip ─────────────────────────────────────────────────────────
const DeltaChip = ({ score, maxScore }) => {
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const color =
        pct >= 80 ? 'text-green-400 bg-green-500/10' :
            pct >= 60 ? 'text-blue-400 bg-blue-500/10' :
                pct >= 40 ? 'text-yellow-400 bg-yellow-500/10' :
                    'text-red-400 bg-red-500/10';
    return (
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${color}`}>
            {pct.toFixed(0)}%
        </span>
    );
};

// ─── Main Leaderboard ─────────────────────────────────────────────────────────
const Leaderboard = ({ projectId, projectName, onBack }) => {
    const [entries, setEntries] = useState([]);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ field: 'total_score', dir: 'desc' });
    const [expandedId, setExpandedId] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'podium'

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiBase}/projects/${projectId}/leaderboard`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setProject(data.project || null);
            setEntries(data.leaderboard || []);
        } catch (err) {
            console.error('[Leaderboard] fetch error:', err);
            setFetchError(err.message);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

    // ── Sort handler ──
    const handleSort = (field) => {
        setSortConfig(prev =>
            prev.field === field
                ? { field, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
                : { field, dir: 'desc' }
        );
    };

    // ── Derived data ──
    const maxScore = project?.max_score ?? 10;
    const criteria = project?.scoring_criteria ?? [];

    const processed = entries
        .filter(e => e.team_name?.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const av = a[sortConfig.field] ?? 0;
            const bv = b[sortConfig.field] ?? 0;
            return sortConfig.dir === 'desc' ? bv - av : av - bv;
        })
        .map((e, i) => ({ ...e, rank: i + 1 }));

    const top3 = [...entries]
        .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
        .slice(0, 3)
        .map((e, i) => ({ ...e, rank: i + 1 }));

    const avgScore = entries.length > 0
        ? (entries.reduce((s, e) => s + (e.total_score ?? 0), 0) / entries.length).toFixed(2)
        : '—';

    const topScore = entries.length > 0
        ? Math.max(...entries.map(e => e.total_score ?? 0)).toFixed(2)
        : '—';

    // ── CSV export ──
    const handleExport = () => {
        const header = ['Rank', 'Team', 'Score', ...criteria.map(c => c.name)].join(',');
        const rows = processed.map(e => [
            e.rank,
            `"${e.team_name}"`,
            e.total_score?.toFixed(2) ?? 0,
            ...criteria.map(c => e.criteria_scores?.[c.name]?.toFixed(2) ?? ''),
        ].join(','));
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName || 'leaderboard'}-results.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─────────────────────────────────────────────────────────────────────────
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
                                {projectName || project?.project_name || '…'}
                            </span>
                            <span className="text-white/20 hidden sm:block">/</span>
                            <span className="text-sm text-gray-400 hidden sm:block">Leaderboard</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchLeaderboard}
                            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={entries.length === 0}
                            className="flex items-center gap-2 px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:block">Export CSV</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 pt-28 pb-16">

                {/* ── Header ── */}
                <div className="mb-10 flex items-start gap-4">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <Trophy className="w-6 h-6 text-yellow-400/80" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            {projectName || project?.project_name || 'Hackathon Results'} — ranked by total evaluation score
                        </p>
                    </div>
                </div>

                {/* ── Loading ── */}
                {loading ? (
                    <div className="flex justify-center py-32">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>

                ) : fetchError ? (
                    <div className="text-center py-24 border border-dashed border-red-500/20 rounded-3xl bg-red-500/5">
                        <p className="text-red-400 mb-2 font-medium">Failed to load leaderboard</p>
                        <p className="text-gray-500 text-sm mb-6">{fetchError}</p>
                        <button
                            onClick={fetchLeaderboard}
                            className="px-5 py-2.5 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors"
                        >
                            Retry
                        </button>
                    </div>

                ) : entries.length === 0 ? (
                    <div className="text-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                        <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10">
                            <BarChart2 className="w-10 h-10 text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No results yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            Scores will appear here once submissions have been evaluated.
                        </p>
                    </div>

                ) : (
                    <>
                        {/* ── Stats row ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                            <StatCard
                                icon={Users}
                                label="Teams Ranked"
                                value={entries.length}
                            />
                            <StatCard
                                icon={Star}
                                label="Top Score"
                                value={topScore}
                                sub={`out of ${maxScore}`}
                                accent="bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
                            />
                            <StatCard
                                icon={TrendingUp}
                                label="Average Score"
                                value={avgScore}
                            />
                            <StatCard
                                icon={Layers}
                                label="Criteria"
                                value={criteria.length || '—'}
                                sub="evaluation rubric"
                            />
                        </div>

                        {/* ── Tab toggle ── */}
                        <div className="flex items-center gap-2 mb-8">
                            <div className="p-1 bg-white/[0.03] border border-white/10 rounded-xl inline-flex">
                                {[
                                    { id: 'all', label: 'Full Rankings' },
                                    { id: 'podium', label: 'Podium' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Podium view ── */}
                        {activeTab === 'podium' && (
                            <div className="mb-10">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    {/* 2nd — left */}
                                    {top3[1] && <PodiumCard entry={top3[1]} maxScore={maxScore} />}
                                    {/* 1st — center, taller */}
                                    {top3[0] && <PodiumCard entry={top3[0]} maxScore={maxScore} />}
                                    {/* 3rd — right */}
                                    {top3[2] && <PodiumCard entry={top3[2]} maxScore={maxScore} />}
                                </div>

                                {/* Honorable mentions */}
                                {processed.length > 3 && (
                                    <div className="mt-6 bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
                                        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Other Finalists</span>
                                        </div>
                                        <div className="divide-y divide-white/5">
                                            {processed.slice(3).map(entry => (
                                                <div key={entry.submission_id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                                                    <span className="w-6 text-xs font-mono text-gray-600 shrink-0">{entry.rank}</span>
                                                    <span className="flex-1 text-sm font-medium text-gray-300 truncate">{entry.team_name}</span>
                                                    <span className="text-sm font-mono font-bold">{(entry.total_score ?? 0).toFixed(2)}</span>
                                                    <DeltaChip score={entry.total_score ?? 0} maxScore={maxScore} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Full Rankings table ── */}
                        {activeTab === 'all' && (
                            <>
                                {/* Search */}
                                <div className="sticky top-20 z-30 bg-[#050505]/95 backdrop-blur-sm py-4 mb-2 -mx-2 px-2">
                                    <div className="relative max-w-sm group">
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-white transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search teams..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:bg-white/[0.07] focus:border-white/20 transition-all placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>

                                <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden">

                                    {/* Table header */}
                                    <div className="hidden md:grid px-6 py-3 border-b border-white/5"
                                        style={{ gridTemplateColumns: `3rem 1fr 8rem ${criteria.length > 0 ? `repeat(${Math.min(criteria.length, 4)}, 7rem)` : ''}` }}
                                    >
                                        <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">#</span>
                                        <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Team</span>
                                        <div className="text-right">
                                            <SortButton label="Total" field="total_score" sortConfig={sortConfig} onSort={handleSort} />
                                        </div>
                                        {criteria.slice(0, 4).map(c => (
                                            <div key={c.name} className="text-right">
                                                <SortButton
                                                    label={c.name.split(' ').slice(0, 2).join(' ')}
                                                    field={`criteria_scores.${c.name}`}
                                                    sortConfig={sortConfig}
                                                    onSort={handleSort}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Rows */}
                                    {processed.length === 0 ? (
                                        <div className="py-16 text-center text-gray-600 text-sm">
                                            No teams match your search.
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-white/5">
                                            {processed.map(entry => {
                                                const isExpanded = expandedId === entry.submission_id;
                                                const rankColors = {
                                                    1: 'group-hover:bg-yellow-500/[0.03]',
                                                    2: 'group-hover:bg-gray-400/[0.03]',
                                                    3: 'group-hover:bg-orange-500/[0.03]',
                                                };
                                                const hoverColor = rankColors[entry.rank] || 'group-hover:bg-white/[0.02]';

                                                return (
                                                    <div key={entry.submission_id}>
                                                        {/* Main row */}
                                                        <div
                                                            className={`group px-6 py-4 cursor-pointer transition-colors ${hoverColor}`}
                                                            onClick={() => setExpandedId(isExpanded ? null : entry.submission_id)}
                                                        >
                                                            {/* Mobile layout */}
                                                            <div className="flex md:hidden items-center gap-3">
                                                                <RankBadge rank={entry.rank} />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold truncate group-hover:text-white transition-colors">
                                                                        {entry.team_name}
                                                                    </p>
                                                                    <div className="mt-1.5 flex items-center gap-3">
                                                                        <ScoreBar score={entry.total_score ?? 0} maxScore={maxScore} rank={entry.rank} />
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-lg font-bold font-mono">{(entry.total_score ?? 0).toFixed(2)}</p>
                                                                    <DeltaChip score={entry.total_score ?? 0} maxScore={maxScore} />
                                                                </div>
                                                            </div>

                                                            {/* Desktop layout */}
                                                            <div
                                                                className="hidden md:grid items-center gap-4"
                                                                style={{ gridTemplateColumns: `3rem 1fr 8rem ${criteria.length > 0 ? `repeat(${Math.min(criteria.length, 4)}, 7rem)` : ''}` }}
                                                            >
                                                                {/* Rank */}
                                                                <RankBadge rank={entry.rank} />

                                                                {/* Team */}
                                                                <div className="min-w-0 flex items-center gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-semibold truncate group-hover:text-white transition-colors">
                                                                            {entry.team_name}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-1.5">
                                                                            <ScoreBar score={entry.total_score ?? 0} maxScore={maxScore} rank={entry.rank} />
                                                                        </div>
                                                                        {entry.drive_file_name && (
                                                                            <p className="text-[10px] text-gray-600 font-mono truncate mt-0.5">
                                                                                {entry.drive_file_name}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    {entry.drive_file_url && (
                                                                        <a
                                                                            href={entry.drive_file_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={e => e.stopPropagation()}
                                                                            className="p-1.5 text-gray-600 hover:text-white hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                                                            title="Open in Drive"
                                                                        >
                                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                                        </a>
                                                                    )}
                                                                </div>

                                                                {/* Total score */}
                                                                <div className="text-right">
                                                                    <p className="text-lg font-bold font-mono leading-none">
                                                                        {(entry.total_score ?? 0).toFixed(2)}
                                                                    </p>
                                                                    <DeltaChip score={entry.total_score ?? 0} maxScore={maxScore} />
                                                                </div>

                                                                {/* Per-criteria scores */}
                                                                {criteria.slice(0, 4).map(c => {
                                                                    const cs = entry.criteria_scores?.[c.name];
                                                                    return (
                                                                        <div key={c.name} className="text-right">
                                                                            <p className="text-sm font-mono text-gray-400">
                                                                                {cs != null ? cs.toFixed(1) : <Minus className="w-3 h-3 inline text-gray-700" />}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Expanded: full criteria breakdown + feedback */}
                                                        {isExpanded && (
                                                            <div className="px-6 pb-6 pt-3 bg-white/[0.01] border-t border-white/5">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                                                                    {criteria.map(c => {
                                                                        const cs = entry.criteria_scores?.[c.name];
                                                                        const cMax = (c.weight / 100) * maxScore;
                                                                        const pct = cMax > 0 && cs != null ? Math.min((cs / cMax) * 100, 100) : 0;
                                                                        return (
                                                                            <div key={c.name} className="bg-black/30 border border-white/8 rounded-xl p-4">
                                                                                <div className="flex items-start justify-between mb-2 gap-2">
                                                                                    <span className="text-xs font-semibold text-gray-300 leading-snug">{c.name}</span>
                                                                                    <span className="text-xs font-mono text-gray-500 shrink-0">{c.weight}%</span>
                                                                                </div>
                                                                                <div className="flex items-end gap-1.5 mb-2">
                                                                                    <span className="text-2xl font-bold font-mono">
                                                                                        {cs != null ? cs.toFixed(1) : '—'}
                                                                                    </span>
                                                                                    <span className="text-xs text-gray-600 mb-1">/ {cMax.toFixed(1)}</span>
                                                                                </div>
                                                                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full bg-white/40 transition-all duration-700"
                                                                                        style={{ width: `${pct}%` }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* AI feedback */}
                                                                {entry.ai_feedback && (
                                                                    <div className="bg-black/20 border border-white/8 rounded-xl p-4">
                                                                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-2">
                                                                            AI Feedback
                                                                        </p>
                                                                        <p className="text-xs text-gray-400 leading-relaxed font-mono whitespace-pre-wrap">
                                                                            {entry.ai_feedback}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-600">
                                        <span className="font-mono">{processed.length} result{processed.length !== 1 ? 's' : ''}</span>
                                        {criteria.length > 4 && (
                                            <span className="text-gray-700">
                                                +{criteria.length - 4} more criteria — expand a row to view all
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default Leaderboard;