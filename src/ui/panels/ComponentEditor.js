window.ComponentEditor = class ComponentEditor {
    constructor(viewer, dom, formBuilder) {
        this.viewer = viewer;
        this.dom = dom;
        this.formBuilder = formBuilder || new window.FormBuilder();
        this.dynamicInputs = {};
    }

    /**
     * Shows a component with segments for editing
     * @param {Object} element - The component element
     */
    showComponentWithSegments(element) {
        this.dom['segments-container'].style.display = 'block';
        this.dom['dynamic-properties-container'].style.display = 'block';
        
        // Show global component parameters
        this.showComponentGlobalProperties(element);
        
        // Show segments list (handled by SegmentManager)
        // This will be called from the main EditPanel
    }

    /**
     * Shows global properties for a component
     * @param {Object} element - The component element
     */
    showComponentGlobalProperties(element) {
        const container = this.dom['dynamic-properties'];
        this.dynamicInputs = {};
        container.innerHTML = '';
        
        // Get meta-parameters from component creator
        const CreatorClass = window.componentRegistry.getCreator(element.componentType);
        if (!CreatorClass || !CreatorClass.meta || !CreatorClass.meta.params) {
            return;
        }
        
        const params = CreatorClass.meta.params;
        
        Object.entries(params).forEach(([paramKey, paramConfig]) => {
            const value = element[paramKey] || paramConfig.default;
            
            const { group, inputElement } = this.formBuilder.createParameterInput(
                paramKey, 
                paramConfig, 
                value
            );
            
            this.dynamicInputs[paramKey] = inputElement;
            container.appendChild(group);
        });
    }

    /**
     * Extracts global component parameters from the form
     * @returns {Object} Global parameters data
     */
    extractGlobalParameters() {
        return this.formBuilder.extractGlobalParameters(this.dynamicInputs);
    }

    /**
     * Updates the component with new data
     * @param {Object} element - The component element
     * @param {Object} newData - New data to apply
     */
    updateComponent(element, newData) {
        this.viewer.elementManager.updateElement(element.id, newData);
    }

    /**
     * Validates component data
     * @param {Object} element - The component element
     * @returns {boolean} True if valid, false otherwise
     */
    validateComponentData(element) {
        // Get meta-parameters from component creator
        const CreatorClass = window.componentRegistry.getCreator(element.componentType);
        if (!CreatorClass || !CreatorClass.meta || !CreatorClass.meta.params) {
            return true; // No validation rules available
        }
        
        const params = CreatorClass.meta.params;
        
        // Validate each parameter
        for (const [paramKey, paramConfig] of Object.entries(params)) {
            const inputElement = this.dynamicInputs[paramKey];
            if (!inputElement) continue;
            
            const value = inputElement.type === 'number' ? 
                parseFloat(inputElement.value) : 
                inputElement.value;
            
            // Check required parameters
            if (paramConfig.required && (value === '' || value === null || value === undefined)) {
                alert(`${paramConfig.label} is required.`);
                inputElement.focus();
                return false;
            }
            
            // Check number ranges
            if (paramConfig.type === 'number') {
                if (paramConfig.min !== undefined && value < paramConfig.min) {
                    alert(`${paramConfig.label} must be at least ${paramConfig.min}.`);
                    inputElement.focus();
                    return false;
                }
                if (paramConfig.max !== undefined && value > paramConfig.max) {
                    alert(`${paramConfig.label} must be at most ${paramConfig.max}.`);
                    inputElement.focus();
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Resets the component form
     */
    resetForm() {
        const container = this.dom['dynamic-properties'];
        container.innerHTML = '';
        this.dynamicInputs = {};
        this.dom['segments-container'].style.display = 'none';
        this.dom['dynamic-properties-container'].style.display = 'none';
    }

    /**
     * Gets the current dynamic inputs
     * @returns {Object} Current dynamic inputs
     */
    getDynamicInputs() {
        return this.dynamicInputs;
    }

    /**
     * Sets dynamic inputs (used when restoring state)
     * @param {Object} inputs - Dynamic inputs to set
     */
    setDynamicInputs(inputs) {
        this.dynamicInputs = inputs;
    }

    /**
     * Checks if the given element is a component
     * @param {Object} element - The element to check
     * @returns {boolean} True if it's a component, false otherwise
     */
    isComponent(element) {
        return element && element.kind === 'component';
    }

    /**
     * Checks if the component has segments
     * @param {Object} element - The component element
     * @returns {boolean} True if it has segments, false otherwise
     */
    hasSegments(element) {
        return this.isComponent(element) && element.segments && Array.isArray(element.segments);
    }

    /**
     * Gets component type information
     * @param {Object} element - The component element
     * @returns {Object|null} Component type info or null if not found
     */
    getComponentTypeInfo(element) {
        if (!this.isComponent(element)) return null;
        
        const CreatorClass = window.componentRegistry.getCreator(element.componentType);
        return CreatorClass ? {
            meta: CreatorClass.meta,
            creator: CreatorClass
        } : null;
    }

    /**
     * Refreshes the component display
     * @param {Object} element - The component element
     */
    refreshComponent(element) {
        if (this.isComponent(element)) {
            this.showComponentGlobalProperties(element);
        }
    }
}