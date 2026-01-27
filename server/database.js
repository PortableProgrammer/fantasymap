/**
 * Fantasy Map Builder - Database Module
 * SQLite database setup and queries
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Database file path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'fantasymap.db');

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
function initSchema() {
    db.exec(`
        -- Worlds table (container for multiple maps)
        CREATE TABLE IF NOT EXISTS worlds (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        -- Maps table (individual maps within a world)
        CREATE TABLE IF NOT EXISTS maps (
            id TEXT PRIMARY KEY,
            world_id TEXT NOT NULL,
            name TEXT NOT NULL,
            image_data TEXT,
            width INTEGER DEFAULT 0,
            height INTEGER DEFAULT 0,
            scale_value REAL DEFAULT 1,
            scale_unit TEXT DEFAULT 'miles',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
        );

        -- Locations table (markers on maps)
        CREATE TABLE IF NOT EXISTS locations (
            id TEXT PRIMARY KEY,
            map_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            wiki_link TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            stamp_id TEXT DEFAULT 'pin',
            x REAL NOT NULL,
            y REAL NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
        );

        -- Custom stamps table (per-world custom stamps)
        CREATE TABLE IF NOT EXISTS custom_stamps (
            id TEXT PRIMARY KEY,
            world_id TEXT NOT NULL,
            icon TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'custom',
            created_at INTEGER NOT NULL,
            FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
        );

        -- Travel settings table (per-world travel configuration)
        CREATE TABLE IF NOT EXISTS travel_settings (
            id TEXT PRIMARY KEY,
            world_id TEXT UNIQUE NOT NULL,
            walking_speed REAL DEFAULT 3,
            horse_speed REAL DEFAULT 8,
            wagon_speed REAL DEFAULT 4,
            hours_per_day INTEGER DEFAULT 8,
            FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
        );

        -- Create indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_maps_world_id ON maps(world_id);
        CREATE INDEX IF NOT EXISTS idx_locations_map_id ON locations(map_id);
        CREATE INDEX IF NOT EXISTS idx_custom_stamps_world_id ON custom_stamps(world_id);
    `);
}

// Initialize schema on module load
initSchema();

/**
 * World operations
 */
const WorldsDB = {
    getAll() {
        return db.prepare(`
            SELECT w.*,
                   COUNT(DISTINCT m.id) as map_count,
                   COUNT(DISTINCT l.id) as location_count
            FROM worlds w
            LEFT JOIN maps m ON m.world_id = w.id
            LEFT JOIN locations l ON l.map_id = m.id
            GROUP BY w.id
            ORDER BY w.updated_at DESC
        `).all();
    },

    getById(id) {
        return db.prepare('SELECT * FROM worlds WHERE id = ?').get(id);
    },

    create(data) {
        const id = uuidv4();
        const now = Date.now();
        db.prepare(`
            INSERT INTO worlds (id, name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, data.name || 'New World', data.description || '', now, now);

        // Create default travel settings for this world
        TravelSettingsDB.create(id);

        return this.getById(id);
    },

    update(id, data) {
        const now = Date.now();
        const fields = [];
        const values = [];

        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }

        if (fields.length > 0) {
            fields.push('updated_at = ?');
            values.push(now);
            values.push(id);

            db.prepare(`UPDATE worlds SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        }

        return this.getById(id);
    },

    delete(id) {
        db.prepare('DELETE FROM worlds WHERE id = ?').run(id);
        return { success: true };
    }
};

/**
 * Map operations
 */
