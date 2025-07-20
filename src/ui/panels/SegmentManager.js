window.SegmentManager = class SegmentManager {
    constructor(viewer, dom, formBuilder) {
        this.viewer = viewer;
        this.dom = dom;
        this.formBuilder = formBuilder || new window.FormBuilder();
        this.currentElement = null;
    }

    /**
     * Sets the current element being edited
     * @param {Object} element - The current element
     */
    setCurrentElement(element) {
        this.currentElement = element;
    }

    /**
     * Renders the segments list
     * @param {Array} segments - Array of segments to render
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
            
            // Add event listeners for segment controls
            this.addSegmentEventListeners(segmentDiv, index);
            
            // Render segment parameters
            this.renderSegmentParams(segment, index);
            
            container.appendChild(segmentDiv);
        });
    }

    /**
     * Renders parameters for a specific segment
     * @param {Object} segment - The segment to render parameters for
     * @param {number} segmentIndex - Index of the segment
     */
    renderSegmentParams(segment, segmentIndex) {
        const container = document.getElementById(`segment-params-${segmentIndex}`);
        if (!container) return;
        
        const parameterDefaults = this.getSegmentParameterDefaults(segment.type);
        
        Object.entries(parameterDefaults).forEach(([paramKey, paramConfig]) => {
            const value = segment.params[paramKey] || paramConfig.default;
            
            const group = this.formBuilder.createSegmentParameterInput(
                paramKey,
                paramConfig,
                value,
                (key, val, type) => this.updateSegmentParameter(segmentIndex, key, val, type)
            );
            
            container.appendChild(group);
        });
    }

    /**
     * Adds a new segment
     */
    addSegment() {
        if (!this.currentElement || this.currentElement.kind !== 'component') return;
        
        const segmentType = this.dom['segment-type-select'].value;
        const newSegment = {
            type: segmentType,
            id: `seg_${Date.now()}`, // Simple unique ID
            params: this.getDefaultSegmentParams(segmentType)
        };
        
        // Add segment to the list
        this.currentElement.segments = this.currentElement.segments || [];
        this.currentElement.segments.push(newSegment);
        
        // Refresh UI
        this.renderSegmentsList(this.currentElement.segments);
        
        // Update component
        this.updateComponent();
    }

    /**
     * Removes a segment
     * @param {number} index - Index of the segment to remove
     */
    removeSegment(index) {
        if (!this.currentElement || !this.currentElement.segments) return;
        
        this.currentElement.segments.splice(index, 1);
        this.renderSegmentsList(this.currentElement.segments);
        this.updateComponent();
    }

    /**
     * Moves a segment up or down
     * @param {number} index - Index of the segment to move
     * @param {number} direction - Direction to move (-1 for up, 1 for down)
     */
    moveSegment(index, direction) {
        if (!this.currentElement || !this.currentElement.segments) return;
        
        const segments = this.currentElement.segments;
        const newIndex = index + direction;
        
        if (newIndex < 0 || newIndex >= segments.length) return;
        
        // Swap segments
        [segments[index], segments[newIndex]] = [segments[newIndex], segments[index]];
        
        this.renderSegmentsList(segments);
        this.updateComponent();
    }

    /**
     * Updates a segment parameter
     * @param {number} segmentIndex - Index of the segment
     * @param {string} paramKey - Parameter key
     * @param {*} value - New value
     * @param {string} paramType - Parameter type
     */
    updateSegmentParameter(segmentIndex, paramKey, value, paramType) {
        if (!this.currentElement || !this.currentElement.segments) return;
        
        const segment = this.currentElement.segments[segmentIndex];
        if (!segment) return;
        
        // Type conversion
        let convertedValue = value;
        if (paramType === 'number') {
            convertedValue = parseFloat(value);
        }
        
        segment.params[paramKey] = convertedValue;
        this.updateComponent();
    }

    /**
     * Updates the component after segment changes
     */
    updateComponent() {
        if (!this.currentElement) return;
        
        // This will be called from the main EditPanel to update the component
        // We need to pass the segments data back to the component editor
        if (this.onComponentUpdate) {
            this.onComponentUpdate(this.currentElement);
        }
    }

    /**
     * Sets the component update callback
     * @param {Function} callback - Callback function
     */
    setComponentUpdateCallback(callback) {
        this.onComponentUpdate = callback;
    }

    /**
     * Adds event listeners to segment controls
     * @param {HTMLElement} segmentDiv - The segment div element
     * @param {number} index - Index of the segment
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
     * Gets the display name for a segment type
     * @param {string} type - Segment type
     * @returns {string} Display name
     */
    getSegmentTypeName(type) {
        const names = {
            'flight': 'Bieg schodów',
            'landing_L': 'Spocznik z obrotem',
            'landing_straight': 'Spocznik prosty'
        };
        return names[type] || type;
    }

    /**
     * Gets default parameters for a segment type
     * @param {string} type - Segment type
     * @returns {Object} Default parameters
     */
    getDefaultSegmentParams(type) {
        const defaults = {
            'flight': { stepCount: 10, totalRise: 2000, run: 280 },
            'landing_L': { turn: 'left', width: 1000, depth: 1200 },
            'landing_straight': { length: 1200 }
        };
        return defaults[type] || {};
    }

    /**
     * Gets parameter definitions for a segment type
     * @param {string} type - Segment type
     * @returns {Object} Parameter definitions
     */
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

    /**
     * Validates segment data
     * @param {Array} segments - Array of segments to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validateSegments(segments) {
        if (!segments || !Array.isArray(segments)) return true;
        
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const paramDefs = this.getSegmentParameterDefaults(segment.type);
            
            // Validate each parameter
            for (const [paramKey, paramConfig] of Object.entries(paramDefs)) {
                const value = segment.params[paramKey];
                
                if (paramConfig.required && (value === '' || value === null || value === undefined)) {
                    alert(`Segment ${i + 1} (${this.getSegmentTypeName(segment.type)}): ${paramConfig.label} is required.`);
                    return false;
                }
                
                if (paramConfig.type === 'number' && value !== undefined) {
                    if (paramConfig.min !== undefined && value < paramConfig.min) {
                        alert(`Segment ${i + 1} (${this.getSegmentTypeName(segment.type)}): ${paramConfig.label} must be at least ${paramConfig.min}.`);
                        return false;
                    }
                    if (paramConfig.max !== undefined && value > paramConfig.max) {
                        alert(`Segment ${i + 1} (${this.getSegmentTypeName(segment.type)}): ${paramConfig.label} must be at most ${paramConfig.max}.`);
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    /**
     * Resets the segments manager
     */
    reset() {
        this.currentElement = null;
        const container = this.dom['segments-list'];
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Gets the current segments
     * @returns {Array|null} Current segments or null
     */
    getCurrentSegments() {
        return this.currentElement ? this.currentElement.segments : null;
    }
}