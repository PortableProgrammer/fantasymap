/**
 * Fantasy Map Builder - Express Server
 * REST API for worlds, maps, locations, and settings
 * With session-based authentication
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const { UsersDB, WorldsDB, MapsDB, LocationsDB, CustomStampsDB, TravelSettingsDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Generate a random session secret if not provided
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Check if user is authenticated
 */
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// ============================================
// AUTH API
// ============================================

// Check auth status and if setup is needed
app.get('/api/auth/status', asyncHandler(async (req, res) => {
    const hasUsers = UsersDB.hasUsers();
    const user = req.session.userId ? UsersDB.getById(req.session.userId) : null;

    res.json({
        authenticated: !!user,
        user: user,
        needsSetup: !hasUsers
    });
}));

// Register (only allowed if no users exist, or if authenticated)
app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const { username, password, display_name } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Only allow registration if no users exist (first user setup)
    // or if user is already authenticated (admin creating new user)
    const hasUsers = UsersDB.hasUsers();
    if (hasUsers && !req.session.userId) {
        return res.status(403).json({ error: 'Registration is not open' });
    }

    try {
        const user = await UsersDB.create({
            username,
            password,
            display_name: display_name || username
        });

        // Auto-login after registration
        req.session.userId = user.id;

        res.status(201).json({
            success: true,
            user
        });
    } catch (err) {
        if (err.message === 'Username already exists') {
            return res.status(409).json({ error: err.message });
        }
        throw err;
    }
}));

// Login
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await UsersDB.verifyPassword(username, password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;

    res.json({
        success: true,
        user
    });
}));

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true });
    });
});

// Change password (authenticated users only)
app.post('/api/auth/change-password', requireAuth, asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Verify current password
    const user = UsersDB.getById(req.session.userId);
    const verified = await UsersDB.verifyPassword(user.username, current_password);
    if (!verified) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }

    await UsersDB.updatePassword(req.session.userId, new_password);

    res.json({ success: true });
}));

// ============================================
// WORLDS API (Protected)
// ============================================

// Get all worlds
app.get('/api/worlds', requireAuth, asyncHandler(async (req, res) => {
    const worlds = WorldsDB.getAll();
    res.json(worlds);
}));

// Get single world
app.get('/api/worlds/:id', requireAuth, asyncHandler(async (req, res) => {
    const world = WorldsDB.getById(req.params.id);
    if (!world) {
        return res.status(404).json({ error: 'World not found' });
    }
    res.json(world);
}));

// Create world
app.post('/api/worlds', requireAuth, asyncHandler(async (req, res) => {
    const world = WorldsDB.create(req.body);
    res.status(201).json(world);
}));

// Update world
app.put('/api/worlds/:id', requireAuth, asyncHandler(async (req, res) => {
    const world = WorldsDB.update(req.params.id, req.body);
    if (!world) {
        return res.status(404).json({ error: 'World not found' });
    }
    res.json(world);
}));

// Delete world
app.delete('/api/worlds/:id', requireAuth, asyncHandler(async (req, res) => {
    WorldsDB.delete(req.params.id);
    res.json({ success: true });
}));

// ============================================
// MAPS API (Protected)
// ============================================

// Get all maps for a world
app.get('/api/worlds/:worldId/maps', requireAuth, asyncHandler(async (req, res) => {
    const maps = MapsDB.getByWorldId(req.params.worldId);
    res.json(maps);
}));

// Get single map
app.get('/api/maps/:id', requireAuth, asyncHandler(async (req, res) => {
    const map = MapsDB.getById(req.params.id);
    if (!map) {
        return res.status(404).json({ error: 'Map not found' });
    }
    res.json(map);
}));

// Create map
app.post('/api/worlds/:worldId/maps', requireAuth, asyncHandler(async (req, res) => {
    const map = MapsDB.create({
        ...req.body,
        world_id: req.params.worldId
    });
    res.status(201).json(map);
}));

// Update map
app.put('/api/maps/:id', requireAuth, asyncHandler(async (req, res) => {
    const map = MapsDB.update(req.params.id, req.body);
    if (!map) {
        return res.status(404).json({ error: 'Map not found' });
    }
    res.json(map);
}));

// Delete map
app.delete('/api/maps/:id', requireAuth, asyncHandler(async (req, res) => {
    MapsDB.delete(req.params.id);
    res.json({ success: true });
}));

// ============================================
// LOCATIONS API (Protected)
// ============================================

// Get all locations for a map
app.get('/api/maps/:mapId/locations', requireAuth, asyncHandler(async (req, res) => {
    const locations = LocationsDB.getByMapId(req.params.mapId);
    res.json(locations);
}));

