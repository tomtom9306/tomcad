// Element management functionality
class ElementManager {
    constructor(scene, beamObjects, structureData, viewer, gridManager) {
        this.scene = scene;
        this.beamObjects = beamObjects;
        this.structureData = structureData;
        this.viewer = viewer;
        this.gridManager = gridManager;
        this.nextElementId = 1;
        this.initializeElementCounter();
    }

    initializeElementCounter() {
        // Find the highest element number to avoid conflicts
        let maxId = 0;
        this.structureData.elements.forEach(element => {
            const match = element.id.match(/(\d+)$/);
            if (match) {
                maxId = Math.max(maxId, parseInt(match[1]));
            }
        });
        this.nextElementId = maxId + 1;
    }

    createBeams() {
        if (!this.structureData || !this.structureData.elements) {
            console.error('No elements found in structure data');
            return;
        }

        this.structureData.elements.forEach(element => {
            if (element.kind === 'beam') {
                this.createBeam(element);
            } else if (element.kind === 'plate') {
                this.createPlate(element);
            }
        });
    }

    createBeam(beamData) {
        const start = new THREE.Vector3(...beamData.start);
        const end = new THREE.Vector3(...beamData.end);
        
        let geometry, material;
        
        // Determine beam geometry based on profile using real steel profiles
        const profile = beamData.profile;
        const length = start.distanceTo(end);
        
        // Use the profile geometry function if available
        if (typeof createProfileGeometry === 'function') {
            geometry = createProfileGeometry(profile, length);
        } else {
            // Fallback to simple geometries
            if (profile.startsWith('HEA') || profile.startsWith('IPE')) {
                const height = GeometryUtils.getProfileDimension(profile, 'height');
                const width = GeometryUtils.getProfileDimension(profile, 'width');
                geometry = new THREE.BoxGeometry(width, height, length);
            } else if (profile.startsWith('RHS')) {
                const dimensions = GeometryUtils.parseRHSProfile(profile);
                geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, length);
            } else if (profile.startsWith('CHS')) {
                const diameter = GeometryUtils.parseCHSProfile(profile);
                geometry = new THREE.CylinderGeometry(diameter/2, diameter/2, length, 16);
            } else {
                geometry = new THREE.BoxGeometry(100, 100, length);
            }
        }
        
        // Material based on steel grade
        const color = GeometryUtils.getMaterialColor(beamData.material);
        material = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position and orient the beam
        GeometryUtils.positionBeam(mesh, start, end, beamData);
        
        // Store reference
        mesh.userData = {
            elementId: beamData.id,
            elementData: beamData,
            originalMaterial: material.clone(),
            originalLength: length
        };
        
