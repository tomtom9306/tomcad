/**
 * Left Sidebar Panel System
 * Provides container for parameter panels from other components
 */
class LeftSidebar {
    constructor() {
        this.sidebar = null;
        this.currentOperation = null;
        this.isVisible = true;  // Start visible by default
        this.isCollapsed = false;  // Track collapse state
        this.currentContent = null;  // Current content provider (CreationPanel, EditPanel, etc.)
        this.isEditMode = false;  // Track if currently showing edit panel
        this.dynamicUpdateTimeout = null;  // For debouncing dynamic updates
        this.elementUpdateListener = null;  // For listening to element changes
        this.elementMoveListener = null;  // For listening to element movement
        this.currentElementId = null;  // Currently edited element ID
        
        this.createSidebar();
        this.setupEventListeners();
        this.initializePersistentLayout();
    }

    /**
     * Create the main sidebar structure
     */
    createSidebar() {
        this.sidebar = document.createElement('div');
        this.sidebar.id = 'left-sidebar';
        this.sidebar.className = 'left-sidebar';
        
        this.sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3 id="sidebar-title">Parameters</h3>
                <button class="sidebar-toggle" onclick="leftSidebar.toggleCollapse()" title="Collapse/Expand Sidebar">
                    <span id="toggle-icon">◀</span>
                </button>
            </div>
            
            <div class="sidebar-body" id="sidebar-body">
                <div class="sidebar-content" id="sidebar-content">
                    <div class="welcome-panel">
                        <div class="welcome-icon">⚙️</div>
                        <h4>Select Operation</h4>
                        <p>Choose an operation from the toolbar to see parameters and options here, or select an element to edit it.</p>
                    </div>
                </div>
                
                <div class="sidebar-footer" id="sidebar-footer" style="display: none;">
                    <div class="action-buttons">
                        <button class="btn btn-secondary" onclick="leftSidebar.cancel()">Cancel</button>
                        <button class="btn btn-primary" id="sidebar-action-btn">Apply</button>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(this.sidebar);
    }

    /**
     * Set content for the sidebar
     * @param {string} title - Panel title
     * @param {string} content - HTML content
     * @param {string} actionText - Action button text
     * @param {function} onAction - Action button callback
     */
    setContent(title, content, actionText = 'Apply', onAction = null) {
        document.getElementById('sidebar-title').innerHTML = title;
        document.getElementById('sidebar-content').innerHTML = content;
        
        if (actionText && onAction) {
            document.getElementById('sidebar-footer').style.display = 'block';
            const actionBtn = document.getElementById('sidebar-action-btn');
            actionBtn.textContent = actionText;
            actionBtn.onclick = onAction;
        } else {
            document.getElementById('sidebar-footer').style.display = 'none';
        }

        this.show();
    }

    /**
     * Show content from CreationPanel in sidebar
     * @param {Object} creatorClass - Creator class with UI definition
     */
    showCreationPanel(creatorClass) {
        if (window.viewer?.uiManager?.creationPanel) {
            // Move CreationPanel into sidebar
            const creationPanel = window.viewer.uiManager.creationPanel;
            
            // Ensure profiles are populated
            if (window.viewer?.profiles) {
                creationPanel.populateProfileDropdowns(window.viewer.profiles.getProfileNames());
            }
            
            creationPanel.show(creatorClass);
            
            // Move the panel into sidebar content area
            const sidebarContent = document.getElementById('sidebar-content');
            sidebarContent.innerHTML = '';
            
            // Reset panel styles for sidebar display
            creationPanel.panel.style.position = 'static';
            creationPanel.panel.style.top = 'auto';
            creationPanel.panel.style.right = 'auto';
            creationPanel.panel.style.width = '100%';
            creationPanel.panel.style.background = 'transparent';
            creationPanel.panel.style.border = 'none';
            creationPanel.panel.style.padding = '0';
            creationPanel.panel.style.borderRadius = '0';
            creationPanel.panel.style.backdropFilter = 'none';
            
            // Hide CreationPanel's own buttons since we use sidebar buttons
            const editButtons = creationPanel.panel.querySelector('.edit-buttons');
            if (editButtons) {
                editButtons.style.display = 'none';
            }
            
            sidebarContent.appendChild(creationPanel.panel);
            
            // Update sidebar header and footer
            document.getElementById('sidebar-title').innerHTML = `${creatorClass.meta.name}`;
            document.getElementById('sidebar-footer').style.display = 'block';
            const actionBtn = document.getElementById('sidebar-action-btn');
            actionBtn.textContent = 'Cancel';
            actionBtn.onclick = () => this.cancel();
            
            // Activate creation mode in CreationManager
            if (window.viewer?.creationManager) {
                window.viewer.creationManager.startCreation(creatorClass);
            }
            
            this.show();
        }
    }

