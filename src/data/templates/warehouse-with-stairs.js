// Template: Warehouse structure with stairs
const warehouseWithStairsTemplate = {
  "meta": {
    "templateId": "template-warehouse-stairs-001",
    "templateName": "Warehouse with Steel Stairs",
    "description": "Industrial warehouse structure featuring steel stairs and portal frame",
    "category": "Industrial",
    "complexity": "intermediate",
    "estimatedElements": 25,
    "estimatedTime": "2-3 hours",
    "units": "mm",
    "angleUnits": "degrees",
    "schemaVersion": "2.2",
    "thumbnail": "assets/templates/warehouse-stairs.png"
  },

  "operations": [
    // HEA200 – Upper holes Ø18
    { "id": "op-h-01", "type": "hole", "shape": "circle", "diameter": 18,
      "start": [   0,   50, 2900 ], "end": [   0,  150, 2900 ] },

    { "id": "op-h-02", "type": "hole", "shape": "circle", "diameter": 18,
      "start": [   0,   50, 2800 ], "end": [   0,  150, 2800 ] },

    // Holes Ø18 in horizontal plate 300×200×12
    { "id": "op-h-21", "type": "hole", "shape": "circle", "diameter": 18,
      "start": [ 200, 2750, 2975 ], "end": [ 200, 2750, 3025 ] },

    { "id": "op-h-22", "type": "hole", "shape": "circle", "diameter": 18,
      "start": [ 200, 2850, 2975 ], "end": [ 200, 2850, 3025 ] },

    // Slot 40×18 in diagonal beam IPE160
    { "id": "op-slot-01", "type": "slot", "length": 40, "width": 18,
      "start": [ 1768, 1718, 3000 ], "end": [ 1768, 1818, 3000 ] },

    // Cope 60×60 in base plate
    { "id": "op-cope-1", "type": "rectCut", "width": 60, "height": 60, "cornerRadius": 10,
      "start": [ -205,    0, 1280 ], "end": [  -95,    0, 1280 ] },

    // Circular hole Ø50 in base plate
    { "id": "op-cut-circle-01", "type": "hole", "shape": "circle", "diameter": 50,
      "start": [ -175,  -50, 1250 ], "end": [ -175,   50, 1250 ] }
  ],

  "elements": [
    // Main columns
    {
      "id": "elem-col-01",
      "type": "column",
      "profile": "HEA200",
      "material": "S355",
      "start": [0, 0, 0],
      "end": [0, 0, 3000],
      "rotation": 0,
      "operations": ["op-h-01", "op-h-02"]
    },

    // Base plate
    {
      "id": "elem-plate-base",
      "type": "plate",
      "material": "S355",
      "thickness": 20,
      "width": 300,
      "height": 300,
      "position": [-150, -150, 1250],
      "operations": ["op-cope-1", "op-cut-circle-01"]
    }
  ],

  "grids": [
    {
      "id": "grid-main",
      "type": "cartesian",
      "origin": [0, 0, 0],
      "xAxis": { "spacing": 6000, "count": 5, "labels": ["A", "B", "C", "D", "E"] },
      "yAxis": { "spacing": 8000, "count": 3, "labels": ["1", "2", "3"] }
    }
  ],

  "views": [
    {
      "id": "view-iso",
      "name": "Isometric",
      "camera": {
        "position": [5000, 5000, 5000],
        "target": [0, 0, 1500]
      }
    }
  ]
};

// Export for template system
window.warehouseWithStairsTemplate = warehouseWithStairsTemplate;