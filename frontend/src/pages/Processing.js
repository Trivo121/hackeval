import React, { useState, useEffect, useRef } from 'react';
import {
    Activity, Terminal, Database, FileText, AlertTriangle,
    Pause, Square, Cpu, Check, Lock, Loader2, ScanLine, BrainCircuit, Play
} from 'lucide-react';

// --- SUB-COMPONENT: Processing Orbit (The Visual Tracker) ---
const ProcessingOrbit = ({ stage, progress }) => {
    const steps = [
        { id: 0, label: "Ingesting", icon: Database },
        { id: 1, label: "Visualizing", icon: ScanLine },
        { id: 2, label: "Chunking", icon: FileText },
        { id: 3, label: "Evaluating", icon: BrainCircuit }
    ];

    // Calculate circumference for SVG circle
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Outer Glow */}
            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full opacity-20" />

            {/* SVG Progress Ring */}
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="160" cy="160" r={radius}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="2"
                    fill="transparent"
                />
                <circle
                    cx="160" cy="160" r={radius}
                    stroke="white"
                    strokeWidth="2"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-5xl font-mono font-bold tracking-tighter mb-2">
                    {progress}%
                </div>
                <div className="flex items-center space-x-2 text-gray-400 text-sm uppercase tracking-widest animate-pulse">
                    {steps[stage] ? (
                        <>
                            {React.createElement(steps[stage].icon, { className: "w-4 h-4" })}
                            <span>{steps[stage].label}</span>
                        </>
                    ) : (
                        <span>Finalizing...</span>
                    )}
                </div>
            </div>

            {/* Orbiting Satellites (Decorations) */}
            <div className="absolute w-full h-full animate-[spin_10s_linear_infinite] opacity-30">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Status Console (The Live Terminal) ---
const StatusConsole = ({ logs }) => {
    const scrollRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="flex flex-col h-full bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Terminal Header */}
            <div className="h-10 bg-white/5 border-b border-white/5 flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-mono text-gray-400">/var/log/eval_engine.log</span>
                </div>
                <div className="flex space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
            </div>

            {/* Log Stream */}
            <div
                ref={scrollRef}
                className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 scrollbar-hide"
            >
                {logs.map((log, i) => (
                    <div key={i} className="flex space-x-3 opacity-0 animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-gray-600">[{log.time}]</span>
                        <span className={`${log.type === 'error' ? 'text-red-400' :
                            log.type === 'success' ? 'text-green-400' :
                                log.type === 'flag' ? 'text-yellow-400' :
                                    'text-gray-300'
                            }`}>
                            {log.msg}
                        </span>
                    </div>
                ))}
                <div className="animate-pulse text-white">_</div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Interim Stats (The Metrics) ---
const InterimStats = ({ stats }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
            { label: "PPTs Scanned", value: stats.scanned, icon: FileText },
            { label: "AI Flags", value: stats.flags, icon: AlertTriangle, color: "text-yellow-400" },
            { label: "Avg. Score", value: stats.avgScore, icon: Activity },
            { label: "Sys. Health", value: "99.8%", icon: Cpu, color: "text-green-400" },
        ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center space-x-4">
                <div className={`p-2 bg-white/5 rounded-lg ${stat.color || 'text-white'}`}>
                    <stat.icon className="w-5 h-5" />
                </div>
                <div>
                    <div className="text-2xl font-bold font-mono">{stat.value}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
                </div>
            </div>
        ))}
    </div>
);

// --- MAIN PAGE COMPONENT ---

