# Fantasy Map Builder

An interactive map application for fantasy writers and worldbuilders. Create custom maps with location markers, calculate travel times, and link to your wiki.

## Features

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
- **Create custom stamps** with any emoji
- **Drag markers** to reposition them
- Click markers to view/edit details

### Travel Time Calculator
- Calculate distances between any two points
- **Three travel modes**:
  - Walking (default: 3 mph)
  - Horse (default: 8 mph)
  - Wagon (default: 4 mph)
- **Route planning** - click multiple waypoints to plan a journey
- Customizable travel speeds
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

### Save/Load Projects
- **Auto-saves** to browser storage
- **Export/Import** as JSON files
- Share projects between devices
- Backup your worldbuilding work

## Getting Started

1. **Open** `index.html` in your web browser
2. **Upload** your fantasy map image using the "Upload Map" button
3. **Set the scale** at the bottom of the screen (e.g., "0.5 miles per pixel")
4. **Select a stamp** from the left sidebar
5. **Click on the map** to place markers
6. **Edit markers** by clicking on them

## Tools

| Tool | Description |
|------|-------------|
| ✋ Select | Pan the map and select markers |
| 📍 Stamp | Place new location markers |
| 📏 Measure | Measure distance between two points |
| 🛤️ Route | Plan a multi-point route |

## Keyboard Shortcuts

- **Scroll wheel**: Zoom in/out
- **Click + drag**: Pan the map
- **Click marker**: Select and view details

## Setting the Map Scale

For accurate travel times, set your map scale:

1. Determine the real-world distance represented by your map
2. Adjust the "Map Scale" settings at the bottom of the screen
3. Enter how many miles/km/leagues each pixel represents

**Tip**: If your 1000-pixel-wide map represents 500 miles, the scale is 0.5 miles per pixel.

## Customizing Travel Speeds

The default travel speeds are based on historical averages:

| Mode | Default Speed | Notes |
|------|---------------|-------|
| Walking | 3 mph | Average hiking pace |
| Horse | 8 mph | Sustainable travel pace |
| Wagon | 4 mph | Loaded cart on roads |

Adjust these in the travel calculator based on your world's conditions (terrain, magic, etc.).

## File Structure

```
fantasymap/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── app.js          # Main application logic
│   ├── map.js          # Leaflet map handling
│   ├── markers.js      # Location marker management
│   ├── stamps.js       # Stamp definitions
│   ├── storage.js      # Save/load functionality
│   └── travel.js       # Travel time calculator
└── assets/
    └── stamps/         # (Optional) Custom stamp images
```

## Browser Support

Works in all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## Tips for Worldbuilders

1. **Start with a rough map** - you can always replace it later
2. **Use consistent naming** - helps with wiki linking
3. **Add notes** - future you will thank present you
4. **Export regularly** - keep backups of your project
5. **Use route planning** - visualize your characters' journeys

## License

MIT License - feel free to use and modify for your projects!
