window.FormBuilder = class FormBuilder {
    constructor() {
        this.dynamicInputs = {};
    }

    /**
     * Creates a standard input element with label
     * @param {string} id - Input ID
     * @param {string} label - Input label
     * @param {string} type - Input type (default: 'number')
     * @param {string} step - Input step (default: '10')
     * @returns {string} HTML string for input group
     */
    createInput(id, label, type = 'number', step = '10') {
        return `<div class="input-group"><label for="${id}">${label}</label><input type="${type}" id="${id}" step="${step}"></div>`;
    }

    /**
     * Creates a select element with label
     * @param {string} id - Select ID
     * @param {string} label - Select label
     * @param {Array} options - Array of options with value and text properties
     * @returns {string} HTML string for select group
     */
    createSelect(id, label, options = []) {
        const optionsHTML = options.map(o => `<option value="${o.value}">${o.text}</option>`).join('');
        return `<div class="input-group"><label for="${id}">${label}</label><select id="${id}">${optionsHTML}</select></div>`;
    }

    /**
     * Populates a single dropdown with options
     * @param {HTMLSelectElement} selectElement - The select element to populate
     * @param {Array} options - Array of option values
     */
    populateDropdown(selectElement, options) {
        if (selectElement) {
            selectElement.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
        }
    }

    /**
     * Creates a dynamic form based on UI configuration
     * @param {Array} uiConfig - Configuration array for form fields
     * @param {HTMLElement} container - Container to append form elements
     * @param {Object} viewer - Viewer instance for accessing profiles/materials
     * @returns {Object} Object containing input elements keyed by field ID
     */
    createDynamicForm(uiConfig, container, viewer) {
        const dynamicInputs = {};
        container.innerHTML = '';

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
                    this.populateDropdown(inputElement, viewer.profiles.getProfileNames());
                    inputElement.value = item.value;
                    break;
                case 'material':
                    inputElement = document.createElement('select');
                    this.populateDropdown(inputElement, ['S235JR', 'S275JR', 'S355JR']);
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
            dynamicInputs[item.id] = inputElement;

            if (item.type === 'checkbox') {
                group.appendChild(inputElement);
                group.appendChild(label);
            } else {
                group.appendChild(label);
                group.appendChild(inputElement);
            }
            container.appendChild(group);
        });

        return dynamicInputs;
    }

    /**
     * Creates a parameter input element for components
     * @param {string} paramKey - Parameter key
     * @param {Object} paramConfig - Parameter configuration
     * @param {*} value - Current value
     * @returns {Object} Object with group element and input element
     */
    createParameterInput(paramKey, paramConfig, value) {
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
                if (paramConfig.step) {
                    inputElement.step = paramConfig.step;
                }
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
            case 'checkbox':
                inputElement = document.createElement('input');
                inputElement.type = 'checkbox';
                inputElement.checked = value;
                break;
            default: // text
                inputElement = document.createElement('input');
                inputElement.type = 'text';
                inputElement.value = value;
        }
        
        if (paramConfig.type === 'checkbox') {
            group.appendChild(inputElement);
            group.appendChild(label);
        } else {
            group.appendChild(label);
            group.appendChild(inputElement);
        }
        
        return { group, inputElement };
    }

    /**
     * Creates a small parameter input for segment parameters
     * @param {string} paramKey - Parameter key
     * @param {Object} paramConfig - Parameter configuration
     * @param {*} value - Current value
     * @param {Function} changeCallback - Callback for value changes
     * @returns {HTMLElement} The group element
     */
    createSegmentParameterInput(paramKey, paramConfig, value, changeCallback) {
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
        
        // Add change listener
        inputElement.addEventListener('change', () => {
            changeCallback(paramKey, inputElement.value, paramConfig.type);
        });
        
        group.appendChild(label);
        group.appendChild(inputElement);
        
        return group;
    }

    /**
     * Extracts form data from dynamic inputs
     * @param {Array} uiConfig - UI configuration array
     * @param {Object} dynamicInputs - Dynamic inputs object
     * @returns {Object} Extracted form data
     */
    extractFormData(uiConfig, dynamicInputs) {
        const formData = {};
        
        uiConfig.forEach(item => {
            const inputElement = dynamicInputs[item.id];
            if (inputElement) {
                switch (item.type) {
                    case 'number':
                        formData[item.id] = parseFloat(inputElement.value);
                        break;
                    case 'checkbox':
                        formData[item.id] = inputElement.checked;
                        break;
                    default: // text, profile, material
                        formData[item.id] = inputElement.value;
                }
            }
        });
        
        return formData;
    }

    /**
     * Extracts global parameters from component inputs
     * @param {Object} dynamicInputs - Dynamic inputs object
     * @returns {Object} Global parameters data
     */
    extractGlobalParameters(dynamicInputs) {
        const globalParams = {};
        
        Object.entries(dynamicInputs).forEach(([paramKey, inputElement]) => {
            if (inputElement.type === 'number') {
                globalParams[paramKey] = parseFloat(inputElement.value);
            } else if (inputElement.type === 'checkbox') {
                globalParams[paramKey] = inputElement.checked;
            } else {
                globalParams[paramKey] = inputElement.value;
            }
        });
        
        return globalParams;
    }
}