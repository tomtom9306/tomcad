class ElementModifier {
    constructor(elementManager) {
        this.em = elementManager;
    }

    updateElementPoint(elementId, pointType, newPosition) {
        const element = this.em.getElement(elementId);
        const mesh = this.em.beamObjects.get(elementId);
        if (!element || !mesh || element.kind !== 'beam') return;

        // If the element is a child of a parametric group/component, calculate and store the offset
        if (element.parentId) {
            const parent = this.em.getElement(element.parentId);
            if (parent) {
                let offset = null;
                
                if (parent.kind === 'group' && parent.type) {
                    // Stara logika dla grup
                    const CreatorClass = this.em.viewer.creationManager.getCreatorClass(parent.type);
                    if (CreatorClass && typeof CreatorClass.calculateChildOffset === 'function') {
                        offset = CreatorClass.calculateChildOffset(parent, element, pointType, newPosition);
                    }
                } else if (parent.kind === 'component' && parent.componentType) {
                    // Nowa logika dla komponentów
                    offset = BaseComponent.calculateChildOffset(parent, element, pointType, newPosition);
                }
                
                if (offset) {
                    // Store the offset so the 'update' method can re-apply it
                    element[pointType + 'Offset'] = offset.toArray();
                }
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

        // NEW: Trigger connection synchronization
        this.notifyElementMoved(elementId, pointType, newPosition);
    }

    // NEW: Notify about element movement for connection synchronization
    notifyElementMoved(elementId, pointType, newPosition) {
        if (this.em.connectionManager) {
            this.em.connectionManager.handleElementMoved(elementId, {
                [pointType]: [newPosition.x, newPosition.y, newPosition.z]
            });
        }
        
        // Also publish event for other systems
        if (this.em.viewer && this.em.viewer.eventBus) {
            this.em.viewer.eventBus.publish('element:moved', {
                elementId: elementId,
                pointType: pointType,
                newPosition: [newPosition.x, newPosition.y, newPosition.z]
            });
        }
    }

    updateGroupPoints(elementId, pointType, newPosition) {
        const element = this.em.getElement(elementId);
        if (!element) return;

        // Obsługuj zarówno starą konwencję 'group' jak i nową 'component'
        if (element.kind === 'group') {
            element[pointType] = [newPosition.x, newPosition.y, newPosition.z];
            
            // Używaj starej logiki dla grup
            const CreatorClass = this.em.viewer.creationManager.getCreatorClass(element.type);
            if (CreatorClass && typeof CreatorClass.update === 'function') {
                CreatorClass.update(element, this.em);
            } else {
                console.warn(`No static 'update' method found for creator type: ${element.type}`);
            }
        } else if (element.kind === 'component') {
            element[pointType] = [newPosition.x, newPosition.y, newPosition.z];
            
            // Używaj nowej uniwersalnej logiki dla komponentów
            BaseComponent.update(element, this.em);
        }
    }

    updateElement(elementId, newData) {
        const element = this.em.structureData.elements.find(el => el.id === elementId);
        if (!element) return false;

        // Always update element data first
        Object.assign(element, newData);

        // If the element is a parametric group/component, call its update method
        if (element.kind === 'group' && element.type) {
            // Stara logika dla grup
            const CreatorClass = this.em.viewer.creationManager.getCreatorClass(element.type);
            if (CreatorClass && typeof CreatorClass.update === 'function') {
                CreatorClass.update(element, this.em);
            }
        } else if (element.kind === 'component' && element.componentType) {
            // Nowa uniwersalna logika dla komponentów
            BaseComponent.update(element, this.em);
        } else if (element.kind !== 'group' && element.kind !== 'component') {
            // This is a single element (beam, plate), so redraw it
            this.removeElementMesh(elementId);
            let newMesh;
            if (element.kind === 'beam') {
                newMesh = MeshBuilder.createBeam(element);
            } else if (element.kind === 'plate') {
                newMesh = MeshBuilder.createPlate(element);
            }
            
            if (newMesh) {
                this.em.beamObjects.set(elementId, newMesh);
                this.em.scene.add(newMesh);
            }
        }
        
        // NEW: Notify about element changes for connection synchronization
        if (this.em.connectionManager && (newData.start || newData.end || newData.origin)) {
            this.em.connectionManager.handleElementMoved(elementId, newData);
        }
        
        // Publish an event instead of calling UI directly
        this.em.viewer.eventBus.publish('element:updated', { elementId: element.id, elementData: element });

        console.log('Element updated:', element);
        return element;
    }

    deleteElements(elementIds) {
        elementIds.forEach(elementId => {
            // Remove from 3D scene
            this.removeElementMesh(elementId);

            // Remove from data
            const elementIndex = this.em.structureData.elements.findIndex(el => el.id === elementId);
            if (elementIndex !== -1) {
                const element = this.em.structureData.elements[elementIndex];
                // If it's a group or component, delete its children as well
                if ((element.kind === 'group' || element.kind === 'component') && element.children) {
                    this.deleteElements(element.children);
                }
                this.em.structureData.elements.splice(elementIndex, 1);
            }
        });

        console.log(`Deleted ${elementIds.length} elements.`);
        return elementIds.length;
    }

    removeElementMesh(elementId) {
        const mesh = this.em.beamObjects.get(elementId);
        if (mesh) {
            this.em.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.em.beamObjects.delete(elementId);
        }
    }

    changeElementType(elementId, newType) {
        const element = this.em.structureData.elements.find(el => el.id === elementId);
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
            const originalElementData = this.em.structureData.elements.find(el => el.id === sourceId);
            if (!originalElementData) return;

            for (let i = 1; i <= numCopies; i++) {
                const totalTranslation = translationStep.clone().multiplyScalar(i);
                
                // Deep copy the element data for each new element
                const newElementData = JSON.parse(JSON.stringify(originalElementData));
                newElementData.id = null; // Let factory assign new ID

                if (newElementData.kind === 'group' && newElementData.type) {
                    const CreatorClass = this.em.viewer.creationManager.getCreatorClass(newElementData.type);
                    if (CreatorClass && typeof CreatorClass.recreate === 'function') {
                        // Apply translation to start and end points for the group
                        const start = new THREE.Vector3().fromArray(newElementData.start).add(totalTranslation);
                        const end = new THREE.Vector3().fromArray(newElementData.end).add(totalTranslation);
                        newElementData.start = start.toArray();
                        newElementData.end = end.toArray();
                        
                        const newGroup = CreatorClass.recreate(newElementData, this.em);
                        if (newGroup) {
                            copiedElements.push(newGroup);
                        }
                    }
                } else if (newElementData.kind === 'component' && newElementData.componentType) {
                    const CreatorClass = window.componentRegistry.getCreator(newElementData.componentType);
                    if (CreatorClass && typeof CreatorClass.recreate === 'function') {
                        // Apply translation to start point for the component
                        const startPoint = new THREE.Vector3().fromArray(newElementData.startPoint).add(totalTranslation);
                        newElementData.startPoint = startPoint.toArray();
                        
                        const newComponent = CreatorClass.recreate(newElementData, this.em);
                        if (newComponent) {
                            copiedElements.push(newComponent);
                        }
                    }
                } else {
                    // It's a single element (beam, plate, etc.)
                    newElementData.id = `${newElementData.kind}-${this.em.nextElementId++}`;
                    
                    if (newElementData.kind === 'beam') {
                        const start = new THREE.Vector3().fromArray(newElementData.start).add(totalTranslation);
                        const end = new THREE.Vector3().fromArray(newElementData.end).add(totalTranslation);
                        newElementData.start = start.toArray();
                        newElementData.end = end.toArray();
                    } else if (newElementData.kind === 'plate') {
                        const origin = new THREE.Vector3().fromArray(newElementData.origin).add(totalTranslation);
                        newElementData.origin = origin.toArray();
                    }

                    this.em.structureData.elements.push(newElementData);
                    let mesh;
                    if (newElementData.kind === 'beam') {
                        mesh = MeshBuilder.createBeam(newElementData);
                    } else {
                        mesh = MeshBuilder.createPlate(newElementData);
                    }
                    this.em.beamObjects.set(newElementData.id, mesh);
                    this.em.scene.add(mesh);
                    this.em.viewer.uiManager.elementListPanel.add(newElementData);
                    
                    copiedElements.push(newElementData);
                }
                
                console.log(`Copied ${originalElementData.id} (Copy ${i}/${numCopies})`);
            }
        });

        return copiedElements;
    }
} 