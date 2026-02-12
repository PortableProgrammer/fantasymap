/**
 * Fantasy Map Builder - Main Application
 * Initializes and coordinates all modules with database backend
 */

const App = {
    // Current state
    currentTool: 'select',
    selectedStamp: null,
    currentWorld: null,
    currentMap: null,
    currentUser: null,
    isSetupMode: false,

    // UI Elements
    elements: {},

    // Pending map image for new map creation
    pendingMapImage: null,

    /**
     * Initialize the application
     */
    async init() {
        // Cache DOM elements
        this.cacheElements();

        // Setup API auth error handler
        API.onAuthError = () => this.showAuthModal(false);

        // Check authentication status first
        const authStatus = await this.checkAuth();
        if (!authStatus.authenticated) {
            // Show login or setup modal
            this.showAuthModal(authStatus.needsSetup);
            return; // Don't initialize rest of app until authenticated
        }

        // User is authenticated, continue initialization
        this.initializeApp();
    },

    /**
     * Initialize the app after authentication
     */
    initializeApp() {
        // Initialize modules (without loading from localStorage)
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
        this.setupWorldMapSelectors();
        this.setupAuth();

        // Setup marker callbacks
        MarkersModule.onLocationSelect = (location) => this.showLocationDetails(location);
        MarkersModule.onLocationUpdate = (location) => this.showLocationDetails(location);

        // Render initial stamp palette
        this.renderStampPalette();

        // Load worlds from database
        this.loadWorlds();

        // Update user info display
        this.updateUserDisplay();

        console.log('Fantasy Map Builder initialized with database backend');
    },

    /**
     * Check authentication status
     */
    async checkAuth() {
        try {
            const status = await API.getAuthStatus();
            this.currentUser = status.user;
            return status;
        } catch (err) {
            console.error('Auth check failed:', err);
            return { authenticated: false, needsSetup: true };
        }
    },

    /**
     * Show authentication modal
     */
    showAuthModal(isSetup) {
        this.isSetupMode = isSetup;
        const modal = this.elements.modalAuth;
        const title = document.getElementById('modal-auth-title');
        const message = document.getElementById('auth-message');
        const confirmGroup = document.getElementById('auth-confirm-group');
        const displayNameGroup = document.getElementById('auth-display-name-group');
        const submitBtn = document.getElementById('btn-auth-submit');
        const errorEl = document.getElementById('auth-error');

        // Clear form
        document.getElementById('auth-username').value = '';
        document.getElementById('auth-password').value = '';
        document.getElementById('auth-password-confirm').value = '';
        document.getElementById('auth-display-name').value = '';
        errorEl.textContent = '';

        if (isSetup) {
            title.textContent = 'Create Admin Account';
            message.textContent = 'Welcome! Create your admin account to get started.';
            confirmGroup.style.display = 'block';
            displayNameGroup.style.display = 'block';
            submitBtn.textContent = 'Create Account';
        } else {
            title.textContent = 'Login';
            message.textContent = 'Please log in to continue.';
            confirmGroup.style.display = 'none';
            displayNameGroup.style.display = 'none';
            submitBtn.textContent = 'Login';
        }

        modal.style.display = 'flex';
    },

    /**
     * Handle auth form submission
     */
    async handleAuthSubmit() {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');

        errorEl.textContent = '';

        if (!username || !password) {
            errorEl.textContent = 'Please enter username and password';
            return;
        }

        try {
            if (this.isSetupMode) {
                // Registration
                const confirmPassword = document.getElementById('auth-password-confirm').value;
                const displayName = document.getElementById('auth-display-name').value.trim();

                if (password !== confirmPassword) {
                    errorEl.textContent = 'Passwords do not match';
                    return;
                }

                if (password.length < 6) {
                    errorEl.textContent = 'Password must be at least 6 characters';
                    return;
                }

                const result = await API.register(username, password, displayName || username);
                this.currentUser = result.user;
            } else {
                // Login
                const result = await API.login(username, password);
                this.currentUser = result.user;
            }

            // Close modal and initialize app
            this.elements.modalAuth.style.display = 'none';
            this.initializeApp();

        } catch (err) {
            errorEl.textContent = err.message;
        }
    },

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await API.logout();
            this.currentUser = null;
            // Reload page to reset state
            window.location.reload();
        } catch (err) {
            this.showNotification('Logout failed: ' + err.message, 'error');
        }
    },

    /**
     * Update user display in toolbar
     */
    updateUserDisplay() {
        const displayName = document.getElementById('user-display-name');
        if (this.currentUser) {
            displayName.textContent = this.currentUser.display_name || this.currentUser.username;
        }
    },

    /**
     * Setup auth-related event listeners
     */
    setupAuth() {
        // Logout button
        document.getElementById('btn-logout').addEventListener('click', () => {
            this.handleLogout();
        });
    },

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            // World/Map selectors
            worldSelect: document.getElementById('world-select'),
            mapSelect: document.getElementById('map-select'),
            btnNewWorld: document.getElementById('btn-new-world'),
            btnEditWorld: document.getElementById('btn-edit-world'),
            btnNewMap: document.getElementById('btn-new-map'),
            btnEditMap: document.getElementById('btn-edit-map'),

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
            sidebarLeft: document.getElementById('sidebar-left'),
            sidebarRight: document.getElementById('sidebar-right'),
            stampPalette: document.getElementById('stamp-palette'),
            locationDetails: document.getElementById('location-details'),

            // Sidebar controls
            btnCollapseLeft: document.getElementById('btn-collapse-left'),
            btnCollapseRight: document.getElementById('btn-collapse-right'),
            btnToggleLeft: document.getElementById('btn-toggle-left'),
            btnToggleRight: document.getElementById('btn-toggle-right'),

            // Overlays
            scaleOverlay: document.getElementById('scale-overlay'),
            travelOverlay: document.getElementById('travel-overlay'),

            // Modals
            modalLocation: document.getElementById('modal-location'),
            modalCustomStamp: document.getElementById('modal-custom-stamp'),
            modalTravelSettings: document.getElementById('modal-travel-settings'),
            modalWorld: document.getElementById('modal-world'),
            modalMap: document.getElementById('modal-map'),
            modalAuth: document.getElementById('modal-auth'),

            // File inputs
            fileMapUpload: document.getElementById('file-map-upload'),
            fileLoadProject: document.getElementById('file-load-project'),
            fileMapImage: document.getElementById('file-map-image')
        };
    },

    /**
     * Setup world/map selector events
     */
    setupWorldMapSelectors() {
        // World selection
        this.elements.worldSelect.addEventListener('change', async (e) => {
            const worldId = e.target.value;
            if (worldId) {
                await this.selectWorld(worldId);
            } else {
                this.currentWorld = null;
                this.currentMap = null;
                this.updateMapSelector([]);
                MapModule.clearMap();
                MarkersModule.clearAll();
            }
        });

        // Map selection
        this.elements.mapSelect.addEventListener('change', async (e) => {
            const mapId = e.target.value;
            if (mapId) {
                await this.selectMap(mapId);
            } else {
                this.currentMap = null;
                MapModule.clearMap();
                MarkersModule.clearAll();
            }
        });

        // New world button
        this.elements.btnNewWorld.addEventListener('click', () => {
            this.showWorldModal(null);
        });

        // Edit world button
        this.elements.btnEditWorld.addEventListener('click', () => {
            if (this.currentWorld) {
                this.showWorldModal(this.currentWorld);
            }
        });

        // New map button
        this.elements.btnNewMap.addEventListener('click', () => {
            if (this.currentWorld) {
                this.showMapModal(null);
            }
        });

        // Edit map button
        this.elements.btnEditMap.addEventListener('click', () => {
            if (this.currentMap) {
                this.showMapModal(this.currentMap);
            }
        });
    },

    /**
     * Load worlds from database
     */
    async loadWorlds() {
        try {
            const worlds = await API.getWorlds();
            this.updateWorldSelector(worlds);
        } catch (err) {
            console.error('Failed to load worlds:', err);
            this.showNotification('Failed to connect to server. Make sure the server is running.', 'error');
        }
    },

    /**
     * Update world selector dropdown
     */
    updateWorldSelector(worlds) {
        const select = this.elements.worldSelect;
        select.innerHTML = '<option value="">Select a world...</option>';

        for (const world of worlds) {
            const option = document.createElement('option');
            option.value = world.id;
            option.textContent = `${world.name} (${world.map_count || 0} maps)`;
            select.appendChild(option);
        }
    },

    /**
     * Select a world
     */
    async selectWorld(worldId) {
        try {
            const world = await API.getWorld(worldId);
            this.currentWorld = world;

            // Load maps for this world
            const maps = await API.getMaps(worldId);
            this.updateMapSelector(maps);

            // Load custom stamps for this world
            const customStamps = await API.getCustomStamps(worldId);
            StampManager.loadCustomStamps(customStamps);
            this.renderStampPalette();

            // Load travel settings
            const travelSettings = await API.getTravelSettings(worldId);
            TravelCalculator.loadSettings(travelSettings);
            this.updateScaleUI();

            // Enable map controls
            this.elements.btnNewMap.disabled = false;
            this.elements.btnEditMap.disabled = false;

            // Clear current map
            this.currentMap = null;
            MapModule.clearMap();
            MarkersModule.clearAll();

            this.showNotification(`Loaded world: ${world.name}`);
        } catch (err) {
            console.error('Failed to select world:', err);
            this.showNotification('Failed to load world', 'error');
        }
    },

    /**
     * Update map selector dropdown
     */
    updateMapSelector(maps) {
        const select = this.elements.mapSelect;
        select.innerHTML = '<option value="">Select a map...</option>';
        select.disabled = maps.length === 0 && !this.currentWorld;

        for (const map of maps) {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = `${map.name} (${map.location_count || 0} locations)`;
            select.appendChild(option);
        }
    },

    /**
     * Select a map
     */
    async selectMap(mapId) {
        try {
            const map = await API.getMap(mapId);
            this.currentMap = map;

            // Load map image
            if (map.image_data) {
                MapModule.loadMapImage(map.image_data, map.width, map.height);
            } else {
                MapModule.clearMap();
            }

            // Update scale
            TravelCalculator.setScale(map.scale_value || 1, map.scale_unit || 'miles');
            this.updateScaleUI();

            // Load locations
            const locations = await API.getLocations(mapId);
            MarkersModule.loadLocations(locations);

            this.showNotification(`Loaded map: ${map.name}`);
        } catch (err) {
            console.error('Failed to select map:', err);
            this.showNotification('Failed to load map', 'error');
        }
    },

    /**
     * Show world modal for create/edit
     */
    showWorldModal(world) {
        const isEdit = !!world;
        document.getElementById('modal-world-title').textContent = isEdit ? 'Edit World' : 'New World';
        document.getElementById('world-name').value = world?.name || '';
        document.getElementById('world-description').value = world?.description || '';
        document.getElementById('btn-delete-world').style.display = isEdit ? 'block' : 'none';

        this.editingWorld = world;
        this.elements.modalWorld.style.display = 'flex';
    },

    /**
     * Show map modal for create/edit
     */
    showMapModal(map) {
        const isEdit = !!map;
        document.getElementById('modal-map-title').textContent = isEdit ? 'Edit Map' : 'New Map';
        document.getElementById('map-name').value = map?.name || '';
        document.getElementById('btn-delete-map').style.display = isEdit ? 'block' : 'none';

        if (map?.image_data) {
            document.getElementById('map-image-info').textContent = `Image: ${map.width}x${map.height}px`;
        } else {
            document.getElementById('map-image-info').textContent = '';
        }

        this.editingMap = map;
        this.pendingMapImage = null;
        this.elements.modalMap.style.display = 'flex';
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
            if (!this.currentMap) {
                this.showNotification('Please select or create a map first', 'error');
                return;
            }
            this.elements.fileMapUpload.click();
        });

        this.elements.btnSave.addEventListener('click', () => this.saveCurrentMap());
        this.elements.btnLoad.addEventListener('click', () => {
            this.elements.fileLoadProject.click();
        });
        this.elements.btnExport.addEventListener('click', () => this.exportWorld());
    },

    /**
     * Setup sidebar event listeners
     */
    setupSidebar() {
        // Add custom stamp button
        document.getElementById('btn-add-stamp-type').addEventListener('click', () => {
            if (!this.currentWorld) {
                this.showNotification('Please select a world first', 'error');
                return;
            }
            this.showModal('modalCustomStamp');
        });

        // Close travel overlay
        document.getElementById('btn-close-travel').addEventListener('click', () => {
            MapModule.clearMeasurement();
            MapModule.clearRoute();
        });

        // Sidebar collapse/expand functionality
        this.elements.btnCollapseLeft?.addEventListener('click', () => {
            this.toggleSidebar('left', false);
        });

        this.elements.btnCollapseRight?.addEventListener('click', () => {
            this.toggleSidebar('right', false);
        });

        this.elements.btnToggleLeft?.addEventListener('click', () => {
            this.toggleSidebar('left', true);
        });

        this.elements.btnToggleRight?.addEventListener('click', () => {
            this.toggleSidebar('right', true);
        });

        // Load sidebar state from localStorage
        this.loadSidebarState();
    },

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar(side, show) {
        const sidebar = side === 'left' ? this.elements.sidebarLeft : this.elements.sidebarRight;
        const toggle = side === 'left' ? this.elements.btnToggleLeft : this.elements.btnToggleRight;

        if (show) {
            sidebar.classList.remove('collapsed');
            toggle.classList.remove('visible');
        } else {
            sidebar.classList.add('collapsed');
            toggle.classList.add('visible');
        }

        // Save state
        this.saveSidebarState();
    },

    /**
     * Save sidebar state to localStorage
     */
    saveSidebarState() {
        const state = {
            leftCollapsed: this.elements.sidebarLeft?.classList.contains('collapsed'),
            rightCollapsed: this.elements.sidebarRight?.classList.contains('collapsed')
        };
        localStorage.setItem('fantasymap_sidebar_state', JSON.stringify(state));
    },

    /**
     * Load sidebar state from localStorage
     */
    loadSidebarState() {
        try {
            const state = JSON.parse(localStorage.getItem('fantasymap_sidebar_state') || '{}');
            if (state.leftCollapsed) {
                this.toggleSidebar('left', false);
            }
            if (state.rightCollapsed) {
                this.toggleSidebar('right', false);
            }
        } catch (e) {
            // Ignore errors
        }
    },

    /**
     * Setup modal event listeners
     */
    setupModals() {
        // Auth modal
        document.getElementById('btn-auth-submit').addEventListener('click', () => {
            this.handleAuthSubmit();
        });

        // Allow Enter key to submit auth form
        ['auth-username', 'auth-password', 'auth-password-confirm'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleAuthSubmit();
                    }
                });
            }
        });

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

        // World modal
        document.getElementById('btn-world-modal-close').addEventListener('click', () => {
            this.elements.modalWorld.style.display = 'none';
        });

        document.getElementById('btn-save-world').addEventListener('click', () => {
            this.saveWorld();
        });

        document.getElementById('btn-delete-world').addEventListener('click', () => {
            this.deleteWorld();
        });

        // Map modal
        document.getElementById('btn-map-modal-close').addEventListener('click', () => {
            this.elements.modalMap.style.display = 'none';
        });

        document.getElementById('btn-save-map').addEventListener('click', () => {
            this.saveMap();
        });

        document.getElementById('btn-delete-map').addEventListener('click', () => {
            this.deleteMap();
        });

        document.getElementById('btn-map-image-upload').addEventListener('click', () => {
            this.elements.fileMapImage.click();
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
                if (!this.currentMap) {
                    this.showNotification('Please select a map first', 'error');
                    return;
                }
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
        // Map upload (for existing map)
        this.elements.fileMapUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const imageData = await this.readFileAsDataURL(file);
                const dimensions = await this.getImageDimensions(imageData);

                // Update current map with new image
                await API.updateMap(this.currentMap.id, {
                    image_data: imageData,
                    width: dimensions.width,
                    height: dimensions.height
                });

                MapModule.loadMapImage(imageData, dimensions.width, dimensions.height);
                this.showNotification('Map image updated');
            } catch (err) {
                this.showNotification(err.message, 'error');
            }

            e.target.value = '';
        });

        // Map image for new map modal
        this.elements.fileMapImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const imageData = await this.readFileAsDataURL(file);
                const dimensions = await this.getImageDimensions(imageData);

                this.pendingMapImage = {
                    data: imageData,
                    width: dimensions.width,
                    height: dimensions.height
                };

                document.getElementById('map-image-info').textContent =
                    `Image selected: ${dimensions.width}x${dimensions.height}px`;
            } catch (err) {
                this.showNotification(err.message, 'error');
            }

            e.target.value = '';
        });

        // Project load (import)
        this.elements.fileLoadProject.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);
                await API.importWorld(data);
                await this.loadWorlds();
                this.showNotification('World imported successfully');
            } catch (err) {
                this.showNotification('Failed to import: ' + err.message, 'error');
            }

            e.target.value = '';
        });
    },

    /**
     * Read file as data URL
     */
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Get image dimensions from data URL
     */
    getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });
    },

    /**
     * Save world (create or update)
     */
    async saveWorld() {
        const name = document.getElementById('world-name').value.trim();
        const description = document.getElementById('world-description').value.trim();

        if (!name) {
            this.showNotification('Please enter a world name', 'error');
            return;
        }

        try {
            if (this.editingWorld) {
                await API.updateWorld(this.editingWorld.id, { name, description });
                this.showNotification('World updated');
            } else {
                const world = await API.createWorld({ name, description });
                this.showNotification('World created');
                // Select the new world
                await this.loadWorlds();
                this.elements.worldSelect.value = world.id;
                await this.selectWorld(world.id);
            }

            this.elements.modalWorld.style.display = 'none';
            await this.loadWorlds();
        } catch (err) {
            this.showNotification('Failed to save world: ' + err.message, 'error');
        }
    },

    /**
     * Delete world
     */
    async deleteWorld() {
        if (!this.editingWorld) return;

        if (!confirm(`Delete "${this.editingWorld.name}" and all its maps? This cannot be undone.`)) {
            return;
        }

        try {
            await API.deleteWorld(this.editingWorld.id);
            this.elements.modalWorld.style.display = 'none';
            this.currentWorld = null;
            this.currentMap = null;
            await this.loadWorlds();
            this.updateMapSelector([]);
            MapModule.clearMap();
            MarkersModule.clearAll();
            this.showNotification('World deleted');
        } catch (err) {
            this.showNotification('Failed to delete world: ' + err.message, 'error');
        }
    },

    /**
     * Save map (create or update)
     */
    async saveMap() {
        const name = document.getElementById('map-name').value.trim();

        if (!name) {
            this.showNotification('Please enter a map name', 'error');
            return;
        }

        try {
            if (this.editingMap) {
                // Update existing map
                const updateData = { name };
                if (this.pendingMapImage) {
                    updateData.image_data = this.pendingMapImage.data;
                    updateData.width = this.pendingMapImage.width;
                    updateData.height = this.pendingMapImage.height;
                }
                await API.updateMap(this.editingMap.id, updateData);
                this.showNotification('Map updated');

                // Reload if this is the current map
                if (this.currentMap?.id === this.editingMap.id) {
                    await this.selectMap(this.editingMap.id);
                }
            } else {
                // Create new map
                const mapData = { name };
                if (this.pendingMapImage) {
                    mapData.image_data = this.pendingMapImage.data;
                    mapData.width = this.pendingMapImage.width;
                    mapData.height = this.pendingMapImage.height;
                }
                const map = await API.createMap(this.currentWorld.id, mapData);
                this.showNotification('Map created');

                // Reload maps and select the new one
                const maps = await API.getMaps(this.currentWorld.id);
                this.updateMapSelector(maps);
                this.elements.mapSelect.value = map.id;
                await this.selectMap(map.id);
            }

            this.elements.modalMap.style.display = 'none';
        } catch (err) {
            this.showNotification('Failed to save map: ' + err.message, 'error');
        }
    },

    /**
     * Delete map
     */
    async deleteMap() {
        if (!this.editingMap) return;

        if (!confirm(`Delete "${this.editingMap.name}" and all its locations? This cannot be undone.`)) {
            return;
        }

        try {
            await API.deleteMap(this.editingMap.id);
            this.elements.modalMap.style.display = 'none';

            if (this.currentMap?.id === this.editingMap.id) {
                this.currentMap = null;
                MapModule.clearMap();
                MarkersModule.clearAll();
            }

            // Reload maps
            const maps = await API.getMaps(this.currentWorld.id);
            this.updateMapSelector(maps);
            this.showNotification('Map deleted');
        } catch (err) {
            this.showNotification('Failed to delete map: ' + err.message, 'error');
        }
    },

    /**
     * Set the current tool
     */
    setTool(tool) {
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));

        MapModule.stopMeasuring();
        MapModule.stopRoutePlanning();

        this.currentTool = tool;
        const toolBtn = document.getElementById(`btn-${tool}`);
        if (toolBtn) toolBtn.classList.add('active');

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
     */
    selectStamp(stamp) {
        this.selectedStamp = stamp;

        document.querySelectorAll('.stamp-item').forEach(el => el.classList.remove('selected'));
        const stampEl = document.querySelector(`.stamp-item[data-stamp-id="${stamp.id}"]`);
        if (stampEl) stampEl.classList.add('selected');

        if (this.currentTool !== 'stamp') {
            this.setTool('stamp');
        }
    },

    /**
     * Place a stamp on the map
     */
    async placeStamp(x, y) {
        if (!this.selectedStamp || !this.currentMap) return;

        try {
            const location = await API.createLocation(this.currentMap.id, {
                x,
                y,
                stamp_id: this.selectedStamp.id,
                name: this.selectedStamp.name
            });

            MarkersModule.addLocationFromAPI(location);
            this.editLocation(location);
        } catch (err) {
            this.showNotification('Failed to create location: ' + err.message, 'error');
        }
    },

    /**
     * Show location details in sidebar
     */
    showLocationDetails(location) {
        const stamp = StampManager.getStamp(location.stamp_id || location.stampId);
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

        if (location.wiki_link || location.wikiLink) {
            const wikiLink = location.wiki_link || location.wikiLink;
            html += `
                <a href="${wikiLink}" target="_blank" class="location-card-wiki">
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
     */
    editLocation(location) {
        document.getElementById('modal-title').textContent = location.name ? 'Edit Location' : 'New Location';
        document.getElementById('location-name').value = location.name || '';
        document.getElementById('location-description').value = location.description || '';
        document.getElementById('location-wiki').value = location.wiki_link || location.wikiLink || '';
        document.getElementById('location-notes').value = location.notes || '';

        StampManager.renderSelector(
            document.getElementById('stamp-selector'),
            location.stamp_id || location.stampId,
            (stamp) => {
                this.editingLocationStamp = stamp.id;
            }
        );
        this.editingLocationStamp = location.stamp_id || location.stampId;
        this.editingLocation = location;

        this.showModal('modalLocation');
    },

    /**
     * Save location from modal
     */
    async saveLocationFromModal() {
        if (!this.editingLocation) return;

        try {
            const data = {
                name: document.getElementById('location-name').value,
                description: document.getElementById('location-description').value,
                wiki_link: document.getElementById('location-wiki').value,
                notes: document.getElementById('location-notes').value,
                stamp_id: this.editingLocationStamp
            };

            await API.updateLocation(this.editingLocation.id, data);
            MarkersModule.updateLocationFromAPI({ ...this.editingLocation, ...data });

            this.hideModal('modalLocation');
            this.showNotification('Location saved');
        } catch (err) {
            this.showNotification('Failed to save location: ' + err.message, 'error');
        }
    },

    /**
     * Delete current location
     */
    async deleteCurrentLocation() {
        if (!this.editingLocation) return;

        if (!confirm('Delete this location?')) return;

        try {
            await API.deleteLocation(this.editingLocation.id);
            MarkersModule.removeLocation(this.editingLocation.id);
            this.hideModal('modalLocation');
            this.hideLocationDetails();
            this.showNotification('Location deleted');
        } catch (err) {
            this.showNotification('Failed to delete location: ' + err.message, 'error');
        }
    },

    /**
     * Pan to a location
     */
    panToLocation(id) {
        MarkersModule.panToLocation(id);
    },

    /**
     * Add custom stamp
     */
    async addCustomStamp() {
        if (!this.currentWorld) return;

        const emoji = document.getElementById('stamp-emoji').value;
        const name = document.getElementById('stamp-name').value;
        const category = document.getElementById('stamp-category').value;

        if (!emoji || !name) {
            this.showNotification('Please enter emoji and name', 'error');
            return;
        }

        try {
            const stamp = await API.createCustomStamp(this.currentWorld.id, {
                icon: emoji,
                name,
                category
            });

            StampManager.addCustomStampFromAPI(stamp);
            this.renderStampPalette();
            this.hideModal('modalCustomStamp');

            document.getElementById('stamp-emoji').value = '';
            document.getElementById('stamp-name').value = '';

            this.showNotification('Custom stamp added');
        } catch (err) {
            this.showNotification('Failed to add stamp: ' + err.message, 'error');
        }
    },

    /**
     * Set map scale
     */
    async setMapScale() {
        const value = parseFloat(document.getElementById('scale-value').value) || 1;
        const unit = document.getElementById('scale-unit').value;

        TravelCalculator.setScale(value, unit);

        // Save to current map if one is selected
        if (this.currentMap) {
            try {
                await API.updateMap(this.currentMap.id, {
                    scale_value: value,
                    scale_unit: unit
                });
            } catch (err) {
                console.error('Failed to save scale:', err);
            }
        }

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
    async saveTravelSettings() {
        const settings = {
            walking_speed: parseFloat(document.getElementById('speed-walking').value),
            horse_speed: parseFloat(document.getElementById('speed-horse').value),
            wagon_speed: parseFloat(document.getElementById('speed-wagon').value),
            hours_per_day: parseInt(document.getElementById('hours-per-day').value)
        };

        TravelCalculator.setSpeed('walking', settings.walking_speed);
        TravelCalculator.setSpeed('horse', settings.horse_speed);
        TravelCalculator.setSpeed('wagon', settings.wagon_speed);
        TravelCalculator.setHoursPerDay(settings.hours_per_day);

        if (this.currentWorld) {
            try {
                await API.updateTravelSettings(this.currentWorld.id, settings);
            } catch (err) {
                console.error('Failed to save travel settings:', err);
            }
        }

        this.hideModal('modalTravelSettings');
        this.showNotification('Travel settings saved');
    },

    /**
     * Save current map
     */
    async saveCurrentMap() {
        if (!this.currentMap) {
            this.showNotification('No map selected', 'error');
            return;
        }
        this.showNotification('All changes are automatically saved to the database');
    },

    /**
     * Export world
     */
    async exportWorld() {
        if (!this.currentWorld) {
            this.showNotification('Please select a world first', 'error');
            return;
        }

        try {
            const data = await API.exportWorld(this.currentWorld.id);
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentWorld.name.replace(/[^a-z0-9]/gi, '_')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('World exported');
        } catch (err) {
            this.showNotification('Failed to export: ' + err.message, 'error');
        }
    },

    /**
     * Show a modal
     */
    showModal(modalKey) {
        const modal = this.elements[modalKey];
        if (modal) modal.style.display = 'flex';
    },

    /**
     * Hide a modal
     */
    hideModal(modalKey) {
        const modal = this.elements[modalKey];
        if (modal) modal.style.display = 'none';
    },

    /**
     * Show notification
     */
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 14px 24px;
            background: ${type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)'};
            color: white;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 500;
            z-index: 3000;
            animation: notificationSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'notificationFadeOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes notificationSlideIn {
        from {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
        }
        to {
            transform: translateX(0) scale(1);
            opacity: 1;
        }
    }
    @keyframes notificationFadeOut {
        from {
            transform: translateX(0) scale(1);
            opacity: 1;
        }
        to {
            transform: translateX(50%) scale(0.8);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
