// UI management functionality
class UIManager {
    constructor(structureData, elementManager, selectionManager) {
        this.structureData = structureData;
        this.elementManager = elementManager;
        this.selectionManager = selectionManager;
        this.editMode = false;
        this.statusBar = document.getElementById('status-bar');
        this.creationPanel = document.getElementById('creation-panel');
        this.creationType = null;
    }

    setupUI() {
        // Update project info
        const meta = this.structureData.meta;
        document.getElementById('element-count').textContent = this.structureData.elements.length;
        document.getElementById('operation-count').textContent = this.structureData.operations.length;
        
        // Populate beam list
        this.populateElementList();
        this.statusBar.style.display = 'block';
    }

    populateElementList() {
        const beamItems = document.getElementById('beam-items');
        beamItems.innerHTML = ''; // Clear existing items
        
        const elements = this.structureData.elements;
        const processedElements = new Set();

        elements.forEach(element => {
            if (!element.parentId) {
                this.addElementToList(element);
                if (element.kind === 'group' && element.children) {
                    element.children.forEach(childId => {
                        const childElement = this.elementManager.getElement(childId);
                        if (childElement) {
                            this.addElementToList(childElement, true);
                            processedElements.add(childId);
                        }
                    });
                }
                processedElements.add(element.id);
            }
        });

        // Add any remaining elements that might not have been processed (e.g. children of non-existent groups)
        elements.forEach(element => {
            if (!processedElements.has(element.id)) {
                this.addElementToList(element);
            }
        });
    }

    addElementToList(element, isChild = false) {
        const beamItems = document.getElementById('beam-items');
        const item = document.createElement('div');
        item.className = 'beam-item';
        item.dataset.elementId = element.id;

        if (isChild) {
            item.style.marginLeft = '20px';
        }
        
        let content;
        if (element.kind === 'group') {
            content = `
                <div class="beam-id">${element.id} (Goalpost)</div>
                <div class="beam-profile">Contains ${element.children.length} elements</div>
            `;
        } else {
            content = `
                <div class="beam-id">${element.id}</div>
                <div class="beam-profile">${element.profile || 'Plate'}</div>
                <div class="beam-material">${element.material}</div>
            `;
        }
        item.innerHTML = content;
        
        item.addEventListener('click', (event) => {
            if (event.ctrlKey) {
                this.selectionManager.toggleSelection(element.id);
            } else {
                this.selectionManager.setSelection([element.id]);
            }
        });
        beamItems.appendChild(item);
    }

    updateElementInList(element) {
        const listItem = document.querySelector(`[data-element-id="${element.id}"]`);
        if (listItem) {
            listItem.innerHTML = `
                <div class="beam-id">${element.id}</div>
                <div class="beam-profile">${element.profile || 'Plate'}</div>
                <div class="beam-material">${element.material}</div>
            `;
        }
    }

    removeElementFromList(elementId) {
        const listItem = document.querySelector(`[data-element-id="${elementId}"]`);
        if (listItem) {
            listItem.remove();
        }
    }

