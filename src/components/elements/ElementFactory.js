class ElementFactory {
    constructor(elementManager) {
        this.em = elementManager;
    }

    /**
     * Generates a unique IFC Global ID (Base64-URL encoded)
     * @returns {string} IFC Global ID
     */
    _generateIfcGuid() {
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        let guid = (s4() + s4() + "-" + s4() + "-4" + s4().substr(0,3) + "-" + s4() + "-" + s4() + s4() + s4()).toLowerCase();
        
        // Convert UUID to Base64-URL (simplified version)
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_$';
        return 'xxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, c => 
            base64Chars.charAt(Math.floor(Math.random() * 64))
        );
    }

    addNewBeam(start, end, profile, material, orientation) {
        const newId = `element-${this.em.nextElementId++}`;

        const newElement = {
            id: newId,
            ifcGlobalId: this._generateIfcGuid(),
            ifcType: 'IfcBeam',
            ifcObjectType: `Beam ${profile}`,
            kind: 'beam',
            profile: profile,
            material: material,
            start: [start.x, start.y, start.z],
            end: [end.x, end.y, end.z],
            orientation: orientation,
            operationIds: [],
            startOffset: [0, 0, 0],
            endOffset: [0, 0, 0]
        };

        this.em.structureData.elements.push(newElement);
        const mesh = MeshBuilder.createBeam(newElement);
        this.em.beamObjects.set(newElement.id, mesh);
        this.em.scene.add(mesh);
        this.em.viewer.uiManager.elementListPanel.add(newElement);
        
        console.log('New beam added:', newElement);
        return newElement;
    }

    addNewColumn(basePoint, params) {
        const newId = `element-${this.em.nextElementId++}`;
        const start = basePoint;
        const end = basePoint.clone().add(new THREE.Vector3(0, params.height, 0));

        const newElement = {
            id: newId,
            ifcGlobalId: this._generateIfcGuid(),
            ifcType: 'IfcColumn',
            ifcObjectType: `Column ${params.profile}`,
            kind: 'beam',
            profile: params.profile,
            material: params.material,
            start: [start.x, start.y, start.z],
            end: [end.x, end.y, end.z],
            orientation: params.orientation || 0,
            operationIds: []
        };

        this.em.structureData.elements.push(newElement);
        const mesh = MeshBuilder.createBeam(newElement);
        this.em.beamObjects.set(newElement.id, mesh);
        this.em.scene.add(mesh);
        this.em.viewer.uiManager.elementListPanel.add(newElement);
        
        console.log('New column added:', newElement);
        return newElement;
    }

    addNewGroup(params = {}) {
        const newId = `group-${this.em.nextElementId++}`;
        const groupType = params.type || 'generic-group';
        const newElement = {
            id: newId,
            ifcGlobalId: this._generateIfcGuid(),
            ifcType: 'IfcElementAssembly',
            ifcObjectType: `Group ${groupType}`,
            kind: 'group',
            type: groupType,
            start: params.start || [0,0,0],
            end: params.end || [0,0,0],
            children: params.children || [],
            ...params
        };

        this.em.structureData.elements.push(newElement);
        // Groups don't have their own mesh, so we only update the UI list
        this.em.viewer.uiManager.elementListPanel.add(newElement);
        
        console.log('New group added:', newElement);
        return newElement;
    }

    addNewComponent(params = {}) {
        const newId = `component-${this.em.nextElementId++}`;
        const componentType = params.componentType || 'generic-component';
        
        // Map component types to appropriate IFC types
        let ifcType = 'IfcElementAssembly';
        if (componentType === 'stairs') {
            ifcType = 'IfcStair';
        } else if (componentType === 'railing') {
            ifcType = 'IfcRailing';
        }
        
        const newElement = {
            id: newId,
            ifcGlobalId: this._generateIfcGuid(),
            ifcType: ifcType,
            ifcObjectType: `Component ${componentType}`,
            kind: 'component',
            componentType: componentType,
            
            // Globalne parametry komponentu
            startPoint: params.startPoint || [0, 0, 0],
            startDirection: params.startDirection || [1, 0, 0],
            
            // Lista segmentów (dla komponentów kompozytowych jak schody)
            segments: params.segments || [],
            
            // Płaska lista ID wszystkich finalnych elementów podrzędnych
            children: params.children || [],
            
            // Inne parametry specyficzne dla typu komponentu
            ...params
        };

        this.em.structureData.elements.push(newElement);
        // Components don't have their own mesh, so we only update the UI list
        this.em.viewer.uiManager.elementListPanel.add(newElement);
        
        console.log('New component added:', newElement);
        return newElement;
    }

    addNewPlate(params = {}) {
        const newId = `plate-${this.em.nextElementId++}`;

        const origin = params.origin ? [params.origin.x, params.origin.y, params.origin.z] : [0, 0, 0];
        const width = params.width || 300;
        const height = params.height || 200;
        const thickness = params.thickness || 12;

        const newElement = {
            id: newId,
            ifcGlobalId: this._generateIfcGuid(),
            ifcType: 'IfcPlate',
            ifcObjectType: `Plate ${width}x${height}x${thickness}`,
            kind: 'plate',
            material: params.material || 'S355JR',
            origin: origin,
            rotation: { type: "Euler", order: "ZYX", values: [0, 0, 0], units: "degrees" },
            width: width,
            height: height,
            thickness: thickness,
            operationIds: []
        };

        this.em.structureData.elements.push(newElement);
        const mesh = MeshBuilder.createPlate(newElement);
        this.em.beamObjects.set(newElement.id, mesh);
        this.em.scene.add(mesh);
        this.em.viewer.uiManager.elementListPanel.add(newElement);

        console.log('New plate added:', newElement);
        return newElement;
    }
}