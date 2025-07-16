class CreationPanel {
    constructor(viewer) {
        this.viewer = viewer;
        this.dom = {};
        this.currentCreatorClass = null;
        this.panel = this._createPanel();
        this._queryDOMElements();
        this._addEventListeners();
        this.profiles = [];
    }

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'creation-panel';
        panel.innerHTML = `
            <h3>Create Element</h3>
            <div id="inputs-container"></div>
            <div class="edit-buttons"><button class="btn btn-danger" id="btn-cancel-creation">Cancel</button></div>
        `;
        return panel;
    }

    _queryDOMElements() {
        this.dom['inputs-container'] = this.panel.querySelector('#inputs-container');
        this.dom['btn-cancel-creation'] = this.panel.querySelector('#btn-cancel-creation');
    }

    _addEventListeners() {
        this.dom['btn-cancel-creation'].addEventListener('click', () => this.viewer.creationManager.cancelCreation());
    }

    populateProfileDropdowns(profiles) {
        this.profiles = profiles;
        // Dropdowns will be populated when shown
    }

    show(creatorClass) {
        this.currentCreatorClass = creatorClass;
        this.panel.style.display = 'block';

        const container = this.dom['inputs-container'];
        container.innerHTML = '';

        const uiConfig = creatorClass.getUI();
        if (!uiConfig) return;

        uiConfig.forEach(field => {
            const fieldId = `create-${this.currentCreatorClass.meta.type}-${field.id}`;
            let fieldHtml = '<div class="input-group">';

            if (field.type === 'checkbox') {
                 fieldHtml = '<div class="input-group-checkbox">'; // Use different class for checkbox alignment
                 fieldHtml += `<input type="checkbox" id="${fieldId}" ${field.value ? 'checked' : ''}>`;
                 fieldHtml += `<label for="${fieldId}">${field.label}</label>`;
            } else {
                 fieldHtml += `<label for="${fieldId}">${field.label}</label>`;
                 if (field.type === 'profile' || field.type === 'material') {
                    const options = (field.type === 'profile') ? this.profiles : ['S235JR', 'S355JR'];
                    fieldHtml += `<select id="${fieldId}">`;
                    fieldHtml += options.map(o => `<option value="${o}" ${o === field.value ? 'selected' : ''}>${o}</option>`).join('');
                    fieldHtml += '</select>';
                } else if (field.type === 'number') {
                    fieldHtml += `<input type="number" id="${fieldId}" value="${field.value}">`;
                } else {
                     fieldHtml += `<input type="text" id="${fieldId}" value="${field.value}">`;
                }
            }
            
            fieldHtml += '</div>';
            container.innerHTML += fieldHtml;
        });
    }

    hide() {
        this.panel.style.display = 'none';
        this.currentCreatorClass = null;
    }

    getParams() {
        const params = {};
        if (!this.currentCreatorClass) return params;

        const uiConfig = this.currentCreatorClass.getUI();
        if (!uiConfig) return {};

        uiConfig.forEach(field => {
            const fieldId = `create-${this.currentCreatorClass.meta.type}-${field.id}`;
            const element = this.panel.querySelector(`#${fieldId}`);
            if (element) {
                if (field.type === 'checkbox') {
                    params[field.id] = element.checked;
                } else if (field.type === 'number') {
                    params[field.id] = parseFloat(element.value);
                } else {
                    params[field.id] = element.value;
                }
            }
        });
        return params;
    }
} 