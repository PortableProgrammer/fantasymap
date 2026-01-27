/**
 * Fantasy Map Builder - Stamp Definitions
 * Default stamps and stamp management
 */

const StampManager = {
    // Default stamp categories and icons
    defaultStamps: {
        settlements: {
            name: 'Settlements',
            stamps: [
                { id: 'city', icon: '🏰', name: 'City' },
                { id: 'town', icon: '🏘️', name: 'Town' },
                { id: 'village', icon: '🏠', name: 'Village' },
                { id: 'castle', icon: '🏯', name: 'Castle' },
                { id: 'fortress', icon: '🛡️', name: 'Fortress' },
                { id: 'ruins', icon: '🏚️', name: 'Ruins' },
                { id: 'camp', icon: '⛺', name: 'Camp' },
                { id: 'port', icon: '⚓', name: 'Port' }
            ]
        },
        nature: {
            name: 'Nature',
            stamps: [
                { id: 'mountain', icon: '⛰️', name: 'Mountain' },
                { id: 'forest', icon: '🌲', name: 'Forest' },
                { id: 'lake', icon: '💧', name: 'Lake' },
                { id: 'river', icon: '🌊', name: 'River' },
                { id: 'desert', icon: '🏜️', name: 'Desert' },
                { id: 'volcano', icon: '🌋', name: 'Volcano' },
                { id: 'cave', icon: '🕳️', name: 'Cave' },
                { id: 'island', icon: '🏝️', name: 'Island' }
            ]
        },
        dungeons: {
            name: 'Dungeons & POI',
            stamps: [
                { id: 'dungeon', icon: '⚔️', name: 'Dungeon' },
                { id: 'temple', icon: '🛕', name: 'Temple' },
                { id: 'shrine', icon: '⛩️', name: 'Shrine' },
                { id: 'tower', icon: '🗼', name: 'Tower' },
                { id: 'mine', icon: '⛏️', name: 'Mine' },
                { id: 'treasure', icon: '💎', name: 'Treasure' },
                { id: 'danger', icon: '☠️', name: 'Danger' },
                { id: 'mystery', icon: '❓', name: 'Mystery' }
            ]
        },
        markers: {
            name: 'Markers',
            stamps: [
                { id: 'star', icon: '⭐', name: 'Star' },
                { id: 'heart', icon: '❤️', name: 'Heart' },
                { id: 'flag', icon: '🚩', name: 'Flag' },
                { id: 'pin', icon: '📍', name: 'Pin' },
                { id: 'check', icon: '✅', name: 'Complete' },
                { id: 'cross', icon: '❌', name: 'Blocked' },
                { id: 'eye', icon: '👁️', name: 'Watched' },
                { id: 'quest', icon: '📜', name: 'Quest' }
            ]
        },
        travel: {
            name: 'Travel',
            stamps: [
                { id: 'waypoint', icon: '🔶', name: 'Waypoint' },
                { id: 'inn', icon: '🍺', name: 'Inn' },
                { id: 'stable', icon: '🐴', name: 'Stable' },
                { id: 'bridge', icon: '🌉', name: 'Bridge' },
                { id: 'crossroads', icon: '🔀', name: 'Crossroads' },
                { id: 'ferry', icon: '⛴️', name: 'Ferry' },
                { id: 'pass', icon: '🚶', name: 'Pass' },
                { id: 'blocked', icon: '🚧', name: 'Blocked' }
            ]
        },
        custom: {
            name: 'Custom',
            stamps: []
        }
    },

    // Current stamps (including custom ones)
    stamps: null,

    /**
     * Initialize stamp manager
     */
    init() {
        // Load custom stamps from storage
        const savedStamps = localStorage.getItem('fantasymap_stamps');
        if (savedStamps) {
            this.stamps = JSON.parse(savedStamps);
        } else {
            this.stamps = JSON.parse(JSON.stringify(this.defaultStamps));
        }
    },

    /**
     * Get all stamps
     */
    getAllStamps() {
        return this.stamps;
    },

    /**
     * Get a specific stamp by ID
     */
    getStamp(stampId) {
        for (const category of Object.values(this.stamps)) {
            const stamp = category.stamps.find(s => s.id === stampId);
            if (stamp) return stamp;
        }
        return null;
    },

    /**
     * Get all stamps as a flat array
     */
    getFlatStamps() {
        const flat = [];
        for (const category of Object.values(this.stamps)) {
            flat.push(...category.stamps);
        }
        return flat;
    },

    /**
     * Add a custom stamp
     */
    addCustomStamp(icon, name, category = 'custom') {
        const id = 'custom_' + Date.now();
        const stamp = { id, icon, name, custom: true };

        if (this.stamps[category]) {
            this.stamps[category].stamps.push(stamp);
        } else {
            this.stamps.custom.stamps.push(stamp);
        }

        this.saveStamps();
        return stamp;
    },

    /**
     * Remove a custom stamp
     */
    removeCustomStamp(stampId) {
        for (const category of Object.values(this.stamps)) {
            const index = category.stamps.findIndex(s => s.id === stampId && s.custom);
            if (index !== -1) {
                category.stamps.splice(index, 1);
                this.saveStamps();
                return true;
            }
        }
        return false;
    },

    /**
     * Save stamps to localStorage
     */
    saveStamps() {
        localStorage.setItem('fantasymap_stamps', JSON.stringify(this.stamps));
    },

    /**
     * Reset to default stamps
     */
    resetToDefaults() {
        this.stamps = JSON.parse(JSON.stringify(this.defaultStamps));
        this.saveStamps();
    },

    /**
     * Render the stamp palette in the sidebar
     */
    renderPalette(container, onSelect) {
        container.innerHTML = '';

        for (const [categoryId, category] of Object.entries(this.stamps)) {
            if (category.stamps.length === 0) continue;

            const categoryEl = document.createElement('div');
            categoryEl.className = 'stamp-category';
            categoryEl.innerHTML = `
                <div class="stamp-category-header">${category.name}</div>
                <div class="stamp-grid" data-category="${categoryId}"></div>
            `;

            const grid = categoryEl.querySelector('.stamp-grid');

            for (const stamp of category.stamps) {
                const stampEl = document.createElement('div');
                stampEl.className = 'stamp-item';
                stampEl.dataset.stampId = stamp.id;
                stampEl.innerHTML = `
                    <span class="stamp-icon">${stamp.icon}</span>
                    <span class="stamp-label">${stamp.name}</span>
                `;
                stampEl.addEventListener('click', () => onSelect(stamp));
                grid.appendChild(stampEl);
            }

            container.appendChild(categoryEl);
        }
    },

    /**
     * Render stamp selector for the modal
     */
    renderSelector(container, selectedId, onSelect) {
        container.innerHTML = '';

        const allStamps = this.getFlatStamps();

        for (const stamp of allStamps) {
            const option = document.createElement('div');
            option.className = 'stamp-option' + (stamp.id === selectedId ? ' selected' : '');
            option.dataset.stampId = stamp.id;
            option.textContent = stamp.icon;
            option.title = stamp.name;
            option.addEventListener('click', () => {
                container.querySelectorAll('.stamp-option').forEach(el => el.classList.remove('selected'));
                option.classList.add('selected');
                onSelect(stamp);
            });
            container.appendChild(option);
        }
    }
};
