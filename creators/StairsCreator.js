/**
 * StairsCreator - Proof of Concept dla nowej architektury komponentów kompozytowych
 * Implementuje wzorzec "Dyrektor i Budowniczowie" z dynamicznymi segmentami
 */
class StairsCreator extends BaseCreator {
    constructor(creationManager) {
        super(creationManager);
    }

    static meta = {
        type: 'stairs',
        name: 'Schody',
        steps: 2 // WAŻNE: BaseCreator używa tej wartości!
    };

    static get metaExtended() {
        return {
            type: 'stairs',
            name: 'Schody',
            description: 'Komponent kompozytowy - schody z konfigurowalnymi segmentami',
            params: {
                defaultWidth: { type: 'number', default: 1000, label: 'Szerokość domyślna (mm)' },
                defaultStringerProfile: { type: 'select', default: 'IPE160', options: ['IPE160', 'IPE180', 'IPE200'], label: 'Profil policzka' },
                defaultTreadThickness: { type: 'number', default: 30, label: 'Grubość stopnia (mm)' },
                defaultRiserHeight: { type: 'number', default: 200, label: 'Wysokość podstopnia (mm)' },
                material: { type: 'select', default: 'S355JR', options: ['S235JR', 'S355JR', 'S420ML'], label: 'Materiał' }
            }
        };
    }

    /**
     * Konfiguracja UI dla tworzenia schodów
     */
    static getUI() {
        const meta = this.metaExtended;
        const params = meta.params;
        
        return [
            { id: 'defaultWidth', type: 'number', label: params.defaultWidth.label, value: params.defaultWidth.default },
            { id: 'defaultStringerProfile', type: 'profile', label: params.defaultStringerProfile.label, value: params.defaultStringerProfile.default },
            { id: 'defaultTreadThickness', type: 'number', label: params.defaultTreadThickness.label, value: params.defaultTreadThickness.default },
            { id: 'defaultRiserHeight', type: 'number', label: params.defaultRiserHeight.label, value: params.defaultRiserHeight.default },
            { id: 'material', type: 'material', label: params.material.label, value: params.material.default }
        ];
    }

    /**
     * Konfiguracja UI dla edycji istniejących schodów
     */
    static getEditUI(elementData) {
        return [
            { id: 'defaultWidth', type: 'number', label: 'Szerokość domyślna (mm)', value: elementData.defaultWidth || 1000 },
            { id: 'defaultStringerProfile', type: 'profile', label: 'Profil policzka', value: elementData.defaultStringerProfile || 'IPE160' },
            { id: 'defaultTreadThickness', type: 'number', label: 'Grubość stopnia (mm)', value: elementData.defaultTreadThickness || 30 },
            { id: 'defaultRiserHeight', type: 'number', label: 'Wysokość podstopnia (mm)', value: elementData.defaultRiserHeight || 200 },
            { id: 'material', type: 'material', label: 'Materiał', value: elementData.material || 'S355JR' }
        ];
    }

    /**
     * CENTRALNA METODA GENERUJĄCA - "Dyrektor"
     * Iteruje po segmentach i wywołuje odpowiednich "Budowniczych"
     */
    static generateChildData(componentData) {
        if (!componentData.segments || componentData.segments.length === 0) {
            // Domyślne schody: jeden bieg 14 stopni
            componentData.segments = [{
                type: 'flight',
                id: 'seg_1',
                params: { stepCount: 14, totalRise: 2800, run: 280 }
            }];
        }

        const children = {};
        const cursor = {
            position: new THREE.Vector3(...componentData.startPoint),
            direction: new THREE.Vector3(...componentData.startDirection).normalize(),
            upDirection: new THREE.Vector3(0, 1, 0)
        };

        let childIndex = 0;

        // Iteruj po segmentach i wywołaj odpowiednich "Budowniczych"
        componentData.segments.forEach((segment, segmentIndex) => {
            const segmentChildren = StairsCreator._generateSegment(
                segment, 
                cursor, 
                componentData, 
                `seg_${segmentIndex}`
            );

            // Dodaj dzieci segmentu do głównej listy
            Object.entries(segmentChildren.children).forEach(([key, childData]) => {
                children[`${segment.id}_${key}`] = childData;
                childIndex++;
            });

            // Aktualizuj kursor na podstawie końcowej pozycji segmentu
            cursor.position = segmentChildren.endCursor.position;
            cursor.direction = segmentChildren.endCursor.direction;
            cursor.upDirection = segmentChildren.endCursor.upDirection;
        });

        return children;
    }

