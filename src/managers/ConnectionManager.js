// Manages parametric point connections between elements
class ConnectionManager {
    constructor(elementManager, eventBus, structureData) {
        if (!elementManager) {
            throw new Error('ConnectionManager requires an elementManager');
        }
        if (!eventBus) {
            throw new Error('ConnectionManager requires an eventBus');
        }
        
        this.elementManager = elementManager;
        this.eventBus = eventBus;
        this.structureData = structureData;
        this.connections = new Map(); // connectionId -> connection
        this.elementConnections = new Map(); // elementId -> Set of connectionIds
        this.nextConnectionId = 1;
        
        // Initialize connections storage in structure data
        if (!this.structureData.connections) {
            this.structureData.connections = [];
        }
        
        // Load existing connections from structure data
        this.loadConnectionsFromData();
        
        // Element priority hierarchy for determining connection directionality
        this.ELEMENT_PRIORITIES = {
            'grid': 1000,
            'foundation': 900,
            'column': 800,
            'mainBeam': 700,
            'secondaryBeam': 600,
            'beam': 600,  // Default beam priority
            'brace': 500,
            'connection': 400,
            'detail': 300
        };
        
        // Connection type definitions
        this.CONNECTION_TYPES = {
            moment: {
                name: 'Moment Connection',
                rigid: true,
                transfersMoment: true,
                defaultDirectionality: 'two_way',
                description: 'Fixed connection that transfers both forces and moments'
            },
            pinned: {
                name: 'Pinned Connection',
                rigid: false,
                transfersMoment: false,
                defaultDirectionality: 'two_way',
                description: 'Hinged connection that allows rotation but transfers forces'
            },
            surface: {
                name: 'Surface Attachment',
                rigid: false,
                transfersMoment: false,
                defaultDirectionality: 'one_way',
                description: 'Connection constrained to move along a surface'
            },
            edge: {
                name: 'Edge Attachment',
                rigid: false,
                transfersMoment: false,
                defaultDirectionality: 'one_way',
                description: 'Connection constrained to move along an edge'
            },
            grid: {
                name: 'Grid Attachment',
                rigid: true,
                transfersMoment: false,
                defaultDirectionality: 'one_way',
                description: 'Connection snapped to grid intersection points'
            },
            rigid: {
                name: 'Rigid Connection',
                rigid: true,
                transfersMoment: true,
                defaultDirectionality: 'two_way',
                description: 'Completely rigid connection with no degrees of freedom'
            },
            bolted: {
                name: 'Bolted Connection',
                rigid: true,
                transfersMoment: false,
                defaultDirectionality: 'two_way',
                description: 'Bolted connection with limited moment transfer'
            },
            welded: {
                name: 'Welded Connection',
                rigid: true,
                transfersMoment: true,
                defaultDirectionality: 'two_way',
                description: 'Welded connection with full moment transfer'
            },
            sliding: {
                name: 'Sliding Connection',
                rigid: false,
                transfersMoment: false,
                defaultDirectionality: 'one_way',
                description: 'Connection that allows sliding along a defined path'
            },
            spring: {
                name: 'Spring Connection',
                rigid: false,
                transfersMoment: false,
                defaultDirectionality: 'two_way',
                description: 'Flexible connection with spring-like behavior'
            }
        };
        
        this.setupEventListeners();
    }
    
    // Load connections from structure data on initialization
    loadConnectionsFromData() {
        if (!this.structureData.connections) {
            return;
        }
        
        for (const connectionData of this.structureData.connections) {
            // Restore connection to memory
            this.connections.set(connectionData.id, connectionData);
            
            // Update element connection tracking
            this.addElementConnection(connectionData.source.elementId, connectionData.id);
            this.addElementConnection(connectionData.target.elementId, connectionData.id);
            
            // Update next connection ID
            const idNumber = parseInt(connectionData.id.split('-')[1]);
            if (idNumber >= this.nextConnectionId) {
                this.nextConnectionId = idNumber + 1;
            }
        }
        
        console.log(`Loaded ${this.structureData.connections.length} connections from structure data`);
    }
    
