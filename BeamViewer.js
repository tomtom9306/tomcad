// Main BeamViewer class that orchestrates all modules
class BeamViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.beamObjects = new Map();
        this.structureData = null;
        this.mouse = { x: 0, y: 0 };
        
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

        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Line.threshold = 50; // Adjust threshold for line intersection
    }

    async init() {
        const loadingElement = document.getElementById('loading');
        try {
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
        this.camera.position.set(4000, 2000, 4000);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Setup camera controls
        this.controls = new CameraControls(this.camera, this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1000, 1000, 1000);
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
        this.gridManager = new GridManager(this.scene, this.structureData);
        this.elementManager = new ElementManager(this.scene, this.beamObjects, this.structureData, this, this.gridManager);
        this.snapManager = new SnapManager(this.scene, this.elementManager, this.gridManager);
        this.selectionManager = new SelectionManager(this.scene, this.camera, this.renderer, this.elementManager, this.controls, this.snapManager);
        this.uiManager = new UIManager(this.structureData, this.elementManager, this.selectionManager);
        this.creationManager = new CreationManager(this.scene, this.elementManager, this.uiManager, this.snapManager);
        this.importExport = new ImportExport(this.structureData, this.elementManager, this.uiManager);
        this.gridManager.createGrids();
        this.operationManager = new OperationManager(this, this.structureData);
        this.copyManager = new CopyManager(
            this.elementManager, 
            this.selectionManager, 
            this.uiManager, 
            this.camera, 
            this.renderer, 
            this.beamObjects
        );

        // Set up selection change callback
        const originalUpdateVisuals = this.selectionManager.updateSelectionVisuals.bind(this.selectionManager);
        this.selectionManager.updateSelectionVisuals = () => {
            originalUpdateVisuals();
            this.uiManager.onSelectionChanged(this.selectionManager.getSelectedElements());
        };
    }

    onMouseDown(event) {
        // Stop any interaction if it's not a left-click (button 0)
        // The CameraControls will still handle orbit/pan with other buttons.
        if (event.button !== 0) {
            return;
        }

        // Handle creation mode first
        if (this.creationManager.isActive()) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );
            this.raycaster.setFromCamera(mouse, this.camera);

            // Use the snap manager to get a precise point
            const snapPoint = this.snapManager.findSnapPoint(this.raycaster, mouse);
            const clickPoint = snapPoint ? snapPoint : this.getPointOnWorkPlane(mouse);
            
            if (clickPoint) {
                this.creationManager.handleCanvasClick(clickPoint);
            }
            return;
        }

        // Handle copy mode next
        if (this.copyManager.isCopyModeActive()) {
            this.copyManager.handleCopyClick(event);
            return;
        }

        // Delegate to selection manager
        this.selectionManager.onMouseDown(event);
    }

    onMouseMove(event) {
        // Update mouse coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update creation preview
        if (this.creationManager.isActive()) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const snapPoint = this.snapManager.findSnapPoint(this.raycaster, this.mouse);
            const currentPos = snapPoint ? snapPoint : this.getPointOnWorkPlane(this.mouse);
            if(currentPos) {
                 this.creationManager.updatePreview(currentPos);
            }
        }

        // Delegate to selection manager for selection box
        this.selectionManager.onMouseMove(event);

        // Handle grid highlighting
        this.handleGridHighlighting();
    }
    
    onMouseUp(event) {
        // Delegate to selection manager
        this.selectionManager.onMouseUp(event);
    }

    handleGridHighlighting() {
        if (!this.gridManager) return;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const gridLines = this.gridManager.getGridLines();
        const intersects = this.raycaster.intersectObjects(gridLines);

        if (intersects.length > 0) {
            // Find the closest point of intersection
            const closestIntersect = intersects[0];
            const point = closestIntersect.point;

            // Find all lines that are very close to this point
            const highlightedLines = [];
            gridLines.forEach(line => {
                const line3 = new THREE.Line3(
                    new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position, 0),
                    new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position, 1)
                );
                line3.applyMatrix4(this.gridManager.gridContainer.matrixWorld); // To world space

                const closestPointOnLine = new THREE.Vector3();
                line3.closestPointToPoint(point, true, closestPointOnLine);
                
                if (point.distanceTo(closestPointOnLine) < 1) { // Threshold for intersection
                    highlightedLines.push(line);
                }
            });

            if (highlightedLines.length > 0) {
                this.gridManager.highlightLines(highlightedLines);
            } else {
                this.gridManager.unhighlightAllLines();
            }
        } else {
            this.gridManager.unhighlightAllLines();
        }
    }

    setupGlobalEventListeners() {
        // Add listener for Escape key to cancel actions
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (this.creationManager.isActive()) {
                    this.creationManager.cancelCreation();
                } else if (this.copyManager.isCopyModeActive()) {
                    this.copyManager.cancelCopy();
                } else {
                    this.selectionManager.clearSelection();
                }
            } else if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectionManager.getSelectedElements().length > 0) {
                // Prevent browser back navigation on Backspace
                event.preventDefault();
                this.deleteElement();
            }
        });
    }

    // Public API methods for UI interaction
    toggleAddMenu() {
        this.uiManager.toggleAddMenu();
    }

    addNewElement() {
        this.uiManager.addNewElement();
        this.updateControlsObjects();
    }

    addNewPlate() {
        this.uiManager.addNewPlate();
        this.updateControlsObjects();
    }

    applyChanges() {
        this.uiManager.applyChanges();
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

    importStructure(file) {
        this.importExport.importStructure(file);
        this.updateControlsObjects();
        this.fitToView();
    }

    // Camera control methods
    focusOnElement(elementId) {
        const mesh = this.beamObjects.get(elementId);
        if (!mesh) return;
        
        const box = new THREE.Box3().setFromObject(mesh);
        this.controls.focus(box);
    }

    fitToView() {
        if (this.beamObjects.size === 0) {
            if(this.controls) this.controls.reset();
            return;
        }
        
        // Calculate bounding box of all elements
        const box = new THREE.Box3();
        this.beamObjects.forEach(mesh => {
            box.expandByObject(mesh);
        });
        
        this.controls.focus(box);
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