    /**
     * Show content from EditPanel in sidebar
     * @param {Object} element - Element to edit
     * @param {Object} uiConfig - UI configuration
     */
    showEditPanel(element, uiConfig = null) {
        if (window.viewer?.uiManager?.editPanel) {
            // Move EditPanel into sidebar
            const editPanel = window.viewer.uiManager.editPanel;
            editPanel.show(element, uiConfig);
            
            // Move the panel into sidebar content area
            const sidebarContent = document.getElementById('sidebar-content');
            sidebarContent.innerHTML = '';
            
            // Reset panel styles for sidebar display
            editPanel.panel.style.position = 'static';
            editPanel.panel.style.top = 'auto';
            editPanel.panel.style.right = 'auto';
            editPanel.panel.style.width = '100%';
            editPanel.panel.style.background = 'transparent';
            editPanel.panel.style.border = 'none';
            editPanel.panel.style.padding = '0';
            editPanel.panel.style.borderRadius = '0';
            editPanel.panel.style.backdropFilter = 'none';
            
            // Hide EditPanel's own buttons since we use sidebar buttons
            const editButtons = editPanel.panel.querySelector('.edit-buttons');
            if (editButtons) {
                editButtons.style.display = 'none';
            }
            
            sidebarContent.appendChild(editPanel.panel);
            
            // Update sidebar header and footer
            document.getElementById('sidebar-title').innerHTML = `✏️ Edit ${element.kind || 'Element'}`;
            
            // Show footer with action buttons for editing
            document.getElementById('sidebar-footer').style.display = 'block';
            this.setupEditActionButtons(editPanel, element);
            
            // Setup dynamic change listeners
            this.setupDynamicChangeListeners(editPanel, element);
            
            // Setup reverse sync listener (element changes -> panel updates)
            this.setupElementChangeListener(editPanel, element);
            
            this.isEditMode = true;
            this.show();
        } else {
            console.warn('❌ LeftSidebar: EditPanel not available');
        }
    }

    /**
     * Show sidebar with specific operation panel
     * @param {string} operationType - Type of operation (add-beam, add-column, etc.)
     */
    showOperation(operationType) {
        this.currentOperation = operationType;

        // Get creator class for this operation
        const creatorType = operationType.replace('add-', ''); // 'add-beam' -> 'beam'
        const CreatorClass = window.viewer?.creationManager?.getCreatorClass(creatorType);
        
        if (CreatorClass) {
            // Show creation panel from the creator
            this.showCreationPanel(CreatorClass);
        } else {
            console.warn(`LeftSidebar: Unknown operation type "${operationType}"`);
            this.showWelcomePanel();
        }
    }

