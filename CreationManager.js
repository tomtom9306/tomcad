// Creation process management
class CreationManager {
    constructor(scene, elementManager, uiManager, snapManager) {
        this.scene = scene;
        this.elementManager = elementManager;
        this.uiManager = uiManager;
        this.snapManager = snapManager;

        this.isCreating = false;
        this.creationState = null; // e.g., 'awaiting_first_point', 'awaiting_second_point'
        this.firstPoint = null;
        this.tempLine = null;
        this.handleKeyDown = null;
    }

    startBeamCreation() {
        if (this.isCreating) {
            this.cancelCreation();
        }

        this.isCreating = true;
        this.creationState = 'awaiting_first_point';
        this.uiManager.showCreationPanel('beam');
        this.uiManager.updateStatusBar('Pick start point for the new beam');
        document.body.style.cursor = 'crosshair';

        // Add a dedicated listener for the Escape key
        this.handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                this.cancelCreation();
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }

    startPlateCreation() {
        // TODO: Implement plate creation UI and logic
        alert('Plate creation is not yet implemented.');
    }

    cancelCreation() {
        if (!this.isCreating) return;

        // Clean up the keydown listener
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
            this.handleKeyDown = null;
        }

        this.isCreating = false;
        this.creationState = null;
        this.firstPoint = null;
        this.uiManager.hideCreationPanel();
        this.uiManager.updateStatusBar(null);
        document.body.style.cursor = 'default';

        if (this.tempLine) {
            this.scene.remove(this.tempLine);
            this.tempLine.geometry.dispose();
            this.tempLine.material.dispose();
            this.tempLine = null;
        }

        // End axis snapping when creation is cancelled
        this.snapManager.endAxisSnap();
    }

    handleCanvasClick(point) {
        if (!this.isCreating || !point) return;

        if (this.creationState === 'awaiting_first_point') {
            this.firstPoint = point.clone();
            this.creationState = 'awaiting_second_point';
            
            // Start axis snapping from the first point
            this.snapManager.startAxisSnap(this.firstPoint);

            // Create a temporary line for visual feedback
            const material = new THREE.LineDashedMaterial({ color: 0xffaa4a, dashSize: 50, gapSize: 25 });
            const geometry = new THREE.BufferGeometry().setFromPoints([this.firstPoint, this.firstPoint.clone()]);
            this.tempLine = new THREE.Line(geometry, material);
            this.tempLine.computeLineDistances();
            this.scene.add(this.tempLine);

            this.uiManager.updateStatusBar('Pick end point for the new beam');

        } else if (this.creationState === 'awaiting_second_point') {
            const endPoint = point.clone();
            
            // Check if the beam is long enough
            if (this.firstPoint.distanceTo(endPoint) < 1.0) {
                console.warn("Beam is too short, cancelling.");
                this.cancelCreation();
                return;
            }

            // Get parameters from the UI panel
            const params = this.uiManager.getCreationParams();

            // Create the actual beam
            this.elementManager.addNewBeam(
                this.firstPoint,
                endPoint,
                params.profile,
                params.material,
                params.orientation
            );

            // End the old snap session and start a new one from the last point
            this.snapManager.endAxisSnap();
            this.snapManager.startAxisSnap(endPoint);

            // Reset for the next beam
            this.firstPoint = endPoint.clone();
            this.creationState = 'awaiting_second_point';
            this.updatePreview(endPoint); // Start the new temp line from the last point
            this.uiManager.updateStatusBar('Pick end point for the new beam (or ESC to cancel)');
        }
    }

    updatePreview(currentPoint) {
        if (this.creationState === 'awaiting_second_point' && this.tempLine) {
            this.tempLine.geometry.setFromPoints([this.firstPoint, currentPoint]);
            this.tempLine.computeLineDistances();
            this.tempLine.geometry.attributes.position.needsUpdate = true;
        }
    }

    isActive() {
        return this.isCreating;
    }
} 