    // Save connection to structure data
    saveConnectionToData(connection) {
        if (!this.structureData.connections) {
            this.structureData.connections = [];
        }
        
        // Find existing connection or add new one
        const existingIndex = this.structureData.connections.findIndex(c => c.id === connection.id);
        if (existingIndex >= 0) {
            this.structureData.connections[existingIndex] = connection;
        } else {
            this.structureData.connections.push(connection);
        }
    }
    
    // Remove connection from structure data
    removeConnectionFromData(connectionId) {
        if (!this.structureData.connections) {
            return;
        }
        
        const index = this.structureData.connections.findIndex(c => c.id === connectionId);
        if (index >= 0) {
            this.structureData.connections.splice(index, 1);
        }
    }
    
    setupEventListeners() {
        // Listen for element changes to update connected elements
        this.eventBus.subscribe('element:moved', (data) => {
            this.handleElementMoved(data.elementId, data.newPosition);
        });
        
        this.eventBus.subscribe('element:deleted', (data) => {
            this.handleElementDeleted(data.elementId);
        });
    }
    
    // Create a new connection between two elements
    createConnection(sourceElementId, sourcePoint, targetElementId, targetPoint, connectionType = null) {
        const connectionId = this.generateConnectionId();
        
        const sourceElement = this.elementManager.getElement(sourceElementId);
        const targetElement = this.elementManager.getElement(targetElementId);
        
        if (!sourceElement || !targetElement) {
            console.error('Cannot create connection: Element not found');
            return null;
        }
        
        // Auto-determine connection type if not specified
        if (!connectionType) {
            connectionType = this.determineConnectionType(sourceElement, targetElement, sourcePoint, targetPoint);
        }
        
        // Determine connection directionality based on element hierarchy
        const directionality = this.determineDirectionality(sourceElement, targetElement, connectionType);
        
        const connection = {
            id: connectionId,
            type: connectionType,
            directionality: directionality,
            
            source: {
                elementId: sourceElementId,
                point: sourcePoint,
                role: this.getElementRole(sourceElement, targetElement, directionality, 'source')
            },
            
            target: {
                elementId: targetElementId,
                point: targetPoint,
                role: this.getElementRole(sourceElement, targetElement, directionality, 'target')
            },
            
            constraint: this.createConstraint(connectionType, directionality),
            
            metadata: {
                created: new Date().toISOString(),
                createdBy: 'user',
                lastModified: new Date().toISOString()
            }
        };
        
        // Store connection
        this.connections.set(connectionId, connection);
        
        // Save to structure data
        this.saveConnectionToData(connection);
        
        // Update element connection tracking
        this.addElementConnection(sourceElementId, connectionId);
        this.addElementConnection(targetElementId, connectionId);
        
        // Update element data model
        this.updateElementConnection(sourceElementId, sourcePoint, connection);
        this.updateElementConnection(targetElementId, targetPoint, connection);
        
        // Apply initial connection constraint
        this.applyConnectionConstraint(connection);
        
        // Notify about new connection
        this.eventBus.publish('connection:created', { connection });
        
        console.log('Connection created:', connectionId, connection);
        return connectionId;
    }
    
    // Generate unique connection ID
    generateConnectionId() {
        return `conn-${String(this.nextConnectionId++).padStart(3, '0')}`;
    }
    
    // Determine connection type based on elements and connection points
    determineConnectionType(sourceElement, targetElement, sourcePoint, targetPoint) {
        // Default rules for connection type based on element types and connection points
        
        // If connecting to grid elements, use grid connection
        if (sourceElement.kind === 'grid' || targetElement.kind === 'grid') {
            return 'grid';
        }
        
        // If connecting column to beam at endpoints, use moment connection
        if ((sourceElement.kind === 'column' || sourceElement.kind === 'beam') && 
            (targetElement.kind === 'column' || targetElement.kind === 'beam')) {
            
            // End-to-end connections are typically moment connections
            if ((sourcePoint === 'start' || sourcePoint === 'end') && 
                (targetPoint === 'start' || targetPoint === 'end')) {
                return 'moment';
            }
            
            // Mid-point connections are typically pinned
            if (sourcePoint === 'mid' || targetPoint === 'mid') {
                return 'pinned';
            }
        }
        
        // Foundation connections are typically rigid
        if (sourceElement.kind === 'foundation' || targetElement.kind === 'foundation') {
            return 'rigid';
        }
        
        // Brace connections are typically pinned
        if (sourceElement.kind === 'brace' || targetElement.kind === 'brace') {
            return 'pinned';
        }
        
        // Default to moment connection for structural elements
        return 'moment';
    }
    
