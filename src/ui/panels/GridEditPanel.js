class GridEditPanel {
    constructor(viewer) {
        this.viewer = viewer;
        this.panel = this._createPanel();
        this.dom = {};
        this._queryDOMElements();
        this._addEventListeners();
    }

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'grid-edit-panel';
        panel.style.display = 'none'; // Initially hidden

        panel.innerHTML = `
            <h3>Edit Grid Properties</h3>
            <div class="edit-section">
                <h4>Grid Data (Tekla Style)</h4>
                <div class="input-group">
                    <label for="grid-origin">Origin (X Y Z)</label>
                    <input type="text" id="grid-origin" placeholder="e.g., 0 0 0">
                </div>
                <div class="input-group">
                    <label for="grid-rotation">Rotation (Z Y X)</label>
                    <input type="text" id="grid-rotation" placeholder="e.g., 0 0 0">
                </div>
            </div>
            <div class="edit-section">
                <h4>Coordinates</h4>
                <div class="input-group">
                    <label for="grid-x-spacings">X Spacings (e.g., 2*3000 4000)</label>
                    <textarea id="grid-x-spacings" rows="2"></textarea>
                </div>
                <div class="input-group">
                    <label for="grid-x-labels">X Labels (e.g., 1 2 3 A)</label>
                    <input type="text" id="grid-x-labels">
                </div>
                 <div class="input-group">
                    <label for="grid-y-spacings">Y Spacings</label>
                    <textarea id="grid-y-spacings" rows="2"></textarea>
                </div>
                <div class="input-group">
                    <label for="grid-y-labels">Y Labels</label>
                    <input type="text" id="grid-y-labels">
                </div>
                 <div class="input-group">
                    <label for="grid-z-levels">Z Levels (Absolute)</label>
                    <textarea id="grid-z-levels" rows="2"></textarea>
                </div>
                <div class="input-group">
                    <label for="grid-z-labels">Z Labels</label>
                    <input type="text" id="grid-z-labels">
                </div>
            </div>
            <div class="edit-buttons">
                <button class="btn btn-success" id="btn-apply-grid">Apply Changes</button>
                <button class="btn" id="btn-close-grid">Close</button>
            </div>
        `;
        return panel;
    }

    _queryDOMElements() {
        const ids = [
            'grid-origin', 'grid-rotation', 'grid-x-spacings', 'grid-x-labels',
            'grid-y-spacings', 'grid-y-labels', 'grid-z-levels', 'grid-z-labels',
            'btn-apply-grid', 'btn-close-grid'
        ];
        ids.forEach(id => this.dom[id] = this.panel.querySelector(`#${id}`));
    }

    _addEventListeners() {
        this.dom['btn-apply-grid'].addEventListener('click', () => this.applyChanges());
        this.dom['btn-close-grid'].addEventListener('click', () => this.hide());
    }

    show() {
        // For now, we assume only one grid exists: 'grid-main'
        const gridData = this.viewer.structureData.grids.find(g => g.id === 'grid-main');
        if (!gridData) {
            alert('Main grid data not found!');
            return;
        }

        this.populate(gridData);
        this.panel.style.display = 'block';
    }

    hide() {
        this.panel.style.display = 'none';
    }

    populate(gridData) {
        this.dom['grid-origin'].value = gridData.origin.join(' ');
        this.dom['grid-rotation'].value = gridData.rotation.values.join(' ');
        
        this.dom['grid-x-spacings'].value = this._formatSpacingsForDisplay(gridData.xSpacings);
        this.dom['grid-x-labels'].value = gridData.xLabels.join(' ');
        
        this.dom['grid-y-spacings'].value = this._formatSpacingsForDisplay(gridData.ySpacings);
        this.dom['grid-y-labels'].value = gridData.yLabels.join(' ');

        this.dom['grid-z-levels'].value = gridData.zLevels.join(' ');
        this.dom['grid-z-labels'].value = gridData.zLabels.join(' ');
    }
    
    _formatSpacingsForDisplay(spacings) {
        // This could be more intelligent to group like "3*3000" but for now, just join.
        return spacings.join(' ');
    }

    applyChanges() {
        const gridData = this.viewer.structureData.grids.find(g => g.id === 'grid-main');
        if (!gridData) {
            console.error("Cannot apply changes, main grid not found.");
            return;
        }

        try {
            // Parse and update data from form
            gridData.origin = this.dom['grid-origin'].value.split(' ').map(Number);
            gridData.rotation.values = this.dom['grid-rotation'].value.split(' ').map(Number);

            gridData.xSpacings = this._parseSpacings(this.dom['grid-x-spacings'].value);
            let xLabels = this.dom['grid-x-labels'].value.split(' ').filter(l => l); // Use filter to remove empty strings

            gridData.ySpacings = this._parseSpacings(this.dom['grid-y-spacings'].value);
            let yLabels = this.dom['grid-y-labels'].value.split(' ').filter(l => l);

            gridData.zLevels = this.dom['grid-z-levels'].value.split(' ').filter(l => l).map(Number);
            let zLabels = this.dom['grid-z-labels'].value.split(' ').filter(l => l);
            
            // Automatically adjust the number of labels to match the number of lines
            gridData.xLabels = this._adjustLabels(xLabels, gridData.xSpacings.length + 1, 'X');
            gridData.yLabels = this._adjustLabels(yLabels, gridData.ySpacings.length + 1, 'Y');
            gridData.zLabels = this._adjustLabels(zLabels, gridData.zLevels.length, 'Z', gridData.zLevels);

            // Re-populate the form to show the user the auto-corrected labels
            this.populate(gridData);

            // Rebuild grid with validated and corrected data
            this.viewer.gridManager.rebuildGrid(gridData);
            
            // Notify other systems of the update
            this.viewer.eventBus.publish('grid:updated', { gridId: 'grid-main' });
            
            console.log("Grid updated and rebuilt successfully.");
            // No need to hide, user might want to make more changes
            // this.hide(); 

        } catch (error) {
            alert(`Error parsing values: ${error.message}`);
            console.error(error);
        }
    }

    _parseSpacings(spacingsString) {
        const trimmedString = spacingsString.trim();
        if (!trimmedString) return [];

        const expressions = trimmedString.split(/\s+/);
        
        return expressions.flatMap(expr => {
            if (expr.includes('*')) {
                const [count, value] = expr.split('*').map(x => parseFloat(x.trim()));
                if (isNaN(count) || isNaN(value) || !Number.isInteger(count) || count <= 0) {
                    throw new Error(`Invalid spacing expression: "${expr}"`);
                }
                return Array(count).fill(value);
            } else {
                 const num = parseFloat(expr);
                 if (isNaN(num)) {
                    throw new Error(`Invalid spacing value: "${expr}"`);
                 }
                return num;
            }
        });
    }

    _adjustLabels(labels, requiredLength, prefix = '', values = null) {
        if (labels.length === 1 && labels[0] === '') {
            labels = [];
        }

        const currentLength = labels.length;
        if (currentLength >= requiredLength) {
            return labels.slice(0, requiredLength);
        }

        // Add missing labels
        const newLabels = [...labels];
        for (let i = currentLength; i < requiredLength; i++) {
            // Handle Z-levels specifically using their values
            if (values && values[i] !== undefined) {
                const zVal = values[i];
                if (zVal === 0) {
                    newLabels.push("0");
                } else {
                    const labelValue = zVal / 1000;
                    newLabels.push(zVal > 0 ? `+${labelValue}` : `${labelValue}`);
                }
                continue;
            }

            // Handle X/Y labels with intelligent sequence generation
            let nextLabel = `${prefix}${i + 1}`; // Fallback label
            const lastLabel = newLabels.length > 0 ? newLabels[newLabels.length - 1] : null;

            if (lastLabel) {
                // Attempt to increment number at the end of a string (e.g., "S1" -> "S2")
                const match = lastLabel.match(/^(.*?)(\d+)$/);
                if (match) {
                    const base = match[1];
                    const num = parseInt(match[2], 10);
                    nextLabel = `${base}${num + 1}`;
                }
                // Attempt to increment a simple number
                else if (!isNaN(Number(lastLabel))) {
                    nextLabel = (Number(lastLabel) + 1).toString();
                }
                // Attempt to increment a single capital letter
                else if (lastLabel.length === 1 && lastLabel.match(/^[A-Z]$/)) {
                    nextLabel = String.fromCharCode(lastLabel.charCodeAt(0) + 1);
                }
                 // Attempt to increment a single lowercase letter
                else if (lastLabel.length === 1 && lastLabel.match(/^[a-z]$/)) {
                    nextLabel = String.fromCharCode(lastLabel.charCodeAt(0) + 1);
                }
            }
            newLabels.push(nextLabel);
        }
        return newLabels;
    }
} 