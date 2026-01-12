import React, { useState } from 'react';
import Homepage from './pages/Homepage';
import CreateProjectPage from './pages/CreateProject';
import ProcessingPage from './pages/Processing';
import LoginPage from './pages/Login';

function App() {
    const [currentPage, setCurrentPage] = useState('home');

    return (
        <div className="App">
            {currentPage === 'home' && (
                <Homepage
                    onNavigate={() => setCurrentPage('create-project')}
                    onLoginClick={() => setCurrentPage('login')}
                />
            )}
            {currentPage === 'login' && (
                <LoginPage
                    onLogin={() => setCurrentPage('create-project')}
                    onNavigateBack={() => setCurrentPage('home')}
                />
            )}
            {currentPage === 'create-project' && (
                <CreateProjectPage
                    onBack={() => setCurrentPage('home')}
                    onLaunch={() => setCurrentPage('processing')}
                />
            )}
            {currentPage === 'processing' && (
                <ProcessingPage onComplete={() => setCurrentPage('home')} />
            )}
        </div>
    );
}

export default App;