    /**
     * "BUDOWNICZY" - generuje geometrię dla jednego segmentu
     */
    static _generateSegment(segment, startCursor, componentData, segmentPrefix) {
        switch (segment.type) {
            case 'flight':
                return StairsCreator._generateFlight(segment, startCursor, componentData, segmentPrefix);
            case 'landing_L':
                return StairsCreator._generateLandingL(segment, startCursor, componentData, segmentPrefix);
            case 'landing_straight':
                return StairsCreator._generateLandingStraight(segment, startCursor, componentData, segmentPrefix);
            default:
                console.warn(`Unknown stairs segment type: ${segment.type}`);
                return { children: {}, endCursor: startCursor };
        }
    }

    /**
     * BUDOWNICZY: Bieg schodów
     */
    static _generateFlight(segment, startCursor, componentData, segmentPrefix) {
        const { stepCount, totalRise, run } = segment.params;
        const stepHeight = totalRise / stepCount;
        const width = componentData.defaultWidth || 1000;
        
        const children = {};

        // Pozycja początku biegu
        const startPos = startCursor.position.clone();
        const direction = startCursor.direction.clone();
        const upDirection = startCursor.upDirection.clone();
        const rightDir = new THREE.Vector3().crossVectors(upDirection, direction).normalize();

        // Policzki (stringers)
        const leftStringerStart = startPos.clone().add(rightDir.clone().multiplyScalar(-width / 2));
        const rightStringerStart = startPos.clone().add(rightDir.clone().multiplyScalar(width / 2));
        
        const flightLength = stepCount * run;
        
        // POPRAWKA: Użycie wektorów zamiast .setY()
        const horizontalRunVector = direction.clone().multiplyScalar(flightLength);
        const verticalRiseVector = upDirection.clone().multiplyScalar(totalRise);
        
        const leftStringerEnd = leftStringerStart.clone().add(horizontalRunVector).add(verticalRiseVector);
        const rightStringerEnd = rightStringerStart.clone().add(horizontalRunVector).add(verticalRiseVector);

        children.leftStringer = {
            type: 'beam',
            profile: componentData.defaultStringerProfile || 'IPE160',
            material: componentData.material || 'S355JR',
            start: leftStringerStart.toArray(),
            end: leftStringerEnd.toArray(),
            orientation: 0
        };

        children.rightStringer = {
            type: 'beam',
            profile: componentData.defaultStringerProfile || 'IPE160',
            material: componentData.material || 'S355JR',
            start: rightStringerStart.toArray(),
            end: rightStringerEnd.toArray(),
            orientation: 0
        };

        // POPRAWKA: Obliczanie rotacji dla stopni
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.lookAt(new THREE.Vector3(0, 0, 0), direction, upDirection);
        const eulerRotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix, 'ZYX');
        const rotationValues = [
            THREE.MathUtils.radToDeg(eulerRotation.x),
            THREE.MathUtils.radToDeg(eulerRotation.y),
            THREE.MathUtils.radToDeg(eulerRotation.z)
        ];

        // Stopnie (treads)
        for (let i = 0; i < stepCount; i++) {
            // POPRAWKA: Użycie upDirection do obliczenia pozycji stopnia
            const stepHorizontalOffset = direction.clone().multiplyScalar((i * run) + (run / 2));
            const stepVerticalOffset = upDirection.clone().multiplyScalar((i + 1) * stepHeight);
            const treadCenter = startPos.clone().add(stepHorizontalOffset).add(stepVerticalOffset);
            
            children[`tread_${i}`] = {
                type: 'plate',
                material: componentData.material || 'S355JR',
                origin: treadCenter.toArray(),
                width: width,
                height: run,
                thickness: componentData.defaultTreadThickness || 30,
                // POPRAWKA: Zastosowanie obliczonej rotacji
                rotation: { 
                    type: "Euler", 
                    order: "ZYX", 
                    values: rotationValues,
                    units: "degrees" 
                }
            };
        }

