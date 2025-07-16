class ElementListPanel {
    constructor(viewer) {
        this.viewer = viewer;
        this.elementManager = viewer.elementManager;
        this.selectionManager = viewer.selectionManager;
        this.container = null; // This will be the #beam-items container

        this.panel = this._createPanel();
    }

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'beam-list';
        panel.innerHTML = `<h3>Structural Elements</h3>`;

        this.container = document.createElement('div');
        this.container.id = 'beam-items';
        panel.appendChild(this.container);

        return panel;
    }

    populate() {
        this.container.innerHTML = '';
        const elements = this.elementManager.getAllElements();
        const processedElements = new Set();

        elements.forEach(element => {
            if (!element.parentId) {
                this._addToList(element);
                if (element.kind === 'group' && element.children) {
                    element.children.forEach(childId => {
                        const childElement = this.elementManager.getElement(childId);
                        if (childElement) {
                            this._addToList(childElement, true);
                            processedElements.add(childId);
                        }
                    });
                }
                processedElements.add(element.id);
            }
        });

        // Add any remaining orphans
        elements.forEach(element => {
            if (!processedElements.has(element.id)) {
                this._addToList(element);
            }
        });
    }

    _addToList(element, isChild = false) {
        const item = document.createElement('div');
        item.className = 'beam-item';
        item.dataset.elementId = element.id;

        if (isChild) {
            item.style.marginLeft = '20px';
        }
        
        let content;
        if (element.kind === 'group') {
            content = `
                <div class="beam-id">${element.id} (${element.type})</div>
                <div class="beam-profile">Contains ${element.children.length} elements</div>
            `;
        } else {
            content = `
                <div class="beam-id">${element.id}</div>
                <div class="beam-profile">${element.profile || 'Plate'}</div>
                <div class="beam-material">${element.material}</div>
            `;
        }
        item.innerHTML = content;
        
        item.addEventListener('click', (event) => {
            // This is a temporary reference until the UIManager can properly pass the selection manager
            const selManager = this.viewer.selectionManager || this.selectionManager; 
            if (event.ctrlKey) {
                selManager.toggleSelection(element.id);
            } else {
                selManager.setSelection([element.id]);
            }
        });
        this.container.appendChild(item);
    }
    
    add(element) {
        this._addToList(element);
    }

    update(element) {
        const listItem = this.container.querySelector(`[data-element-id="${element.id}"]`);
        if (listItem) {
            const content = `
                <div class="beam-id">${element.id}</div>
                <div class="beam-profile">${element.profile || 'Plate'}</div>
                <div class="beam-material">${element.material}</div>
            `;
            listItem.innerHTML = content;
        }
    }

    remove(elementId) {
        const listItem = this.container.querySelector(`[data-element-id="${elementId}"]`);
        if (listItem) {
            listItem.remove();
        }
    }

    updateSelection(selectedElementIds) {
        this.container.querySelectorAll('.beam-item').forEach(item => {
            const isSelected = selectedElementIds.includes(item.dataset.elementId);
            item.classList.toggle('selected', isSelected);
        });
    }
} 