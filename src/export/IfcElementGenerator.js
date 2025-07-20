// IFC Element Generator - Handles element-specific generation logic
// Part of TomCAD IFC Export functionality

window.IfcElementGenerator = class IfcElementGenerator {
    constructor(generator) {
        this.generator = generator;
    }

    /**
     * Generates all elements from the structure data
     */
    generateElements() {
        if (!this.generator.structure.elements) return;

        const elementIds = [];
        
        this.generator.structure.elements.forEach(element => {
            let elementId = null;
            
            console.log(`Processing element: ${element.id}, kind: ${element.kind}, ifcType: ${element.ifcType}`);
            
            if (element.ifcType === 'IfcColumn' || (element.kind === 'beam' && this._isColumn(element))) {
                elementId = this.generateColumn(element);
            } else if (element.ifcType === 'IfcBeam' || element.kind === 'beam') {
                elementId = this.generateBeam(element);
            } else if (element.ifcType === 'IfcPlate' || element.kind === 'plate') {
                elementId = this.generatePlate(element);
            }
            
            if (elementId) {
                elementIds.push(elementId);
                console.log(`Generated element ${element.id} with IFC ID #${elementId}`);
            } else {
                console.warn(`Failed to generate element: ${element.id}`);
            }
        });

        // Create containment relationship for all elements in the storey
        if (elementIds.length > 0 && this.generator.entityRefs.has('storey')) {
            this.generator.addLine('IFCRELCONTAINEDINSPATIALSTRUCTURE', [
                this.generator.constructor.generateIfcGuid(), `#${this.generator.entityRefs.get('ownerHistory')}`, 
                '$', '$', `(${elementIds.map(id => `#${id}`).join(',')})`, `#${this.generator.entityRefs.get('storey')}`
            ]);
        }
    }

    /**
     * Determines if a beam element should be treated as a column
     */
    _isColumn(element) {
        if (!element.start || !element.end) return false;
        const start = element.start;
        const end = element.end;
        
        // Consider it a column if it's primarily vertical (Z difference > X,Y differences)
        const dx = Math.abs(end[0] - start[0]);
        const dy = Math.abs(end[1] - start[1]);
        const dz = Math.abs(end[2] - start[2]);
        
        return dz > Math.max(dx, dy) * 2; // Column if Z difference is significantly larger
    }

    /**
     * Generates a complete beam definition in IFC
     */
    generateBeam(element) {
        const { start, end, profile, ifcGlobalId, ifcObjectType } = element;
        if (!start || !end) return null;

        const guid = ifcGlobalId || this.generator.constructor.generateIfcGuid();
        const objectType = ifcObjectType || `Beam ${profile}`;
        
        // Calculate beam properties
        const startVec = new THREE.Vector3(...start);
        const endVec = new THREE.Vector3(...end);
        const length = startVec.distanceTo(endVec);
        const directionVec = new THREE.Vector3().subVectors(endVec, startVec).normalize();

        // Create placement
        const placement3DId = this.generator.geometryFactory.createBeamPlacement(startVec, directionVec);
        const localPlacementId = this.generator.addLine('IFCLOCALPLACEMENT', ['$', `#${placement3DId}`]);
        
        // Create shape representation
        const shapeRepId = this.generator.geometryFactory.createBeamShape(profile, length, placement3DId);
        
        if (!shapeRepId) {
            console.error(`Failed to create shape for beam ${element.id}`);
            return null;
        }
        
        const productDefShapeId = this.generator.addLine('IFCPRODUCTDEFINITIONSHAPE', [
            '$', '$', `(#${shapeRepId})`
        ]);
        
        console.log(`Created beam product definition shape with ID: ${productDefShapeId}`);

        // Create the beam
        const beamId = this.generator.addLine('IFCBEAM', [
            guid,
            `#${this.generator.entityRefs.get('ownerHistory')}`,
            element.id,
            '$',
            objectType,
            `#${localPlacementId}`,
            `#${productDefShapeId}`,
            '$',
            '.BEAM.'
        ]);

        // Add material association
        if (element.material) {
            this.generator.propertyManager.createMaterialAssociation(beamId, element.material);
        }
        
        // Add element properties
        this.generator.propertyManager.createElementProperties(beamId, element);

        console.log(`Created beam ${element.id} with ID ${beamId}`);
        return beamId;
    }

    /**
     * Generates a column definition in IFC
     */
    generateColumn(element) {
        const { start, end, profile, ifcGlobalId, ifcObjectType } = element;
        if (!start || !end) return null;

        const guid = ifcGlobalId || this.generator.constructor.generateIfcGuid();
        const objectType = ifcObjectType || `Column ${profile}`;
        
        const startVec = new THREE.Vector3(...start);
        const endVec = new THREE.Vector3(...end);
        const length = startVec.distanceTo(endVec);
        const directionVec = new THREE.Vector3().subVectors(endVec, startVec).normalize();

        const placement3DId = this.generator.geometryFactory.createBeamPlacement(startVec, directionVec);
        const localPlacementId = this.generator.addLine('IFCLOCALPLACEMENT', ['$', `#${placement3DId}`]);
        const shapeRepId = this.generator.geometryFactory.createBeamShape(profile, length, placement3DId); // Reuse beam shape logic
        
        if (!shapeRepId) {
            console.error(`Failed to create shape for column ${element.id}`);
            return null;
        }
        
        const productDefShapeId = this.generator.addLine('IFCPRODUCTDEFINITIONSHAPE', [
            '$', '$', `(#${shapeRepId})`
        ]);
        
        console.log(`Created column product definition shape with ID: ${productDefShapeId}`);

        const columnId = this.generator.addLine('IFCCOLUMN', [
            guid,
            `#${this.generator.entityRefs.get('ownerHistory')}`,
            element.id,
            '$',
            objectType,
            `#${localPlacementId}`,
            `#${productDefShapeId}`,
            '$',
            '.COLUMN.'
        ]);

        // Add material association
        if (element.material) {
            this.generator.propertyManager.createMaterialAssociation(columnId, element.material);
        }
        
        // Add element properties
        this.generator.propertyManager.createElementProperties(columnId, element);

        console.log(`Created column ${element.id} with ID ${columnId}`);
        return columnId;
    }

    /**
     * Generates a plate definition in IFC  
     */
    generatePlate(element) {
        const { origin, width, height, thickness, ifcGlobalId, ifcObjectType } = element;
        if (!origin || !width || !height || !thickness) return null;

        const guid = ifcGlobalId || this.generator.constructor.generateIfcGuid();
        const objectType = ifcObjectType || `Plate ${width}x${height}x${thickness}`;
        
        const originVec = new THREE.Vector3(...origin);
        const placement3DId = this.generator.geometryFactory.createLocalPlacement(originVec, new THREE.Vector3(0, 0, 1));
        const localPlacementId = this.generator.addLine('IFCLOCALPLACEMENT', ['$', `#${placement3DId}`]);
        
        const shapeRepId = this.generator.geometryFactory.createPlateShape(width, height, thickness, placement3DId);
        
        if (!shapeRepId) {
            console.error(`Failed to create shape for plate ${element.id}`);
            return null;
        }
        
        const productDefShapeId = this.generator.addLine('IFCPRODUCTDEFINITIONSHAPE', [
            '$', '$', `(#${shapeRepId})`
        ]);
        
        console.log(`Created plate product definition shape with ID: ${productDefShapeId}`);

        const plateId = this.generator.addLine('IFCPLATE', [
            guid,
            `#${this.generator.entityRefs.get('ownerHistory')}`,
            element.id,
            '$', 
            objectType,
            `#${localPlacementId}`,
            `#${productDefShapeId}`,
            '$',
            '.USERDEFINED.'
        ]);

        // Add material association
        if (element.material) {
            this.generator.propertyManager.createMaterialAssociation(plateId, element.material);
        }
        
        // Add element properties
        this.generator.propertyManager.createElementProperties(plateId, element);

        console.log(`Created plate ${element.id} with ID ${plateId}`);
        return plateId;
    }
}

// Export for browser environment
window.IfcElementGenerator = IfcElementGenerator;