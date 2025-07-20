// Import/Export functionality
class ImportExport {
    constructor(structureData, elementManager, uiManager) {
        this.structureData = structureData;
        this.elementManager = elementManager;
        this.uiManager = uiManager;
    }

    exportStructure() {
        const dataStr = JSON.stringify(this.structureData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'modified_structure.json';
        link.click();
        URL.revokeObjectURL(url);
        
        console.log('Structure exported successfully');
    }

    importStructure(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                this.loadImportedStructure(importedData);
            } catch (error) {
                alert('Error importing file: ' + error.message);
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    }

    loadImportedStructure(data) {
        // Clear existing structure
        const currentElements = this.elementManager.getAllElements();
        const idsToRemove = currentElements.map(el => el.id);
        this.elementManager.deleteElements(idsToRemove);

        // Update structure data reference
        Object.assign(this.structureData, data);
        
        // Recreate all elements
        this.elementManager.createBeams();
        
        // Update UI
        this.uiManager.setupUI();
        this.uiManager.closeEditPanel();

        console.log('Structure imported successfully');
    }
} 