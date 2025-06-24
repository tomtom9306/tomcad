// Main application entry point
// Global viewer instance
let viewer = null;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Show loading indicator
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex'; // Use flex for centering
    }

    try {
        // Check if strukturaData is available
        if (typeof strukturaData === 'undefined') {
            throw new Error('strukturaData not found. Make sure struktura.js is loaded.');
        }

        // Check if BeamViewer class is available
        if (typeof BeamViewer === 'undefined') {
            throw new Error('BeamViewer class not found. Make sure BeamViewer.js is loaded.');
        }

        // Initialize the viewer
        viewer = new BeamViewer();
        viewer.init();
    } catch (error) {
        console.error('Error initializing TomCAD:', error);
        const loading = document.getElementById('loading');
        if (loading) {
            loading.textContent = 'Error loading application: ' + error.message;
        }
    }

    // Event Listeners for UI buttons
    document.getElementById('add-beam-btn').addEventListener('click', () => viewer?.creationManager.startCreation('beam'));
    document.getElementById('add-column-btn').addEventListener('click', () => viewer?.creationManager.startCreation('column'));
    document.getElementById('add-goalpost-btn').addEventListener('click', () => viewer?.creationManager.startCreation('goalpost'));
    document.getElementById('add-plate-btn').addEventListener('click', () => viewer?.creationManager.startCreation('plate'));
    document.getElementById('delete-btn').addEventListener('click', () => viewer?.uiManager.deleteSelectedElements());

    // Global functions for UI buttons
    window.cancelCreation = () => viewer?.creationManager.cancelCreation();
    window.applyChanges = () => viewer?.uiManager.applyChanges();
    window.startCopy = () => viewer?.copyManager.startCopy();
    window.exportStructure = () => viewer?.importExport.exportStructure();
    window.importStructure = (event) => {
        const file = event.target.files[0];
        if (file && viewer) {
            viewer.importStructure(file);
        }
        // Reset the input so the same file can be imported again
        event.target.value = '';
    };
    window.focusOnSelected = () => viewer?.cameraControls.focusOnSelected();
    window.fitToView = () => viewer?.cameraControls.fitToView();
    window.resetView = () => viewer?.cameraControls.resetView();

    // Export viewer for debugging
    window.viewer = viewer;
}); 