class EditPanel {
    constructor(viewer) {
        this.viewer = viewer;
        this.elementManager = viewer.elementManager;
        this.selectionManager = viewer.selectionManager;

        this.dom = {};
        this.currentUIConfig = null; // Store the config used to build the form
        this.dynamicInputs = {}; // Store dynamic input elements
        this.panel = this._createPanel();
        this._queryDOMElements();
        this._addEventListeners();
    }

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'edit-panel';

        const createSelect = (id, label, options = []) => {
            const optionsHTML = options.map(o => `<option value="${o.value}">${o.text}</option>`).join('');
            return `<div class="input-group"><label for="${id}">${label}</label><select id="${id}">${optionsHTML}</select></div>`;
        }
        const createInput = (id, label, type = 'number', step = '10') => {
            return `<div class="input-group"><label for="${id}">${label}</label><input type="${type}" id="${id}" step="${step}"></div>`;
        };

        panel.innerHTML = `
            <h3>Edit Element: <span id="edit-element-id"></span></h3>
            
            <div id="dynamic-properties-container">
                 <h4>Properties</h4>
                <div id="dynamic-properties"></div>
            </div>

            <div id="segments-container" style="display: none;">
                <h4>Segments</h4>
                <div id="segments-list"></div>
                <div class="segments-actions">
                    <select id="segment-type-select">
                        <option value="flight">Bieg schodów</option>
                        <option value="landing_L">Spocznik z obrotem</option>
                        <option value="landing_straight">Spocznik prosty</option>
                    </select>
                    <button class="btn btn-add-segment" id="btn-add-segment">Dodaj segment</button>
                </div>
            </div>
            
            <div class="edit-section" id="generic-properties">
                 <div class="edit-section" id="position-inputs">
                    <h4>Position & Dimensions</h4>
                    <div class="input-row">${createInput('edit-start-x', 'Start X')}${createInput('edit-start-y', 'Start Y')}${createInput('edit-start-z', 'Start Z')}</div>
                    <div class="input-row">${createInput('edit-end-x', 'End X')}${createInput('edit-end-y', 'End Y')}${createInput('edit-end-z', 'End Z')}</div>
                    <div class="input-group" id="plate-dimensions" style="display: none;"><div class="input-row">${createInput('edit-width', 'Width')}${createInput('edit-height', 'Height')}${createInput('edit-thickness', 'Thickness', 'number', '1')}</div></div>
                </div>
                 <div class="edit-section">
                    <h4>Profile & Material</h4>
                    ${createSelect('edit-element-type', 'Element Type', [{value: 'beam', text: 'Beam'}, {value: 'plate', text: 'Plate'}, {value: 'group', text: 'Group'}])}
                    ${createSelect('edit-profile', 'Profile')}
                    ${createSelect('edit-material', 'Material', [{value: 'S355JR', text: 'S355JR'}, {value: 'S235JR', text: 'S235JR'}, {value: 'S275JR', text: 'S275JR'}])}
                    ${createInput('edit-orientation', 'Orientation (deg)', 'number', '1')}
                </div>
            </div>

            <div class="edit-section">
                <h4>Actions</h4>
                ${createInput('edit-num-copies', 'Number of Copies', 'number', '1')}
                <div class="edit-buttons">
                    <button class="btn btn-success" id="btn-apply">Apply</button>
                    <button class="btn btn-copy" id="btn-copy">Copy</button>
                    <button class="btn btn-danger" id="btn-delete">Delete</button>
                    <button class="btn" id="btn-close">Close</button>
                </div>
            </div>`;
        return panel;
    }

    _queryDOMElements() {
        const ids = [
            'edit-element-id', 'dynamic-properties-container', 'dynamic-properties', 'generic-properties', 'position-inputs', 'plate-dimensions', 
            'edit-start-x', 'edit-start-y', 'edit-start-z', 'edit-end-x', 'edit-end-y', 'edit-end-z', 
            'edit-width', 'edit-height', 'edit-thickness', 'edit-element-type', 'edit-profile', 
            'edit-material', 'edit-orientation', 'edit-num-copies', 
            'btn-apply', 'btn-copy', 'btn-delete', 'btn-close',
            'segments-container', 'segments-list', 'segment-type-select', 'btn-add-segment'
        ];
        ids.forEach(id => this.dom[id] = this.panel.querySelector(`#${id}`));
    }

    _addEventListeners() {
        this.dom['btn-apply'].addEventListener('click', () => this.applyChanges());
        this.dom['btn-copy'].addEventListener('click', () => this.viewer.startCopy());
        this.dom['btn-delete'].addEventListener('click', () => this.viewer.uiManager.deleteSelectedElements());
        this.dom['btn-close'].addEventListener('click', () => this.hide());
        this.dom['btn-add-segment'].addEventListener('click', () => this.addSegment());
    }

    show(element, uiConfig) {
        this.panel.style.display = 'block';
        this.currentUIConfig = uiConfig;
        this.dynamicInputs = {};
        this.dom['dynamic-properties'].innerHTML = '';
        this.currentElement = element; // Store reference to current element

        this.dom['generic-properties'].style.display = 'none';
        this.dom['dynamic-properties-container'].style.display = 'none';
        this.dom['segments-container'].style.display = 'none';

        // Check if this is a grid line
        if (element && element.isGridLine) {
            this.showGridLine(element);
            return;
        }

        this.dom['edit-element-id'].textContent = element.id;

        // Check if this is a component with segments
        if (element.kind === 'component' && element.segments) {
            this.showComponentWithSegments(element);
        } else if (uiConfig) {
            this.dom['dynamic-properties-container'].style.display = 'block';
            const container = this.dom['dynamic-properties'];
            
            uiConfig.forEach(item => {
                let inputElement;
                const inputId = `edit-dynamic-${item.id}`;
                
                const group = document.createElement('div');
                group.className = item.type === 'checkbox' ? 'input-group-checkbox' : 'input-group';

                const label = document.createElement('label');
                label.setAttribute('for', inputId);
                label.textContent = item.label;

                switch(item.type) {
                    case 'number':
                        inputElement = document.createElement('input');
                        inputElement.type = 'number';
                        inputElement.value = item.value;
                        break;
                    case 'profile':
                        inputElement = document.createElement('select');
                        this._populateSingleDropdown(inputElement, this.viewer.profiles.getProfileNames());
                        inputElement.value = item.value;
                        break;
                    case 'material':
                        inputElement = document.createElement('select');
                        this._populateSingleDropdown(inputElement, ['S235JR', 'S275JR', 'S355JR']);
                        inputElement.value = item.value;
                        break;
                    case 'checkbox':
                        inputElement = document.createElement('input');
                        inputElement.type = 'checkbox';
                        inputElement.checked = item.value;
                        break;
                    default: // text
                        inputElement = document.createElement('input');
                        inputElement.type = 'text';
                        inputElement.value = item.value;
                }
                
                inputElement.id = inputId;
                this.dynamicInputs[item.id] = inputElement;

                if (item.type === 'checkbox') {
                    group.appendChild(inputElement);
                    group.appendChild(label);
                } else {
                    group.appendChild(label);
                    group.appendChild(inputElement);
                }
                container.appendChild(group);
            });

        } else {
            // Fallback to old generic UI for simple elements
            this.dom['generic-properties'].style.display = 'block';
            this._showGenericProperties(element);
        }
    }
    
    _showGenericProperties(element) {
        this.dom['position-inputs'].style.display = 'block';
        this.dom['edit-end-x'].parentElement.parentElement.style.display = 'none';
        this.dom['plate-dimensions'].style.display = 'none';
        this.dom['edit-profile'].parentElement.style.display = 'none';
        this.dom['edit-orientation'].parentElement.style.display = 'none';
        
        this.dom['edit-element-type'].value = element.kind;
        this.dom['edit-element-type'].disabled = true;

        if (element.kind === 'beam') {
            this.dom['edit-start-x'].value = element.start[0];
            this.dom['edit-start-y'].value = element.start[1];
            this.dom['edit-start-z'].value = element.start[2];
            this.dom['edit-end-x'].value = element.end[0];
            this.dom['edit-end-y'].value = element.end[1];
            this.dom['edit-end-z'].value = element.end[2];

            this.dom['edit-end-x'].parentElement.parentElement.style.display = 'flex';
            this.dom['edit-profile'].parentElement.style.display = 'block';
            this.dom['edit-orientation'].parentElement.style.display = 'block';
            
            this.populateProfileDropdowns(this.viewer.profiles.getProfileNames());
            this.dom['edit-profile'].value = element.profile;
            this.dom['edit-orientation'].value = element.orientation || 0;


        } else if (element.kind === 'plate') {
            this.dom['edit-start-x'].value = element.origin[0];
            this.dom['edit-start-y'].value = element.origin[1];
            this.dom['edit-start-z'].value = element.origin[2];
            this.dom['edit-width'].value = element.width;
            this.dom['edit-height'].value = element.height;
            this.dom['edit-thickness'].value = element.thickness;

            this.dom['plate-dimensions'].style.display = 'block';
        }
        
        this.dom['edit-material'].value = element.material;
    }

    hide() {
        this.panel.style.display = 'none';
        this.currentUIConfig = null;
        this.dynamicInputs = {};
        this.currentElement = null;
    }
    
    _populateSingleDropdown(selectElement, options) {
        if (selectElement) {
            selectElement.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
        }
    }
    
    populateProfileDropdowns(profiles) {
        this._populateSingleDropdown(this.dom['edit-profile'], profiles);
    }

    applyChanges() {
        const selectedElements = this.selectionManager.getSelectedElements();
        if (selectedElements.length !== 1) return;

        const elementId = selectedElements[0];
        const newData = {};

        if (this.currentUIConfig) {
            this.currentUIConfig.forEach(item => {
                const inputElement = this.dynamicInputs[item.id];
                if (inputElement) {
                    switch (item.type) {
                        case 'number':
                            newData[item.id] = parseFloat(inputElement.value);
                            break;
                        case 'checkbox':
                            newData[item.id] = inputElement.checked;
                            break;
                        default: // text, profile, material
                            newData[item.id] = inputElement.value;
                    }
                }
            });
        } else {
            const originalElement = this.elementManager.getElement(elementId);
            if (!originalElement) return;
            
            const currentType = originalElement.kind;
            const material = this.dom['edit-material'].value;
            Object.assign(newData, { material });

            if (currentType === 'beam') {
                const startX = parseFloat(this.dom['edit-start-x'].value);
                const startY = parseFloat(this.dom['edit-start-y'].value);
                const startZ = parseFloat(this.dom['edit-start-z'].value);
                const endX = parseFloat(this.dom['edit-end-x'].value);
                const endY = parseFloat(this.dom['edit-end-y'].value);
                const endZ = parseFloat(this.dom['edit-end-z'].value);
                const profile = this.dom['edit-profile'].value;
                const orientation = parseFloat(this.dom['edit-orientation'].value);
                Object.assign(newData, { start: [startX, startY, startZ], end: [endX, endY, endZ], profile, orientation });

            } else if (currentType === 'plate') {
                const originX = parseFloat(this.dom['edit-start-x'].value);
                const originY = parseFloat(this.dom['edit-start-y'].value);
                const originZ = parseFloat(this.dom['edit-start-z'].value);
                const width = parseFloat(this.dom['edit-width'].value);
                const height = parseFloat(this.dom['edit-height'].value);
                const thickness = parseFloat(this.dom['edit-thickness'].value);
                Object.assign(newData, { origin: [originX, originY, originZ], width, height, thickness });
            }
        }

        this.elementManager.updateElement(elementId, newData);
        this.viewer.uiManager.elementListPanel.update(this.elementManager.getElement(elementId));
    }

    /**
     * Pokazuje komponent kompozytowy z segmentami
     */
    showComponentWithSegments(element) {
        this.dom['segments-container'].style.display = 'block';
        this.dom['dynamic-properties-container'].style.display = 'block';
        
        // Pokaż globalne parametry komponentu
        this.showComponentGlobalProperties(element);
        
        // Pokaż listę segmentów
        this.renderSegmentsList(element.segments);
    }

    /**
     * Pokazuje globalne parametry komponentu
     */
    showComponentGlobalProperties(element) {
        const container = this.dom['dynamic-properties'];
        this.dynamicInputs = {};
        
        // Pobierz meta-parametry z kreatora komponentu
        const CreatorClass = window.componentRegistry.getCreator(element.componentType);
        if (!CreatorClass || !CreatorClass.meta || !CreatorClass.meta.params) return;
        
        const params = CreatorClass.meta.params;
        
        Object.entries(params).forEach(([paramKey, paramConfig]) => {
            const value = element[paramKey] || paramConfig.default;
            
            const group = document.createElement('div');
            group.className = paramConfig.type === 'checkbox' ? 'input-group-checkbox' : 'input-group';
            
            const label = document.createElement('label');
            label.textContent = paramConfig.label;
            
            let inputElement;
            switch(paramConfig.type) {
                case 'number':
                    inputElement = document.createElement('input');
                    inputElement.type = 'number';
                    inputElement.value = value;
                    break;
                case 'select':
                    inputElement = document.createElement('select');
                    paramConfig.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option;
                        optionElement.textContent = option;
                        inputElement.appendChild(optionElement);
                    });
                    inputElement.value = value;
                    break;
                default: // text
                    inputElement = document.createElement('input');
                    inputElement.type = 'text';
                    inputElement.value = value;
            }
            
            this.dynamicInputs[paramKey] = inputElement;
            
            if (paramConfig.type === 'checkbox') {
                group.appendChild(inputElement);
                group.appendChild(label);
            } else {
                group.appendChild(label);
                group.appendChild(inputElement);
            }
            container.appendChild(group);
        });
    }

    /**
     * Renderuje listę segmentów
     */
    renderSegmentsList(segments) {
        const container = this.dom['segments-list'];
        container.innerHTML = '';
        
        segments.forEach((segment, index) => {
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'segment-item';
            segmentDiv.dataset.segmentIndex = index;
            
            segmentDiv.innerHTML = `
                <div class="segment-header">
                    <span class="segment-title">${this.getSegmentTypeName(segment.type)} (${segment.id})</span>
                    <div class="segment-controls">
                        <button class="btn btn-small btn-move-up" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button class="btn btn-small btn-move-down" ${index === segments.length - 1 ? 'disabled' : ''}>↓</button>
                        <button class="btn btn-small btn-danger btn-remove">×</button>
                    </div>
                </div>
                <div class="segment-params" id="segment-params-${index}"></div>
            `;
            
            // Dodaj event listenery dla przycisków
            this.addSegmentEventListeners(segmentDiv, index);
            
            // Renderuj parametry segmentu
            this.renderSegmentParams(segment, index);
            
            container.appendChild(segmentDiv);
        });
    }

    /**
     * Renderuje parametry konkretnego segmentu
     */
    renderSegmentParams(segment, segmentIndex) {
        const container = document.getElementById(`segment-params-${segmentIndex}`);
        if (!container) return;
        
        const parameterDefaults = this.getSegmentParameterDefaults(segment.type);
        
        Object.entries(parameterDefaults).forEach(([paramKey, paramConfig]) => {
            const value = segment.params[paramKey] || paramConfig.default;
            
            const group = document.createElement('div');
            group.className = 'input-group-small';
            
            const label = document.createElement('label');
            label.textContent = paramConfig.label;
            
            let inputElement;
            switch(paramConfig.type) {
                case 'number':
                    inputElement = document.createElement('input');
                    inputElement.type = 'number';
                    inputElement.value = value;
                    inputElement.step = paramConfig.step || '1';
                    break;
                case 'select':
                    inputElement = document.createElement('select');
                    paramConfig.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option;
                        optionElement.textContent = option;
                        inputElement.appendChild(optionElement);
                    });
                    inputElement.value = value;
                    break;
                default:
                    inputElement = document.createElement('input');
                    inputElement.type = 'text';
                    inputElement.value = value;
            }
            
            // Dodaj listener do automatycznej aktualizacji
            inputElement.addEventListener('change', () => {
                this.updateSegmentParameter(segmentIndex, paramKey, inputElement.value, paramConfig.type);
            });
            
            group.appendChild(label);
            group.appendChild(inputElement);
            container.appendChild(group);
        });
    }

    /**
     * Dodaje segment do komponentu
     */
    addSegment() {
        if (!this.currentElement || this.currentElement.kind !== 'component') return;
        
        const segmentType = this.dom['segment-type-select'].value;
        const newSegment = {
            type: segmentType,
            id: `seg_${Date.now()}`, // Proste unikalne ID
            params: this.getDefaultSegmentParams(segmentType)
        };
        
        // Dodaj segment do listy
        this.currentElement.segments = this.currentElement.segments || [];
        this.currentElement.segments.push(newSegment);
        
        // Odśwież UI
        this.renderSegmentsList(this.currentElement.segments);
        
        // Zaktualizuj komponent
        this.updateComponent();
    }

    /**
     * Dodaje event listenery do przycisków segmentu
     */
    addSegmentEventListeners(segmentDiv, index) {
        const moveUpBtn = segmentDiv.querySelector('.btn-move-up');
        const moveDownBtn = segmentDiv.querySelector('.btn-move-down');
        const removeBtn = segmentDiv.querySelector('.btn-remove');
        
        moveUpBtn.addEventListener('click', () => this.moveSegment(index, -1));
        moveDownBtn.addEventListener('click', () => this.moveSegment(index, 1));
        removeBtn.addEventListener('click', () => this.removeSegment(index));
    }

    /**
     * Przesuwa segment w górę lub w dół
     */
    moveSegment(index, direction) {
        if (!this.currentElement || !this.currentElement.segments) return;
        
        const segments = this.currentElement.segments;
        const newIndex = index + direction;
        
        if (newIndex < 0 || newIndex >= segments.length) return;
        
        // Zamień miejscami
        [segments[index], segments[newIndex]] = [segments[newIndex], segments[index]];
        
        this.renderSegmentsList(segments);
        this.updateComponent();
    }

    /**
     * Usuwa segment
     */
    removeSegment(index) {
        if (!this.currentElement || !this.currentElement.segments) return;
        
        this.currentElement.segments.splice(index, 1);
        this.renderSegmentsList(this.currentElement.segments);
        this.updateComponent();
    }

    /**
     * Aktualizuje parametr segmentu
     */
    updateSegmentParameter(segmentIndex, paramKey, value, paramType) {
        if (!this.currentElement || !this.currentElement.segments) return;
        
        const segment = this.currentElement.segments[segmentIndex];
        if (!segment) return;
        
        // Konwersja typu
        let convertedValue = value;
        if (paramType === 'number') {
            convertedValue = parseFloat(value);
        }
        
        segment.params[paramKey] = convertedValue;
        this.updateComponent();
    }

    /**
     * Aktualizuje cały komponent
     */
    updateComponent() {
        if (!this.currentElement) return;
        
        // Pobierz globalne parametry z UI
        const globalParams = {};
        Object.entries(this.dynamicInputs).forEach(([paramKey, inputElement]) => {
            if (inputElement.type === 'number') {
                globalParams[paramKey] = parseFloat(inputElement.value);
            } else if (inputElement.type === 'checkbox') {
                globalParams[paramKey] = inputElement.checked;
            } else {
                globalParams[paramKey] = inputElement.value;
            }
        });
        
        // Połącz z danymi segmentów
        const newData = {
            ...globalParams,
            segments: this.currentElement.segments
        };
        
        this.elementManager.updateElement(this.currentElement.id, newData);
    }

    /**
     * Pomocnicze metody dla różnych typów segmentów
     */
    getSegmentTypeName(type) {
        const names = {
            'flight': 'Bieg schodów',
            'landing_L': 'Spocznik z obrotem',
            'landing_straight': 'Spocznik prosty'
        };
        return names[type] || type;
    }

    getDefaultSegmentParams(type) {
        const defaults = {
            'flight': { stepCount: 10, totalRise: 2000, run: 280 },
            'landing_L': { turn: 'left', width: 1000, depth: 1200 },
            'landing_straight': { length: 1200 }
        };
        return defaults[type] || {};
    }

    getSegmentParameterDefaults(type) {
        const paramDefs = {
            'flight': {
                stepCount: { type: 'number', default: 10, label: 'Liczba stopni', step: '1' },
                totalRise: { type: 'number', default: 2000, label: 'Całkowita wysokość (mm)', step: '10' },
                run: { type: 'number', default: 280, label: 'Głębokość stopnia (mm)', step: '10' }
            },
            'landing_L': {
                turn: { type: 'select', default: 'left', label: 'Kierunek obrotu', options: ['left', 'right'] },
                width: { type: 'number', default: 1000, label: 'Szerokość (mm)', step: '10' },
                depth: { type: 'number', default: 1200, label: 'Głębokość (mm)', step: '10' }
            },
            'landing_straight': {
                length: { type: 'number', default: 1200, label: 'Długość (mm)', step: '10' }
            }
        };
        return paramDefs[type] || {};
    }

    showGridLine(gridLineData) {
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

    _addGridLineEventListeners(gridLineData) {
        const updateBtn = this.panel.querySelector('#btn-update-grid-spacing');
        const editAllBtn = this.panel.querySelector('#btn-edit-all-spacings');
        const labelInput = this.panel.querySelector('#grid-line-label');

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

    _populateGridSpacingValues(gridLineData) {
        const gridData = this.viewer.structureData.grids.find(g => g.id === gridLineData.gridId);
        if (!gridData) return;

        const spacingsKey = `${gridLineData.axis.toLowerCase()}Spacings`;
        const labelsKey = `${gridLineData.axis.toLowerCase()}Labels`;
        
        const lineIndex = gridData[labelsKey].indexOf(gridLineData.label);
        if (lineIndex === -1) return;

        const spacingBeforeInput = this.panel.querySelector('#grid-spacing-before');
        const spacingAfterInput = this.panel.querySelector('#grid-spacing-after');

        if (lineIndex > 0 && spacingBeforeInput) {
            spacingBeforeInput.value = gridData[spacingsKey][lineIndex - 1];
        }

        if (lineIndex < gridData[spacingsKey].length && spacingAfterInput) {
            spacingAfterInput.value = gridData[spacingsKey][lineIndex];
        }
    }

    _updateGridSpacing(gridLineData) {
        const spacingBeforeInput = this.panel.querySelector('#grid-spacing-before');
        const spacingAfterInput = this.panel.querySelector('#grid-spacing-after');
        
        const gridData = this.viewer.structureData.grids.find(g => g.id === gridLineData.gridId);
        if (!gridData) return;

        const spacingsKey = `${gridLineData.axis.toLowerCase()}Spacings`;
        const labelsKey = `${gridLineData.axis.toLowerCase()}Labels`;
        
        const lineIndex = gridData[labelsKey].indexOf(gridLineData.label);
        if (lineIndex === -1) return;

        // Update spacings array
        if (lineIndex > 0 && spacingBeforeInput && spacingBeforeInput.value) {
            gridData[spacingsKey][lineIndex - 1] = parseFloat(spacingBeforeInput.value);
        }

        if (lineIndex < gridData[spacingsKey].length && spacingAfterInput && spacingAfterInput.value) {
            gridData[spacingsKey][lineIndex] = parseFloat(spacingAfterInput.value);
        }

        // Rebuild grid
        this.viewer.gridManager.rebuildGrid(gridData);
        
        // Notify systems
        if (this.viewer.eventBus) {
            this.viewer.eventBus.publish('grid:updated', { gridId: gridLineData.gridId });
        }
    }

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
                gridData[spacingsKey] = spacings;
                
                // Rebuild grid
                this.viewer.gridManager.rebuildGrid(gridData);
                
                // Refresh the panel
                this._populateGridSpacingValues(gridLineData);
                
                // Notify systems
                if (this.viewer.eventBus) {
                    this.viewer.eventBus.publish('grid:updated', { gridId: gridLineData.gridId });
                }
            } catch (error) {
                alert('Invalid spacing format. Use space-separated numbers or expressions like "3*3000".');
            }
        }
    }

    _parseSpacings(spacingsString) {
        return spacingsString.split(/\s+/).map(expr => {
            // Support expressions like "3*3000" or "2*4000"
            if (expr.includes('*')) {
                const [count, value] = expr.split('*').map(x => parseFloat(x.trim()));
                return Array(count).fill(value);
            } else {
                return parseFloat(expr);
            }
        }).flat();
    }

    _updateGridLabel(gridLineData, newLabel) {
        const gridData = this.viewer.structureData.grids.find(g => g.id === gridLineData.gridId);
        if (!gridData) return;

        const labelsKey = `${gridLineData.axis.toLowerCase()}Labels`;
        const lineIndex = gridData[labelsKey].indexOf(gridLineData.label);
        
        if (lineIndex !== -1) {
            gridData[labelsKey][lineIndex] = newLabel;
            gridLineData.label = newLabel; // Update local reference
            
            // Update the title
            this.dom['edit-element-id'].textContent = `Grid Line: ${gridLineData.axis}=${newLabel}`;
            
            // Rebuild grid to update labels
            this.viewer.gridManager.rebuildGrid(gridData);
        }
    }
}