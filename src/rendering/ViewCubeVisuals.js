window.ViewCubeVisuals = class ViewCubeVisuals {
    constructor(pivot, scene) {
        this.pivot = pivot;
        this.scene = scene;
        this.axes = [];
        this.rollArrows = {};
        this.cube = null;
        this.highlightMesh = null;
    }

    createCube() {
        const createFaceMaterial = (text) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const context = canvas.getContext('2d');
            
            context.fillStyle = 'rgba(200, 200, 200, 0.7)';
            context.fillRect(0, 0, 128, 128);
            
            context.strokeStyle = 'rgba(0, 0, 0, 1)';
            context.lineWidth = 5;
            context.strokeRect(0, 0, 128, 128);

            context.fillStyle = 'rgba(0, 0, 0, 1)';
            context.font = 'bold 24px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, 64, 64);

            return new THREE.CanvasTexture(canvas);
        };

        const materials = [
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('RIGHT') }), // +X
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('LEFT') }),  // -X
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('TOP') }),   // +Y
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('BOTTOM') }),// -Y
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('FRONT') }), // +Z
            new THREE.MeshBasicMaterial({ map: createFaceMaterial('BACK') })   // -Z
        ];

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        this.cube = new THREE.Mesh(geometry, materials);
        this.pivot.add(this.cube);
        return this.cube;
    }

    createAxes() {
        const axisLength = 1.0;
        const headLength = 0.2;
        const headWidth = 0.1;
        const directions = [
            { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000, label: 'X' },
            { dir: new THREE.Vector3(0, 1, 0), color: 0x00ff00, label: 'Y' },
            { dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff, label: 'Z' }
        ];

        directions.forEach(({ dir, color, label }) => {
            const lineMat = new THREE.LineBasicMaterial({ color: color });
            const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(axisLength)]);
            const line = new THREE.Line(lineGeom, lineMat);
            line.renderOrder = 1; 
            this.pivot.add(line);

            const coneGeom = new THREE.ConeGeometry(headWidth, headLength, 8);
            const coneMat = new THREE.MeshBasicMaterial({ color: color });
            const cone = new THREE.Mesh(coneGeom, coneMat);
            cone.position.copy(dir).multiplyScalar(axisLength);
            cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            
            cone.userData = { type: 'axis', direction: dir.clone() };
            this.axes.push(cone);
            this.pivot.add(cone);

            const labelSprite = this.createLabelSprite(label, `rgb(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255})`);
            labelSprite.position.copy(dir).multiplyScalar(axisLength + 0.4);
            this.pivot.add(labelSprite);
        });

        return this.axes;
    }

    createRollArrows() {
        const arrowTexture = this.createArrowTexture();
    
        const baseMaterialSettings = { 
            map: arrowTexture, 
            transparent: true, 
            opacity: 0.8
        };
        const arrowScale = new THREE.Vector3(0.5, 0.5, 1);
        const positionOffset = 0.9;
    
        // Right arrow
        const rightMaterial = new THREE.SpriteMaterial(baseMaterialSettings);
        const rightArrow = new THREE.Sprite(rightMaterial);
        rightArrow.scale.copy(arrowScale);
        rightArrow.position.set(positionOffset, positionOffset, 0);
        rightArrow.userData = { type: 'roll-arrow', direction: Math.PI / 2 };
        this.rollArrows['right'] = rightArrow;
        this.scene.add(rightArrow);
    
        // Left arrow - using a separate material to rotate it
        const leftMaterial = new THREE.SpriteMaterial({
            ...baseMaterialSettings,
            rotation: Math.PI // Rotate 180 degrees around the center
        });
        const leftArrow = new THREE.Sprite(leftMaterial);
        leftArrow.scale.copy(arrowScale);
        leftArrow.position.set(-positionOffset, positionOffset, 0);
        leftArrow.userData = { type: 'roll-arrow', direction: -Math.PI / 2 };
        this.rollArrows['left'] = leftArrow;
        this.scene.add(leftArrow);

        return this.rollArrows;
    }

    createArrowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Define styles for better visibility
        ctx.fillStyle = 'rgba(240, 240, 240, 1)'; // Lighter fill
        ctx.strokeStyle = 'rgba(20, 20, 20, 1)';   // Dark outline
        ctx.lineWidth = 6;                         // A visible but not overly thick outline
        ctx.lineJoin = 'round';                    // For smoother corners on the stroke

        // Draw arrow path
        ctx.beginPath();
        ctx.moveTo(64, 18); // Adjusted to account for line width
        ctx.lineTo(95, 45);
        ctx.arc(64, 64, 42, 0.2 * Math.PI, -0.7 * Math.PI, true);
        ctx.lineTo(64, 18);
        
        // Render
        ctx.fill();
        ctx.stroke();

        return new THREE.CanvasTexture(canvas);
    }

    createLabelSprite(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = color;
        context.fillText(text, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.4, 0.4, 1);
        return sprite;
    }

    createHighlightMesh() {
        // A BoxGeometry is more versatile for highlighting faces, edges, and corners
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            opacity: 0.3,
            transparent: true
        });
        this.highlightMesh = new THREE.Mesh(geometry, material);
        this.highlightMesh.visible = false;
        this.pivot.add(this.highlightMesh);
        return this.highlightMesh;
    }

    getCube() {
        return this.cube;
    }

    getAxes() {
        return this.axes;
    }

    getRollArrows() {
        return this.rollArrows;
    }

    getHighlightMesh() {
        return this.highlightMesh;
    }
}