    openEditPanel(elementId) {
        const element = this.elementManager.getElement(elementId);
        if (!element) return;

        // Show edit panel
        document.getElementById('edit-panel').style.display = 'block';
        document.getElementById('edit-element-id').textContent = elementId;

        // Show/hide form sections based on element type
        const endRow = document.getElementById('edit-end-x').parentElement.parentElement;
        const plateDimensions = document.getElementById('plate-dimensions');
        const profileGroup = document.getElementById('edit-profile').parentElement;
        const orientationGroup = document.getElementById('edit-orientation').parentElement;
        const goalpostGroup = document.getElementById('goalpost-edit-inputs');

        // Hide all optional sections by default
        endRow.style.display = 'none';
        plateDimensions.style.display = 'none';
        profileGroup.style.display = 'none';
        orientationGroup.style.display = 'none';
        goalpostGroup.style.display = 'none';

        // Set element type selector
        document.getElementById('edit-element-type').value = element.kind;
        document.getElementById('edit-element-type').disabled = true; // Don't allow changing type for now

        // Populate form fields
        if (element.kind === 'beam') {
            document.getElementById('edit-start-x').value = element.start[0];
            document.getElementById('edit-start-y').value = element.start[1];
            document.getElementById('edit-start-z').value = element.start[2];
            document.getElementById('edit-end-x').value = element.end[0];
            document.getElementById('edit-end-y').value = element.end[1];
            document.getElementById('edit-end-z').value = element.end[2];
            document.getElementById('edit-profile').value = element.profile;
            document.getElementById('edit-orientation').value = element.orientation || 0;
            
            endRow.style.display = 'flex';
            plateDimensions.style.display = 'none';
            profileGroup.style.display = 'block';
            orientationGroup.style.display = 'block';
            
        } else if (element.kind === 'plate') {
            document.getElementById('edit-start-x').value = element.origin[0];
            document.getElementById('edit-start-y').value = element.origin[1];
            document.getElementById('edit-start-z').value = element.origin[2];
            document.getElementById('edit-width').value = element.width;
            document.getElementById('edit-height').value = element.height;
            document.getElementById('edit-thickness').value = element.thickness;
            
            endRow.style.display = 'none';
            plateDimensions.style.display = 'block';
            profileGroup.style.display = 'none';
            orientationGroup.style.display = 'none';
        } else if (element.kind === 'group' && element.type === 'goalpost') {
            goalpostGroup.style.display = 'block';
            document.getElementById('edit-goalpost-height').value = element.height;
            document.getElementById('edit-goalpost-column-profile').value = element.columnProfile;
            document.getElementById('edit-goalpost-beam-profile').value = element.beamProfile;
        }

        document.getElementById('edit-material').value = element.material;
        this.editMode = true;
    }

    closeEditPanel() {
        document.getElementById('edit-panel').style.display = 'none';
        this.editMode = false;
    }

    applyChanges() {
        const selectedElements = this.selectionManager.getSelectedElements();
        if (selectedElements.length !== 1) return;
        
        const elementId = selectedElements[0];
        const originalElement = this.elementManager.getElement(elementId);
        if (!originalElement) return;

        // Get current element type from form
        const currentType = document.getElementById('edit-element-type').value;
        
        // Handle element type conversion first if needed
        if (originalElement.kind !== currentType) {
            this.elementManager.changeElementType(elementId, currentType);
        }

        const element = this.elementManager.getElement(elementId);

        // Get values from form
        const startX = parseFloat(document.getElementById('edit-start-x').value);
        const startY = parseFloat(document.getElementById('edit-start-y').value);
        const startZ = parseFloat(document.getElementById('edit-start-z').value);
        const material = document.getElementById('edit-material').value;

        const newData = { material };

        if (currentType === 'beam') {
            const endX = parseFloat(document.getElementById('edit-end-x').value);
            const endY = parseFloat(document.getElementById('edit-end-y').value);
            const endZ = parseFloat(document.getElementById('edit-end-z').value);
            const profile = document.getElementById('edit-profile').value;
            const orientation = parseFloat(document.getElementById('edit-orientation').value);
            
            const newStart = new THREE.Vector3(startX, startY, startZ);
            let newEnd = new THREE.Vector3(endX, endY, endZ);

            // If start point has changed, adjust the end point to maintain length and direction
            if (originalElement.kind === 'beam') {
                const oldStart = new THREE.Vector3(...originalElement.start);
                if (!oldStart.equals(newStart)) {
                    const oldEnd = new THREE.Vector3(...originalElement.end);
                    const direction = new THREE.Vector3().subVectors(oldEnd, oldStart);
                    newEnd.copy(newStart).add(direction);
                }
            }

            Object.assign(newData, {
                start: [newStart.x, newStart.y, newStart.z],
                end: [newEnd.x, newEnd.y, newEnd.z],
                profile: profile,
                orientation: orientation
            });

        } else if (currentType === 'plate') {
            const width = parseFloat(document.getElementById('edit-width').value);
            const height = parseFloat(document.getElementById('edit-height').value);
            const thickness = parseFloat(document.getElementById('edit-thickness').value);

            Object.assign(newData, {
                origin: [startX, startY, startZ],
                width: width,
                height: height,
                thickness: thickness
            });
        } else if (currentType === 'group' && element.type === 'goalpost') {
            const height = parseFloat(document.getElementById('edit-goalpost-height').value);
            const columnProfile = document.getElementById('edit-goalpost-column-profile').value;
            const beamProfile = document.getElementById('edit-goalpost-beam-profile').value;

            Object.assign(newData, {
                height,
                columnProfile,
                beamProfile
            });
        }

        // Update element
        this.elementManager.updateElement(elementId, newData);

        // Update UI list
        this.updateElementInList(this.elementManager.getElement(elementId));

        console.log('Element updated via UI');
    }

