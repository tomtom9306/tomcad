// Creation process management
class CreationManager {
    constructor(viewer, eventBus) {
        this.viewer = viewer;
        this.eventBus = eventBus;

        this.activeCreator = null;
        this.previewGroup = new THREE.Group();
        this.viewer.scene.add(this.previewGroup);

        if(this.eventBus) {
            this.eventBus.subscribe('creation:mouseDown', (data) => this.handleCanvasClick(data.point));
            this.eventBus.subscribe('viewer:mouseMove', (data) => this.updatePreview(data.point));
            this.eventBus.subscribe('viewer:escapePressed', () => {
                if (this.isActive()) {
                    this.cancelCreation();
                }
            });
        }
    }

    getCreatorClass(type) {
        // Sprawdź nowy ComponentRegistry
        if (window.componentRegistry && window.componentRegistry.hasCreator(type)) {
            return window.componentRegistry.getCreator(type);
        }
        
        return null;
    }

    startCreation(creatorType, parameters = {}) {
        if (this.isActive()) {
            this.cancelCreation();
        }

        this.viewer.snapManager.activate();

        const CreatorClass = this.getCreatorClass(creatorType);
        if (CreatorClass) {
            this.activeCreator = new CreatorClass(this);
            
            // Apply parameters if provided (for backwards compatibility)
            if (Object.keys(parameters).length > 0 && this.activeCreator.setParameters) {
                this.activeCreator.setParameters(parameters);
            }
        } else {
            console.error(`Creator type '${creatorType}' not found.`);
            return;
        }

        this.activeCreator.start();
        
        // Notify sidebar about creation start
        if (window.leftSidebar) {
            window.leftSidebar.updateStatus('Creation started - click to place element');
        }
    }

    /**
     * Start creation with parameters from sidebar
     * @param {string} creatorType - Type of creator (beam, column, etc.)
     * @param {Object} parameters - Parameters from sidebar form
     */
    startCreationWithParameters(creatorType, parameters) {
        console.log(`Starting ${creatorType} creation with parameters:`, parameters);
        this.startCreation(creatorType, parameters);
    }

    startPlateCreation() {
        // TODO: Implement plate creation UI and logic
        alert('Plate creation is not yet implemented.');
    }

    cancelCreation() {
        if (!this.isActive()) return;

        if (this.activeCreator) {
            // The creator's cancel method handles its internal state cleanup.
            this.activeCreator.cancel();
            this.activeCreator = null;
        }

        this.viewer.snapManager.deactivate();
        // The CreationManager is responsible for the preview group.
        this.clearPreview(); 
        this.endAxisSnap();
        this.viewer.uiManager.hideCreationPanel();
        this.setStatus(null);
        document.body.style.cursor = 'default';
    }

    handleCanvasClick(point) {
        if (!this.isActive() || !point) return;
        this.activeCreator.handleCanvasClick(point);
    }

    updatePreview(currentPoint) {
        if (!this.isActive() || !currentPoint) return;
        // The creator's updatePreview method will handle its own state checks
        this.activeCreator.updatePreview(currentPoint);
    }

    isActive() {
        return this.activeCreator !== null && this.activeCreator.isCreating;
    }

    // --- Facade for Creators ---

    addPreviewObject(object) {
        this.previewGroup.add(object);
    }

    removePreviewObject(object) {
        this.previewGroup.remove(object);
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
    }

    clearPreview() {
        while (this.previewGroup.children.length > 0) {
            this.removePreviewObject(this.previewGroup.children[0]);
        }
    }

    createElement(type, ...args) {
        // Map primitive types to their creation methods in ElementManager/ElementFactory
        const factoryMethods = {
            'beam': 'addNewBeam',
            'column': 'addNewColumn',
            'plate': 'addNewPlate',
            'group': 'addNewGroup',
            'component': 'addNewComponent'
        };

        const methodName = factoryMethods[type];
        
        if (methodName && typeof this.viewer.elementManager[methodName] === 'function') {
            return this.viewer.elementManager[methodName](...args);
        } else {
            console.error(`Unknown or unsupported primitive element type to create: ${type}`);
            return null;
        }
    }

    updateElement(elementId, newData) {
        return this.viewer.elementManager.updateElement(elementId, newData);
    }

    getElement(elementId) {
        return this.viewer.elementManager.getElement(elementId);
    }

    setStatus(message) {
        this.eventBus.publish('ui:updateStatus', message);
    }

    showUI(creatorClass) {
        this.viewer.uiManager.showCreationPanel(creatorClass);
    }

    getParams() {
        return this.viewer.uiManager.getCreationParams();
    }


    startAxisSnap(point) {
        this.viewer.snapManager.startAxisSnap(point);
    }

    endAxisSnap() {
        this.viewer.snapManager.endAxisSnap();
    }
} 