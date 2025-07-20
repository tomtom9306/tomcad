window.ViewCubeAnimator = class ViewCubeAnimator {
    constructor(mainCamera, mainControls, onAnimationStart, onAnimationEnd) {
        this.mainCamera = mainCamera;
        this.mainControls = mainControls;
        this.onAnimationStart = onAnimationStart;
        this.onAnimationEnd = onAnimationEnd;
        this.isAnimating = false;
    }

    setAnimating(value) {
        this.isAnimating = value;
        if (this.onAnimationStart && value) {
            this.onAnimationStart();
        }
        if (this.onAnimationEnd && !value) {
            this.onAnimationEnd();
        }
    }

    rollView(angle) {
        if (this.isAnimating) return;
        this.setAnimating(true);

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
                this.setAnimating(false);
                this.mainControls.updateCameraPosition();
            })
            .start();
    }

    animateCameraTo(targetNormal) {
        if (!this.mainControls || !this.mainControls.cameraTarget) return;
        this.setAnimating(true);

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
                this.setAnimating(false);
                this.mainControls.updateCameraPosition();
            })
            .start();
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

    getIsAnimating() {
        return this.isAnimating;
    }
}