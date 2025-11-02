class InventoryPanel {
    constructor(viewer) {
        this.viewer = viewer;
        this.container = null;
        this.panel = this._createPanel();
    }

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'inventory-panel';
        panel.style.display = 'none';
        panel.style.position = 'absolute';
        panel.style.top = '70px';
        panel.style.right = '20px';
        panel.style.width = '360px';
        panel.style.maxHeight = '70vh';
        panel.style.overflowY = 'auto';
        panel.style.background = 'rgba(255, 255, 255, 0.95)';
        panel.style.color = '#111';
        panel.style.border = '1px solid rgba(0,0,0,0.1)';
        panel.style.borderRadius = '10px';
        panel.style.padding = '16px';
        panel.style.zIndex = '120';

        panel.innerHTML = `
            <h3 style="margin:0 0 12px 0;">Project Inventory</h3>
            <div class="inv-section" id="inv-bom">
              <h4 style="margin:8px 0; color:#0a5;">BOM</h4>
              <div class="inv-list" id="inv-bom-list"></div>
            </div>
            <div class="inv-section" id="inv-components" style="margin-top:12px;">
              <h4 style="margin:8px 0; color:#06c;">Components & Operations</h4>
              <div class="inv-subtitle" style="font-size:12px; opacity:0.7;">Creators</div>
              <div class="inv-list" id="inv-components-list"></div>
              <div class="inv-subtitle" style="font-size:12px; opacity:0.7; margin-top:8px;">Operations</div>
              <div class="inv-list" id="inv-operations-list"></div>
            </div>
            <div class="inv-section" id="inv-reference" style="margin-top:12px;">
              <h4 style="margin:8px 0; color:#a50;">Reference Geometry</h4>
              <div class="inv-list" id="inv-reference-list"></div>
            </div>
        `;

        return panel;
    }

    show() { this.panel.style.display = 'block'; }
    hide() { this.panel.style.display = 'none'; }
    toggle() { this.panel.style.display = (this.panel.style.display === 'none' ? 'block' : 'none'); }

    populate() {
        this._populateBOM();
        this._populateComponents();
        this._populateReference();
    }

    _populateBOM() {
        const list = this.panel.querySelector('#inv-bom-list');
        list.innerHTML = '';
        const data = this.viewer.structureData || {};
        const elements = (data.elements || []);
        const bolts = (data.boltGroups || []);

        const kindGroups = elements.reduce((acc, el) => {
            const key = el.kind || 'unknown';
            if (!acc[key]) acc[key] = [];
            acc[key].push(el);
            return acc;
        }, {});

        const addRow = (title, value, extra = '') => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.fontSize = '13px';
            row.style.padding = '4px 0';
            row.innerHTML = `<span>${title}</span><span><strong>${value}</strong> ${extra}</span>`;
            list.appendChild(row);
        };

        const beams = kindGroups['beam'] || [];
        const plates = kindGroups['plate'] || [];
        addRow('Beams', beams.length);
        addRow('Plates', plates.length);
        addRow('Bolts (groups)', bolts.length);

        // Detailed list (compact)
        const details = document.createElement('div');
        details.style.marginTop = '8px';
        details.style.fontSize = '12px';
        beams.forEach(b => {
            const div = document.createElement('div');
            div.textContent = `${b.id} • ${b.profile || ''} ${b.material ? '('+b.material+')' : ''}`.trim();
            details.appendChild(div);
        });
        plates.forEach(p => {
            const div = document.createElement('div');
            div.textContent = `${p.id} • plate`;
            details.appendChild(div);
        });
        bolts.forEach(bg => {
            const div = document.createElement('div');
            const spec = bg.spec ? `${bg.spec.diameter || ''}mm ${bg.spec.grade || ''}`.trim() : '';
            div.textContent = `${bg.id} • ${spec}`.trim();
            details.appendChild(div);
        });
        if (details.childElementCount) list.appendChild(details);
    }

    _populateComponents() {
        const compList = this.panel.querySelector('#inv-components-list');
        const opsList = this.panel.querySelector('#inv-operations-list');
        compList.innerHTML = '';
        opsList.innerHTML = '';

        const data = this.viewer.structureData || {};
        const elements = (data.elements || []);

        // List available creator types
        const creatorHeader = document.createElement('div');
        creatorHeader.style.fontWeight = '600';
        creatorHeader.textContent = 'Available Creators';
        compList.appendChild(creatorHeader);

        const creatorTypes = (window.componentRegistry && typeof window.componentRegistry.getAllTypes === 'function')
            ? window.componentRegistry.getAllTypes() : [];
        if (creatorTypes.length === 0) {
            const empty = document.createElement('div');
            empty.style.fontSize = '12px';
            empty.style.opacity = '0.7';
            empty.textContent = 'No creators registered';
            compList.appendChild(empty);
        } else {
            const line = document.createElement('div');
            line.style.fontSize = '12px';
            line.textContent = creatorTypes.join(', ');
            compList.appendChild(line);
        }

        // List present composite components (instances)
        const components = elements.filter(el => el.kind === 'group');
        const instHeader = document.createElement('div');
        instHeader.style.marginTop = '6px';
        instHeader.style.fontWeight = '600';
        instHeader.textContent = `Component Instances (${components.length})`;
        compList.appendChild(instHeader);
        if (components.length > 0) {
            components.forEach(c => {
                const div = document.createElement('div');
                div.style.fontSize = '12px';
                div.textContent = `${c.id} • ${c.type || 'component'}`;
                compList.appendChild(div);
            });
        }

        const operations = (data.operations || []);
        if (operations.length === 0) {
            const empty = document.createElement('div');
            empty.style.fontSize = '12px';
            empty.style.opacity = '0.7';
            empty.textContent = 'No operations present';
            opsList.appendChild(empty);
        } else {
            // Group operations by type
            const opGroups = operations.reduce((acc, op) => {
                if (!acc[op.type]) acc[op.type] = [];
                acc[op.type].push(op);
                return acc;
            }, {});
            Object.keys(opGroups).forEach(type => {
                const hdr = document.createElement('div');
                hdr.style.marginTop = '6px';
                hdr.style.fontWeight = '600';
                hdr.textContent = `${type} (${opGroups[type].length})`;
                opsList.appendChild(hdr);
                opGroups[type].forEach(op => {
                    const div = document.createElement('div');
                    div.style.fontSize = '12px';
                    div.textContent = `• ${op.id}`;
                    opsList.appendChild(div);
                });
            });
        }
    }

    _populateReference() {
        const refList = this.panel.querySelector('#inv-reference-list');
        refList.innerHTML = '';
        const data = this.viewer.structureData || {};
        const grids = (data.grids || []);

        if (grids.length === 0) {
            const empty = document.createElement('div');
            empty.style.fontSize = '12px';
            empty.style.opacity = '0.7';
            empty.textContent = 'No grids defined';
            refList.appendChild(empty);
        } else {
            grids.forEach(g => {
                const div = document.createElement('div');
                div.style.fontSize = '12px';
                const x = (g.xLabels || []).length;
                const y = (g.yLabels || []).length;
                const z = (g.zLevels || []).length;
                div.textContent = `${g.id} • axes: X${x}, Y${y}, Z${z}`;
                refList.appendChild(div);
            });
        }

        // Optional: list reference points/surfaces if present
        if (data.referencePoints && Array.isArray(data.referencePoints)) {
            const hdr = document.createElement('div');
            hdr.style.marginTop = '6px';
            hdr.style.fontWeight = '600';
            hdr.textContent = `Reference Points (${data.referencePoints.length})`;
            refList.appendChild(hdr);
        }
        if (data.referenceSurfaces && Array.isArray(data.referenceSurfaces)) {
            const hdr = document.createElement('div');
            hdr.style.marginTop = '6px';
            hdr.style.fontWeight = '600';
            hdr.textContent = `Reference Surfaces (${data.referenceSurfaces.length})`;
            refList.appendChild(hdr);
        }
    }
}

window.InventoryPanel = InventoryPanel;
