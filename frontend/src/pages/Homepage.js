import React, { useState, useEffect } from 'react';
import { supabase } from '../services/auth';
import { getProjects } from '../services/api';
import { Plus, Folder, Clock, ChevronRight, LogOut, Search, Filter, LayoutGrid, List } from 'lucide-react';
import ProfileModal from '../components/ProfileModal';

const Homepage = ({ user: initialUser, onCreateProject, onSignOut }) => {
    const [user, setUser] = useState(initialUser);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user) fetchProjects();
    }, [user]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const result = await getProjects(session.access_token);
            setProjects(result.projects || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = (updatedUser) => {
        // Update local state to reflect changes immediately
        const newUserCtx = {
            ...user,
            user_metadata: {
                ...user.user_metadata,
                full_name: updatedUser.full_name,
                avatar_url: updatedUser.avatar_url
            }
        };
        setUser(newUserCtx);
        // Force refresh of projects in case name is displayed there, etc.
        fetchProjects();
    };

    const filteredProjects = projects.filter(p =>
        p.project_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-40 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white text-black font-bold rounded-lg flex items-center justify-center shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)]">
                            <span className="text-xl">H</span>
                        </div>
                        <span className="font-bold text-lg tracking-tight">HackEval</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div
                            onClick={() => setIsProfileModalOpen(true)}
                            className="group flex items-center gap-3 pl-1 pr-4 py-1 bg-white/5 border border-white/5 rounded-full cursor-pointer hover:bg-white/10 hover:border-white/10 transition-all duration-300"
                        >
                            <div className="relative">
                                <img
                                    src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email}`}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full border border-white/10 group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 rounded-full ring-1 ring-white/0 group-hover:ring-white/20 transition-all" />
                            </div>
                            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                            </span>
                        </div>
                        <button
                            onClick={onSignOut}
                            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 pt-28 pb-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 animate-fade-in-up">
                    <div>
                        <h1 className="text-4xl font-bold mb-3 tracking-tight">Dashboard</h1>
                        <p className="text-gray-400 text-lg">Your hackathon evaluation workspace</p>
                    </div>
                    <button
                        onClick={onCreateProject}
                        className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all flex items-center gap-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.6)] active:scale-95 duration-300"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Project</span>
                    </button>
                </div>

                {/* Filters & Controls */}
                <div className="sticky top-20 z-30 bg-[#050505]/95 backdrop-blur-sm py-4 mb-2 -mx-2 px-2 transition-all">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative flex-1 w-full sm:max-w-md group">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="Search your projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:bg-white/[0.08] focus:border-white/20 transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <div className="flex items-center gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-xl">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Projects Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                ) : filteredProjects.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02] mt-8 animate-fade-in">
                        <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10">
                            <Folder className="w-10 h-10 text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No projects found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-8">
                            {searchQuery ? "Try adjusting your search terms." : "Create your first project to get started."}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={onCreateProject}
                                className="text-white hover:text-gray-300 font-medium text-sm border-b border-white/30 hover:border-white transition-all pb-0.5"
                            >
                                Create a project now
                            </button>
                        )}
                    </div>
                ) : (
                    /* Project Cards */
                    <div className={`mt-6 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}`}>
                        {filteredProjects.map((project, idx) => (
                            <div
                                key={project.project_id}
                                className={`group bg-[#0A0A0A] border border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer relative overflow-hidden ${viewMode === 'grid' ? 'rounded-3xl p-6 flex flex-col h-full hover:shadow-2xl hover:shadow-white/[0.02] hover:-translate-y-1' : 'rounded-2xl p-4 flex items-center gap-6 hover:translate-x-1'
                                    }`}
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className={`flex justify-between items-start ${viewMode === 'grid' ? 'mb-8' : 'flex-1 mb-0'}`}>
                                    <div>
                                        <h3 className="text-lg font-bold truncate pr-4 text-gray-100 group-hover:text-white transition-colors">{project.project_name}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${project.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                project.status === 'active' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                    'bg-gray-500/10 text-gray-400 border border-white/10'
                                                }`}>
                                                {project.status}
                                            </div>
                                            <span className="text-xs text-gray-600">•</span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(project.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    {viewMode === 'grid' && (
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -mr-2 -mt-2 transform translate-x-2 group-hover:translate-x-0">
                                            <ChevronRight className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>

                                <div className={`${viewMode === 'grid' ? 'mt-auto' : 'w-48 hidden md:block'}`}>
                                    <div className="flex items-center justify-between text-xs mb-2">
                                        <span className="text-gray-500 font-medium">Progress</span>
                                        <span className="font-mono text-gray-400">{project.total_submissions || 0} / {project.max_submissions_allowed}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white transition-all duration-1000 ease-out"
                                            style={{ width: `${(project.total_submissions / project.max_submissions_allowed) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Profile Modal */}
            {isProfileModalOpen && (
                <ProfileModal
                    user={user}
                    onClose={() => setIsProfileModalOpen(false)}
                    onUpdate={handleProfileUpdate}
                />
            )}
        </div>
    );
};

export default Homepage;