    // Determine connection directionality based on element hierarchy
    determineDirectionality(sourceElement, targetElement, connectionType) {
        const sourcePriority = this.getElementPriority(sourceElement);
        const targetPriority = this.getElementPriority(targetElement);
        
        const typeConfig = this.CONNECTION_TYPES[connectionType];
        
        if (typeConfig.defaultDirectionality === 'one_way') {
            return 'one_way';
        }
        
        if (Math.abs(sourcePriority - targetPriority) > 100) {
            return 'one_way';
        }
        
        return 'two_way';
    }
    
    // Get element priority for hierarchy
    getElementPriority(element) {
        return this.ELEMENT_PRIORITIES[element.kind] || 500;
    }
    
    // Get element role in connection
    getElementRole(sourceElement, targetElement, directionality, position) {
        if (directionality === 'two_way') {
            return 'peer';
        }
        
        const sourcePriority = this.getElementPriority(sourceElement);
        const targetPriority = this.getElementPriority(targetElement);
        
        if (sourcePriority > targetPriority) {
            return position === 'source' ? 'leader' : 'follower';
        } else {
            return position === 'source' ? 'follower' : 'leader';
        }
    }
    
    // Create connection constraint
    createConstraint(connectionType, directionality) {
        const typeConfig = this.CONNECTION_TYPES[connectionType];
        
        let constraint = {
            type: connectionType,
            rigid: typeConfig.rigid,
            transfersMoment: typeConfig.transfersMoment,
            freedoms: []
        };
        
        if (directionality === 'two_way' && typeConfig.rigid) {
            constraint.sharedTransform = true;
        }
        
        return constraint;
    }
    
    // Update element's connection data
    updateElementConnection(elementId, point, connection) {
        const element = this.elementManager.getElement(elementId);
        if (!element) return;
        
        if (!element.connections) {
            element.connections = {};
        }
        
        const isSource = connection.source.elementId === elementId;
        const connectionData = isSource ? connection.source : connection.target;
        
        element.connections[point] = {
            type: 'elementConnection',
            targetElementId: isSource ? connection.target.elementId : connection.source.elementId,
            targetPoint: isSource ? connection.target.point : connection.source.point,
            connectionType: connection.type,
            connectionId: connection.id,
            role: connectionData.role
        };
    }
    
    // Add connection to element tracking
    addElementConnection(elementId, connectionId) {
        if (!this.elementConnections.has(elementId)) {
            this.elementConnections.set(elementId, new Set());
        }
        this.elementConnections.get(elementId).add(connectionId);
    }
    
    // Remove connection from element tracking
    removeElementConnection(elementId, connectionId) {
        if (this.elementConnections.has(elementId)) {
            this.elementConnections.get(elementId).delete(connectionId);
            if (this.elementConnections.get(elementId).size === 0) {
                this.elementConnections.delete(elementId);
            }
        }
    }
    
    // Get all connections for an element
    getElementConnections(elementId) {
        if (!this.elementConnections.has(elementId)) {
            return [];
        }
        
        return Array.from(this.elementConnections.get(elementId))
            .map(connectionId => this.connections.get(connectionId))
            .filter(connection => connection); // Filter out any null connections
    }
    
    // Get connection points for an element (for snap detection)
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
    
