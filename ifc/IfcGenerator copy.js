// IFC Generator for TomCAD
// Generates IFC (Industry Foundation Classes) files from structure data

class IfcGenerator {
    constructor(structureData) {
        this.structure = structureData;
        this.lines = [];
        this.idCounter = 1;
        this.entityRefs = new Map(); // Store references to created entities
    }

    /**
     * Generates a unique IFC Global ID (Base64-URL encoded)
     * @returns {string} IFC Global ID
     */
    static generateIfcGuid() {
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        let guid = (s4() + s4() + "-" + s4() + "-4" + s4().substr(0,3) + "-" + s4() + "-" + s4() + s4() + s4()).toLowerCase();
        
        // Convert UUID to Base64-URL (simplified version)
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_$';
        return 'xxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, c => 
            base64Chars.charAt(Math.floor(Math.random() * 64))
        );
    }

    /**
     * Adds a new line to the IFC file and returns its ID.
     * @param {string} ifcEntityType - Type of IFC entity, e.g. 'IFCBEAM'
     * @param {any[]} params - Parameters for the entity
     * @returns {number} ID of the newly created line
     */
    addLine(ifcEntityType, params) {
        const id = this.idCounter++;
        const paramString = params.map(p => {
            if (p === null || p === undefined) return '$';
            if (typeof p === 'string') return `'${p}'`;
            if (typeof p === 'number' && !isNaN(p)) return p.toString();
            if (typeof p === 'number' && p.toString().startsWith('#')) return p.toString();
            if (Array.isArray(p)) return `(${p.join(',')})`;
            return p;
        }).join(',');

        this.lines.push(`#${id}= ${ifcEntityType.toUpperCase()}(${paramString});`);
        return id;
    }

    /**
     * Main function that generates the complete IFC file as string
     * @returns {string} Complete IFC file content
     */
    generate() {
        console.log('Starting IFC generation...');
        this.lines = [];
        this.idCounter = 1;
        this.entityRefs.clear();

        console.log(`Processing ${this.structure.elements?.length || 0} elements`);

        // Generate basic project structure
        this._generateProjectStructure();
        console.log('Project structure generated');
        
        // Generate elements
        this._generateElements();
        console.log('Elements generated');

        const header = this._generateHeader();
        const data = this._generateDataSection();

        console.log(`Generated IFC with ${this.lines.length} entities`);
        
        // Debug: log sample lines
        if (this.lines.length > 0) {
            console.log('Sample IFC lines:');
            console.log(this.lines.slice(0, 10).join('\n'));
            console.log('...');
            console.log(this.lines.slice(-10).join('\n'));
            
            // Find and log all shape-related entities
            const shapeLines = this.lines.filter(line => 
                line.includes('IFCRECTANGLEPROFILEDEF') || 
                line.includes('IFCEXTRUDEDAREASOLID') ||
                line.includes('IFCSHAPEREPRESENTATION') ||
                line.includes('IFCPRODUCTDEFINITIONSHAPE') ||
                line.includes('IFCBEAM') ||
                line.includes('IFCCOLUMN') ||
                line.includes('IFCPLATE')
            );
            console.log('Shape and element related lines:');
            shapeLines.forEach(line => console.log(line));
            
            // Count different types
            const counts = {
                profiles: this.lines.filter(l => l.includes('IFCRECTANGLEPROFILEDEF')).length,
                solids: this.lines.filter(l => l.includes('IFCEXTRUDEDAREASOLID')).length,
                shapes: this.lines.filter(l => l.includes('IFCSHAPEREPRESENTATION')).length,
                beams: this.lines.filter(l => l.includes('IFCBEAM')).length,
                columns: this.lines.filter(l => l.includes('IFCCOLUMN')).length,
                plates: this.lines.filter(l => l.includes('IFCPLATE')).length,
                materials: this.lines.filter(l => l.includes('IFCMATERIAL')).length,
                properties: this.lines.filter(l => l.includes('IFCPROPERTYSET')).length
            };
            console.log('IFC Entity counts:', counts);
        }
        
        return `${header}\n${data}\nENDSEC;\nEND-ISO-10303-21;`;
    }

    /**
     * Generates the IFC header section
     */
    _generateHeader() {
        const now = new Date();
        const timestamp = now.toISOString();
        
        return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'), '2;1');
FILE_NAME('tomcad_export.ifc', '${timestamp}', ('TomCAD User'), ('TomCAD Inc.'), '1.0', 'TomCAD', 'Authorization');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;`;
    }

    /**
     * Generates the DATA section
     */
    _generateDataSection() {
        return `DATA;\n${this.lines.join('\n')}`;
    }

    /**
     * Generates basic IFC project structure (Project, Site, Building, etc.)
     */
    _generateProjectStructure() {
        // Person and Organization (simplified)
        const personId = this.addLine('IFCPERSON', [
            '$', '$', 'TomCAD', 'User', '$', '$', '$', '$', '$'
        ]);
        
        const organizationId = this.addLine('IFCORGANIZATION', [
            '$', 'TomCAD Inc.', 'Software Development', '$', '$'
        ]);
        
        const personOrgId = this.addLine('IFCPERSONANDORGANIZATION', [
            `#${personId}`, `#${organizationId}`, '$'
        ]);
        
        // Application
        const applicationId = this.addLine('IFCAPPLICATION', [
            `#${organizationId}`, '1.0', 'TomCAD', 'TomCAD'
        ]);
        
        // Owner History
        const ownerHistoryId = this.addLine('IFCOWNERHISTORY', [
            `#${personOrgId}`, `#${applicationId}`, '$', '.ADDED.', '$', '$', '$', Math.floor(Date.now() / 1000)
        ]);
        this.entityRefs.set('ownerHistory', ownerHistoryId);

        // Units
        const lengthUnitId = this.addLine('IFCSIUNIT', [
            '*', '.LENGTHUNIT.', '$', '.MILLIMETRE.'
        ]);
        
        const areaUnitId = this.addLine('IFCSIUNIT', [
            '*', '.AREAUNIT.', '$', '.SQUARE_METRE.'
        ]);
        
        const volumeUnitId = this.addLine('IFCSIUNIT', [
            '*', '.VOLUMEUNIT.', '$', '.CUBIC_METRE.'
        ]);
        
        const angleUnitId = this.addLine('IFCSIUNIT', [
            '*', '.PLANEANGLEUNIT.', '$', '.RADIAN.'
        ]);
        
        const unitsId = this.addLine('IFCUNITASSIGNMENT', [
            `(#${lengthUnitId},#${areaUnitId},#${volumeUnitId},#${angleUnitId})`
        ]);

        // Coordinate system
        const originId = this.addLine('IFCCARTESIANPOINT', ['(0.,0.,0.)']);
        const axis3DId = this.addLine('IFCDIRECTION', ['(0.,0.,1.)']);
        const refDirection3DId = this.addLine('IFCDIRECTION', ['(1.,0.,0.)']);
        const placement3DId = this.addLine('IFCAXIS2PLACEMENT3D', [
            `#${originId}`, `#${axis3DId}`, `#${refDirection3DId}`
        ]);
        
        const contextId = this.addLine('IFCGEOMETRICREPRESENTATIONCONTEXT', [
            '$', 'Model', '3', '1.E-05', `#${placement3DId}`, '$'
        ]);
        this.entityRefs.set('context', contextId);
        
        console.log(`Created geometric representation context with ID: ${contextId}`);

        // Project
        const projectGuid = this.structure.meta?.ifcGlobalId || IfcGenerator.generateIfcGuid();
        const projectId = this.addLine('IFCPROJECT', [
            `'${projectGuid}'`, `#${ownerHistoryId}`, `'${this.structure.meta?.name || 'TomCAD Project'}'`, 
            '$', '$', '$', '$', `(#${contextId})`, `#${unitsId}`
        ]);
        this.entityRefs.set('project', projectId);

        // Site
        const siteGuid = IfcGenerator.generateIfcGuid();
        const siteId = this.addLine('IFCSITE', [
            `'${siteGuid}'`, `#${ownerHistoryId}`, 'Site', '$', '$', `#${placement3DId}`, '$', '$', '.ELEMENT.', '$', '$', '$', '$', '$'
        ]);
        this.entityRefs.set('site', siteId);

        // Building  
        const buildingGuid = IfcGenerator.generateIfcGuid();
        const buildingId = this.addLine('IFCBUILDING', [
            `'${buildingGuid}'`, `#${ownerHistoryId}`, 'Building', '$', '$', `#${placement3DId}`, '$', '$', '.ELEMENT.', '$', '$', '$'
        ]);
        this.entityRefs.set('building', buildingId);

        // Building Storey
        const storeyGuid = IfcGenerator.generateIfcGuid();
        const storeyId = this.addLine('IFCBUILDINGSTOREY', [
            `'${storeyGuid}'`, `#${ownerHistoryId}`, 'Ground Floor', '$', '$', `#${placement3DId}`, '$', '$', '.ELEMENT.', '0.'
        ]);
        this.entityRefs.set('storey', storeyId);

        // Create common materials
        this._createMaterials();
        
        // Spatial containment relationships
        this.addLine('IFCRELAGGREGATES', [
            `'${IfcGenerator.generateIfcGuid()}'`, `#${ownerHistoryId}`, '$', '$', `#${projectId}`, `(#${siteId})`
        ]);
        
        this.addLine('IFCRELAGGREGATES', [
            `'${IfcGenerator.generateIfcGuid()}'`, `#${ownerHistoryId}`, '$', '$', `#${siteId}`, `(#${buildingId})`
        ]);
        
        this.addLine('IFCRELAGGREGATES', [
            `'${IfcGenerator.generateIfcGuid()}'`, `#${ownerHistoryId}`, '$', '$', `#${buildingId}`, `(#${storeyId})`
        ]);
    }

    /**
     * Generates all elements from the structure data
     */
    _generateElements() {
        if (!this.structure.elements) return;

        const elementIds = [];
        
        this.structure.elements.forEach(element => {
            let elementId = null;
            
            console.log(`Processing element: ${element.id}, kind: ${element.kind}, ifcType: ${element.ifcType}`);
            
            if (element.ifcType === 'IfcBeam' || element.kind === 'beam') {
                elementId = this._generateBeam(element);
            } else if (element.ifcType === 'IfcColumn' || (element.kind === 'beam' && this._isColumn(element))) {
                elementId = this._generateColumn(element);
            } else if (element.ifcType === 'IfcPlate' || element.kind === 'plate') {
                elementId = this._generatePlate(element);
            }
            
            if (elementId) {
                elementIds.push(elementId);
                console.log(`Generated element ${element.id} with IFC ID #${elementId}`);
            } else {
                console.warn(`Failed to generate element: ${element.id}`);
            }
        });

        // Create containment relationship for all elements in the storey
        if (elementIds.length > 0 && this.entityRefs.has('storey')) {
            this.addLine('IFCRELCONTAINEDINSPATIALSTRUCTURE', [
                `'${IfcGenerator.generateIfcGuid()}'`, `#${this.entityRefs.get('ownerHistory')}`, 
                '$', '$', `(${elementIds.map(id => `#${id}`).join(',')})`, `#${this.entityRefs.get('storey')}`
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
    _generateBeam(element) {
        const { start, end, profile, ifcGlobalId, ifcObjectType } = element;
        if (!start || !end) return null;

        const guid = ifcGlobalId || IfcGenerator.generateIfcGuid();
        const objectType = ifcObjectType || `Beam ${profile}`;
        
        // Calculate beam properties
        const startVec = new THREE.Vector3(...start);
        const endVec = new THREE.Vector3(...end);
        const length = startVec.distanceTo(endVec);
        const directionVec = new THREE.Vector3().subVectors(endVec, startVec).normalize();

        // Create placement
        const placement3DId = this._createBeamPlacement(startVec, directionVec);
        const localPlacementId = this.addLine('IFCLOCALPLACEMENT', ['$', `#${placement3DId}`]);
        
        // Create shape representation
        const shapeRepId = this._createBeamShape(profile, length, placement3DId);
        
        if (!shapeRepId) {
            console.error(`Failed to create shape for beam ${element.id}`);
            return null;
        }
        
        const productDefShapeId = this.addLine('IFCPRODUCTDEFINITIONSHAPE', [
            '$', '$', `(#${shapeRepId})`
        ]);
        
        console.log(`Created beam product definition shape with ID: ${productDefShapeId}`);

        // Create the beam
        const beamId = this.addLine('IFCBEAM', [
            `'${guid}'`,
            `#${this.entityRefs.get('ownerHistory')}`,
            `'${element.id}'`,
            '$',
            `'${objectType}'`,
            `#${localPlacementId}`,
            `#${productDefShapeId}`,
            '$',
            '.BEAM.'
        ]);

        // Add material association
        if (element.material) {
            this._createMaterialAssociation(beamId, element.material);
        }
        
        // Add element properties
        this._createElementProperties(beamId, element);

        console.log(`Created beam ${element.id} with ID ${beamId}`);
        return beamId;
    }

    /**
     * Generates a column definition in IFC
     */
    _generateColumn(element) {
        const { start, end, profile, ifcGlobalId, ifcObjectType } = element;
        if (!start || !end) return null;

        const guid = ifcGlobalId || IfcGenerator.generateIfcGuid();
        const objectType = ifcObjectType || `Column ${profile}`;
        
        const startVec = new THREE.Vector3(...start);
        const endVec = new THREE.Vector3(...end);
        const length = startVec.distanceTo(endVec);
        const directionVec = new THREE.Vector3().subVectors(endVec, startVec).normalize();

        const placement3DId = this._createBeamPlacement(startVec, directionVec);
        const localPlacementId = this.addLine('IFCLOCALPLACEMENT', ['$', `#${placement3DId}`]);
        const shapeRepId = this._createBeamShape(profile, length, placement3DId); // Reuse beam shape logic
        
        if (!shapeRepId) {
            console.error(`Failed to create shape for column ${element.id}`);
            return null;
        }
        
        const productDefShapeId = this.addLine('IFCPRODUCTDEFINITIONSHAPE', [
            '$', '$', `(#${shapeRepId})`
        ]);
        
        console.log(`Created column product definition shape with ID: ${productDefShapeId}`);

        const columnId = this.addLine('IFCCOLUMN', [
            `'${guid}'`,
            `#${this.entityRefs.get('ownerHistory')}`,
            `'${element.id}'`,
            '$',
            `'${objectType}'`,
            `#${localPlacementId}`,
            `#${productDefShapeId}`,
            '$',
            '.COLUMN.'
        ]);

        // Add material association
        if (element.material) {
            this._createMaterialAssociation(columnId, element.material);
        }
        
        // Add element properties
        this._createElementProperties(columnId, element);

        console.log(`Created column ${element.id} with ID ${columnId}`);
        return columnId;
    }

    /**
     * Generates a plate definition in IFC  
     */
    _generatePlate(element) {
        const { origin, width, height, thickness, ifcGlobalId, ifcObjectType } = element;
        if (!origin || !width || !height || !thickness) return null;

        const guid = ifcGlobalId || IfcGenerator.generateIfcGuid();
        const objectType = ifcObjectType || `Plate ${width}x${height}x${thickness}`;
        
        const originVec = new THREE.Vector3(...origin);
        const placement3DId = this._createLocalPlacement(originVec, new THREE.Vector3(0, 0, 1));
        const localPlacementId = this.addLine('IFCLOCALPLACEMENT', ['$', `#${placement3DId}`]);
        
        const shapeRepId = this._createPlateShape(width, height, thickness, placement3DId);
        
        if (!shapeRepId) {
            console.error(`Failed to create shape for plate ${element.id}`);
            return null;
        }
        
        const productDefShapeId = this.addLine('IFCPRODUCTDEFINITIONSHAPE', [
            '$', '$', `(#${shapeRepId})`
        ]);
        
        console.log(`Created plate product definition shape with ID: ${productDefShapeId}`);

        const plateId = this.addLine('IFCPLATE', [
            `'${guid}'`,
            `#${this.entityRefs.get('ownerHistory')}`,
            `'${element.id}'`,
            '$', 
            `'${objectType}'`,
            `#${localPlacementId}`,
            `#${productDefShapeId}`,
            '$',
            '.USERDEFINED.'
        ]);

        // Add material association
        if (element.material) {
            this._createMaterialAssociation(plateId, element.material);
        }
        
        // Add element properties
        this._createElementProperties(plateId, element);

        console.log(`Created plate ${element.id} with ID ${plateId}`);
        return plateId;
    }

    /**
     * Creates a local placement for an element
     */
    _createLocalPlacement(position, direction) {
        // IFC units are now in millimeters, so no conversion needed
        const posM = {
            x: position.x,
            y: position.y, 
            z: position.z
        };
        
        const locationId = this.addLine('IFCCARTESIANPOINT', [
            `(${posM.x.toFixed(3)},${posM.y.toFixed(3)},${posM.z.toFixed(3)})`
        ]);
        
        const axisId = this.addLine('IFCDIRECTION', [
            `(${direction.x.toFixed(6)},${direction.y.toFixed(6)},${direction.z.toFixed(6)})`
        ]);
        
        const refDirectionId = this.addLine('IFCDIRECTION', ['(1.,0.,0.)']);
        
        const placement3DId = this.addLine('IFCAXIS2PLACEMENT3D', [
            `#${locationId}`, `#${axisId}`, `#${refDirectionId}`
        ]);
        
        return placement3DId;
    }

    /**
     * Creates a beam-specific placement where Z-axis is along the beam length
     */
    _createBeamPlacement(position, beamDirection) {
        // IFC units are now in millimeters, so no conversion needed
        const posM = {
            x: position.x,
            y: position.y, 
            z: position.z
        };
        
        const locationId = this.addLine('IFCCARTESIANPOINT', [
            `(${posM.x.toFixed(3)},${posM.y.toFixed(3)},${posM.z.toFixed(3)})`
        ]);
        
        // Z-axis is along the beam direction for proper extrusion
        const zAxisId = this.addLine('IFCDIRECTION', [
            `(${beamDirection.x.toFixed(6)},${beamDirection.y.toFixed(6)},${beamDirection.z.toFixed(6)})`
        ]);
        
        // X-axis: find a perpendicular direction
        let xDirection = new THREE.Vector3(1, 0, 0);
        if (Math.abs(beamDirection.dot(xDirection)) > 0.9) {
            // If beam is nearly parallel to X, use Y as reference
            xDirection = new THREE.Vector3(0, 1, 0);
        }
        xDirection = xDirection.cross(beamDirection).normalize();
        
        const xAxisId = this.addLine('IFCDIRECTION', [
            `(${xDirection.x.toFixed(6)},${xDirection.y.toFixed(6)},${xDirection.z.toFixed(6)})`
        ]);
        
        const placement3DId = this.addLine('IFCAXIS2PLACEMENT3D', [
            `#${locationId}`, `#${zAxisId}`, `#${xAxisId}`
        ]);
        
        return placement3DId;
    }

    /**
     * Creates a beam shape representation (simplified box)
     */
    _createBeamShape(profile, length, placement3DId) {
        // Get profile dimensions - no conversion needed as IFC units are now millimeters
        const profileDef = this._getProfileDimensions(profile);
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
        const profilePointId = this.addLine('IFCCARTESIANPOINT', ['(0.0,0.0)']);
        const profileDirId = this.addLine('IFCDIRECTION', ['(1.0,0.0)']);
        const profilePlacementId = this.addLine('IFCAXIS2PLACEMENT2D', [`#${profilePointId}`,`#${profileDirId}`]);

        // Create simplified rectangular profile (center at origin)
        const profileId = this.addLine('IFCRECTANGLEPROFILEDEF', [
            '.AREA.', `'${profile}'`, `#${profilePlacementId}`, widthMM.toFixed(3), heightMM.toFixed(3)
        ]);
        
        console.log(`Created profile definition with ID: ${profileId}`);

        // Create extruded area solid (simplified)
        const extrudedDirId = this.addLine('IFCDIRECTION', ['(0.,0.,1.)']);
        const extrudedSolidId = this.addLine('IFCEXTRUDEDAREASOLID', [
            `#${profileId}`, `#${placement3DId}`, `#${extrudedDirId}`, lengthMM.toFixed(3)
        ]);
        
        console.log(`Created extruded solid with ID: ${extrudedSolidId}`);

        // Validate context reference
        const contextId = this.entityRefs.get('context');
        if (!contextId) {
            console.error('Geometric representation context not found!');
            return null;
        }
        
        const shapeRepId = this.addLine('IFCSHAPEREPRESENTATION', [
            `#${contextId}`, 'Body', 'SweptSolid', `(#${extrudedSolidId})`
        ]);

        console.log(`Created shape representation with ID: ${shapeRepId}`);
        return shapeRepId;
    }

    /**
     * Creates a plate shape representation
     */
    _createPlateShape(width, height, thickness, placement3DId) {
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
        const profilePointId = this.addLine('IFCCARTESIANPOINT', ['(0.0,0.0)']);
        const profileDirId = this.addLine('IFCDIRECTION', ['(1.0,0.0)']);
        const profilePlacementId = this.addLine('IFCAXIS2PLACEMENT2D', [`#${profilePointId}`,`#${profileDirId}`]);

        // Create simplified rectangular profile (center at origin)
        const profileId = this.addLine('IFCRECTANGLEPROFILEDEF', [
            '.AREA.', '$', `#${profilePlacementId}`, widthMM.toFixed(3), heightMM.toFixed(3)
        ]);
        
        console.log(`Created plate profile definition with ID: ${profileId}`);

        // Create extruded area solid with proper placement
        const extrudedDirId = this.addLine('IFCDIRECTION', ['(0.,0.,1.)']);
        const extrudedSolidId = this.addLine('IFCEXTRUDEDAREASOLID', [
            `#${profileId}`, `#${placement3DId}`, `#${extrudedDirId}`, thicknessMM.toFixed(3)
        ]);

        console.log(`Created plate extruded solid with ID: ${extrudedSolidId}`);

        // Validate context reference
        const contextId = this.entityRefs.get('context');
        if (!contextId) {
            console.error('Geometric representation context not found for plate!');
            return null;
        }
        
        const shapeRepId = this.addLine('IFCSHAPEREPRESENTATION', [
            `#${contextId}`, 'Body', 'SweptSolid', `(#${extrudedSolidId})`
        ]);

        console.log(`Created plate shape representation with ID: ${shapeRepId}`);
        return shapeRepId;
    }

    /**
     * Gets profile dimensions based on profile name (simplified)
     */
    _getProfileDimensions(profile) {
        // This is a simplified version - in a real implementation you'd look up actual profile data
        const defaultDimensions = { width: 160, height: 200 };
        
        if (!profile || typeof profile !== 'string') {
            console.warn(`Invalid profile: ${profile}, using default dimensions`);
            return defaultDimensions;
        }
        
        let dimensions;
        
        if (profile.startsWith('IPE')) {
            const height = parseInt(profile.substring(3)) || 160;
            dimensions = { width: height * 0.55, height: height };
        } else if (profile.startsWith('HEA')) {
            const size = parseInt(profile.substring(3)) || 200;
            dimensions = { width: size, height: size };
        } else if (profile.startsWith('RHS')) {
            // Parse dimensions like "RHS60x4"
            const match = profile.match(/RHS(\d+)x/);
            const size = match ? parseInt(match[1]) : 60;
            dimensions = { width: size, height: size };
        } else if (profile.startsWith('CHS')) {
            // Parse dimensions like "CHS168x6.3"
            const match = profile.match(/CHS(\d+)/);
            const diameter = match ? parseInt(match[1]) : 100;
            dimensions = { width: diameter, height: diameter };
        } else {
            console.warn(`Unknown profile type: ${profile}, using default dimensions`);
            dimensions = defaultDimensions;
        }
        
        console.log(`Profile ${profile} -> dimensions: ${dimensions.width}mm x ${dimensions.height}mm`);
        
        // Validate dimensions
        if (dimensions.width <= 0 || dimensions.height <= 0) {
            console.error(`Invalid dimensions for profile ${profile}:`, dimensions);
            return defaultDimensions;
        }
        
        return dimensions;
    }

    /**
     * Creates common materials used in the project
     */
    _createMaterials() {
        const ownerHistoryId = this.entityRefs.get('ownerHistory');
        
        // Create S355JR material
        const s355MaterialId = this.addLine('IFCMATERIAL', ['S355JR']);
        this.entityRefs.set('material_S355JR', s355MaterialId);
        
        // Create S235JR material  
        const s235MaterialId = this.addLine('IFCMATERIAL', ['S235JR']);
        this.entityRefs.set('material_S235JR', s235MaterialId);
        
        console.log(`Created materials: S355JR (${s355MaterialId}), S235JR (${s235MaterialId})`);
    }

    /**
     * Creates material association for an element
     */
    _createMaterialAssociation(elementId, materialName) {
        const materialKey = `material_${materialName}`;
        const materialId = this.entityRefs.get(materialKey);
        
        if (!materialId) {
            console.warn(`Material ${materialName} not found, creating new one`);
            const newMaterialId = this.addLine('IFCMATERIAL', [materialName]);
            this.entityRefs.set(materialKey, newMaterialId);
            
            // Create association
            this.addLine('IFCRELASSOCIATESMATERIAL', [
                `'${IfcGenerator.generateIfcGuid()}'`,
                `#${this.entityRefs.get('ownerHistory')}`,
                '$', '$',
                `(#${elementId})`,
                `#${newMaterialId}`
            ]);
            
            return newMaterialId;
        } else {
            // Create association with existing material
            this.addLine('IFCRELASSOCIATESMATERIAL', [
                `'${IfcGenerator.generateIfcGuid()}'`,
                `#${this.entityRefs.get('ownerHistory')}`,
                '$', '$',
                `(#${elementId})`,
                `#${materialId}`
            ]);
            
            return materialId;
        }
    }

    /**
     * Creates properties for an element (profile information, etc.)
     */
    _createElementProperties(elementId, element) {
        const ownerHistoryId = this.entityRefs.get('ownerHistory');
        
        // Create property set for profile information
        const properties = [];
        
        // Profile property
        if (element.profile) {
            const profilePropId = this.addLine('IFCPROPERTYSINGLEVALUE', [
                'Profile', '$', `'${element.profile}'`, '$'
            ]);
            properties.push(profilePropId);
        }
        
        // Material property (additional to material association)
        if (element.material) {
            const materialPropId = this.addLine('IFCPROPERTYSINGLEVALUE', [
                'SteelGrade', '$', `'${element.material}'`, '$'
            ]);
            properties.push(materialPropId);
        }
        
        // Length/dimensions property
        if (element.start && element.end) {
            const startVec = new THREE.Vector3(...element.start);
            const endVec = new THREE.Vector3(...element.end);
            const length = startVec.distanceTo(endVec);
            const lengthPropId = this.addLine('IFCPROPERTYSINGLEVALUE', [
                'Length', '$', `'${length.toFixed(3)} mm'`, '$'
            ]);
            properties.push(lengthPropId);
        }
        
        // Dimensions for plates
        if (element.kind === 'plate') {
            if (element.width) {
                const widthPropId = this.addLine('IFCPROPERTYSINGLEVALUE', [
                    'Width', '$', `'${element.width.toFixed(3)} mm'`, '$'
                ]);
                properties.push(widthPropId);
            }
            
            if (element.height) {
                const heightPropId = this.addLine('IFCPROPERTYSINGLEVALUE', [
                    'Height', '$', `'${element.height.toFixed(3)} mm'`, '$'
                ]);
                properties.push(heightPropId);
            }
            
            if (element.thickness) {
                const thicknessPropId = this.addLine('IFCPROPERTYSINGLEVALUE', [
                    'Thickness', '$', `'${element.thickness.toFixed(3)} mm'`, '$'
                ]);
                properties.push(thicknessPropId);
            }
        }
        
        if (properties.length > 0) {
            // Create property set
            const propertySetId = this.addLine('IFCPROPERTYSET', [
                `'${IfcGenerator.generateIfcGuid()}'`,
                `#${ownerHistoryId}`,
                'TomCAD_Properties',
                '$',
                `(${properties.map(id => `#${id}`).join(',')})`
            ]);
            
            // Associate properties with element
            this.addLine('IFCRELDEFINESBYPROPERTIES', [
                `'${IfcGenerator.generateIfcGuid()}'`,
                `#${ownerHistoryId}`,
                '$', '$',
                `(#${elementId})`,
                `#${propertySetId}`
            ]);
            
            console.log(`Created properties for element ${element.id}: ${properties.length} properties`);
        }
    }
} 