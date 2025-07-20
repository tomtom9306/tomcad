// Connection management UI panel
class ConnectionPanel {
    constructor(viewer) {
        this.viewer = viewer;
        this.elementManager = viewer.elementManager;
        this.connectionManager = viewer.connectionManager;
        this.eventBus = viewer.eventBus;
        this.isVisible = false;
        
        this.panel = this.createPanel();
        this.setupEventListeners();
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'connection-panel';
        panel.className = 'ui-panel';
        panel.style.display = 'none';
        
        panel.innerHTML = `
            <div class="panel-header">
                <h3>🔗 Connections</h3>
                <button class="panel-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            <div class="panel-content">
                <div class="connection-controls">
                    <div class="control-group">
                        <label>Connection Mode:</label>
                        <button id="connection-toggle" class="btn btn-sm">
                            <span class="toggle-text">Disabled</span>
                        </button>
                    </div>
                    <div class="control-group">
                        <label>Show Connections:</label>
                        <button id="connection-visibility" class="btn btn-sm active">
                            <span class="toggle-text">Visible</span>
                        </button>
                    </div>
                </div>
                
                <div class="connection-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Connections:</span>
                        <span id="total-connections">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Active Connections:</span>
                        <span id="active-connections">0</span>
                    </div>
                </div>
                
                <div class="connection-list-container">
                    <div class="section-header">
                        <h4>Connection List</h4>
                        <button id="refresh-connections" class="btn btn-sm">↻</button>
                    </div>
                    <div id="connection-list" class="connection-list">
                        <div class="no-connections">No connections found</div>
                    </div>
                </div>
                
                <div class="connection-filters">
                    <div class="filter-group">
                        <label>Filter by Type:</label>
                        <select id="connection-type-filter">
                            <option value="all">All Types</option>
                            <option value="moment">Moment</option>
                            <option value="pinned">Pinned</option>
                            <option value="surface">Surface</option>
                            <option value="edge">Edge</option>
                            <option value="grid">Grid</option>
                            <option value="rigid">Rigid</option>
                            <option value="bolted">Bolted</option>
                            <option value="welded">Welded</option>
                            <option value="sliding">Sliding</option>
                            <option value="spring">Spring</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Filter by Direction:</label>
                        <select id="connection-direction-filter">
                            <option value="all">All Directions</option>
                            <option value="one_way">One Way</option>
                            <option value="two_way">Two Way</option>
                            <option value="constrained">Constrained</option>
                        </select>
                    </div>
                </div>
                
                <div class="connection-actions">
                    <button id="create-connection" class="btn btn-primary">Create Connection</button>
                    <button id="delete-filtered-connections" class="btn btn-warning">Delete Filtered</button>
                    <button id="delete-all-connections" class="btn btn-danger">Delete All</button>
                </div>
            </div>
        `;
        
        return panel;
    }

    setupEventListeners() {
        // Connection mode toggle
        const connectionToggle = this.panel.querySelector('#connection-toggle');
        connectionToggle.addEventListener('click', () => {
            this.toggleConnectionMode();
        });
        
        // Connection visibility toggle
        const visibilityToggle = this.panel.querySelector('#connection-visibility');
        visibilityToggle.addEventListener('click', () => {
            this.toggleConnectionVisibility();
        });
        
        // Refresh connections
        const refreshBtn = this.panel.querySelector('#refresh-connections');
        refreshBtn.addEventListener('click', () => {
            this.refreshConnectionList();
        });
        
        // Create connection
        const createBtn = this.panel.querySelector('#create-connection');
        createBtn.addEventListener('click', () => {
            this.showCreateConnectionDialog();
        });
        
        // Delete all connections
        const deleteAllBtn = this.panel.querySelector('#delete-all-connections');
        deleteAllBtn.addEventListener('click', () => {
            this.deleteAllConnections();
        });
        
        // Delete filtered connections
        const deleteFilteredBtn = this.panel.querySelector('#delete-filtered-connections');
        deleteFilteredBtn.addEventListener('click', () => {
            this.deleteFilteredConnections();
        });
        
        // Filter event listeners
        const typeFilter = this.panel.querySelector('#connection-type-filter');
        typeFilter.addEventListener('change', () => {
            this.refreshConnectionList();
        });
        
        const directionFilter = this.panel.querySelector('#connection-direction-filter');
        directionFilter.addEventListener('change', () => {
            this.refreshConnectionList();
        });
        
        // Listen for connection events
        if (this.eventBus) {
            this.eventBus.subscribe('connection:created', () => {
                console.log('ConnectionPanel: connection:created event received');
                this.refreshConnectionList();
            });
            
            this.eventBus.subscribe('connection:deleted', () => {
                console.log('ConnectionPanel: connection:deleted event received');
                this.refreshConnectionList();
            });
            
            this.eventBus.subscribe('connection:updated', () => {
                console.log('ConnectionPanel: connection:updated event received');
                this.refreshConnectionList();
            });
        } else {
            console.log('ConnectionPanel: No eventBus available for event subscription');
        }
    }

