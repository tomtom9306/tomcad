// Grid line selection and control point handling
window.GridSelectionHandler = class GridSelectionHandler {
    constructor(elementManager, controlPointManager) {
        this.elementManager = elementManager;
        this.controlPointManager = controlPointManager;
    }

    handleGridLineSelection(selectedElements) {
        selectedElements.forEach(gridLineId => {
            console.log('Looking for gridLineId to highlight:', gridLineId);
            const lineObject = this.findGridLineObjectById(gridLineId);
            if (lineObject) {
                // Highlight the grid line
                lineObject.material.color.setHex(0xffff00);
                lineObject.material.linewidth = 3;
                
                console.log('Grid line highlighted:', gridLineId, 'found object:', lineObject.userData);
            } else {
                console.log('Grid line NOT FOUND for highlighting:', gridLineId);
            }
        });
    }

    findGridLineObjectById(gridLineId) {
        if (!this.elementManager.viewer || !this.elementManager.viewer.gridManager) {
            return null;
        }
        
        const gridLines = this.elementManager.viewer.gridManager.getGridLines();
        return gridLines.find(line => {
            const lineId = `${line.userData.gridId}-${line.userData.axis}-${line.userData.label}`;
            return lineId === gridLineId;
        });
    }

    resetGridLineMaterials(selectedElements) {
        // Reset grid line materials for unselected lines
        if (this.elementManager.viewer && this.elementManager.viewer.gridManager) {
            const gridLines = this.elementManager.viewer.gridManager.getGridLines();
            gridLines.forEach(line => {
                const lineId = `${line.userData.gridId}-${line.userData.axis}-${line.userData.label}`;
                if (!selectedElements.includes(lineId) && line.userData.originalMaterial) {
                    line.material.copy(line.userData.originalMaterial);
                }
            });
        }
    }

    getGridLines() {
        if (!this.elementManager.viewer || !this.elementManager.viewer.gridManager) {
            return [];
        }
        return this.elementManager.viewer.gridManager.getGridLines();
    }
}