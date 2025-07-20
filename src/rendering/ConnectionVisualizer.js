// Visualizes connections in 3D space
class ConnectionVisualizer {
    constructor(scene, connectionManager) {
        if (typeof THREE === 'undefined') {
            throw new Error('ConnectionVisualizer requires THREE.js to be loaded');
        }
        if (!scene) {
            throw new Error('ConnectionVisualizer requires a scene');
        }
        if (!connectionManager) {
            throw new Error('ConnectionVisualizer requires a connectionManager');
        }
        
        this.scene = scene;
        this.connectionManager = connectionManager;
        this.connectionLines = new Map(); // connectionId -> line mesh
        this.connectionSymbols = new Map(); // connectionId -> symbol mesh
        this.isVisible = true;
        
        // Visual settings
        this.COLORS = {
            moment: 0x4a9eff,    // Blue for moment connections
            pinned: 0x4a9f4a,    // Green for pinned connections
            surface: 0xffa64a,   // Orange for surface attachments
            edge: 0xff4a4a,      // Red for edge attachments
            grid: 0x9f4aff,      // Purple for grid attachments
            selected: 0xffff4a,  // Yellow for selected connections
            error: 0xff4444      // Red for error state
        };
        
        this.LINE_STYLES = {
            moment: { dashSize: 0, gapSize: 0 },      // Solid line
            pinned: { dashSize: 10, gapSize: 5 },     // Dashed line
            surface: { dashSize: 5, gapSize: 3 },     // Dotted line
            edge: { dashSize: 15, gapSize: 8 },       // Long dashes
            grid: { dashSize: 8, gapSize: 8 }         // Medium dashes
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for connection events
        this.connectionManager.eventBus.subscribe('connection:created', (data) => {
            console.log('ConnectionVisualizer: connection:created event received for', data.connection.id);
            this.showConnection(data.connection);
        });
        
        this.connectionManager.eventBus.subscribe('connection:deleted', (data) => {
            this.hideConnection(data.connectionId);
        });
        
        this.connectionManager.eventBus.subscribe('connection:updated', (data) => {
            this.updateConnection(data.connection);
        });
        
        // Listen for element changes to update connection positions
        this.connectionManager.eventBus.subscribe('element:updated', (data) => {
            console.log('ConnectionVisualizer: Element updated:', data.elementId, 'silent:', data.silent);
            this.updateElementConnections(data.elementId);
        });
    }
    
    // Show a connection in 3D
    showConnection(connection) {
        console.log('ConnectionVisualizer: showConnection called for', connection.id, 'visible:', this.isVisible);
        
        if (!this.isVisible) {
            console.log('ConnectionVisualizer not visible, skipping');
            return;
        }
        
        const line = this.createConnectionLine(connection);
        const symbol = this.createConnectionSymbol(connection);
        
        console.log('Created line:', !!line, 'symbol:', !!symbol);
        
        if (line) {
            this.scene.add(line);
            this.connectionLines.set(connection.id, line);
            console.log('Line added to scene');
        }
        
        if (symbol) {
            this.scene.add(symbol);
            this.connectionSymbols.set(connection.id, symbol);
            console.log('Symbol added to scene');
        }
    }
    
    // Hide a connection
    hideConnection(connectionId) {
        const line = this.connectionLines.get(connectionId);
        if (line) {
            this.scene.remove(line);
            this.connectionLines.delete(connectionId);
        }
        
        const symbol = this.connectionSymbols.get(connectionId);
        if (symbol) {
            this.scene.remove(symbol);
            this.connectionSymbols.delete(connectionId);
        }
    }
    
    // Update a connection's visualization
    updateConnection(connection) {
        console.log('ConnectionVisualizer: Updating connection visualization for', connection.id);
        
        // Update line position
        const line = this.connectionLines.get(connection.id);
        if (line) {
            const sourcePos = this.getConnectionPosition(connection.source);
            const targetPos = this.getConnectionPosition(connection.target);
            
            if (sourcePos && targetPos) {
                const geometry = line.geometry;
                const positions = geometry.attributes.position.array;
                positions[0] = sourcePos.x;
                positions[1] = sourcePos.y;
                positions[2] = sourcePos.z;
                positions[3] = targetPos.x;
                positions[4] = targetPos.y;
                positions[5] = targetPos.z;
                geometry.attributes.position.needsUpdate = true;
                
                if (line.material.type === 'LineDashedMaterial') {
                    line.computeLineDistances();
                }
            }
        }
        
        // Update symbol position
        const symbol = this.connectionSymbols.get(connection.id);
        if (symbol) {
            const sourcePos = this.getConnectionPosition(connection.source);
            const targetPos = this.getConnectionPosition(connection.target);
            
            if (sourcePos && targetPos) {
                const midPos = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
                symbol.position.copy(midPos);
            }
        }
        
        // If line or symbol doesn't exist, recreate them
        if (!line || !symbol) {
            this.hideConnection(connection.id);
            this.showConnection(connection);
        }
    }
    
    // Update all connections for an element
    updateElementConnections(elementId) {
        const connections = this.connectionManager.getElementConnections(elementId);
        console.log(`ConnectionVisualizer: Updating ${connections.length} connections for element ${elementId}`);
        connections.forEach(connection => {
            console.log(`ConnectionVisualizer: Updating connection ${connection.id}`);
            this.updateConnection(connection);
        });
    }
    
    // Create a line representing the connection
    createConnectionLine(connection) {
        const sourcePos = this.getConnectionPosition(connection.source);
        const targetPos = this.getConnectionPosition(connection.target);
        
        if (!sourcePos || !targetPos) {
            console.warn('Could not get positions for connection:', connection.id);
            return null;
        }
        
        const color = this.COLORS[connection.type] || this.COLORS.pinned;
        const lineStyle = this.LINE_STYLES[connection.type] || this.LINE_STYLES.pinned;
        
        let material;
        if (lineStyle.dashSize > 0) {
            material = new THREE.LineDashedMaterial({
                color: color,
                dashSize: lineStyle.dashSize,
                gapSize: lineStyle.gapSize,
                linewidth: 2
            });
        } else {
            material = new THREE.LineBasicMaterial({
                color: color,
                linewidth: 2
            });
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints([sourcePos, targetPos]);
        const line = new THREE.Line(geometry, material);
        
        if (lineStyle.dashSize > 0) {
            line.computeLineDistances();
        }
        
        // Store connection data for interaction
        line.userData = {
            connectionId: connection.id,
            type: 'connection-line'
        };
        
        return line;
    }
    
    // Create a symbol at the connection point
    createConnectionSymbol(connection) {
        console.log('Creating connection symbol for', connection.id, 'type:', connection.type);
        
        const sourcePos = this.getConnectionPosition(connection.source);
        const targetPos = this.getConnectionPosition(connection.target);
        
        console.log('Source pos:', sourcePos, 'Target pos:', targetPos);
        
        if (!sourcePos || !targetPos) {
            console.log('Missing positions for symbol creation');
            return null;
        }
        
        // Place symbol at midpoint
        const midPos = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
        console.log('Symbol midpoint:', midPos);
        
        const symbol = this.createSymbolGeometry(connection.type);
        const color = this.COLORS[connection.type] || this.COLORS.pinned;
        
        console.log('Symbol geometry created:', !!symbol, 'color:', color);
        
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(symbol, material);
        mesh.position.copy(midPos);
        
        // Scale symbol based on distance from camera (if needed)
        const scale = Math.max(0.5, Math.min(2.0, midPos.length() / 1000));
        mesh.scale.setScalar(scale);
        
        // Store connection data for interaction
        mesh.userData = {
            connectionId: connection.id,
            type: 'connection-symbol'
        };
        
        return mesh;
    }
    
    // Create symbol geometry based on connection type
    createSymbolGeometry(connectionType) {
        switch (connectionType) {
            case 'moment':
                // Full circle for moment connection
                return new THREE.CircleGeometry(50, 16);
                
            case 'pinned':
                // Ring for pinned connection
                return new THREE.RingGeometry(30, 50, 16);
                
            case 'surface':
                // Square for surface attachment
                return new THREE.PlaneGeometry(80, 80);
                
            case 'edge':
                // Line for edge attachment
                return new THREE.PlaneGeometry(100, 20);
                
            case 'grid':
                // Grid pattern for grid attachment
                return new THREE.PlaneGeometry(60, 60);
                
            default:
                return new THREE.CircleGeometry(40, 12);
        }
    }
    
    // Get 3D position for a connection point
    getConnectionPosition(connectionPoint) {
        const element = this.connectionManager.elementManager.getElement(connectionPoint.elementId);
        if (!element) return null;
        
        if (connectionPoint.point === 'start') {
            return new THREE.Vector3(...element.start);
        } else if (connectionPoint.point === 'end') {
            return new THREE.Vector3(...element.end);
        } else if (connectionPoint.point === 'mid') {
            return new THREE.Vector3(
                (element.start[0] + element.end[0]) / 2,
                (element.start[1] + element.end[1]) / 2,
                (element.start[2] + element.end[2]) / 2
            );
        }
        
        // Check for custom connection points
        if (element.connectionPoints) {
            const cp = element.connectionPoints.find(p => p.id === connectionPoint.point);
            if (cp) {
                return new THREE.Vector3(...cp.position);
            }
        }
        
        return new THREE.Vector3(...element.start); // Default fallback
    }
    
    // Show all connections
    showAllConnections() {
        const connections = this.connectionManager.getAllConnections();
        connections.forEach(connection => {
            this.showConnection(connection);
        });
    }
    
    // Hide all connections
    hideAllConnections() {
        this.connectionLines.forEach((line, connectionId) => {
            this.scene.remove(line);
        });
        this.connectionSymbols.forEach((symbol, connectionId) => {
            this.scene.remove(symbol);
        });
        
        this.connectionLines.clear();
        this.connectionSymbols.clear();
    }
    
    // Toggle connection visibility
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.showAllConnections();
        } else {
            this.hideAllConnections();
        }
    }
    
