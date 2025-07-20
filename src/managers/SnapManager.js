// Manages all snapping logic
class SnapManager {
    constructor(scene, elementManager, gridManager, snapTooltip) {
        this.scene = scene;
        this.elementManager = elementManager;
        this.gridManager = gridManager;
        this.isActive = false;

        this.snapModes = {
            gridLines: true,
            gridIntersections: false,
            endpoints: true,
            edges: false,
            corners: false,
            axis: false,
            connections: false  // NEW: Connection point snapping
        };

        this.snapTolerance = 30; // World units - reduced for less sensitive snapping
        this.snapIndicator = this.createSnapIndicator();
        this.scene.add(this.snapIndicator);

        // Snap tooltip UI element
        this.snapTooltip = snapTooltip;

        // Axis snapping helper
        this.axisHelper = new THREE.AxesHelper(10000); // A large size
        this.axisHelper.visible = false;
        this.scene.add(this.axisHelper);
        this.axisSnapOrigin = null;

        // NEW: Connection mode toggle
        this.connectionMode = false;
        this.connectionManager = null; // Will be set by BeamViewer

        this.setupSnapToolbar();
    }

    activate() {
        this.isActive = true;
    }

    deactivate() {
        this.isActive = false;
        this.hideIndicator();
    }

    hideIndicator() {
        this.snapIndicator.visible = false;
        if (this.snapTooltip) {
            this.snapTooltip.style.display = 'none';
        }
    }

