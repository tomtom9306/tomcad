window.ViewCubeInteraction = class ViewCubeInteraction {
    constructor(mainCamera, mainControls, renderer, raycaster, mouse) {
        this.mainCamera = mainCamera;
        this.mainControls = mainControls;
        this.renderer = renderer;
        this.raycaster = raycaster;
        this.mouse = mouse;
        this.camera = null;
        this.visuals = null;
        this.animator = null;
        
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.isAnimating = false;
        
        // Bind methods
        this.onClick = this.onClick.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
    }

    setComponents(camera, visuals, animator) {
        this.camera = camera;
        this.visuals = visuals;
        this.animator = animator;
    }

    setAnimatingState(isAnimating) {
        this.isAnimating = isAnimating;
    }

    setupEventListeners() {
        this.renderer.domElement.addEventListener('click', this.onClick, false);
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove, false);
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown, false);
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp, false);
        this.renderer.domElement.addEventListener('mouseleave', this.onMouseLeave);
    }

    onMouseDown(event) {
        if (this.isAnimating) return;
        
        const objectsToTest = [this.visuals.getCube(), ...this.visuals.getAxes(), ...Object.values(this.visuals.getRollArrows())];
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(objectsToTest);
        
        if (intersects.length > 0) {
            const intersectedObj = intersects[0].object;
            if (intersectedObj === this.visuals.getCube()) {
                this.isDragging = true;
                this.mainControls.enabled = false;
                this.previousMousePosition = {
                    x: event.clientX,
                    y: event.clientY
                };
            }
        }
    }

    onMouseUp(event) {
        this.isDragging = false;
        this.mainControls.enabled = true;
    }

    onMouseLeave(event) {
        this.visuals.getHighlightMesh().visible = false;
        if (this.isDragging) {
            this.isDragging = false;
            this.mainControls.enabled = true;
        }
    }

    onMouseMove(event) {
        if (!this.mainControls || !this.mainControls.cameraTarget) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.isDragging) {
            this.handleDragging(event);
            return; // Don't do highlighting while dragging
        }

        this.handleHovering();
    }

    handleDragging(event) {
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;

        const rotationSpeed = 0.005;

        // Use the main camera's up vector as the world 'up' for rotation
        const up = this.mainCamera.up.clone(); 
        const right = new THREE.Vector3().setFromMatrixColumn(this.mainCamera.matrix, 0);

        const rotX = new THREE.Quaternion().setFromAxisAngle(up, -deltaX * rotationSpeed);
        const rotY = new THREE.Quaternion().setFromAxisAngle(right, -deltaY * rotationSpeed);

        const rotation = rotX.multiply(rotY);

        const offset = this.mainControls.cameraPosition.clone().sub(this.mainControls.cameraTarget);
        offset.applyQuaternion(rotation);
        this.mainControls.cameraPosition.copy(this.mainControls.cameraTarget).add(offset);

        this.mainControls.cameraOrientation.premultiply(rotation);
        
        this.mainControls.updateCameraPosition();

        this.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }

    handleHovering() {
        if (this.isAnimating) {
            this.visuals.getHighlightMesh().visible = false;
            return;
        }

        const objectsToTest = [this.visuals.getCube(), ...this.visuals.getAxes(), ...Object.values(this.visuals.getRollArrows())];
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(objectsToTest, false);

        // Reset highlights
        this.visuals.getHighlightMesh().visible = false;
        [...this.visuals.getAxes()].forEach(obj => obj.scale.set(1, 1, 1));
        Object.values(this.visuals.getRollArrows()).forEach(sprite => {
            sprite.material.opacity = 0.8;
            sprite.scale.set(0.5, 0.5, 1);
        });

        if (intersects.length > 0) {
            const intersection = intersects[0];
            const intersectedObj = intersection.object;

            if (intersectedObj === this.visuals.getCube()) {
                const hoverInfo = this.getHoverInfo(intersection.point, intersection.face.normal);
                const highlightMesh = this.visuals.getHighlightMesh();
                highlightMesh.position.copy(hoverInfo.position);
                highlightMesh.quaternion.copy(hoverInfo.quaternion);
                highlightMesh.scale.copy(hoverInfo.scale);
                highlightMesh.visible = true;
            } else if (intersectedObj.userData.type === 'axis') {
                intersectedObj.scale.set(1.2, 1.2, 1.2);
            } else if (intersectedObj.userData.type === 'roll-arrow') {
                intersectedObj.material.opacity = 1.0;
                intersectedObj.scale.set(0.55, 0.55, 1);
            }
        }
    }

    onClick(event) {
        if (this.isAnimating || !this.mainControls || !this.mainControls.cameraTarget) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const objectsToTest = [this.visuals.getCube(), ...this.visuals.getAxes(), ...Object.values(this.visuals.getRollArrows())];
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(objectsToTest, false);

        if (intersects.length > 0) {
            this.visuals.getHighlightMesh().visible = false;
            
            const intersection = intersects[0];
            const intersectedObj = intersection.object;

            if (intersectedObj.userData.type === 'axis') {
                const direction = intersectedObj.userData.direction.clone();
                this.animator.animateCameraTo(direction);
            } else if (intersectedObj.userData.type === 'roll-arrow') {
                this.animator.rollView(intersectedObj.userData.direction);
            } else if (intersectedObj === this.visuals.getCube()) {
                const targetNormal = this.getTargetNormal(intersection.point, intersection.face.normal);
                this.animator.animateCameraTo(targetNormal);
            }
        }
    }

    getHoverInfo(point, faceNormal) {
        const threshold = 0.35; 
        const onEdgeX = Math.abs(point.x) > 0.5 - threshold;
        const onEdgeY = Math.abs(point.y) > 0.5 - threshold;
        const onEdgeZ = Math.abs(point.z) > 0.5 - threshold;

        const edgeThickness = 0.1;
        const faceThickness = 0.05;
        const cornerSize = 0.2;
        const edgeLength = 1.05;

        const transform = {
            position: new THREE.Vector3(),
            quaternion: new THREE.Quaternion(),
            scale: new THREE.Vector3(1, 1, 1)
        };

        if (onEdgeX && onEdgeY && onEdgeZ) { // Corner
            transform.position.set(
                Math.sign(point.x) * 0.5, 
                Math.sign(point.y) * 0.5, 
                Math.sign(point.z) * 0.5
            );
            transform.scale.set(cornerSize, cornerSize, cornerSize);
        } else if (onEdgeX && onEdgeY) { // Edge parallel to Z-axis
            transform.position.set(Math.sign(point.x) * 0.5, Math.sign(point.y) * 0.5, 0);
            transform.scale.set(edgeThickness, edgeThickness, edgeLength);
        } else if (onEdgeX && onEdgeZ) { // Edge parallel to Y-axis
            transform.position.set(Math.sign(point.x) * 0.5, 0, Math.sign(point.z) * 0.5);
            transform.scale.set(edgeThickness, edgeLength, edgeThickness);
        } else if (onEdgeY && onEdgeZ) { // Edge parallel to X-axis
            transform.position.set(0, Math.sign(point.y) * 0.5, Math.sign(point.z) * 0.5);
            transform.scale.set(edgeLength, edgeThickness, edgeThickness);
        } else { // Face
            transform.position.copy(faceNormal).multiplyScalar(0.5);
            transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), faceNormal);
            transform.scale.set(1, 1, faceThickness);
        }

        return transform;
    }

    getTargetNormal(point, faceNormal) {
        const threshold = 0.35; // How close to an edge to be considered an edge/corner
        const onEdgeX = Math.abs(point.x) > 0.5 - threshold;
        const onEdgeY = Math.abs(point.y) > 0.5 - threshold;
        const onEdgeZ = Math.abs(point.z) > 0.5 - threshold;

        const normal = new THREE.Vector3();

        // Check for corners
        if (onEdgeX && onEdgeY && onEdgeZ) {
            normal.set(Math.sign(point.x), Math.sign(point.y), Math.sign(point.z));
        }
        // Check for edges
        else if (onEdgeX && onEdgeY) {
            normal.set(Math.sign(point.x), Math.sign(point.y), 0);
        } else if (onEdgeX && onEdgeZ) {
            normal.set(Math.sign(point.x), 0, Math.sign(point.z));
        } else if (onEdgeY && onEdgeZ) {
            normal.set(0, Math.sign(point.y), Math.sign(point.z));
        }
        // Must be a face
        else {
            normal.copy(faceNormal);
        }
        
        return normal.normalize();
    }
}