// UI management functionality
class UIManager {
    constructor(structureData, elementManager, selectionManager) {
        this.structureData = structureData;
        this.elementManager = elementManager;
        this.selectionManager = selectionManager;
        this.editMode = false;
        this.statusBar = document.getElementById('status-bar');
        this.creationPanel = document.getElementById('creation-panel');
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
        
        this.structureData.elements.forEach(element => {
            this.addElementToList(element);
        });
    }

    addElementToList(element) {
        const beamItems = document.getElementById('beam-items');
        const item = document.createElement('div');
        item.className = 'beam-item';
        item.dataset.elementId = element.id;
        
        item.innerHTML = `
            <div class="beam-id">${element.id}</div>
            <div class="beam-profile">${element.profile || 'Plate'}</div>
            <div class="beam-material">${element.material}</div>
        `;
        
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

        // Set element type selector
        document.getElementById('edit-element-type').value = element.kind;

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
        // For now, only beam creation is supported
        if (type === 'beam') {
            this.creationPanel.querySelector('h3').textContent = 'Create Beam';
            this.creationPanel.style.display = 'block';
            this.closeEditPanel(); // Close edit panel if it's open
        }
    }

    hideCreationPanel() {
        this.creationPanel.style.display = 'none';
    }

    getCreationParams() {
        const profile = document.getElementById('create-profile').value;
        const material = document.getElementById('create-material').value;
        const orientation = parseFloat(document.getElementById('create-orientation').value) || 0;
        return { profile, material, orientation };
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