    show() {
        console.log('ConnectionPanel show() called');
        this.isVisible = true;
        this.panel.style.display = 'block';
        console.log('Panel display set to block');
        this.refreshConnectionList();
        this.updateConnectionModeUI();
        console.log('ConnectionPanel show() completed');
    }

    hide() {
        this.isVisible = false;
        this.panel.style.display = 'none';
    }

    toggle() {
        console.log('ConnectionPanel toggle called, current state:', this.isVisible);
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
        console.log('ConnectionPanel toggle completed, new state:', this.isVisible);
    }
    
    setConnectionManager(connectionManager) {
        this.connectionManager = connectionManager;
        console.log('ConnectionPanel: Connection manager set');
    }

    toggleConnectionMode() {
        if (this.viewer.snapManager) {
            const newMode = !this.viewer.snapManager.isConnectionMode();
            console.log('Toggling connection mode to:', newMode);
            this.viewer.snapManager.setConnectionMode(newMode);
            this.updateConnectionModeUI();
        }
    }

    updateConnectionModeUI() {
        const toggle = this.panel.querySelector('#connection-toggle');
        const text = toggle.querySelector('.toggle-text');
        
        if (this.viewer.snapManager && this.viewer.snapManager.isConnectionMode()) {
            toggle.classList.add('active');
            text.textContent = 'Enabled';
        } else {
            toggle.classList.remove('active');
            text.textContent = 'Disabled';
        }
    }

    toggleConnectionVisibility() {
        if (this.viewer.connectionVisualizer) {
            this.viewer.connectionVisualizer.toggleVisibility();
            this.updateVisibilityUI();
        }
    }

    updateVisibilityUI() {
        const toggle = this.panel.querySelector('#connection-visibility');
        const text = toggle.querySelector('.toggle-text');
        
        if (this.viewer.connectionVisualizer && this.viewer.connectionVisualizer.isVisible) {
            toggle.classList.add('active');
            text.textContent = 'Visible';
        } else {
            toggle.classList.remove('active');
            text.textContent = 'Hidden';
        }
    }

    refreshConnectionList() {
        if (!this.connectionManager) {
            console.log('ConnectionPanel: No connection manager available');
            return;
        }
        
        const allConnections = this.connectionManager.getAllConnections();
        console.log('ConnectionPanel: Found', allConnections.length, 'connections');
        const filteredConnections = this.filterConnections(allConnections);
        const listContainer = this.panel.querySelector('#connection-list');
        
        // Update stats
        this.panel.querySelector('#total-connections').textContent = allConnections.length;
        this.panel.querySelector('#active-connections').textContent = filteredConnections.length;
        
        if (filteredConnections.length === 0) {
            if (allConnections.length === 0) {
                listContainer.innerHTML = '<div class="no-connections">No connections found</div>';
            } else {
                listContainer.innerHTML = '<div class="no-connections">No connections match current filters</div>';
            }
            return;
        }
        
        // Create connection list
        let html = '';
        filteredConnections.forEach(connection => {
            html += this.createConnectionListItem(connection);
        });
        
        listContainer.innerHTML = html;
        
        // Add event listeners to connection items
        listContainer.querySelectorAll('.connection-item').forEach(item => {
            const connectionId = item.dataset.connectionId;
            
            // Edit button
            const editBtn = item.querySelector('.edit-connection');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editConnection(connectionId);
                });
            }
            
