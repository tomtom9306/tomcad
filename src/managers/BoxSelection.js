// Box selection functionality for drag-to-select operations
window.BoxSelection = class BoxSelection {
    constructor(camera, renderer, elementManager, selectionBoxElement) {
        this.camera = camera;
        this.renderer = renderer;
        this.elementManager = elementManager;
        this.selectionBox = selectionBoxElement;
    }

    updateBox(startPoint, endPoint) {
        const x = Math.min(startPoint.x, endPoint.x);
        const y = Math.min(startPoint.y, endPoint.y);
        const width = Math.abs(startPoint.x - endPoint.x);
        const height = Math.abs(startPoint.y - endPoint.y);

        this.selectionBox.style.left = `${x}px`;
        this.selectionBox.style.top = `${y}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
        this.selectionBox.style.display = 'block';
    }

    hide() {
        this.selectionBox.style.display = 'none';
    }

    isVisible() {
        return this.selectionBox.style.display === 'block';
    }

    getSelectedObjects() {
        if (!this.isVisible()) return [];

        const selectedIds = [];
        const selectionRect = this.selectionBox.getBoundingClientRect();
        const rendererBounds = this.renderer.domElement.getBoundingClientRect();

        // Convert selection box from screen pixels to NDC
        const selectionBoxNDC = this.convertToNDC(selectionRect, rendererBounds);

        this.elementManager.beamObjects.forEach((mesh, id) => {
            const objectBox = new THREE.Box3().setFromObject(mesh);
            if (this.isObjectInSelectionBox(objectBox, selectionBoxNDC)) {
                selectedIds.push(id);
            }
        });

        return selectedIds;
    }

    convertToNDC(selectionRect, rendererBounds) {
        const selectionBoxNDC = new THREE.Box2();
        selectionBoxNDC.min.x = ((selectionRect.left - rendererBounds.left) / rendererBounds.width) * 2 - 1;
        selectionBoxNDC.max.x = ((selectionRect.right - rendererBounds.left) / rendererBounds.width) * 2 - 1;
        selectionBoxNDC.min.y = 1 - ((selectionRect.bottom - rendererBounds.top) / rendererBounds.height) * 2;
        selectionBoxNDC.max.y = 1 - ((selectionRect.top - rendererBounds.top) / rendererBounds.height) * 2;
        return selectionBoxNDC;
    }

    isObjectInSelectionBox(objectBox, selectionBoxNDC) {
        // Check if an object's screen-projected bounding box intersects with the selection rectangle
        const objectProjectedBox = new THREE.Box2();

        // Get the 8 corners of the world-space bounding box for r128 compatibility
        const min = objectBox.min;
        const max = objectBox.max;
        const corners = [
            new THREE.Vector3(min.x, min.y, min.z),
            new THREE.Vector3(min.x, min.y, max.z),
            new THREE.Vector3(min.x, max.y, min.z),
            new THREE.Vector3(min.x, max.y, max.z),
            new THREE.Vector3(max.x, min.y, min.z),
            new THREE.Vector3(max.x, min.y, max.z),
            new THREE.Vector3(max.x, max.y, min.z),
            new THREE.Vector3(max.x, max.y, max.z)
        ];

        let inFrustum = false;
        for (const corner of corners) {
            // Project the corner into screen space (NDC)
            corner.project(this.camera);
            // Check if at least one corner is in the camera's view frustum
            if (corner.z > -1 && corner.z < 1) {
                inFrustum = true;
                // Expand the projected box with this screen-space point
                objectProjectedBox.expandByPoint(corner);
            }
        }

        // If no part of the object is in the frustum, it can't be selected
        if (!inFrustum) {
            return false;
        }

        // Check for intersection between the object's projected box and the selection box
        return selectionBoxNDC.intersectsBox(objectProjectedBox);
    }
}