/**
 * Compatibility Layer for TomCAD Template System
 * Provides backward compatibility for strukturaData references
 * This file should be loaded after project-current.js
 */

// Wait for currentProject to be loaded
if (!window.currentProject) {
    console.error('Compatibility: currentProject not found! Make sure project-current.js is loaded first.');
}

// Create backward compatibility alias
window.strukturaData = window.currentProject;

// Proxy to intercept strukturaData updates and sync with currentProject
if (typeof Proxy !== 'undefined') {
    window.strukturaData = new Proxy(window.currentProject, {
        set: function(target, property, value) {
            // Update both objects to maintain sync
            target[property] = value;
            window.currentProject[property] = value;
            
            // Notify about data changes
            if (window.EventBus) {
                EventBus.publish('project:dataChanged', { property, value });
            }
            
            return true;
        },
        
        get: function(target, property) {
            return target[property];
        }
    });
}

console.log('Compatibility: strukturaData alias created for currentProject');

/**
 * Migration helper function to update legacy code
 * Call this function to gradually migrate from strukturaData to currentProject
 */
function migrateToCurrentProject() {
    console.warn('TomCAD Migration: Consider updating code to use "currentProject" instead of "strukturaData"');
    console.warn('Legacy compatibility layer is active but will be removed in future versions');
}

// Auto-call migration notice in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    migrateToCurrentProject();
}