    // Apply connection constraint to update element positions
    applyConnectionConstraint(connection) {
        const calculator = this.getConnectionCalculator(connection.type);
        if (!calculator) {
            console.warn(`No calculator found for connection type: ${connection.type}`);
            return;
        }
        
        const sourceElement = this.elementManager.getElement(connection.source.elementId);
        const targetElement = this.elementManager.getElement(connection.target.elementId);
        
        if (!sourceElement || !targetElement) {
            console.warn(`Elements not found for connection: ${connection.id}`);
            return;
        }
        
        try {
            const result = calculator.calculate(sourceElement, targetElement, connection);
            
            // Update element positions without triggering further connection updates
            if (result.source && Object.keys(result.source).length > 0) {
                this.updateElementSilently(connection.source.elementId, result.source);
            }
            
            if (result.target && Object.keys(result.target).length > 0) {
                this.updateElementSilently(connection.target.elementId, result.target);
            }
            
            console.log(`Applied constraint for connection ${connection.id}`);
        } catch (error) {
            console.error(`Error applying connection constraint for ${connection.id}:`, error);
        }
    }
    
    // Update element without triggering connection updates (to prevent infinite loops)
    updateElementSilently(elementId, positionUpdates) {
        const element = this.elementManager.getElement(elementId);
        if (!element) return;
        
        // Update element data
        Object.assign(element, positionUpdates);
        
        // Update visual representation
        const mesh = this.elementManager.beamObjects.get(elementId);
        if (mesh && element.kind === 'beam') {
            const start = new THREE.Vector3(...element.start);
            const end = new THREE.Vector3(...element.end);
            
            // Update mesh position and scale
            const newLength = start.distanceTo(end);
            if (mesh.userData.originalLength) {
                mesh.scale.z = newLength / mesh.userData.originalLength;
            }
            
            if (typeof GeometryUtils !== 'undefined') {
                GeometryUtils.positionBeam(mesh, start, end, element);
            } else {
                console.warn('GeometryUtils not available, skipping beam positioning');
            }
        }
        
        // Publish visual update event
        if (this.eventBus) {
            this.eventBus.publish('element:updated', { 
                elementId: elementId, 
                elementData: element,
                silent: true 
            });
        }
    }
    
    // Get connection calculator for a specific type
    getConnectionCalculator(connectionType) {
        return ConnectionCalculators[connectionType] || null;
    }
    
    // Handle element movement and propagate to connected elements
    handleElementMoved(elementId, positionUpdates) {
        const connections = this.getElementConnections(elementId);
        
        if (connections.length === 0) return;
        
        console.log(`Element ${elementId} moved, updating ${connections.length} connections`);
        
        // Prevent circular updates
        if (this._updatingConnections) {
            return;
        }
        
        this._updatingConnections = true;
        
        try {
            connections.forEach(connection => {
                if (this.shouldPropagateChange(connection, elementId)) {
                    // Temporarily set roles based on which element was moved
                    const originalSourceRole = connection.source.role;
                    const originalTargetRole = connection.target.role;
                    
                    if (connection.source.elementId === elementId) {
                        // Source element was moved, so target should follow
                        connection.target.role = 'follower';
                        connection.source.role = 'leader';
                    } else if (connection.target.elementId === elementId) {
                        // Target element was moved, so source should follow
                        connection.source.role = 'follower';
                        connection.target.role = 'leader';
                    }
                    
                    this.applyConnectionConstraint(connection);
                    
                    // Restore original roles
                    connection.source.role = originalSourceRole;
                    connection.target.role = originalTargetRole;
                }
            });
        } finally {
            this._updatingConnections = false;
        }
    }
    
    // Check if connection change should be propagated
    shouldPropagateChange(connection, changedElementId) {
        const isSource = connection.source.elementId === changedElementId;
        const isTarget = connection.target.elementId === changedElementId;
        
        // For moment connections, always propagate changes
        if (connection.type === 'moment') {
            return true;
        }
        
        switch (connection.directionality) {
            case 'one_way':
                if (isSource && connection.source.role === 'leader') return true;
                if (isTarget && connection.target.role === 'leader') return true;
                return false;
                
            case 'two_way':
                return true; // Always propagate in two-way connections
                
            default:
                return false;
        }
    }
    
