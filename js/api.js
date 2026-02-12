/**
 * Fantasy Map Builder - API Client
 * Handles communication with the backend server
 */

const API = {
    // Base URL - change this if server is on different host
    baseUrl: '/api',

    // Callback for auth errors
    onAuthError: null,

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, {
                ...config,
                credentials: 'include' // Include cookies for session
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));

                // Handle auth errors
                if (response.status === 401 && this.onAuthError) {
                    this.onAuthError();
                }

                throw new Error(error.error || error.message || 'Request failed');
            }

            return await response.json();
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // ============================================
    // AUTHENTICATION
    // ============================================

    async getAuthStatus() {
        return this.request('/auth/status');
    },

    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { username, password }
        });
    },

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    },

    async register(username, password, displayName) {
        return this.request('/auth/register', {
            method: 'POST',
            body: {
                username,
                password,
                display_name: displayName
            }
        });
    },

    async changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: {
                current_password: currentPassword,
                new_password: newPassword
            }
        });
    },

    // ============================================
    // WORLDS
    // ============================================

    async getWorlds() {
        return this.request('/worlds');
    },

    async getWorld(id) {
        return this.request(`/worlds/${id}`);
    },

    async createWorld(data) {
        return this.request('/worlds', {
            method: 'POST',
            body: data
        });
    },

    async updateWorld(id, data) {
        return this.request(`/worlds/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    async deleteWorld(id) {
        return this.request(`/worlds/${id}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // MAPS
    // ============================================

    async getMaps(worldId) {
        return this.request(`/worlds/${worldId}/maps`);
    },

    async getMap(id) {
        return this.request(`/maps/${id}`);
    },

    async createMap(worldId, data) {
        return this.request(`/worlds/${worldId}/maps`, {
            method: 'POST',
            body: data
        });
    },

    async updateMap(id, data) {
        return this.request(`/maps/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    async deleteMap(id) {
        return this.request(`/maps/${id}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // LOCATIONS
    // ============================================

    async getLocations(mapId) {
        return this.request(`/maps/${mapId}/locations`);
    },

    async getLocation(id) {
        return this.request(`/locations/${id}`);
    },

    async createLocation(mapId, data) {
        return this.request(`/maps/${mapId}/locations`, {
            method: 'POST',
            body: data
        });
    },

    async updateLocation(id, data) {
        return this.request(`/locations/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    async deleteLocation(id) {
        return this.request(`/locations/${id}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // CUSTOM STAMPS
    // ============================================

    async getCustomStamps(worldId) {
        return this.request(`/worlds/${worldId}/stamps`);
    },

    async createCustomStamp(worldId, data) {
        return this.request(`/worlds/${worldId}/stamps`, {
            method: 'POST',
            body: data
        });
    },

    async deleteCustomStamp(id) {
        return this.request(`/stamps/${id}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // TRAVEL SETTINGS
    // ============================================

    async getTravelSettings(worldId) {
        return this.request(`/worlds/${worldId}/travel-settings`);
    },

    async updateTravelSettings(worldId, data) {
        return this.request(`/worlds/${worldId}/travel-settings`, {
            method: 'PUT',
            body: data
        });
    },

    // ============================================
    // EXPORT/IMPORT
    // ============================================

    async exportWorld(worldId) {
        return this.request(`/worlds/${worldId}/export`);
    },

    async importWorld(data) {
        return this.request('/import', {
            method: 'POST',
            body: data
        });
    }
};
