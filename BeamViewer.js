// Main BeamViewer class that orchestrates all modules
class BeamViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.viewCube = null;
        this.beamObjects = new Map();
        this.structureData = null;
        this.mouse = { x: 0, y: 0 };
        this.eventBus = null;
        
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

        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Line.threshold = 50; // Adjust threshold for line intersection
    }

    async init() {
        this.eventBus = new EventBus();
        const loadingElement = document.getElementById('loading');
        try {
            // Dynamically load required UI components
            await this.loadScript('ui/GridEditPanel.js');

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
            
            // Add global event listeners
            this.setupGlobalEventListeners();
            
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
        const container = document.getElementById('canvas-container');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        // Camera
        const aspect = container.clientWidth / container.clientHeight;
        this.frustumSize = 5000;
        this.camera = new THREE.OrthographicCamera(
            this.frustumSize * aspect / -2, 
            this.frustumSize * aspect / 2,
            this.frustumSize / 2,
            this.frustumSize / -2,
            0.1, 
            500000
        );
        
        // Adjust camera position for a typical isometric view in a Z-up system
        this.camera.position.set(5000, -5000, 5000);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Setup camera controls
        this.controls = new CameraControls(this.camera, this.renderer.domElement);
        
        // Setup ViewCube
        this.viewCube = new ViewCube(this.camera, this.controls, document.getElementById('viewcube-container'));

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        // Adjust light position to be effective in a Z-up world
        directionalLight.position.set(1000, 1000, 2000);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Grid
        // const gridHelper = new THREE.GridHelper(5000, 50, 0x444444, 0x222222);
        // this.scene.add(gridHelper);
        
        // Axes helper
        const axesHelper = new THREE.AxesHelper(500);
        this.scene.add(axesHelper);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Add listeners for all mouse interactions on the canvas
        this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }

    initializeManagers() {
        // Initialize all manager classes
        this.profiles = new ProfileManager(SteelProfiles);
        this.gridManager = new GridManager(this.scene, this.structureData, this.eventBus, this.camera, this.raycaster);
        this.elementManager = new ElementManager(this.scene, this.beamObjects, this.structureData, this, this.gridManager);
        
        // UIManager must be created before managers that need its elements.
        this.uiManager = new UIManager(this, this.eventBus);
        
        this.snapManager = new SnapManager(this.scene, this.elementManager, this.gridManager, this.uiManager.snapTooltip);
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

    onMouseDown(event) {
        if (event.button !== 0) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(mouse, this.camera);

        const snapPoint = this.snapManager.findSnapPoint(this.raycaster, mouse, event);
        const point = snapPoint || this.getPointOnWorkPlane(mouse);

        if (this.creationManager.isActive()) {
            this.eventBus.publish('creation:mouseDown', { event, point });
        } else if (this.copyManager.isCopyModeActive()) {
            this.eventBus.publish('copy:mouseDown', { event, point });
        } else {
            this.eventBus.publish('selection:mouseDown', { event });
        }
    }

    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const snapPoint = this.snapManager.findSnapPoint(this.raycaster, this.mouse, event);
        const point = snapPoint || this.getPointOnWorkPlane(this.mouse);

        // Publish a generic event for general purpose updates (previews, highlights)
        this.eventBus.publish('viewer:mouseMove', { event, point, rawMouse: this.mouse });

        // Also publish a specific event if selection is happening
        if (this.selectionManager.isSelecting) {
            this.eventBus.publish('selection:mouseMove', { event });
        }
    }
    
    onMouseUp(event) {
        if (event.button !== 0) return;
        // Selection is the main thing happening on mouseUp
        this.eventBus.publish('selection:mouseUp', { event });
    }

    handleGridHighlighting() {
        // This method is now obsolete and will be removed.
        // Its logic will be moved to GridManager listening to 'viewer:mouseMove'.
    }

    setupGlobalEventListeners() {
        // Add listener for Escape key to cancel actions
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.eventBus.publish('viewer:escapePressed');
            } else if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectionManager.getSelectedElements().length > 0) {
                // Prevent browser back navigation on Backspace
                event.preventDefault();
                this.eventBus.publish('ui:deleteSelected');
            }
        });
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

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        const aspect = container.clientWidth / container.clientHeight;
        
        this.camera.left   = this.frustumSize * aspect / -2;
        this.camera.right  = this.frustumSize * aspect / 2;
        this.camera.top    = this.frustumSize / 2;
        this.camera.bottom = this.frustumSize / -2;
        
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
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