    // Handle element deletion
    handleElementDeleted(elementId) {
        const connections = this.getElementConnections(elementId);
        
        connections.forEach(connection => {
            this.deleteConnection(connection.id);
        });
    }
    
    // Delete a connection
    deleteConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            console.warn(`Connection ${connectionId} not found for deletion`);
            return false;
        }
        
        // Remove from element tracking
        this.removeElementConnection(connection.source.elementId, connectionId);
        this.removeElementConnection(connection.target.elementId, connectionId);
        
        // Remove from connection data in elements
        this.removeElementConnectionData(connection.source.elementId, connection.source.point);
        this.removeElementConnectionData(connection.target.elementId, connection.target.point);
        
        // Remove from connections map
        this.connections.delete(connectionId);
        
        // Remove from structure data
        this.removeConnectionFromData(connectionId);
        
        // Notify about deletion
        this.eventBus.publish('connection:deleted', { connectionId, connection });
        
        console.log('Connection deleted:', connectionId);
        return true;
    }
    
    // Delete multiple connections
    deleteConnections(connectionIds) {
        const results = [];
        for (const connectionId of connectionIds) {
            results.push({
                connectionId,
                success: this.deleteConnection(connectionId)
            });
        }
        return results;
    }
    
    // Delete all connections for a specific element
    deleteElementConnections(elementId) {
        const connections = this.getElementConnections(elementId);
        const connectionIds = connections.map(conn => conn.id);
        return this.deleteConnections(connectionIds);
    }
    
    // Delete all connections of a specific type
    deleteConnectionsByType(connectionType) {
        const connections = this.getAllConnections().filter(conn => conn.type === connectionType);
        const connectionIds = connections.map(conn => conn.id);
        return this.deleteConnections(connectionIds);
    }
    
    // Remove connection data from element
    removeElementConnectionData(elementId, point) {
        const element = this.elementManager.getElement(elementId);
        if (!element || !element.connections) return;
        
        delete element.connections[point];
        
        // Clean up empty connections object
        if (Object.keys(element.connections).length === 0) {
            delete element.connections;
        }
    }
    
    // Get all connections
    getAllConnections() {
        return Array.from(this.connections.values());
    }
    
    // Get connection by ID
    getConnection(connectionId) {
        return this.connections.get(connectionId);
    }
    
    // Update connection type
    updateConnectionType(connectionId, newType) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;
        
        connection.type = newType;
        connection.constraint = this.createConstraint(newType, connection.directionality);
        connection.metadata.lastModified = new Date().toISOString();
        
        // Save changes to structure data
        this.saveConnectionToData(connection);
        
        // Update element connection data
        this.updateElementConnection(connection.source.elementId, connection.source.point, connection);
        this.updateElementConnection(connection.target.elementId, connection.target.point, connection);
        
        // Apply new constraint
        this.applyConnectionConstraint(connection);
        
        // Notify about update
        this.eventBus.publish('connection:updated', { connectionId, connection });
        
        console.log('Connection type updated:', connectionId, newType);
    }
}

// Connection calculation classes
class ConnectionCalculators {
    // Moment connection: elements share exact position and rotation
    static moment = {
        calculate(sourceElement, targetElement, connection) {
            console.log('Moment connection calculation:', connection.id);
            console.log('Source role:', connection.source.role, 'Target role:', connection.target.role);
            
            const sourcePos = ConnectionCalculators.getElementPoint(sourceElement, connection.source.point);
            const targetPos = ConnectionCalculators.getElementPoint(targetElement, connection.target.point);
            
            console.log('Source pos:', sourcePos, 'Target pos:', targetPos);
            
            // For moment connections, both points should be at the same position
            // The element that was NOT moved should stay fixed, the moved element should adjust
            
            if (connection.source.role === 'follower') {
                // Source follows target
                const sourceUpdate = {};
                sourceUpdate[connection.source.point] = targetPos.toArray();
                console.log('Source update:', sourceUpdate);
                return { source: sourceUpdate, target: {} };
            } else if (connection.target.role === 'follower') {
                // Target follows source
                const targetUpdate = {};
                targetUpdate[connection.target.point] = sourcePos.toArray();
                console.log('Target update:', targetUpdate);
                return { source: {}, target: targetUpdate };
            } else {
                // Both are peers - move both to midpoint
                const midPoint = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
                const sourceUpdate = {};
                const targetUpdate = {};
                sourceUpdate[connection.source.point] = midPoint.toArray();
                targetUpdate[connection.target.point] = midPoint.toArray();
                console.log('Peer update - source:', sourceUpdate, 'target:', targetUpdate);
                return { source: sourceUpdate, target: targetUpdate };
            }
        }
    };
    
