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
            axis: false
        };

        this.snapTolerance = 100; // World units
        this.snapIndicator = this.createSnapIndicator();
        this.scene.add(this.snapIndicator);

        // Snap tooltip UI element
        this.snapTooltip = snapTooltip;

        // Axis snapping helper
        this.axisHelper = new THREE.AxesHelper(10000); // A large size
        this.axisHelper.visible = false;
        this.scene.add(this.axisHelper);
        this.axisSnapOrigin = null;

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

    findSnapPoint(raycaster, mouse, event, draggedElementId = null) {
        if (!this.isActive) {
            this.hideIndicator();
            return null;
        }

        let bestSnap = { point: null, distance: Infinity, priority: 4, description: '' };
        const screenTolerance = 0.2; // Screen-space tolerance for snapping

        // --- Helper Function ---
        const checkAndUpdateSnap = (point, priority, description) => {
            if (!point) return;
            if (priority > bestSnap.priority) return;

            // Check if the point is within a reasonable distance from the mouse ray
            const distanceToRay = raycaster.ray.distanceToPoint(point);
            if (distanceToRay > this.snapTolerance * 2) return; // A wider tolerance for initial check

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
                candidates.push({ point: new THREE.Vector3(...element.start), priority: 1, description: 'Endpoint' });
                candidates.push({ point: new THREE.Vector3(...element.end), priority: 1, description: 'Endpoint' });
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