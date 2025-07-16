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

    // Global functions for UI buttons that might be needed if not all UI is dynamic yet.
    // As UI becomes fully dynamic, these can be removed.
    window.cancelCreation = () => viewer?.creationManager.cancelCreation();
    
    // Set up the import button listener, as it's outside the main viewer logic
    const importInput = document.getElementById('import-file');
    const importBtn = document.getElementById('btn-import');
    if(importInput && importBtn) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && viewer) {
                viewer.importStructure(file);
            }
            // Reset the input so the same file can be imported again
            event.target.value = '';
        });
    }

    // Export viewer for debugging
    window.viewer = viewer;
}); 