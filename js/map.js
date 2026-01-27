/**
 * Fantasy Map Builder - Map Module
 * Handles the Leaflet map setup and interactions
 */

const MapModule = {
    map: null,
    imageOverlay: null,
    mapBounds: null,
    imageSize: { width: 0, height: 0 },

    // Layers
    markersLayer: null,
    measurementLayer: null,
    routeLayer: null,

    // Measurement state
    measurePoints: [],
    measureLine: null,
    measureMarkers: [],

    // Route state
    routePoints: [],
    routeLines: [],
    routeMarkers: [],

    /**
     * Initialize the map
     */
    init() {
        // Create map with CRS.Simple for image overlay
        this.map = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: -3,
            maxZoom: 4,
            zoomControl: true,
            attributionControl: false
        });

        // Create layer groups
        this.markersLayer = L.layerGroup().addTo(this.map);
        this.measurementLayer = L.layerGroup().addTo(this.map);
        this.routeLayer = L.layerGroup().addTo(this.map);

        // Set initial view
        this.map.setView([0, 0], 0);

        // Show empty state initially
        this.showEmptyState();

        // Load saved map if exists
        this.loadSavedMap();
    },

    /**
     * Show empty state when no map is loaded
     */
    showEmptyState() {
        const mapWrapper = document.querySelector('.map-wrapper');
        let emptyState = mapWrapper.querySelector('.map-empty-state');

        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'map-empty-state';
            emptyState.innerHTML = `
                <div class="icon">🗺️</div>
                <p>No map loaded</p>
                <button class="btn-primary" id="btn-empty-upload">Upload Your Map</button>
            `;
            mapWrapper.appendChild(emptyState);

            emptyState.querySelector('#btn-empty-upload').addEventListener('click', () => {
                document.getElementById('file-map-upload').click();
            });
        }

        emptyState.style.display = 'block';
    },

    /**
     * Hide empty state
     */
    hideEmptyState() {
        const emptyState = document.querySelector('.map-empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    },

    /**
     * Load a map image
     * @param {string} imageUrl - URL or data URL of the image
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    loadMapImage(imageUrl, width, height) {
        // Remove existing overlay
        if (this.imageOverlay) {
            this.map.removeLayer(this.imageOverlay);
        }

        this.imageSize = { width, height };

        // Calculate bounds
        // Use a coordinate system where 1 unit = 1 pixel
        const bounds = [[0, 0], [height, width]];
        this.mapBounds = L.latLngBounds(bounds);

        // Add image overlay
        this.imageOverlay = L.imageOverlay(imageUrl, bounds).addTo(this.map);

        // Fit map to image bounds
        this.map.fitBounds(bounds);
        this.map.setMaxBounds(bounds.map(([y, x]) => [y - height * 0.5, x - width * 0.5]));

        this.hideEmptyState();

        // Save to localStorage
        this.saveMapImage(imageUrl, width, height);
    },

    /**
     * Save map image to localStorage
     */
    saveMapImage(imageUrl, width, height) {
        // Only save if it's a data URL (uploaded image)
        if (imageUrl.startsWith('data:')) {
            localStorage.setItem('fantasymap_mapimage', JSON.stringify({
                imageUrl,
                width,
                height
            }));
        }
    },

    /**
     * Load saved map from localStorage
     */
    loadSavedMap() {
        const saved = localStorage.getItem('fantasymap_mapimage');
        if (saved) {
            const { imageUrl, width, height } = JSON.parse(saved);
            this.loadMapImage(imageUrl, width, height);
        }
    },

    /**
     * Handle file upload
     * @param {File} file - The uploaded file
     */
    handleMapUpload(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Please upload an image file'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.loadMapImage(e.target.result, img.width, img.height);
                    resolve({ width: img.width, height: img.height });
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Convert screen coordinates to map coordinates
     * @param {Event} e - Click event
     * @returns {Object} Map coordinates {x, y}
     */
    screenToMapCoords(e) {
        const latlng = e.latlng;
        return {
            x: latlng.lng,
            y: latlng.lat
        };
    },

    /**
     * Convert map coordinates to Leaflet LatLng
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {L.LatLng}
     */
    coordsToLatLng(x, y) {
        return L.latLng(y, x);
    },

    /**
     * Start measuring mode
     */
    startMeasuring() {
        this.clearMeasurement();
        this.map.getContainer().style.cursor = 'crosshair';

        this.measureClickHandler = (e) => this.handleMeasureClick(e);
        this.map.on('click', this.measureClickHandler);
    },

    /**
     * Handle click during measurement
     */
    handleMeasureClick(e) {
        const point = this.screenToMapCoords(e);
        this.measurePoints.push(point);

        // Add marker
        const marker = L.circleMarker(this.coordsToLatLng(point.x, point.y), {
            radius: 6,
            color: '#e94560',
            fillColor: '#e94560',
            fillOpacity: 1
        }).addTo(this.measurementLayer);
        this.measureMarkers.push(marker);

        // Draw line if we have 2 points
        if (this.measurePoints.length === 2) {
            this.drawMeasurementLine();
            this.showTravelInfo();
            this.stopMeasuring();
        }
    },

    /**
     * Draw measurement line
     */
    drawMeasurementLine() {
        if (this.measureLine) {
            this.measurementLayer.removeLayer(this.measureLine);
        }

        const points = this.measurePoints.map(p => this.coordsToLatLng(p.x, p.y));
        this.measureLine = L.polyline(points, {
            color: '#e94560',
            weight: 3,
            dashArray: '10, 5'
        }).addTo(this.measurementLayer);
    },

    /**
     * Show travel information overlay
     */
    showTravelInfo() {
        if (this.measurePoints.length < 2) return;

        const travelInfo = TravelCalculator.calculateAllTravelTimes(
            this.measurePoints[0],
            this.measurePoints[1]
        );

        document.getElementById('travel-distance-value').textContent = travelInfo.distance;
        document.getElementById('travel-distance-unit').textContent = travelInfo.unit;
        document.getElementById('time-walking').textContent = travelInfo.walking.formatted;
        document.getElementById('time-horse').textContent = travelInfo.horse.formatted;
        document.getElementById('time-wagon').textContent = travelInfo.wagon.formatted;

        document.getElementById('travel-overlay').style.display = 'block';
    },

    /**
     * Stop measuring mode
     */
    stopMeasuring() {
        this.map.getContainer().style.cursor = '';
        if (this.measureClickHandler) {
            this.map.off('click', this.measureClickHandler);
            this.measureClickHandler = null;
        }
    },

    /**
     * Clear measurement
     */
    clearMeasurement() {
        this.measurePoints = [];
        this.measurementLayer.clearLayers();
        this.measureMarkers = [];
        this.measureLine = null;
        document.getElementById('travel-overlay').style.display = 'none';
    },

    /**
     * Start route planning mode
     */
    startRoutePlanning() {
        this.clearRoute();
        this.map.getContainer().style.cursor = 'crosshair';

        this.routeClickHandler = (e) => this.handleRouteClick(e);
        this.map.on('click', this.routeClickHandler);
    },

    /**
     * Handle click during route planning
     */
    handleRouteClick(e) {
        const point = this.screenToMapCoords(e);
        this.routePoints.push(point);

        // Add marker
        const markerNum = this.routePoints.length;
        const marker = L.marker(this.coordsToLatLng(point.x, point.y), {
            icon: L.divIcon({
                className: 'route-marker',
                html: `<div style="
                    background: #4ade80;
                    color: #1a1a2e;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 12px;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">${markerNum}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(this.routeLayer);
        this.routeMarkers.push(marker);

        // Draw line if we have multiple points
        if (this.routePoints.length > 1) {
            this.drawRouteLine();
            this.showRouteInfo();
        }
    },

    /**
     * Draw route lines
     */
    drawRouteLine() {
        // Remove existing lines
        this.routeLines.forEach(line => this.routeLayer.removeLayer(line));
        this.routeLines = [];

        for (let i = 0; i < this.routePoints.length - 1; i++) {
            const line = L.polyline([
                this.coordsToLatLng(this.routePoints[i].x, this.routePoints[i].y),
                this.coordsToLatLng(this.routePoints[i + 1].x, this.routePoints[i + 1].y)
            ], {
                color: '#4ade80',
                weight: 4
            }).addTo(this.routeLayer);
            this.routeLines.push(line);
        }
    },

    /**
     * Show route information
     */
    showRouteInfo() {
        const routeInfo = TravelCalculator.calculateRouteTime(this.routePoints);
        if (!routeInfo) return;

        document.getElementById('travel-distance-value').textContent = routeInfo.totalDistance;
        document.getElementById('travel-distance-unit').textContent = routeInfo.unit;
        document.getElementById('time-walking').textContent = routeInfo.walking.formatted;
        document.getElementById('time-horse').textContent = routeInfo.horse.formatted;
        document.getElementById('time-wagon').textContent = routeInfo.wagon.formatted;

        document.getElementById('travel-overlay').style.display = 'block';
    },

    /**
     * Stop route planning
     */
    stopRoutePlanning() {
        this.map.getContainer().style.cursor = '';
        if (this.routeClickHandler) {
            this.map.off('click', this.routeClickHandler);
            this.routeClickHandler = null;
        }
    },

    /**
     * Clear route
     */
    clearRoute() {
        this.routePoints = [];
        this.routeLayer.clearLayers();
        this.routeMarkers = [];
        this.routeLines = [];
        document.getElementById('travel-overlay').style.display = 'none';
    },

    /**
     * Get current map state
     */
    getState() {
        return {
            imageSize: this.imageSize,
            center: this.map.getCenter(),
            zoom: this.map.getZoom()
        };
    },

    /**
     * Clear the map
     */
    clearMap() {
        if (this.imageOverlay) {
            this.map.removeLayer(this.imageOverlay);
            this.imageOverlay = null;
        }
        this.markersLayer.clearLayers();
        this.clearMeasurement();
        this.clearRoute();
        localStorage.removeItem('fantasymap_mapimage');
        this.showEmptyState();
    }
};
