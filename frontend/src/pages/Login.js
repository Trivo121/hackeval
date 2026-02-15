import React, { useState, useEffect } from 'react';
import {
    Mail, Lock, ArrowRight, Github,
    Terminal, Loader2, AlertCircle
} from 'lucide-react';

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4" />
        <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853" />
        <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49L4.405 11.9z" fill="#FBBC05" />
        <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335" />
    </svg>
);

const LoginPage = ({ onLogin = () => { }, onNavigateBack = () => { } }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        setTimeout(() => {
            if (email && password) {
                setIsLoading(false);
                onLogin();
            } else {
                setIsLoading(false);
                setError('Invalid credentials. Please try again.');
            }
        }, 1500);
    };

    const handleSocialLogin = async (provider) => {
        setIsLoading(true);
        setError(null);
        try {
            if (provider === 'google') {
                const { signInWithGoogle } = await import('../services/auth');
                await signInWithGoogle();
                // Redirect happens automatically
            } else {
                // Not implemented
                setTimeout(() => {
                    setIsLoading(false);
                    setError("GitHub login not implemented yet.");
                }, 1000);
            }
        } catch (err) {
            setIsLoading(false);
            setError(err.message || "Login failed");
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-hidden font-sans flex flex-col relative">
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.03), transparent 40%)`
                }}
            />

            <nav className="relative z-50 p-6">
                <div
                    onClick={onNavigateBack}
                    className="cursor-pointer flex items-center space-x-2 w-fit opacity-80 hover:opacity-100 transition-opacity"
                >
                    <div className="w-8 h-8 bg-white/10 border border-white/10 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">H</span>
                    </div>
                    <span className="text-xl font-bold">HackEval</span>
                </div>
            </nav>

            <div className="flex-1 flex items-center justify-center relative z-10 px-6">
                <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <div className="p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
                            <p className="text-gray-400 text-sm">Enter your credentials to access the evaluation console.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-mono text-gray-500 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                                        placeholder="admin@hackathon.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-mono text-gray-500 ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Sign In <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="my-6 relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-[#0A0A0A] text-gray-500 uppercase tracking-wider">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleSocialLogin('google')}
                                disabled={isLoading}
                                className="bg-white/5 border border-white/10 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <GoogleIcon />
                                <span className="text-sm font-medium">Google</span>
                            </button>
                            <button
                                onClick={() => handleSocialLogin('github')}
                                disabled={isLoading}
                                className="bg-white/5 border border-white/10 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Github className="w-5 h-5" />
                                <span className="text-sm font-medium">GitHub</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/[0.02] border-t border-white/5 p-4 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Terminal className="w-3 h-3" /> v1.0.4-beta
                        </div>
                        <div className="flex items-center gap-1.5 text-green-400">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> System Online
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;