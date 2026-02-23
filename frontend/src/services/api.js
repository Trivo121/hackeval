
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

export const syncUser = async (token) => {
    try {
        const response = await fetch(`${API_URL}/auth/sync`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Sync failed');
        }

        return await response.json();
    } catch (error) {
        console.error("Backend Sync Error:", error);
        throw error;
    }
};

export const updateProfile = async (token, updates) => {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Update failed');
        }


        return await response.json();
    } catch (error) {
        console.error("Profile Update Error:", error);
        throw error;
    }
};

export const getProjects = async (token) => {
    try {
        const response = await fetch(`${API_URL}/projects`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch projects');
        }

        return await response.json();
    } catch (error) {
        console.error("Get Projects Error:", error);
        throw error;
    }
};

export const createProject = async (token, projectData) => {
    try {
        const response = await fetch(`${API_URL}/projects/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create project');
        }


        return await response.json();
    } catch (error) {
        console.error("Create Project Error:", error);
        throw error;
    }
};

export const scanDrive = async (token, folderId) => {
    try {
        const response = await fetch(`${API_URL}/projects/scan-drive/${folderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to scan drive');
        }

        return await response.json();
    } catch (error) {
        console.error("Scan Drive Error:", error);
        throw error;
    }
};

export const startScan = async (token, projectId) => {
    const response = await fetch(`${API_URL}/projects/${projectId}/start-scan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to scan submissions');
    }
    return await response.json();
};

export const startProcessing = async (token, projectId) => {
    const response = await fetch(`${API_URL}/projects/${projectId}/start-processing`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start processing');
    }
    return await response.json();
};

export const getProjectDetails = async (token, projectId) => {
    const response = await fetch(`${API_URL}/projects/${projectId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch project details');
    }
    return await response.json();
};

export const reEvaluate = async (token, projectId) => {
    // Reset all failed/completed submissions to pending, then restart processing
    await fetch(`${API_URL}/projects/${projectId}/reset-submissions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return await startProcessing(token, projectId);
};