        this.beamObjects.set(beamData.id, mesh);
        this.scene.add(mesh);
    }

    createPlate(plateData) {
        const geometry = new THREE.BoxGeometry(
            plateData.width, 
            plateData.height, 
            plateData.thickness
        );
        
        const color = GeometryUtils.getMaterialColor(plateData.material);
        const material = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.7
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position the plate
        mesh.position.set(...plateData.origin);
        
        // Apply rotation if specified
        if (plateData.rotation) {
            const rotation = plateData.rotation;
            if (rotation.type === 'Euler') {
                const values = rotation.values;
                if (rotation.units === 'degrees') {
                    mesh.rotation.set(
                        THREE.MathUtils.degToRad(values[0]),
                        THREE.MathUtils.degToRad(values[1]),
                        THREE.MathUtils.degToRad(values[2])
                    );
                }
            }
        }
        
        mesh.userData = {
            elementId: plateData.id,
            elementData: plateData,
            originalMaterial: material.clone()
        };
        
        this.beamObjects.set(plateData.id, mesh);
        this.scene.add(mesh);
    }

    updateElementPoint(elementId, pointType, newPosition) {
        const element = this.getElement(elementId);
        const mesh = this.beamObjects.get(elementId);
        if (!element || !mesh || element.kind !== 'beam') return;

        // If the element is a child of a group, calculate and store the offset
        if (element.parentId) {
            const parent = this.getElement(element.parentId);
            if (parent && parent.type === 'goalpost') {
                const idealPosition = new THREE.Vector3();
                const col1_base = new THREE.Vector3(...parent.start);
                const col2_base = new THREE.Vector3(...parent.end);

                if (element.id === parent.children[0]) { // Column 1
                    idealPosition.copy(pointType === 'start' ? col1_base : col1_base.clone().add(new THREE.Vector3(0, parent.height, 0)));
                } else if (element.id === parent.children[1]) { // Column 2
                    idealPosition.copy(pointType === 'start' ? col2_base : col2_base.clone().add(new THREE.Vector3(0, parent.height, 0)));
                } else if (element.id === parent.children[2]) { // Beam
                    const beamStartIdeal = col1_base.clone().add(new THREE.Vector3(0, parent.height, 0));
                    const beamEndIdeal = col2_base.clone().add(new THREE.Vector3(0, parent.height, 0));
                    idealPosition.copy(pointType === 'start' ? beamStartIdeal : beamEndIdeal);
                }
                
                const offset = newPosition.clone().sub(idealPosition);
                element[pointType + 'Offset'] = offset.toArray();
            }
        }

        // Update the data
        element[pointType] = [newPosition.x, newPosition.y, newPosition.z];

        // Update the mesh geometry in place
        const start = new THREE.Vector3(...element.start);
        const end = new THREE.Vector3(...element.end);

        // Recalculate length and update scale
        const newLength = start.distanceTo(end);
        
        if (mesh.userData.originalLength) {
            mesh.scale.z = newLength / mesh.userData.originalLength;
        }
        
        GeometryUtils.positionBeam(mesh, start, end, element);
    }

    updateGroupPoints(elementId, pointType, newPosition) {
        const group = this.getElement(elementId);
        if (!group || group.kind !== 'group') return;

        group[pointType] = [newPosition.x, newPosition.y, newPosition.z];

        if (group.type === 'goalpost') {
            this.updateGoalPostChildren(group.id);
        }
    }

    addNewBeam(start, end, profile, material, orientation) {
        const newId = `element-${this.nextElementId++}`;

        const newElement = {
            id: newId,
            kind: 'beam',
            profile: profile,
            material: material,
            start: [start.x, start.y, start.z],
            end: [end.x, end.y, end.z],
            orientation: orientation,
            operationIds: [],
            startOffset: [0, 0, 0],
            endOffset: [0, 0, 0]
        };

        this.structureData.elements.push(newElement);
        this.createBeam(newElement);
        this.viewer.uiManager.addElementToList(newElement);
        
        console.log('New beam added:', newElement);
        return newElement;
    }

    addNewColumn(basePoint, params) {
        const newId = `element-${this.nextElementId++}`;
        const start = basePoint;
        const end = basePoint.clone().add(new THREE.Vector3(0, params.height, 0));

        const newElement = {
            id: newId,
            kind: 'beam',
            profile: params.profile,
            material: params.material,
            start: [start.x, start.y, start.z],
            end: [end.x, end.y, end.z],
            orientation: 0,
            operationIds: []
        };

        this.structureData.elements.push(newElement);
        this.createBeam(newElement);
        this.viewer.uiManager.addElementToList(newElement);
        
        console.log('New column added:', newElement);
        return newElement;
    }

    addNewGoalPost(p1, p2, params) {
        // Create the main group element
        const goalPostId = `group-${this.nextElementId++}`;
        const goalPostElement = {
            id: goalPostId,
            kind: 'group',
            type: 'goalpost',
            start: [p1.x, p1.y, p1.z],
            end: [p2.x, p2.y, p2.z],
            children: [],
            ...params
        };

        // Create child elements
        const column1 = this.addNewColumn(p1, {
            height: params.height,
            profile: params.columnProfile,
            material: params.material
        });
        const column2 = this.addNewColumn(p2, {
            height: params.height,
            profile: params.columnProfile,
            material: params.material
        });

        const beamStart = p1.clone().add(new THREE.Vector3(0, params.height, 0));
        const beamEnd = p2.clone().add(new THREE.Vector3(0, params.height, 0));
        const beam = this.addNewBeam(
            beamStart,
            beamEnd,
            params.beamProfile,
            params.material,
            0
        );
        
        // Link children to parent
        column1.parentId = goalPostId;
        column2.parentId = goalPostId;
        beam.parentId = goalPostId;
        
        goalPostElement.children = [column1.id, column2.id, beam.id];

        this.structureData.elements.push(goalPostElement);
        this.viewer.uiManager.addElementToList(goalPostElement);
        
        console.log('New goalpost added:', goalPostElement);
        return goalPostElement;
    }

    addNewPlate() {
        const newId = `plate-${this.nextElementId++}`;

        const newElement = {
            id: newId,
            kind: 'plate',
            material: 'S355JR',
            origin: [0, 0, 0],
            rotation: { type: "Euler", order: "ZYX", values: [0, 0, 0], units: "degrees" },
            width: 300,
            height: 200,
            thickness: 12,
            operationIds: []
        };

        this.structureData.elements.push(newElement);
        this.createPlate(newElement);

        console.log('New plate added:', newElement);
        return newElement;
    }

    updateElement(elementId, newData) {
        const element = this.structureData.elements.find(el => el.id === elementId);
        if (!element) return false;

        // Update element data
        Object.assign(element, newData);

        // Remove old mesh and create new one
        this.removeElementMesh(elementId);
        
        if (element.kind === 'beam') {
            this.createBeam(element);
        } else if (element.kind === 'plate') {
            this.createPlate(element);
        } else if (element.kind === 'group' && element.type === 'goalpost') {
            this.updateGoalPostChildren(element.id);
        }

        console.log('Element updated:', element);
        return element;
    }

    deleteElements(elementIds) {
        elementIds.forEach(elementId => {
            // Remove from 3D scene
            this.removeElementMesh(elementId);

            // Remove from data
            const elementIndex = this.structureData.elements.findIndex(el => el.id === elementId);
            if (elementIndex !== -1) {
                const element = this.structureData.elements[elementIndex];
                // If it's a group, delete its children as well
                if (element.kind === 'group' && element.children) {
                    this.deleteElements(element.children);
                }
                this.structureData.elements.splice(elementIndex, 1);
            }
        });

        console.log(`Deleted ${elementIds.length} elements.`);
        return elementIds.length;
    }

    removeElementMesh(elementId) {
        const mesh = this.beamObjects.get(elementId);
        if (mesh) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.beamObjects.delete(elementId);
        }
    }

    changeElementType(elementId, newType) {
        const element = this.structureData.elements.find(el => el.id === elementId);
        if (!element || element.kind === newType) return element;

        // Convert element type
        if (newType === 'plate' && element.kind === 'beam') {
            // Convert beam to plate
            element.kind = 'plate';
            element.origin = [...element.start];
            element.width = 300;
            element.height = 200;
            element.thickness = 12;
            element.rotation = { type: "Euler", order: "ZYX", values: [0, 0, 0], units: "degrees" };
            delete element.start;
            delete element.end;
            delete element.profile;
            delete element.orientation;
            
        } else if (newType === 'beam' && element.kind === 'plate') {
            // Convert plate to beam
            element.kind = 'beam';
            element.start = [...element.origin];
            element.end = [element.origin[0] + 1000, element.origin[1], element.origin[2]];
            element.profile = 'HEA200';
            element.orientation = 0;
            delete element.origin;
            delete element.width;
            delete element.height;
            delete element.thickness;
            delete element.rotation;
        }

        console.log('Element type changed to:', newType);
        return element;
    }

    copyElements(sourceElementIds, sourcePoint, destinationPoint, numCopies) {
        const copiedElements = [];
        const translationStep = new THREE.Vector3().subVectors(destinationPoint, sourcePoint);

        sourceElementIds.forEach(sourceId => {
            const originalElementData = this.structureData.elements.find(el => el.id === sourceId);
            if (!originalElementData) return;

            // Loop to create the specified number of copies
            for (let i = 1; i <= numCopies; i++) {
                // Deep copy the element data for each new element
                const newElementData = JSON.parse(JSON.stringify(originalElementData));
                
                // Generate a new unique ID
                newElementData.id = `${newElementData.kind}-${this.nextElementId++}`;

                // Calculate the total translation for the current copy
                const totalTranslation = translationStep.clone().multiplyScalar(i);

                // Apply translation to the new element
                if (newElementData.kind === 'beam') {
                    const start = new THREE.Vector3().fromArray(newElementData.start).add(totalTranslation);
                    const end = new THREE.Vector3().fromArray(newElementData.end).add(totalTranslation);
                    newElementData.start = start.toArray();
                    newElementData.end = end.toArray();
                } else if (newElementData.kind === 'plate') {
                    const origin = new THREE.Vector3().fromArray(newElementData.origin).add(totalTranslation);
                    newElementData.origin = origin.toArray();
                }

                // Add to data store and scene
                this.structureData.elements.push(newElementData);
                if (newElementData.kind === 'beam') {
                    this.createBeam(newElementData);
                } else {
                    this.createPlate(newElementData);
                }
                
                copiedElements.push(newElementData);
                console.log(`Copied ${originalElementData.id} to ${newElementData.id} (Copy ${i}/${numCopies})`);
            }
        });

        return copiedElements;
    }

    getElement(elementId) {
        return this.structureData.elements.find(el => el.id === elementId);
    }

    getAllElements() {
        return this.structureData.elements;
    }

    getElementMeshById(elementId) {
        return this.beamObjects.get(elementId);
    }

    updateGoalPostChildren(groupId) {
        const group = this.getElement(groupId);
        if (!group || group.type !== 'goalpost') return;

        const [col1Id, col2Id, beamId] = group.children;
        const col1 = this.getElement(col1Id);
        const col2 = this.getElement(col2Id);
        const beam = this.getElement(beamId);

        const groupStart = new THREE.Vector3(...group.start);
        const groupEnd = new THREE.Vector3(...group.end);
        const height = group.height;

        // Update Column 1
        const col1IdealStart = groupStart.clone();
        const col1IdealEnd = groupStart.clone().add(new THREE.Vector3(0, height, 0));
        const col1StartOffset = new THREE.Vector3(...(col1.startOffset || [0,0,0]));
        const col1EndOffset = new THREE.Vector3(...(col1.endOffset || [0,0,0]));
        this.updateElement(col1Id, {
            start: col1IdealStart.add(col1StartOffset).toArray(),
            end: col1IdealEnd.add(col1EndOffset).toArray(),
            profile: group.columnProfile,
            material: group.material
        });
        
        // Update Column 2
        const col2IdealStart = groupEnd.clone();
        const col2IdealEnd = groupEnd.clone().add(new THREE.Vector3(0, height, 0));
        const col2StartOffset = new THREE.Vector3(...(col2.startOffset || [0,0,0]));
        const col2EndOffset = new THREE.Vector3(...(col2.endOffset || [0,0,0]));
        this.updateElement(col2Id, {
            start: col2IdealStart.add(col2StartOffset).toArray(),
            end: col2IdealEnd.add(col2EndOffset).toArray(),
            profile: group.columnProfile,
            material: group.material
        });

        // Update Beam
        const beamIdealStart = groupStart.clone().add(new THREE.Vector3(0, height, 0));
        const beamIdealEnd = groupEnd.clone().add(new THREE.Vector3(0, height, 0));
        const beamStartOffset = new THREE.Vector3(...(beam.startOffset || [0,0,0]));
        const beamEndOffset = new THREE.Vector3(...(beam.endOffset || [0,0,0]));
        this.updateElement(beamId, {
            start: beamIdealStart.add(beamStartOffset).toArray(),
            end: beamIdealEnd.add(beamEndOffset).toArray(),
            profile: group.beamProfile,
            material: group.material
        });
    }
} 