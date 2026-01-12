import React, { useState, useEffect } from 'react';
import {
    Zap, Shield, BarChart3, ArrowRight, CheckCircle,
    Sparkles, Brain, Clock, Users, Play, ChevronRight,
    Target, FileJson, Lock, Search, AlertTriangle, Database,
    Scale, Split, MessageSquare, Fingerprint
} from 'lucide-react';

const LandingPage = ({ onNavigate, onLoginClick }) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-white/20">

            {/* Dynamic Background Spotlight - White/Silver */}
            <div
                className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
                style={{
                    background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.03), transparent 40%)`
                }}
            />

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-white/10 border border-white/10 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">E</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">EvalAI</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-1">
                        <button onClick={onLoginClick} className="px-6 py-2 text-sm text-gray-400 hover:text-white transition-colors">Sign In</button>
                        <button
                            onClick={onNavigate}
                            className="px-5 py-2 bg-white text-black rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* SECTION 1: HERO */}
            <div className="relative pt-32 pb-20 px-6 z-10">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Proprietary Evaluation Engine v1.0</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
                        Stop Judging. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600">
                            Start Evaluating.
                        </span>
                    </h1>

                    <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        The first AI-powered platform designed to screen, rank, and audit hackathon presentations with specialized precision. <span className="text-white">Save 20+ hours of manual review.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-20">
                        <button
                            onClick={onNavigate}
                            className="px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-all flex items-center space-x-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                        >
                            <Database className="w-4 h-4" />
                            <span>Connect Google Drive</span>
                        </button>
                        <button className="px-8 py-4 bg-black border border-white/20 text-white rounded-full font-medium hover:bg-white/5 transition-all flex items-center space-x-2 backdrop-blur-sm group">
                            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                            <span>Watch the 1-Min Demo</span>
                        </button>
                    </div>
                </div>

                {/* Dashboard Preview */}
                <div className="max-w-6xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-white/10 to-gray-500/10 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                    <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="border-b border-white/5 bg-white/[0.02] p-4 flex items-center justify-between">
                            <div className="flex space-x-2 opacity-50">
                                <div className="w-3 h-3 rounded-full bg-white/20" />
                                <div className="w-3 h-3 rounded-full bg-white/20" />
                                <div className="w-3 h-3 rounded-full bg-white/20" />
                            </div>
                            <div className="text-xs font-mono text-gray-500">Processing: /hackathon_submissions/batch_04</div>
                        </div>
                        <div className="p-8">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h3 className="text-2xl font-semibold mb-1 text-white">Live Leaderboard</h3>
                                    <p className="text-sm text-gray-500">From a folder of PDFs to ranked results in 180 seconds.</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-mono font-bold text-white">98.4%</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest">Accuracy Score</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 text-xs text-gray-500 uppercase tracking-wider mb-4 px-4">
                                <div className="col-span-4">Project Team</div>
                                <div className="col-span-3">Tech Stack</div>
                                <div className="col-span-2 text-center">Feasibility</div>
                                <div className="col-span-3 text-right">Audit Status</div>
                            </div>

                            {[
                                { name: "EcoChain", tech: "Solidity, React", score: 9.2, status: "Verified", statusColor: "text-white" },
                                { name: "MediSync AI", tech: "Python, TensorFlow", score: 8.8, status: "Verified", statusColor: "text-white" },
                                { name: "CryptoPunks Clone", tech: "HTML, CSS", score: 2.1, status: "Synthetic Detected", statusColor: "text-gray-500" },
                            ].map((row, i) => (
                                <div key={i} className="grid grid-cols-12 items-center py-4 px-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <div className="col-span-4 font-medium text-white">{row.name}</div>
                                    <div className="col-span-3 text-sm text-gray-400">{row.tech}</div>
                                    <div className="col-span-2 flex justify-center">
                                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-white" style={{ width: `${row.score * 10}%` }} />
                                        </div>
                                    </div>
                                    <div className={`col-span-3 text-right text-xs font-mono ${row.statusColor}`}>
                                        {row.status === "Verified" && <span className="inline-block mr-2 text-white">●</span>}
                                        {row.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MARQUEE */}
            <div className="py-8 bg-white/[0.02] border-y border-white/5 overflow-hidden whitespace-nowrap relative">
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#050505] to-transparent z-10" />
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#050505] to-transparent z-10" />
                <div className="inline-block animate-[scroll_20s_linear_infinite]">
                    {[...Array(2)].map((_, i) => (
                        <span key={i} className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white/40 to-white/5 mx-4 uppercase tracking-tighter">
                            FAIR. FAST. FOCUSED. — HACKATHON MANAGEMENT ON AUTOPILOT — DEEP LEARNING FOR DEEP TECH — YOUR NEW CO-JUDGE DOESN'T NEED COFFEE —
                        </span>
                    ))}
                </div>
                <style>{`
            @keyframes scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
            </div>

            {/* SECTION: THE REAL PROBLEMS (Bento Grid) */}
            <div className="py-32 px-6 max-w-7xl mx-auto">
                <div className="mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">The "Hidden Logistics" <br /><span className="text-gray-500">of every Hackathon.</span></h2>
                    <p className="text-xl text-gray-400 max-w-2xl">
                        The problem isn't just "grading"—it's the operational nightmare of scaling 500+ submissions while maintaining fairness.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">

                    {/* Card 1: Scale (Large) */}
                    <div className="lg:col-span-4 p-8 rounded-3xl bg-[#0A0A0A] border border-white/10 hover:border-white/20 transition-all group">
                        <div className="flex items-start justify-between mb-8">
                            <div className="p-3 bg-white/5 rounded-xl"><Clock className="w-6 h-6 text-white" /></div>
                            <span className="text-xs font-mono text-gray-500 border border-white/10 px-2 py-1 rounded">LOGISTICS</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">The "Scale vs. Quality" Paradox</h3>
                        <div className="flex flex-col md:flex-row gap-6 mt-6">
                            <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <div className="text-xs text-red-400 font-bold mb-2">THE PROBLEM</div>
                                <p className="text-sm text-gray-400">Judges spend 2 minutes on the first PPT and 20 seconds on the 50th due to fatigue. "Hidden gems" get ignored.</p>
                            </div>
                            <div className="flex items-center text-gray-600"><ArrowRight className="w-5 h-5" /></div>
                            <div className="flex-1 p-4 rounded-xl bg-gradient-to-b from-white/10 to-transparent border border-white/10">
                                <div className="text-xs text-white font-bold mb-2">EVALAI SOLUTION</div>
                                <p className="text-sm text-gray-200">Consistent, high-depth review for every submission in seconds. No fatigue, just fairness.</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Subjectivity (Tall) */}
                    <div className="lg:col-span-2 p-8 rounded-3xl bg-[#0A0A0A] border border-white/10 hover:border-white/20 transition-all group">
                        <div className="p-3 bg-white/5 rounded-xl w-fit mb-8"><Scale className="w-6 h-6 text-white" /></div>
                        <h3 className="text-xl font-bold mb-4">"Black Box" Grading</h3>
                        <div className="space-y-4">
                            <div className="text-sm text-gray-500 pb-4 border-b border-white/5">
                                Judge A loves UI. Judge B loves Code. Rankings become a lottery based on who reviews you.
                            </div>
                            <div className="text-sm text-white">
                                <span className="block font-semibold mb-1 text-gray-200">Customizable Criteria</span>
                                Define weights (e.g., 40% Innovation) and the AI acts as a Single Source of Truth.
                            </div>
                        </div>
                    </div>

                    {/* Card 3: AI Filler (Medium) */}
                    <div className="lg:col-span-2 p-8 rounded-3xl bg-[#0A0A0A] border border-white/10 hover:border-white/20 transition-all group">
                        <div className="p-3 bg-white/5 rounded-xl w-fit mb-8"><Fingerprint className="w-6 h-6 text-white" /></div>
                        <h3 className="text-xl font-bold mb-4">The "Filler" Epidemic</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Participants use LLMs to hallucinate features without writing code.
                        </p>
                        <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                            <div className="text-xs text-white font-bold mb-1 flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Probability Flag
                            </div>
                            <p className="text-xs text-gray-400">Filters teams that are "all talk, no code."</p>
                        </div>
                    </div>

                    {/* Card 4: PS Mismatch (Medium) */}
                    <div className="lg:col-span-2 p-8 rounded-3xl bg-[#0A0A0A] border border-white/10 hover:border-white/20 transition-all group">
                        <div className="p-3 bg-white/5 rounded-xl w-fit mb-8"><Split className="w-6 h-6 text-white" /></div>
                        <h3 className="text-xl font-bold mb-4">PS Mismatch</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Teams submitting generic solutions to specific tracks.
                        </p>
                        <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                            <div className="text-xs text-white font-bold mb-1 flex items-center gap-2">
                                <Target className="w-3 h-3" /> Auto-Classification
                            </div>
                            <p className="text-xs text-gray-400">RAG categorizes decks and flags "Off-Theme" projects.</p>
                        </div>
                    </div>

                    {/* Card 5: Feedback (Wide) */}
                    <div className="lg:col-span-2 p-8 rounded-3xl bg-[#0A0A0A] border border-white/10 hover:border-white/20 transition-all group">
                        <div className="p-3 bg-white/5 rounded-xl w-fit mb-8"><MessageSquare className="w-6 h-6 text-white" /></div>
                        <h3 className="text-xl font-bold mb-4">No Actionable Feedback</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            "Rejected" emails give no closure. Teams never learn.
                        </p>
                        <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                            <div className="text-xs text-white font-bold mb-1 flex items-center gap-2">
                                <FileJson className="w-3 h-3" /> Deep-Dive Drawer
                            </div>
                            <p className="text-xs text-gray-400">"You lost points on Slide 6: Database Architecture missing."</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* SECTION 4: SPECIALIZED INTELLIGENCE */}
            <div className="relative py-32 border-y border-white/5 bg-white/[0.01]">
                <div className="max-w-4xl mx-auto text-center px-6">
                    <h2 className="text-sm font-mono text-gray-400 mb-4 tracking-widest uppercase">Powered by Specialized Intelligence</h2>
                    <h3 className="text-4xl md:text-5xl font-bold mb-8 text-white">Beyond General AI</h3>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        Unlike generic chatbots that provide surface-level summaries, our engine is fine-tuned on thousands of high-quality technical presentations. It understands the nuances of <span className="text-white">MVP development, tech stacks, and market feasibility</span> better than any off-the-shelf model.
                    </p>
                </div>
            </div>

            {/* FOOTER */}
            <div className="py-24 px-6 text-center">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-5xl font-bold mb-8">Ready to upgrade your next Hackathon?</h2>
                    <button
                        onClick={onNavigate}
                        className="px-10 py-5 bg-white text-black text-lg font-bold rounded-full hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                    >
                        Create Your First Project — It's Free
                    </button>
                    <p className="mt-8 text-sm text-gray-600">
                        © 2025 EvalAI. Built for high-integrity competitions.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;