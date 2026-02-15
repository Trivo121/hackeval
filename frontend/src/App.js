import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import Homepage from './pages/Homepage'; // This will be the new Dashboard
import CreateProjectPage from './pages/CreateProject';

import ProcessingPage from './pages/Processing';
import LoginPage from './pages/Login';
import { supabase } from './services/auth';
import { syncUser } from './services/api';

function App() {
    const [currentPage, setCurrentPage] = useState('landing');
    const [user, setUser] = useState(null);

    // ... (useEffect remains unchanged) ...
    useEffect(() => {
        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // User logged in! Sync with backend
                try {
                    console.log("Syncing user with backend...");
                    await syncUser(session.access_token);
                    setUser(session.user);
                    // Redirect to Dashboard (Homepage) instead of Create Project
                    setCurrentPage('home');
                } catch (error) {
                    console.error("Sync failed:", error);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setCurrentPage('landing');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    return (
        <div className="App">
            {currentPage === 'landing' && !user && (
                <LandingPage
                    onNavigate={() => setCurrentPage('login')}
                    onLoginClick={() => setCurrentPage('login')}
                />
            )}

            {/* If user is logged in, 'home' is the Dashboard (Homepage.js) */}
            {currentPage === 'home' && user && (
                <Homepage
                    user={user}
                    onCreateProject={() => setCurrentPage('create-project')}
                    onSignOut={() => supabase.auth.signOut()}
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
