// Main application entry point
// Global viewer instance
let viewer = null;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading indicator
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex'; // Use flex for centering
    }

    try {
        // Check if THREE.js is available
        if (typeof THREE === 'undefined') {
            throw new Error('THREE.js not loaded. Make sure THREE.js is included before this script.');
        }

        // Wait for dependencies to be validated
        if (typeof validateDependencies !== 'undefined') {
            const results = await validateDependencies();
            
            if (!results.success) {
                throw new Error('Dependency validation failed: ' + results.missing.join(', '));
            }
        }

        // Debug: Check what data objects are available
        console.log('🔍 Checking data availability...');
        console.log('window.currentProject:', typeof window.currentProject);
        console.log('window.strukturaData:', typeof window.strukturaData);
        console.log('window.profilesData:', typeof window.profilesData);

        // Check if project data is available
        if (typeof window.currentProject === 'undefined') {
            throw new Error('currentProject not found. Make sure project-current.js is loaded.');
        }

        // Ensure compatibility layer is working
        if (typeof window.strukturaData === 'undefined') {
            throw new Error('Compatibility layer failed. Make sure compatibility.js is loaded after project-current.js.');
        }

        console.log('✅ Data objects loaded successfully');

        // Check if BeamViewer class is available
        if (typeof BeamViewer === 'undefined') {
            throw new Error('BeamViewer class not found. Make sure BeamViewer.js is loaded.');
        }

        // Initialize the viewer
        viewer = new BeamViewer();
        await viewer.init();
        
        console.log('✅ TomCAD initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing TomCAD:', error);
        const loading = document.getElementById('loading');
        if (loading) {
            loading.textContent = 'Error loading application: ' + error.message;
            loading.style.color = 'red';
        }
        
        // Show detailed error information
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            max-width: 400px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            border: 1px solid #f5c6cb;
        `;
        errorDiv.innerHTML = `
            <h3>❌ Application Error</h3>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Stack:</strong></p>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${error.stack}</pre>
            <button onclick="this.parentElement.remove()">Dismiss</button>
        `;
        document.body.appendChild(errorDiv);
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