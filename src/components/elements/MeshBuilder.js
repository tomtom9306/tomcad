class MeshBuilder {
    static createBeam(beamData) {
        const start = new THREE.Vector3(...beamData.start);
        const end = new THREE.Vector3(...beamData.end);
        
        let geometry;
        
        // Determine beam geometry based on profile using real steel profiles
        const profile = beamData.profile;
        const length = start.distanceTo(end);
        
        // Use the profile geometry function if available
        if (typeof createProfileGeometry === 'function') {
            geometry = createProfileGeometry(profile, length);
        } else {
            // Fallback to simple geometries
            if (profile.startsWith('HEA') || profile.startsWith('IPE')) {
                const height = GeometryUtils.getProfileDimension(profile, 'height');
                const width = GeometryUtils.getProfileDimension(profile, 'width');
                geometry = new THREE.BoxGeometry(width, height, length);
            } else if (profile.startsWith('RHS')) {
                const dimensions = GeometryUtils.parseRHSProfile(profile);
                geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, length);
            } else if (profile.startsWith('CHS')) {
                const diameter = GeometryUtils.parseCHSProfile(profile);
                geometry = new THREE.CylinderGeometry(diameter/2, diameter/2, length, 16);
            } else {
                geometry = new THREE.BoxGeometry(100, 100, length);
            }
        }
        
        // Material based on steel grade
        const color = GeometryUtils.getMaterialColor(beamData.material);
        const material = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position and orient the beam
        GeometryUtils.positionBeam(mesh, start, end, beamData);
        
        // Store reference
        mesh.userData = {
            elementId: beamData.id,
            elementData: beamData,
            originalMaterial: material.clone(),
            originalLength: length
        };
        
        return mesh;
    }

    static createPlate(plateData) {
        const geometry = new THREE.BoxGeometry(
            plateData.width, 
            plateData.height, 
            plateData.thickness
        );
        
        const color = GeometryUtils.getMaterialColor(plateData.material);
        const material = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.7
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position the plate
        mesh.position.set(...plateData.origin);
        
        // Apply rotation if specified
        if (plateData.rotation) {
            const rotation = plateData.rotation;
            if (rotation.type === 'Euler') {
                const values = rotation.values;
                if (rotation.units === 'degrees') {
                    mesh.rotation.set(
                        THREE.MathUtils.degToRad(values[0]),
                        THREE.MathUtils.degToRad(values[1]),
                        THREE.MathUtils.degToRad(values[2])
                    );
                }
            }
        }
        
        mesh.userData = {
            elementId: plateData.id,
            elementData: plateData,
            originalMaterial: material.clone()
        };
        
        return mesh;
    }
} 