    deleteSelectedElements() {
        const selectedElements = this.selectionManager.getSelectedElements();
        if (selectedElements.length === 0) return;

        // Delete elements
        this.elementManager.deleteElements(selectedElements);

        // Remove from UI list
        selectedElements.forEach(elementId => {
            this.removeElementFromList(elementId);
        });

        // Update element count
        document.getElementById('element-count').textContent = this.structureData.elements.length;

        // Close edit panel and clear selection
        this.closeEditPanel();
        this.selectionManager.clearSelection();
        
        console.log(`Deleted ${selectedElements.length} elements via UI.`);
    }

    addNewElement() {
        const newElement = this.elementManager.addNewElement();
        this.addElementToList(newElement);
        document.getElementById('element-count').textContent = this.structureData.elements.length;
        this.selectionManager.setSelection([newElement.id]);
    }

    addNewPlate() {
        const newElement = this.elementManager.addNewPlate();
        this.addElementToList(newElement);
        document.getElementById('element-count').textContent = this.structureData.elements.length;
        this.selectionManager.setSelection([newElement.id]);
    }

    updateStatusBar(message) {
        if (message) {
            this.statusBar.textContent = message;
            this.statusBar.style.display = 'block';
        } else {
            this.statusBar.style.display = 'none';
        }
    }

    showCreationPanel(type) {
        this.creationType = type;
        const beamInputs = document.getElementById('beam-creation-inputs');
        const columnInputs = document.getElementById('column-creation-inputs');
        const goalpostInputs = document.getElementById('goalpost-creation-inputs');

        beamInputs.style.display = 'none';
        columnInputs.style.display = 'none';
        goalpostInputs.style.display = 'none';

        if (type === 'beam') {
            beamInputs.style.display = 'block';
        } else if (type === 'column') {
            columnInputs.style.display = 'block';
        } else if (type === 'goalpost') {
            goalpostInputs.style.display = 'block';
        }
        
        if (type) {
            this.creationPanel.style.display = 'block';
        }
    }

    hideCreationPanel() {
        this.creationPanel.style.display = 'none';
        this.creationType = null;
    }

    getCreationParams() {
        if (this.creationType === 'beam') {
            return {
                profile: document.getElementById('create-profile').value,
                material: document.getElementById('create-material').value,
                orientation: parseFloat(document.getElementById('create-orientation').value)
            };
        } else if (this.creationType === 'column') {
            return {
                height: parseFloat(document.getElementById('create-column-height').value),
                profile: document.getElementById('create-column-profile').value,
                material: document.getElementById('create-column-material').value
            };
        } else if (this.creationType === 'goalpost') {
            return {
                height: parseFloat(document.getElementById('create-goalpost-height').value),
                columnProfile: document.getElementById('create-goalpost-column-profile').value,
                beamProfile: document.getElementById('create-goalpost-beam-profile').value,
                material: document.getElementById('create-goalpost-material').value
            };
        }
        return {};
    }

    onSelectionChanged(selectedElements) {
        // Update panels based on selection
        if (selectedElements.length === 1) {
            this.openEditPanel(selectedElements[0]);
            this.updateStatusBar(null);
        } else {
            this.closeEditPanel();
            if (selectedElements.length > 1) {
                this.updateStatusBar(`${selectedElements.length} elements selected`);
            } else {
                this.updateStatusBar(null);
            }
        }
    }
} 