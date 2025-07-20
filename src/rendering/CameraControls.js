class CameraControls {
    constructor(camera, domElement, objectsToIntersect = []) {
        this.camera = camera;
        this.domElement = domElement;
        this.objectsToIntersect = objectsToIntersect;

        // State
        this.mouse = { x: 0, y: 0 };
        this.isRotating = false;
        this.isPanning = false;

        // Camera parameters
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.cameraDistance = 4000;
        this.cameraPosition = new THREE.Vector3(4000, 2000, 4000);
        this.cameraOrientation = new THREE.Quaternion();
        this.rotationPivot = new THREE.Vector3(); // Point to orbit around

        this.init();
    }

    init() {
        // Initialize orientation based on starting position and target
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.lookAt(this.cameraPosition, this.cameraTarget, new THREE.Vector3(0, 1, 0));
        this.cameraOrientation.setFromRotationMatrix(tempMatrix);

        this.setupEventListeners();
        this.updateCameraPosition();
    }

    setupEventListeners() {
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

        this.domElement.addEventListener('mousedown', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            
            if (e.button === 1) { // Middle mouse button
                e.preventDefault();
                this.isRotating = !e.shiftKey;
                this.isPanning = e.shiftKey;

                if (this.isRotating) {
                    // Set the pivot point for the rotation, but do not change camera state yet.
                    const pivot = this.getPointUnderMouse(e.clientX, e.clientY);
                    if (pivot) {
                        this.rotationPivot.copy(pivot);
                    } else {
                        this.rotationPivot.set(0, 0, 0);
                    }
                }
            }
        });

        this.domElement.addEventListener('mouseup', () => {
            this.isRotating = false;
            this.isPanning = false;
        });

        this.domElement.addEventListener('mouseleave', () => {
            this.isRotating = false;
            this.isPanning = false;
        });

        this.domElement.addEventListener('mousemove', (e) => {
            if (!this.isRotating && !this.isPanning) return;

            const deltaX = e.clientX - this.mouse.x;
            const deltaY = e.clientY - this.mouse.y;

            if (this.isRotating) {
                this.rotateCamera(deltaX, deltaY);
            } else if (this.isPanning) {
                this.panCamera(deltaX, deltaY);
            }

            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.ctrlKey) {
                this.panCamera(0, e.deltaY * 0.5);
            } else {
                this.zoomCamera(e.deltaY, e.clientX, e.clientY);
            }
        });
    }

    rotateCamera(deltaX, deltaY) {
        const rotationSpeed = 0.004;

        // 1. Define rotation axes: world Y for yaw, camera's local X for pitch.
        const yawAxis = new THREE.Vector3(0, 1, 0);
        const pitchAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cameraOrientation);

        // 2. Create the rotation for this frame.
        const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(yawAxis, -deltaX * rotationSpeed);
        const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(pitchAxis, -deltaY * rotationSpeed);
        const frameRotation = new THREE.Quaternion().multiplyQuaternions(yawQuaternion, pitchQuaternion);

        // 3. Rotate camera position and target around the pivot point.
        const pivot = this.rotationPivot;

        const posVec = this.cameraPosition.clone().sub(pivot);
        posVec.applyQuaternion(frameRotation);
        this.cameraPosition.copy(pivot).add(posVec);

        const targetVec = this.cameraTarget.clone().sub(pivot);
        targetVec.applyQuaternion(frameRotation);
        this.cameraTarget.copy(pivot).add(targetVec);

        // 4. Apply the same rotation to the camera's orientation.
        this.cameraOrientation.premultiply(frameRotation);
        
        this.updateCameraPosition();
    }

    panCamera(deltaX, deltaY) {
        const panSpeed = this.camera.isOrthographicCamera ? ((this.camera.right - this.camera.left) / this.camera.zoom) / this.domElement.clientWidth : this.cameraDistance * 0.001;
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0).multiplyScalar(-deltaX * panSpeed);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1).multiplyScalar(deltaY * panSpeed);
        
        this.cameraTarget.add(right).add(up);
        this.cameraPosition.add(right).add(up);
        
        this.updateCameraPosition();
    }

    zoomCamera(delta, clientX, clientY) {
        if (this.camera.isOrthographicCamera) {
            const zoomSpeed = 0.02; // Further reduced for smoother zoom
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            const rect = this.domElement.getBoundingClientRect();
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, this.camera);
            
            const plane = new THREE.Plane();
            const targetDirection = new THREE.Vector3();
            this.camera.getWorldDirection(targetDirection);
            plane.setFromNormalAndCoplanarPoint(targetDirection, this.cameraTarget);

            const pointBeforeZoom = new THREE.Vector3();
            if (!raycaster.ray.intersectPlane(plane, pointBeforeZoom)) {
                // Fallback if ray is parallel to plane
                const zoomFactorSimple = Math.pow(0.95, delta * 0.02);
                this.camera.zoom *= zoomFactorSimple;
                this.camera.updateProjectionMatrix();
                return;
            }
            
            const zoomFactor = Math.pow(0.95, delta * zoomSpeed);
            this.camera.zoom *= zoomFactor;
            this.camera.updateProjectionMatrix();
            
            raycaster.setFromCamera(mouse, this.camera);
            const pointAfterZoom = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, pointAfterZoom);

            const correction = new THREE.Vector3().subVectors(pointBeforeZoom, pointAfterZoom);
            this.cameraPosition.add(correction);
            this.cameraTarget.add(correction);

            this.updateCameraPosition();
        } else {
            const flySpeed = 1.0;
            const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cameraOrientation);
            const moveDistance = -delta * flySpeed;
            const moveVector = direction.normalize().multiplyScalar(moveDistance);

            this.cameraPosition.add(moveVector);
            this.cameraTarget.add(moveVector);
            this.cameraDistance = this.cameraPosition.distanceTo(this.cameraTarget);

            this.updateCameraPosition();
        }
    }

    updateCameraPosition() {
        this.camera.position.copy(this.cameraPosition);
        this.camera.quaternion.copy(this.cameraOrientation);
    }

    setIntersectableObjects(objects) {
        this.objectsToIntersect = objects;
    }

    getPointUnderMouse(clientX, clientY) {
        const mouse = new THREE.Vector2();
        const rect = this.domElement.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const intersects = raycaster.intersectObjects(this.objectsToIntersect, false);

        if (intersects.length > 0) {
            return intersects[0].point;
        }

        return null;
    }

    // Public methods to be called from BeamViewer
    focus(box) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        this.cameraTarget.copy(center);

        if (this.camera.isOrthographicCamera) {
            const maxDim = Math.max(size.x, size.y);
            const aspect = this.domElement.clientWidth / this.domElement.clientHeight;

            this.camera.left = -maxDim * aspect / 2;
            this.camera.right = maxDim * aspect / 2;
            this.camera.top = maxDim / 2;
            this.camera.bottom = -maxDim / 2;
            
            this.camera.zoom = 1;
            
            const offset = new THREE.Vector3(0, 0, 1).applyQuaternion(this.cameraOrientation).multiplyScalar(size.z*2);
            this.cameraPosition.copy(this.cameraTarget).add(offset);
            
            this.camera.updateProjectionMatrix();
            this.updateCameraPosition();

        } else {
            const maxDim = Math.max(size.x, size.y, size.z);
            this.cameraDistance = maxDim * 2;

            const offset = new THREE.Vector3(0, 0, 1).applyQuaternion(this.cameraOrientation).multiplyScalar(this.cameraDistance);
            this.cameraPosition.copy(this.cameraTarget).add(offset);
            
            this.updateCameraPosition();
        }
    }

    reset() {
        this.cameraTarget.set(0, 0, 0);
        this.cameraPosition.set(4000, 2000, 4000);
        this.cameraDistance = this.cameraPosition.distanceTo(this.cameraTarget);

        const tempMatrix = new THREE.Matrix4();
        tempMatrix.lookAt(this.cameraPosition, this.cameraTarget, new THREE.Vector3(0, 1, 0));
        this.cameraOrientation.setFromRotationMatrix(tempMatrix);

        this.updateCameraPosition();
    }
} 