window.ViewCube = class ViewCube {
    constructor(mainCamera, mainControls, container) {
        this.mainCamera = mainCamera;
        this.mainControls = mainControls;
        this.container = container;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.isAnimating = false;
        this.pivot = new THREE.Object3D();

        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.add(this.pivot);

        // Camera
        this.camera = new THREE.PerspectiveCamera(50, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
        this.camera.position.z = 3;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // Initialize components
        this.visuals = new window.ViewCubeVisuals(this.pivot, this.scene);
        this.animator = new window.ViewCubeAnimator(
            this.mainCamera, 
            this.mainControls,
            () => this.isAnimating = true,
            () => this.isAnimating = false
        );
        this.interaction = new window.ViewCubeInteraction(
            this.mainCamera, 
            this.mainControls, 
            this.renderer, 
            this.raycaster, 
            this.mouse
        );

        // Set up cross-references
        this.interaction.setComponents(this.camera, this.visuals, this.animator);

        // Create visual elements
        this.visuals.createCube();
        this.visuals.createAxes();
        this.visuals.createRollArrows();
        this.visuals.createHighlightMesh();

        // Set up event listeners
        this.interaction.setupEventListeners();

        // Start update loop
        this.update();
    }


    update() {
        // Keep the loop going
        requestAnimationFrame(() => this.update());

        TWEEN.update();

        // Update interaction system with current animation state
        this.interaction.setAnimatingState(this.animator.getIsAnimating());

        if (this.mainControls) {
            // The view cube's pivot reflects the inverse of the main camera's orientation
            const mainCameraQuaternion = this.mainControls.cameraOrientation;
            this.pivot.quaternion.copy(mainCameraQuaternion.clone().invert());
        }

        // Sprites like labels should always face the camera regardless of pivot rotation
        this.pivot.children.forEach(child => {
            if (child.isSprite) {
                child.quaternion.copy(this.camera.quaternion);
            }
        });
        
        this.renderer.render(this.scene, this.camera);
    }
}
