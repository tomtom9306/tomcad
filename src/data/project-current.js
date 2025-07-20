// Current project data for TomCAD
window.currentProject = {
    "meta": {
      "projectId":   "72db0cb1-d8d7-4f93-a1f6-db21f3d9fd2e",
      "name":        "Schody – magazyn A",
      "createdUtc":  "2025-06-18T09:12:00Z",
      "units":       "mm",
      "angleUnits":  "degrees",
      "schemaVersion": "2.2",
      "orderId":     "PO-2025-001",
      "phase":       "1"
    },
  
    /* ───────────────────────── GLOBAL OPERATIONS (mandatory start & end) ───────────────────────── */
    "operations": [
  
      /* HEA200 – dwa górne otwory Ø18 */
      { "id": "op-h-01", "type": "hole", "shape": "circle", "diameter": 18,
        "start": [   0,   50, 2900 ], "end": [   0,  150, 2900 ] },
  
      { "id": "op-h-02", "type": "hole", "shape": "circle", "diameter": 18,
        "start": [   0,   50, 2800 ], "end": [   0,  150, 2800 ] },
  
      /* otwory Ø18 w płycie poziomej 300×200×12 */
      { "id": "op-h-21", "type": "hole", "shape": "circle", "diameter": 18,
        "start": [ 200, 2750, 2975 ], "end": [ 200, 2750, 3025 ] },
  
      { "id": "op-h-22", "type": "hole", "shape": "circle", "diameter": 18,
        "start": [ 200, 2850, 2975 ], "end": [ 200, 2850, 3025 ] },
  
      /* slot 40×18 w belce ukośnej IPE160 */
      { "id": "op-slot-01", "type": "slot", "length": 40, "width": 18,
        "start": [ 1768, 1718, 3000 ], "end": [ 1768, 1818, 3000 ] },
  
      /* cope 60×60 (z promieniem 10) w płycie bazowej */
      { "id": "op-cope-1", "type": "rectCut", "width": 60, "height": 60, "cornerRadius": 10,
        "start": [ -205,    0, 1280 ], "end": [  -95,    0, 1280 ] },
  
      /* kołowy otwór Ø50 w płycie bazowej */
      { "id": "op-cut-circle-01", "type": "hole", "shape": "circle", "diameter": 50,
        "start": [ -175,  -50, 1250 ], "end": [ -175,   50, 1250 ] },
  
      /* otwór Ø12 w łuku handrail (RHS60x4, wypukłość +Z) w odległości 500 mm po łuku */
      { "id": "op-h-11", "type": "hole", "shape": "circle", "diameter": 12,
        "start": [  500,    0,    0 ], "end": [  500,   50,    0 ] },
  
      /* otwór Ø12 w drugim łuku handrail (RHS60x4, wypukłość –Z) */
      { "id": "op-h-12", "type": "hole", "shape": "circle", "diameter": 12,
        "start": [ 1000,    0,    0 ], "end": [ 1000,   50,    0 ] }
    ],
  
    /* ───────────────────────── BOLT GROUPS ───────────────────────── */
    "boltGroups": [
      { "id": "BG-01",
        "spec": { "diameter": 18, "length": 70, "grade": "8.8", "head": "hex", "nuts": 1, "washers": 2 },
        "memberLinks": [
          { "elementId": "beam-01",  "operationId": "op-h-01" },
          { "elementId": "plate-01", "operationId": "op-h-21" }
        ] },
  
      { "id": "BG-02",
        "spec": { "diameter": 18, "length": 70, "grade": "8.8", "head": "hex", "nuts": 1, "washers": 2 },
        "memberLinks": [
          { "elementId": "beam-01",  "operationId": "op-h-02" },
          { "elementId": "plate-01", "operationId": "op-h-22" }
        ] }
    ],
  
    /* ───────────────────────── ELEMENTS (reference operationIds only) ───────────────────────── */
    "elements": [
  
      { "id": "beam-01", "ifcGlobalId": "3aF_qT1h5BvP_zGf8vEAC8", "ifcType": "IfcColumn", "ifcObjectType": "Column HEA200", "kind": "beam", "profile": "HEA200", "material": "S355JR",
        "start": [ 0, 0, 0 ],  "end": [ 0, 0, 3000 ],
        "operationIds": ["op-h-01","op-h-02"] },
  
      { "id": "beam-02", "ifcGlobalId": "2bG_rU2i6CwQ_0Hg9wFBD9", "ifcType": "IfcBeam", "ifcObjectType": "Beam IPE160", "kind": "beam", "profile": "IPE160", "material": "S355JR",
        "start": [ 0, 0, 3000 ], "end": [ 2500, 2500, 3000 ], "orientation": 90,
        "operationIds": ["op-slot-01"] },
  
            { "id": "curve-01", "ifcGlobalId": "4cH_sV3j7DxR_1Ii0xGCE0", "ifcType": "IfcBeam", "ifcObjectType": "Handrail RHS60x4", "kind": "beam", "profile": "RHS60x4", "material": "S235JR",
        "start": [ 0, 0, 0 ], "end": [ 2000, 0, 0 ],
        "arc": { "radius": 1500, "normal": [0,0,1], "side": "left" },
        "operationIds": ["op-h-11"] },

      { "id": "curve-02", "ifcGlobalId": "5dI_tW4k8EyS_2Jj1yHDF1", "ifcType": "IfcBeam", "ifcObjectType": "Handrail RHS60x4", "kind": "beam", "profile": "RHS60x4", "material": "S235JR",
        "start": [ 0, 0, 0 ], "end": [ 2000, 0, 0 ],
        "arc": { "radius": 1500, "normal": [0,0,1], "side": "right" },
        "operationIds": ["op-h-12"] },

      { "id": "curve-03", "ifcGlobalId": "6eJ_uX5l9FzT_3Kk2zIEG2", "ifcType": "IfcBeam", "ifcObjectType": "Curved Beam CHS76x3.2", "kind": "beam", "profile": "CHS76x3.2", "material": "S235JR",
        "start": [ 0, 0, 0 ], "end": [ 0, 0, 2500 ],
        "arc": { "radius": 2000, "normal": [0,1,0], "side": "left" },
        "operationIds": [] },
  
            { "id": "plate-01", "ifcGlobalId": "7fK_vY6m0G0U_4Ll3zJFH3", "ifcType": "IfcPlate", "ifcObjectType": "Plate 300x200x12", "kind": "plate", "material": "S355JR",
        "origin": [ 100, 2650, 3000 ],
        "rotation": { "type":"Euler","order":"ZYX","values":[0,90,0],"units":"degrees" },
        "width": 300, "height": 200, "thickness": 12,
        "operationIds": ["op-h-21","op-h-22"] },

      { "id": "plate-02", "ifcGlobalId": "8gL_wZ7n1H1V_5Mm4zKGI4", "ifcType": "IfcPlate", "ifcObjectType": "Base Plate 250x250x12", "kind": "plate", "material": "S355JR",
        "origin": [ -300, 0, 1250 ],
        "rotation": { "type":"Euler","order":"ZYX","values":[0,90,0],"units":"degrees" },
        "width": 250, "height": 250, "thickness": 12,
        "operationIds": ["op-cope-1","op-cut-circle-01"] },
  
      { "id": "tube-01", "ifcGlobalId": "9hM_xA8o2I2W_6Nn5zLHJ5", "ifcType": "IfcColumn", "ifcObjectType": "Tube Column CHS168x6.3", "kind": "beam", "profile": "CHS168x6.3", "material": "S355JR",
        "start": [ -1000, -1000, 0 ], "end": [ -1000, -1000, 3500 ],
        "operationIds": [] },

      // Przykład elementu parametrycznie powiązanego z siatką
      { "id": "parametric-beam-01", "ifcGlobalId": "0iN_yB9p3J3X_7Oo6zMIK6", "ifcType": "IfcBeam", "ifcObjectType": "Parametric Beam HEA200", "kind": "beam", "profile": "HEA200", "material": "S355JR",
        "start": [ 0, 0, 0 ], "end": [ 3000, 0, 0 ], // Te wartości będą recalculated
        "startAttachment": {
          "type": "gridIntersection",
          "xLabel": "1",
          "yLabel": "A", 
          "zLabel": "0"
        },
        "endAttachment": {
          "type": "gridIntersection",
          "xLabel": "2",
          "yLabel": "A",
          "zLabel": "0"
        },
        "startOffset": [0, 0, 0],
        "endOffset": [0, 0, 0],
        "operationIds": [] },

      // Drugi parametryczny element
      { "id": "parametric-beam-02", "ifcGlobalId": "1jO_zC0q4K4Y_8Pp7zNJL7", "ifcType": "IfcBeam", "ifcObjectType": "Parametric Beam IPE160", "kind": "beam", "profile": "IPE160", "material": "S355JR",
        "start": [ 0, 0, 3000 ], "end": [ 0, 4000, 3000 ],
        "startAttachment": {
          "type": "gridIntersection",
          "xLabel": "1",
          "yLabel": "A",
          "zLabel": "+3"
        },
        "endAttachment": {
          "type": "gridIntersection",
          "xLabel": "1",
          "yLabel": "B",
          "zLabel": "+3"
        },
        "startOffset": [0, 0, 0],
        "endOffset": [0, 0, 0],
        "operationIds": [] }
    ],

    "grids": [
    {
      "id": "grid-main",
      "type": "rectangular",

      /* global położenie i orientacja całego układu siatek */
      "origin":   [ -500, -500, 0 ],
      "rotation": { "type": "Euler", "order": "ZYX", "values": [0, 0, 0], "units": "degrees" },

      /* odległości kolejnych przerw (mm) – jak w Tekli: 3000+3000+3000+3000 */
      "xSpacings": [ 3000, 3000, 3000, 3000 ],
      "ySpacings": [ 4000, 4000, 4000 ],

      /* poziomy Z – wysokości kondygnacji */
      "zLevels": [ 0, 3000, 6000 ],

      /* etykiety osi – długość = liczba punktów (spacings + 1) */
      "xLabels": [ "1", "2", "3", "4", "5" ],
      "yLabels": [ "A", "B", "C", "D" ],
      "zLabels": [ "0", "+3", "+6" ],

      /* wysunięcia linii siatki poza skrajne osie (mm) */
      "xExtensions": [ 1000, 1000 ],
      "yExtensions": [ 1000, 1000 ],
      "zExtensions": [ 1000, 1000 ]
    }
  ]
};