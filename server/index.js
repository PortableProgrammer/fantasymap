/**
 * Fantasy Map Builder - Express Server
 * REST API for worlds, maps, locations, and settings
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { WorldsDB, MapsDB, LocationsDB, CustomStampsDB, TravelSettingsDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ============================================
// WORLDS API
// ============================================

// Get all worlds
app.get('/api/worlds', asyncHandler(async (req, res) => {
    const worlds = WorldsDB.getAll();
    res.json(worlds);
}));

// Get single world
app.get('/api/worlds/:id', asyncHandler(async (req, res) => {
    const world = WorldsDB.getById(req.params.id);
    if (!world) {
        return res.status(404).json({ error: 'World not found' });
    }
    res.json(world);
}));

// Create world
app.post('/api/worlds', asyncHandler(async (req, res) => {
    const world = WorldsDB.create(req.body);
    res.status(201).json(world);
}));

// Update world
app.put('/api/worlds/:id', asyncHandler(async (req, res) => {
    const world = WorldsDB.update(req.params.id, req.body);
    if (!world) {
        return res.status(404).json({ error: 'World not found' });
    }
    res.json(world);
}));

// Delete world
app.delete('/api/worlds/:id', asyncHandler(async (req, res) => {
    WorldsDB.delete(req.params.id);
    res.json({ success: true });
}));

// ============================================
// MAPS API
// ============================================

// Get all maps for a world
app.get('/api/worlds/:worldId/maps', asyncHandler(async (req, res) => {
    const maps = MapsDB.getByWorldId(req.params.worldId);
    res.json(maps);
}));

// Get single map
app.get('/api/maps/:id', asyncHandler(async (req, res) => {
    const map = MapsDB.getById(req.params.id);
    if (!map) {
        return res.status(404).json({ error: 'Map not found' });
    }
    res.json(map);
}));

// Create map
app.post('/api/worlds/:worldId/maps', asyncHandler(async (req, res) => {
    const map = MapsDB.create({
        ...req.body,
        world_id: req.params.worldId
    });
    res.status(201).json(map);
}));

// Update map
app.put('/api/maps/:id', asyncHandler(async (req, res) => {
    const map = MapsDB.update(req.params.id, req.body);
    if (!map) {
        return res.status(404).json({ error: 'Map not found' });
    }
    res.json(map);
}));

// Delete map
app.delete('/api/maps/:id', asyncHandler(async (req, res) => {
    MapsDB.delete(req.params.id);
    res.json({ success: true });
}));

// ============================================
// LOCATIONS API
// ============================================

// Get all locations for a map
app.get('/api/maps/:mapId/locations', asyncHandler(async (req, res) => {
    const locations = LocationsDB.getByMapId(req.params.mapId);
    res.json(locations);
}));

// Get single location
app.get('/api/locations/:id', asyncHandler(async (req, res) => {
    const location = LocationsDB.getById(req.params.id);
    if (!location) {
        return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
}));

// Create location
app.post('/api/maps/:mapId/locations', asyncHandler(async (req, res) => {
    const location = LocationsDB.create({
        ...req.body,
        map_id: req.params.mapId
    });
    res.status(201).json(location);
}));

// Update location
app.put('/api/locations/:id', asyncHandler(async (req, res) => {
    const location = LocationsDB.update(req.params.id, req.body);
    if (!location) {
        return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
}));

// Delete location
app.delete('/api/locations/:id', asyncHandler(async (req, res) => {
    LocationsDB.delete(req.params.id);
    res.json({ success: true });
}));

// ============================================
// CUSTOM STAMPS API
// ============================================

// Get custom stamps for a world
app.get('/api/worlds/:worldId/stamps', asyncHandler(async (req, res) => {
    const stamps = CustomStampsDB.getByWorldId(req.params.worldId);
    res.json(stamps);
}));

// Create custom stamp
app.post('/api/worlds/:worldId/stamps', asyncHandler(async (req, res) => {
    const stamp = CustomStampsDB.create({
        ...req.body,
        world_id: req.params.worldId
    });
    res.status(201).json(stamp);
}));

// Delete custom stamp
app.delete('/api/stamps/:id', asyncHandler(async (req, res) => {
    CustomStampsDB.delete(req.params.id);
    res.json({ success: true });
}));

// ============================================
// TRAVEL SETTINGS API
// ============================================

// Get travel settings for a world
app.get('/api/worlds/:worldId/travel-settings', asyncHandler(async (req, res) => {
    let settings = TravelSettingsDB.getByWorldId(req.params.worldId);
    if (!settings) {
        settings = TravelSettingsDB.create(req.params.worldId);
    }
    res.json(settings);
}));

// Update travel settings
app.put('/api/worlds/:worldId/travel-settings', asyncHandler(async (req, res) => {
    const settings = TravelSettingsDB.update(req.params.worldId, req.body);
    res.json(settings);
}));

// ============================================
// EXPORT/IMPORT API
// ============================================

// Export world data
app.get('/api/worlds/:worldId/export', asyncHandler(async (req, res) => {
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
app.post('/api/import', asyncHandler(async (req, res) => {
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
});
