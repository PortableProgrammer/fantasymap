/**
 * Fantasy Map Builder - Markers Module
 * Handles location markers/stamps on the map
 */

const MarkersModule = {
    // All locations stored here
    locations: [],

    // Currently selected location
    selectedLocation: null,

    // Leaflet markers map (id -> marker)
    leafletMarkers: {},

    // Event callbacks
    onLocationSelect: null,
    onLocationUpdate: null,

    /**
     * Initialize markers module
     */
    init() {
        // Don't auto-load from localStorage - will be loaded from API
        this.locations = [];
        this.leafletMarkers = {};
        this.selectedLocation = null;
    },

    /**
     * Load locations from API response
     */
    loadLocations(locations) {
        this.clearAll();
        this.locations = locations.map(loc => ({
            ...loc,
            // Normalize field names for compatibility
            stampId: loc.stamp_id || loc.stampId,
            wikiLink: loc.wiki_link || loc.wikiLink
        }));
        this.renderAllMarkers();
    },

    /**
     * Add a location from API response
     */
    addLocationFromAPI(location) {
        const normalizedLoc = {
            ...location,
            stampId: location.stamp_id || location.stampId,
            wikiLink: location.wiki_link || location.wikiLink
        };
        this.locations.push(normalizedLoc);
        this.renderMarker(normalizedLoc);
        return normalizedLoc;
    },

    /**
     * Update a location from API response
     */
    updateLocationFromAPI(location) {
        const index = this.locations.findIndex(loc => loc.id === location.id);
        if (index === -1) return null;

        const normalizedLoc = {
            ...location,
            stampId: location.stamp_id || location.stampId,
            wikiLink: location.wiki_link || location.wikiLink
        };

        this.locations[index] = normalizedLoc;
        this.updateMarker(normalizedLoc);

        if (this.onLocationUpdate) {
            this.onLocationUpdate(normalizedLoc);
        }

        return normalizedLoc;
    },

    /**
     * Remove a location by ID
     */
    removeLocation(id) {
        const index = this.locations.findIndex(loc => loc.id === id);
        if (index === -1) return;

        this.locations.splice(index, 1);

        if (this.leafletMarkers[id]) {
            MapModule.markersLayer.removeLayer(this.leafletMarkers[id]);
            delete this.leafletMarkers[id];
        }

        if (this.selectedLocation && this.selectedLocation.id === id) {
            this.selectedLocation = null;
        }
    },

    /**
     * Add a new location
     * @param {Object} data - Location data
     * @returns {Object} The created location
     */
    addLocation(data) {
        const location = {
            id: 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: data.name || 'New Location',
            description: data.description || '',
            wikiLink: data.wikiLink || '',
            notes: data.notes || '',
            stampId: data.stampId || 'pin',
            x: data.x,
            y: data.y,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.locations.push(location);
        this.saveLocations();
        this.renderMarker(location);

        return location;
    },

    /**
     * Update a location
     * @param {string} id - Location ID
     * @param {Object} data - Updated data
     * @returns {Object} The updated location
     */
    updateLocation(id, data) {
        const index = this.locations.findIndex(loc => loc.id === id);
        if (index === -1) return null;

        const location = this.locations[index];
        Object.assign(location, data, { updatedAt: Date.now() });

        this.saveLocations();
        this.updateMarker(location);

        if (this.onLocationUpdate) {
            this.onLocationUpdate(location);
        }

        return location;
    },

    /**
     * Delete a location
     * @param {string} id - Location ID
     */
    deleteLocation(id) {
        const index = this.locations.findIndex(loc => loc.id === id);
        if (index === -1) return;

        this.locations.splice(index, 1);
        this.saveLocations();

        // Remove marker
        if (this.leafletMarkers[id]) {
            MapModule.markersLayer.removeLayer(this.leafletMarkers[id]);
            delete this.leafletMarkers[id];
        }

        if (this.selectedLocation && this.selectedLocation.id === id) {
            this.selectedLocation = null;
        }
    },

    /**
     * Get a location by ID
     * @param {string} id - Location ID
     * @returns {Object} The location
     */
    getLocation(id) {
        return this.locations.find(loc => loc.id === id);
    },

    /**
     * Get all locations
     * @returns {Array} All locations
     */
    getAllLocations() {
        return this.locations;
    },

    /**
     * Create a Leaflet marker for a location
     * @param {Object} location - Location data
     * @returns {L.Marker}
     */
    createMarker(location) {
        const stampId = location.stamp_id || location.stampId;
        const stamp = StampManager.getStamp(stampId);
        const icon = stamp ? stamp.icon : '📍';

        const marker = L.marker(MapModule.coordsToLatLng(location.x, location.y), {
            icon: L.divIcon({
                className: 'leaflet-div-icon',
                html: `<div class="custom-marker" data-id="${location.id}">${icon}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            }),
            draggable: true
        });

        // Click handler
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.selectLocation(location.id);
        });

        // Drag handler
        marker.on('dragend', (e) => {
            const newLatLng = e.target.getLatLng();
            this.updateLocation(location.id, {
                x: newLatLng.lng,
                y: newLatLng.lat
            });
        });

        // Tooltip
        if (location.name) {
            marker.bindTooltip(location.name, {
                permanent: false,
                direction: 'top',
                offset: [0, -20]
            });
        }

        return marker;
    },

    /**
     * Render a marker on the map
     * @param {Object} location - Location data
     */
    renderMarker(location) {
        if (this.leafletMarkers[location.id]) {
            MapModule.markersLayer.removeLayer(this.leafletMarkers[location.id]);
        }

        const marker = this.createMarker(location);
        marker.addTo(MapModule.markersLayer);
        this.leafletMarkers[location.id] = marker;
    },

    /**
     * Update a marker
     * @param {Object} location - Location data
     */
    updateMarker(location) {
        this.renderMarker(location);
    },

    /**
     * Render all markers
     */
    renderAllMarkers() {
        MapModule.markersLayer.clearLayers();
        this.leafletMarkers = {};

        for (const location of this.locations) {
            this.renderMarker(location);
        }
    },

    /**
     * Select a location
     * @param {string} id - Location ID
     */
    selectLocation(id) {
        // Deselect previous
        if (this.selectedLocation) {
            const prevMarkerEl = document.querySelector(`.custom-marker[data-id="${this.selectedLocation.id}"]`);
            if (prevMarkerEl) {
                prevMarkerEl.classList.remove('selected');
            }
        }

        const location = this.getLocation(id);
        if (!location) return;

        this.selectedLocation = location;

        // Highlight marker
        const markerEl = document.querySelector(`.custom-marker[data-id="${id}"]`);
        if (markerEl) {
            markerEl.classList.add('selected');
        }

        // Callback
        if (this.onLocationSelect) {
            this.onLocationSelect(location);
        }
    },

    /**
     * Deselect all locations
     */
    deselectAll() {
        if (this.selectedLocation) {
            const markerEl = document.querySelector(`.custom-marker[data-id="${this.selectedLocation.id}"]`);
            if (markerEl) {
                markerEl.classList.remove('selected');
            }
        }
        this.selectedLocation = null;
    },

    /**
     * Pan to a location
     * @param {string} id - Location ID
     */
    panToLocation(id) {
        const location = this.getLocation(id);
        if (!location) return;

        MapModule.map.setView(MapModule.coordsToLatLng(location.x, location.y), 1);
    },

    /**
     * Search locations by name
     * @param {string} query - Search query
     * @returns {Array} Matching locations
     */
    searchLocations(query) {
        if (!query) return this.locations;

        const lowerQuery = query.toLowerCase();
        return this.locations.filter(loc =>
            loc.name.toLowerCase().includes(lowerQuery) ||
            loc.description.toLowerCase().includes(lowerQuery) ||
            loc.notes.toLowerCase().includes(lowerQuery)
        );
    },

    /**
     * Get locations by stamp type
     * @param {string} stampId - Stamp ID
     * @returns {Array} Matching locations
     */
    getLocationsByStamp(stampId) {
        return this.locations.filter(loc => loc.stampId === stampId);
    },

    /**
     * Clear all locations
     */
    clearAll() {
        this.locations = [];
        this.leafletMarkers = {};
        this.selectedLocation = null;
        MapModule.markersLayer.clearLayers();
        localStorage.removeItem('fantasymap_locations');
    },

    /**
     * Export locations
     * @returns {Array} Locations data
     */
    exportLocations() {
        return JSON.parse(JSON.stringify(this.locations));
    },

    /**
     * Import locations
     * @param {Array} locations - Locations to import
     * @param {boolean} replace - Whether to replace existing locations
     */
    importLocations(locations, replace = false) {
        if (replace) {
            this.clearAll();
        }

        for (const loc of locations) {
            // Generate new ID to avoid conflicts
            const newLoc = {
                ...loc,
                id: 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            this.locations.push(newLoc);
        }

        this.saveLocations();
        this.renderAllMarkers();
    }
};