    /**
     * Toggle collapse/expand state
     */
    toggleCollapse() {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    /**
     * Collapse sidebar to minimal width
     */
    collapse() {
        this.sidebar.classList.add('collapsed');
        this.isCollapsed = true;
        
        // Add global class for other elements to respond
        document.body.classList.add('sidebar-collapsed');
        
        // Update toggle icon
        document.getElementById('toggle-icon').textContent = '▶';
        
        // Adjust canvas area
        this.adjustCanvasArea(true, true); // true for visible, true for collapsed
        
        // Notify system
        if (window.viewer?.eventBus) {
            window.viewer.eventBus.publish('sidebar:collapsed', {});
        }
        
    }

    /**
     * Expand sidebar to full width
     */
    expand() {
        this.sidebar.classList.remove('collapsed');
        this.isCollapsed = false;
        
        // Remove global class
        document.body.classList.remove('sidebar-collapsed');
        
        // Update toggle icon
        document.getElementById('toggle-icon').textContent = '◀';
        
        // Adjust canvas area
        this.adjustCanvasArea(true, false); // true for visible, false for collapsed
        
        // Notify system
        if (window.viewer?.eventBus) {
            window.viewer.eventBus.publish('sidebar:expanded', {});
        }
        
    }

    /**
     * Show sidebar (legacy method for compatibility)
     */
    show() {
        if (!this.isVisible) {
            this.sidebar.classList.add('visible');
            this.isVisible = true;
            this.adjustCanvasArea(true, this.isCollapsed);
        }
        
        if (this.isCollapsed) {
            this.expand();
        }
    }

    /**
     * Hide sidebar (legacy method - now just collapses)
     */
    hide() {
        this.collapse();
    }

    /**
     * Cancel current operation
     */
    cancel() {
        // Cancel any active creation
        if (window.viewer?.creationManager) {
            window.viewer.creationManager.cancelCreation();
        }

        // Show welcome panel
        this.showWelcomePanel();
        
        if (window.viewer?.eventBus) {
            window.viewer.eventBus.publish('sidebar:operationCancelled', { 
                operation: this.currentOperation 
            });
        }
    }

    /**
     * Show the default welcome panel
     */
    showWelcomePanel() {
        // Clear any pending dynamic updates
        if (this.dynamicUpdateTimeout) {
            clearTimeout(this.dynamicUpdateTimeout);
            this.dynamicUpdateTimeout = null;
        }
        
        // Clear element update listeners
        if (this.elementUpdateListener && window.viewer?.eventBus) {
            window.viewer.eventBus.unsubscribe('element:updated', this.elementUpdateListener);
            this.elementUpdateListener = null;
        }
        if (this.elementMoveListener && window.viewer?.eventBus) {
            window.viewer.eventBus.unsubscribe('element:moved', this.elementMoveListener);
            this.elementMoveListener = null;
        }
        this.currentElementId = null;
        
        // Restore panels to their original locations if they were moved
        this.restorePanelsToOriginalLocations();
        
        document.getElementById('sidebar-title').textContent = 'Parameters';
        document.getElementById('sidebar-content').innerHTML = `
            <div class="welcome-panel">
                <div class="welcome-icon">⚙️</div>
                <h4>Select Operation</h4>
                <p>Choose an operation from the toolbar to see parameters and options here, or select an element to edit it.</p>
            </div>
        `;
        document.getElementById('sidebar-footer').style.display = 'none';
        
        this.currentOperation = null;
        this.currentContent = null;
        this.isEditMode = false;
    }

    /**
     * Restore panels to their original locations in the DOM
     */
    restorePanelsToOriginalLocations() {
        const rightColumn = document.querySelector('.right-column');
        if (!rightColumn) return;

        // Restore EditPanel
        const editPanel = window.viewer?.uiManager?.editPanel?.panel;
        if (editPanel && !rightColumn.contains(editPanel)) {
            // Restore original styles
            editPanel.style.position = 'absolute';
            editPanel.style.top = '70px';
            editPanel.style.right = '340px';
            editPanel.style.width = '320px';
            editPanel.style.background = 'rgba(0, 0, 0, 0.9)';
            editPanel.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            editPanel.style.padding = '20px';
            editPanel.style.borderRadius = '10px';
            editPanel.style.backdropFilter = 'blur(10px)';
            editPanel.style.display = 'none'; // Hide it
            
            // Restore EditPanel's buttons
            const editButtons = editPanel.querySelector('.edit-buttons');
            if (editButtons) {
                editButtons.style.display = 'block';
            }
            
            rightColumn.appendChild(editPanel);
        }

        // Restore CreationPanel
        const creationPanel = window.viewer?.uiManager?.creationPanel?.panel;
        if (creationPanel && !rightColumn.contains(creationPanel)) {
            // Restore original styles
            creationPanel.style.position = 'absolute';
            creationPanel.style.top = '70px';
            creationPanel.style.right = '340px';
            creationPanel.style.width = '320px';
            creationPanel.style.background = 'rgba(0, 0, 0, 0.9)';
            creationPanel.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            creationPanel.style.padding = '20px';
            creationPanel.style.borderRadius = '10px';
            creationPanel.style.backdropFilter = 'blur(10px)';
            creationPanel.style.display = 'none'; // Hide it
            
            // Restore CreationPanel's buttons
            const editButtons = creationPanel.querySelector('.edit-buttons');
            if (editButtons) {
                editButtons.style.display = 'block';
            }
            
            rightColumn.appendChild(creationPanel);
        }
    }

    /**
     * Adjust canvas area based on sidebar state
     * @param {boolean} sidebarVisible - Whether sidebar is visible
     * @param {boolean} isCollapsed - Whether sidebar is collapsed
     */
    adjustCanvasArea(sidebarVisible, isCollapsed = false) {
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) return;

        let leftMargin = '0';
        let canvasWidth = '100vw';

        if (sidebarVisible) {
            if (isCollapsed) {
                leftMargin = '60px';  // Collapsed width
                canvasWidth = 'calc(100vw - 60px)';
            } else {
                leftMargin = '320px';  // Full width
                canvasWidth = 'calc(100vw - 320px)';
            }
        }

        canvasContainer.style.marginLeft = leftMargin;
        canvasContainer.style.width = canvasWidth;

        // Trigger canvas resize
        if (window.viewer?.renderer) {
            const canvas = window.viewer.renderer.domElement;
            const rect = canvasContainer.getBoundingClientRect();
            window.viewer.renderer.setSize(rect.width, rect.height);
            window.viewer.camera.aspect = rect.width / rect.height;
            window.viewer.camera.updateProjectionMatrix();
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Listen for ESC key to hide sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Listen for window resize to adjust canvas
        window.addEventListener('resize', () => {
            if (this.isVisible) {
                this.adjustCanvasArea(true);
            }
        });
    }

    /**
     * Update status message for current operation
     * @param {string} message - Status message to display
     */
    updateStatus(message) {
        const statusElement = document.querySelector('.creation-status .status-text');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    /**
     * Initialize persistent layout
     */
    initializePersistentLayout() {
        // Make sidebar visible by default
        this.sidebar.classList.add('visible');
        
        // Canvas area will be adjusted later when viewer is ready
    }


    /**
     * Setup action buttons in sidebar footer for editing
     * @param {Object} editPanel - EditPanel instance
     * @param {Object} element - Element being edited
     */
    setupEditActionButtons(editPanel, element) {
        const footer = document.getElementById('sidebar-footer');
        footer.innerHTML = `
            <div class="action-buttons">
                <button class="btn btn-copy" id="sidebar-copy-btn">📋 Copy</button>
                <button class="btn btn-danger" id="sidebar-delete-btn">🗑️ Delete</button>
            </div>
        `;
        
        // Setup button event listeners
        document.getElementById('sidebar-copy-btn').onclick = () => {
            if (editPanel.dom && editPanel.dom['btn-copy']) {
                editPanel.dom['btn-copy'].click(); // Reuse EditPanel's copy functionality
            }
        };
        
        document.getElementById('sidebar-delete-btn').onclick = () => {
            if (editPanel.dom && editPanel.dom['btn-delete']) {
                editPanel.dom['btn-delete'].click(); // Reuse EditPanel's delete functionality
            }
        };
    }

    /**
     * Setup dynamic change listeners for EditPanel inputs
     * @param {Object} editPanel - EditPanel instance
     * @param {Object} element - Element being edited
     */
    setupDynamicChangeListeners(editPanel, element) {
        const panel = editPanel.panel;
        
        // Find all input fields in the panel
        const inputs = panel.querySelectorAll('input[type="number"], select');
        
        inputs.forEach(input => {
            // Add event listeners for real-time updates
            input.addEventListener('input', () => {
                this.applyDynamicChanges(editPanel, element);
            });
            input.addEventListener('change', () => {
                this.applyDynamicChanges(editPanel, element);
            });
        });
    }

    /**
     * Apply changes dynamically without Apply button
     * @param {Object} editPanel - EditPanel instance
     * @param {Object} element - Element being edited
     */
    applyDynamicChanges(editPanel, element) {
        // Use a small delay to avoid excessive updates while typing
        if (this.dynamicUpdateTimeout) {
            clearTimeout(this.dynamicUpdateTimeout);
        }
        
        this.dynamicUpdateTimeout = setTimeout(() => {
            editPanel.applyChanges();
        }, 300); // 300ms delay
    }

    /**
     * Setup listener for element changes (e.g., from control point dragging)
     * @param {Object} editPanel - EditPanel instance
     * @param {Object} element - Element being edited
     */
    setupElementChangeListener(editPanel, element) {
        // Store reference to current element for cleanup
        this.currentElementId = element.id;
        
        // Listen for element update events
        if (window.viewer?.eventBus) {
            this.elementUpdateListener = (data) => {
                if (data.elementId === element.id && this.isEditMode) {
                    this.updatePanelFromElement(editPanel, data.elementId);
                }
            };
            
            this.elementMoveListener = (data) => {
                if (data.elementId === element.id && this.isEditMode) {
                    this.updatePanelFromElement(editPanel, data.elementId);
                }
            };
            
            window.viewer.eventBus.subscribe('element:updated', this.elementUpdateListener);
            window.viewer.eventBus.subscribe('element:moved', this.elementMoveListener);
        }
    }

    /**
     * Update panel fields from current element data
     * @param {Object} editPanel - EditPanel instance
     * @param {string} elementId - Element ID
     */
    updatePanelFromElement(editPanel, elementId) {
        const element = window.viewer?.elementManager?.getElement(elementId);
        if (!element || !editPanel.panel) return;
        
        // Update position fields if they exist
        const panel = editPanel.panel;
        
        if (element.kind === 'beam') {
            // Update start position
            const startXInput = panel.querySelector('#edit-start-x');
            const startYInput = panel.querySelector('#edit-start-y');
            const startZInput = panel.querySelector('#edit-start-z');
            
            if (startXInput && element.start) {
                startXInput.value = element.start[0];
                startYInput.value = element.start[1];
                startZInput.value = element.start[2];
            }
            
            // Update end position
            const endXInput = panel.querySelector('#edit-end-x');
            const endYInput = panel.querySelector('#edit-end-y');
            const endZInput = panel.querySelector('#edit-end-z');
            
            if (endXInput && element.end) {
                endXInput.value = element.end[0];
                endYInput.value = element.end[1];
                endZInput.value = element.end[2];
            }
            
            // Update other properties if changed
            const profileInput = panel.querySelector('#edit-profile');
            if (profileInput && element.profile) {
                profileInput.value = element.profile;
            }
            
            const materialInput = panel.querySelector('#edit-material');
            if (materialInput && element.material) {
                materialInput.value = element.material;
            }
            
            const orientationInput = panel.querySelector('#edit-orientation');
            if (orientationInput && element.orientation !== undefined) {
                orientationInput.value = element.orientation || 0;
            }
        }
    }
}

// Initialize global left sidebar
window.leftSidebar = new LeftSidebar();