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
            operationIds: []
        };

        this.structureData.elements.push(newElement);
        this.createBeam(newElement);
        this.viewer.uiManager.addElementToList(newElement);
        
        console.log('New beam added:', newElement);
        return newElement;
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
} 