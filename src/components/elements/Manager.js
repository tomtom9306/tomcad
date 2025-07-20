// Element management functionality
class ElementManager {
    constructor(scene, beamObjects, structureData, viewer, gridManager) {
        this.scene = scene;
        this.beamObjects = beamObjects;
        this.structureData = structureData;
        this.viewer = viewer;
        this.gridManager = gridManager;
        this.nextElementId = 1;

        this.factory = new ElementFactory(this);
        this.modifier = new ElementModifier(this);

        this.initializeElementCounter();
    }

    initializeElementCounter() {
        // Find the highest element number to avoid conflicts
        let maxId = 0;
        if (this.structureData.elements) {
            this.structureData.elements.forEach(element => {
                const match = element.id.match(/(\d+)$/);
                if (match) {
                    maxId = Math.max(maxId, parseInt(match[1]));
                }
            });
        }
        this.nextElementId = maxId + 1;
    }

    createBeams() {
        if (!this.structureData || !this.structureData.elements) {
            console.error('No elements found in structure data');
            return;
        }

        this.structureData.elements.forEach(element => {
            let mesh;
            if (element.kind === 'beam') {
                mesh = MeshBuilder.createBeam(element);
            } else if (element.kind === 'plate') {
                mesh = MeshBuilder.createPlate(element);
            }

            if (mesh) {
                this.beamObjects.set(element.id, mesh);
                this.scene.add(mesh);
            }
        });
    }

    // --- Delegated Factory Methods ---
    addNewBeam(start, end, profile, material, orientation) {
        return this.factory.addNewBeam(start, end, profile, material, orientation);
    }

    addNewColumn(basePoint, params) {
        return this.factory.addNewColumn(basePoint, params);
    }

    addNewGroup(params) {
        return this.factory.addNewGroup(params);
    }

    addNewComponent(params) {
        return this.factory.addNewComponent(params);
    }

    addNewPlate(params) {
        return this.factory.addNewPlate(params);
    }

    // --- Delegated Modifier Methods ---
    updateElementPoint(elementId, pointType, newPosition) {
        return this.modifier.updateElementPoint(elementId, pointType, newPosition);
    }

    updateGroupPoints(elementId, pointType, newPosition) {
        return this.modifier.updateGroupPoints(elementId, pointType, newPosition);
    }
    
    updateElement(elementId, newData) {
        return this.modifier.updateElement(elementId, newData);
    }

    deleteElements(elementIds) {
        return this.modifier.deleteElements(elementIds);
    }

    changeElementType(elementId, newType) {
        return this.modifier.changeElementType(elementId, newType);
    }

    copyElements(sourceElementIds, sourcePoint, destinationPoint, numCopies) {
        return this.modifier.copyElements(sourceElementIds, sourcePoint, destinationPoint, numCopies);
    }

    // --- Getters ---
    getElement(elementId) {
        return this.structureData.elements.find(el => el.id === elementId);
    }

    getAllElements() {
        return this.structureData.elements;
    }

    getElementMeshById(elementId) {
        return this.beamObjects.get(elementId);
    }

    // --- Parametric Grid Methods ---
    rebuildAllFromGrid(gridId) {
        console.log(`Rebuilding all elements for grid: ${gridId}`);
        
        // Get current absolute coordinates from GridManager
        const gridCoords = this.gridManager.getAbsoluteCoords(gridId);
        if (!gridCoords) {
            console.warn(`Could not get coordinates for grid: ${gridId}`);
            return;
        }

        let elementsUpdated = 0;

        this.structureData.elements.forEach(element => {
            let needsUpdate = false;
            const newData = {};

            // Check if element has grid attachments
            if (element.startAttachment && element.startAttachment.type === 'gridIntersection') {
                const attachment = element.startAttachment;
                const newStartPos = this.calculateGridPosition(gridCoords, attachment, element.startOffset);
                if (newStartPos) {
                    newData.start = newStartPos.toArray();
                    needsUpdate = true;
                }
            }

            if (element.endAttachment && element.endAttachment.type === 'gridIntersection') {
                const attachment = element.endAttachment;
                const newEndPos = this.calculateGridPosition(gridCoords, attachment, element.endOffset);
                if (newEndPos) {
                    newData.end = newEndPos.toArray();
                    needsUpdate = true;
                }
            }

            // Handle plate origin attachments
            if (element.originAttachment && element.originAttachment.type === 'gridIntersection') {
                const attachment = element.originAttachment;
                const newOrigin = this.calculateGridPosition(gridCoords, attachment, element.originOffset);
                if (newOrigin) {
                    newData.origin = newOrigin.toArray();
                    needsUpdate = true;
                }
            }

            // If position changed, update element
            if (needsUpdate) {
                console.log(`Updating element ${element.id} based on grid changes`);
                this.modifier.updateElement(element.id, newData);
                elementsUpdated++;
            }
        });

        console.log(`Updated ${elementsUpdated} elements based on grid changes`);
    }

