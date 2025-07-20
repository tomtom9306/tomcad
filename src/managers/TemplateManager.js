/**
 * Template Manager - Handles project templates and template operations
 * Provides functionality to load, apply, and manage project templates
 */
class TemplateManager {
    constructor() {
        this.availableTemplates = new Map();
        this.currentTemplate = null;
        this.loadTemplates();
    }

    /**
     * Load all available templates
     */
    loadTemplates() {
        // Register built-in templates
        if (window.warehouseWithStairsTemplate) {
            this.registerTemplate(window.warehouseWithStairsTemplate);
        }
        
        if (window.simplePortalFrameTemplate) {
            this.registerTemplate(window.simplePortalFrameTemplate);
        }

        console.log(`TemplateManager: Loaded ${this.availableTemplates.size} templates`);
    }

    /**
     * Register a new template
     * @param {Object} template - Template object with meta and data
     */
    registerTemplate(template) {
        if (!template.meta || !template.meta.templateId) {
            console.error('TemplateManager: Invalid template - missing meta.templateId');
            return false;
        }

        this.availableTemplates.set(template.meta.templateId, template);
        console.log(`TemplateManager: Registered template "${template.meta.templateName}"`);
        return true;
    }

    /**
     * Get all available templates
     * @returns {Array} Array of template metadata
     */
    getAvailableTemplates() {
        return Array.from(this.availableTemplates.values()).map(template => ({
            id: template.meta.templateId,
            name: template.meta.templateName,
            description: template.meta.description,
            category: template.meta.category,
            complexity: template.meta.complexity,
            estimatedElements: template.meta.estimatedElements,
            estimatedTime: template.meta.estimatedTime,
            thumbnail: template.meta.thumbnail
        }));
    }

    /**
     * Get template by ID
     * @param {string} templateId - Template identifier
     * @returns {Object|null} Template object or null if not found
     */
    getTemplate(templateId) {
        return this.availableTemplates.get(templateId) || null;
    }

    /**
     * Apply template to current project
     * @param {string} templateId - Template to apply
     * @param {Object} options - Application options
     * @returns {boolean} Success status
     */
    applyTemplate(templateId, options = {}) {
        const template = this.getTemplate(templateId);
        if (!template) {
            console.error(`TemplateManager: Template "${templateId}" not found`);
            return false;
        }

        try {
            // Backup current project if requested
            if (options.backup && window.currentProject) {
                this.backupCurrentProject();
            }

            // Create new project from template
            const newProject = this.createProjectFromTemplate(template, options);
            
            // Replace current project
            window.currentProject = newProject;
            
            // Update meta information
            this.updateProjectMeta(newProject, options);
            
            // Notify system of project change
            EventBus.publish('project:templateApplied', {
                templateId: templateId,
                templateName: template.meta.templateName,
                projectData: newProject
            });

            this.currentTemplate = templateId;
            console.log(`TemplateManager: Applied template "${template.meta.templateName}"`);
            return true;

        } catch (error) {
            console.error('TemplateManager: Error applying template:', error);
            return false;
        }
    }

    /**
     * Create project data from template
     * @param {Object} template - Source template
     * @param {Object} options - Creation options
     * @returns {Object} New project data
     */
    createProjectFromTemplate(template, options = {}) {
        const projectData = JSON.parse(JSON.stringify(template)); // Deep clone
        
        // Update meta information for new project
        projectData.meta = {
            ...projectData.meta,
            projectId: this.generateProjectId(),
            name: options.projectName || `New Project (${template.meta.templateName})`,
            createdUtc: new Date().toISOString(),
            templateSource: template.meta.templateId,
            templateVersion: template.meta.schemaVersion
        };

        // Remove template-specific fields
        delete projectData.meta.templateId;
        delete projectData.meta.templateName;
        delete projectData.meta.description;
        delete projectData.meta.category;
        delete projectData.meta.complexity;
        delete projectData.meta.estimatedElements;
        delete projectData.meta.estimatedTime;
        delete projectData.meta.thumbnail;

        return projectData;
    }

    /**
     * Update project metadata
     * @param {Object} project - Project to update
     * @param {Object} options - Update options
     */
    updateProjectMeta(project, options) {
        if (options.projectName) {
            project.meta.name = options.projectName;
        }
        
        if (options.orderId) {
            project.meta.orderId = options.orderId;
        }
        
        if (options.phase) {
            project.meta.phase = options.phase;
        }

        // Update modification timestamp
        project.meta.modifiedUtc = new Date().toISOString();
    }

    /**
     * Backup current project
     */
    backupCurrentProject() {
        if (window.currentProject) {
            const backup = {
                timestamp: new Date().toISOString(),
                data: JSON.parse(JSON.stringify(window.currentProject))
            };
            
            // Store in localStorage for recovery
            localStorage.setItem('tomcad_project_backup', JSON.stringify(backup));
            console.log('TemplateManager: Current project backed up');
        }
    }

    /**
     * Generate unique project ID
     * @returns {string} UUID v4
     */
    generateProjectId() {
        return 'proj-' + crypto.randomUUID();
    }

    /**
     * Get templates by category
     * @param {string} category - Template category
     * @returns {Array} Filtered templates
     */
    getTemplatesByCategory(category) {
        return this.getAvailableTemplates().filter(template => 
            template.category === category
        );
    }

    /**
     * Get templates by complexity
     * @param {string} complexity - Template complexity (beginner, intermediate, advanced)
     * @returns {Array} Filtered templates
     */
    getTemplatesByComplexity(complexity) {
        return this.getAvailableTemplates().filter(template => 
            template.complexity === complexity
        );
    }

    /**
     * Create empty project
     * @param {Object} options - Project options
     * @returns {Object} Empty project structure
     */
    createEmptyProject(options = {}) {
        const emptyProject = {
            meta: {
                projectId: this.generateProjectId(),
                name: options.projectName || "New Project",
                createdUtc: new Date().toISOString(),
                units: "mm",
                angleUnits: "degrees",
                schemaVersion: "2.2",
                orderId: options.orderId || "",
                phase: options.phase || "1"
            },
            operations: [],
            elements: [],
            grids: [],
            views: []
        };

        return emptyProject;
    }
}

// Initialize global template manager
window.templateManager = new TemplateManager();