// Selection management functionality
class SelectionManager {
    constructor(scene, camera, renderer, elementManager, cameraControls, snapManager, selectionBox, eventBus, raycaster) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.elementManager = elementManager;
        this.cameraControls = cameraControls;
        this.snapManager = snapManager;
        this.raycaster = raycaster; // Use the shared, configured raycaster
        this.beamObjects = elementManager.beamObjects; // Get reference from elementManager
        this.selectedElements = [];
        this.selectionType = 'element'; // 'element' or 'gridline'
        this.eventBus = eventBus;
        
        // Selection box state
        this.isSelecting = false;
        this.selectionBox = selectionBox;
        this.startPoint = { x: 0, y: 0 };
        this.endPoint = { x: 0, y: 0 };

        // Control points for editing
        this.controlPoints = [];
        this.dragControls = null;
        this.isDraggingControlPoint = false;

        // Subscribe to events from the dispatcher
        if (this.eventBus) {
            this.eventBus.subscribe('selection:mouseDown', (data) => this.onMouseDown(data.event));
            this.eventBus.subscribe('selection:mouseMove', (data) => this.onMouseMove(data.event));
            this.eventBus.subscribe('selection:mouseUp', (data) => this.onMouseUp(data.event));
            this.eventBus.subscribe('viewer:escapePressed', () => this.clearSelection());
        }
    }

    isDragging() {
        return this.isDraggingControlPoint;
    }

    onMouseDown(event) {
        // We start tracking on left-click for either a click or a drag-select.
        if (event.button !== 0) return;

        // If clicking on a control point, let dragControls handle it
        if (this.dragControls) {
            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(mouse, this.camera);
            
            const intersects = this.raycaster.intersectObjects(this.controlPoints);
            if (intersects.length > 0) {
                return; // Let dragControls take over
            }
        }

        this.isSelecting = true;
        this.startPoint.x = event.clientX;
        this.startPoint.y = event.clientY;
    }

    onMouseMove(event) {
        if (!this.isSelecting) return;

        // If mouse moves more than a few pixels, it's a drag, so draw the box.
        const distance = Math.sqrt(
            Math.pow(event.clientX - this.startPoint.x, 2) +
            Math.pow(event.clientY - this.startPoint.y, 2)
        );

        if (distance > 5) { // Threshold to differentiate click from drag
            this.endPoint.x = event.clientX;
            this.endPoint.y = event.clientY;

            const x = Math.min(this.startPoint.x, this.endPoint.x);
            const y = Math.min(this.startPoint.y, this.endPoint.y);
            const width = Math.abs(this.startPoint.x - this.endPoint.x);
            const height = Math.abs(this.startPoint.y - this.endPoint.y);

            this.selectionBox.style.left = `${x}px`;
            this.selectionBox.style.top = `${y}px`;
            this.selectionBox.style.width = `${width}px`;
            this.selectionBox.style.height = `${height}px`;
            this.selectionBox.style.display = 'block';
        }
    }
    
    onMouseUp(event) {
        if (!this.isSelecting) return;
        this.isSelecting = false;

        const endPoint = { x: event.clientX, y: event.clientY };
        const distance = Math.sqrt(
            Math.pow(endPoint.x - this.startPoint.x, 2) +
            Math.pow(endPoint.y - this.startPoint.y, 2)
        );

        // It's a drag selection
        if (distance > 5 && this.selectionBox.style.display === 'block') {
            const selectedIds = [];
            const selectionRect = this.selectionBox.getBoundingClientRect();
            const rendererBounds = this.renderer.domElement.getBoundingClientRect();

            // Convert selection box from screen pixels to NDC
            const selectionBoxNDC = new THREE.Box2();
            selectionBoxNDC.min.x = ((selectionRect.left - rendererBounds.left) / rendererBounds.width) * 2 - 1;
            selectionBoxNDC.max.x = ((selectionRect.right - rendererBounds.left) / rendererBounds.width) * 2 - 1;
            selectionBoxNDC.min.y = 1 - ((selectionRect.bottom - rendererBounds.top) / rendererBounds.height) * 2;
            selectionBoxNDC.max.y = 1 - ((selectionRect.top - rendererBounds.top) / rendererBounds.height) * 2;

            this.beamObjects.forEach((mesh, id) => {
                const objectBox = new THREE.Box3().setFromObject(mesh);
                if (this.isObjectInSelectionBox(objectBox, selectionBoxNDC)) {
                    selectedIds.push(id);
                }
            });

            if (selectedIds.length > 0) {
                if (event.ctrlKey) {
                    this.addSelection(selectedIds, 'element');
                } else {
                    this.setSelection(selectedIds, 'element');
                }
            }
            
            this.selectionBox.style.display = 'none';
        // It's a simple click
        } else {
            this.selectionBox.style.display = 'none';
            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(mouse, this.camera);
            
            // First check for grid lines if available
            let gridLines = [];
            if (this.elementManager.viewer && this.elementManager.viewer.gridManager) {
                gridLines = this.elementManager.viewer.gridManager.getGridLines();
            }
            
            const allObjects = [...Array.from(this.beamObjects.values()), ...gridLines];
            const intersects = this.raycaster.intersectObjects(allObjects);
            
            if (intersects.length > 0) {
                const firstHit = intersects[0].object;
                
                // Check if it's a grid line
                if (firstHit.userData.isGridLine) {
                    const gridLineId = `${firstHit.userData.gridId}-${firstHit.userData.axis}-${firstHit.userData.label}`;
                    if (event.ctrlKey) {
                        this.toggleSelection(gridLineId, 'gridline');
                    } else {
                        this.setSelection([gridLineId], 'gridline');
                    }
                } else if (firstHit.userData.elementId) {
                    // It's a regular element
                    const elementId = firstHit.userData.elementId;
                    const element = this.elementManager.getElement(elementId);
                    
                    let idToSelect = elementId;
                    // If the element has a parent and Alt key is NOT pressed, select the parent group
                    if (element && element.parentId && !event.altKey) {
                        idToSelect = element.parentId;
                    }

                    if (event.ctrlKey) {
                        this.toggleSelection(idToSelect, 'element');
                    } else {
                        this.setSelection([idToSelect], 'element');
                    }
                }
            } else {
                this.clearSelection();
            }
        }

        return this.selectedElements;
    }

    isObjectInSelectionBox(objectBox, selectionBoxNDC) {
        // This is a robust check to see if an object's screen-projected
        // bounding box intersects with the selection rectangle.
        const objectProjectedBox = new THREE.Box2();

        // Get the 8 corners of the world-space bounding box manually for r128 compatibility
        const min = objectBox.min;
        const max = objectBox.max;
        const corners = [
            new THREE.Vector3(min.x, min.y, min.z),
            new THREE.Vector3(min.x, min.y, max.z),
            new THREE.Vector3(min.x, max.y, min.z),
            new THREE.Vector3(min.x, max.y, max.z),
            new THREE.Vector3(max.x, min.y, min.z),
            new THREE.Vector3(max.x, min.y, max.z),
            new THREE.Vector3(max.x, max.y, min.z),
            new THREE.Vector3(max.x, max.y, max.z)
        ];

        let inFrustum = false;
        for (const corner of corners) {
            // Project the corner into screen space (NDC)
            corner.project(this.camera);
            // Check if at least one corner is in the camera's view frustum.
            if (corner.z > -1 && corner.z < 1) {
                inFrustum = true;
                // Expand the projected box with this screen-space point
                objectProjectedBox.expandByPoint(corner);
            }
        }

        // If no part of the object is in the frustum, it can't be selected.
        if (!inFrustum) {
            return false;
        }

        // Check for intersection between the object's projected box and the selection box
        return selectionBoxNDC.intersectsBox(objectProjectedBox);
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
        this.clearControlPoints();

        if (this.selectionType === 'gridline') {
            // Handle grid line selection
            this.selectedElements.forEach(gridLineId => {
                const lineObject = this.findGridLineObjectById(gridLineId);
                if (lineObject) {
                    // Highlight the grid line
                    lineObject.material.color.setHex(0xffff00);
                    lineObject.material.linewidth = 3;
                    
                    // Create control point for grid line
                    const center = new THREE.Vector3();
                    lineObject.geometry.computeBoundingBox();
                    lineObject.geometry.boundingBox.getCenter(center);
                    lineObject.localToWorld(center);
                    
                    this.createGridLineControlPoint(gridLineId, center, lineObject.userData);
                }
            });
        } else {
            // Handle element selection (existing logic)
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
                    let controlPointsConfig = [];
                    // Default to BaseCreator's implementation which handles simple beams
                    // or any object with .start and .end
                    const CreatorClass = this.elementManager.viewer.creationManager.getCreatorClass(element.type) || BaseCreator;

                    if (CreatorClass && typeof CreatorClass.getControlPoints === 'function') {
                        controlPointsConfig = CreatorClass.getControlPoints(element);
                    }

                    controlPointsConfig.forEach(config => {
                        this.createControlPoint(element, config.type, config.position);
                    });
                }
            });
        }
        
        // After creating all points, initialize drag controls
        this.initDragControls();

        // Update UI list
        document.querySelectorAll('.beam-item').forEach(item => {
            const isSelected = this.selectedElements.includes(item.dataset.elementId);
            item.classList.toggle('selected', isSelected);
        });

        // Reset grid line materials for unselected lines
        if (this.elementManager.viewer && this.elementManager.viewer.gridManager) {
            const gridLines = this.elementManager.viewer.gridManager.getGridLines();
            gridLines.forEach(line => {
                const lineId = `${line.userData.gridId}-${line.userData.axis}-${line.userData.label}`;
                if (!this.selectedElements.includes(lineId) && line.userData.originalMaterial) {
                    line.material.copy(line.userData.originalMaterial);
                }
            });
        }

        // After updating visuals, notify the rest of the app.
        if (this.eventBus) {
            this.eventBus.publish('selection:changed', this.selectedElements);
        }
    }

    createControlPoint(elementData, pointType, position) {
        if (!position) return;

        const handleSize = 50; // Adjust size based on zoom
        const geometry = new THREE.SphereGeometry(handleSize, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const controlPoint = new THREE.Mesh(geometry, material);
        
        controlPoint.position.copy(position);
        controlPoint.userData = {
            elementId: elementData.id,
            pointType: pointType,
            isControlPoint: true
        };

        this.scene.add(controlPoint);
        this.controlPoints.push(controlPoint);
    }
    
    clearControlPoints() {
        if (this.dragControls) {
            this.dragControls.dispose();
            this.dragControls = null;
        }
        this.controlPoints.forEach(point => this.scene.remove(point));
        this.controlPoints = [];
    }
    
    initDragControls() {
        if (this.controlPoints.length > 0) {
            this.dragControls = new THREE.DragControls(this.controlPoints, this.camera, this.renderer.domElement);
            
            this.dragControls.addEventListener('dragstart', (event) => {
                this.isDraggingControlPoint = true;
                this.cameraControls.enabled = false;
                event.object.material.color.setHex(0x00ff00);
                
                if (event.object.userData.isGridControlPoint) {
                    // Grid line control point
                    this.snapManager.activate();
                } else {
                    // Element control point
                    this.snapManager.activate();

                    // Axis snap
                    const element = this.elementManager.getElement(event.object.userData.elementId);
                    if (element) {
                        const stationaryPointType = event.object.userData.pointType === 'start' ? 'end' : 'start';
                        const stationaryPoint = new THREE.Vector3(...element[stationaryPointType]);
                        this.snapManager.startAxisSnap(stationaryPoint);
                    }
                }
            });

            this.dragControls.addEventListener('drag', (event) => {
                const draggedPoint = event.object;
                
                if (draggedPoint.userData.isGridControlPoint) {
                    // Handle grid line dragging
                    const { gridId, axis, label, value } = draggedPoint.userData;
                    const newPosition = draggedPoint.position;
                    
                    // Constrain movement to the perpendicular axis only
                    const constraintAxis = axis.toLowerCase();
                    const oldValue = value;
                    const newValue = newPosition[constraintAxis];
                    
                    // Update the control point visual position
                    // The actual grid rebuild will happen in dragend
                    
                } else {
                    // Handle element control point dragging (existing logic)
                    const { elementId, pointType } = draggedPoint.userData;
                    const element = this.elementManager.getElement(elementId);
                    
                    // Find snap point
                    const raycaster = new THREE.Raycaster();
                    const mouse = new THREE.Vector2(
                        (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
                        -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1
                    );
                    raycaster.setFromCamera(mouse, this.camera);
                    const snapPoint = this.snapManager.findSnapPoint(raycaster, mouse, event, elementId);

                    if (snapPoint) {
                        draggedPoint.position.copy(snapPoint);
                    }
                    
                    // Update element
                    if (element.kind === 'group') {
                        this.elementManager.updateGroupPoints(elementId, pointType, draggedPoint.position);
                    } else {
                        this.elementManager.updateElementPoint(elementId, pointType, draggedPoint.position);
                    }
                }
            });

            this.dragControls.addEventListener('dragend', (event) => {
                this.isDraggingControlPoint = false;
                this.cameraControls.enabled = true;
                event.object.material.color.setHex(0xffff00);
                this.snapManager.deactivate();
                
                if (event.object.userData.isGridControlPoint) {
                    // Handle grid line drag end - update spacing data and rebuild
                    const { gridId, axis, label } = event.object.userData;
                    const newPosition = event.object.position;
                    
                    this.updateGridSpacing(gridId, axis, label, newPosition);
                }
            });
        }
    }

    updateGridSpacing(gridId, axis, label, newPosition) {
        const gridData = this.elementManager.viewer.structureData.grids.find(g => g.id === gridId);
        if (!gridData) return;

        const spacingsKey = `${axis.toLowerCase()}Spacings`;
        const labelsKey = `${axis.toLowerCase()}Labels`;
        const coordsKey = `${axis.toLowerCase()}Coords`;
        
        const lineIndex = gridData[labelsKey].indexOf(label);
        if (lineIndex === -1) return;

        // Get current coordinates array from GridManager
        const gridManager = this.elementManager.viewer.gridManager;
        let coords;
        if (axis === 'X') coords = gridManager.xCoords;
        else if (axis === 'Y') coords = gridManager.yCoords;
        else if (axis === 'Z') coords = gridManager.zCoords;
        
        if (!coords || lineIndex >= coords.length) return;

        // Calculate new global coordinate (considering grid container transform)
        const newGlobalCoord = newPosition[axis.toLowerCase()];
        
        // Update spacings array
        if (lineIndex > 0) {
            // Not the first line - update the spacing before this line
            const prevGlobalCoord = coords[lineIndex - 1];
            gridData[spacingsKey][lineIndex - 1] = newGlobalCoord - prevGlobalCoord;
        }
        
        if (lineIndex < coords.length - 1) {
            // Not the last line - update the spacing after this line
            const nextGlobalCoord = coords[lineIndex + 1];
            gridData[spacingsKey][lineIndex] = nextGlobalCoord - newGlobalCoord;
        }

        // Rebuild grid with new data
        gridManager.rebuildGrid(gridData);
        
        // Notify other systems that grid has been updated
        if (this.eventBus) {
            this.eventBus.publish('grid:updated', { gridId });
        }
        
        // Update selection visuals after rebuild
        this.updateSelectionVisuals();
    }

    getSelectedElements() {
        return this.selectedElements;
    }

    findGridLineObjectById(gridLineId) {
        if (!this.elementManager.viewer || !this.elementManager.viewer.gridManager) {
            return null;
        }
        
        const gridLines = this.elementManager.viewer.gridManager.getGridLines();
        return gridLines.find(line => {
            const lineId = `${line.userData.gridId}-${line.userData.axis}-${line.userData.label}`;
            return lineId === gridLineId;
        });
    }

    createGridLineControlPoint(gridLineId, position, userData) {
        const handleSize = 80; // Slightly larger for grid lines
        const geometry = new THREE.SphereGeometry(handleSize, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const controlPoint = new THREE.Mesh(geometry, material);
        
        controlPoint.position.copy(position);
        controlPoint.userData = {
            gridLineId: gridLineId,
            gridId: userData.gridId,
            axis: userData.axis,
            label: userData.label,
            value: userData.value,
            isGridControlPoint: true
        };

        this.scene.add(controlPoint);
        this.controlPoints.push(controlPoint);
    }
} 