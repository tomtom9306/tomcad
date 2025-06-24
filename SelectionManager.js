// Selection management functionality
class SelectionManager {
    constructor(scene, camera, renderer, elementManager, cameraControls, snapManager) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.elementManager = elementManager;
        this.cameraControls = cameraControls;
        this.snapManager = snapManager;
        this.beamObjects = elementManager.beamObjects; // Get reference from elementManager
        this.selectedElements = [];
        
        // Selection box state
        this.isSelecting = false;
        this.selectionBox = document.getElementById('selection-box');
        this.startPoint = { x: 0, y: 0 };
        this.endPoint = { x: 0, y: 0 };

        // Control points for editing
        this.controlPoints = [];
        this.dragControls = null;
        this.isDraggingControlPoint = false;
    }

    isDragging() {
        return this.isDraggingControlPoint;
    }

    onMouseDown(event) {
        // We start tracking on left-click for either a click or a drag-select.
        if (event.button !== 0) return;

        // If clicking on a control point, let dragControls handle it
        if (this.dragControls) {
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, this.camera);
            
            const intersects = raycaster.intersectObjects(this.controlPoints);
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
                    this.addSelection(selectedIds);
                } else {
                    this.setSelection(selectedIds);
                }
            }
            
            this.selectionBox.style.display = 'none';
        // It's a simple click
        } else {
            this.selectionBox.style.display = 'none';
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, this.camera);
            
            const intersects = raycaster.intersectObjects(Array.from(this.beamObjects.values()));
            
            if (intersects.length > 0) {
                const elementId = intersects[0].object.userData.elementId;
                const element = this.elementManager.getElement(elementId);
                
                let idToSelect = elementId;
                // If the element has a parent and Alt key is NOT pressed, select the parent group
                if (element && element.parentId && !event.altKey) {
                    idToSelect = element.parentId;
                }

                if (event.ctrlKey) {
                    this.toggleSelection(idToSelect);
                } else {
                    this.setSelection([idToSelect]);
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
    
    setSelection(elementIds) {
        this.clearSelection(false); // Clear silently
        this.selectedElements = [...elementIds];
        this.updateSelectionVisuals();
        return this.selectedElements;
    }

    addSelection(elementIds) {
        elementIds.forEach(id => {
            if (!this.selectedElements.includes(id)) {
                this.selectedElements.push(id);
            }
        });
        this.updateSelectionVisuals();
        return this.selectedElements;
    }

    toggleSelection(elementId) {
        const index = this.selectedElements.indexOf(elementId);
        if (index > -1) {
            this.selectedElements.splice(index, 1);
        } else {
            this.selectedElements.push(elementId);
        }
        this.updateSelectionVisuals();
        return this.selectedElements;
    }

    clearSelection(update = true) {
        this.selectedElements = [];
        this.clearControlPoints();
        if(update) this.updateSelectionVisuals();
        return this.selectedElements;
    }

    updateSelectionVisuals() {
        // Clear existing control points before redrawing anything
        this.clearControlPoints();

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
            const elementData = this.elementManager.getElement(id);
            if (elementData) {
                if (elementData.kind === 'beam') {
                    this.createControlPoint(elementData, 'start');
                    this.createControlPoint(elementData, 'end');
                } else if (elementData.kind === 'group' && elementData.type === 'goalpost') {
                    this.createControlPoint(elementData, 'start');
                    this.createControlPoint(elementData, 'end');
                }
            }
        });
        
        // After creating all points, initialize drag controls
        this.initDragControls();

        // Update UI list
        document.querySelectorAll('.beam-item').forEach(item => {
            const isSelected = this.selectedElements.includes(item.dataset.elementId);
            item.classList.toggle('selected', isSelected);
        });
    }

    createControlPoint(elementData, pointType) {
        const pointCoords = elementData[pointType];
        if (!pointCoords) return;

        const handleSize = 50; // Adjust size based on zoom
        const geometry = new THREE.SphereGeometry(handleSize, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const controlPoint = new THREE.Mesh(geometry, material);
        
        controlPoint.position.set(...pointCoords);
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

                // Axis snap
                const element = this.elementManager.getElement(event.object.userData.elementId);
                if (element) {
                    const stationaryPointType = event.object.userData.pointType === 'start' ? 'end' : 'start';
                    const stationaryPoint = new THREE.Vector3(...element[stationaryPointType]);
                    this.snapManager.startAxisSnap(stationaryPoint);
                }
            });

            this.dragControls.addEventListener('drag', (event) => {
                const draggedPoint = event.object;
                const { elementId, pointType } = draggedPoint.userData;
                const element = this.elementManager.getElement(elementId);
                
                // Find snap point
                const raycaster = new THREE.Raycaster();
                const mouse = new THREE.Vector2(
                    (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
                    -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1
                );
                raycaster.setFromCamera(mouse, this.camera);
                const snapPoint = this.snapManager.findSnapPoint(raycaster, mouse, elementId);

                if (snapPoint) {
                    draggedPoint.position.copy(snapPoint);
                }
                
                // Update element
                if (element.kind === 'group') {
                    this.elementManager.updateGroupPoints(elementId, pointType, draggedPoint.position);
                } else {
                    this.elementManager.updateElementPoint(elementId, pointType, draggedPoint.position);
                }

                // Update tooltip position
                const snapTooltip = this.snapManager.snapTooltip;
                if (snapTooltip && snapTooltip.style.display === 'block') {
                    snapTooltip.style.left = `${event.clientX + 15}px`;
                    snapTooltip.style.top = `${event.clientY + 15}px`;
                }
            });

            this.dragControls.addEventListener('dragend', (event) => {
                this.isDraggingControlPoint = false;
                this.cameraControls.enabled = true;
                event.object.material.color.setHex(0xffff00);
                
                // Final update after dragging ends
                const { elementId, pointType } = event.object.userData;
                const newPosition = event.object.position;
                const element = this.elementManager.getElement(elementId);
                if (element.kind === 'group') {
                    this.elementManager.updateGroupPoints(elementId, pointType, newPosition);
                } else {
                    this.elementManager.updateElementPoint(elementId, pointType, newPosition);
                }

                // End axis snap
                this.snapManager.endAxisSnap();
                this.snapManager.snapIndicator.visible = false;
            });
        }
    }

    getSelectedElements() {
        return this.selectedElements;
    }
} 