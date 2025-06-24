// Geometry and material utility functions
class GeometryUtils {
    static getProfileDimension(profile, dimension) {
        // Simplified profile dimensions (in reality, you'd have a lookup table)
        const profileDimensions = {
            'HEA200': { height: 190, width: 200 },
            'IPE160': { height: 160, width: 82 }
        };
        
        return profileDimensions[profile]?.[dimension] || 100;
    }

    static parseRHSProfile(profile) {
        // Parse RHS60x4 format
        const match = profile.match(/RHS(\d+)x([\d.]+)/);
        if (match) {
            return { width: parseInt(match[1]), height: parseInt(match[1]) };
        }
        return { width: 60, height: 60 };
    }

    static parseCHSProfile(profile) {
        // Parse CHS168x6.3 format
        const match = profile.match(/CHS(\d+)x([\d.]+)/);
        if (match) {
            return parseInt(match[1]);
        }
        return 100;
    }

    static getMaterialColor(material) {
        const materialColors = {
            'S355JR': 0x4a9eff,  // Blue
            'S235JR': 0xffaa4a   // Orange
        };
        return materialColors[material] || 0x888888;
    }

    static positionBeam(mesh, start, end, beamData) {
        // Calculate center position
        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mesh.position.copy(center);
        
        // Calculate rotation to align with beam direction
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        
        // Handle curved beams
        if (beamData.arc) {
            // For curved beams, we'll create a simplified representation
            this.createCurvedBeam(mesh, start, end, beamData.arc);
            return;
        }
        
        // For straight beams
        const quaternion = new THREE.Quaternion();
        const worldUp = new THREE.Vector3(0, 1, 0);

        let beamX, beamY;

        // Handle vertical beams where the direction is parallel to the world up vector
        if (Math.abs(direction.y) > 0.9999) {
            // Use world X axis as a stable reference for the beam's "right" vector
            beamX = new THREE.Vector3(1, 0, 0);
            beamY = new THREE.Vector3().crossVectors(direction, beamX).normalize();
        } else {
            // Standard case:
            // beamX is perpendicular to the plane formed by worldUp and the beam direction
            beamX = new THREE.Vector3().crossVectors(worldUp, direction).normalize();
            // beamY is the beam's "up" vector, perpendicular to both its direction and its "right" vector
            beamY = new THREE.Vector3().crossVectors(direction, beamX).normalize();
        }

        const rotationMatrix = new THREE.Matrix4().makeBasis(beamX, beamY, direction);
        quaternion.setFromRotationMatrix(rotationMatrix);
        
        mesh.quaternion.copy(quaternion);
        
        // Apply orientation if specified
        if (beamData.orientation) {
            mesh.rotateZ(THREE.MathUtils.degToRad(beamData.orientation));
        }
    }

    static createCurvedBeam(mesh, start, end, arcData) {
        // For curved beams, replace with a curved geometry
        const radius = arcData.radius;
        const startVec = new THREE.Vector3(start.x, start.y, start.z);
        const endVec = new THREE.Vector3(end.x, end.y, end.z);
        
        // Create a curved path
        const curve = new THREE.QuadraticBezierCurve3(
            startVec,
            new THREE.Vector3(
                (startVec.x + endVec.x) / 2,
                (startVec.y + endVec.y) / 2 + radius * 0.1,
                (startVec.z + endVec.z) / 2
            ),
            endVec
        );
        
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 30, 8, false);
        mesh.geometry.dispose();
        mesh.geometry = tubeGeometry;
    }

    static getPointUnderMouse(event, camera, renderer, beamObjects) {
        const mouse = new THREE.Vector2();
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Prioritize intersecting with existing objects
        const objectsToIntersect = Array.from(beamObjects.values());
        const intersects = raycaster.intersectObjects(objectsToIntersect, false);
        if (intersects.length > 0) {
            return intersects[0].point;
        }

        // Fallback: If no object is hit, find a point on the grid plane (y=0).
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectionPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
            return intersectionPoint;
        }

        return null;
    }
} 