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

    // Global functions for UI buttons
    window.startBeamCreation = () => viewer?.creationManager.startBeamCreation();
    window.startPlateCreation = () => viewer?.creationManager.startPlateCreation();
    window.cancelCreation = () => viewer?.creationManager.cancelCreation();
    window.applyChanges = () => viewer?.applyChanges();
    window.deleteElement = () => viewer?.deleteElement();
    window.startCopy = () => viewer?.startCopy();
    window.exportStructure = () => viewer?.exportStructure();
    window.importStructure = (event) => {
        const file = event.target.files[0];
        if (file && viewer) {
            viewer.importStructure(file);
        }
        // Reset the input so the same file can be imported again
        event.target.value = '';
    };
    window.focusOnSelected = () => viewer?.focusOnSelected();
    window.fitToView = () => viewer?.fitToView();
    window.resetView = () => viewer?.resetView();

    // Export viewer for debugging
    window.viewer = viewer;
}); 