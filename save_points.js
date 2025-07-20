// Script to save points 1 and 2 from documentation to text file

const fs = require('fs');
const path = require('path');

// Section 1: What is TomCAD? (Complete section)
const section1 = `## What is TomCAD?

TomCAD is a modern **client-side web application** for designing steel structures and architectural steelwork. It runs entirely in web browsers without requiring any server-side installation or cloud dependencies.`;

// Section 2: Mission & Vision (Complete section)
const section2 = `## Mission & Vision

TomCAD aims to **compete directly** with industry-leading structural steel design software including:

- **Tekla Structures**
- **Advance Steel** 
- **SDS/2**
- **StruCad**
- **Bocad**

Our goal is to create software that combines the **best features** from multiple CAD systems while maintaining **exceptional ease of use**.

### Business Goals & Market Strategy

**Affordable Professional Software**
- **Pricing**: £30-50 per month subscription model
- **Target**: Achieve larger user base than Tekla Structures through accessibility
- **Philosophy**: Lower price barrier enables broader adoption across steel industry

**Mass Market Approach**
Unlike expensive competitors (Tekla ~£600/month), TomCAD's affordable pricing makes it viable for:
- **Small fabrication workshops** that cannot justify expensive CAD licenses
- **Multiple license purchases** - easy to buy 5-10 licenses for team workflows
- **Occasional users** who don't do extensive detailing but need professional tools
- **Mixed discipline teams** working on steel projects

**Current Users**: Steel detailers and fabrication teams

**Future Users** (as platform expands):
- **Structural Engineers**: Analysis and preliminary design
- **Architects**: Architectural steelwork integration  
- **Estimators**: Quantity takeoffs and cost analysis
- **Installation Teams**: Field reference and assembly guidance
- **Machine Operators**: CNC programming and workshop documentation

**Long-term Vision**: Complete steel construction business management platform - from initial design through fabrication to installation, all in one subscription. Replace multiple expensive software solutions: CAD programs, estimating software, nesting applications, project management tools, and workshop systems - all at a fraction of traditional CAD costs.`;

// Combine both sections
const content = `${section1}\n\n${section2}`;

// Write to text file
const outputFile = 'dokumentacja_punkty_1_2.txt';

try {
    fs.writeFileSync(outputFile, content, 'utf8');
    console.log(`Successfully saved points 1 and 2 to ${outputFile}`);
} catch (error) {
    console.error('Error writing file:', error);
}