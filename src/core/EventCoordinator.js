// EventCoordinator.js - Handles global event coordination and mouse event routing
window.EventCoordinator = class EventCoordinator {
    constructor(beamViewer) {
        this.beamViewer = beamViewer;
        this.mouse = { x: 0, y: 0 };
    }

    onMouseDown(event) {
        if (event.button !== 0) return;

        const rect = this.beamViewer.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.beamViewer.raycaster.setFromCamera(mouse, this.beamViewer.camera);

        const snapPoint = this.beamViewer.snapManager.findSnapPoint(this.beamViewer.raycaster, mouse, event);
        const point = snapPoint || this.beamViewer.getPointOnWorkPlane(mouse);

        if (this.beamViewer.creationManager.isActive()) {
            this.beamViewer.eventBus.publish('creation:mouseDown', { event, point });
        } else if (this.beamViewer.copyManager.isCopyModeActive()) {
            this.beamViewer.eventBus.publish('copy:mouseDown', { event, point });
        } else {
            this.beamViewer.eventBus.publish('selection:mouseDown', { event });
        }
    }

    onMouseMove(event) {
        const rect = this.beamViewer.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.beamViewer.raycaster.setFromCamera(this.mouse, this.beamViewer.camera);
        
        const snapPoint = this.beamViewer.snapManager.findSnapPoint(this.beamViewer.raycaster, this.mouse, event);
        const point = snapPoint || this.beamViewer.getPointOnWorkPlane(this.mouse);

        // Publish a generic event for general purpose updates (previews, highlights)
        this.beamViewer.eventBus.publish('viewer:mouseMove', { event, point, rawMouse: this.mouse });

        // Also publish a specific event if selection is happening
        if (this.beamViewer.selectionManager.isSelecting()) {
            this.beamViewer.eventBus.publish('selection:mouseMove', { event });
        }
    }
    
    onMouseUp(event) {
        if (event.button !== 0) return;
        // Selection is the main thing happening on mouseUp
        this.beamViewer.eventBus.publish('selection:mouseUp', { event });
    }

    setupGlobalEventListeners() {
        // Add mouse event listeners to the renderer canvas
        this.beamViewer.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.beamViewer.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.beamViewer.renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // Add listener for Escape key to cancel actions
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.beamViewer.eventBus.publish('viewer:escapePressed');
            } else if ((event.key === 'Delete' || event.key === 'Backspace') && this.beamViewer.selectionManager.getSelectedElements().length > 0) {
                // Prevent browser back navigation on Backspace
                event.preventDefault();
                this.beamViewer.eventBus.publish('ui:deleteSelected');
            }
        });
    }

    // Get current mouse position
    getMousePosition() {
        return { ...this.mouse };
    }
}