    createSnapIndicator() {
        const geometry = new THREE.SphereGeometry(25, 16, 16); // Size of indicator
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 });
        const indicator = new THREE.Mesh(geometry, material);
        indicator.visible = false;
        return indicator;
    }

    setupSnapToolbar() {
        const toolbar = document.getElementById('snap-toolbar');
        if (!toolbar) return;

        toolbar.addEventListener('click', (event) => {
            const button = event.target.closest('.snap-button');
            if (!button) return;

            button.classList.toggle('active');

            switch (button.id) {
                case 'snap-grid-lines':
                    this.snapModes.gridLines = button.classList.contains('active');
                    break;
                case 'snap-grid-intersections':
                    this.snapModes.gridIntersections = button.classList.contains('active');
                    break;
                case 'snap-endpoints':
                    this.snapModes.endpoints = button.classList.contains('active');
                    break;
                case 'snap-edges':
                    this.snapModes.edges = button.classList.contains('active');
                    break;
                case 'snap-corners':
                    this.snapModes.corners = button.classList.contains('active');
                    break;
                case 'snap-axis':
                    this.snapModes.axis = button.classList.contains('active');
                    break;
                case 'snap-connections':
                    this.snapModes.connections = button.classList.contains('active');
                    break;
                case 'connection-mode':
                    this.connectionMode = button.classList.contains('active');
                    console.log('Connection mode:', this.connectionMode);
                    break;
            }
            console.log('Snap modes updated:', this.snapModes);
        });
    }

    startAxisSnap(stationaryPoint) {
        if (!this.snapModes.axis) return;
        this.axisSnapOrigin = stationaryPoint.clone();
        this.axisHelper.position.copy(this.axisSnapOrigin);
        this.axisHelper.visible = true;
    }

    endAxisSnap() {
        this.axisSnapOrigin = null;
        this.axisHelper.visible = false;
    }

    // NEW: Connection manager integration
    setConnectionManager(connectionManager) {
        this.connectionManager = connectionManager;
    }

    // NEW: Check if connection mode is active
    isConnectionMode() {
        return this.connectionMode;
    }

    // NEW: Enable/disable connection mode
    setConnectionMode(enabled) {
        this.connectionMode = enabled;
        console.log('Connection mode set to:', enabled);
        
        // Update UI button state in snap toolbar
        const button = document.getElementById('connection-mode');
        if (button) {
            if (enabled) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
        
        // Update UI button state in connection panel
        const connectionPanel = document.getElementById('connection-panel');
        if (connectionPanel) {
            const toggle = connectionPanel.querySelector('#connection-toggle');
            if (toggle) {
                if (enabled) {
                    toggle.classList.add('active');
                    toggle.querySelector('.toggle-text').textContent = 'Enabled';
                } else {
                    toggle.classList.remove('active');
                    toggle.querySelector('.toggle-text').textContent = 'Disabled';
                }
            }
        }
    }

    // NEW: Check if two elements are already connected
    areElementsConnected(elementId1, elementId2) {
        if (!this.connectionManager) return false;
        
        const connections = this.connectionManager.getAllConnections();
        return connections.some(connection => {
            return (connection.source.elementId === elementId1 && connection.target.elementId === elementId2) ||
                   (connection.source.elementId === elementId2 && connection.target.elementId === elementId1);
        });
    }

    // NEW: Check if specific connection point is already connected to the dragged element
    isConnectionPointConnectedToDraggedElement(elementId, pointId, draggedElementId) {
        if (!this.connectionManager || !draggedElementId) return false;
        
        const connections = this.connectionManager.getAllConnections();
        return connections.some(connection => {
            // Check if there's a connection between elementId:pointId and draggedElementId (any point)
            return ((connection.source.elementId === elementId && connection.source.point === pointId && 
                     connection.target.elementId === draggedElementId) ||
                    (connection.target.elementId === elementId && connection.target.point === pointId && 
                     connection.source.elementId === draggedElementId));
        });
    }

    // NEW: Check if specific connection point is already connected
    isConnectionPointConnected(elementId, pointId) {
        if (!this.connectionManager) return false;
        
        const connections = this.connectionManager.getAllConnections();
        return connections.some(connection => {
            return (connection.source.elementId === elementId && connection.source.point === pointId) ||
                   (connection.target.elementId === elementId && connection.target.point === pointId);
        });
    }

    findSnapPoint(raycaster, mouse, event, draggedElementId = null) {
        if (!this.isActive) {
            this.hideIndicator();
            return null;
        }

        let bestSnap = { point: null, distance: Infinity, priority: 4, description: '' };
        const screenTolerance = 0.05; // Screen-space tolerance for snapping - reduced for less sensitive snapping

        // --- Helper Function ---
        const checkAndUpdateSnap = (point, priority, description) => {
            if (!point) return;
            if (priority > bestSnap.priority) return;

            // Check if the point is within a reasonable distance from the mouse ray
            const distanceToRay = raycaster.ray.distanceToPoint(point);
            if (distanceToRay > this.snapTolerance) return; // Use same tolerance for consistent behavior

            // Project to screen and check proximity to mouse cursor
            const projectedPoint = point.clone().project(raycaster.camera);
            const screenDist = new THREE.Vector2(projectedPoint.x, projectedPoint.y).distanceTo(mouse);
            if (screenDist > screenTolerance) return;
            
            // Update best snap if this one is better
            if (priority < bestSnap.priority || (priority === bestSnap.priority && screenDist < bestSnap.distance)) {
                bestSnap = { point: point.clone(), distance: screenDist, priority: priority, description: description };
            }
        };

        // --- Main Logic ---

        // Get all potential snap candidates first
        const pointCandidates = this.getPointCandidates(draggedElementId);
        const lineCandidates = this.getLineCandidates(draggedElementId);
        const intersectionCandidates = this.getIntersectionCandidates(lineCandidates);

        // --- Original Behavior (Find best geometric snap point) ---
        pointCandidates.forEach(p => checkAndUpdateSnap(p.point, p.priority, p.description));
        intersectionCandidates.forEach(p => checkAndUpdateSnap(p.point, p.priority, p.description));
        lineCandidates.forEach(l => {
            const snapPoint = new THREE.Vector3();
            raycaster.ray.distanceSqToSegment(l.line.start, l.line.end, null, snapPoint);
            checkAndUpdateSnap(snapPoint, l.priority, l.description);
        });

        // --- Axis Constraint Logic (Applied after finding the best snap) ---
        if (this.snapModes.axis && this.axisSnapOrigin) {
            const axisLines = [
                { name: 'X', line: new THREE.Line3(this.axisSnapOrigin.clone().add(new THREE.Vector3(-10000, 0, 0)), this.axisSnapOrigin.clone().add(new THREE.Vector3(10000, 0, 0))) },
                { name: 'Y', line: new THREE.Line3(this.axisSnapOrigin.clone().add(new THREE.Vector3(0, -10000, 0)), this.axisSnapOrigin.clone().add(new THREE.Vector3(0, 10000, 0))) },
                { name: 'Z', line: new THREE.Line3(this.axisSnapOrigin.clone().add(new THREE.Vector3(0, 0, -10000)), this.axisSnapOrigin.clone().add(new THREE.Vector3(0, 0, 10000))) }
            ];

            // 1. Find which of the three axes is closest to the mouse ray to determine user's intent
            let closestAxis = null;
            let minAxisDistSq = Infinity;
            axisLines.forEach(axis => {
                const distSq = raycaster.ray.distanceSqToSegment(axis.line.start, axis.line.end);
                if (distSq < minAxisDistSq) {
                    minAxisDistSq = distSq;
                    closestAxis = axis;
                }
            });

            if (bestSnap.point) {
                // 2a. A geometric snap was found, so constrain it to the chosen axis.
                const constrainedPoint = bestSnap.point.clone();
                const origin = this.axisSnapOrigin;

                switch (closestAxis.name) {
                    case 'X':
                        constrainedPoint.y = origin.y;
                        constrainedPoint.z = origin.z;
                        break;
                    case 'Y':
                        constrainedPoint.x = origin.x;
                        constrainedPoint.z = origin.z;
                        break;
                    case 'Z':
                        constrainedPoint.x = origin.x;
                        constrainedPoint.y = origin.y;
                        break;
                }
                bestSnap.point = constrainedPoint;
                bestSnap.description += ` (On ${closestAxis.name} Axis)`;
                bestSnap.priority = 0; // Axis constraint is highest priority
            } else {
                // 2b. No geometric snap found, so snap directly to the axis line.
                const axisPoint = new THREE.Vector3();
                raycaster.ray.distanceSqToSegment(closestAxis.line.start, closestAxis.line.end, null, axisPoint);
                checkAndUpdateSnap(axisPoint, 2, `Axis ${closestAxis.name}`);
            }
        }

        if (bestSnap.point) {
            this.snapIndicator.position.copy(bestSnap.point);
            this.snapIndicator.visible = true;
            if (this.snapTooltip) {
                this.snapTooltip.textContent = bestSnap.description;
                this.snapTooltip.style.display = 'block';
                // Position the tooltip near the cursor
                if (event && event.clientX) {
                    this.snapTooltip.style.left = `${event.clientX + 15}px`;
                    this.snapTooltip.style.top = `${event.clientY + 15}px`;
                }
            }
            return bestSnap.point;
        } else {
            this.hideIndicator();
            return null;
        }
    }

    getPointCandidates(draggedElementId) {
        const candidates = [];
        // Endpoint Snapping
        if (this.snapModes.endpoints) {
            this.elementManager.getAllElements().forEach(element => {
                if (element.id === draggedElementId || element.kind !== 'beam') return;
                
                // Check start point - only exclude if already connected to the dragged element
                if (!this.isConnectionPointConnectedToDraggedElement(element.id, 'start', draggedElementId)) {
                    candidates.push({ 
                        point: new THREE.Vector3(...element.start), 
                        priority: 1, 
                        description: 'Endpoint',
                        elementId: element.id,
                        connectionPointId: 'start'
                    });
                }
                
                // Check end point - only exclude if already connected to the dragged element
                if (!this.isConnectionPointConnectedToDraggedElement(element.id, 'end', draggedElementId)) {
                    candidates.push({ 
                        point: new THREE.Vector3(...element.end), 
                        priority: 1, 
                        description: 'Endpoint',
                        elementId: element.id,
                        connectionPointId: 'end'
                    });
                }
            });
        }
        // Corner Snapping
        if (this.snapModes.corners) {
            this.elementManager.getAllElements().forEach(element => {
                if (element.id === draggedElementId) return;
                const mesh = this.elementManager.beamObjects.get(element.id);
                if (!mesh) return;
                const position = mesh.geometry.attributes.position;
                mesh.updateWorldMatrix(true, false);
                for (let i = 0; i < position.count; i++) {
                    candidates.push({ point: new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld), priority: 1, description: 'Corner' });
                }
            });
        }
        // Grid Intersection Snapping
        if (this.snapModes.gridIntersections) {
            this.gridManager.getIntersectionPoints().forEach(point => {
                candidates.push({ point: point, priority: 2, description: 'Grid Intersection' });
            });
        }
        
        // NEW: Connection Point Snapping
        if (this.snapModes.connections && this.connectionManager) {
            this.elementManager.getAllElements().forEach(element => {
                if (element.id === draggedElementId) return;
                
                const connectionPoints = this.connectionManager.getElementConnectionPoints(element);
                connectionPoints.forEach(cp => {
                    // Only exclude connection points that are already connected to the dragged element
                    if (!this.isConnectionPointConnectedToDraggedElement(element.id, cp.id, draggedElementId)) {
                        candidates.push({ 
                            point: cp.position, 
                            priority: 0, // High priority for connection points
                            description: `${cp.type} Connection Point`,
                            elementId: element.id,
                            connectionPointId: cp.id
                        });
                    }
                });
            });
        }
        
        return candidates;
    }

    getLineCandidates(draggedElementId) {
        const candidates = [];
        // Grid Line Snapping
        if (this.snapModes.gridLines) {
            this.gridManager.getGridLines().forEach(lineObj => {
                const line = new THREE.Line3(
                    new THREE.Vector3().fromBufferAttribute(lineObj.geometry.attributes.position, 0),
                    new THREE.Vector3().fromBufferAttribute(lineObj.geometry.attributes.position, 1)
                );
                line.applyMatrix4(lineObj.parent.matrixWorld);
                candidates.push({ line: line, priority: 3, source: 'grid', description: 'Grid Line' });
            });
        }
        // Edge Snapping
        if (this.snapModes.edges) {
            this.elementManager.getAllElements().forEach(element => {
                if (element.id === draggedElementId) return;
                const mesh = this.elementManager.beamObjects.get(element.id);
                if (!mesh) return;
                const pos = mesh.geometry.attributes.position;
                const idx = mesh.geometry.index;
                mesh.updateWorldMatrix(true, false);
                if (idx) {
                    for (let i = 0; i < idx.count; i += 3) {
                        const a = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(i)).applyMatrix4(mesh.matrixWorld);
                        const b = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(i + 1)).applyMatrix4(mesh.matrixWorld);
                        const c = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(i + 2)).applyMatrix4(mesh.matrixWorld);
                        candidates.push({ line: new THREE.Line3(a, b), priority: 3, source: 'edge', description: 'Edge' });
                        candidates.push({ line: new THREE.Line3(b, c), priority: 3, source: 'edge', description: 'Edge' });
                        candidates.push({ line: new THREE.Line3(c, a), priority: 3, source: 'edge', description: 'Edge' });
                    }
                }
            });
        }
        return candidates;
    }

    getIntersectionCandidates(lineCandidates) {
        const intersections = [];
        for (let i = 0; i < lineCandidates.length; i++) {
            for (let j = i + 1; j < lineCandidates.length; j++) {
                const L1 = lineCandidates[i];
                const L2 = lineCandidates[j];

                // Don't intersect lines from the same source (e.g. two grid lines might be parallel)
                if (L1.source === L2.source) continue;
                
                const intersectionPoint = this.getLineLineIntersection(L1.line, L2.line);
                if (intersectionPoint) {
                    // Intersection of two lines is a high-priority snap.
                    const description = `Intersection: ${L1.description} / ${L2.description}`;
                    intersections.push({ point: intersectionPoint, priority: 0, description: description });
                }
            }
        }
        return intersections;
    }

    getLineLineIntersection(line1, line2) {
        // Using the same math as ray-line, but for two lines.
        // http://geomalgorithms.com/a07-_distance.html
        const p1 = line1.start;
        const v1 = new THREE.Vector3().subVectors(line1.end, line1.start).normalize();
        const p2 = line2.start;
        const v2 = new THREE.Vector3().subVectors(line2.end, line2.start).normalize();

        const v12 = new THREE.Vector3().crossVectors(v1, v2);
        // If lines are parallel, the cross product length will be close to zero.
        if (v12.lengthSq() < 1e-6) {
            return null;
        }

        // Check for coplanarity. If they aren't coplanar, they don't intersect.
        const w0 = new THREE.Vector3().subVectors(p1, p2);
        if (Math.abs(w0.dot(v12)) > 0.1) { // Allow some tolerance
            return null;
        }

        // Solve for intersection parameter on line1
        const w0xv2 = new THREE.Vector3().crossVectors(w0, v2);
        const s = w0xv2.dot(v12) / v12.lengthSq();
        
        const intersectionPoint = p1.clone().addScaledVector(v1, s);
        
        // Optional: Check if the intersection point lies on the segments (if they are segments)
        // For now, we treat them as infinite lines.

        return intersectionPoint;
    }
}

// The helper functions below are no longer needed with the new logic.
// THREE.Ray.prototype.closestPointToSegment = function(p1, p2) {
//     const direction = new THREE.Vector3().subVectors(p2, p1);
//     const lengthSq = direction.lengthSq();
//     if (lengthSq === 0) {
//         return this.closestPointToPoint(p1);
//     }
//     const t = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(this.origin, p1).dot(direction) / lengthSq));
//     const projection = p1.clone().addScaledVector(direction, t);
//     return this.closestPointToPoint(projection);
// }; 

// THREE.Ray.prototype.closestPointToLine = function(p1, p2) {
//     const direction = new THREE.Vector3().subVectors(p2, p1);
//     const lengthSq = direction.lengthSq();
//     if (lengthSq === 0) {
//         return this.closestPointToPoint(p1);
//     }
//     const t = new THREE.Vector3().subVectors(this.origin, p1).dot(direction) / lengthSq;
//     const projection = p1.clone().addScaledVector(direction, t);
//     return this.closestPointToPoint(projection);
// } 