# Fantasy Map Builder

An interactive map application for fantasy writers and worldbuilders. Create custom maps with location markers, calculate travel times, and link to your wiki.

## Features

### Multiple Worlds & Maps
- Organize your worldbuilding with **multiple worlds**
- Each world can have **multiple maps** (regional, city, dungeon, etc.)
- **SQLite database** stores everything - access from any machine
- Export/import worlds as JSON files

### Interactive Map
- **Pan and zoom** your custom map images (like Google Maps)
- **Upload any image** as your map background
- Supports high-resolution images for detailed exploration

### Stamp/Marker System
- **40+ built-in stamps** organized by category:
  - Settlements (cities, towns, villages, castles, ruins)
  - Nature (mountains, forests, lakes, rivers)
  - Dungeons & POI (temples, towers, mines, treasure)
  - Markers (stars, flags, quest markers)
  - Travel (waypoints, inns, stables, bridges)
- **Create custom stamps** with any emoji (saved per-world)
- **Drag markers** to reposition them
- Click markers to view/edit details

### Travel Time Calculator
- Calculate distances between any two points
- **Three travel modes**:
  - Walking (default: 3 mph)
  - Horse (default: 8 mph)
  - Wagon (default: 4 mph)
- **Route planning** - click multiple waypoints to plan a journey
- Customizable travel speeds (saved per-world)
- Results shown in days and hours

### Wiki Integration
- Add wiki links to any location
- Click to open your wiki page in a new tab
- Perfect for integration with:
  - Obsidian
  - Notion
  - World Anvil
  - Campfire
  - Any wiki system

## Getting Started

### 1. Start the Server

```bash
cd server
npm install
npm start
```

The server will start at http://localhost:3000

### 2. Open the Application

Open your browser to http://localhost:3000

### 3. Create Your First World

1. Click the **+** button next to the World dropdown
2. Enter a name and description for your world
3. Click **Save**

### 4. Add a Map

1. Select your world from the dropdown
2. Click the **+** button next to the Map dropdown
3. Enter a map name and upload an image
4. Click **Save**

### 5. Start Mapping!

1. **Set the scale** at the bottom of the screen (e.g., "0.5 miles per pixel")
2. **Select a stamp** from the left sidebar
3. **Click on the map** to place markers
4. **Edit markers** by clicking on them

## Tools

| Tool | Description |
|------|-------------|
| ✋ Select | Pan the map and select markers |
| 📍 Stamp | Place new location markers |
| 📏 Measure | Measure distance between two points |
| 🛤️ Route | Plan a multi-point route |

## Database

All data is stored in a SQLite database file (`server/fantasymap.db`). This includes:
- Worlds and their settings
- Maps and their images
- All location markers
- Custom stamps
- Travel speed settings

### Backup

To backup your data, simply copy the `server/fantasymap.db` file.

### Multi-Machine Access

To use from multiple machines:
1. Run the server on a machine accessible on your network
2. Access via `http://<server-ip>:3000`

Or deploy to a cloud server (VPS, etc.) for anywhere access.

## API Reference

The server provides a REST API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/worlds` | GET | List all worlds |
| `/api/worlds` | POST | Create a world |
| `/api/worlds/:id` | GET | Get a world |
| `/api/worlds/:id` | PUT | Update a world |
| `/api/worlds/:id` | DELETE | Delete a world |
| `/api/worlds/:id/maps` | GET | List maps in a world |
| `/api/worlds/:id/maps` | POST | Create a map |
| `/api/maps/:id` | GET | Get a map |
| `/api/maps/:id` | PUT | Update a map |
| `/api/maps/:id` | DELETE | Delete a map |
| `/api/maps/:id/locations` | GET | List locations on a map |
| `/api/maps/:id/locations` | POST | Create a location |
| `/api/locations/:id` | PUT | Update a location |
| `/api/locations/:id` | DELETE | Delete a location |
| `/api/worlds/:id/export` | GET | Export world as JSON |
| `/api/import` | POST | Import a world from JSON |

## File Structure

```
fantasymap/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── api.js          # API client
│   ├── app.js          # Main application logic
│   ├── map.js          # Leaflet map handling
│   ├── markers.js      # Location marker management
│   ├── stamps.js       # Stamp definitions
│   ├── storage.js      # Legacy storage (for export)
│   └── travel.js       # Travel time calculator
└── server/
    ├── package.json    # Node.js dependencies
    ├── index.js        # Express server
    ├── database.js     # SQLite database module
    └── fantasymap.db   # Database file (created on first run)
```

## Configuration

### Server Port

Set the `PORT` environment variable:
```bash
PORT=8080 npm start
```

### Database Location

Set the `DB_PATH` environment variable:
```bash
DB_PATH=/path/to/fantasymap.db npm start
```

## Tips for Worldbuilders

1. **Organize by world** - Keep different story settings separate
2. **Multiple maps per world** - Regional overview + detailed city maps
3. **Use consistent naming** - Helps with wiki linking
4. **Add notes** - Future you will thank present you
5. **Export regularly** - Keep JSON backups of your worlds
6. **Use route planning** - Visualize your characters' journeys

## License

MIT License - feel free to use and modify for your projects!
