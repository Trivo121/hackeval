import React, { useState, useEffect } from 'react';
import { X, Save, User, Loader2, CheckCircle, Camera } from 'lucide-react';
import { supabase } from '../services/auth';
import { updateProfile } from '../services/api';

const ProfileModal = ({ user, onClose, onUpdate }) => {
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || '');
            setAvatarUrl(user.user_metadata?.avatar_url || '');
        }
    }, [user]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200); // Wait for animation
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMessage('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session found");

            // 1. Update Backend
            const updatedUser = await updateProfile(session.access_token, {
                full_name: fullName,
                avatar_url: avatarUrl
            });

            // 2. Update Supabase Auth Session
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: fullName, avatar_url: avatarUrl }
            });

            if (authError) throw authError;

            setSuccessMessage("Saved!");
            if (onUpdate) onUpdate(updatedUser);

            setTimeout(() => {
                handleClose();
            }, 1000);

        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className={`bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 transform transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent">
                    <h2 className="text-xl font-bold tracking-tight text-white">Edit Profile</h2>
                    <p className="text-sm text-gray-400 mt-1">Customize your personal details</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* Avatar Section */}
                    <div className="flex flex-col items-center">
                        <div className="relative group cursor-pointer overflow-hidden rounded-full transition-transform hover:scale-105 duration-300 ring-2 ring-white/10 ring-offset-4 ring-offset-[#0A0A0A]">
                            <div className="w-24 h-24 bg-white/5">
                                <img
                                    src={avatarUrl || `https://ui-avatars.com/api/?name=${user?.email}`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Camera className="w-6 h-6 text-white/90" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 font-medium tracking-wide uppercase">Profile Photo</p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-5">
                        <div className="group">
                            <label className="text-[10px] font-bold tracking-widest text-gray-500 ml-1 mb-2 block uppercase">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-500 group-focus-within:text-white transition-colors" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all placeholder:text-gray-600"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="text-[10px] font-bold tracking-widest text-gray-500 ml-1 mb-2 block uppercase">Avatar URL</label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-3 w-4 h-4 text-gray-500 flex items-center justify-center font-mono text-[10px] group-focus-within:text-white transition-colors">IMG</div>
                                <input
                                    type="text"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all font-mono placeholder:text-gray-600 truncate"
                                    placeholder="https://"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : successMessage ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span>Saved!</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
