import React from 'react';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';
import { signOut } from '../services/auth';

const PendingAccess = ({ user, onSignOut }) => {
    const handleSignOut = async () => {
        await signOut();
        if (onSignOut) {
            onSignOut();
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans selection:bg-white/20">
            <div className="max-w-md w-full bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 md:p-10 text-center shadow-2xl relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-yellow-500/10 blur-[50px] pointer-events-none" />

                <div className="mx-auto w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <Clock className="w-8 h-8 text-yellow-500" />
                </div>

                <h1 className="text-2xl font-bold mb-3 text-white">Access Pending</h1>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    Hi <span className="text-white font-medium">{user?.user_metadata?.full_name || user?.email}</span>. 
                    Your request to join HackEval has been received and is currently under review by our team.
                </p>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-left flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                        HackEval is currently in a closed beta. We manually review all access requests to ensure platform stability. 
                        Please check back later or wait for an admin to approve your account.
                    </p>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm font-medium text-gray-300 hover:text-white"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
            
            <p className="mt-8 text-xs text-gray-600 font-mono">
                Status: Awaiting Admin Approval
            </p>
        </div>
    );
};

export default PendingAccess;
