import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import Homepage from './pages/Homepage';
import CreateProjectPage from './pages/CreateProject';
import ProjectDetail from './pages/ProjectDetail';
import ProcessingPage from './pages/Processing';
import LoginPage from './pages/Login';
import PendingAccess from './pages/PendingAccess';
import { supabase } from './services/auth';
import { syncUser } from './services/api';

function App() {
    const [currentPage, setCurrentPage] = useState('landing');
    const [user, setUser] = useState(null);
    const [dbUser, setDbUser] = useState(null); // To store DB profile with access_status
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [authReady, setAuthReady] = useState(false); // ← blocks render until session checked

    // Check for existing session on mount (handles Google OAuth redirect back to app)
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setUser(session.user);
                    try {
                        const synced = await syncUser(session.access_token);
                        setDbUser(synced);
                        if (synced?.access_status === 'pending') {
                            setCurrentPage('pending');
                        } else {
                            setCurrentPage('home');
                        }
                    } catch (e) {
                        console.error("Background sync failed:", e);
                        setCurrentPage('home'); // fallback
                    }
                }
            } catch (e) {
                console.error("Session check error:", e);
            } finally {
                setAuthReady(true); // Always unblock
            }
        };
        checkSession();
    }, []);

    // Listen for auth changes (sign-in, sign-out events)
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                setUser(session.user);
                try {
                    const synced = await syncUser(session.access_token);
                    setDbUser(synced);
                    if (synced?.access_status === 'pending') {
                        setCurrentPage('pending');
                    } else {
                        setCurrentPage('home');
                    }
                } catch (e) {
                    console.error("Sync failed:", e);
                    setCurrentPage('home'); // fallback
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setDbUser(null);
                setCurrentPage('landing');
            }
        });
        return () => authListener.subscription.unsubscribe();
    }, []);

    // Don't render anything until we know the auth state
    if (!authReady) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="App">
            {currentPage === 'landing' && !user && (
                <LandingPage
                    onNavigate={() => setCurrentPage('login')}
                    onLoginClick={() => setCurrentPage('login')}
                />
            )}

            {currentPage === 'pending' && user && (
                <PendingAccess 
                    user={user} 
                    onSignOut={() => supabase.auth.signOut()} 
                />
            )}

            {currentPage === 'home' && user && dbUser?.access_status !== 'pending' && (
                <Homepage
                    user={user}
                    onCreateProject={() => setCurrentPage('create-project')}
                    onSignOut={() => supabase.auth.signOut()}
                    onOpenProject={(id) => { setSelectedProjectId(id); setCurrentPage('project-detail'); }}
                />
            )}

            {currentPage === 'project-detail' && user && selectedProjectId && (
                <ProjectDetail
                    projectId={selectedProjectId}
                    onBack={() => setCurrentPage('home')}
                    onReEvaluate={() => setCurrentPage('processing')}
                />
            )}

            {currentPage === 'login' && (
                <LoginPage
                    onLogin={() => { /* Handled by auth listener */ }}
                    onNavigateBack={() => setCurrentPage('landing')}
                />
            )}
            {currentPage === 'create-project' && user && (
                <CreateProjectPage
                    onBack={() => setCurrentPage('home')}
                    onLaunch={() => setCurrentPage('processing')}
                    user={user}
                />
            )}
            {currentPage === 'processing' && user && (
                <ProcessingPage onComplete={() => setCurrentPage('home')} />
            )}
        </div>
    );
}

export default App;
