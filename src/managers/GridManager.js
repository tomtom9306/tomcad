class GridManager {
    constructor(scene, structureData, eventBus, camera, raycaster) {
        this.scene = scene;
        this.structureData = structureData;
        this.eventBus = eventBus;
        this.camera = camera;
        this.raycaster = raycaster;

        this.gridContainer = new THREE.Group();
        this.scene.add(this.gridContainer);

        this.gridLines = []; // To store line objects for raycasting
        this.highlightMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
        this.intersectMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
        this.snapDistance = 100; // World units, but applied in local space

        // Store grid coordinates
        this.xCoords = [];
        this.yCoords = [];
        this.zCoords = [];

        if (this.eventBus) {
            this.eventBus.subscribe('viewer:mouseMove', (data) => this._handleHighlighting(data));
        }
    }

    createGrids() {
        if (!this.structureData.grids) {
            return;
        }

        this.structureData.grids.forEach(gridData => {
            if (gridData.type === 'rectangular') {
                this.createRectangularGrid(gridData);
            }
        });
    }

    createRectangularGrid(gridData) {
        this.gridContainer.clear();
        this.gridLines = [];
        this.xCoords = [];
        this.yCoords = [];
        this.zCoords = [];

        const origin = new THREE.Vector3(...gridData.origin);
        this.gridContainer.position.copy(origin);
        
        if (gridData.rotation && gridData.rotation.type === 'Euler') {
            const values = gridData.rotation.values.map(v => THREE.MathUtils.degToRad(v));
            this.gridContainer.rotation.set(...values, gridData.rotation.order);
        }

        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 });

        // Calculate and store absolute coordinates for grid lines based on spacings.
        // The first spacing is relative to the origin, subsequent are relative to the previous line.
        this.xCoords = [];
        let accumulatedX = 0;
        gridData.xSpacings.forEach(s => {
            accumulatedX += s;
            this.xCoords.push(accumulatedX);
        });

        this.yCoords = [];
        let accumulatedY = 0;
        gridData.ySpacings.forEach(s => {
            accumulatedY += s;
            this.yCoords.push(accumulatedY);
        });

        this.zCoords = gridData.zLevels || []; // Z levels are absolute coordinates

        // Get extensions or use defaults
        const xExt = gridData.xExtensions || [0, 0];
        const yExt = gridData.yExtensions || [0, 0];
        const zExt = gridData.zExtensions || [0, 0];

        // Determine grid boundaries, handling cases where no lines exist on an axis.
        const minX = (this.xCoords.length > 0 ? Math.min(...this.xCoords) : 0) - xExt[0];
        const maxX = (this.xCoords.length > 0 ? Math.max(...this.xCoords) : 0) + xExt[1];
        const minY = (this.yCoords.length > 0 ? Math.min(...this.yCoords) : 0) - yExt[0];
        const maxY = (this.yCoords.length > 0 ? Math.max(...this.yCoords) : 0) + yExt[1];
        const minZ = (this.zCoords.length > 0 ? Math.min(...this.zCoords) : 0) - zExt[0];
        const maxZ = (this.zCoords.length > 0 ? Math.max(...this.zCoords) : 0) + zExt[1];

        const addGridLine = (p1, p2, axis, value, label) => {
            const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const line = new THREE.Line(geometry, lineMaterial.clone());
            line.userData = { 
                type: 'gridline',
                isGridLine: true,
                gridId: gridData.id,
                axis: axis,
                value: value,
                label: label,
                originalMaterial: line.material 
            };
            this.gridContainer.add(line);
            this.gridLines.push(line);
        };

        // Create grids on each Z-level
        this.zCoords.forEach((z, zIndex) => {
            // Create lines parallel to X-axis (Y-lines)
            this.yCoords.forEach((y, yIndex) => {
                addGridLine(
                    new THREE.Vector3(minX, y, z), 
                    new THREE.Vector3(maxX, y, z),
                    'Y', y, gridData.yLabels[yIndex]
                );
            });

            // Create lines parallel to Y-axis (X-lines)
            this.xCoords.forEach((x, xIndex) => {
                addGridLine(
                    new THREE.Vector3(x, minY, z), 
                    new THREE.Vector3(x, maxY, z),
                    'X', x, gridData.xLabels[xIndex]
                );
            });
        });

        // Create vertical grid lines (parallel to Z-axis)
        this.xCoords.forEach((x, xIndex) => {
            this.yCoords.forEach((y, yIndex) => {
                // Only create vertical lines at main intersection points
                addGridLine(
                    new THREE.Vector3(x, y, minZ), 
                    new THREE.Vector3(x, y, maxZ),
                    'Z', 0, `${gridData.xLabels[xIndex]}-${gridData.yLabels[yIndex]}`
                );
            });
        });
        
        // Note: Labels are not yet implemented.
    }

    getGridLines() {
        return this.gridLines;
    }

    getIntersectionPoints() {
        const intersectionPoints = [];
        const lines = this.gridLines.map(line => {
            const line3 = new THREE.Line3(
                new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position, 0),
                new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position, 1)
            );
            line3.applyMatrix4(this.gridContainer.matrixWorld);
            return line3;
        });

        for (let i = 0; i < lines.length; i++) {
            for (let j = i + 1; j < lines.length; j++) {
                const line1 = lines[i];
                const line2 = lines[j];

                // Simple check for axis-aligned lines in the same plane
                const dir1 = new THREE.Vector3().subVectors(line1.end, line1.start).normalize();
                const dir2 = new THREE.Vector3().subVectors(line2.end, line2.start).normalize();
                
                // If lines are parallel, they don't intersect
                if (Math.abs(dir1.dot(dir2)) > 0.999) continue;

                // A simplified approach for axis-aligned grids
                // Find intersection of two line segments
                const start1 = line1.start;
                const end1 = line1.end;
                const start2 = line2.start;
                const end2 = line2.end;
                
                // This logic is complex. For now, let's assume a simple case
                // where grids are on the same plane and axis aligned.
                // A full 3D line-line intersection is more involved.
                // Let's find the intersection based on coordinates.
                if (Math.abs(dir1.x) > 0.9 && Math.abs(dir2.z) > 0.9) { // X-line and Z-line
                    intersectionPoints.push(new THREE.Vector3(start2.x, start1.y, start1.z));
                } else if (Math.abs(dir1.z) > 0.9 && Math.abs(dir2.x) > 0.9) { // Z-line and X-line
                    intersectionPoints.push(new THREE.Vector3(start1.x, start2.y, start2.z));
                }
            }
        }
        return intersectionPoints;
    }

    unhighlightAllLines() {
        this.gridLines.forEach(line => {
            line.material = line.userData.originalMaterial;
        });
    }

    _handleHighlighting(eventData) {
        if (!eventData || !eventData.rawMouse) return;

        this.raycaster.setFromCamera(eventData.rawMouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.gridLines);

        if (intersects.length > 0) {
            const closestIntersect = intersects[0];
            const point = closestIntersect.point;

            const highlightedLines = [];
            this.gridLines.forEach(line => {
                const line3 = new THREE.Line3(
                    new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position, 0),
                    new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position, 1)
                );
                line3.applyMatrix4(this.gridContainer.matrixWorld);

                const closestPointOnLine = new THREE.Vector3();
                line3.closestPointToPoint(point, true, closestPointOnLine);
                
                if (point.distanceTo(closestPointOnLine) < 1) {
                    highlightedLines.push(line);
                }
            });

            if (highlightedLines.length > 0) {
                this.highlightLines(highlightedLines);
            } else {
                this.unhighlightAllLines();
            }
        } else {
            this.unhighlightAllLines();
        }
    }

    highlightLines(linesToHighlight) {
        this.unhighlightAllLines();
        linesToHighlight.forEach(line => {
            line.material = this.highlightMaterial;
        });
    }
    
    getClosestSnapPoint(point) {
        // Convert the world-space point to the grid's local space
        const localPoint = this.gridContainer.worldToLocal(point.clone());
        const snappedPointLocal = localPoint.clone();
        let didSnap = false;

        // Helper function to find the closest coordinate on an axis
        const snapAxis = (targetCoord, gridCoords) => {
            let bestSnap = targetCoord;
            let minDistance = this.snapDistance;
            let snapped = false;

            for (const gridVal of gridCoords) {
                const distance = Math.abs(targetCoord - gridVal);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestSnap = gridVal;
                    snapped = true;
                }
            }
            return { coord: bestSnap, snapped: snapped };
        };

        // Snap each axis
        const snapX = snapAxis(localPoint.x, this.xCoords);
        if (snapX.snapped) {
            snappedPointLocal.x = snapX.coord;
            didSnap = true;
        }

        const snapY = snapAxis(localPoint.y, this.yCoords);
        if (snapY.snapped) {
            snappedPointLocal.y = snapY.coord;
            didSnap = true;
        }

        const snapZ = snapAxis(localPoint.z, this.zCoords);
        if (snapZ.snapped) {
            snappedPointLocal.z = snapZ.coord;
            didSnap = true;
        }
        
        // Convert the snapped point back to world space
        const snappedPointWorld = this.gridContainer.localToWorld(snappedPointLocal.clone());

        // We only return a point if a snap actually occurred on at least one axis.
        // The calling function can decide what to do if no snap happens.
        if (didSnap) {
            return snappedPointWorld;
        } else {
            return null; // No snap occurred
        }
    }

    getBoundingBox() {
        if (this.gridContainer.children.length === 0) {
            // Return an empty or default box if no grid exists
            return new THREE.Box3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0));
        }
        const box = new THREE.Box3();
        box.setFromObject(this.gridContainer);
        return box;
    }

    getAbsoluteCoords(gridId) {
        const gridData = this.structureData.grids.find(g => g.id === gridId);
        if (!gridData) return null;

        const origin = new THREE.Vector3(...gridData.origin);
        const rotation = new THREE.Euler(
            ...gridData.rotation.values.map(v => THREE.MathUtils.degToRad(v)),
            gridData.rotation.order
        );

        return { origin, rotation };
    }
    
    rebuildGrid(gridData) {
        // Find the specific grid container if necessary, or just rebuild all
        this.createRectangularGrid(gridData);
    }
} 