const MapsDB = {
    getByWorldId(worldId) {
        return db.prepare(`
            SELECT m.*, COUNT(l.id) as location_count
            FROM maps m
            LEFT JOIN locations l ON l.map_id = m.id
            WHERE m.world_id = ?
            GROUP BY m.id
            ORDER BY m.updated_at DESC
        `).all(worldId);
    },

    getById(id) {
        return db.prepare('SELECT * FROM maps WHERE id = ?').get(id);
    },

    create(data) {
        const id = uuidv4();
        const now = Date.now();
        db.prepare(`
            INSERT INTO maps (id, world_id, name, image_data, width, height, scale_value, scale_unit, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.world_id,
            data.name || 'New Map',
            data.image_data || null,
            data.width || 0,
            data.height || 0,
            data.scale_value || 1,
            data.scale_unit || 'miles',
            now,
            now
        );
        return this.getById(id);
    },

    update(id, data) {
        const now = Date.now();
        const fields = [];
        const values = [];

        const allowedFields = ['name', 'image_data', 'width', 'height', 'scale_value', 'scale_unit'];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (fields.length > 0) {
            fields.push('updated_at = ?');
            values.push(now);
            values.push(id);

            db.prepare(`UPDATE maps SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        }

        return this.getById(id);
    },

    delete(id) {
        db.prepare('DELETE FROM maps WHERE id = ?').run(id);
        return { success: true };
    }
};

/**
 * Location operations
 */
const LocationsDB = {
    getByMapId(mapId) {
        return db.prepare('SELECT * FROM locations WHERE map_id = ? ORDER BY created_at ASC').all(mapId);
    },

    getById(id) {
        return db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
    },

    create(data) {
        const id = uuidv4();
        const now = Date.now();
        db.prepare(`
            INSERT INTO locations (id, map_id, name, description, wiki_link, notes, stamp_id, x, y, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.map_id,
            data.name || 'New Location',
            data.description || '',
            data.wiki_link || '',
            data.notes || '',
            data.stamp_id || 'pin',
            data.x,
            data.y,
            now,
            now
        );
        return this.getById(id);
    },

    update(id, data) {
        const now = Date.now();
        const fields = [];
        const values = [];

        const allowedFields = ['name', 'description', 'wiki_link', 'notes', 'stamp_id', 'x', 'y'];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (fields.length > 0) {
            fields.push('updated_at = ?');
            values.push(now);
            values.push(id);

            db.prepare(`UPDATE locations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        }

        return this.getById(id);
    },

    delete(id) {
        db.prepare('DELETE FROM locations WHERE id = ?').run(id);
        return { success: true };
    },

    deleteByMapId(mapId) {
        db.prepare('DELETE FROM locations WHERE map_id = ?').run(mapId);
        return { success: true };
    }
};

/**
 * Custom stamps operations
 */
const CustomStampsDB = {
    getByWorldId(worldId) {
        return db.prepare('SELECT * FROM custom_stamps WHERE world_id = ? ORDER BY created_at ASC').all(worldId);
    },

    create(data) {
        const id = uuidv4();
        const now = Date.now();
        db.prepare(`
            INSERT INTO custom_stamps (id, world_id, icon, name, category, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, data.world_id, data.icon, data.name, data.category || 'custom', now);
        return db.prepare('SELECT * FROM custom_stamps WHERE id = ?').get(id);
    },

    delete(id) {
        db.prepare('DELETE FROM custom_stamps WHERE id = ?').run(id);
        return { success: true };
    }
};

/**
 * Travel settings operations
 */
const TravelSettingsDB = {
    getByWorldId(worldId) {
        return db.prepare('SELECT * FROM travel_settings WHERE world_id = ?').get(worldId);
    },

    create(worldId) {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO travel_settings (id, world_id, walking_speed, horse_speed, wagon_speed, hours_per_day)
            VALUES (?, ?, 3, 8, 4, 8)
        `).run(id, worldId);
        return this.getByWorldId(worldId);
    },

    update(worldId, data) {
        const fields = [];
        const values = [];

        const allowedFields = ['walking_speed', 'horse_speed', 'wagon_speed', 'hours_per_day'];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (fields.length > 0) {
            values.push(worldId);
            db.prepare(`UPDATE travel_settings SET ${fields.join(', ')} WHERE world_id = ?`).run(...values);
        }

        return this.getByWorldId(worldId);
    }
};

module.exports = {
    db,
    WorldsDB,
    MapsDB,
    LocationsDB,
    CustomStampsDB,
    TravelSettingsDB
};