const ProcessingPage = ({ onComplete }) => {
    // --- STATE ---
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({ scanned: 0, flags: 0, avgScore: 0 });
    const [skeletonCards, setSkeletonCards] = useState([1, 2, 3]); // Placeholder IDs

    // --- SIMULATION LOGIC ---
    useEffect(() => {
        if (isPaused) return;

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(timer);
                    if (onComplete) onComplete();
                    return 100;
                }

                // Logic to switch stages based on progress percentage
                const newProgress = prev + (Math.random() * 1.5); // Random increment
                if (newProgress > 25 && stage === 0) setStage(1);
                if (newProgress > 50 && stage === 1) setStage(2);
                if (newProgress > 75 && stage === 2) setStage(3);

                // Simulation: Add Logs randomly
                if (Math.random() > 0.7) addRandomLog(newProgress);

                // Simulation: Update Stats randomly
                if (Math.random() > 0.85) updateRandomStats();

                // Simulation: "Process" a card every ~20%
                if (Math.floor(newProgress) % 20 === 0 && Math.floor(newProgress) !== Math.floor(prev)) {
                    setSkeletonCards(curr => [...curr, curr.length + 1]);
                }

                return newProgress;
            });
        }, 100); // Speed of update

        return () => clearInterval(timer);
    }, [isPaused, stage]);

    // Helper: Generate fake logs
    const addRandomLog = (currentProg) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const logTemplates = [
            { msg: `Vectorizing Slide ${Math.floor(Math.random() * 10) + 1}...`, type: 'info' },
            { msg: `Team_${Math.floor(Math.random() * 100)}: Architecture verified.`, type: 'success' },
            { msg: `RAG Retrieval: Found 3 matching citations.`, type: 'info' },
            { msg: `Analysing revenue model feasibility...`, type: 'info' },
            { msg: `Warning: High probability of generic LLM text detected.`, type: 'flag' },
            { msg: `Token limit optimized for Gemini Flash.`, type: 'info' }
        ];

        // Choose log based on stage
        let validLogs = logTemplates;
        if (currentProg < 25) validLogs = [{ msg: `Ingesting PDF Buffer...`, type: 'info' }];

        const randomLog = validLogs[Math.floor(Math.random() * validLogs.length)];
        setLogs(prev => [...prev.slice(-20), { time, ...randomLog }]); // Keep last 20
    };

    // Helper: Update stats
    const updateRandomStats = () => {
        setStats(prev => ({
            scanned: prev.scanned + 1,
            flags: Math.random() > 0.8 ? prev.flags + 1 : prev.flags,
            avgScore: (7 + Math.random() * 2).toFixed(1)
        }));
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 flex flex-col p-6 lg:p-12">

            {/* Header & Controls */}
            <div className="flex justify-between items-start mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center space-x-3">
                        <span>Processing Engine</span>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-mono border ${isPaused ? 'border-yellow-500 text-yellow-500' : 'border-green-500 text-green-500 animate-pulse'}`}>
                            {isPaused ? 'PAUSED' : 'LIVE EXECUTING'}
                        </div>
                    </h1>
                    <p className="text-gray-400 text-sm">EvalAI is analyzing your submissions with RAG-enhanced precision.</p>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="flex items-center space-x-2 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        <span className="text-sm font-medium">{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
                        <Square className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">Abort</span>
                    </button>
                </div>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">

                {/* Left Column: Visuals & Stats */}
                <div className="lg:col-span-7 flex flex-col space-y-8">

                    {/* Top: The Orbit & Live Card Animation */}
                    <div className="flex flex-col md:flex-row items-center justify-center bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                        {/* Background Grid Pattern */}
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                        />

                        <ProcessingOrbit stage={stage} progress={Math.floor(progress)} />

                        {/* The "RAG Scan" Visual - Right side of Orbit */}
                        <div className="mt-8 md:mt-0 md:ml-12 relative w-48 h-64 bg-[#0A0A0A] border border-white/10 rounded-lg p-4 shadow-2xl transform rotate-3">
                            {/* Document Content Skeleton */}
                            <div className="space-y-3 opacity-50">
                                <div className="h-4 bg-white/20 rounded w-3/4" />
                                <div className="h-3 bg-white/10 rounded w-full" />
                                <div className="h-3 bg-white/10 rounded w-5/6" />
                                <div className="h-20 bg-white/5 rounded w-full mt-4" />
                            </div>
                            {/* The Laser Scanner */}
                            <div
                                className={`absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white/20 to-transparent border-t border-white/50 shadow-[0_0_15px_white] transition-opacity duration-300 ${isPaused ? 'opacity-0' : 'opacity-100'}`}
                                style={{ animation: 'scan 2s linear infinite' }}
                            />
                            <div className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-500">
                                RAG_LAYER_ACTIVE
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Interim Stats */}
                    <InterimStats stats={stats} />
                </div>

                {/* Right Column: Console & Dynamic Feed */}
                <div className="lg:col-span-5 flex flex-col space-y-6 h-[600px] lg:h-auto">

                    {/* The Terminal */}
                    <div className="flex-1 min-h-[300px]">
                        <StatusConsole logs={logs} />
                    </div>

                    {/* Dynamic Skeleton Feed */}
                    <div className="h-48 border-t border-white/10 pt-6">
                        <h3 className="text-xs font-mono text-gray-500 mb-3 uppercase tracking-wider">Recently Processed</h3>
                        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                            {skeletonCards.map((id) => (
                                <div key={id} className="min-w-[140px] h-32 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-between animate-in zoom-in duration-300">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-green-400" />
                                    </div>
                                    <div>
                                        <div className="h-2 w-16 bg-white/20 rounded mb-2" />
                                        <div className="h-2 w-10 bg-white/10 rounded" />
                                    </div>
                                </div>
                            ))}
                            {/* Loading Skeleton */}
                            <div className="min-w-[140px] h-32 border border-white/5 border-dashed rounded-xl p-3 flex items-center justify-center opacity-50">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
        </div>
    );
};

export default ProcessingPage;