    // Pinned connection: shared position, independent rotation
    static pinned = {
        calculate(sourceElement, targetElement, connection) {
            return ConnectionCalculators.moment.calculate(sourceElement, targetElement, connection);
        }
    };
    
    // Surface attachment: element point constrained to surface
    static surface = {
        calculate(sourceElement, targetElement, connection) {
            // For now, treat as moment connection
            // TODO: Implement surface constraint logic
            return ConnectionCalculators.moment.calculate(sourceElement, targetElement, connection);
        }
    };
    
    // Edge attachment: element point constrained to edge
    static edge = {
        calculate(sourceElement, targetElement, connection) {
            // For now, treat as moment connection
            // TODO: Implement edge constraint logic
            return ConnectionCalculators.moment.calculate(sourceElement, targetElement, connection);
        }
    };
    
    // Grid attachment: element point follows grid intersection
    static grid = {
        calculate(sourceElement, targetElement, connection) {
            // For now, treat as moment connection
            // TODO: Implement grid constraint logic
            return ConnectionCalculators.moment.calculate(sourceElement, targetElement, connection);
        }
    };
    
    // Rigid connection: completely fixed with no degrees of freedom
    static rigid = {
        calculate(sourceElement, targetElement, connection) {
            // Same as moment connection but with additional constraints
            return ConnectionCalculators.moment.calculate(sourceElement, targetElement, connection);
        }
    };
    
    // Bolted connection: rigid position, limited moment transfer
    static bolted = {
        calculate(sourceElement, targetElement, connection) {
            // Similar to moment but with different constraint handling
            return ConnectionCalculators.moment.calculate(sourceElement, targetElement, connection);
        }
    };
    
    // Welded connection: full rigid connection
    static welded = {
        calculate(sourceElement, targetElement, connection) {
            return ConnectionCalculators.moment.calculate(sourceElement, targetElement, connection);
        }
    };
    
    // Sliding connection: allows movement along a defined path
    static sliding = {
        calculate(sourceElement, targetElement, connection) {
            // TODO: Implement sliding constraint logic
            return ConnectionCalculators.moment.calculate(sourceElement, targetElement, connection);
        }
    };
    
    // Spring connection: flexible with spring-like behavior
    static spring = {
        calculate(sourceElement, targetElement, connection) {
            // TODO: Implement spring constraint logic
            // For now, use pinned connection behavior
            return ConnectionCalculators.pinned.calculate(sourceElement, targetElement, connection);
        }
    };
    
    // Helper to get element point position
    static getElementPoint(element, pointId) {
        if (pointId === 'start') {
            return new THREE.Vector3(...element.start);
        } else if (pointId === 'end') {
            return new THREE.Vector3(...element.end);
        } else if (pointId === 'mid') {
            return new THREE.Vector3(
                (element.start[0] + element.end[0]) / 2,
                (element.start[1] + element.end[1]) / 2,
                (element.start[2] + element.end[2]) / 2
            );
        }
        
        // Check if element has custom connection points
        if (element.connectionPoints) {
            const cp = element.connectionPoints.find(p => p.id === pointId);
            if (cp) {
                return new THREE.Vector3(...cp.position);
            }
        }
        
        return new THREE.Vector3(...element.start); // Default fallback
    }
}