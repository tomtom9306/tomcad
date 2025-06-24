class GoalPostCreator {
    constructor(creationManager, scene, elementManager, uiManager, snapManager) {
        this.creationManager = creationManager;
        this.scene = scene;
        this.elementManager = elementManager;
        this.uiManager = uiManager;
        this.snapManager = snapManager;

        this.state = null;
        this.firstPoint = null;
        this.tempLine = null;
    }

    start() {
        this.state = 'awaiting_first_point';
        this.uiManager.showCreationPanel('goalpost');
        this.uiManager.updateStatusBar('Pick start point for the new goalpost');
        document.body.style.cursor = 'crosshair';
    }

    handleCanvasClick(point) {
        if (this.state === 'awaiting_first_point') {
            this.firstPoint = point.clone();
            this.state = 'awaiting_second_point';
            
            this.snapManager.startAxisSnap(this.firstPoint);

            const material = new THREE.LineDashedMaterial({ color: 0xffaa4a, dashSize: 50, gapSize: 25 });
            const geometry = new THREE.BufferGeometry().setFromPoints([this.firstPoint, this.firstPoint.clone()]);
            this.tempLine = new THREE.Line(geometry, material);
            this.tempLine.computeLineDistances();
            this.scene.add(this.tempLine);

            this.uiManager.updateStatusBar('Pick end point for the new goalpost');

        } else if (this.state === 'awaiting_second_point') {
            const endPoint = point.clone();
            
            if (this.firstPoint.distanceTo(endPoint) < 1.0) {
                console.warn("Goalpost is too short, cancelling.");
                this.creationManager.cancelCreation();
                return;
            }

            const params = this.uiManager.getCreationParams();
            
            this.elementManager.addNewGoalPost(this.firstPoint, endPoint, params);

            this.snapManager.endAxisSnap();
            this.creationManager.cancelCreation();
        }
    }

    updatePreview(currentPoint) {
        if (this.state === 'awaiting_second_point' && this.tempLine) {
            this.tempLine.geometry.setFromPoints([this.firstPoint, currentPoint]);
            this.tempLine.computeLineDistances();
            this.tempLine.geometry.attributes.position.needsUpdate = true;
        }
    }

    cancel() {
        if (this.tempLine) {
            this.scene.remove(this.tempLine);
            this.tempLine.geometry.dispose();
            this.tempLine.material.dispose();
            this.tempLine = null;
        }
        this.snapManager.endAxisSnap();
        this.state = null;
        this.firstPoint = null;
    }

    get isCreating() {
        return this.state !== null;
    }
} 