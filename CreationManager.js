// Creation process management
class CreationManager {
    constructor(scene, elementManager, uiManager, snapManager) {
        this.scene = scene;
        this.elementManager = elementManager;
        this.uiManager = uiManager;
        this.snapManager = snapManager;

        this.activeCreator = null;
        this.handleKeyDown = null;

        // Instantiate creators
        this.beamCreator = new BeamCreator(this, this.scene, this.elementManager, this.uiManager, this.snapManager);
        this.columnCreator = new ColumnCreator(this, this.elementManager, this.uiManager, this.snapManager);
        this.goalPostCreator = new GoalPostCreator(this, this.scene, this.elementManager, this.uiManager, this.snapManager);
    }

    startCreation(creatorType) {
        if (this.isActive()) {
            this.cancelCreation();
        }

        if (creatorType === 'beam') {
            this.activeCreator = this.beamCreator;
        } else if (creatorType === 'column') {
            this.activeCreator = this.columnCreator;
        } else if (creatorType === 'goalpost') {
            this.activeCreator = this.goalPostCreator;
        } else if (creatorType === 'plate') {
            // TODO: Implement plate creation UI and logic
            alert('Plate creation is not yet implemented.');
            return;
        } else {
            return;
        }

        this.activeCreator.start();

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
        if (!this.isActive()) return;

        // Clean up the keydown listener
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
            this.handleKeyDown = null;
        }

        if (this.activeCreator) {
            this.activeCreator.cancel();
            this.activeCreator = null;
        }

        this.uiManager.hideCreationPanel();
        this.uiManager.updateStatusBar(null);
        document.body.style.cursor = 'default';
    }

    handleCanvasClick(point) {
        if (!this.isActive() || !point) return;
        this.activeCreator.handleCanvasClick(point);
    }

    updatePreview(currentPoint) {
        if (!this.isActive()) return;
        if (this.activeCreator.updatePreview) {
            this.activeCreator.updatePreview(currentPoint);
        }
    }

    isActive() {
        return this.activeCreator !== null;
    }
} 