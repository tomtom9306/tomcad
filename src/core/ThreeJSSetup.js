// ThreeJSSetup.js - Handles Three.js scene, camera, renderer, and lighting setup
window.ThreeJSSetup = class ThreeJSSetup {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.viewCube = null;
        this.frustumSize = 5000;
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
        this.viewCube = new window.ViewCube(this.camera, this.controls, document.getElementById('viewcube-container'));

        // Lighting
        this.setupLighting();
        
        // Scene helpers
        this.setupSceneHelpers();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            controls: this.controls,
            viewCube: this.viewCube
        };
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        // Adjust light position to be effective in a Z-up world
        directionalLight.position.set(1000, 1000, 2000);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    setupSceneHelpers() {
        // Grid helper (commented out in original)
        // const gridHelper = new THREE.GridHelper(5000, 50, 0x444444, 0x222222);
        // this.scene.add(gridHelper);
        
        // Axes helper
        const axesHelper = new THREE.AxesHelper(500);
        this.scene.add(axesHelper);
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

    // Getters for accessing the created objects
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    getRenderer() { return this.renderer; }
    getControls() { return this.controls; }
    getViewCube() { return this.viewCube; }
}