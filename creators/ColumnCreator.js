class ColumnCreator {
    constructor(creationManager, elementManager, uiManager) {
        this.creationManager = creationManager;
        this.elementManager = elementManager;
        this.uiManager = uiManager;
        this.state = null;
    }

    start() {
        this.state = 'awaiting_column_point';
        this.uiManager.showCreationPanel('column');
        this.uiManager.updateStatusBar('Pick point for the new column');
        document.body.style.cursor = 'crosshair';
    }

    handleCanvasClick(point) {
        if (this.state === 'awaiting_column_point') {
            const params = this.uiManager.getCreationParams();
            this.elementManager.addNewColumn(point.clone(), params);
            this.uiManager.updateStatusBar('Pick point for new column (or ESC to cancel)');
        }
    }

    updatePreview(point) {
        // No preview for single-click column creation
    }

    cancel() {
        this.state = null;
    }

    get isCreating() {
        return this.state !== null;
    }
} 