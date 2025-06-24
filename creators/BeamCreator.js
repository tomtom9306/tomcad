class BeamCreator {
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
        this.uiManager.showCreationPanel('beam');
        this.uiManager.updateStatusBar('Pick start point for the new beam');
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

            this.uiManager.updateStatusBar('Pick end point for the new beam');

        } else if (this.state === 'awaiting_second_point') {
            const endPoint = point.clone();
            
            if (this.firstPoint.distanceTo(endPoint) < 1.0) {
                console.warn("Beam is too short, cancelling.");
                this.creationManager.cancelCreation();
                return;
            }

            const params = this.uiManager.getCreationParams();
            this.elementManager.addNewBeam(
                this.firstPoint,
                endPoint,
                params.profile,
                params.material,
                params.orientation
            );

            this.snapManager.endAxisSnap();
            this.snapManager.startAxisSnap(endPoint);

            this.firstPoint = endPoint.clone();
            this.state = 'awaiting_second_point';
            this.updatePreview(endPoint);
            this.uiManager.updateStatusBar('Pick end point for the new beam (or ESC to cancel)');
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