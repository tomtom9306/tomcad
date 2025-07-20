class BoxFrameCreator extends BaseCreator {
    static meta = {
        type: 'boxframe',
        name: 'Add Box Frame',
        steps: 2
    };

    static getUI() {
        return [
            { id: 'height', type: 'number', label: 'Height (mm)', value: 3000 },
            { id: 'columnProfile', type: 'profile', label: 'Column Profile', value: 'HEA160' },
            { id: 'beamProfile', type: 'profile', label: 'Beam Profile', value: 'IPE160' },
            { id: 'material', type: 'material', label: 'Material', value: 'S355JR' },
            { id: 'alignColumns', type: 'checkbox', label: 'Align Columns to Beams', value: true }
        ];
    }

    static getEditUI(elementData) {
        return [
            { id: 'height', type: 'number', label: 'Height (mm)', value: elementData.height },
            { id: 'columnProfile', type: 'profile', label: 'Column Profile', value: elementData.columnProfile },
            { id: 'beamProfile', type: 'profile', label: 'Beam Profile', value: elementData.beamProfile },
            { id: 'material', type: 'material', label: 'Material', value: elementData.material },
            { id: 'alignColumns', type: 'checkbox', label: 'Align Columns to Beams', value: elementData.alignColumns }
        ];
    }

    /**
     * NOWA METODA CENTRALNA
     * Oblicza "idealne" dane dla wszystkich elementów podrzędnych na podstawie parametrów grupy.
     * Nie zajmuje się offsetami - tylko czystą, parametryczną geometrią.
     * @param {object} groupData - Dane grupy (start, end, height, profile etc.).
     * @returns {object} - Obiekt zawierający "przepisy" na elementy podrzędne.
     */
    static generateChildData(groupData) {
        const startPoint = new THREE.Vector3(...groupData.start);
        const endPoint = new THREE.Vector3(...groupData.end);
        const { height, columnProfile, beamProfile, material, alignColumns } = groupData;

        let columnOrientation = 0;
        if (alignColumns) {
            const directionVec = new THREE.Vector3(endPoint.x - startPoint.x, 0, endPoint.z - startPoint.z).normalize();
            const initialWebDir = new THREE.Vector3(0, 0, -1);
            if (directionVec.lengthSq() > 0.001) { // Unikaj błędów przy zerowej długości
                const quat = new THREE.Quaternion().setFromUnitVectors(initialWebDir, directionVec);
                const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
                columnOrientation = THREE.MathUtils.radToDeg(euler.y);
            }
        }

        const topBeamStart = startPoint.clone().add(new THREE.Vector3(0, height, 0));
        const topBeamEnd = endPoint.clone().add(new THREE.Vector3(0, height, 0));

        // Zwracamy obiekt, którego klucze odpowiadają elementom w `group.children`
        return {
            column1: {
                profile: columnProfile, material, orientation: columnOrientation,
                start: startPoint.toArray(),
                end: startPoint.clone().add(new THREE.Vector3(0, height, 0)).toArray(),
            },
            column2: {
                profile: columnProfile, material, orientation: columnOrientation,
                start: endPoint.toArray(),
                end: endPoint.clone().add(new THREE.Vector3(0, height, 0)).toArray(),
            },
            topBeam: {
                profile: beamProfile, material, orientation: 0,
                start: topBeamStart.toArray(),
                end: topBeamEnd.toArray(),
            },
            bottomBeam: {
                profile: beamProfile, material, orientation: 0,
                start: startPoint.toArray(),
                end: endPoint.toArray(),
            }
        };
    }

    execute() {
        const startPoint = this.points[0];
        const endPoint = this.points[1];
        if (startPoint.distanceTo(endPoint) < 1.0) return;

        // 1. Zbierz wszystkie parametry dla grupy
        const params = this.creationManager.getParams();
        const groupParams = { ...params, type: 'boxframe', start: startPoint.toArray(), end: endPoint.toArray() };
        
        // 2. Wygeneruj "przepis" na dzieci
        const childData = BoxFrameCreator.generateChildData(groupParams);
        const { column1, column2, topBeam, bottomBeam } = childData;

        // 3. Utwórz fizyczne elementy na podstawie przepisu
        const col1El = this.creationManager.createElement('beam', new THREE.Vector3(...column1.start), new THREE.Vector3(...column1.end), column1.profile, column1.material, column1.orientation);
        const col2El = this.creationManager.createElement('beam', new THREE.Vector3(...column2.start), new THREE.Vector3(...column2.end), column2.profile, column2.material, column2.orientation);
        const topBeamEl = this.creationManager.createElement('beam', new THREE.Vector3(...topBeam.start), new THREE.Vector3(...topBeam.end), topBeam.profile, topBeam.material, topBeam.orientation);
        const bottomBeamEl = this.creationManager.createElement('beam', new THREE.Vector3(...bottomBeam.start), new THREE.Vector3(...bottomBeam.end), bottomBeam.profile, bottomBeam.material, bottomBeam.orientation);

        // 4. Utwórz grupę i połącz elementy (ważna kolejność!)
        const group = this.creationManager.createElement('group', groupParams);
        const childrenIds = [col1El.id, col2El.id, topBeamEl.id, bottomBeamEl.id];
        
        childrenIds.forEach(id => this.creationManager.updateElement(id, { parentId: group.id }));
        this.creationManager.updateElement(group.id, { children: childrenIds });
    }

    static update(group, elementManager) {
        if (!group || group.type !== 'boxframe' || !group.children || group.children.length < 4) return;

        // 1. Pobierz IDEALNE dane geometryczne z centralnej metody
        const idealData = BoxFrameCreator.generateChildData(group);
        const { column1, column2, topBeam, bottomBeam } = idealData;

        // 2. Pobierz ID dzieci z grupy (zachowując kolejność z `execute`)
        const [col1Id, col2Id, topBeamId, bottomBeamId] = group.children;
        
        // Funkcja pomocnicza, aby uniknąć powtarzania kodu
        const applyUpdate = (elementId, idealElementData) => {
            const element = elementManager.getElement(elementId);
            if (!element) return;

            // Odczytaj zapisane offsety z elementu
            const startOffset = new THREE.Vector3(...(element.startOffset || [0, 0, 0]));
            const endOffset = new THREE.Vector3(...(element.endOffset || [0, 0, 0]));

            // Oblicz finalną pozycję: idealna pozycja + manualny offset
            const finalStart = new THREE.Vector3(...idealElementData.start).add(startOffset);
            const finalEnd = new THREE.Vector3(...idealElementData.end).add(endOffset);
            
            // Zaktualizuj element, przekazując idealne właściwości (profil, materiał) i finalną geometrię
            elementManager.updateElement(elementId, {
                ...idealElementData, // Przekaż profile, materiały etc.
                start: finalStart.toArray(),
                end: finalEnd.toArray()
            });
        };

        // 3. Zastosuj aktualizacje dla każdego dziecka
        applyUpdate(col1Id, column1);
        applyUpdate(col2Id, column2);
        applyUpdate(topBeamId, topBeam);
        applyUpdate(bottomBeamId, bottomBeam);
    }

    static recreate(groupData, em) {
        const startPoint = new THREE.Vector3(...groupData.start);
        const endPoint = new THREE.Vector3(...groupData.end);
        const params = {
            height: groupData.height,
            columnProfile: groupData.columnProfile,
            beamProfile: groupData.beamProfile,
            material: groupData.material,
            alignColumns: groupData.alignColumns
        };

        let columnOrientation = 0;
        if (params.alignColumns) {
            const directionVec = new THREE.Vector3(endPoint.x - startPoint.x, 0, endPoint.z - startPoint.z).normalize();
            const initialWebDir = new THREE.Vector3(0, 0, -1);
            const quat = new THREE.Quaternion().setFromUnitVectors(initialWebDir, directionVec);
            const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
            columnOrientation = THREE.MathUtils.radToDeg(euler.y);
        }

        const columnParams = {
            height: params.height, profile: params.columnProfile, material: params.material, orientation: columnOrientation
        };
        const column1 = em.addNewColumn(startPoint, columnParams);
        const column2 = em.addNewColumn(endPoint, columnParams);

        const topBeamStart = startPoint.clone().add(new THREE.Vector3(0, params.height, 0));
        const topBeamEnd = endPoint.clone().add(new THREE.Vector3(0, params.height, 0));
        const topBeam = em.addNewBeam(topBeamStart, topBeamEnd, params.beamProfile, params.material, 0);

        const bottomBeam = em.addNewBeam(startPoint.clone(), endPoint.clone(), params.beamProfile, params.material, 0);

        const groupParams = { ...params, type: 'boxframe', start: startPoint.toArray(), end: endPoint.toArray() };
        const group = em.addNewGroup(groupParams);

        em.updateElement(column1.id, { parentId: group.id });
        em.updateElement(column2.id, { parentId: group.id });
        em.updateElement(topBeam.id, { parentId: group.id });
        em.updateElement(bottomBeam.id, { parentId: group.id });
        em.updateElement(group.id, { children: [column1.id, column2.id, topBeam.id, bottomBeam.id] });
        
        return group;
    }

    static calculateChildOffset(group, childElement, pointType, newPosition) {
        // 1. Pobierz idealne pozycje dla obecnego stanu grupy
        const idealData = this.generateChildData(group);
        const [col1Id, col2Id, topBeamId, bottomBeamId] = group.children;

        let idealElementData;
        if (childElement.id === col1Id) idealElementData = idealData.column1;
        else if (childElement.id === col2Id) idealElementData = idealData.column2;
        else if (childElement.id === topBeamId) idealElementData = idealData.topBeam;
        else if (childElement.id === bottomBeamId) idealElementData = idealData.bottomBeam;
        else return null;

        // 2. Wybierz idealną pozycję punktu, który jest modyfikowany
        const idealPointPosition = new THREE.Vector3(...idealElementData[pointType]);

        // 3. Oblicz i zwróć offset jako różnicę między nową pozycją a idealną
        return newPosition.clone().sub(idealPointPosition);
    }
}