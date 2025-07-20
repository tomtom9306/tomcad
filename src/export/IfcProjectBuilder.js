// IFC Project Builder - Handles project hierarchy creation (project, site, building, storey)
// Part of TomCAD IFC Export functionality

window.IfcProjectBuilder = class IfcProjectBuilder {
    constructor(generator) {
        this.generator = generator;
    }

    /**
     * Generates basic IFC project structure (Project, Site, Building, etc.)
     */
    generateProjectStructure() {
        // Person and Organization (simplified)
        const personId = this.generator.addLine('IFCPERSON', [
            '$', '$', 'TomCAD', 'User', '$', '$', '$', '$', '$'
        ]);
        
        const organizationId = this.generator.addLine('IFCORGANIZATION', [
            '$', 'TomCAD Inc.', 'Software Development', '$', '$'
        ]);
        
        const personOrgId = this.generator.addLine('IFCPERSONANDORGANIZATION', [
            `#${personId}`, `#${organizationId}`, '$'
        ]);
        
        // Application
        const applicationId = this.generator.addLine('IFCAPPLICATION', [
            `#${organizationId}`, '1.0', 'TomCAD', 'TomCAD'
        ]);
        
        // Owner History
        const ownerHistoryId = this.generator.addLine('IFCOWNERHISTORY', [
            `#${personOrgId}`, `#${applicationId}`, '$', '.ADDED.', '$', '$', '$', Math.floor(Date.now() / 1000)
        ]);
        this.generator.entityRefs.set('ownerHistory', ownerHistoryId);

        // Units
        const lengthUnitId = this.generator.addLine('IFCSIUNIT', [
            '*', '.LENGTHUNIT.', '$', '.MILLIMETRE.'
        ]);
        
        const areaUnitId = this.generator.addLine('IFCSIUNIT', [
            '*', '.AREAUNIT.', '$', '.SQUARE_METRE.'
        ]);
        
        const volumeUnitId = this.generator.addLine('IFCSIUNIT', [
            '*', '.VOLUMEUNIT.', '$', '.CUBIC_METRE.'
        ]);
        
        const angleUnitId = this.generator.addLine('IFCSIUNIT', [
            '*', '.PLANEANGLEUNIT.', '$', '.RADIAN.'
        ]);
        
        const unitsId = this.generator.addLine('IFCUNITASSIGNMENT', [
            `(#${lengthUnitId},#${areaUnitId},#${volumeUnitId},#${angleUnitId})`
        ]);

        // Coordinate system
        const originId = this.generator.addLine('IFCCARTESIANPOINT', ['(0.,0.,0.)']);
        const axis3DId = this.generator.addLine('IFCDIRECTION', ['(0.,0.,1.)']);
        const refDirection3DId = this.generator.addLine('IFCDIRECTION', ['(1.,0.,0.)']);
        const placement3DId = this.generator.addLine('IFCAXIS2PLACEMENT3D', [
            `#${originId}`, `#${axis3DId}`, `#${refDirection3DId}`
        ]);
        
        const contextId = this.generator.addLine('IFCGEOMETRICREPRESENTATIONCONTEXT', [
            '$', 'Model', 3, 1.0E-5, `#${placement3DId}`, '$'
        ]);
        this.generator.entityRefs.set('context', contextId);
        
        console.log(`Created geometric representation context with ID: ${contextId}`);

        // Project
        const projectGuid = this.generator.structure.meta?.ifcGlobalId || this.generator.constructor.generateIfcGuid();
        const projectId = this.generator.addLine('IFCPROJECT', [
            projectGuid, `#${ownerHistoryId}`, this.generator.structure.meta?.name || 'TomCAD Project', 
            '$', '$', '$', '$', `(#${contextId})`, `#${unitsId}`
        ]);
        this.generator.entityRefs.set('project', projectId);

        // Site
        const siteGuid = this.generator.constructor.generateIfcGuid();
        const siteId = this.generator.addLine('IFCSITE', [
            siteGuid, `#${ownerHistoryId}`, 'Site', '$', '$', `#${placement3DId}`, '$', '$', '.ELEMENT.', '$', '$', '$', '$', '$'
        ]);
        this.generator.entityRefs.set('site', siteId);

        // Building  
        const buildingGuid = this.generator.constructor.generateIfcGuid();
        const buildingId = this.generator.addLine('IFCBUILDING', [
            buildingGuid, `#${ownerHistoryId}`, 'Building', '$', '$', `#${placement3DId}`, '$', '$', '.ELEMENT.', '$', '$', '$'
        ]);
        this.generator.entityRefs.set('building', buildingId);

        // Building Storey
        const storeyGuid = this.generator.constructor.generateIfcGuid();
        const storeyId = this.generator.addLine('IFCBUILDINGSTOREY', [
            storeyGuid, `#${ownerHistoryId}`, 'Ground Floor', '$', '$', `#${placement3DId}`, '$', '$', '.ELEMENT.', 0.0
        ]);
        this.generator.entityRefs.set('storey', storeyId);

        // Create common materials
        this.generator.propertyManager.createMaterials();
        
        // Spatial containment relationships
        this.generator.addLine('IFCRELAGGREGATES', [
            this.generator.constructor.generateIfcGuid(), `#${ownerHistoryId}`, '$', '$', `#${projectId}`, `(#${siteId})`
        ]);
        
        this.generator.addLine('IFCRELAGGREGATES', [
            this.generator.constructor.generateIfcGuid(), `#${ownerHistoryId}`, '$', '$', `#${siteId}`, `(#${buildingId})`
        ]);
        
        this.generator.addLine('IFCRELAGGREGATES', [
            this.generator.constructor.generateIfcGuid(), `#${ownerHistoryId}`, '$', '$', `#${buildingId}`, `(#${storeyId})`
        ]);
    }
}

// Export for browser environment
window.IfcProjectBuilder = IfcProjectBuilder;