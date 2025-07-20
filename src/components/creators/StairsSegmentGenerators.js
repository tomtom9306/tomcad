/**
 * StairsSegmentGenerators - Individual segment builders for stairs components
 * Implements the "Builder" pattern for different types of stairs segments
 */
window.StairsSegmentGenerators = class StairsSegmentGenerators {
    /**
     * Main entry point for generating all segments
     * @param {Array} segments - Array of segment definitions
     * @param {Object} cursor - Current position and direction cursor
     * @param {Object} componentData - Component configuration data
     * @returns {Object} Generated children and final cursor position
     */
    static generateAllSegments(segments, cursor, componentData) {
        const children = {};
        let childIndex = 0;

        // Iterate through segments and call appropriate builders
        segments.forEach((segment, segmentIndex) => {
            const segmentChildren = this._generateSegment(
                segment, 
                cursor, 
                componentData, 
                `seg_${segmentIndex}`
            );

            // Add segment children to main list
            Object.entries(segmentChildren.children).forEach(([key, childData]) => {
                children[`${segment.id}_${key}`] = childData;
                childIndex++;
            });

            // Update cursor based on segment end position
            cursor.position = segmentChildren.endCursor.position;
            cursor.direction = segmentChildren.endCursor.direction;
            cursor.upDirection = segmentChildren.endCursor.upDirection;
        });

        return children;
    }

    /**
     * Main segment dispatcher - routes to appropriate builder
     * @param {Object} segment - Segment configuration
     * @param {Object} startCursor - Starting position and direction
     * @param {Object} componentData - Component configuration
     * @param {string} segmentPrefix - Prefix for child naming
     * @returns {Object} Generated children and end cursor
     */
    static _generateSegment(segment, startCursor, componentData, segmentPrefix) {
        switch (segment.type) {
            case 'flight':
                return this._generateFlight(segment, startCursor, componentData, segmentPrefix);
            case 'landing_L':
                return this._generateLandingL(segment, startCursor, componentData, segmentPrefix);
            case 'landing_straight':
                return this._generateLandingStraight(segment, startCursor, componentData, segmentPrefix);
            default:
                console.warn(`Unknown stairs segment type: ${segment.type}`);
                return { children: {}, endCursor: startCursor };
        }
    }

    /**
     * BUILDER: Flight of stairs with steps and stringers
     * @param {Object} segment - Flight segment configuration
     * @param {Object} startCursor - Starting position and direction
     * @param {Object} componentData - Component configuration
     * @param {string} segmentPrefix - Prefix for child naming
     * @returns {Object} Generated children and end cursor
     */
    static _generateFlight(segment, startCursor, componentData, segmentPrefix) {
        const { stepCount, totalRise, run } = segment.params;
        const stepHeight = totalRise / stepCount;
        const width = componentData.defaultWidth || 1000;
        
        const children = {};

        // Flight start position
        const startPos = startCursor.position.clone();
        const direction = startCursor.direction.clone();
        const upDirection = startCursor.upDirection.clone();
        const rightDir = new THREE.Vector3().crossVectors(upDirection, direction).normalize();

        // Stringers
        const leftStringerStart = startPos.clone().add(rightDir.clone().multiplyScalar(-width / 2));
        const rightStringerStart = startPos.clone().add(rightDir.clone().multiplyScalar(width / 2));
        
        const flightLength = stepCount * run;
        
        // Use vectors instead of .setY()
        const horizontalRunVector = direction.clone().multiplyScalar(flightLength);
        const verticalRiseVector = upDirection.clone().multiplyScalar(totalRise);
        
        const leftStringerEnd = leftStringerStart.clone().add(horizontalRunVector).add(verticalRiseVector);
        const rightStringerEnd = rightStringerStart.clone().add(horizontalRunVector).add(verticalRiseVector);

        children.leftStringer = {
            type: 'beam',
            profile: componentData.defaultStringerProfile || 'IPE160',
            material: componentData.material || 'S355JR',
            start: leftStringerStart.toArray(),
            end: leftStringerEnd.toArray(),
            orientation: 0
        };

        children.rightStringer = {
            type: 'beam',
            profile: componentData.defaultStringerProfile || 'IPE160',
            material: componentData.material || 'S355JR',
            start: rightStringerStart.toArray(),
            end: rightStringerEnd.toArray(),
            orientation: 0
        };

        // Calculate rotation for steps
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.lookAt(new THREE.Vector3(0, 0, 0), direction, upDirection);
        const eulerRotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix, 'ZYX');
        const rotationValues = [
            THREE.MathUtils.radToDeg(eulerRotation.x),
            THREE.MathUtils.radToDeg(eulerRotation.y),
            THREE.MathUtils.radToDeg(eulerRotation.z)
        ];

        // Steps (treads)
        for (let i = 0; i < stepCount; i++) {
            // Use upDirection to calculate step position
            const stepHorizontalOffset = direction.clone().multiplyScalar((i * run) + (run / 2));
            const stepVerticalOffset = upDirection.clone().multiplyScalar((i + 1) * stepHeight);
            const treadCenter = startPos.clone().add(stepHorizontalOffset).add(stepVerticalOffset);
            
            children[`tread_${i}`] = {
                type: 'plate',
                material: componentData.material || 'S355JR',
                origin: treadCenter.toArray(),
                width: width,
                height: run,
                thickness: componentData.defaultTreadThickness || 30,
                rotation: { 
                    type: "Euler", 
                    order: "ZYX", 
                    values: rotationValues,
                    units: "degrees" 
                }
            };
        }

        // Update cursor to end of flight
        const endPos = startPos.clone().add(horizontalRunVector).add(verticalRiseVector);
        const endCursor = {
            position: endPos,
            direction: direction.clone(),
            upDirection: upDirection.clone()
        };

        return { children, endCursor };
    }

    /**
     * BUILDER: L-shaped landing with turn
     * @param {Object} segment - Landing segment configuration
     * @param {Object} startCursor - Starting position and direction
     * @param {Object} componentData - Component configuration
     * @param {string} segmentPrefix - Prefix for child naming
     * @returns {Object} Generated children and end cursor
     */
    static _generateLandingL(segment, startCursor, componentData, segmentPrefix) {
        const { width, depth, turn } = segment.params;
        const landingWidth = width || componentData.defaultWidth || 1000;
        const landingDepth = depth || 1200;
        
        const children = {};
        
        const direction = startCursor.direction.clone();
        const upDirection = startCursor.upDirection.clone();

        // Landing plate
        const landingCenter = startCursor.position.clone().add(direction.clone().multiplyScalar(landingDepth / 2));
        
        // Calculate rotation for landing
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.lookAt(new THREE.Vector3(0, 0, 0), direction, upDirection);
        const eulerRotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix, 'ZYX');

        children.landingPlate = {
            type: 'plate',
            material: componentData.material || 'S355JR',
            origin: landingCenter.toArray(),
            width: landingWidth,
            height: landingDepth,
            thickness: componentData.defaultTreadThickness || 30,
            rotation: { 
                type: "Euler", 
                order: "ZYX", 
                values: [
                    THREE.MathUtils.radToDeg(eulerRotation.x),
                    THREE.MathUtils.radToDeg(eulerRotation.y),
                    THREE.MathUtils.radToDeg(eulerRotation.z)
                ], 
                units: "degrees" 
            }
        };

        // Update direction based on turn
        const newDirection = direction.clone();
        // Turn around the up axis
        const turnAngle = (turn === 'left' ? Math.PI / 2 : -Math.PI / 2);
        newDirection.applyAxisAngle(upDirection, turnAngle);

        const endCursor = {
            position: startCursor.position.clone().add(startCursor.direction.clone().multiplyScalar(landingDepth)),
            direction: newDirection,
            upDirection: upDirection.clone()
        };

        return { children, endCursor };
    }

    /**
     * BUILDER: Straight landing
     * @param {Object} segment - Landing segment configuration
     * @param {Object} startCursor - Starting position and direction
     * @param {Object} componentData - Component configuration
     * @param {string} segmentPrefix - Prefix for child naming
     * @returns {Object} Generated children and end cursor
     */
    static _generateLandingStraight(segment, startCursor, componentData, segmentPrefix) {
        const { length } = segment.params;
        const landingLength = length || 1200;
        const landingWidth = componentData.defaultWidth || 1000;
        
        const children = {};
        
        const direction = startCursor.direction.clone();
        const upDirection = startCursor.upDirection.clone();
        
        const landingCenter = startCursor.position.clone().add(direction.clone().multiplyScalar(landingLength / 2));
        
        // Calculate rotation for landing
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.lookAt(new THREE.Vector3(0, 0, 0), direction, upDirection);
        const eulerRotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix, 'ZYX');

        children.landingPlate = {
            type: 'plate',
            material: componentData.material || 'S355JR',
            origin: landingCenter.toArray(),
            width: landingWidth,
            height: landingLength,
            thickness: componentData.defaultTreadThickness || 30,
            rotation: { 
                type: "Euler", 
                order: "ZYX", 
                values: [
                    THREE.MathUtils.radToDeg(eulerRotation.x),
                    THREE.MathUtils.radToDeg(eulerRotation.y),
                    THREE.MathUtils.radToDeg(eulerRotation.z)
                ], 
                units: "degrees" 
            }
        };

        const endCursor = {
            position: startCursor.position.clone().add(direction.clone().multiplyScalar(landingLength)),
            direction: direction.clone(),
            upDirection: upDirection.clone()
        };

        return { children, endCursor };
    }
}