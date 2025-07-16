class ViewCube {
    constructor(mainCamera, mainControls, container) {
        this.mainCamera = mainCamera;
        this.mainControls = mainControls;
        this.container = container;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.isAnimating = false;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.axes = [];
        this.rollArrows = {};
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

        // Cube
        this.createCube();
        this.createAxes();
        this.createRollArrows();
        this.createHighlightMesh();

        // Event Listeners
        this.renderer.domElement.addEventListener('click', this.onClick.bind(this), false);
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        this.renderer.domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this));


        // Start update loop
        this.update();
    }

    createCube() {
        const createFaceMaterial = (text) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const context = canvas.getContext('2d');
            
            context.fillStyle = 'rgba(200, 200, 200, 0.7)';
            context.fillRect(0, 0, 128, 128);
            
            context.strokeStyle = 'rgba(0, 0, 0, 1)';
            context.lineWidth = 5;
            context.strokeRect(0, 0, 128, 128);

            context.fillStyle = 'rgba(0, 0, 0, 1)';
            context.font = 'bold 24px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, 64, 64);

            return new THREE.CanvasTexture(canvas);
        };

        const materials = [
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('RIGHT') }), // +X
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('LEFT') }),  // -X
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('TOP') }),   // +Y
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('BOTTOM') }),// -Y
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('FRONT') }), // +Z
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('BACK') })   // -Z
        ];

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        this.cube = new THREE.Mesh(geometry, materials);
        this.pivot.add(this.cube);
    }

    createAxes() {
        const axisLength = 1.0;
        const headLength = 0.2;
        const headWidth = 0.1;
        const directions = [
            { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000, label: 'X' },
            { dir: new THREE.Vector3(0, 1, 0), color: 0x00ff00, label: 'Y' },
            { dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff, label: 'Z' }
        ];

        directions.forEach(({ dir, color, label }) => {
            const lineMat = new THREE.LineBasicMaterial({ color: color });
            const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(axisLength)]);
            const line = new THREE.Line(lineGeom, lineMat);
            line.renderOrder = 1; 
            this.pivot.add(line);

            const coneGeom = new THREE.ConeGeometry(headWidth, headLength, 8);
            const coneMat = new THREE.MeshBasicMaterial({ color: color });
            const cone = new THREE.Mesh(coneGeom, coneMat);
            cone.position.copy(dir).multiplyScalar(axisLength);
            cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            
            cone.userData = { type: 'axis', direction: dir.clone() };
            this.axes.push(cone);
            this.pivot.add(cone);

            const labelSprite = this.createLabelSprite(label, `rgb(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255})`);
            labelSprite.position.copy(dir).multiplyScalar(axisLength + 0.4);
            this.pivot.add(labelSprite);
        });
    }

    createRollArrows() {
        const arrowTexture = this.createArrowTexture();
    
        const baseMaterialSettings = { 
            map: arrowTexture, 
            transparent: true, 
            opacity: 0.8
        };
        const arrowScale = new THREE.Vector3(0.5, 0.5, 1);
        const positionOffset = 0.9;
    
        // Right arrow
        const rightMaterial = new THREE.SpriteMaterial(baseMaterialSettings);
        const rightArrow = new THREE.Sprite(rightMaterial);
        rightArrow.scale.copy(arrowScale);
        rightArrow.position.set(positionOffset, positionOffset, 0);
        rightArrow.userData = { type: 'roll-arrow', direction: Math.PI / 2 };
        this.rollArrows['right'] = rightArrow;
        this.scene.add(rightArrow);
    
        // Left arrow - using a separate material to rotate it
        const leftMaterial = new THREE.SpriteMaterial({
            ...baseMaterialSettings,
            rotation: Math.PI // Rotate 180 degrees around the center
        });
        const leftArrow = new THREE.Sprite(leftMaterial);
        leftArrow.scale.copy(arrowScale);
        leftArrow.position.set(-positionOffset, positionOffset, 0);
        leftArrow.userData = { type: 'roll-arrow', direction: -Math.PI / 2 };
        this.rollArrows['left'] = leftArrow;
        this.scene.add(leftArrow);
    }

    createArrowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Define styles for better visibility
        ctx.fillStyle = 'rgba(240, 240, 240, 1)'; // Lighter fill
        ctx.strokeStyle = 'rgba(20, 20, 20, 1)';   // Dark outline
        ctx.lineWidth = 6;                         // A visible but not overly thick outline
        ctx.lineJoin = 'round';                    // For smoother corners on the stroke

        // Draw arrow path
        ctx.beginPath();
        ctx.moveTo(64, 18); // Adjusted to account for line width
        ctx.lineTo(95, 45);
        ctx.arc(64, 64, 42, 0.2 * Math.PI, -0.7 * Math.PI, true);
        ctx.lineTo(64, 18);
        
        // Render
        ctx.fill();
        ctx.stroke();

        return new THREE.CanvasTexture(canvas);
    }

    createLabelSprite(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = color;
        context.fillText(text, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.4, 0.4, 1);
        return sprite;
    }

    createHighlightMesh() {
        // A BoxGeometry is more versatile for highlighting faces, edges, and corners
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            opacity: 0.3,
            transparent: true
        });
        this.highlightMesh = new THREE.Mesh(geometry, material);
        this.highlightMesh.visible = false;
        this.pivot.add(this.highlightMesh);
    }

    onMouseDown(event) {
        if (this.isAnimating) return;
        // Check if the mouse is over the cube
        if (this.isAnimating) return;
        const objectsToTest = [this.cube, ...this.axes, ...Object.values(this.rollArrows)];
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(objectsToTest);
        if (intersects.length > 0) {
            const intersectedObj = intersects[0].object;
            if (intersectedObj === this.cube) {
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
        this.highlightMesh.visible = false;
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
            return; // Don't do highlighting while dragging
        }

        if (this.isAnimating) {
            this.highlightMesh.visible = false;
            return;
        }

        const objectsToTest = [this.cube, ...this.axes, ...Object.values(this.rollArrows)];
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(objectsToTest, false);

        // Reset highlights
        this.highlightMesh.visible = false;
        [...this.axes].forEach(obj => obj.scale.set(1, 1, 1));
        Object.values(this.rollArrows).forEach(sprite => {
            sprite.material.opacity = 0.8;
            sprite.scale.set(0.5, 0.5, 1);
        });

        if (intersects.length > 0) {
            const intersection = intersects[0];
            const intersectedObj = intersection.object;

            if (intersectedObj === this.cube) {
                const hoverInfo = this.getHoverInfo(intersection.point, intersection.face.normal);
                this.highlightMesh.position.copy(hoverInfo.position);
                this.highlightMesh.quaternion.copy(hoverInfo.quaternion);
                this.highlightMesh.scale.copy(hoverInfo.scale);
                this.highlightMesh.visible = true;
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

        const objectsToTest = [this.cube, ...this.axes, ...Object.values(this.rollArrows)];
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(objectsToTest, false);

        if (intersects.length > 0) {
            this.highlightMesh.visible = false;
            
            const intersection = intersects[0];
            const intersectedObj = intersection.object;

            if (intersectedObj.userData.type === 'axis') {
                const direction = intersectedObj.userData.direction.clone();
                this.animateCameraTo(direction);
            } else if (intersectedObj.userData.type === 'roll-arrow') {
                this.rollView(intersectedObj.userData.direction);
            } else if (intersectedObj === this.cube) {
                const targetNormal = this.getTargetNormal(intersection.point, intersection.face.normal);
                this.animateCameraTo(targetNormal);
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

    rollView(angle) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const forward = this.mainControls.cameraPosition.clone().sub(this.mainControls.cameraTarget).normalize();
        const rotation = new THREE.Quaternion().setFromAxisAngle(forward, angle);
        
        const targetQuaternion = this.mainControls.cameraOrientation.clone().premultiply(rotation);

        new TWEEN.Tween(this.mainControls.cameraOrientation)
            .to(targetQuaternion, 500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.mainControls.updateCameraPosition();
            })
            .onComplete(() => {
                this.isAnimating = false;
                this.mainControls.updateCameraPosition();
            })
            .start();
    }

    animateCameraTo(targetNormal) {
        if (!this.mainControls || !this.mainControls.cameraTarget) return;
        this.isAnimating = true;

        const distance = this.mainControls.cameraPosition.distanceTo(this.mainControls.cameraTarget);
        const targetPosition = this.mainControls.cameraTarget.clone().add(targetNormal.clone().multiplyScalar(distance));

        // --- New logic to determine the best 'up' vector ---
        const currentUp = this.mainCamera.up.clone();
        
        // Potential 'snapped' up vectors (world axes)
        const potentialUps = [
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
        ];

        let bestUp = new THREE.Vector3(0, 1, 0);
        let maxDot = -Infinity;

        // Find the potential 'up' that is most aligned with the current 'up',
        // and is not parallel to the new viewing direction.
        for (const pUp of potentialUps) {
            if (Math.abs(pUp.dot(targetNormal)) < 0.999) {
                const dot = pUp.dot(currentUp);
                if (dot > maxDot) {
                    maxDot = dot;
                    bestUp = pUp;
                }
            }
        }
        // --- End of new logic ---

        // Calculate target quaternion
        const tempCam = this.mainCamera.clone();
        tempCam.up.copy(bestUp);
        tempCam.position.copy(targetPosition);
        tempCam.lookAt(this.mainControls.cameraTarget);
        const targetQuaternion = tempCam.quaternion;

        // Ensure the rotation takes the shortest path to avoid 360-degree flips.
        if (this.mainControls.cameraOrientation.dot(targetQuaternion) < 0) {
            targetQuaternion.x *= -1;
            targetQuaternion.y *= -1;
            targetQuaternion.z *= -1;
            targetQuaternion.w *= -1;
        }

        new TWEEN.Tween(this.mainControls.cameraPosition)
            .to(targetPosition, 800)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.mainControls.updateCameraPosition();
            })
            .start();

        new TWEEN.Tween(this.mainControls.cameraOrientation)
            .to(targetQuaternion, 800)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.mainControls.updateCameraPosition();
            })
            .onComplete(() => {
                this.isAnimating = false;
                this.mainControls.updateCameraPosition();
            })
            .start();
    }

    update() {
        // Keep the loop going
        requestAnimationFrame(() => this.update());

        TWEEN.update();

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
