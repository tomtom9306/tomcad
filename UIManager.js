// UI management functionality
class UIManager {
    constructor(viewer, eventBus) {
        this.viewer = viewer;
        this.structureData = viewer.structureData;
        this.elementManager = viewer.elementManager;
        this.selectionManager = null; // Will be set later
        this.eventBus = eventBus;
        
        // References to UI elements
        this.statusBar = null;
        this.selectionBox = null;
        this.snapTooltip = null;

        // References to panel managers
        this.elementListPanel = new ElementListPanel(this.viewer);
        this.editPanel = new EditPanel(this.viewer);
        this.creationPanel = new CreationPanel(this.viewer);
        this.gridEditPanel = new GridEditPanel(this.viewer);

        this._createBaseUI();

        // Subscribe to application-wide events
        if (this.eventBus) {
            this.eventBus.subscribe('selection:changed', (data) => {
                // Handle new selection format with type
                if (data && typeof data === 'object' && data.selectedElements !== undefined) {
                    this.onSelectionChanged(data.selectedElements, data.selectionType);
                } else {
                    // Backward compatibility with old format
                    this.onSelectionChanged(data, 'element');
                }
            });

            this.eventBus.subscribe('ui:deleteSelected', () => {
                this.deleteSelectedElements();
            });

            this.eventBus.subscribe('ui:updateStatus', (message) => {
                this.updateStatusBar(message);
            });

            this.eventBus.subscribe('element:updated', (data) => {
                // If the updated element is currently selected, refresh the edit panel
                const selected = this.selectionManager.getSelectedElements();
                if (selected.length === 1 && selected[0] === data.elementId) {
                    const freshElementData = this.elementManager.getElement(data.elementId);
                    if (freshElementData) {
                        let uiConfig = null;
                        if (freshElementData.kind === 'group' && freshElementData.type) {
                            const CreatorClass = this.viewer.creationManager.getCreatorClass(freshElementData.type);
                            if (CreatorClass && typeof CreatorClass.getEditUI === 'function') {
                                uiConfig = CreatorClass.getEditUI(freshElementData);
                            }
                        }
                        this.editPanel.show(freshElementData, uiConfig);
                    }
                }
                // Always update the list panel, which can handle both updates and additions
                this.elementListPanel.update(data.elementData);
            });
        }
    }

    setSelectionManager(selectionManager) {
        this.selectionManager = selectionManager;
        this.elementListPanel.selectionManager = selectionManager;
        this.editPanel.selectionManager = selectionManager;
    }

    _createBaseUI() {
        const container = document.getElementById('container');

        // Overlays
        this.selectionBox = document.createElement('div');
        this.selectionBox.id = 'selection-box';
        this.selectionBox.style.display = 'none';

        this.snapTooltip = document.createElement('div');
        this.snapTooltip.id = 'snap-tooltip';
        
        // Status Bar
        this.statusBar = document.createElement('div');
        this.statusBar.id = 'status-bar';

        // Static Panels and Toolbars
        const topToolbar = this._createTopToolbar();
        const infoPanel = this._createInfoPanel();
        const controlsPanel = this._createControlsPanel();
        const snapToolbar = this._createSnapToolbar();
        
        // Assemble UI
        const rightColumn = document.createElement('div');
        rightColumn.className = 'right-column';
        rightColumn.appendChild(this.elementListPanel.panel);
        rightColumn.appendChild(this.editPanel.panel);
        rightColumn.appendChild(this.creationPanel.panel);
        rightColumn.appendChild(this.gridEditPanel.panel);

        container.appendChild(this.statusBar);
        container.appendChild(topToolbar);
        container.appendChild(infoPanel);
        container.appendChild(controlsPanel);
        container.appendChild(snapToolbar);
        container.appendChild(rightColumn);
        container.appendChild(this.selectionBox);
        container.appendChild(this.snapTooltip);
    }

