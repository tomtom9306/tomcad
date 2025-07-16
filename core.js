/**
 * Core architectural components for TomCAD
 * Implements the unified Composite Component Architecture
 */

/**
 * ComponentRegistry - Centralny rejestr komponentów
 * Mapuje componentType na odpowiednie klasy kreatorów
 */
class ComponentRegistry {
    constructor() {
        this.creators = new Map();
        this.registerDefaultCreators();
    }

    registerDefaultCreators() {
        // Rejestrujemy istniejące kreatory jako komponenty
        this.register('beam', BeamCreator);
        this.register('column', ColumnCreator);
        this.register('goalpost', GoalPostCreator);
        this.register('boxframe', BoxFrameCreator);
        // Nowe komponenty kompozytowe
        this.register('stairs', StairsCreator); // Proof of concept zaimplementowany!
    }

    register(componentType, CreatorClass) {
        this.creators.set(componentType, CreatorClass);
    }

    getCreator(componentType) {
        return this.creators.get(componentType);
    }

    hasCreator(componentType) {
        return this.creators.has(componentType) && this.creators.get(componentType) !== null;
    }

    getAllCreators() {
        return Array.from(this.creators.values());
    }

    getAllTypes() {
        return Array.from(this.creators.keys());
    }
}

/**
 * BaseComponent - Klasa bazowa dla wszystkich komponentów kompozytowych
 * Implementuje uniwersalną logikę update z zachowaniem offsetów
 */
class BaseComponent {
    /**
     * Uniwersalna metoda update dla wszystkich komponentów
     * @param {object} componentData - Dane komponentu
     * @param {ElementManager} elementManager - Manager elementów
     */
    static update(componentData, elementManager) {
        if (!componentData || componentData.kind !== 'component') return;

        const CreatorClass = window.componentRegistry.getCreator(componentData.componentType);
        if (!CreatorClass || typeof CreatorClass.generateChildData !== 'function') {
            console.warn(`No generateChildData method for component type: ${componentData.componentType}`);
            return;
        }

        // 1. Generuj "idealną" geometrię
        const idealChildData = CreatorClass.generateChildData(componentData);
        
        // 2. Aktualizuj istniejące dzieci zachowując offsety
        this.updateChildrenWithOffsets(componentData, idealChildData, elementManager);
    }

    /**
     * Aktualizuje dzieci komponentu zachowując ich offsety
     */
    static updateChildrenWithOffsets(componentData, idealChildData, elementManager) {
        if (!componentData.children) return;

        const childKeys = Object.keys(idealChildData);
        
        childKeys.forEach((key, index) => {
            const childId = componentData.children[index];
            if (!childId) return;

            const child = elementManager.getElement(childId);
            const idealData = idealChildData[key];
            
            if (!child || !idealData) return;

            // Zachowaj offsety
            const startOffset = new THREE.Vector3(...(child.startOffset || [0, 0, 0]));
            const endOffset = new THREE.Vector3(...(child.endOffset || [0, 0, 0]));

            // Przygotuj finalne dane
            const finalData = { ...idealData };

            if (idealData.start) {
                const finalStart = new THREE.Vector3(...idealData.start).add(startOffset);
                finalData.start = finalStart.toArray();
            }

            if (idealData.end) {
                const finalEnd = new THREE.Vector3(...idealData.end).add(endOffset);
                finalData.end = finalEnd.toArray();
            }

            // Zachowaj componentKey dla stabilnego śledzenia
            finalData.componentKey = `${componentData.id}_${key}`;

            elementManager.updateElement(childId, finalData);
        });
    }

    /**
     * Oblicza offset dla ręcznej modyfikacji elementu podrzędnego
     */
    static calculateChildOffset(componentData, childElement, pointType, newPosition) {
        const CreatorClass = window.componentRegistry.getCreator(componentData.componentType);
        if (!CreatorClass || typeof CreatorClass.generateChildData !== 'function') {
            return null;
        }

        // Generuj idealną pozycję
        const idealChildData = CreatorClass.generateChildData(componentData);
        const childKey = this.findChildKeyById(componentData, childElement.id);
        
        if (!childKey || !idealChildData[childKey]) return null;

        const idealData = idealChildData[childKey];
        if (!idealData[pointType]) return null;

        const idealPosition = new THREE.Vector3(...idealData[pointType]);
        return new THREE.Vector3().subVectors(newPosition, idealPosition);
    }

    /**
     * Znajduje klucz dziecka na podstawie jego ID
     */
    static findChildKeyById(componentData, childId) {
        if (!componentData.children) return null;
        
        const index = componentData.children.indexOf(childId);
        if (index === -1) return null;

        // Dla uproszczenia używamy konwencji nazewnictwa z istniejących kreatorów
        const keyMap = {
            'goalpost': ['column1', 'column2', 'beam'],
            'boxframe': ['column1', 'column2', 'topBeam', 'bottomBeam']
        };

        const keys = keyMap[componentData.componentType];
        return keys ? keys[index] : `child_${index}`;
    }
}

// Globalna instancja rejestru komponentów
window.componentRegistry = new ComponentRegistry(); 