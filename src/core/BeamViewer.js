// Main BeamViewer class that orchestrates all modules
window.BeamViewer = class BeamViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.viewCube = null;
        this.beamObjects = new Map();
        this.structureData = null;
        this.eventBus = null;
        
        // Core components
        this.threeJSSetup = null;
        this.eventCoordinator = null;
        
        // Module instances
        this.elementManager = null;
        this.selectionManager = null;
        this.uiManager = null;
        this.importExport = null;
        this.copyManager = null;
        this.gridManager = null;
        this.snapManager = null;
        this.creationManager = null;
        this.operationManager = null;
        this.profiles = null;
        this.ifcGenerator = null;
        this.connectionManager = null;
        this.connectionVisualizer = null;

        // Check if THREE.js is loaded
        if (typeof THREE === 'undefined') {
            throw new Error('THREE.js is not loaded. Make sure to include THREE.js before BeamViewer.');
        }

        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Line.threshold = 50; // Adjust threshold for line intersection
    }

    async init() {
        this.eventBus = new EventBus();
        const loadingElement = document.getElementById('loading');
        try {
            // Dynamically load required UI components
            await this.loadScript('src/ui/panels/GridEditPanel.js');

            // Load structure data
            this.loadStructureData();
            
            // Initialize Three.js
            this.initThreeJS();
            
            // Initialize all managers
            this.initializeManagers();
            
            // Create beams and other elements
            this.elementManager.createBeams();

            // NOW initialize operations, as they depend on element meshes
            this.operationManager.init();

            this.updateControlsObjects();
            
            // Setup UI
            this.uiManager.setupUI();
            
            // Fit camera to view all elements
            setTimeout(() => {
                this.fitToView();
            }, 100);
            
            // Start render loop
            this.animate();
            
            // Setup global event listeners
            this.eventCoordinator.setupGlobalEventListeners();
            
            // Adjust canvas for LeftSidebar now that viewer is ready
            if (window.leftSidebar) {
                window.leftSidebar.adjustCanvasArea(true, false);
            }
            
            // Debug: Add document-level event listener to see what's getting clicked
            document.addEventListener('mousedown', (e) => {
                console.log('🔥 Document mousedown:', {
                    target: e.target.tagName,
                    id: e.target.id,
                    className: e.target.className,
                    button: e.button
                });
            });
            
            // Debug: Count canvas elements
            const canvases = document.querySelectorAll('canvas');
            console.log('🔥 Found', canvases.length, 'canvas elements:', Array.from(canvases).map(c => ({id: c.id, width: c.width, height: c.height})));
            
        } catch (error) {
            console.error('Error initializing viewer:', error);
            if(loadingElement) {
                loadingElement.textContent = `Error: ${error.message}`;
                loadingElement.style.color = 'red';
            }
        } finally {
            // ALWAYS hide loading indicator after a short delay
            setTimeout(() => {
                if (loadingElement && !loadingElement.textContent.startsWith('Error')) {
                    loadingElement.style.display = 'none';
                }
            }, 500);
        }
    }

    loadStructureData() {
        // Use the global strukturaData variable
        if (typeof strukturaData !== 'undefined') {
            this.structureData = strukturaData;
        } else {
            throw new Error('strukturaData not found. Make sure struktura.js is loaded.');
        }
    }

    initThreeJS() {
        // Initialize Three.js setup
        this.threeJSSetup = new window.ThreeJSSetup();
        const threeJSComponents = this.threeJSSetup.initThreeJS();
        
        // Assign components to main viewer
        this.scene = threeJSComponents.scene;
        this.camera = threeJSComponents.camera;
        this.renderer = threeJSComponents.renderer;
        this.controls = threeJSComponents.controls;
        this.viewCube = threeJSComponents.viewCube;
        
        // Initialize event coordinator
        this.eventCoordinator = new window.EventCoordinator(this);
    }

    initializeManagers() {
        // Initialize all manager classes
        this.profiles = new ProfileManager(SteelProfiles);
        this.gridManager = new GridManager(this.scene, this.structureData, this.eventBus, this.camera, this.raycaster);
        this.elementManager = new ElementManager(this.scene, this.beamObjects, this.structureData, this, this.gridManager);
        
        // UIManager must be created before managers that need its elements.
        this.uiManager = new UIManager(this, this.eventBus);
        
        this.snapManager = new SnapManager(this.scene, this.elementManager, this.gridManager, this.uiManager.snapTooltip);
        this.connectionManager = new ConnectionManager(this.elementManager, this.eventBus, this.structureData);
        this.connectionVisualizer = new ConnectionVisualizer(this.scene, this.connectionManager);
        
        // Set up cross-references
        this.snapManager.setConnectionManager(this.connectionManager);
        this.elementManager.setConnectionManager(this.connectionManager);
        this.uiManager.connectionPanel.setConnectionManager(this.connectionManager);
        
        this.selectionManager = new SelectionManager(this.scene, this.camera, this.renderer, this.elementManager, this.controls, this.snapManager, this.uiManager.selectionBox, this.eventBus, this.raycaster);

        // Now that selectionManager is created, assign it back to uiManager.
        this.uiManager.setSelectionManager(this.selectionManager);
        
        this.creationManager = new CreationManager(this, this.eventBus);

        this.importExport = new ImportExport(this.structureData, this.elementManager, this.uiManager);
        this.gridManager.createGrids();
        this.operationManager = new OperationManager(this, this.structureData);
        this.copyManager = new CopyManager(
            this.elementManager, 
            this.selectionManager, 
            this.uiManager, 
            this.camera, 
            this.renderer, 
            this.beamObjects,
            this.eventBus
        );

        // Subscribe to grid updates for parametric rebuilding
        if (this.eventBus) {
            this.eventBus.subscribe('grid:updated', (data) => {
                console.log(`Grid ${data.gridId} has been updated. Rebuilding parametric elements...`);
                this.elementManager.rebuildAllFromGrid(data.gridId);
            });
        }

        // The ugly selection change callback is now removed.
        // It will be replaced by an event-driven approach.
    }

    async loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                console.log(`${url} loaded successfully.`);
                resolve();
            };
            script.onerror = () => {
                console.error(`Failed to load script: ${url}`);
                reject(new Error(`Failed to load script: ${url}`));
            };
            document.head.appendChild(script);
        });
    }

    // Mouse event methods are now handled by EventCoordinator
    // These methods are kept for backward compatibility and delegate to EventCoordinator
    onMouseDown(event) {
        return this.eventCoordinator.onMouseDown(event);
    }

    onMouseMove(event) {
        return this.eventCoordinator.onMouseMove(event);
    }
    
    onMouseUp(event) {
        return this.eventCoordinator.onMouseUp(event);
    }

    handleGridHighlighting() {
        // This method is now obsolete and will be removed.
        // Its logic will be moved to GridManager listening to 'viewer:mouseMove'.
    }

    // Global event listeners are now handled by EventCoordinator
    setupGlobalEventListeners() {
        return this.eventCoordinator.setupGlobalEventListeners();
    }

    // Public API methods for UI interaction
    toggleAddMenu() {
        // This method is now obsolete as the add buttons are on the top toolbar.
        // Consider removing it if no longer used from old UI elements.
    }

    addNewElement() {
        const newElement = this.elementManager.factory.addNewBeam(
            new THREE.Vector3(0,0,0),
            new THREE.Vector3(1000,0,0),
            'IPE160', 'S235JR', 0
        );
        this.uiManager.elementListPanel.add(newElement);
        document.getElementById('element-count').textContent = this.elementManager.getAllElements().length;
        this.selectionManager.setSelection([newElement.id]);
        this.updateControlsObjects();
    }

    addNewPlate() {
        const newElement = this.elementManager.factory.addNewPlate();
        this.uiManager.elementListPanel.add(newElement);
        document.getElementById('element-count').textContent = this.elementManager.getAllElements().length;
        this.selectionManager.setSelection([newElement.id]);
        this.updateControlsObjects();
    }

    applyChanges() {
        this.uiManager.editPanel.applyChanges();
    }

    deleteElement() {
        this.uiManager.deleteSelectedElements();
    }

    startCopy() {
        this.copyManager.startCopy();
    }

    exportStructure() {
        this.importExport.exportStructure();
    }

    exportToIFC() {
        console.log("Generating IFC file...");
        
        if (!this.ifcGenerator) {
            // Initialize IFC generator if not already done
            this.ifcGenerator = new IfcGenerator(this.structureData);
        }
        
        try {
            const ifcContent = this.ifcGenerator.generate();

            const blob = new Blob([ifcContent], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'tomcad_export.ifc';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log("IFC file download initiated.");
        } catch (error) {
            console.error('Error generating IFC file:', error);
            alert('Error generating IFC file: ' + error.message);
        }
    }

    importStructure(file) {
        this.importExport.importStructure(file);
        this.updateControlsObjects();
        this.fitToView();
    }

    // Camera control methods
    focusOnElement(elementId) {
        const object = this.elementManager.beamObjects.get(elementId);
        if (object) {
            const box = new THREE.Box3().setFromObject(object);
            this.controls.focus(box);
        }
    }

    fitToView() {
        const sceneBox = new THREE.Box3();

        // Include all model elements
        this.scene.traverse(child => {
            if (child.isMesh) {
                sceneBox.expandByObject(child);
            }
        });
        
        // Include the grid
        const gridBox = this.gridManager.getBoundingBox();

        const totalBox = sceneBox.clone().union(gridBox);

        if (totalBox.isEmpty()) {
            // If scene is empty, focus on a default area
            this.controls.reset();
        } else {
            // Add some padding to the box
            const size = totalBox.getSize(new THREE.Vector3());
            const center = totalBox.getCenter(new THREE.Vector3());
            // Ensure there's a minimum size to avoid issues with single points or lines
            size.max(new THREE.Vector3(100, 100, 100)); 
            
            const newSize = size.multiplyScalar(1.2); // 20% padding
            const paddedBox = new THREE.Box3();
            paddedBox.setFromCenterAndSize(center, newSize);

            this.controls.focus(paddedBox);
        }
    }

    focusOnSelected() {
        const selectedElements = this.selectionManager.getSelectedElements();
        if (selectedElements.length === 0) {
            this.fitToView();
            return;
        }

        const box = new THREE.Box3();
        selectedElements.forEach(id => {
            const mesh = this.beamObjects.get(id);
            if(mesh) box.expandByObject(mesh);
        });

        this.controls.focus(box);
        this.selectionManager.updateSelectionVisuals();
    }

    resetView() {
        this.controls.reset();
        this.fitToView();
    }

    updateControlsObjects() {
        if (this.controls) {
            this.controls.setIntersectableObjects(Array.from(this.beamObjects.values()));
        }
    }

    // Window resize and animation are now handled by ThreeJSSetup
    onWindowResize() {
        return this.threeJSSetup.onWindowResize();
    }

    animate() {
        return this.threeJSSetup.animate();
    }

    getPointOnWorkPlane(mouse) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectionPoint = new THREE.Vector3();
        this.raycaster.setFromCamera(mouse, this.camera);
        if (this.raycaster.ray.intersectPlane(plane, intersectionPoint)) {
            return intersectionPoint;
        }
        return null;
    }
} 