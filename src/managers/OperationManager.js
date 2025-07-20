class OperationManager {
    constructor(viewer, structureData) {
        this.viewer = viewer;
        this.scene = viewer.scene;
        this.structureData = structureData;
        this.operationHelpers = new THREE.Group();
        this.scene.add(this.operationHelpers);
        this.operationClasses = {
            'rectCut': RectCutOperation,
            'hole': HoleOperation,
            'slot': SlotOperation,
        };
        this.operationObjects = [];
    }

    init() {
        this.createOperationVisuals();
    }

    async createOperationVisuals() {
        this.clearVisuals();
        const operations = this.structureData.operations || [];
        for (const opData of operations) {
            const OperationClass = this.operationClasses[opData.type];
            if (!OperationClass) {
                console.warn(`Unsupported operation type: ${opData.type}`);
                continue;
            }
            const operation = new OperationClass(opData);
            const visual = await operation.createVisualization();
            if (visual) {
                this.operationHelpers.add(visual);
                this.operationObjects.push({ opData, operation, visual });
            }
        }
    }

    clearVisuals() {
        while (this.operationHelpers.children.length > 0) {
            const child = this.operationHelpers.children[0];
            this.operationHelpers.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
        this.operationObjects = [];
    }

    update() {}

}

// export default OperationManager; // Removed to make it a global class