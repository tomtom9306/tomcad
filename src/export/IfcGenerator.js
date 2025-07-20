// IFC Generator for TomCAD
// Generates IFC (Industry Foundation Classes) files from structure data

window.IfcGenerator = class IfcGenerator {
    constructor(structureData) {
        this.structure = structureData;
        this.lines = [];
        this.idCounter = 1;
        this.entityRefs = new Map(); // Store references to created entities
        
        // Initialize modular components
        this.propertyManager = new window.IfcPropertyManager(this);
        this.geometryFactory = new window.IfcGeometryFactory(this);
        this.projectBuilder = new window.IfcProjectBuilder(this);
        this.elementGenerator = new window.IfcElementGenerator(this);
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
            if (p === null || p === undefined || p === '$') return '$';
            if (typeof p === 'string') {
                // Do not quote references, lists, or enums
                if (p.startsWith('#') || (p.startsWith('(') && p.endsWith(')')) || (p.startsWith('.') && p.endsWith('.'))) {
                    return p;
                }
                // For all other strings, add quotes and escape internal quotes
                return `'${p.replace(/'/g, "''")}'`;
            }
            if (typeof p === 'number') {
                // Format floating point numbers to a fixed precision
                if (p % 1 !== 0) {
                    return p.toFixed(6);
                }
                return p.toString();
            }
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
        this.projectBuilder.generateProjectStructure();
        console.log('Project structure generated');
        
        // Generate elements
        this.elementGenerator.generateElements();
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






}

// Export for browser environment
window.IfcGenerator = IfcGenerator;