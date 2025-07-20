window.GridLineEditor = class GridLineEditor {
    constructor(viewer, dom) {
        this.viewer = viewer;
        this.dom = dom;
        this.currentGridLineData = null;
    }

    /**
     * Shows grid line editing interface
     * @param {Object} gridLineData - Grid line data to edit
     */
    showGridLine(gridLineData) {
        this.currentGridLineData = gridLineData;
        
        this.dom['edit-element-id'].textContent = `Grid Line: ${gridLineData.axis}=${gridLineData.label}`;
        this.dom['dynamic-properties-container'].style.display = 'block';
        
        const container = this.dom['dynamic-properties'];
        container.innerHTML = `
            <div class="input-group">
                <label for="grid-line-label">Label</label>
                <input type="text" id="grid-line-label" value="${gridLineData.label}">
            </div>
            <div class="input-group">
                <label for="grid-line-coordinate">Global Coordinate (mm)</label>
                <input type="number" id="grid-line-coordinate" value="${gridLineData.value}" readonly>
            </div>
            <div class="input-group">
                <label for="grid-line-axis">Axis</label>
                <input type="text" id="grid-line-axis" value="${gridLineData.axis}" readonly>
            </div>
            <div class="grid-spacing-section">
                <h5>Spacing Control</h5>
                <div class="input-group">
                    <label for="grid-spacing-before">Spacing Before (mm)</label>
                    <input type="number" id="grid-spacing-before" step="100">
                </div>
                <div class="input-group">
                    <label for="grid-spacing-after">Spacing After (mm)</label>
                    <input type="number" id="grid-spacing-after" step="100">
                </div>
            </div>
            <div class="grid-actions">
                <button class="btn btn-primary" id="btn-update-grid-spacing">Update Spacing</button>
                <button class="btn btn-secondary" id="btn-edit-all-spacings">Edit All Spacings</button>
            </div>
        `;

        // Add event listeners for grid line controls
        this._addGridLineEventListeners(gridLineData);
        
        // Populate spacing values
        this._populateGridSpacingValues(gridLineData);
    }

    /**
     * Adds event listeners for grid line controls
     * @param {Object} gridLineData - Grid line data
     */
    _addGridLineEventListeners(gridLineData) {
        const updateBtn = this.dom['dynamic-properties'].querySelector('#btn-update-grid-spacing');
        const editAllBtn = this.dom['dynamic-properties'].querySelector('#btn-edit-all-spacings');
        const labelInput = this.dom['dynamic-properties'].querySelector('#grid-line-label');

        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this._updateGridSpacing(gridLineData);
            });
        }

        if (editAllBtn) {
            editAllBtn.addEventListener('click', () => {
                this._editAllSpacings(gridLineData);
            });
        }

        if (labelInput) {
            labelInput.addEventListener('blur', () => {
                this._updateGridLabel(gridLineData, labelInput.value);
            });
        }
    }

    /**
     * Populates grid spacing values in the form
     * @param {Object} gridLineData - Grid line data
     */
    _populateGridSpacingValues(gridLineData) {
        const gridData = this.viewer.structureData.grids.find(g => g.id === gridLineData.gridId);
        if (!gridData) return;

        const spacingsKey = `${gridLineData.axis.toLowerCase()}Spacings`;
        const labelsKey = `${gridLineData.axis.toLowerCase()}Labels`;
        
        const lineIndex = gridData[labelsKey].indexOf(gridLineData.label);
        if (lineIndex === -1) return;

        const spacingBeforeInput = this.dom['dynamic-properties'].querySelector('#grid-spacing-before');
        const spacingAfterInput = this.dom['dynamic-properties'].querySelector('#grid-spacing-after');

        if (lineIndex > 0 && spacingBeforeInput) {
            spacingBeforeInput.value = gridData[spacingsKey][lineIndex - 1];
        }

        if (lineIndex < gridData[spacingsKey].length && spacingAfterInput) {
            spacingAfterInput.value = gridData[spacingsKey][lineIndex];
        }
    }

    /**
     * Updates grid spacing based on form values
     * @param {Object} gridLineData - Grid line data
     */
    _updateGridSpacing(gridLineData) {
        const spacingBeforeInput = this.dom['dynamic-properties'].querySelector('#grid-spacing-before');
        const spacingAfterInput = this.dom['dynamic-properties'].querySelector('#grid-spacing-after');
        
        const gridData = this.viewer.structureData.grids.find(g => g.id === gridLineData.gridId);
        if (!gridData) return;

        const spacingsKey = `${gridLineData.axis.toLowerCase()}Spacings`;
        const labelsKey = `${gridLineData.axis.toLowerCase()}Labels`;
        
        const lineIndex = gridData[labelsKey].indexOf(gridLineData.label);
        if (lineIndex === -1) return;

        // Update spacings array
        if (lineIndex > 0 && spacingBeforeInput && spacingBeforeInput.value) {
            const newSpacing = parseFloat(spacingBeforeInput.value);
            if (newSpacing > 0) {
                gridData[spacingsKey][lineIndex - 1] = newSpacing;
            }
        }

        if (lineIndex < gridData[spacingsKey].length && spacingAfterInput && spacingAfterInput.value) {
            const newSpacing = parseFloat(spacingAfterInput.value);
            if (newSpacing > 0) {
                gridData[spacingsKey][lineIndex] = newSpacing;
            }
        }

        // Rebuild grid
        this.viewer.gridManager.rebuildGrid(gridData);
        
        // Notify systems
        this._notifyGridUpdated(gridLineData.gridId);
    }

    /**
     * Opens dialog to edit all spacings
     * @param {Object} gridLineData - Grid line data
     */
    _editAllSpacings(gridLineData) {
        const gridData = this.viewer.structureData.grids.find(g => g.id === gridLineData.gridId);
        if (!gridData) return;

        const spacingsKey = `${gridLineData.axis.toLowerCase()}Spacings`;
        const currentSpacings = gridData[spacingsKey].join(' ');
        
        const newSpacings = prompt(
            `Edit ${gridLineData.axis} spacings (space-separated values in mm):`,
            currentSpacings
        );

        if (newSpacings !== null) {
            try {
                // Parse and validate spacings (support expressions like "3*3000")
                const spacings = this._parseSpacings(newSpacings);
                
                if (spacings.length === 0) {
                    alert('At least one spacing value is required.');
                    return;
                }

                gridData[spacingsKey] = spacings;
                
                // Rebuild grid
                this.viewer.gridManager.rebuildGrid(gridData);
                
                // Refresh the panel
                this._populateGridSpacingValues(gridLineData);
                
                // Notify systems
                this._notifyGridUpdated(gridLineData.gridId);
            } catch (error) {
                alert('Invalid spacing format. Use space-separated numbers or expressions like "3*3000".');
            }
        }
    }

    /**
     * Parses spacing string into array of numbers
     * @param {string} spacingsString - String containing spacings
     * @returns {Array} Array of spacing values
     */
    _parseSpacings(spacingsString) {
        return spacingsString.split(/\s+/).map(expr => {
            expr = expr.trim();
            if (!expr) return null;
            
            // Support expressions like "3*3000" or "2*4000"
            if (expr.includes('*')) {
                const [count, value] = expr.split('*').map(x => parseFloat(x.trim()));
                if (isNaN(count) || isNaN(value) || count <= 0 || value <= 0) {
                    throw new Error(`Invalid expression: ${expr}`);
                }
                return Array(Math.floor(count)).fill(value);
            } else {
                const value = parseFloat(expr);
                if (isNaN(value) || value <= 0) {
                    throw new Error(`Invalid spacing value: ${expr}`);
                }
                return value;
            }
        }).filter(item => item !== null).flat();
    }

    /**
     * Updates grid line label
     * @param {Object} gridLineData - Grid line data
     * @param {string} newLabel - New label value
     */
    _updateGridLabel(gridLineData, newLabel) {
        if (!newLabel || newLabel.trim() === '') {
            alert('Grid line label cannot be empty.');
            return;
        }

        const gridData = this.viewer.structureData.grids.find(g => g.id === gridLineData.gridId);
        if (!gridData) return;

        const labelsKey = `${gridLineData.axis.toLowerCase()}Labels`;
        const lineIndex = gridData[labelsKey].indexOf(gridLineData.label);
        
        if (lineIndex !== -1) {
            // Check if label already exists
            if (gridData[labelsKey].includes(newLabel) && newLabel !== gridLineData.label) {
                alert('A grid line with this label already exists.');
                // Reset the input to original value
                const labelInput = this.dom['dynamic-properties'].querySelector('#grid-line-label');
                if (labelInput) {
                    labelInput.value = gridLineData.label;
                }
                return;
            }

            gridData[labelsKey][lineIndex] = newLabel;
            gridLineData.label = newLabel; // Update local reference
            
            // Update the title
            this.dom['edit-element-id'].textContent = `Grid Line: ${gridLineData.axis}=${newLabel}`;
            
            // Rebuild grid to update labels
            this.viewer.gridManager.rebuildGrid(gridData);
            
            // Notify systems
            this._notifyGridUpdated(gridLineData.gridId);
        }
    }

    /**
     * Notifies systems that grid was updated
     * @param {string} gridId - Grid ID
     */
    _notifyGridUpdated(gridId) {
        if (this.viewer.eventBus) {
            this.viewer.eventBus.publish('grid:updated', { gridId });
        }
    }

    /**
     * Validates grid line data
     * @param {Object} gridLineData - Grid line data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validateGridLineData(gridLineData) {
        if (!gridLineData) return false;
        
        // Check required fields
        if (!gridLineData.label || !gridLineData.axis || gridLineData.value === undefined) {
            return false;
        }

        // Check if grid exists
        const gridData = this.viewer.structureData.grids.find(g => g.id === gridLineData.gridId);
        if (!gridData) return false;

        return true;
    }

    /**
     * Resets the grid line editor
     */
    reset() {
        this.currentGridLineData = null;
        const container = this.dom['dynamic-properties'];
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Gets the current grid line data
     * @returns {Object|null} Current grid line data or null
     */
    getCurrentGridLineData() {
        return this.currentGridLineData;
    }

    /**
     * Checks if the editor is currently editing a grid line
     * @returns {boolean} True if editing a grid line, false otherwise
     */
    isEditingGridLine() {
        return this.currentGridLineData !== null;
    }

    /**
     * Gets grid data for the current grid line
     * @returns {Object|null} Grid data or null
     */
    getCurrentGridData() {
        if (!this.currentGridLineData) return null;
        return this.viewer.structureData.grids.find(g => g.id === this.currentGridLineData.gridId);
    }
}