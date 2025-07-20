/**
 * StairsGeometry - Geometric calculations and cursor management for stairs
 * Handles position calculations, rotations, and cursor updates
 */
window.StairsGeometry = class StairsGeometry {
    /**
     * Initialize cursor from component data
     * @param {Object} componentData - Component configuration data
     * @returns {Object} Cursor with position, direction, and up direction
     */
    static initializeCursor(componentData) {
        return {
            position: new THREE.Vector3(...componentData.startPoint),
            direction: new THREE.Vector3(...componentData.startDirection).normalize(),
            upDirection: new THREE.Vector3(0, 1, 0)
        };
    }

    /**
     * Calculate direction vector from two points
     * @param {THREE.Vector3} startPoint - Starting point
     * @param {THREE.Vector3} endPoint - Ending point
     * @returns {THREE.Vector3} Normalized direction vector
     */
    static calculateDirection(startPoint, endPoint) {
        return new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
    }

    /**
     * Calculate right direction vector from direction and up vectors
     * @param {THREE.Vector3} direction - Forward direction
     * @param {THREE.Vector3} upDirection - Up direction
     * @returns {THREE.Vector3} Right direction vector
     */
    static calculateRightDirection(direction, upDirection) {
        return new THREE.Vector3().crossVectors(upDirection, direction).normalize();
    }

    /**
     * Calculate rotation matrix from direction and up vectors
     * @param {THREE.Vector3} direction - Forward direction
     * @param {THREE.Vector3} upDirection - Up direction
     * @returns {Array} Rotation values in degrees [x, y, z]
     */
    static calculateRotation(direction, upDirection) {
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.lookAt(new THREE.Vector3(0, 0, 0), direction, upDirection);
        const eulerRotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix, 'ZYX');
        
        return [
            THREE.MathUtils.radToDeg(eulerRotation.x),
            THREE.MathUtils.radToDeg(eulerRotation.y),
            THREE.MathUtils.radToDeg(eulerRotation.z)
        ];
    }

    /**
     * Calculate position with horizontal and vertical offsets
     * @param {THREE.Vector3} basePosition - Base position
     * @param {THREE.Vector3} direction - Direction vector
     * @param {THREE.Vector3} upDirection - Up direction vector
     * @param {number} horizontalOffset - Horizontal offset distance
     * @param {number} verticalOffset - Vertical offset distance
     * @returns {THREE.Vector3} Calculated position
     */
    static calculateOffsetPosition(basePosition, direction, upDirection, horizontalOffset, verticalOffset) {
        const horizontalVector = direction.clone().multiplyScalar(horizontalOffset);
        const verticalVector = upDirection.clone().multiplyScalar(verticalOffset);
        
        return basePosition.clone().add(horizontalVector).add(verticalVector);
    }

    /**
     * Calculate stringer positions (left and right)
     * @param {THREE.Vector3} startPos - Starting position
     * @param {THREE.Vector3} direction - Direction vector
     * @param {THREE.Vector3} upDirection - Up direction vector
     * @param {number} width - Width of the stairs
     * @returns {Object} Object with leftStart and rightStart positions
     */
    static calculateStringerPositions(startPos, direction, upDirection, width) {
        const rightDir = this.calculateRightDirection(direction, upDirection);
        
        return {
            leftStart: startPos.clone().add(rightDir.clone().multiplyScalar(-width / 2)),
            rightStart: startPos.clone().add(rightDir.clone().multiplyScalar(width / 2))
        };
    }

    /**
     * Calculate end positions for stringers
     * @param {Object} stringerStarts - Object with leftStart and rightStart positions
     * @param {THREE.Vector3} direction - Direction vector
     * @param {THREE.Vector3} upDirection - Up direction vector
     * @param {number} horizontalDistance - Horizontal distance
     * @param {number} verticalDistance - Vertical distance
     * @returns {Object} Object with leftEnd and rightEnd positions
     */
    static calculateStringerEndPositions(stringerStarts, direction, upDirection, horizontalDistance, verticalDistance) {
        const horizontalVector = direction.clone().multiplyScalar(horizontalDistance);
        const verticalVector = upDirection.clone().multiplyScalar(verticalDistance);
        const offsetVector = horizontalVector.clone().add(verticalVector);
        
        return {
            leftEnd: stringerStarts.leftStart.clone().add(offsetVector),
            rightEnd: stringerStarts.rightStart.clone().add(offsetVector)
        };
    }

    /**
     * Calculate step position for a given step index
     * @param {THREE.Vector3} basePosition - Base position
     * @param {THREE.Vector3} direction - Direction vector
     * @param {THREE.Vector3} upDirection - Up direction vector
     * @param {number} stepIndex - Step index (0-based)
     * @param {number} run - Run distance per step
     * @param {number} stepHeight - Height per step
     * @returns {THREE.Vector3} Step center position
     */
    static calculateStepPosition(basePosition, direction, upDirection, stepIndex, run, stepHeight) {
        const horizontalOffset = direction.clone().multiplyScalar((stepIndex * run) + (run / 2));
        const verticalOffset = upDirection.clone().multiplyScalar((stepIndex + 1) * stepHeight);
        
        return basePosition.clone().add(horizontalOffset).add(verticalOffset);
    }

    /**
     * Calculate landing center position
     * @param {THREE.Vector3} startPosition - Starting position
     * @param {THREE.Vector3} direction - Direction vector
     * @param {number} depth - Landing depth
     * @returns {THREE.Vector3} Landing center position
     */
    static calculateLandingCenter(startPosition, direction, depth) {
        return startPosition.clone().add(direction.clone().multiplyScalar(depth / 2));
    }

    /**
     * Apply rotation around an axis
     * @param {THREE.Vector3} vector - Vector to rotate
     * @param {THREE.Vector3} axis - Axis of rotation
     * @param {number} angle - Rotation angle in radians
     * @returns {THREE.Vector3} Rotated vector
     */
    static applyRotation(vector, axis, angle) {
        const rotatedVector = vector.clone();
        rotatedVector.applyAxisAngle(axis, angle);
        return rotatedVector;
    }

    /**
     * Calculate turn angle for L-shaped landing
     * @param {string} turn - Turn direction ('left' or 'right')
     * @returns {number} Turn angle in radians
     */
    static calculateTurnAngle(turn) {
        return (turn === 'left' ? Math.PI / 2 : -Math.PI / 2);
    }

    /**
     * Update cursor position after segment
     * @param {Object} cursor - Current cursor
     * @param {THREE.Vector3} newPosition - New position
     * @param {THREE.Vector3} newDirection - New direction (optional)
     * @param {THREE.Vector3} newUpDirection - New up direction (optional)
     * @returns {Object} Updated cursor
     */
    static updateCursor(cursor, newPosition, newDirection = null, newUpDirection = null) {
        return {
            position: newPosition.clone(),
            direction: newDirection ? newDirection.clone() : cursor.direction.clone(),
            upDirection: newUpDirection ? newUpDirection.clone() : cursor.upDirection.clone()
        };
    }

    /**
     * Calculate flight end position
     * @param {THREE.Vector3} startPosition - Starting position
     * @param {THREE.Vector3} direction - Direction vector
     * @param {THREE.Vector3} upDirection - Up direction vector
     * @param {number} flightLength - Horizontal flight length
     * @param {number} totalRise - Total vertical rise
     * @returns {THREE.Vector3} Flight end position
     */
    static calculateFlightEndPosition(startPosition, direction, upDirection, flightLength, totalRise) {
        const horizontalVector = direction.clone().multiplyScalar(flightLength);
        const verticalVector = upDirection.clone().multiplyScalar(totalRise);
        
        return startPosition.clone().add(horizontalVector).add(verticalVector);
    }

    /**
     * Calculate landing end position
     * @param {THREE.Vector3} startPosition - Starting position
     * @param {THREE.Vector3} direction - Direction vector
     * @param {number} landingLength - Landing length
     * @returns {THREE.Vector3} Landing end position
     */
    static calculateLandingEndPosition(startPosition, direction, landingLength) {
        return startPosition.clone().add(direction.clone().multiplyScalar(landingLength));
    }

    /**
     * Create rotation object for elements
     * @param {Array} rotationValues - Rotation values in degrees [x, y, z]
     * @returns {Object} Rotation object with type, order, values, and units
     */
    static createRotationObject(rotationValues) {
        return {
            type: "Euler",
            order: "ZYX",
            values: rotationValues,
            units: "degrees"
        };
    }

    /**
     * Validate distance between two points
     * @param {THREE.Vector3} point1 - First point
     * @param {THREE.Vector3} point2 - Second point
     * @param {number} minDistance - Minimum required distance
     * @returns {boolean} True if distance is valid
     */
    static validateDistance(point1, point2, minDistance = 1.0) {
        return point1.distanceTo(point2) >= minDistance;
    }

    /**
     * Get control points for stairs component
     * @param {Object} elementData - Element data
     * @returns {Array} Array of control points
     */
    static getControlPoints(elementData) {
        if (elementData.startPoint) {
            const startPoint = new THREE.Vector3(...elementData.startPoint);
            const direction = new THREE.Vector3(...elementData.startDirection);
            const endPoint = startPoint.clone().add(direction.multiplyScalar(2000)); // Example length
            
            return [
                { type: 'start', position: startPoint },
                { type: 'end', position: endPoint }
            ];
        }
        return [];
    }
}