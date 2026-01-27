/**
 * Fantasy Map Builder - Main Application
 * Initializes and coordinates all modules
 */

const App = {
    // Current tool mode
    currentTool: 'select',

    // Selected stamp for placing
    selectedStamp: null,

    // UI Elements
    elements: {},

    /**
     * Initialize the application
     */
    init() {
        // Cache DOM elements
        this.cacheElements();

        // Initialize modules
        StampManager.init();
        TravelCalculator.init();
        MapModule.init();
        MarkersModule.init();

        // Setup event listeners
        this.setupToolbar();
        this.setupSidebar();
        this.setupModals();
        this.setupMapInteraction();
        this.setupFileHandlers();

        // Setup marker callbacks
        MarkersModule.onLocationSelect = (location) => this.showLocationDetails(location);
        MarkersModule.onLocationUpdate = (location) => this.showLocationDetails(location);

        // Render initial stamp palette
        this.renderStampPalette();

        // Update scale UI
        this.updateScaleUI();

        console.log('Fantasy Map Builder initialized');
    },

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            // Tool buttons
            btnSelect: document.getElementById('btn-select'),
            btnStamp: document.getElementById('btn-stamp'),
            btnMeasure: document.getElementById('btn-measure'),
            btnRoute: document.getElementById('btn-route'),

            // Action buttons
            btnUploadMap: document.getElementById('btn-upload-map'),
            btnSave: document.getElementById('btn-save'),
            btnLoad: document.getElementById('btn-load'),
            btnExport: document.getElementById('btn-export'),

            // Sidebars
            stampPalette: document.getElementById('stamp-palette'),
            sidebarRight: document.getElementById('sidebar-right'),
            locationDetails: document.getElementById('location-details'),

            // Overlays
            scaleOverlay: document.getElementById('scale-overlay'),
            travelOverlay: document.getElementById('travel-overlay'),

            // Modals
            modalLocation: document.getElementById('modal-location'),
            modalCustomStamp: document.getElementById('modal-custom-stamp'),
            modalTravelSettings: document.getElementById('modal-travel-settings'),

            // File inputs
            fileMapUpload: document.getElementById('file-map-upload'),
            fileLoadProject: document.getElementById('file-load-project')
        };
    },

    /**
     * Setup toolbar event listeners
     */
    setupToolbar() {
        // Tool buttons
        this.elements.btnSelect.addEventListener('click', () => this.setTool('select'));
        this.elements.btnStamp.addEventListener('click', () => this.setTool('stamp'));
        this.elements.btnMeasure.addEventListener('click', () => this.setTool('measure'));
        this.elements.btnRoute.addEventListener('click', () => this.setTool('route'));

        // Action buttons
        this.elements.btnUploadMap.addEventListener('click', () => {
            this.elements.fileMapUpload.click();
        });

        this.elements.btnSave.addEventListener('click', () => this.saveProject());
        this.elements.btnLoad.addEventListener('click', () => {
            this.elements.fileLoadProject.click();
        });
        this.elements.btnExport.addEventListener('click', () => this.exportProject());
    },

    /**
     * Setup sidebar event listeners
     */
    setupSidebar() {
        // Add custom stamp button
        document.getElementById('btn-add-stamp-type').addEventListener('click', () => {
            this.showModal('modalCustomStamp');
        });

        // Close details button
        document.getElementById('btn-close-details').addEventListener('click', () => {
            this.hideLocationDetails();
        });

        // Close travel overlay
        document.getElementById('btn-close-travel').addEventListener('click', () => {
            MapModule.clearMeasurement();
            MapModule.clearRoute();
        });
    },

    /**
     * Setup modal event listeners
     */
    setupModals() {
        // Location modal
        document.getElementById('btn-modal-close').addEventListener('click', () => {
            this.hideModal('modalLocation');
        });

        document.getElementById('btn-save-location').addEventListener('click', () => {
            this.saveLocationFromModal();
        });

        document.getElementById('btn-delete-location').addEventListener('click', () => {
            this.deleteCurrentLocation();
        });

        // Custom stamp modal
        document.getElementById('btn-stamp-modal-close').addEventListener('click', () => {
            this.hideModal('modalCustomStamp');
        });

        document.getElementById('btn-add-custom-stamp').addEventListener('click', () => {
            this.addCustomStamp();
        });

        // Travel settings modal
        document.getElementById('btn-travel-modal-close')?.addEventListener('click', () => {
            this.hideModal('modalTravelSettings');
        });

        document.getElementById('btn-save-travel-settings')?.addEventListener('click', () => {
            this.saveTravelSettings();
        });

        // Scale settings
        document.getElementById('btn-set-scale').addEventListener('click', () => {
            this.setMapScale();
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    },

    /**
     * Setup map interaction
     */
    setupMapInteraction() {
        MapModule.map.on('click', (e) => {
            if (this.currentTool === 'stamp' && this.selectedStamp) {
                const coords = MapModule.screenToMapCoords(e);
                this.placeStamp(coords.x, coords.y);
            } else if (this.currentTool === 'select') {
                // Deselect when clicking empty space
                MarkersModule.deselectAll();
                this.hideLocationDetails();
            }
        });
    },

    /**
     * Setup file input handlers
     */
    setupFileHandlers() {
        // Map upload
        this.elements.fileMapUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                await MapModule.handleMapUpload(file);
                this.showNotification('Map uploaded successfully');
            } catch (err) {
                this.showNotification(err.message, 'error');
            }

            e.target.value = '';
        });

        // Project load
        this.elements.fileLoadProject.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                await StorageModule.loadFromFile(file);
                this.renderStampPalette();
                this.updateScaleUI();
                this.showNotification('Project loaded successfully');
            } catch (err) {
                this.showNotification(err.message, 'error');
            }

            e.target.value = '';
        });
    },

    /**
     * Set the current tool
     * @param {string} tool - Tool name
     */
    setTool(tool) {
        // Deactivate previous tool
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));

        // Stop any active modes
        MapModule.stopMeasuring();
        MapModule.stopRoutePlanning();

        // Activate new tool
        this.currentTool = tool;
        const toolBtn = document.getElementById(`btn-${tool}`);
        if (toolBtn) toolBtn.classList.add('active');

        // Update cursor and start tool mode
        switch (tool) {
            case 'select':
                MapModule.map.getContainer().style.cursor = '';
                MapModule.clearMeasurement();
                MapModule.clearRoute();
                break;
            case 'stamp':
                MapModule.map.getContainer().style.cursor = 'crosshair';
                if (!this.selectedStamp) {
                    this.showNotification('Select a stamp from the left panel');
                }
                break;
            case 'measure':
                MapModule.startMeasuring();
                this.showNotification('Click two points to measure distance');
                break;
            case 'route':
                MapModule.startRoutePlanning();
                this.showNotification('Click points to create a route. Click another tool to finish.');
                break;
        }
    },

    /**
     * Render stamp palette in sidebar
     */
    renderStampPalette() {
        StampManager.renderPalette(this.elements.stampPalette, (stamp) => {
            this.selectStamp(stamp);
        });
    },

    /**
     * Select a stamp for placing
     * @param {Object} stamp - Stamp object
     */
    selectStamp(stamp) {
        this.selectedStamp = stamp;

        // Update UI
        document.querySelectorAll('.stamp-item').forEach(el => el.classList.remove('selected'));
        const stampEl = document.querySelector(`.stamp-item[data-stamp-id="${stamp.id}"]`);
        if (stampEl) stampEl.classList.add('selected');

        // Auto-switch to stamp tool
        if (this.currentTool !== 'stamp') {
            this.setTool('stamp');
        }
    },

    /**
     * Place a stamp on the map
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    placeStamp(x, y) {
        if (!this.selectedStamp) return;

        const location = MarkersModule.addLocation({
            x,
            y,
            stampId: this.selectedStamp.id,
            name: this.selectedStamp.name
        });

        // Open edit modal for the new location
        this.editLocation(location);
    },

    /**
     * Show location details in sidebar
     * @param {Object} location - Location object
     */
    showLocationDetails(location) {
        const stamp = StampManager.getStamp(location.stampId);
        const icon = stamp ? stamp.icon : '📍';

        let html = `
            <div class="location-card">
                <div class="location-card-header">
                    <span class="location-card-icon">${icon}</span>
                    <span class="location-card-title">${location.name || 'Unnamed Location'}</span>
                </div>
        `;

        if (location.description) {
            html += `<p class="location-card-description">${location.description}</p>`;
        }

        if (location.wikiLink) {
            html += `
                <a href="${location.wikiLink}" target="_blank" class="location-card-wiki">
                    <span class="wiki-icon">📖</span>
                    <span>Open Wiki Page</span>
                </a>
            `;
        }

        if (location.notes) {
            html += `<div class="location-card-notes">${location.notes}</div>`;
        }

        html += `
                <div class="location-card-actions">
                    <button class="small-btn" onclick="App.editLocation(MarkersModule.getLocation('${location.id}'))">Edit</button>
                    <button class="small-btn" onclick="App.panToLocation('${location.id}')">Pan To</button>
                </div>
            </div>
        `;

        this.elements.locationDetails.innerHTML = html;
        this.elements.sidebarRight.classList.add('open');
    },

    /**
     * Hide location details
     */
    hideLocationDetails() {
        this.elements.locationDetails.innerHTML = '<p class="placeholder-text">Click on a marker to view details</p>';
        MarkersModule.deselectAll();
    },

    /**
     * Edit a location (open modal)
     * @param {Object} location - Location object
     */
    editLocation(location) {
        // Populate modal fields
        document.getElementById('modal-title').textContent = location.name ? 'Edit Location' : 'New Location';
        document.getElementById('location-name').value = location.name || '';
        document.getElementById('location-description').value = location.description || '';
        document.getElementById('location-wiki').value = location.wikiLink || '';
        document.getElementById('location-notes').value = location.notes || '';

        // Render stamp selector
        StampManager.renderSelector(
            document.getElementById('stamp-selector'),
            location.stampId,
            (stamp) => {
                this.editingLocationStamp = stamp.id;
            }
        );
        this.editingLocationStamp = location.stampId;

        // Store reference to editing location
        this.editingLocation = location;

        this.showModal('modalLocation');
    },

    /**
     * Save location from modal
     */
    saveLocationFromModal() {
        if (!this.editingLocation) return;

        MarkersModule.updateLocation(this.editingLocation.id, {
            name: document.getElementById('location-name').value,
            description: document.getElementById('location-description').value,
            wikiLink: document.getElementById('location-wiki').value,
            notes: document.getElementById('location-notes').value,
            stampId: this.editingLocationStamp
        });

        this.hideModal('modalLocation');
        this.showNotification('Location saved');
    },

    /**
     * Delete current location
     */
    deleteCurrentLocation() {
        if (!this.editingLocation) return;

        if (confirm('Delete this location?')) {
            MarkersModule.deleteLocation(this.editingLocation.id);
            this.hideModal('modalLocation');
            this.hideLocationDetails();
            this.showNotification('Location deleted');
        }
    },

    /**
     * Pan to a location
     * @param {string} id - Location ID
     */
    panToLocation(id) {
        MarkersModule.panToLocation(id);
    },

    /**
     * Add custom stamp
     */
    addCustomStamp() {
        const emoji = document.getElementById('stamp-emoji').value;
        const name = document.getElementById('stamp-name').value;
        const category = document.getElementById('stamp-category').value;

        if (!emoji || !name) {
            this.showNotification('Please enter emoji and name', 'error');
            return;
        }

        StampManager.addCustomStamp(emoji, name, category);
        this.renderStampPalette();
        this.hideModal('modalCustomStamp');

        // Clear form
        document.getElementById('stamp-emoji').value = '';
        document.getElementById('stamp-name').value = '';

        this.showNotification('Custom stamp added');
    },

    /**
     * Set map scale
     */
    setMapScale() {
        const value = parseFloat(document.getElementById('scale-value').value) || 1;
        const unit = document.getElementById('scale-unit').value;

        TravelCalculator.setScale(value, unit);
        this.showNotification(`Scale set to ${value} ${unit} per pixel`);
    },

    /**
     * Update scale UI from settings
     */
    updateScaleUI() {
        const settings = TravelCalculator.getSettings();
        document.getElementById('scale-value').value = settings.scale.pixelsPerUnit;
        document.getElementById('scale-unit').value = settings.scale.unit;
    },

    /**
     * Save travel settings
     */
    saveTravelSettings() {
        TravelCalculator.setSpeed('walking', parseFloat(document.getElementById('speed-walking').value));
        TravelCalculator.setSpeed('horse', parseFloat(document.getElementById('speed-horse').value));
        TravelCalculator.setSpeed('wagon', parseFloat(document.getElementById('speed-wagon').value));
        TravelCalculator.setHoursPerDay(parseInt(document.getElementById('hours-per-day').value));

        this.hideModal('modalTravelSettings');
        this.showNotification('Travel settings saved');
    },

    /**
     * Save project
     */
    saveProject() {
        StorageModule.saveToLocalStorage();
        this.showNotification('Project saved to browser storage');
    },

    /**
     * Export project
     */
    exportProject() {
        StorageModule.downloadProject();
        this.showNotification('Project exported');
    },

    /**
     * Show a modal
     * @param {string} modalKey - Modal element key
     */
    showModal(modalKey) {
        const modal = this.elements[modalKey];
        if (modal) modal.style.display = 'flex';
    },

    /**
     * Hide a modal
     * @param {string} modalKey - Modal element key
     */
    hideModal(modalKey) {
        const modal = this.elements[modalKey];
        if (modal) modal.style.display = 'none';
    },

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error)
     */
    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : '#4ade80'};
            color: ${type === 'error' ? 'white' : '#1a1a2e'};
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 3000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after delay
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