// Get single location
app.get('/api/locations/:id', requireAuth, asyncHandler(async (req, res) => {
    const location = LocationsDB.getById(req.params.id);
    if (!location) {
        return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
}));

// Create location
app.post('/api/maps/:mapId/locations', requireAuth, asyncHandler(async (req, res) => {
    const location = LocationsDB.create({
        ...req.body,
        map_id: req.params.mapId
    });
    res.status(201).json(location);
}));

// Update location
app.put('/api/locations/:id', requireAuth, asyncHandler(async (req, res) => {
    const location = LocationsDB.update(req.params.id, req.body);
    if (!location) {
        return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
}));

// Delete location
app.delete('/api/locations/:id', requireAuth, asyncHandler(async (req, res) => {
    LocationsDB.delete(req.params.id);
    res.json({ success: true });
}));

// ============================================
// CUSTOM STAMPS API (Protected)
// ============================================

// Get custom stamps for a world
app.get('/api/worlds/:worldId/stamps', requireAuth, asyncHandler(async (req, res) => {
    const stamps = CustomStampsDB.getByWorldId(req.params.worldId);
    res.json(stamps);
}));

// Create custom stamp
app.post('/api/worlds/:worldId/stamps', requireAuth, asyncHandler(async (req, res) => {
    const stamp = CustomStampsDB.create({
        ...req.body,
        world_id: req.params.worldId
    });
    res.status(201).json(stamp);
}));

// Delete custom stamp
app.delete('/api/stamps/:id', requireAuth, asyncHandler(async (req, res) => {
    CustomStampsDB.delete(req.params.id);
    res.json({ success: true });
}));

// ============================================
// TRAVEL SETTINGS API (Protected)
// ============================================

// Get travel settings for a world
app.get('/api/worlds/:worldId/travel-settings', requireAuth, asyncHandler(async (req, res) => {
    let settings = TravelSettingsDB.getByWorldId(req.params.worldId);
    if (!settings) {
        settings = TravelSettingsDB.create(req.params.worldId);
    }
    res.json(settings);
}));

// Update travel settings
app.put('/api/worlds/:worldId/travel-settings', requireAuth, asyncHandler(async (req, res) => {
    const settings = TravelSettingsDB.update(req.params.worldId, req.body);
    res.json(settings);
}));

// ============================================
// EXPORT/IMPORT API (Protected)
// ============================================

// Export world data
app.get('/api/worlds/:worldId/export', requireAuth, asyncHandler(async (req, res) => {
    const world = WorldsDB.getById(req.params.worldId);
    if (!world) {
        return res.status(404).json({ error: 'World not found' });
    }

    const maps = MapsDB.getByWorldId(req.params.worldId);
    const customStamps = CustomStampsDB.getByWorldId(req.params.worldId);
    const travelSettings = TravelSettingsDB.getByWorldId(req.params.worldId);

    // Get locations for each map
    const mapsWithLocations = maps.map(map => ({
        ...map,
        locations: LocationsDB.getByMapId(map.id)
    }));

    res.json({
        version: '2.0.0',
        exportedAt: Date.now(),
        world,
        maps: mapsWithLocations,
        customStamps,
        travelSettings
    });
}));

// Import world data
app.post('/api/import', requireAuth, asyncHandler(async (req, res) => {
    const data = req.body;

    if (!data.world) {
        return res.status(400).json({ error: 'Invalid import data' });
    }

    // Create the world
    const world = WorldsDB.create({
        name: data.world.name + ' (Imported)',
        description: data.world.description
    });

    // Import travel settings
    if (data.travelSettings) {
        TravelSettingsDB.update(world.id, data.travelSettings);
    }

    // Import custom stamps
    if (data.customStamps) {
        for (const stamp of data.customStamps) {
            CustomStampsDB.create({
                world_id: world.id,
                icon: stamp.icon,
                name: stamp.name,
                category: stamp.category
            });
        }
    }

    // Import maps and locations
    if (data.maps) {
        for (const mapData of data.maps) {
            const map = MapsDB.create({
                world_id: world.id,
                name: mapData.name,
                image_data: mapData.image_data,
                width: mapData.width,
                height: mapData.height,
                scale_value: mapData.scale_value,
                scale_unit: mapData.scale_unit
            });

            if (mapData.locations) {
                for (const loc of mapData.locations) {
                    LocationsDB.create({
                        map_id: map.id,
                        name: loc.name,
                        description: loc.description,
                        wiki_link: loc.wiki_link,
                        notes: loc.notes,
                        stamp_id: loc.stamp_id,
                        x: loc.x,
                        y: loc.y
                    });
                }
            }
        }
    }

    res.status(201).json({ success: true, world });
}));

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Fantasy Map Builder server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);

    // Check if first-time setup is needed
    if (!UsersDB.hasUsers()) {
        console.log('\n*** First-time setup required ***');
        console.log('Open the application in your browser to create the first user.');
    }
});
