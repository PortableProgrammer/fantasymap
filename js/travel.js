/**
 * Fantasy Map Builder - Travel Time Calculator
 * Calculate travel times for different modes of transportation
 */

const TravelCalculator = {
    // Default travel speeds (miles per hour)
    defaultSpeeds: {
        walking: 3,      // Average walking pace
        horse: 8,        // Horse at sustainable travel pace
        wagon: 4         // Wagon/cart speed
    },

    // Current speeds (can be customized)
    speeds: null,

    // Hours of travel per day
    hoursPerDay: 8,

    // Map scale settings
    scale: {
        pixelsPerUnit: 1,  // How many pixels per distance unit
        unit: 'miles'      // 'miles', 'km', or 'leagues'
    },

    // Conversion factors to miles
    unitConversions: {
        miles: 1,
        km: 0.621371,
        leagues: 3  // 1 league ≈ 3 miles
    },

    /**
     * Initialize travel calculator
     */
    init() {
        // Load settings from storage
        const savedSettings = localStorage.getItem('fantasymap_travel');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            this.speeds = settings.speeds || { ...this.defaultSpeeds };
            this.hoursPerDay = settings.hoursPerDay || 8;
            this.scale = settings.scale || this.scale;
        } else {
            this.speeds = { ...this.defaultSpeeds };
        }
    },

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('fantasymap_travel', JSON.stringify({
            speeds: this.speeds,
            hoursPerDay: this.hoursPerDay,
            scale: this.scale
        }));
    },

    /**
     * Set map scale
     * @param {number} pixelsPerUnit - Pixels per distance unit
     * @param {string} unit - Distance unit (miles, km, leagues)
     */
    setScale(pixelsPerUnit, unit) {
        this.scale.pixelsPerUnit = pixelsPerUnit;
        this.scale.unit = unit;
        this.saveSettings();
    },

    /**
     * Convert pixel distance to real-world distance
     * @param {number} pixels - Distance in pixels
     * @returns {number} Distance in the current unit
     */
    pixelsToDistance(pixels) {
        return pixels * this.scale.pixelsPerUnit;
    },

    /**
     * Convert distance to miles (for calculation purposes)
     * @param {number} distance - Distance in current unit
     * @returns {number} Distance in miles
     */
    toMiles(distance) {
        const conversion = this.unitConversions[this.scale.unit] || 1;
        return distance * conversion;
    },

    /**
     * Calculate pixel distance between two points
     * @param {Object} point1 - {x, y} coordinates
     * @param {Object} point2 - {x, y} coordinates
     * @returns {number} Distance in pixels
     */
    calculatePixelDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Calculate travel time for a given distance
     * @param {number} distanceInMiles - Distance in miles
     * @param {string} mode - Travel mode (walking, horse, wagon)
     * @returns {Object} Travel time breakdown
     */
    calculateTravelTime(distanceInMiles, mode) {
        const speed = this.speeds[mode] || this.speeds.walking;
        const totalHours = distanceInMiles / speed;
        const days = Math.floor(totalHours / this.hoursPerDay);
        const remainingHours = totalHours % this.hoursPerDay;

        return {
            totalHours: totalHours,
            days: days,
            hours: Math.round(remainingHours * 10) / 10,
            formatted: this.formatTime(days, remainingHours)
        };
    },

    /**
     * Calculate all travel times between two pixel points
     * @param {Object} point1 - {x, y} Leaflet coordinates
     * @param {Object} point2 - {x, y} Leaflet coordinates
     * @returns {Object} All travel information
     */
    calculateAllTravelTimes(point1, point2) {
        const pixelDistance = this.calculatePixelDistance(point1, point2);
        const distance = this.pixelsToDistance(pixelDistance);
        const distanceInMiles = this.toMiles(distance);

        return {
            pixelDistance: pixelDistance,
            distance: Math.round(distance * 100) / 100,
            unit: this.scale.unit,
            walking: this.calculateTravelTime(distanceInMiles, 'walking'),
            horse: this.calculateTravelTime(distanceInMiles, 'horse'),
            wagon: this.calculateTravelTime(distanceInMiles, 'wagon')
        };
    },

    /**
     * Calculate total travel time for a route (multiple waypoints)
     * @param {Array} points - Array of {x, y} coordinates
     * @returns {Object} Total travel information
     */
    calculateRouteTime(points) {
        if (points.length < 2) {
            return null;
        }

        let totalPixelDistance = 0;
        const segments = [];

        for (let i = 0; i < points.length - 1; i++) {
            const segmentDistance = this.calculatePixelDistance(points[i], points[i + 1]);
            totalPixelDistance += segmentDistance;
            segments.push({
                from: i,
                to: i + 1,
                pixelDistance: segmentDistance,
                distance: this.pixelsToDistance(segmentDistance)
            });
        }

        const totalDistance = this.pixelsToDistance(totalPixelDistance);
        const distanceInMiles = this.toMiles(totalDistance);

        return {
            segments: segments,
            totalPixelDistance: totalPixelDistance,
            totalDistance: Math.round(totalDistance * 100) / 100,
            unit: this.scale.unit,
            walking: this.calculateTravelTime(distanceInMiles, 'walking'),
            horse: this.calculateTravelTime(distanceInMiles, 'horse'),
            wagon: this.calculateTravelTime(distanceInMiles, 'wagon')
        };
    },

    /**
     * Format time as human-readable string
     * @param {number} days - Number of days
     * @param {number} hours - Number of hours
     * @returns {string} Formatted time string
     */
    formatTime(days, hours) {
        hours = Math.round(hours * 10) / 10;

        if (days === 0) {
            if (hours < 1) {
                const minutes = Math.round(hours * 60);
                return `${minutes} min`;
            }
            return `${hours} hr`;
        }

        if (hours === 0) {
            return days === 1 ? '1 day' : `${days} days`;
        }

        const dayStr = days === 1 ? '1 day' : `${days} days`;
        return `${dayStr}, ${hours} hr`;
    },

    /**
     * Update travel speed
     * @param {string} mode - Travel mode
     * @param {number} speed - Speed in miles per hour
     */
    setSpeed(mode, speed) {
        if (this.speeds.hasOwnProperty(mode)) {
            this.speeds[mode] = speed;
            this.saveSettings();
        }
    },

    /**
     * Set hours of travel per day
     * @param {number} hours - Hours per day
     */
    setHoursPerDay(hours) {
        this.hoursPerDay = Math.max(1, Math.min(24, hours));
        this.saveSettings();
    },

    /**
     * Get current settings for UI display
     */
    getSettings() {
        return {
            speeds: { ...this.speeds },
            hoursPerDay: this.hoursPerDay,
            scale: { ...this.scale }
        };
    },

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.speeds = { ...this.defaultSpeeds };
        this.hoursPerDay = 8;
        this.saveSettings();
    }
};
