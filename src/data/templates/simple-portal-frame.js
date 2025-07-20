// Template: Simple portal frame structure
const simplePortalFrameTemplate = {
  "meta": {
    "templateId": "template-portal-frame-001",
    "templateName": "Simple Portal Frame",
    "description": "Basic portal frame structure for industrial buildings",
    "category": "Industrial",
    "complexity": "beginner",
    "estimatedElements": 8,
    "estimatedTime": "30-60 minutes",
    "units": "mm",
    "angleUnits": "degrees",
    "schemaVersion": "2.2",
    "thumbnail": "assets/templates/portal-frame.png"
  },

  "operations": [
    // Standard connection holes
    { "id": "op-bolt-01", "type": "hole", "shape": "circle", "diameter": 20,
      "start": [0, 50, 4000], "end": [0, 150, 4000] }
  ],

  "elements": [
    // Left column
    {
      "id": "col-left",
      "type": "column", 
      "profile": "HEA240",
      "material": "S355",
      "start": [0, 0, 0],
      "end": [0, 0, 4000],
      "rotation": 0
    },

    // Right column  
    {
      "id": "col-right",
      "type": "column",
      "profile": "HEA240", 
      "material": "S355",
      "start": [12000, 0, 0],
      "end": [12000, 0, 4000],
      "rotation": 0
    },

    // Main beam
    {
      "id": "beam-main",
      "type": "beam",
      "profile": "IPE300",
      "material": "S355", 
      "start": [0, 0, 4000],
      "end": [12000, 0, 4000],
      "rotation": 0,
      "operations": ["op-bolt-01"]
    }
  ],

  "grids": [
    {
      "id": "grid-simple",
      "type": "cartesian",
      "origin": [0, 0, 0],
      "xAxis": { "spacing": 6000, "count": 3, "labels": ["A", "B", "C"] },
      "yAxis": { "spacing": 6000, "count": 2, "labels": ["1", "2"] }
    }
  ],

  "views": [
    {
      "id": "view-front",
      "name": "Front View",
      "camera": {
        "position": [6000, -8000, 2000],
        "target": [6000, 0, 2000]
      }
    }
  ]
};

// Export for template system
window.simplePortalFrameTemplate = simplePortalFrameTemplate;