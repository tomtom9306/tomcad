// Control point management for element and grid line editing
window.ControlPointManager = class ControlPointManager {
    constructor(scene, camera, renderer, elementManager, cameraControls, snapManager, eventBus) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.elementManager = elementManager;
        this.cameraControls = cameraControls;
        this.snapManager = snapManager;
        this.eventBus = eventBus;
        
        // Control points for editing
        this.controlPoints = [];
        this.dragControls = null;
        this.isDraggingControlPoint = false;
    }

    createControlPoint(elementData, pointType, position) {
        if (!position) return;

        const handleSize = 25; // Smaller size for more precise control
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

    createGridLineControlPoint(gridLineId, position, userData) {
        const handleSize = 35; // Reduced size for grid lines
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
                
                // Store original position for constraint calculations
                event.object.userData.originalPosition = event.object.position.clone();
                
                if (event.object.userData.isGridControlPoint) {
                    // Grid line control point
                    this.snapManager.activate();
                    console.log('Started dragging grid control point for:', event.object.userData.gridId, event.object.userData.axis, event.object.userData.label);
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
                    this.handleGridControlPointDrag(draggedPoint, event);
                } else {
                    // Handle element control point dragging
                    this.handleElementControlPointDrag(draggedPoint, event);
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
                    
                    console.log('Grid drag ended:', gridId, axis, label, 'New position:', newPosition);
                    this.updateGridSpacing(gridId, axis, label, newPosition);
                    
                    // Clean up temporary data
                    delete event.object.userData.originalPosition;
                } else {
                    // Handle element control point drag end - check for connection creation
                    this.handleElementDragEnd(event.object);
                }
            });
        }
    }

    handleGridControlPointDrag(draggedPoint, event) {
        const { gridId, axis, label, value } = draggedPoint.userData;
        const newPosition = draggedPoint.position;
        
        // Constrain movement to the correct axis
        // For X-axis grid lines (vertical lines), we move along X axis
        // For Y-axis grid lines (horizontal lines), we move along Y axis  
        // For Z-axis grid lines, we move along Z axis
        const moveAxis = axis.toLowerCase();
        
        // Constrain movement to only the relevant axis
        const constrainedPosition = new THREE.Vector3();
        constrainedPosition.copy(newPosition);
        
        // Get original position to maintain other coordinates
        const originalPos = draggedPoint.userData.originalPosition;
        if (!originalPos) {
            console.warn('No original position found, using current position');
            draggedPoint.userData.originalPosition = newPosition.clone();
        }
        
        console.log('Grid drag:', axis, 'Original pos:', originalPos, 'New pos:', newPosition);
        
        // Grid lines named by their constant axis, not movement axis
        // X-axis grid lines are vertical lines with constant X value - they run parallel to Y/Z plane
        // Y-axis grid lines are horizontal lines with constant Y value - they run parallel to X/Z plane
        // Z-axis grid lines have constant Z value - they run parallel to X/Y plane
        
        // We want to constrain movement to ONLY the axis that changes the grid line position
        if (originalPos) {
            if (axis === 'X') {
                // X-axis grid lines: allow movement only along X axis
                constrainedPosition.y = originalPos.y;
                constrainedPosition.z = originalPos.z;
            } else if (axis === 'Y') {
                // Y-axis grid lines: allow movement only along Y axis  
                constrainedPosition.x = originalPos.x;
                constrainedPosition.z = originalPos.z;
            } else if (axis === 'Z') {
                // Z-axis grid lines: allow movement only along Z axis
                constrainedPosition.x = originalPos.x;
                constrainedPosition.y = originalPos.y;
            }
            
            console.log('Constrained position:', constrainedPosition, 'from original:', originalPos);
        } else {
            console.error('Missing original position for constraint calculation!');
        }
        
        // Update the control point position
        draggedPoint.position.copy(constrainedPosition);
        
        // Temporary: disable real-time updates to prevent jumping
        // this.updateGridSpacingRealtime(gridId, axis, label, constrainedPosition);
    }

    handleElementControlPointDrag(draggedPoint, event) {
        const { elementId, pointType } = draggedPoint.userData;
        const element = this.elementManager.getElement(elementId);
        
        // Find snap point
        const raycaster = new THREE.Raycaster();
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(mouse, this.camera);
        const snapResult = this.snapManager.findSnapPoint(raycaster, mouse, event, elementId);

        if (snapResult) {
            draggedPoint.position.copy(snapResult);
            
            // Store snap information for connection creation
            draggedPoint.userData.snapInfo = {
                point: snapResult,
                targetElementId: null,
                targetPoint: null
            };
            
            // Extract target element info if available (from connection point snap)
            const pointCandidates = this.snapManager.getPointCandidates(elementId);
            console.log('Point candidates:', pointCandidates.length);
            console.log('Snap result:', snapResult);
            
            const matchingCandidate = pointCandidates.find(candidate => {
                const distance = candidate.point.distanceTo(snapResult);
                console.log('Candidate distance:', distance, 'Element:', candidate.elementId, 'Point:', candidate.connectionPointId);
                return distance < 15; // Reduced tolerance for more precise connection matching
            });
            
            console.log('Matching candidate:', matchingCandidate);
            
            if (matchingCandidate && matchingCandidate.elementId && matchingCandidate.connectionPointId) {
                draggedPoint.userData.snapInfo.targetElementId = matchingCandidate.elementId;
                draggedPoint.userData.snapInfo.targetPoint = matchingCandidate.connectionPointId;
                console.log('Snap info updated:', draggedPoint.userData.snapInfo);
            }
        }
        
        // Update element
        if (element.kind === 'group') {
            this.elementManager.updateGroupPoints(elementId, pointType, draggedPoint.position);
        } else {
            this.elementManager.updateElementPoint(elementId, pointType, draggedPoint.position);
        }
    }

    handleElementDragEnd(draggedPoint) {
        const { elementId, pointType, snapInfo } = draggedPoint.userData;
        
        console.log('handleElementDragEnd called:');
        console.log('- Element ID:', elementId);
        console.log('- Point Type:', pointType);
        console.log('- Connection Mode:', this.snapManager.isConnectionMode());
        console.log('- Snap Info:', snapInfo);
        
        // Check if connection mode is active and we have snap information
        if (this.snapManager.isConnectionMode() && snapInfo && snapInfo.targetElementId) {
            console.log('Creating connection...');
            // Create connection
            const connectionId = this.elementManager.connectionManager.createConnection(
                elementId,
                pointType,
                snapInfo.targetElementId,
                snapInfo.targetPoint
                // Auto-determine connection type based on elements
            );
            
            if (connectionId) {
                console.log('Connection created:', connectionId);
                
                // No dialog needed - connection type is automatically determined
                // this.showConnectionTypeDialog(connectionId);
            } else {
                console.log('Failed to create connection');
            }
        } else {
            console.log('Connection creation skipped - requirements not met');
        }
        
        // Clear snap info
        delete draggedPoint.userData.snapInfo;
    }

    showConnectionTypeDialog(connectionId) {
        // Simple implementation - could be enhanced with a proper UI dialog
        const connectionTypes = ['moment', 'pinned', 'surface', 'edge'];
        const selectedType = prompt('Select connection type:\n0: Moment\n1: Pinned\n2: Surface\n3: Edge', '0');
        
        if (selectedType !== null) {
            const typeIndex = parseInt(selectedType);
            if (typeIndex >= 0 && typeIndex < connectionTypes.length) {
                const newType = connectionTypes[typeIndex];
                this.elementManager.connectionManager.updateConnectionType(connectionId, newType);
            }
        }
    }

    updateGridSpacingRealtime(gridId, axis, label, newPosition) {
        const gridData = this.elementManager.viewer.structureData.grids.find(g => g.id === gridId);
        if (!gridData) return;

        const spacingsKey = `${axis.toLowerCase()}Spacings`;
        const labelsKey = `${axis.toLowerCase()}Labels`;
        
        const lineIndex = gridData[labelsKey].indexOf(label);
        if (lineIndex === -1) return;

        // Get current coordinates array from GridManager
        const gridManager = this.elementManager.viewer.gridManager;
        let coords;
        if (axis === 'X') coords = gridManager.xCoords;
        else if (axis === 'Y') coords = gridManager.yCoords;
        else if (axis === 'Z') coords = gridManager.zCoords;
        
        if (!coords || lineIndex >= coords.length) return;

        // Calculate new global coordinate
        const newGlobalCoord = newPosition[axis.toLowerCase()];
        
        // Update spacings array
        if (lineIndex > 0) {
            // Not the first line - update the spacing before this line
            const prevGlobalCoord = coords[lineIndex - 1];
            gridData[spacingsKey][lineIndex - 1] = Math.abs(newGlobalCoord - prevGlobalCoord);
        }
        
        if (lineIndex < coords.length - 1) {
            // Not the last line - update the spacing after this line
            const nextGlobalCoord = coords[lineIndex + 1];
            gridData[spacingsKey][lineIndex] = Math.abs(nextGlobalCoord - newGlobalCoord);
        }

        // Immediately rebuild grid for real-time feedback
        gridManager.rebuildGrid(gridData);
        
        // Also update the control point coordinates to reflect the new grid
        this.updateControlPointsForGrid(gridId);
    }

    updateGridSpacing(gridId, axis, label, newPosition) {
        // This method is called on dragend - just call the realtime version
        this.updateGridSpacingRealtime(gridId, axis, label, newPosition);
        
        // Notify other systems that grid has been updated
        if (this.eventBus) {
            this.eventBus.publish('grid:updated', { gridId });
        }
    }

    updateControlPointsForGrid(gridId) {
        // Update positions of all control points for this grid to match new grid positions
        this.controlPoints.forEach(point => {
            if (point.userData.gridId === gridId) {
                const { axis, label } = point.userData;
                const gridManager = this.elementManager.viewer.gridManager;
                
                let coords;
                if (axis === 'X') coords = gridManager.xCoords;
                else if (axis === 'Y') coords = gridManager.yCoords;
                else if (axis === 'Z') coords = gridManager.zCoords;
                
                if (coords) {
                    const gridData = this.elementManager.viewer.structureData.grids.find(g => g.id === gridId);
                    if (gridData) {
                        const labelsKey = `${axis.toLowerCase()}Labels`;
                        const lineIndex = gridData[labelsKey].indexOf(label);
                        
                        if (lineIndex !== -1 && lineIndex < coords.length) {
                            // Update the control point position to match the new grid line position
                            if (axis === 'X') {
                                point.position.x = coords[lineIndex];
                            } else if (axis === 'Y') {
                                point.position.y = coords[lineIndex];
                            } else if (axis === 'Z') {
                                point.position.z = coords[lineIndex];
                            }
                        }
                    }
                }
            }
        });
    }

    isDragging() {
        return this.isDraggingControlPoint;
    }
    
    // TEST: Create a test connection
    createTestConnection() {
        const elements = this.elementManager.getAllElements();
        if (elements.length >= 2) {
            const sourceElement = elements[0];
            const targetElement = elements[1];
            
            console.log('Creating test connection between:', sourceElement.id, 'and', targetElement.id);
            
            const connectionId = this.elementManager.connectionManager.createConnection(
                sourceElement.id,
                'end',
                targetElement.id,
                'start'
                // Auto-determine connection type
            );
            
            if (connectionId) {
                console.log('Test connection created:', connectionId);
                
                // Test the connection by moving one element
                this.testConnectionSynchronization(connectionId);
                
                return connectionId;
            } else {
                console.log('Failed to create test connection');
            }
        } else {
            console.log('Not enough elements for test connection');
        }
        return null;
    }
    
    // TEST: Test connection synchronization
    testConnectionSynchronization(connectionId) {
        const connection = this.elementManager.connectionManager.getConnection(connectionId);
        if (!connection) {
            console.log('Connection not found for test');
            return;
        }
        
        console.log('Testing connection synchronization...');
        
        // Get the source element and move it slightly
        const sourceElement = this.elementManager.getElement(connection.source.elementId);
        if (sourceElement) {
            const originalEnd = [...sourceElement.end];
            
            // Move the end point slightly
            sourceElement.end[0] += 100;
            
            console.log('Moved source element end point from', originalEnd, 'to', sourceElement.end);
            
            // Trigger connection update
            this.elementManager.connectionManager.handleElementMoved(connection.source.elementId, {
                end: sourceElement.end
            });
            
            console.log('Connection synchronization test completed');
        }
    }
    
    // TEST: Test connection UI functionality
    testConnectionUI() {
        console.log('Testing connection UI functionality...');
        
        // First create a connection
        const connectionId = this.createTestConnection();
        if (!connectionId) {
            console.log('Could not create test connection for UI test');
            return;
        }
        
        // Wait a bit for the connection to be created
        setTimeout(() => {
            // Open connection panel
            if (this.elementManager.viewer.uiManager && this.elementManager.viewer.uiManager.connectionPanel) {
                const panel = this.elementManager.viewer.uiManager.connectionPanel;
                panel.show();
                
                // Refresh the list
                panel.refreshConnectionList();
                
                console.log('Connection panel opened and refreshed');
                
                // Test highlighting
                setTimeout(() => {
                    panel.highlightConnection(connectionId);
                    console.log('Connection highlighted in UI');
                }, 500);
            }
        }, 1000);
    }
    
    // TEST: Simple debug test
    debugConnectionSystem() {
        console.log('=== DEBUG CONNECTION SYSTEM ===');
        
        // Check if all components exist
        console.log('1. Component existence:');
        console.log('   ConnectionManager:', !!this.elementManager.connectionManager);
        console.log('   ConnectionVisualizer:', !!this.elementManager.viewer.connectionVisualizer);
        console.log('   ConnectionPanel:', !!this.elementManager.viewer.uiManager.connectionPanel);
        console.log('   EventBus:', !!this.elementManager.viewer.eventBus);
        
        // Check connection mode
        console.log('2. Connection mode:', this.snapManager.isConnectionMode());
        
        // Check existing connections
        if (this.elementManager.connectionManager) {
            const connections = this.elementManager.connectionManager.getAllConnections();
            console.log('3. Existing connections:', connections.length);
            connections.forEach(conn => {
                console.log('   Connection:', conn.id, 'type:', conn.type);
            });
        }
        
        // Test panel visibility
        if (this.elementManager.viewer.uiManager.connectionPanel) {
            const panel = this.elementManager.viewer.uiManager.connectionPanel;
            console.log('4. Panel visible:', panel.isVisible);
            console.log('   Panel display style:', panel.panel.style.display);
        }
        
        console.log('=== END DEBUG ===');
    }
    
    // TEST: Force show connection panel
    forceShowConnectionPanel() {
        console.log('Forcing connection panel to show...');
        
        const panel = this.elementManager.viewer.uiManager.connectionPanel;
        if (panel) {
            // Set connection manager if not set
            if (!panel.connectionManager) {
                panel.setConnectionManager(this.elementManager.connectionManager);
            }
            
            // Force show
            panel.show();
            
            // Check DOM
            console.log('Panel DOM element:', panel.panel);
            console.log('Panel in DOM:', document.contains(panel.panel));
            console.log('Panel visibility:', getComputedStyle(panel.panel).display);
            console.log('Panel z-index:', getComputedStyle(panel.panel).zIndex);
            console.log('Panel position:', getComputedStyle(panel.panel).position);
            
            console.log('Panel forced to show. Check if it\'s visible now.');
        } else {
            console.log('Connection panel not found!');
        }
    }
}