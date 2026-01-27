/**
 * Fantasy Map Builder - Storage Module
 * Handles saving, loading, and exporting project data
 */

const StorageModule = {
    /**
     * Save current project to localStorage
     */
    saveToLocalStorage() {
        // Individual modules already save to localStorage
        // This is for explicit "Save" action confirmation
        const projectMeta = {
            savedAt: Date.now(),
            version: '1.0.0'
        };
        localStorage.setItem('fantasymap_meta', JSON.stringify(projectMeta));
        return true;
    },

    /**
     * Export project as JSON
     * @returns {Object} Project data
     */
    exportProject() {
        // Get map image
        const mapImageData = localStorage.getItem('fantasymap_mapimage');
        const mapImage = mapImageData ? JSON.parse(mapImageData) : null;

        // Get locations
        const locations = MarkersModule.exportLocations();

        // Get travel settings
        const travelSettings = TravelCalculator.getSettings();

        // Get custom stamps
        const stamps = StampManager.getAllStamps();

        return {
            version: '1.0.0',
            exportedAt: Date.now(),
            mapImage: mapImage,
            locations: locations,
            travelSettings: travelSettings,
            stamps: stamps
        };
    },

    /**
     * Export project as JSON file (triggers download)
     * @param {string} filename - Optional filename
     */
    downloadProject(filename = 'fantasy-map-project.json') {
        const data = this.exportProject();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Import project from JSON
     * @param {Object} data - Project data
     * @param {boolean} replace - Whether to replace existing data
     */
    importProject(data, replace = true) {
        if (!data || !data.version) {
            throw new Error('Invalid project file');
        }

        // Import map image
        if (data.mapImage && replace) {
            localStorage.setItem('fantasymap_mapimage', JSON.stringify(data.mapImage));
            MapModule.loadMapImage(
                data.mapImage.imageUrl,
                data.mapImage.width,
                data.mapImage.height
            );
        }

        // Import locations
        if (data.locations) {
            MarkersModule.importLocations(data.locations, replace);
        }

        // Import travel settings
        if (data.travelSettings && replace) {
            TravelCalculator.speeds = data.travelSettings.speeds;
            TravelCalculator.hoursPerDay = data.travelSettings.hoursPerDay;
            TravelCalculator.scale = data.travelSettings.scale;
            TravelCalculator.saveSettings();
        }

        // Import stamps
        if (data.stamps && replace) {
            StampManager.stamps = data.stamps;
            StampManager.saveStamps();
        }

        return true;
    },

    /**
     * Load project from file
     * @param {File} file - JSON file
     * @returns {Promise}
     */
    loadFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file.name.endsWith('.json')) {
                reject(new Error('Please select a JSON file'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.importProject(data, true);
                    resolve(data);
                } catch (err) {
                    reject(new Error('Failed to parse project file: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },

    /**
     * Check if there's existing project data
     * @returns {boolean}
     */
    hasExistingData() {
        return !!(
            localStorage.getItem('fantasymap_mapimage') ||
            localStorage.getItem('fantasymap_locations')
        );
    },

    /**
     * Clear all project data
     */
    clearAllData() {
        localStorage.removeItem('fantasymap_meta');
        localStorage.removeItem('fantasymap_mapimage');
        localStorage.removeItem('fantasymap_locations');
        localStorage.removeItem('fantasymap_travel');
        localStorage.removeItem('fantasymap_stamps');

        // Reinitialize modules
        StampManager.init();
        TravelCalculator.init();
        MapModule.clearMap();
        MarkersModule.clearAll();
    },

    /**
     * Get project metadata
     * @returns {Object|null}
     */
    getProjectMeta() {
        const meta = localStorage.getItem('fantasymap_meta');
        return meta ? JSON.parse(meta) : null;
    },

    /**
     * Export locations only (for wiki integration)
     * @returns {string} CSV format
     */
    exportLocationsAsCSV() {
        const locations = MarkersModule.getAllLocations();
        const headers = ['Name', 'Description', 'Wiki Link', 'Notes', 'Stamp', 'X', 'Y'];
        const rows = locations.map(loc => {
            const stamp = StampManager.getStamp(loc.stampId);
            return [
                `"${(loc.name || '').replace(/"/g, '""')}"`,
                `"${(loc.description || '').replace(/"/g, '""')}"`,
                `"${(loc.wikiLink || '').replace(/"/g, '""')}"`,
                `"${(loc.notes || '').replace(/"/g, '""')}"`,
                stamp ? stamp.name : loc.stampId,
                loc.x,
                loc.y
            ].join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    },

    /**
     * Download locations as CSV
     */
    downloadLocationsCSV(filename = 'map-locations.csv') {
        const csv = this.exportLocationsAsCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
