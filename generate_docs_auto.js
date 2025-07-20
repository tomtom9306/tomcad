// Script to automatically read documentation files and generate sections 1 and 2
const fs = require('fs');
const path = require('path');

// Function to read file content
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.log(`Warning: Could not read ${filePath}`);
        return '';
    }
}

// Section 1: Overview files (corrected paths)
const overviewFiles = {
    '1.1 What is TomCAD': 'documentation/docs/overview/what-is-tomcad.md',
    '1.2 Mission & Vision': 'documentation/docs/overview/mission-vision.md', 
    '1.3 Business Strategy': 'documentation/docs/overview/business-strategy.md',
    '1.4 Design Philosophy': 'documentation/docs/overview/design-philosophy.md',
    '1.5 Current Capabilities': 'documentation/docs/overview/current-capabilities.md',
    '1.6 Future Roadmap': 'documentation/docs/overview/future-roadmap.md',
    '1.7 Why Choose TomCAD': 'documentation/docs/overview/why-tomcad.md'
};

// Section 2: Architecture files (corrected paths)
const architectureFiles = {
    '2.1 System Overview': 'documentation/docs/developer/architecture-overview.md',
    '2.2 Core Principles': 'documentation/docs/developer/architecture-principles.md',
    '2.3 File Structure': 'documentation/docs/developer/file-structure.md',
    '2.4 Data Flow': 'documentation/docs/developer/data-flow.md',
    '2.5 Module System': 'documentation/docs/developer/module-system.md',
    '2.6 Event System': 'documentation/docs/developer/event-system.md',
    '2.7 Component Registry': 'documentation/docs/developer/component-registry.md',
    '2.8 Creator Pattern': 'documentation/docs/developer/creator-pattern.md',
    '2.9 Three.js Integration': 'documentation/docs/developer/threejs-integration.md',
    '2.10 Performance Strategy': 'documentation/docs/developer/performance-strategy.md'
};

// Generate documentation content
let documentation = '1. Overview\n\n';

// Add overview sections
Object.entries(overviewFiles).forEach(([section, filePath]) => {
    const content = readFile(filePath);
    if (content) {
        // Remove markdown headers and clean up content
        const cleanContent = content
            .replace(/^#+\s*/gm, '') // Remove markdown headers
            .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
            .trim();
        
        documentation += `${section} ${cleanContent}\n\n`;
    }
});

documentation += '2. Architecture\n\n';

// Add architecture sections  
Object.entries(architectureFiles).forEach(([section, filePath]) => {
    const content = readFile(filePath);
    if (content) {
        // Remove markdown headers and clean up content
        const cleanContent = content
            .replace(/^#+\s*/gm, '') // Remove markdown headers
            .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
            .trim();
        
        documentation += `${section} ${cleanContent}\n\n`;
    }
});

// Write to file
try {
    fs.writeFileSync('dokumentacja_punkty_1_2.txt', documentation, 'utf8');
    console.log('Successfully generated documentation from source files');
    console.log('File saved as: dokumentacja_punkty_1_2.txt');
    console.log(`Total content length: ${documentation.length} characters`);
} catch (error) {
    console.error('Error writing file:', error);
}