    _createTopToolbar() {
        const topToolbar = document.createElement('div');
        topToolbar.id = 'top-toolbar';

        // Dynamically create buttons from the creator registry
        const creators = window.componentRegistry.getAllCreators();
        creators.forEach(CreatorClass => {
            const meta = CreatorClass.meta;
            if (!meta) return;

            const btn = document.createElement('button');
            btn.id = `add-${meta.type}-btn`;
            btn.textContent = meta.name;
            btn.className = 'btn';
            btn.addEventListener('click', () => this.viewer.creationManager.startCreation(meta.type));
            topToolbar.appendChild(btn);
        });

        // Add other static buttons
        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'delete-btn';
        deleteBtn.textContent = 'Delete Selected';
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.addEventListener('click', () => this.deleteSelectedElements());
        topToolbar.appendChild(deleteBtn);

        const editGridBtn = document.createElement('button');
        editGridBtn.id = 'edit-grid-btn';
        editGridBtn.textContent = 'Edit Grid';
        editGridBtn.className = 'btn';
        editGridBtn.addEventListener('click', () => this.gridEditPanel.show());
        topToolbar.appendChild(editGridBtn);

        return topToolbar;
    }

    _createInfoPanel() {
        const infoPanel = document.createElement('div');
        infoPanel.id = 'info-panel';
        infoPanel.innerHTML = `
            <h2>${this.structureData.meta.name}</h2>
            <p><strong>Project ID:</strong> ${this.structureData.meta.projectId}</p>
            <p><strong>Elements:</strong> <span id="element-count">0</span></p>
            <p>Press SHIFT for panning</p>`;
        return infoPanel;
    }
    
    _createControlsPanel() {
        const controlsPanel = document.createElement('div');
        controlsPanel.id = 'controls';
        
        controlsPanel.innerHTML = `
            <h3>Controls</h3>
            <p><strong>Middle Mouse + Drag:</strong> Rotate</p>
            <p><strong>Shift + Middle Mouse:</strong> Pan</p>
            <p><strong>Mouse Wheel:</strong> Zoom</p>
            <div id="controls-buttons" style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; gap: 5px;">
                    <button id="btn-fit-all" class="btn">Fit All</button>
                    <button id="btn-focus" class="btn">Focus</button>
                    <button id="btn-reset" class="btn">Reset</button>
                </div>
                <button id="btn-export" class="btn">Export Structure</button>
                <button id="btn-export-ifc" class="btn">Export to IFC</button>
                <button id="btn-import" class="btn">Import Structure</button>
                <input type="file" id="import-file" accept=".json" style="display: none;">
            </div>
        `;

        controlsPanel.querySelector('#btn-fit-all').addEventListener('click', () => this.viewer.fitToView());
        controlsPanel.querySelector('#btn-focus').addEventListener('click', () => this.viewer.focusOnSelected());
        controlsPanel.querySelector('#btn-reset').addEventListener('click', () => this.viewer.resetView());
        controlsPanel.querySelector('#btn-export').addEventListener('click', () => this.viewer.exportStructure());
        controlsPanel.querySelector('#btn-export-ifc').addEventListener('click', () => this.viewer.exportToIFC());

        return controlsPanel;
    }

    _createSnapToolbar() {
        const snapToolbar = document.createElement('div');
        snapToolbar.id = 'snap-toolbar';
        snapToolbar.innerHTML = `
            <button id="snap-grid-lines" class="snap-button active" title="Snap to grid lines">L</button>
            <button id="snap-grid-intersections" class="snap-button" title="Snap to grid intersections">I</button>
            <button id="snap-endpoints" class="snap-button active" title="Snap to beam endpoints">E</button>
            <button id="snap-edges" class="snap-button" title="Snap to edges">D</button>
            <button id="snap-corners" class="snap-button" title="Snap to corners">C</button>
            <button id="snap-axis" class="snap-button" title="Snap to axis">A</button>`;
        return snapToolbar;
    }

    setupUI() {
        document.getElementById('element-count').textContent = this.elementManager.getAllElements().length;
        this.elementListPanel.populate();
        this.populateAllProfileDropdowns();
    }
    
