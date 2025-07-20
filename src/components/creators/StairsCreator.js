/**
 * StairsCreator - Proof of Concept dla nowej architektury komponentów kompozytowych
 * Implementuje wzorzec "Dyrektor i Budowniczowie" z dynamicznymi segmentami
 * 
 * Refactored to use Single Responsibility Principle:
 * - StairsSegmentGenerators: Individual segment builders
 * - StairsGeometry: Geometric calculations and cursor management
 * - StairsCreator: Main API, execution, metadata, and UI configuration
 * 
 * Dependencies:
 * - StairsSegmentGenerators.js
 * - StairsGeometry.js
 * - BaseCreator.js
 * - BaseComponent.js
 */
window.StairsCreator = class StairsCreator extends BaseCreator {
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

        // Initialize cursor using geometry helper
        const cursor = window.StairsGeometry.initializeCursor(componentData);

        // Generate all segments using the segment generators
        const children = window.StairsSegmentGenerators.generateAllSegments(
            componentData.segments, 
            cursor, 
            componentData
        );

        return children;
    }


    /**
     * Metoda wykonania tworzenia schodów
     */
    execute() {
        console.log('StairsCreator.execute() called with points:', this.points);
        
        const startPoint = this.points[0];
        const endPoint = this.points[1];
        if (!window.StairsGeometry.validateDistance(startPoint, endPoint)) {
            console.log('Distance too short, aborting');
            return;
        }

        const params = this.creationManager.getParams();
        console.log('Creation params:', params);
        
        // Oblicz kierunek używając geometry helper
        const direction = window.StairsGeometry.calculateDirection(startPoint, endPoint);
        
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
        return window.StairsGeometry.getControlPoints(elementData);
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