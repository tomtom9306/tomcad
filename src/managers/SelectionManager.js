// Selection management functionality
window.SelectionManager = class SelectionManager {
    constructor(scene, camera, renderer, elementManager, cameraControls, snapManager, selectionBox, eventBus, raycaster) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.elementManager = elementManager;
        this.cameraControls = cameraControls;
        this.snapManager = snapManager;
        this.raycaster = raycaster;
        this.beamObjects = elementManager.beamObjects;
        this.eventBus = eventBus;
        
        // Selection state
        this.selectedElements = [];
        this.selectionType = 'element'; // 'element' or 'gridline'
        
        // Initialize helper classes
        this.controlPointManager = new window.ControlPointManager(
            scene, camera, renderer, elementManager, cameraControls, snapManager, eventBus
        );
        
        this.boxSelection = new window.BoxSelection(
            camera, renderer, elementManager, selectionBox
        );
        
        this.gridSelectionHandler = new window.GridSelectionHandler(
            elementManager, this.controlPointManager
        );
        
        this.mouseHandler = new window.SelectionMouseHandler(
            scene, camera, renderer, raycaster, elementManager, this, 
            this.boxSelection, this.controlPointManager
        );

        // Subscribe to events from the dispatcher
        if (this.eventBus) {
            this.eventBus.subscribe('selection:mouseDown', (data) => this.mouseHandler.onMouseDown(data.event));
            this.eventBus.subscribe('selection:mouseMove', (data) => this.mouseHandler.onMouseMove(data.event));
            this.eventBus.subscribe('selection:mouseUp', (data) => this.mouseHandler.onMouseUp(data.event));
            this.eventBus.subscribe('viewer:escapePressed', () => this.clearSelection());
        }
    }

    isDragging() {
        return this.controlPointManager.isDragging();
    }

    isSelecting() {
        return this.mouseHandler.isSelecting;
    }

    setSelection(elementIds, type = 'element') {
        this.selectedElements = [...elementIds];
        this.selectionType = type;
        this.updateSelectionVisuals();
        
        // Notify other systems about selection change
        if (this.eventBus) {
            this.eventBus.publish('selection:changed', {
                selectedElements: this.selectedElements,
                selectionType: this.selectionType
            });
        }
    }

    addSelection(elementIds, type = 'element') {
        // Only add if selection type matches
        if (this.selectionType === type) {
            elementIds.forEach(id => {
                if (!this.selectedElements.includes(id)) {
                    this.selectedElements.push(id);
                }
            });
        } else {
            // Different type, replace selection
            this.setSelection(elementIds, type);
        }
        this.updateSelectionVisuals();
        
        if (this.eventBus) {
            this.eventBus.publish('selection:changed', {
                selectedElements: this.selectedElements,
                selectionType: this.selectionType
            });
        }
    }
    
    toggleSelection(elementId, type = 'element') {
        if (this.selectionType !== type) {
            // Different type, replace selection
            this.setSelection([elementId], type);
            return;
        }

        if (this.selectedElements.includes(elementId)) {
            this.selectedElements = this.selectedElements.filter(id => id !== elementId);
        } else {
            this.selectedElements.push(elementId);
        }
        this.updateSelectionVisuals();
        
        if (this.eventBus) {
            this.eventBus.publish('selection:changed', {
                selectedElements: this.selectedElements,
                selectionType: this.selectionType
            });
        }
    }
    
    clearSelection(update = true) {
        this.selectedElements = [];
        this.selectionType = 'element';
        if (update) this.updateSelectionVisuals();
        
        if (this.eventBus) {
            this.eventBus.publish('selection:changed', {
                selectedElements: this.selectedElements,
                selectionType: this.selectionType
            });
        }
    }

    updateSelectionVisuals() {
        // Clear existing control points before redrawing anything
        this.controlPointManager.clearControlPoints();

        if (this.selectionType === 'gridline') {
            this.gridSelectionHandler.handleGridLineSelection(this.selectedElements);
        } else {
            this.updateElementSelectionVisuals();
        }
        
        // After creating all points, initialize drag controls
        this.controlPointManager.initDragControls();

        // Update UI list
        this.updateUIList();

        // Reset grid line materials for unselected lines
        this.gridSelectionHandler.resetGridLineMaterials(this.selectedElements);

        // Notify the rest of the app about visual updates
        if (this.eventBus) {
            this.eventBus.publish('selection:changed', this.selectedElements);
        }
    }

    updateElementSelectionVisuals() {
        // Collect all element IDs that should be highlighted
        const highlightedIds = new Set();
        this.selectedElements.forEach(id => {
            const element = this.elementManager.getElement(id);
            if (element && element.kind === 'group') {
                element.children.forEach(childId => highlightedIds.add(childId));
            } else {
                highlightedIds.add(id);
            }
        });

        // Update 3D objects
        this.beamObjects.forEach((mesh, id) => {
            const isHighlighted = highlightedIds.has(id);
            if (isHighlighted) {
                mesh.material.color.setHex(0xff4444);
                mesh.material.opacity = 1.0;
            } else {
                if (mesh.userData.originalMaterial) {
                    mesh.material.copy(mesh.userData.originalMaterial);
                }
            }
        });

        // Create control points for the actual selected elements
        this.selectedElements.forEach(id => {
            const element = this.elementManager.getElement(id);
            if (element) {
                this.createControlPointsForElement(element);
            }
        });
    }

    createControlPointsForElement(element) {
        let controlPointsConfig = [];
        // Default to BaseCreator's implementation which handles simple beams
        // or any object with .start and .end
        const CreatorClass = this.elementManager.viewer.creationManager.getCreatorClass(element.type) || BaseCreator;

        if (CreatorClass && typeof CreatorClass.getControlPoints === 'function') {
            controlPointsConfig = CreatorClass.getControlPoints(element);
        }

        controlPointsConfig.forEach(config => {
            this.controlPointManager.createControlPoint(element, config.type, config.position);
        });
    }

    updateUIList() {
        document.querySelectorAll('.beam-item').forEach(item => {
            const isSelected = this.selectedElements.includes(item.dataset.elementId);
            item.classList.toggle('selected', isSelected);
        });
    }

    getSelectedElements() {
        return this.selectedElements;
    }

    // Delegate mouse events to mouse handler
    onMouseDown(event) {
        return this.mouseHandler.onMouseDown(event);
    }

    onMouseMove(event) {
        return this.mouseHandler.onMouseMove(event);
    }

    onMouseUp(event) {
        return this.mouseHandler.onMouseUp(event);
    }

    // Delegate box selection methods
    isObjectInSelectionBox(objectBox, selectionBoxNDC) {
        return this.boxSelection.isObjectInSelectionBox(objectBox, selectionBoxNDC);
    }

    // Delegate grid line methods
    findGridLineObjectById(gridLineId) {
        return this.gridSelectionHandler.findGridLineObjectById(gridLineId);
    }

    // Delegate control point methods
    createControlPoint(elementData, pointType, position) {
        return this.controlPointManager.createControlPoint(elementData, pointType, position);
    }

    clearControlPoints() {
        return this.controlPointManager.clearControlPoints();
    }

    initDragControls() {
        return this.controlPointManager.initDragControls();
    }

    createGridLineControlPoint(gridLineId, center, userData) {
        return this.controlPointManager.createGridLineControlPoint(gridLineId, center, userData);
    }

    updateGridSpacing(gridId, axis, label, newPosition) {
        return this.controlPointManager.updateGridSpacing(gridId, axis, label, newPosition);
    }
}