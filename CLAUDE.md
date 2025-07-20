# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TomCAD is a web-based 3D CAD application for structural steel design. The application uses pure JavaScript with Three.js for 3D rendering and follows a component-based assembly architecture.

## Architecture

### Core Components
- `src/core/BeamViewer.js` - Main orchestrator that initializes and manages all modules
- `src/core/core.js` - Component registry and base architecture definitions
- `src/core/EventBus.js` - Central event system for module communication
- `src/data/struktura.js` - Main project data model
- `src/data/profiles.js` - Steel profile definitions and specifications

### Module System
The application follows a modular architecture with clear separation:

**Managers** (`src/managers/`):
- `CreationManager.js` - Manages element creation workflow
- `OperationManager.js` - Handles operations like holes, slots, cuts
- `SelectionManager.js` - Manages element selection and highlighting
- `UIManager.js` - Coordinates UI panels and interactions
- `CopyManager.js` - Handles copy/paste operations
- `GridManager.js` - Manages grid display and snapping
- `ProfileManager.js` - Manages steel profile data
- `SnapManager.js` - Handles geometric snapping

**Components** (`src/components/`):
- **Creators** (`creators/`): Extensible system for different element types (Beam, Column, GoalPost, etc.)
- **Operations** (`operations/`): Hole, slot, and cut operations on structural elements
- **Elements** (`elements/`): Core element factories and modifiers

**UI Components** (`src/ui/panels/`):
- Modular panels for creation, editing, and element management
- Event-driven communication with core application

**Utilities** (`src/utils/`):
- `GeometryUtils.js` - Shared geometric calculations and utilities

**Rendering** (`src/rendering/`):
- `CameraControls.js` - Camera manipulation and controls
- `ViewCube.js` - 3D navigation cube widget
- `DragControls.js` - Object dragging interactions

**Export** (`src/export/`):
- `ImportExport.js` - File import/export functionality

### Data Model
- Two-file approach: project data (`struktura.js`) and steel profiles (`profiles.js`)
- Components have stable IDs and attachment points for assembly
- Brute-force regeneration on changes ensures data consistency
- Full Three.js scene reconstruction maintains visual accuracy

## Development Workflow

### No Build System
- Direct JavaScript file loading via `<script type="module">`
- Loading order is critical - defined in `index.html`
- Live development via browser refresh

### File Loading Order
1. Core utilities and data models
2. Three.js and dependencies
3. Event system and managers
4. UI components and creators
5. Main application (`BeamViewer.js`)

### Adding New Components
1. Create creator in `src/components/creators/` directory
2. Define component logic and Three.js geometry
3. Register in `src/managers/CreationManager.js`
4. Add UI panel in `src/ui/panels/` if needed
5. Handle events through `src/core/EventBus.js`

### Key Patterns
- **Component-based**: Elements decompose into atomic components
- **Event-driven**: Use `EventBus.emit()` and `EventBus.on()` for communication
- **Extensible**: New element types follow creator pattern
- **Regenerative**: Data changes trigger full scene reconstruction

## Features

### 3D Rendering
- Three.js v0.178.0 for WebGL rendering
- Interactive 3D viewport with orbit controls
- Real-time visual feedback during creation and editing

### Steel Design
- Comprehensive steel profile database
- Structural connections and assemblies
- Goal post and truss systems
- Hole, slot, and cut operations

### Export Capabilities
- IFC format export for CAD interoperability
- Preserves geometry and structural properties

## Technology Guidelines

### Allowed Technologies
- **HTML** - For DOM structure and markup
- **CSS** - For styling and responsive design
- **JavaScript (ES6+)** - Core application logic using modern JavaScript features
- **Three.js** - Primary 3D rendering library (currently v0.178.0)
- **Three.js Extensions** - Official Three.js libraries for specific functionality:
  - CSG libraries for cutting operations (e.g., three-csg-ts, three-bvh-csg)
  - Other official Three.js addons as needed

### Restricted Technologies
- **No build systems** - Keep direct file loading approach
- **No frameworks** - Maintain vanilla JavaScript architecture
- **No external dependencies** - Beyond Three.js and its official extensions
- **No compilation** - Pure JavaScript modules only

### Integration Guidelines
- Use `<script type="module">` for all JavaScript files
- Maintain existing file loading order in `index.html`
- Three.js cutting libraries should integrate with existing `OperationManager.js`
- All new functionality must work with current event-driven architecture

## Code Conventions

- ES6+ modules with `import/export`
- Component classes extend base classes from `src/core/core.js`
- Event-driven architecture using central `EventBus`
- Consistent naming: PascalCase for classes, camelCase for methods
- Three.js objects stored in component `.object` property