    calculateGridPosition(gridCoords, attachment, offset = null) {
        try {
            const x = gridCoords.x[attachment.xLabel];
            const y = gridCoords.y[attachment.yLabel];  
            const z = gridCoords.z[attachment.zLabel];

            if (x === undefined || y === undefined || z === undefined) {
                console.warn(`Could not find coordinates for attachment:`, attachment);
                return null;
            }

            const position = new THREE.Vector3(x, y, z);

            // Add offset if provided
            if (offset && Array.isArray(offset) && offset.length >= 3) {
                position.add(new THREE.Vector3(offset[0], offset[1], offset[2]));
            }

            return position;
        } catch (error) {
            console.error('Error calculating grid position:', error);
            return null;
        }
    }

    // Convert existing element to grid-attached element
    attachElementToGrid(elementId, gridId, startAttachment = null, endAttachment = null) {
        const element = this.getElement(elementId);
        if (!element) return false;

        const updates = {};

        if (startAttachment) {
            updates.startAttachment = {
                type: 'gridIntersection',
                ...startAttachment
            };
            // Store current position as offset if needed
            if (!updates.startOffset) {
                updates.startOffset = [0, 0, 0];
            }
        }

        if (endAttachment) {
            updates.endAttachment = {
                type: 'gridIntersection',
                ...endAttachment
            };
            if (!updates.endOffset) {
                updates.endOffset = [0, 0, 0];
            }
        }

        return this.modifier.updateElement(elementId, updates);
    }

    // Detach element from grid (convert back to absolute coordinates)
    detachElementFromGrid(elementId) {
        const element = this.getElement(elementId);
        if (!element) return false;

        const updates = {};
        
        // Remove attachments but keep current absolute positions
        if (element.startAttachment) {
            delete updates.startAttachment;
            delete updates.startOffset;
        }
        
        if (element.endAttachment) {
            delete updates.endAttachment;
            delete updates.endOffset;
        }

        if (element.originAttachment) {
            delete updates.originAttachment;
            delete updates.originOffset;
        }

        return this.modifier.updateElement(elementId, updates);
    }

    // NEW: Connection system support methods
    updateElementPosition(elementId, positionUpdates) {
        const element = this.getElement(elementId);
        if (!element) return false;

        const updates = {};
        
        // Update position data
        if (positionUpdates.start) {
            updates.start = positionUpdates.start;
        }
        if (positionUpdates.end) {
            updates.end = positionUpdates.end;
        }
        if (positionUpdates.origin) {
            updates.origin = positionUpdates.origin;
        }

        return this.modifier.updateElement(elementId, updates);
    }

    // NEW: Get connection points for an element
    getElementConnectionPoints(element) {
        if (!element || !element.connectionPoints) {
            // Generate default connection points for beams
            if (element && element.kind === 'beam') {
                return [
                    {
                        id: 'start',
                        type: 'moment',
                        position: new THREE.Vector3(...element.start)
                    },
                    {
                        id: 'end',
                        type: 'moment',
                        position: new THREE.Vector3(...element.end)
                    },
                    {
                        id: 'mid',
                        type: 'pinned',
                        position: new THREE.Vector3(
                            (element.start[0] + element.end[0]) / 2,
                            (element.start[1] + element.end[1]) / 2,
                            (element.start[2] + element.end[2]) / 2
                        )
                    }
                ];
            }
            return [];
        }
        
        return element.connectionPoints.map(cp => ({
            ...cp,
            position: new THREE.Vector3(...cp.position)
        }));
    }

    // NEW: Set connection manager for integration
    setConnectionManager(connectionManager) {
        this.connectionManager = connectionManager;
    }
} 