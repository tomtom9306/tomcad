/**
 * Template Panel - UI for selecting and applying project templates
 */
class TemplatePanel {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.selectedTemplate = null;
        this.setupEventListeners();
    }

    /**
     * Create and show the template selection panel
     */
    show() {
        if (this.panel) {
            this.panel.style.display = 'block';
            this.isVisible = true;
            return;
        }

        this.createPanel();
        this.loadTemplates();
        this.isVisible = true;
    }

    /**
     * Hide the template panel
     */
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
            this.isVisible = false;
        }
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Create the template panel UI
     */
    createPanel() {
        // Create main panel container
        this.panel = document.createElement('div');
        this.panel.id = 'template-panel';
        this.panel.className = 'ui-panel template-panel';
        
        this.panel.innerHTML = `
            <div class="panel-header">
                <h3>New Project Templates</h3>
                <button class="close-btn" onclick="templatePanel.hide()">&times;</button>
            </div>
            
            <div class="panel-content">
                <div class="template-filters">
                    <select id="category-filter">
                        <option value="">All Categories</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Residential">Residential</option>
                    </select>
                    
                    <select id="complexity-filter">
                        <option value="">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
                
                <div class="template-grid" id="template-grid">
                    <!-- Templates will be loaded here -->
                </div>
                
                <div class="template-preview" id="template-preview" style="display: none;">
                    <h4>Template Details</h4>
                    <div class="preview-content">
                        <div class="preview-info">
                            <p><strong>Description:</strong> <span id="preview-description"></span></p>
                            <p><strong>Complexity:</strong> <span id="preview-complexity"></span></p>
                            <p><strong>Elements:</strong> <span id="preview-elements"></span></p>
                            <p><strong>Estimated Time:</strong> <span id="preview-time"></span></p>
                        </div>
                        <div class="preview-image">
                            <img id="preview-thumbnail" src="" alt="Template preview" />
                        </div>
                    </div>
                </div>
                
                <div class="project-settings" id="project-settings" style="display: none;">
                    <h4>Project Settings</h4>
                    <div class="form-group">
                        <label for="project-name">Project Name:</label>
                        <input type="text" id="project-name" placeholder="Enter project name" />
                    </div>
                    <div class="form-group">
                        <label for="order-id">Order ID:</label>
                        <input type="text" id="order-id" placeholder="Optional order ID" />
                    </div>
                    <div class="form-group">
                        <label for="phase">Phase:</label>
                        <input type="text" id="phase" value="1" />
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="backup-current" checked />
                            Backup current project
                        </label>
                    </div>
                </div>
                
                <div class="panel-actions">
                    <button id="create-empty" class="btn btn-secondary">Create Empty Project</button>
                    <button id="apply-template" class="btn btn-primary" disabled>Apply Template</button>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(this.panel);

        // Setup event listeners
        this.setupPanelEventListeners();
    }

    /**
     * Setup event listeners for panel interactions
     */
    setupPanelEventListeners() {
        // Filter change handlers
        document.getElementById('category-filter').addEventListener('change', () => {
            this.filterTemplates();
        });

        document.getElementById('complexity-filter').addEventListener('change', () => {
            this.filterTemplates();
        });

        // Button handlers
        document.getElementById('create-empty').addEventListener('click', () => {
            this.createEmptyProject();
        });

        document.getElementById('apply-template').addEventListener('click', () => {
            this.applySelectedTemplate();
        });
    }

    /**
     * Load and display available templates
     */
    loadTemplates() {
        if (!window.templateManager) {
            console.error('TemplatePanel: Template manager not available');
            return;
        }

        const templates = window.templateManager.getAvailableTemplates();
        this.displayTemplates(templates);
    }

    /**
     * Display templates in the grid
     * @param {Array} templates - Templates to display
     */
    displayTemplates(templates) {
        const grid = document.getElementById('template-grid');
        grid.innerHTML = '';

        if (templates.length === 0) {
            grid.innerHTML = '<p class="no-templates">No templates available</p>';
            return;
        }

        templates.forEach(template => {
            const templateCard = this.createTemplateCard(template);
            grid.appendChild(templateCard);
        });
    }

    /**
     * Create a template card element
     * @param {Object} template - Template data
     * @returns {HTMLElement} Template card element
     */
    createTemplateCard(template) {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.templateId = template.id;

        const complexityClass = `complexity-${template.complexity}`;
        
        card.innerHTML = `
            <div class="template-thumbnail">
                <img src="${template.thumbnail || 'assets/template-placeholder.png'}" 
                     alt="${template.name}" 
                     onerror="this.src='assets/template-placeholder.png'" />
            </div>
            <div class="template-info">
                <h5>${template.name}</h5>
                <p class="template-description">${template.description}</p>
                <div class="template-meta">
                    <span class="complexity ${complexityClass}">${template.complexity}</span>
                    <span class="elements">${template.estimatedElements} elements</span>
                    <span class="time">${template.estimatedTime}</span>
                </div>
            </div>
        `;

        // Click handler for template selection
        card.addEventListener('click', () => {
            this.selectTemplate(template);
        });

        return card;
    }

    /**
     * Select a template
     * @param {Object} template - Selected template
     */
    selectTemplate(template) {
        // Update visual selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-template-id="${template.id}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        // Store selection
        this.selectedTemplate = template;

        // Show preview and settings
        this.showTemplatePreview(template);
        this.showProjectSettings();

        // Enable apply button
        document.getElementById('apply-template').disabled = false;
    }

    /**
     * Show template preview
     * @param {Object} template - Template to preview
     */
    showTemplatePreview(template) {
        const preview = document.getElementById('template-preview');
        
        document.getElementById('preview-description').textContent = template.description;
        document.getElementById('preview-complexity').textContent = template.complexity;
        document.getElementById('preview-elements').textContent = template.estimatedElements;
        document.getElementById('preview-time').textContent = template.estimatedTime;
        
        const thumbnail = document.getElementById('preview-thumbnail');
        thumbnail.src = template.thumbnail || 'assets/template-placeholder.png';
        thumbnail.alt = template.name;

        preview.style.display = 'block';
    }

    /**
     * Show project settings section
     */
    showProjectSettings() {
        const settings = document.getElementById('project-settings');
        settings.style.display = 'block';

        // Set default project name
        const projectName = document.getElementById('project-name');
        if (!projectName.value && this.selectedTemplate) {
            projectName.value = `New ${this.selectedTemplate.name}`;
        }
    }

    /**
     * Filter templates based on selected criteria
     */
    filterTemplates() {
        const categoryFilter = document.getElementById('category-filter').value;
        const complexityFilter = document.getElementById('complexity-filter').value;

        let templates = window.templateManager.getAvailableTemplates();

        if (categoryFilter) {
            templates = templates.filter(t => t.category === categoryFilter);
        }

        if (complexityFilter) {
            templates = templates.filter(t => t.complexity === complexityFilter);
        }

        this.displayTemplates(templates);
    }

    /**
     * Apply the selected template
     */
    applySelectedTemplate() {
        if (!this.selectedTemplate || !window.templateManager) {
            return;
        }

        const options = {
            projectName: document.getElementById('project-name').value,
            orderId: document.getElementById('order-id').value,
            phase: document.getElementById('phase').value,
            backup: document.getElementById('backup-current').checked
        };

        const success = window.templateManager.applyTemplate(this.selectedTemplate.id, options);
        
        if (success) {
            this.hide();
            // Refresh the application
            if (window.beamViewer) {
                window.beamViewer.refreshFromData();
            }
        }
    }

    /**
     * Create empty project
     */
    createEmptyProject() {
        if (!window.templateManager) {
            return;
        }

        const options = {
            projectName: document.getElementById('project-name').value || "New Empty Project",
            orderId: document.getElementById('order-id').value,
            phase: document.getElementById('phase').value
        };

        const emptyProject = window.templateManager.createEmptyProject(options);
        window.currentProject = emptyProject;

        // Notify system
        if (window.viewer?.eventBus) {
            window.viewer.eventBus.publish('project:newProject', { projectData: emptyProject });
        }

        this.hide();
        
        // Refresh the application
        if (window.beamViewer) {
            window.beamViewer.refreshFromData();
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
}

// Initialize global template panel
window.templatePanel = new TemplatePanel();