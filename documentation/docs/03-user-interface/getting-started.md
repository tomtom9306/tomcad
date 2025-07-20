# Getting Started

This guide will walk you through the essential steps needed to begin working with TomCAD. You'll learn how to launch the application, create your first project, and build a simple steel structure.

## Launching TomCAD

### System Requirements

!!! note "Check Your Browser"
    
    Ensure you have one of the supported browsers installed:
    
    - Chrome 90+
    - Firefox 88+
    - Safari 14+
    - Edge 90+

### First Launch

1. **Open your web browser**
2. **Navigate to the TomCAD application**
3. **Wait for all modules to load**
4. **Verify the 3D view displays correctly**

!!! tip "Troubleshooting"
    
    If the application doesn't load properly:
    
    - Check your internet connection
    - Clear your browser cache
    - Disable ad blockers
    - Verify WebGL is enabled

## Creating a New Project

### Project Configuration

1. **Click "New Project"** or use ++ctrl+n++
2. **Enter project details**:
   - Project name
   - Project number
   - Client
   - Designer
3. **Select units**: We recommend **mm** for precision
4. **Set default material**: **S355JR** for steel structures
5. **Confirm creation**

### Basic Settings

=== "Units"
    
    - **Length**: millimetres (mm)
    - **Angles**: degrees (°)
    - **Mass**: kilograms (kg)
    - **Force**: kilonewtons (kN)

=== "Materials"
    
    - **S235JR**: Basic structural steel
    - **S355JR**: High-strength structural steel
    - **S460JR**: High-strength steel

=== "Tolerances"
    
    - **Dimensions**: ±2 mm
    - **Angles**: ±1°
    - **Holes**: +1/0 mm

## Setting Up Construction Grids

### Why Are Grids Important?

Construction grids are the foundation of precise modelling:

- Enable precise element positioning
- Facilitate modular structure modelling
- Ensure dimensional consistency
- Allow for parametric relationships

### Creating Your First Grid

1. **Navigate to the "Construction Grids" panel**
2. **Click "Add Rectangular Grid"**
3. **Configure spacings**:
   ```
   X Spacings: 6000, 6000, 6000 mm
   Y Spacings: 5000, 5000 mm
   Z Levels: 0, 3000, 6000 mm
   ```
4. **Assign labels**:
   ```
   X: 1, 2, 3, 4
   Y: A, B, C
   Z: 0, +3, +6
   ```

### Example Grid Configuration

```yaml
grid:
  type: rectangular
  origin: [0, 0, 0]
  x_spacings: [6000, 6000, 6000]
  y_spacings: [5000, 5000]
  z_levels: [0, 3000, 6000]
  x_labels: ["1", "2", "3", "4"]
  y_labels: ["A", "B", "C"]
  z_labels: ["0", "+3", "+6"]
```

## Creating Your First Elements

### Element 1: Column

1. **Select the "Column" tool** or press ++c++
2. **Click at grid intersection 1-A**
3. **Select profile**: `HEA200`
4. **Set height**: `3000 mm`
5. **Confirm creation**

!!! success "Parametric Connection"
    
    The column will be automatically linked to the construction grids. When the grid changes, the column position will be updated.

### Element 2: Beam

1. **Select the "Beam" tool** or press ++b++
2. **Click start point**: `1-A at level +3`
3. **Click end point**: `2-A at level +3`
4. **Select profile**: `IPE160`
5. **Check cross-section orientation**
6. **Confirm creation**

### Element 3: Plate

1. **Select the "Plate" tool** or press ++p++
2. **Set dimensions**: `200x200 mm`
3. **Thickness**: `12 mm`
4. **Place at beam end**
5. **Check orientation**

## Basic Operations

### Adding Holes

1. **Select an element** (e.g., column)
2. **Go to the "Operations" panel**
3. **Select "Circular Hole"**
4. **Set parameters**:
   - Diameter: `18 mm`
   - Position: `[100, 100, 1500]`
5. **Confirm operation**

### Copying Elements

1. **Select the element** to copy
2. **Use** ++ctrl+c++ **to copy**
3. **Use** ++ctrl+v++ **to paste**
4. **Move to new position**
5. **Confirm new position**

## Navigation and Views

### Camera Controls

| Action | Method |
|--------|--------|
| **Rotation** | Left mouse button + drag |
| **Panning** | Middle mouse button + drag |
| **Zooming** | Mouse wheel |
| **Fit View** | Press ++f++ |

### Standard Views

| View | Key |
|------|-----|
| Isometric | ++7++ |
| Front | ++1++ |
| Top | ++5++ |
| Right | ++3++ |

### Navigation Cube

- **Click cube faces** for standard views
- **Drag the cube** for camera rotation
- **Click "home"** for start view

## Saving Your Project

### Automatic Saving

!!! info "Autosave"
    
    TomCAD automatically saves your project every **5 minutes** in browser memory.

### Manual Saving

1. **Press** ++ctrl+s++
2. **Or click "Save"** in the menu
3. **Project saves locally**

### Export to IFC

1. **Go to the "Export" menu**
2. **Select IFC format**
3. **Set export parameters**
4. **Click "Export"**
5. **Choose file location**

## Common Beginner Mistakes

### ❌ Mistake 1: Incorrect Positioning

**Problem**: Elements are not aligned

**Solution**: 
- Always define construction grids before modelling
- Use grid snapping
- Check snapping tolerances

### ❌ Mistake 2: Wrong Profiles

**Problem**: Selected inappropriate profile

**Solution**:
- Check profile availability from suppliers
- Consult structural standards
- Use manufacturer catalogues

### ❌ Mistake 3: Missing Operations

**Problem**: Forgetting about holes

**Solution**:
- Plan connections in advance
- Add holes after creating elements
- Use bolt groups

### ❌ Mistake 4: Incorrect Units

**Problem**: Mixing mm and cm

**Solution**:
- Set units at the beginning of the project
- Consistently use mm
- Check imported data

## Next Steps

After completing this guide, you should be able to:

- Launch TomCAD
- Create a new project
- Define construction grids
- Add basic elements
- Perform basic operations
- Save your project

### Further Steps

1. **Learn the interface thoroughly** → [User Interface](../intro/interface.md)
2. **Master steel profiles** → [Steel Profiles](../basics/profiles.md)
3. **Advanced connections** → [Connections](../modeling/connections.md)
4. **Export to other formats** → [Import/Export](../import-export/export.md)

!!! tip "Practice"
    
    The best way to learn is through practice. Try creating a simple steel frame using your acquired knowledge.