    // Set connection visibility
    setVisibility(visible) {
        this.isVisible = visible;
        
        if (visible) {
            this.showAllConnections();
        } else {
            this.hideAllConnections();
        }
    }
    
    // Highlight a connection (for selection)
    highlightConnection(connectionId) {
        const line = this.connectionLines.get(connectionId);
        const symbol = this.connectionSymbols.get(connectionId);
        
        if (line) {
            line.material.color.setHex(this.COLORS.selected);
        }
        
        if (symbol) {
            symbol.material.color.setHex(this.COLORS.selected);
            symbol.material.opacity = 1.0;
        }
    }
    
    // Remove highlight from a connection
    unhighlightConnection(connectionId) {
        const connection = this.connectionManager.getConnection(connectionId);
        if (!connection) return;
        
        const line = this.connectionLines.get(connectionId);
        const symbol = this.connectionSymbols.get(connectionId);
        const color = this.COLORS[connection.type] || this.COLORS.pinned;
        
        if (line) {
            line.material.color.setHex(color);
        }
        
        if (symbol) {
            symbol.material.color.setHex(color);
            symbol.material.opacity = 0.8;
        }
    }
    
    // Get connection at screen position (for mouse interaction)
    getConnectionAtPosition(raycaster) {
        const intersections = [];
        
        // Check connection lines
        const lines = Array.from(this.connectionLines.values());
        const lineIntersections = raycaster.intersectObjects(lines);
        intersections.push(...lineIntersections);
        
        // Check connection symbols
        const symbols = Array.from(this.connectionSymbols.values());
        const symbolIntersections = raycaster.intersectObjects(symbols);
        intersections.push(...symbolIntersections);
        
        if (intersections.length > 0) {
            // Sort by distance and return closest
            intersections.sort((a, b) => a.distance - b.distance);
            return intersections[0].object.userData.connectionId;
        }
        
        return null;
    }
    
    // Update all visualizations (called when elements change)
    updateAll() {
        const connections = this.connectionManager.getAllConnections();
        connections.forEach(connection => {
            this.updateConnection(connection);
        });
    }
    
    // Clean up resources
    dispose() {
        this.hideAllConnections();
    }
}