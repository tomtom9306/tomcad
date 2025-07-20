// Dependency validation for TomCAD application
class DependencyValidator {
    constructor() {
        this.required = {
            'THREE.js': () => typeof THREE !== 'undefined',
            'THREE.Scene': () => typeof THREE !== 'undefined' && typeof THREE.Scene !== 'undefined',
            'THREE.PerspectiveCamera': () => typeof THREE !== 'undefined' && typeof THREE.PerspectiveCamera !== 'undefined',
            'THREE.WebGLRenderer': () => typeof THREE !== 'undefined' && typeof THREE.WebGLRenderer !== 'undefined',
            'THREE.Raycaster': () => typeof THREE !== 'undefined' && typeof THREE.Raycaster !== 'undefined',
            'THREE.Vector3': () => typeof THREE !== 'undefined' && typeof THREE.Vector3 !== 'undefined',
            'THREE.BufferGeometry': () => typeof THREE !== 'undefined' && typeof THREE.BufferGeometry !== 'undefined',
            'THREE.LineBasicMaterial': () => typeof THREE !== 'undefined' && typeof THREE.LineBasicMaterial !== 'undefined',
            'THREE.Line': () => typeof THREE !== 'undefined' && typeof THREE.Line !== 'undefined',
            'THREE.Mesh': () => typeof THREE !== 'undefined' && typeof THREE.Mesh !== 'undefined',
            'THREE.MeshBasicMaterial': () => typeof THREE !== 'undefined' && typeof THREE.MeshBasicMaterial !== 'undefined',
            'THREE.DragControls': () => typeof THREE !== 'undefined' && typeof THREE.DragControls !== 'undefined'
        };
        
        this.optional = {
            'TWEEN': () => typeof TWEEN !== 'undefined',
            'FontLoader': () => typeof THREE !== 'undefined' && typeof THREE.FontLoader !== 'undefined',
            'TextGeometry': () => typeof THREE !== 'undefined' && typeof THREE.TextGeometry !== 'undefined'
        };
    }

    validate() {
        const results = {
            success: true,
            missing: [],
            warnings: [],
            details: {}
        };

        // Check required dependencies
        for (const [name, checkFn] of Object.entries(this.required)) {
            const available = checkFn();
            results.details[name] = available;
            
            if (!available) {
                results.success = false;
                results.missing.push(name);
            }
        }

        // Check optional dependencies
        for (const [name, checkFn] of Object.entries(this.optional)) {
            const available = checkFn();
            results.details[name] = available;
            
            if (!available) {
                results.warnings.push(name);
            }
        }

        return results;
    }

    createErrorReport(results) {
        let html = '<div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px; font-family: Arial, sans-serif;">';
        html += '<h2>❌ Dependency Check Failed</h2>';
        
        if (results.missing.length > 0) {
            html += '<h3>Missing Required Dependencies:</h3><ul>';
            results.missing.forEach(dep => {
                html += `<li><strong>${dep}</strong> - Required for core functionality</li>`;
            });
            html += '</ul>';
        }

        if (results.warnings.length > 0) {
            html += '<h3>Missing Optional Dependencies:</h3><ul>';
            results.warnings.forEach(dep => {
                html += `<li><strong>${dep}</strong> - May cause reduced functionality</li>`;
            });
            html += '</ul>';
        }

        html += '<h3>Troubleshooting:</h3>';
        html += '<ol>';
        html += '<li>Make sure THREE.js is loaded before any other scripts</li>';
        html += '<li>Check that all script tags are in the correct order</li>';
        html += '<li>Verify CDN links are working</li>';
        html += '<li>Check browser console for additional error messages</li>';
        html += '</ol>';

        html += '<h3>Dependency Status:</h3>';
        html += '<div style="font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px;">';
        for (const [name, available] of Object.entries(results.details)) {
            const status = available ? '✅' : '❌';
            html += `${status} ${name}<br>`;
        }
        html += '</div>';

        html += '</div>';
        return html;
    }

    showLoadingMessage() {
        const container = document.getElementById('container') || document.body;
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'dependency-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        loadingDiv.innerHTML = `
            <h3>🔄 Loading TomCAD...</h3>
            <p>Checking dependencies...</p>
        `;
        container.appendChild(loadingDiv);
        return loadingDiv;
    }

    hideLoadingMessage() {
        const loadingDiv = document.getElementById('dependency-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    async validateWithRetry(maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            const results = this.validate();
            
            if (results.success) {
                return results;
            }
            
            if (i < maxRetries - 1) {
                console.log(`Dependency check failed, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return this.validate(); // Return final result
    }
}

// Global dependency validator instance
window.DependencyValidator = DependencyValidator;

// Manual dependency validation function
window.validateDependencies = async () => {
    const validator = new DependencyValidator();
    const results = await validator.validateWithRetry();
    return results;
};