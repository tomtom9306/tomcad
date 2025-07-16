class BeamCreator extends BaseCreator {
    // --- Metadane ---
    static meta = {
        type: 'beam',
        name: 'Add Beam',
        steps: 2
    };

    static getUI() {
        return [
            { id: 'profile', type: 'profile', label: 'Profile', value: 'IPE200' },
            { id: 'material', type: 'material', label: 'Material', value: 'S355JR' },
            { id: 'orientation', type: 'number', label: 'Orientation', value: 0 }
        ];
    }

    // --- Implementacja metod abstrakcyjnych ---

    execute() {
        const startPoint = this.points[0];
        const endPoint = this.points[1];

        if (startPoint.distanceTo(endPoint) < 1.0) {
            console.warn("Beam is too short, cancelling subsequent creation.");
            // Nie restartuj, jeśli belka jest za krótka
            this.points = []; // Wyczyść punkty, żeby shouldRestart zadziałało poprawnie
            return;
        }

        const params = this.creationManager.getParams();
        this.creationManager.createElement(
            'beam',
            startPoint,
            endPoint,
            params.profile,
            params.material,
            params.orientation
        );
    }

    shouldRestart() {
        // Kontynuuj tworzenie belek, aż użytkownik anuluje (ESC)
        // Restart jest możliwy tylko jeśli mamy punkt startowy dla kolejnej belki
        return this.points.length > 0;
    }
} 