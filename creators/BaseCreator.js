// creators/BaseCreator.js

class BaseCreator {
    constructor(creationManager) {
        if (this.constructor === BaseCreator) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        this.creationManager = creationManager;
        this.state = null;
        this.points = [];
        this.tempLine = null;
    }

    // --- Metadane, które każda podklasa MUSI zdefiniować ---
    static meta = {
        type: 'base',
        name: 'Base Element',
        steps: 2 // Domyślnie 2 kliknięcia: start i koniec
    };

    // --- Logika, którą dziedziczą wszystkie kreatory ---

    start() {
        this.state = 'awaiting_point_1';
        this.creationManager.showUI(this.constructor);
        this.creationManager.setStatus(`Pick start point for the new ${this.constructor.meta.name}`);
        document.body.style.cursor = 'crosshair';
    }

    handleCanvasClick(point) {
        this.points.push(point.clone());
        const requiredSteps = this.constructor.meta.steps;

        if (this.points.length === 1 && requiredSteps > 1) {
            this.state = 'awaiting_point_2';
            this.creationManager.startAxisSnap(this.points[0]);
            this._createPreviewLine(point);
            this.creationManager.setStatus(`Pick end point for the new ${this.constructor.meta.name}`);
        }

        if (this.points.length >= requiredSteps) {
            this.execute(); // Wywołaj logikę tworzenia
            if (this.shouldRestart()) {
                this.points = [this.points[this.points.length - 1].clone()]; // Zacznij od nowa z ostatniego punktu
                 this.creationManager.endAxisSnap();
                 this.creationManager.startAxisSnap(this.points[0]);
                 this.updatePreview(point);
            } else {
                this.creationManager.cancelCreation();
            }
        }
    }

    updatePreview(currentPoint) {
        if (this.state === 'awaiting_point_2' && this.tempLine) {
            this.tempLine.geometry.setFromPoints([this.points[0], currentPoint]);
            this.tempLine.computeLineDistances();
            this.tempLine.geometry.attributes.position.needsUpdate = true;
        }
    }

    cancel() {
        this.state = null;
        this.points = [];
        this.tempLine = null;
    }

    get isCreating() {
        return this.state !== null;
    }

    _createPreviewLine(startPoint) {
        const material = new THREE.LineDashedMaterial({ color: 0xffaa4a, dashSize: 50, gapSize: 25 });
        const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, startPoint.clone()]);
        this.tempLine = new THREE.Line(geometry, material);
        this.tempLine.computeLineDistances();
        this.creationManager.addPreviewObject(this.tempLine);
    }

    // --- Metody do nadpisania przez klasy podrzędne ---

    /**
     * Zwraca konfigurację UI do edycji istniejącego elementu.
     * @param {object} elementData - Dane aktualnie edytowanego elementu.
     * @returns {Array|null} - Tablica obiektów konfiguracji UI lub null.
     */
    static getEditUI(elementData) {
        // Ta metoda powinna zostać zaimplementowana przez podklasy
        // aby dostarczyć UI do edycji specyficzne dla danego typu elementu.
        console.warn(`getEditUI not implemented for creator of type ${elementData.type}`);
        return null;
    }

    /**
     * Zwraca konfigurację punktów kontrolnych dla zaznaczonego elementu.
     * @param {object} elementData - Dane aktualnie zaznaczonego elementu.
     * @returns {Array|null} - Tablica obiektów { type: 'start' | 'end' | 'custom', position: THREE.Vector3 }.
     */
    static getControlPoints(elementData) {
        // Podklasy powinny to zaimplementować, aby zdefiniować swoje punkty kontrolne.
        // Domyślnie można spróbować zwrócić punkty dla prostych elementów.
        if (elementData.start && elementData.end) {
             return [
                { type: 'start', position: new THREE.Vector3(...elementData.start) },
                { type: 'end', position: new THREE.Vector3(...elementData.end) }
            ];
        }
        return [];
    }

    /**
     * Główna logika tworzenia elementu.
     */
    execute() {
        throw new Error("Method 'execute()' must be implemented.");
    }

    /**
     * Czy kreator ma kontynuować tworzenie po zakończeniu jednego elementu (np. belki)?
     */
    shouldRestart() {
        return false;
    }
} 