        // Zaktualizuj kursor na koniec biegu
        const endPos = startPos.clone().add(horizontalRunVector).add(verticalRiseVector);
        const endCursor = {
            position: endPos,
            direction: direction.clone(),
            upDirection: upDirection.clone()
        };

        return { children, endCursor };
    }

    /**
     * BUDOWNICZY: Spocznik z obrotem w lewo (L-turn)
     */
    static _generateLandingL(segment, startCursor, componentData, segmentPrefix) {
        const { width, depth, turn } = segment.params;
        const landingWidth = width || componentData.defaultWidth || 1000;
        const landingDepth = depth || 1200;
        
        const children = {};
        
        const direction = startCursor.direction.clone();
        const upDirection = startCursor.upDirection.clone();

        // Płyta spocznika
        const landingCenter = startCursor.position.clone().add(direction.clone().multiplyScalar(landingDepth / 2));
        
        // POPRAWKA: Obliczanie rotacji dla spocznika
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.lookAt(new THREE.Vector3(0, 0, 0), direction, upDirection);
        const eulerRotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix, 'ZYX');

        children.landingPlate = {
            type: 'plate',
            material: componentData.material || 'S355JR',
            origin: landingCenter.toArray(),
            width: landingWidth,
            height: landingDepth,
            thickness: componentData.defaultTreadThickness || 30,
            rotation: { 
                type: "Euler", 
                order: "ZYX", 
                values: [
                    THREE.MathUtils.radToDeg(eulerRotation.x),
                    THREE.MathUtils.radToDeg(eulerRotation.y),
                    THREE.MathUtils.radToDeg(eulerRotation.z)
                ], 
                units: "degrees" 
            }
        };

        // Zaktualizuj kierunek na podstawie obrotu
        const newDirection = direction.clone();
        // POPRAWKA: Obrót wokół poprawnej osi "w górę"
        const turnAngle = (turn === 'left' ? Math.PI / 2 : -Math.PI / 2);
        newDirection.applyAxisAngle(upDirection, turnAngle);

        const endCursor = {
            position: startCursor.position.clone().add(startCursor.direction.clone().multiplyScalar(landingDepth)),
            direction: newDirection,
            upDirection: upDirection.clone()
        };

        return { children, endCursor };
    }

    /**
     * BUDOWNICZY: Spocznik prosty
     */
    static _generateLandingStraight(segment, startCursor, componentData, segmentPrefix) {
        const { length } = segment.params;
        const landingLength = length || 1200;
        const landingWidth = componentData.defaultWidth || 1000;
        
        const children = {};
        
        const direction = startCursor.direction.clone();
        const upDirection = startCursor.upDirection.clone();
        
        const landingCenter = startCursor.position.clone().add(direction.clone().multiplyScalar(landingLength / 2));
        
        // POPRAWKA: Obliczanie rotacji dla spocznika
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.lookAt(new THREE.Vector3(0, 0, 0), direction, upDirection);
        const eulerRotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix, 'ZYX');

        children.landingPlate = {
            type: 'plate',
            material: componentData.material || 'S355JR',
            origin: landingCenter.toArray(),
            width: landingWidth,
            height: landingLength,
            thickness: componentData.defaultTreadThickness || 30,
            rotation: { 
                type: "Euler", 
                order: "ZYX", 
                values: [
                    THREE.MathUtils.radToDeg(eulerRotation.x),
                    THREE.MathUtils.radToDeg(eulerRotation.y),
                    THREE.MathUtils.radToDeg(eulerRotation.z)
                ], 
                units: "degrees" 
            }
        };

        const endCursor = {
            position: startCursor.position.clone().add(direction.clone().multiplyScalar(landingLength)),
            direction: direction.clone(),
            upDirection: upDirection.clone()
        };

        return { children, endCursor };
    }

    /**
     * Metoda wykonania tworzenia schodów
     */
    execute() {
        console.log('StairsCreator.execute() called with points:', this.points);
        
        const startPoint = this.points[0];
        const endPoint = this.points[1];
        if (startPoint.distanceTo(endPoint) < 1.0) {
            console.log('Distance too short, aborting');
            return;
        }

        const params = this.creationManager.getParams();
        console.log('Creation params:', params);
        
        // Oblicz kierunek
        const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
        
        // Domyślne parametry komponentu schodów
        const componentParams = {
            componentType: 'stairs',
            startPoint: startPoint.toArray(),
            startDirection: direction.toArray(),
            defaultWidth: params.defaultWidth || 1000,
            defaultStringerProfile: params.defaultStringerProfile || 'IPE160',
            defaultTreadThickness: params.defaultTreadThickness || 30,
            defaultRiserHeight: params.defaultRiserHeight || 200,
            material: params.material || 'S355JR',
            
            // Przykładowy przepis na schody z dwoma biegami i spocznikiem
            segments: [
                {
                    type: 'flight',
                    id: 'seg_1',
                    params: { stepCount: 8, totalRise: 1600, run: 280 }
                },
                {
                    type: 'landing_L',
                    id: 'seg_2',
                    params: { turn: 'left', width: 1000, depth: 1200 }
                },
                {
                    type: 'flight',
                    id: 'seg_3',
                    params: { stepCount: 6, totalRise: 1200, run: 280 }
                }
            ]
        };

        // Wygeneruj dzieci
        const childData = StairsCreator.generateChildData(componentParams);
        const childElements = [];

        // Stwórz elementy podrzędne
        Object.entries(childData).forEach(([key, elementData]) => {
            let childElement;
            
            if (elementData.type === 'beam') {
                childElement = this.creationManager.createElement('beam', 
                    new THREE.Vector3(...elementData.start), 
                    new THREE.Vector3(...elementData.end), 
                    elementData.profile, 
                    elementData.material, 
                    elementData.orientation
                );
            } else if (elementData.type === 'plate') {
                childElement = this.creationManager.createElement('plate', {
                    origin: elementData.origin,
                    width: elementData.width,
                    height: elementData.height,
                    thickness: elementData.thickness,
                    material: elementData.material,
                    rotation: elementData.rotation
                });
            }
            
            if (childElement) {
                childElement.componentKey = key; // Stabilny klucz śledzenia
                childElements.push(childElement);
            }
        });

        // Stwórz komponent nadrzędny
        componentParams.children = childElements.map(el => el.id);
        const component = this.creationManager.createElement('component', componentParams);
        
        // Ustaw relacje parent-child
        childElements.forEach(child => {
            this.creationManager.updateElement(child.id, { parentId: component.id });
        });

        console.log('Stairs component created:', component);
    }

    /**
     * Metody obsługi punktów kontrolnych dla komponentów
     */
    static getControlPoints(elementData) {
        if (elementData.startPoint) {
            const startPoint = new THREE.Vector3(...elementData.startPoint);
            // Dla schodów, drugi punkt kontrolny można obliczyć na podstawie kierunku i długości
            const direction = new THREE.Vector3(...elementData.startDirection);
            const endPoint = startPoint.clone().add(direction.multiplyScalar(2000)); // Przykładowa długość
            
            return [
                { type: 'start', position: startPoint },
                { type: 'end', position: endPoint }
            ];
        }
        return [];
    }

    /**
     * Metoda update dziedziczona z BaseComponent
     */
    static update(componentData, elementManager) {
        BaseComponent.update(componentData, elementManager);
    }

    /**
     * Metoda recreate dla kopii
     */
    static recreate(componentData, em) {
        const childData = StairsCreator.generateChildData(componentData);
        const childElements = [];

        Object.entries(childData).forEach(([key, elementData]) => {
            let childElement;
            
            if (elementData.type === 'beam') {
                childElement = em.addNewBeam(
                    new THREE.Vector3(...elementData.start), 
                    new THREE.Vector3(...elementData.end), 
                    elementData.profile, 
                    elementData.material, 
                    elementData.orientation
                );
            } else if (elementData.type === 'plate') {
                childElement = em.addNewPlate({
                    origin: elementData.origin,
                    width: elementData.width,
                    height: elementData.height,
                    thickness: elementData.thickness,
                    material: elementData.material,
                    rotation: elementData.rotation
                });
            }
            
            if (childElement) {
                childElement.componentKey = key;
                childElements.push(childElement);
            }
        });

        const component = em.addNewComponent({
            ...componentData,
            children: childElements.map(el => el.id)
        });
        
        childElements.forEach(child => {
            em.updateElement(child.id, { parentId: component.id });
        });

        return component;
    }
} 