window.GenericElementEditor = class GenericElementEditor {
    constructor(viewer, dom, formBuilder) {
        this.viewer = viewer;
        this.dom = dom;
        this.formBuilder = formBuilder || new window.FormBuilder();
    }

    /**
     * Shows generic properties for basic elements (beams, plates)
     * @param {Object} element - The element to edit
     */
    showGenericProperties(element) {
        this.dom['position-inputs'].style.display = 'block';
        this.dom['edit-end-x'].parentElement.parentElement.style.display = 'none';
        this.dom['plate-dimensions'].style.display = 'none';
        this.dom['edit-profile'].parentElement.style.display = 'none';
        this.dom['edit-orientation'].parentElement.style.display = 'none';
        
        this.dom['edit-element-type'].value = element.kind;
        this.dom['edit-element-type'].disabled = true;

        if (element.kind === 'beam') {
            this._showBeamProperties(element);
        } else if (element.kind === 'plate') {
            this._showPlateProperties(element);
        }
        
        this.dom['edit-material'].value = element.material;
    }

    /**
     * Shows beam-specific properties
     * @param {Object} element - The beam element
     */
    _showBeamProperties(element) {
        // Set start coordinates
        this.dom['edit-start-x'].value = element.start[0];
        this.dom['edit-start-y'].value = element.start[1];
        this.dom['edit-start-z'].value = element.start[2];
        
        // Set end coordinates
        this.dom['edit-end-x'].value = element.end[0];
        this.dom['edit-end-y'].value = element.end[1];
        this.dom['edit-end-z'].value = element.end[2];

        // Show end coordinates section
        this.dom['edit-end-x'].parentElement.parentElement.style.display = 'flex';
        
        // Show profile and orientation sections
        this.dom['edit-profile'].parentElement.style.display = 'block';
        this.dom['edit-orientation'].parentElement.style.display = 'block';
        
        // Populate profile dropdown and set value
        this._populateProfileDropdown();
        this.dom['edit-profile'].value = element.profile;
        this.dom['edit-orientation'].value = element.orientation || 0;
    }

    /**
     * Shows plate-specific properties
     * @param {Object} element - The plate element
     */
    _showPlateProperties(element) {
        // Set origin coordinates
        this.dom['edit-start-x'].value = element.origin[0];
        this.dom['edit-start-y'].value = element.origin[1];
        this.dom['edit-start-z'].value = element.origin[2];
        
        // Set dimensions
        this.dom['edit-width'].value = element.width;
        this.dom['edit-height'].value = element.height;
        this.dom['edit-thickness'].value = element.thickness;

        // Show plate dimensions section
        this.dom['plate-dimensions'].style.display = 'block';
    }

    /**
     * Populates the profile dropdown with available profiles
     */
    _populateProfileDropdown() {
        const profileNames = this.viewer.profiles.getProfileNames();
        this.formBuilder.populateDropdown(this.dom['edit-profile'], profileNames);
    }

    /**
     * Extracts generic element data from the form
     * @param {Object} element - The original element
     * @returns {Object} The extracted element data
     */
    extractGenericElementData(element) {
        const currentType = element.kind;
        const material = this.dom['edit-material'].value;
        const newData = { material };

        if (currentType === 'beam') {
            const startX = parseFloat(this.dom['edit-start-x'].value);
            const startY = parseFloat(this.dom['edit-start-y'].value);
            const startZ = parseFloat(this.dom['edit-start-z'].value);
            const endX = parseFloat(this.dom['edit-end-x'].value);
            const endY = parseFloat(this.dom['edit-end-y'].value);
            const endZ = parseFloat(this.dom['edit-end-z'].value);
            const profile = this.dom['edit-profile'].value;
            const orientation = parseFloat(this.dom['edit-orientation'].value);
            
            Object.assign(newData, { 
                start: [startX, startY, startZ], 
                end: [endX, endY, endZ], 
                profile, 
                orientation 
            });

        } else if (currentType === 'plate') {
            const originX = parseFloat(this.dom['edit-start-x'].value);
            const originY = parseFloat(this.dom['edit-start-y'].value);
            const originZ = parseFloat(this.dom['edit-start-z'].value);
            const width = parseFloat(this.dom['edit-width'].value);
            const height = parseFloat(this.dom['edit-height'].value);
            const thickness = parseFloat(this.dom['edit-thickness'].value);
            
            Object.assign(newData, { 
                origin: [originX, originY, originZ], 
                width, 
                height, 
                thickness 
            });
        }

        return newData;
    }

    /**
     * Validates generic element data
     * @param {Object} element - The element to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validateGenericElementData(element) {
        if (element.kind === 'beam') {
            const startX = parseFloat(this.dom['edit-start-x'].value);
            const startY = parseFloat(this.dom['edit-start-y'].value);
            const startZ = parseFloat(this.dom['edit-start-z'].value);
            const endX = parseFloat(this.dom['edit-end-x'].value);
            const endY = parseFloat(this.dom['edit-end-y'].value);
            const endZ = parseFloat(this.dom['edit-end-z'].value);

            // Check if start and end points are different
            if (startX === endX && startY === endY && startZ === endZ) {
                alert('Start and end points cannot be the same for a beam.');
                return false;
            }

            // Check for valid profile
            if (!this.dom['edit-profile'].value) {
                alert('Please select a valid profile.');
                return false;
            }

        } else if (element.kind === 'plate') {
            const width = parseFloat(this.dom['edit-width'].value);
            const height = parseFloat(this.dom['edit-height'].value);
            const thickness = parseFloat(this.dom['edit-thickness'].value);

            // Check for positive dimensions
            if (width <= 0 || height <= 0 || thickness <= 0) {
                alert('All plate dimensions must be positive values.');
                return false;
            }
        }

        return true;
    }

    /**
     * Resets the generic properties form
     */
    resetForm() {
        // Reset visibility
        this.dom['position-inputs'].style.display = 'none';
        this.dom['edit-end-x'].parentElement.parentElement.style.display = 'none';
        this.dom['plate-dimensions'].style.display = 'none';
        this.dom['edit-profile'].parentElement.style.display = 'none';
        this.dom['edit-orientation'].parentElement.style.display = 'none';

        // Reset form values
        const inputs = [
            'edit-start-x', 'edit-start-y', 'edit-start-z',
            'edit-end-x', 'edit-end-y', 'edit-end-z',
            'edit-width', 'edit-height', 'edit-thickness',
            'edit-orientation'
        ];

        inputs.forEach(id => {
            if (this.dom[id]) {
                this.dom[id].value = '';
            }
        });

        // Reset dropdowns
        this.dom['edit-element-type'].disabled = false;
        this.dom['edit-element-type'].value = '';
        this.dom['edit-profile'].value = '';
        this.dom['edit-material'].value = '';
    }
}