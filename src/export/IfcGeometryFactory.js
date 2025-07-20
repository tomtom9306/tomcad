// IFC Geometry Factory - Handles shape creation, profile handling, and placement calculations
// Part of TomCAD IFC Export functionality

window.IfcGeometryFactory = class IfcGeometryFactory {
    constructor(generator) {
        this.generator = generator;
    }

    /**
     * Creates a local placement for an element
     */
    createLocalPlacement(position, direction) {
        // IFC units are now in millimeters, so no conversion needed
        const posM = {
            x: position.x,
            y: position.y, 
            z: position.z
        };
        
        const locationId = this.generator.addLine('IFCCARTESIANPOINT', [
            `(${posM.x.toFixed(3)},${posM.y.toFixed(3)},${posM.z.toFixed(3)})`
        ]);
        
        const axisId = this.generator.addLine('IFCDIRECTION', [
            `(${direction.x.toFixed(6)},${direction.y.toFixed(6)},${direction.z.toFixed(6)})`
        ]);
        
        const refDirectionId = this.generator.addLine('IFCDIRECTION', ['(1.,0.,0.)']);
        
        const placement3DId = this.generator.addLine('IFCAXIS2PLACEMENT3D', [
            `#${locationId}`, `#${axisId}`, `#${refDirectionId}`
        ]);
        
        return placement3DId;
    }

    /**
     * Creates a beam-specific placement where Z-axis is along the beam length
     */
    createBeamPlacement(position, beamDirection) {
        // IFC units are now in millimeters, so no conversion needed
        const posM = {
            x: position.x,
            y: position.y, 
            z: position.z
        };
        
        const locationId = this.generator.addLine('IFCCARTESIANPOINT', [
            `(${posM.x.toFixed(3)},${posM.y.toFixed(3)},${posM.z.toFixed(3)})`
        ]);
        
        // Z-axis is along the beam direction for proper extrusion
        const zAxisId = this.generator.addLine('IFCDIRECTION', [
            `(${beamDirection.x.toFixed(6)},${beamDirection.y.toFixed(6)},${beamDirection.z.toFixed(6)})`
        ]);
        
        // X-axis: find a perpendicular direction
        let xDirection = new THREE.Vector3(1, 0, 0);
        if (Math.abs(beamDirection.dot(xDirection)) > 0.9) {
            // If beam is nearly parallel to X, use Y as reference
            xDirection = new THREE.Vector3(0, 1, 0);
        }
        xDirection = xDirection.cross(beamDirection).normalize();
        
        const xAxisId = this.generator.addLine('IFCDIRECTION', [
            `(${xDirection.x.toFixed(6)},${xDirection.y.toFixed(6)},${xDirection.z.toFixed(6)})`
        ]);
        
        const placement3DId = this.generator.addLine('IFCAXIS2PLACEMENT3D', [
            `#${locationId}`, `#${zAxisId}`, `#${xAxisId}`
        ]);
        
        return placement3DId;
    }

    /**
     * Creates a beam shape representation (simplified box)
     */
    createBeamShape(profile, length, placement3DId) {
        // Get profile dimensions - no conversion needed as IFC units are now millimeters
        const profileDef = this.generator.propertyManager.getProfileDimensions(profile);
        const widthMM = profileDef.width;   // already in mm
        const heightMM = profileDef.height; // already in mm
        const lengthMM = length;            // already in mm
        
        console.log(`Creating beam shape: ${profile}, dimensions: ${widthMM}mm x ${heightMM}mm x ${lengthMM}mm`);
        
        // Validate dimensions
        if (widthMM <= 0 || heightMM <= 0 || lengthMM <= 0) {
            console.error(`Invalid dimensions for beam: w=${widthMM}, h=${heightMM}, l=${lengthMM}`);
            return null;
        }
        
        // Create 2D placement for the profile
        const profilePointId = this.generator.addLine('IFCCARTESIANPOINT', ['(0.0,0.0)']);
        const profileDirId = this.generator.addLine('IFCDIRECTION', ['(1.0,0.0)']);
        const profilePlacementId = this.generator.addLine('IFCAXIS2PLACEMENT2D', [`#${profilePointId}`,`#${profileDirId}`]);

        // Create simplified rectangular profile (center at origin)
        const profileId = this.generator.addLine('IFCRECTANGLEPROFILEDEF', [
            '.AREA.', profile, `#${profilePlacementId}`, widthMM, heightMM
        ]);
        
        console.log(`Created profile definition with ID: ${profileId}`);

        // Create extruded area solid (simplified)
        const extrudedDirId = this.generator.addLine('IFCDIRECTION', ['(0.,0.,1.)']);
        const extrudedSolidId = this.generator.addLine('IFCEXTRUDEDAREASOLID', [
            `#${profileId}`, `#${placement3DId}`, `#${extrudedDirId}`, lengthMM
        ]);
        
        console.log(`Created extruded solid with ID: ${extrudedSolidId}`);

        // Validate context reference
        const contextId = this.generator.entityRefs.get('context');
        if (!contextId) {
            console.error('Geometric representation context not found!');
            return null;
        }
        
        const shapeRepId = this.generator.addLine('IFCSHAPEREPRESENTATION', [
            `#${contextId}`, 'Body', 'SweptSolid', `(#${extrudedSolidId})`
        ]);

        console.log(`Created shape representation with ID: ${shapeRepId}`);
        return shapeRepId;
    }

    /**
     * Creates a plate shape representation
     */
    createPlateShape(width, height, thickness, placement3DId) {
        // No conversion needed as IFC units are now millimeters
        const widthMM = width;
        const heightMM = height;
        const thicknessMM = thickness;
        
        console.log(`Creating plate shape: dimensions: ${widthMM}mm x ${heightMM}mm x ${thicknessMM}mm`);
        
        // Validate dimensions
        if (widthMM <= 0 || heightMM <= 0 || thicknessMM <= 0) {
            console.error(`Invalid dimensions for plate: w=${widthMM}, h=${heightMM}, t=${thicknessMM}`);
            return null;
        }
        
        // Create 2D placement for the profile
        const profilePointId = this.generator.addLine('IFCCARTESIANPOINT', ['(0.0,0.0)']);
        const profileDirId = this.generator.addLine('IFCDIRECTION', ['(1.0,0.0)']);
        const profilePlacementId = this.generator.addLine('IFCAXIS2PLACEMENT2D', [`#${profilePointId}`,`#${profileDirId}`]);

        // Create simplified rectangular profile (center at origin)
        const profileId = this.generator.addLine('IFCRECTANGLEPROFILEDEF', [
            '.AREA.', '$', `#${profilePlacementId}`, widthMM, heightMM
        ]);
        
        console.log(`Created plate profile definition with ID: ${profileId}`);

        // Create extruded area solid with proper placement
        const extrudedDirId = this.generator.addLine('IFCDIRECTION', ['(0.,0.,1.)']);
        const extrudedSolidId = this.generator.addLine('IFCEXTRUDEDAREASOLID', [
            `#${profileId}`, `#${placement3DId}`, `#${extrudedDirId}`, thicknessMM
        ]);

        console.log(`Created plate extruded solid with ID: ${extrudedSolidId}`);

        // Validate context reference
        const contextId = this.generator.entityRefs.get('context');
        if (!contextId) {
            console.error('Geometric representation context not found for plate!');
            return null;
        }
        
        const shapeRepId = this.generator.addLine('IFCSHAPEREPRESENTATION', [
            `#${contextId}`, 'Body', 'SweptSolid', `(#${extrudedSolidId})`
        ]);

        console.log(`Created plate shape representation with ID: ${shapeRepId}`);
        return shapeRepId;
    }
}

// Export for browser environment
window.IfcGeometryFactory = IfcGeometryFactory;