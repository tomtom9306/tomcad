class GoalPostCreator extends BaseCreator {
    static meta = {
        type: 'goalpost',
        name: 'Add Goal Post',
        steps: 2
    };

    static getUI() {
        return [
            { id: 'height', type: 'number', label: 'Height (mm)', value: 3000 },
            { id: 'columnProfile', type: 'profile', label: 'Column Profile', value: 'HEA160' },
            { id: 'beamProfile', type: 'profile', label: 'Beam Profile', value: 'IPE200' },
            { id: 'material', type: 'material', label: 'Material', value: 'S355JR' }
        ];
    }

    static getEditUI(elementData) {
        return [
            { id: 'height', type: 'number', label: 'Height (mm)', value: elementData.height },
            { id: 'columnProfile', type: 'profile', label: 'Column Profile', value: elementData.columnProfile },
            { id: 'beamProfile', type: 'profile', label: 'Beam Profile', value: elementData.beamProfile },
            { id: 'material', type: 'material', label: 'Material', value: elementData.material }
        ];
    }

    /**
     * NOWA METODA CENTRALNA
     * Oblicza "idealne" dane dla wszystkich elementów podrzędnych na podstawie parametrów grupy.
     * @param {object} groupData - Dane grupy (start, end, height, profile etc.).
     * @returns {object} - Obiekt zawierający "przepisy" na elementy podrzędne.
     */
    static generateChildData(groupData) {
        const startPoint = new THREE.Vector3(...groupData.start);
        const endPoint = new THREE.Vector3(...groupData.end);
        const { height, columnProfile, beamProfile, material } = groupData;

        const beamStart = startPoint.clone().add(new THREE.Vector3(0, height, 0));
        const beamEnd = endPoint.clone().add(new THREE.Vector3(0, height, 0));

        // Zwracamy obiekt, którego klucze odpowiadają elementom w `group.children`
        return {
            column1: {
                type: 'column',
                profile: columnProfile, material,
                start: startPoint.toArray(),
                // W kolumnie nie ma 'end', jest 'height' i pozycja
                height: height,
            },
            column2: {
                type: 'column',
                profile: columnProfile, material,
                start: endPoint.toArray(),
                height: height,
            },
            beam: {
                type: 'beam',
                profile: beamProfile, material, orientation: 0,
                start: beamStart.toArray(),
                end: beamEnd.toArray(),
            }
        };
    }

    execute() {
        const startPoint = this.points[0];
        const endPoint = this.points[1];
        if (startPoint.distanceTo(endPoint) < 1.0) return;

        const params = this.creationManager.getParams();
        const groupParams = { ...params, type: 'goalpost', start: startPoint.toArray(), end: endPoint.toArray() };

        const childData = GoalPostCreator.generateChildData(groupParams);
        const { column1, column2, beam } = childData;

        const col1El = this.creationManager.createElement('column', new THREE.Vector3(...column1.start), { height: column1.height, profile: column1.profile, material: column1.material });
        const col2El = this.creationManager.createElement('column', new THREE.Vector3(...column2.start), { height: column2.height, profile: column2.profile, material: column2.material });
        const beamEl = this.creationManager.createElement('beam', new THREE.Vector3(...beam.start), new THREE.Vector3(...beam.end), beam.profile, beam.material, beam.orientation);

        const group = this.creationManager.createElement('group', groupParams);
        const childrenIds = [col1El.id, col2El.id, beamEl.id];
        
        childrenIds.forEach(id => this.creationManager.updateElement(id, { parentId: group.id }));
        this.creationManager.updateElement(group.id, { children: childrenIds });
    }

    // `shouldRestart` returns false by default, which is the correct behavior for Goalpost.

    static update(group, elementManager) {
        if (!group || group.type !== 'goalpost' || !group.children || group.children.length < 3) return;

        const idealData = GoalPostCreator.generateChildData(group);
        const { column1, column2, beam } = idealData;
        const [col1Id, col2Id, beamId] = group.children;
        
        const applyUpdate = (elementId, idealElementData) => {
            const element = elementManager.getElement(elementId);
            if (!element) return;

            const startOffset = new THREE.Vector3(...(element.startOffset || [0, 0, 0]));
            
            // Kolumny mają tylko start, belki mają start i end
            if (idealElementData.type === 'column') {
                const finalStart = new THREE.Vector3(...idealElementData.start).add(startOffset);
                 elementManager.updateElement(elementId, {
                    ...idealElementData,
                    start: finalStart.toArray(),
                });
            } else { // belka
                const endOffset = new THREE.Vector3(...(element.endOffset || [0, 0, 0]));
                const finalStart = new THREE.Vector3(...idealElementData.start).add(startOffset);
                const finalEnd = new THREE.Vector3(...idealElementData.end).add(endOffset);
                elementManager.updateElement(elementId, {
                    ...idealElementData,
                    start: finalStart.toArray(),
                    end: finalEnd.toArray()
                });
            }
        };

        applyUpdate(col1Id, column1);
        applyUpdate(col2Id, column2);
        applyUpdate(beamId, beam);
    }

    static recreate(groupData, em) {
        const startPoint = new THREE.Vector3(...groupData.start);
        const endPoint = new THREE.Vector3(...groupData.end);
        const params = {
            height: groupData.height,
            columnProfile: groupData.columnProfile,
            beamProfile: groupData.beamProfile,
            material: groupData.material
        };

        const column1 = em.addNewColumn(startPoint, {
            height: params.height, profile: params.columnProfile, material: params.material
        });
        const column2 = em.addNewColumn(endPoint, {
            height: params.height, profile: params.columnProfile, material: params.material
        });
        const beamStart = startPoint.clone().add(new THREE.Vector3(0, params.height, 0));
        const beamEnd = endPoint.clone().add(new THREE.Vector3(0, params.height, 0));
        const beam = em.addNewBeam(beamStart, beamEnd,
            params.beamProfile, params.material, 0
        );

        const groupParams = { ...params, type: 'goalpost', start: startPoint.toArray(), end: endPoint.toArray() };
        const group = em.addNewGroup(groupParams);

        em.updateElement(column1.id, { parentId: group.id });
        em.updateElement(column2.id, { parentId: group.id });
        em.updateElement(beam.id, { parentId: group.id });
        em.updateElement(group.id, { children: [column1.id, column2.id, beam.id] });
        
        return group;
    }

    static calculateChildOffset(group, childElement, pointType, newPosition) {
        const idealData = this.generateChildData(group);
        const [col1Id, col2Id, beamId] = group.children;

        let idealElementData;
        if (childElement.id === col1Id) idealElementData = idealData.column1;
        else if (childElement.id === col2Id) idealElementData = idealData.column2;
        else if (childElement.id === beamId) idealElementData = idealData.beam;
        else return null;

        // Kolumny mają tylko punkt 'start', belki mają 'start' i 'end'
        if (idealElementData.type === 'column' && pointType !== 'start') {
             // Jeśli próbujemy przesunąć punkt końcowy kolumny, obliczamy offset inaczej.
             // Idealna pozycja końca kolumny to jej początek + wysokość.
             const idealStartPosition = new THREE.Vector3(...idealElementData.start);
             const idealEndPosition = idealStartPosition.clone().add(new THREE.Vector3(0, idealElementData.height, 0));
             // Zwracamy różnicę, ale tylko w komponencie Y, aby nie przesuwać kolumny na boki.
             const offset = newPosition.clone().sub(idealEndPosition);
             return new THREE.Vector3(0, offset.y, 0); // Zwróć tylko offset wysokości
        }

        const idealPointPosition = new THREE.Vector3(...idealElementData[pointType]);
        return newPosition.clone().sub(idealPointPosition);
    }
} 