// Copy functionality
class CopyManager {
    constructor(elementManager, selectionManager, uiManager, camera, renderer, beamObjects, eventBus) {
        this.elementManager = elementManager;
        this.selectionManager = selectionManager;
        this.uiManager = uiManager;
        this.camera = camera;
        this.renderer = renderer;
        this.beamObjects = beamObjects;
        this.eventBus = eventBus;
        
        this.isCopyMode = false;
        this.copySourcePoint = null;
        this.numCopiesToCreate = 1;

        if (this.eventBus) {
            this.eventBus.subscribe('copy:mouseDown', (data) => this.handleCopyClick(data.event, data.point));
            this.eventBus.subscribe('viewer:escapePressed', () => {
                if (this.isCopyMode) {
                    this.cancelCopy();
                }
            });
        }
    }

    startCopy() {
        const selectedElements = this.selectionManager.getSelectedElements();
        if (selectedElements.length === 0) {
            alert("Please select an element to copy first.");
            return;
        }
        
        const numCopiesInput = document.getElementById('edit-num-copies');
        const numCopies = parseInt(numCopiesInput.value, 10);

        if (isNaN(numCopies) || numCopies < 1) {
            alert("Please enter a valid number of copies (1 or more).");
            numCopiesInput.value = "1";
            return;
        }

        this.isCopyMode = true;
        this.copySourcePoint = null;
        this.numCopiesToCreate = numCopies;
        this.eventBus.publish('ui:updateStatus', "Pick source point");
        document.body.style.cursor = 'crosshair';
    }

    cancelCopy() {
        this.isCopyMode = false;
        this.copySourcePoint = null;
        this.numCopiesToCreate = 1;
        this.eventBus.publish('ui:updateStatus', null);
        document.body.style.cursor = 'default';
    }

    handleCopyClick(event, point) {
        if (!this.isCopyMode || event.button !== 0) return false;

        if (!point) return true;

        if (!this.copySourcePoint) {
            // This is the first click: setting the source point
            this.copySourcePoint = point;
            this.eventBus.publish('ui:updateStatus', `Pick destination point (vector for ${this.numCopiesToCreate} copies)`);
        } else {
            // This is the second click: setting the destination and performing the copy
            const destinationPoint = point;
            this.performCopy(this.copySourcePoint, destinationPoint);
            this.cancelCopy(); // Exit copy mode after completion
        }
        return true;
    }

    performCopy(sourcePoint, destinationPoint) {
        const selectedElements = this.selectionManager.getSelectedElements();
        if (selectedElements.length === 0) return;

        const copiedElements = this.elementManager.copyElements(
            selectedElements, 
            sourcePoint, 
            destinationPoint, 
            this.numCopiesToCreate
        );

        // Update UI for each copied element
        copiedElements.forEach(element => {
            this.uiManager.addElementToList(element);
        });

        // Update element count
        document.getElementById('element-count').textContent = this.elementManager.getAllElements().length;
        
        console.log(`Copied ${selectedElements.length} element(s) ${this.numCopiesToCreate} times`);
    }

    isCopyModeActive() {
        return this.isCopyMode;
    }
} 