            // Delete button
            const deleteBtn = item.querySelector('.delete-connection');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteConnection(connectionId);
                });
            }
            
            // Item click - highlight connection
            item.addEventListener('click', () => {
                this.highlightConnection(connectionId);
            });
        });
    }

    createConnectionListItem(connection) {
        const sourceElement = this.elementManager.getElement(connection.source.elementId);
        const targetElement = this.elementManager.getElement(connection.target.elementId);
        
        const sourceLabel = sourceElement ? `${sourceElement.id} (${connection.source.point})` : 'Unknown';
        const targetLabel = targetElement ? `${targetElement.id} (${connection.target.point})` : 'Unknown';
        
        const typeIcon = this.getConnectionTypeIcon(connection.type);
        const directionalityIcon = this.getDirectionalityIcon(connection.directionality);
        
        return `
            <div class="connection-item" data-connection-id="${connection.id}">
                <div class="connection-header">
                    <div class="connection-title">
                        <span class="connection-icon">${typeIcon}</span>
                        <span class="connection-id">${connection.id}</span>
                        <span class="connection-directionality">${directionalityIcon}</span>
                    </div>
                    <div class="connection-actions">
                        <button class="btn btn-sm edit-connection" title="Edit Connection">✏️</button>
                        <button class="btn btn-sm delete-connection" title="Delete Connection">🗑️</button>
                    </div>
                </div>
                <div class="connection-details">
                    <div class="connection-endpoints">
                        <div class="endpoint source">
                            <strong>Source:</strong> ${sourceLabel}
                        </div>
                        <div class="endpoint target">
                            <strong>Target:</strong> ${targetLabel}
                        </div>
                    </div>
                    <div class="connection-properties">
                        <span class="property-badge type-${connection.type}">${connection.type}</span>
                        <span class="property-badge directionality-${connection.directionality}">${connection.directionality}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getConnectionTypeIcon(type) {
        const icons = {
            'moment': '🔗',
            'pinned': '⚪',
            'surface': '▢',
            'edge': '▬',
            'grid': '⊞',
            'rigid': '🔒',
            'bolted': '🔩',
            'welded': '⚡',
            'sliding': '↔️',
            'spring': '🌀'
        };
        return icons[type] || '🔗';
    }

    getDirectionalityIcon(directionality) {
        const icons = {
            'one_way': '→',
            'two_way': '↔',
            'constrained': '⟷'
        };
        return icons[directionality] || '↔';
    }

    highlightConnection(connectionId) {
        if (this.viewer.connectionVisualizer && this.connectionManager) {
            // Remove previous highlights
            this.connectionManager.getAllConnections().forEach(conn => {
                this.viewer.connectionVisualizer.unhighlightConnection(conn.id);
            });
            
            // Highlight selected connection
            this.viewer.connectionVisualizer.highlightConnection(connectionId);
            
            // Update UI
            this.panel.querySelectorAll('.connection-item').forEach(item => {
                item.classList.remove('highlighted');
            });
            
            const selectedItem = this.panel.querySelector(`[data-connection-id="${connectionId}"]`);
            if (selectedItem) {
                selectedItem.classList.add('highlighted');
            }
        }
    }

    editConnection(connectionId) {
        const connection = this.connectionManager.getConnection(connectionId);
        if (!connection) return;
        
        const types = ['moment', 'pinned', 'surface', 'edge', 'grid', 'rigid', 'bolted', 'welded', 'sliding', 'spring'];
        const typeDescriptions = types.map((type, index) => {
            const typeConfig = this.connectionManager.CONNECTION_TYPES[type];
            return `${index}: ${typeConfig.name} - ${typeConfig.description}`;
        }).join('\n');
        
        const newType = prompt(`Edit connection type for ${connectionId}:\n\n${typeDescriptions}`, 
            this.getConnectionTypeIndex(connection.type));
        
        if (newType !== null) {
            const typeIndex = parseInt(newType);
            
            if (typeIndex >= 0 && typeIndex < types.length) {
                this.connectionManager.updateConnectionType(connectionId, types[typeIndex]);
            }
        }
    }

    getConnectionTypeIndex(type) {
        const types = ['moment', 'pinned', 'surface', 'edge', 'grid', 'rigid', 'bolted', 'welded', 'sliding', 'spring'];
        return types.indexOf(type).toString();
    }

    deleteConnection(connectionId) {
        if (confirm(`Are you sure you want to delete connection ${connectionId}?`)) {
            this.connectionManager.deleteConnection(connectionId);
        }
    }

    deleteAllConnections() {
        const connections = this.connectionManager.getAllConnections();
        if (connections.length === 0) return;
        
        if (confirm(`Are you sure you want to delete all ${connections.length} connections?`)) {
            connections.forEach(connection => {
                this.connectionManager.deleteConnection(connection.id);
            });
        }
    }

    filterConnections(connections) {
        const typeFilter = this.panel.querySelector('#connection-type-filter').value;
        const directionFilter = this.panel.querySelector('#connection-direction-filter').value;
        
        return connections.filter(connection => {
            // Filter by type
            if (typeFilter !== 'all' && connection.type !== typeFilter) {
                return false;
            }
            
            // Filter by direction
            if (directionFilter !== 'all' && connection.directionality !== directionFilter) {
                return false;
            }
            
            return true;
        });
    }
    
    deleteFilteredConnections() {
        if (!this.connectionManager) return;
        
        const allConnections = this.connectionManager.getAllConnections();
        const filteredConnections = this.filterConnections(allConnections);
        
        if (filteredConnections.length === 0) {
            alert('No connections match current filters');
            return;
        }
        
        const typeFilter = this.panel.querySelector('#connection-type-filter').value;
        const directionFilter = this.panel.querySelector('#connection-direction-filter').value;
        
        let filterDescription = 'filtered connections';
        if (typeFilter !== 'all' && directionFilter !== 'all') {
            filterDescription = `${typeFilter} connections with ${directionFilter} directionality`;
        } else if (typeFilter !== 'all') {
            filterDescription = `${typeFilter} connections`;
        } else if (directionFilter !== 'all') {
            filterDescription = `${directionFilter} connections`;
        }
        
        if (confirm(`Are you sure you want to delete ${filteredConnections.length} ${filterDescription}?`)) {
            filteredConnections.forEach(connection => {
                this.connectionManager.deleteConnection(connection.id);
            });
        }
    }

    showCreateConnectionDialog() {
        alert('To create a connection:\n\n1. Enable connection mode\n2. Select an element to see control points\n3. Drag a control point to another element\n4. Release when snapped to create connection');
    }
}