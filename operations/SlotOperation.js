class SlotOperation {
    constructor(operationData) {
        this.data = operationData;
    }

    createVisualization() {
        if (!this.data || this.data.type !== 'slot') {
            return null;
        }
        const startPoint = new THREE.Vector3(...this.data.start);
        const endPoint = new THREE.Vector3(...this.data.end);
        const width = this.data.width;
        const radius = width / 2;
        const length = startPoint.distanceTo(endPoint);
        const capsule = new THREE.Group();
        const material = new THREE.MeshBasicMaterial({
            color: 0xffa500,
            transparent: true,
            opacity: 0.7
        });
        const cylinderGeom = new THREE.CylinderGeometry(radius, radius, length, 16);
        const cylinder = new THREE.Mesh(cylinderGeom, material);
        const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
        cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        cylinder.position.copy(startPoint).add(direction.multiplyScalar(0.5));
        const sphereGeom = new THREE.SphereGeometry(radius, 16, 16);
        const startSphere = new THREE.Mesh(sphereGeom, material);
        startSphere.position.copy(startPoint);
        const endSphere = new THREE.Mesh(sphereGeom, material);
        endSphere.position.copy(endPoint);
        capsule.add(cylinder);
        capsule.add(startSphere);
        capsule.add(endSphere);
        capsule.userData.isOperationVisualization = true;
        capsule.userData.operationId = this.data.id;
        return capsule;
    }

    apply() {}
} 