// IFC Property Manager - Handles material associations, property sets, and profile dimensions
// Part of TomCAD IFC Export functionality

window.IfcPropertyManager = class IfcPropertyManager {
    constructor(generator) {
        this.generator = generator;
    }

    /**
     * Creates common materials used in the project
     */
    createMaterials() {
        const ownerHistoryId = this.generator.entityRefs.get('ownerHistory');
        
        // Create S355JR material
        const s355MaterialId = this.generator.addLine('IFCMATERIAL', ['S355JR']);
        this.generator.entityRefs.set('material_S355JR', s355MaterialId);
        
        // Create S235JR material  
        const s235MaterialId = this.generator.addLine('IFCMATERIAL', ['S235JR']);
        this.generator.entityRefs.set('material_S235JR', s235MaterialId);
        
        console.log(`Created materials: S355JR (${s355MaterialId}), S235JR (${s235MaterialId})`);
    }

    /**
     * Creates material association for an element
     */
    createMaterialAssociation(elementId, materialName) {
        const materialKey = `material_${materialName}`;
        let materialId = this.generator.entityRefs.get(materialKey);
        
        if (!materialId) {
            console.warn(`Material ${materialName} not found, creating new one`);
            materialId = this.generator.addLine('IFCMATERIAL', [materialName]);
            this.generator.entityRefs.set(materialKey, materialId);
        }
        
        // Create association with existing or new material
        this.generator.addLine('IFCRELASSOCIATESMATERIAL', [
            this.generator.constructor.generateIfcGuid(),
            `#${this.generator.entityRefs.get('ownerHistory')}`,
            '$', '$',
            `(#${elementId})`,
            `#${materialId}`
        ]);
        
        return materialId;
    }

    /**
     * Creates properties for an element (profile information, etc.)
     */
    createElementProperties(elementId, element) {
        const ownerHistoryId = this.generator.entityRefs.get('ownerHistory');
        
        // Create property set for profile information
        const properties = [];
        
        // Profile property
        if (element.profile) {
            const profilePropId = this.generator.addLine('IFCPROPERTYSINGLEVALUE', [
                'Profile', '$', element.profile, '$'
            ]);
            properties.push(profilePropId);
        }
        
        // Material property (additional to material association)
        if (element.material) {
            const materialPropId = this.generator.addLine('IFCPROPERTYSINGLEVALUE', [
                'SteelGrade', '$', element.material, '$'
            ]);
            properties.push(materialPropId);
        }
        
        // Length/dimensions property
        if (element.start && element.end) {
            const startVec = new THREE.Vector3(...element.start);
            const endVec = new THREE.Vector3(...element.end);
            const length = startVec.distanceTo(endVec);
            const lengthPropId = this.generator.addLine('IFCPROPERTYSINGLEVALUE', [
                'Length', '$', `${length.toFixed(3)} mm`, '$'
            ]);
            properties.push(lengthPropId);
        }
        
        // Dimensions for plates
        if (element.kind === 'plate') {
            if (element.width) {
                const widthPropId = this.generator.addLine('IFCPROPERTYSINGLEVALUE', [
                    'Width', '$', `${element.width.toFixed(3)} mm`, '$'
                ]);
                properties.push(widthPropId);
            }
            
            if (element.height) {
                const heightPropId = this.generator.addLine('IFCPROPERTYSINGLEVALUE', [
                    'Height', '$', `${element.height.toFixed(3)} mm`, '$'
                ]);
                properties.push(heightPropId);
            }
            
            if (element.thickness) {
                const thicknessPropId = this.generator.addLine('IFCPROPERTYSINGLEVALUE', [
                    'Thickness', '$', `${element.thickness.toFixed(3)} mm`, '$'
                ]);
                properties.push(thicknessPropId);
            }
        }
        
        if (properties.length > 0) {
            // Create property set
            const propertySetId = this.generator.addLine('IFCPROPERTYSET', [
                this.generator.constructor.generateIfcGuid(),
                `#${ownerHistoryId}`,
                'TomCAD_Properties',
                '$',
                `(${properties.map(id => `#${id}`).join(',')})`
            ]);
            
            // Associate properties with element
            this.generator.addLine('IFCRELDEFINESBYPROPERTIES', [
                this.generator.constructor.generateIfcGuid(),
                `#${ownerHistoryId}`,
                '$', '$',
                `(#${elementId})`,
                `#${propertySetId}`
            ]);
            
            console.log(`Created properties for element ${element.id}: ${properties.length} properties`);
        }
    }

    /**
     * Gets profile dimensions based on profile name (simplified)
     */
    getProfileDimensions(profile) {
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
}

// Export for browser environment
window.IfcPropertyManager = IfcPropertyManager;