    populateAllProfileDropdowns() {
        const allProfiles = this.viewer.profiles.getProfileNames();

        this.creationPanel.populateProfileDropdowns(allProfiles);
        // this.editPanel.populateProfileDropdowns(allProfiles); // Now handled by EditPanel itself
    }
    
    // --- Delegated Methods ---

    deleteSelectedElements() {
        const selectedIds = this.selectionManager.getSelectedElements();
        if (selectedIds.length === 0) return;

        this.elementManager.deleteElements(selectedIds);
        selectedIds.forEach(id => this.elementListPanel.remove(id));

        document.getElementById('element-count').textContent = this.elementManager.getAllElements().length;
        this.selectionManager.clearSelection();
        this.editPanel.hide();
    }

    updateStatusBar(message) {
        if (message) {
            this.statusBar.textContent = message;
            this.statusBar.style.display = 'block';
        } else {
            this.statusBar.style.display = 'none';
        }
    }

    onSelectionChanged(selectedElements, selectionType = 'element') {
        this.elementListPanel.updateSelection(selectedElements);

        if (selectedElements.length === 1) {
            if (selectionType === 'gridline') {
                // Handle grid line selection
                const gridLineId = selectedElements[0];
                const gridLineData = this.getGridLineData(gridLineId);
                if (gridLineData) {
                    this.editPanel.show(gridLineData, null);
                }
                this.updateStatusBar(`Grid line selected: ${gridLineId}`);
            } else {
                // Handle element selection
                const element = this.elementManager.getElement(selectedElements[0]);
                if (element) {
                    let uiConfig = null;
                    // Check if it's a "smart" group created by a Creator
                    if (element.kind === 'group' && element.type) {
                        const CreatorClass = this.viewer.creationManager.getCreatorClass(element.type);
                        if (CreatorClass && typeof CreatorClass.getEditUI === 'function') {
                            uiConfig = CreatorClass.getEditUI(element);
                        }
                    }

                    this.editPanel.show(element, uiConfig);
                }
                this.updateStatusBar(null);
            }
        } else {
            this.editPanel.hide();
            if (selectedElements.length > 1) {
                if (selectionType === 'gridline') {
                    this.updateStatusBar(`${selectedElements.length} grid lines selected`);
                } else {
                    this.updateStatusBar(`${selectedElements.length} elements selected`);
                }
            } else {
                this.updateStatusBar(null);
            }
        }
    }
    
    // Bridge methods for CreationManager
    showCreationPanel(creatorClass) {
        this.creationPanel.show(creatorClass);
    }

    hideCreationPanel() {
        this.creationPanel.hide();
    }

    getCreationParams() {
        return this.creationPanel.getParams();
    }

    getGridLineData(gridLineId) {
        // Parse grid line ID: "gridId-axis-label"
        const parts = gridLineId.split('-');
        if (parts.length < 3) return null;
        
        const gridId = parts[0];
        const axis = parts[1];
        const label = parts.slice(2).join('-'); // Handle labels with dashes

        // Find the grid data
        const gridData = this.viewer.structureData.grids.find(g => g.id === gridId);
        if (!gridData) return null;

        // Get the coordinate value
        const labelsKey = `${axis.toLowerCase()}Labels`;
        const lineIndex = gridData[labelsKey].indexOf(label);
        if (lineIndex === -1) return null;

        let value = 0;
        if (axis === 'X' && this.viewer.gridManager.xCoords) {
            value = this.viewer.gridManager.xCoords[lineIndex];
        } else if (axis === 'Y' && this.viewer.gridManager.yCoords) {
            value = this.viewer.gridManager.yCoords[lineIndex];
        } else if (axis === 'Z' && this.viewer.gridManager.zCoords) {
            value = this.viewer.gridManager.zCoords[lineIndex];
        }

        return {
            isGridLine: true,
            gridLineId: gridLineId,
            gridId: gridId,
            axis: axis,
            label: label,
            value: value,
            lineIndex: lineIndex
        };
    }
} 