
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
