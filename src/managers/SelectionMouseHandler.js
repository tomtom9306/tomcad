// Mouse event handling for selection operations
window.SelectionMouseHandler = class SelectionMouseHandler {
    constructor(scene, camera, renderer, raycaster, elementManager, selectionManager, boxSelection, controlPointManager) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.raycaster = raycaster;
        this.elementManager = elementManager;
        this.selectionManager = selectionManager;
        this.boxSelection = boxSelection;
        this.controlPointManager = controlPointManager;
        
        // Mouse event state
        this.isSelecting = false;
        this.startPoint = { x: 0, y: 0 };
        this.dragThreshold = 5; // Pixels to distinguish click from drag
        
        // GridLineEditor removed - using manual UI editing only
    }

    onMouseDown(event) {
        // Only handle left-click events
        if (event.button !== 0) return;

        // Check if clicking on gridline editor handle
        const mouse = new THREE.Vector2();
        const rect = this.renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // GridLineEditor removed - manual UI editing only

        // If clicking on a control point, let dragControls handle it
        if (this.controlPointManager.dragControls) {
            const intersects = this.raycaster.intersectObjects(this.controlPointManager.controlPoints);
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

        // Calculate distance from start point
        const distance = Math.sqrt(
            Math.pow(event.clientX - this.startPoint.x, 2) +
            Math.pow(event.clientY - this.startPoint.y, 2)
        );

        // If mouse moves beyond threshold, show selection box
        if (distance > this.dragThreshold) {
            this.boxSelection.updateBox(this.startPoint, { x: event.clientX, y: event.clientY });
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

        // Determine if this was a drag or click
        if (distance > this.dragThreshold && this.boxSelection.isVisible()) {
            this.handleDragSelection(event);
        } else {
            this.handleClickSelection(event);
        }

        this.boxSelection.hide();
        return this.selectionManager.getSelectedElements();
    }

    handleDragSelection(event) {
        const selectedIds = this.boxSelection.getSelectedObjects();
        
        if (selectedIds.length > 0) {
            if (event.ctrlKey) {
                this.selectionManager.addSelection(selectedIds, 'element');
            } else {
                this.selectionManager.setSelection(selectedIds, 'element');
            }
        }
    }

    handleClickSelection(event) {
        const mouse = new THREE.Vector2();
        const rect = this.renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // Get grid lines if available
        let gridLines = [];
        if (this.elementManager.viewer && this.elementManager.viewer.gridManager) {
            gridLines = this.elementManager.viewer.gridManager.getGridLines();
        }
        
        const allObjects = [...Array.from(this.elementManager.beamObjects.values()), ...gridLines];
        const intersects = this.raycaster.intersectObjects(allObjects);
        
        if (intersects.length > 0) {
            const firstHit = intersects[0].object;
            
            // Check if it's a grid line
            if (firstHit.userData.isGridLine) {
                this.handleGridLineClick(firstHit, event);
            } else if (firstHit.userData.elementId) {
                this.handleElementClick(firstHit, event);
            }
        } else {
            this.selectionManager.clearSelection();
        }
    }

    handleGridLineClick(gridLineObject, event) {
        const gridLineId = `${gridLineObject.userData.gridId}-${gridLineObject.userData.axis}-${gridLineObject.userData.label}`;
        console.log('Grid line clicked:', gridLineId, 'userData:', gridLineObject.userData);
        
        if (event.ctrlKey) {
            this.selectionManager.toggleSelection(gridLineId, 'gridline');
        } else {
            this.selectionManager.setSelection([gridLineId], 'gridline');
        }
    }

    handleElementClick(elementObject, event) {
        const elementId = elementObject.userData.elementId;
        const element = this.elementManager.getElement(elementId);
        
        let idToSelect = elementId;
        // If the element has a parent and Alt key is NOT pressed, select the parent group
        if (element && element.parentId && !event.altKey) {
            idToSelect = element.parentId;
        }

        if (event.ctrlKey) {
            this.selectionManager.toggleSelection(idToSelect, 'element');
        } else {
            this.selectionManager.setSelection([idToSelect], 'element');
        }
    }

    isDragging() {
        return this.controlPointManager.isDragging();
    }
}