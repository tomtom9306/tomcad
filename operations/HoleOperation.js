class HoleOperation {
    constructor(opData) {
        this.data = opData;
    }

    createVisualization() {
        const { diameter, start, end } = this.data;
        if (!diameter || !start || !end) {
            console.warn(`HoleOperation '${this.data.id}' is missing required parameters (diameter, start, end).`);
            return null;
        }
        const startPoint = new THREE.Vector3(...start);
        const endPoint = new THREE.Vector3(...end);
        const length = startPoint.distanceTo(endPoint);
        const radius = diameter / 2;
        const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(startPoint).lerp(endPoint, 0.5);
        const up = new THREE.Vector3(0, 1, 0);
        const axis = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
        if (!(axis.y > 0.999 || axis.y < -0.999)) {
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, axis);
            mesh.quaternion.copy(quaternion);
        }
        return mesh;
    }

    apply() {}
} 