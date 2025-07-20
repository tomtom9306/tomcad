// Definicje profili stalowych z rzeczywistymi wymiarami
const SteelProfiles = {
    
    // Profile HEA (European wide flange beams)
    HEA: {
        'HEA100': { h: 96, b: 100, tw: 5, tf: 8, r: 12 },
        'HEA120': { h: 114, b: 120, tw: 5, tf: 8, r: 12 },
        'HEA140': { h: 133, b: 140, tw: 5.5, tf: 8.5, r: 12 },
        'HEA160': { h: 152, b: 160, tw: 6, tf: 9, r: 15 },
        'HEA180': { h: 171, b: 180, tw: 6, tf: 9.5, r: 15 },
        'HEA200': { h: 190, b: 200, tw: 6.5, tf: 10, r: 18 },
        'HEA220': { h: 210, b: 220, tw: 7, tf: 11, r: 18 },
        'HEA240': { h: 230, b: 240, tw: 7.5, tf: 12, r: 21 },
        'HEA260': { h: 250, b: 260, tw: 7.5, tf: 12.5, r: 24 },
        'HEA280': { h: 270, b: 280, tw: 8, tf: 13, r: 24 },
        'HEA300': { h: 290, b: 300, tw: 8.5, tf: 14, r: 27 },
    },

    // Profile IPE (European I-beams)
    IPE: {
        'IPE80': { h: 80, b: 46, tw: 3.8, tf: 5.2, r: 5 },
        'IPE100': { h: 100, b: 55, tw: 4.1, tf: 5.7, r: 7 },
        'IPE120': { h: 120, b: 64, tw: 4.4, tf: 6.3, r: 7 },
        'IPE140': { h: 140, b: 73, tw: 4.7, tf: 6.9, r: 7 },
        'IPE160': { h: 160, b: 82, tw: 5, tf: 7.4, r: 9 },
        'IPE180': { h: 180, b: 91, tw: 5.3, tf: 8, r: 9 },
        'IPE200': { h: 200, b: 100, tw: 5.6, tf: 8.5, r: 12 },
        'IPE220': { h: 220, b: 110, tw: 5.9, tf: 9.2, r: 12 },
        'IPE240': { h: 240, b: 120, tw: 6.2, tf: 9.8, r: 15 },
        'IPE270': { h: 270, b: 135, tw: 6.6, tf: 10.2, r: 15 },
        'IPE300': { h: 300, b: 150, tw: 7.1, tf: 10.7, r: 15 },
    },

    // Profile RHS (Rectangular Hollow Sections)
    RHS: {
        'RHS40x20x2': { h: 40, b: 20, t: 2, r: 3 },
        'RHS50x30x3': { h: 50, b: 30, t: 3, r: 4.5 },
        'RHS60x40x3': { h: 60, b: 40, t: 3, r: 4.5 },
        'RHS60x4': { h: 60, b: 60, t: 4, r: 6 },
        'RHS80x40x4': { h: 80, b: 40, t: 4, r: 6 },
        'RHS100x50x4': { h: 100, b: 50, t: 4, r: 6 },
        'RHS120x80x5': { h: 120, b: 80, t: 5, r: 7.5 },
        'RHS140x80x5': { h: 140, b: 80, t: 5, r: 7.5 },
        'RHS160x80x5': { h: 160, b: 80, t: 5, r: 7.5 },
        'RHS200x100x6': { h: 200, b: 100, t: 6, r: 9 },
    },

    // Profile CHS (Circular Hollow Sections)
    CHS: {
        'CHS21.3x2.3': { d: 21.3, t: 2.3 },
        'CHS26.9x2.3': { d: 26.9, t: 2.3 },
        'CHS33.7x2.6': { d: 33.7, t: 2.6 },
        'CHS42.4x2.6': { d: 42.4, t: 2.6 },
        'CHS48.3x3.2': { d: 48.3, t: 3.2 },
        'CHS60.3x3.6': { d: 60.3, t: 3.6 },
        'CHS76.1x3.6': { d: 76.1, t: 3.6 },
        'CHS76x3.2': { d: 76, t: 3.2 },
        'CHS88.9x4': { d: 88.9, t: 4 },
        'CHS114.3x4': { d: 114.3, t: 4 },
        'CHS139.7x5': { d: 139.7, t: 5 },
        'CHS168x6.3': { d: 168, t: 6.3 },
        'CHS168.3x7.1': { d: 168.3, t: 7.1 },
        'CHS219.1x8': { d: 219.1, t: 8 },
    },

    // Profile UPN (U-channels)
    UPN: {
        'UPN80': { h: 80, b: 45, tw: 6, tf: 8, r: 8.5 },
        'UPN100': { h: 100, b: 50, tw: 6, tf: 8.5, r: 8.5 },
        'UPN120': { h: 120, b: 55, tw: 7, tf: 9, r: 9 },
        'UPN140': { h: 140, b: 60, tw: 7, tf: 10, r: 10 },
        'UPN160': { h: 160, b: 65, tw: 7.5, tf: 10.5, r: 10.5 },
        'UPN180': { h: 180, b: 70, tf: 11, tw: 8, r: 11 },
        'UPN200': { h: 200, b: 75, tw: 8.5, tf: 11.5, r: 11.5 },
    },

    // Profile L (Angles)
    L: {
        'L40x40x4': { a: 40, b: 40, t: 4, r: 6 },
        'L50x50x5': { a: 50, b: 50, t: 5, r: 7 },
        'L60x60x6': { a: 60, b: 60, t: 6, r: 8 },
        'L80x80x8': { a: 80, b: 80, t: 8, r: 10 },
        'L100x100x10': { a: 100, b: 100, t: 10, r: 12 },
        'L120x120x12': { a: 120, b: 120, t: 12, r: 14 },
    }
};

// Generator geometrii dla różnych typów profili
const ProfileGeometry = {
    
    /**
     * Tworzy geometrię profilu I (HEA, IPE)
     */
    createIBeamGeometry(profile, length) {
        const { h, b, tw, tf, r } = profile;
        
        // Tworzenie kształtu przekroju I-beam
        const shape = new THREE.Shape();
        
        // Dolna półka
        shape.moveTo(-b/2, -h/2);
        shape.lineTo(b/2, -h/2);
        shape.lineTo(b/2, -h/2 + tf);
        
        // Przejście do środnika z zaokrągleniem
        shape.lineTo(tw/2 + r, -h/2 + tf);
        shape.quadraticCurveTo(tw/2, -h/2 + tf, tw/2, -h/2 + tf + r);
        
        // Środnik prawy
        shape.lineTo(tw/2, h/2 - tf - r);
        
        // Przejście do górnej półki z zaokrągleniem
        shape.quadraticCurveTo(tw/2, h/2 - tf, tw/2 + r, h/2 - tf);
        
        // Górna półka
        shape.lineTo(b/2, h/2 - tf);
        shape.lineTo(b/2, h/2);
        shape.lineTo(-b/2, h/2);
        shape.lineTo(-b/2, h/2 - tf);
        
        // Przejście do środnika z zaokrągleniem (lewa strona)
        shape.lineTo(-tw/2 - r, h/2 - tf);
        shape.quadraticCurveTo(-tw/2, h/2 - tf, -tw/2, h/2 - tf - r);
        
        // Środnik lewy
        shape.lineTo(-tw/2, -h/2 + tf + r);
        
        // Przejście do dolnej półki z zaokrągleniem
        shape.quadraticCurveTo(-tw/2, -h/2 + tf, -tw/2 - r, -h/2 + tf);
        
        // Zamknięcie kształtu
        shape.lineTo(-b/2, -h/2 + tf);
        shape.lineTo(-b/2, -h/2);
        
        const extrudeSettings = {
            depth: length,
            bevelEnabled: false
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.translate(0, 0, -length / 2);
        return geometry;
    },

    /**
     * Tworzy geometrię profilu RHS (prostokątny pusty)
     */
    createRHSGeometry(profile, length) {
        const { h, b, t, r } = profile;
        
        // Zewnętrzny kształt
        const outerShape = new THREE.Shape();
        outerShape.moveTo(-b/2 + r, -h/2);
        outerShape.lineTo(b/2 - r, -h/2);
        outerShape.quadraticCurveTo(b/2, -h/2, b/2, -h/2 + r);
        outerShape.lineTo(b/2, h/2 - r);
        outerShape.quadraticCurveTo(b/2, h/2, b/2 - r, h/2);
        outerShape.lineTo(-b/2 + r, h/2);
        outerShape.quadraticCurveTo(-b/2, h/2, -b/2, h/2 - r);
        outerShape.lineTo(-b/2, -h/2 + r);
        outerShape.quadraticCurveTo(-b/2, -h/2, -b/2 + r, -h/2);
        
        // Wewnętrzny otwór
        const innerShape = new THREE.Path();
        const ib = b - 2*t;
        const ih = h - 2*t;
        const ir = Math.max(0, r - t);
        
        innerShape.moveTo(-ib/2 + ir, -ih/2);
        innerShape.lineTo(ib/2 - ir, -ih/2);
        if (ir > 0) innerShape.quadraticCurveTo(ib/2, -ih/2, ib/2, -ih/2 + ir);
        else innerShape.lineTo(ib/2, -ih/2 + ir);
        innerShape.lineTo(ib/2, ih/2 - ir);
        if (ir > 0) innerShape.quadraticCurveTo(ib/2, ih/2, ib/2 - ir, ih/2);
        else innerShape.lineTo(ib/2 - ir, ih/2);
        innerShape.lineTo(-ib/2 + ir, ih/2);
        if (ir > 0) innerShape.quadraticCurveTo(-ib/2, ih/2, -ib/2, ih/2 - ir);
        else innerShape.lineTo(-ib/2, ih/2 - ir);
        innerShape.lineTo(-ib/2, -ih/2 + ir);
        if (ir > 0) innerShape.quadraticCurveTo(-ib/2, -ih/2, -ib/2 + ir, -ih/2);
        else innerShape.lineTo(-ib/2 + ir, -ih/2);
        
        outerShape.holes.push(innerShape);
        
        const extrudeSettings = {
            depth: length,
            bevelEnabled: false
        };
        
        const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
        geometry.translate(0, 0, -length / 2);
        return geometry;
    },

    /**
     * Tworzy geometrię profilu CHS (okrągły pusty)
     */
    createCHSGeometry(profile, length) {
        const { d, t } = profile;
        const outerRadius = d / 2;
        const innerRadius = outerRadius - t;
        
        // Tworzenie kształtu okrągłego z otworem
        const outerShape = new THREE.Shape();
        outerShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
        
        // Wewnętrzny otwór
        const innerShape = new THREE.Path();
        innerShape.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
        outerShape.holes.push(innerShape);
        
        const extrudeSettings = {
            depth: length,
            bevelEnabled: false
        };
        
        const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
        geometry.translate(0, 0, -length / 2);
        return geometry;
    },

    /**
     * Tworzy geometrię profilu UPN (ceownik)
     */
    createUPNGeometry(profile, length) {
        const { h, b, tw, tf, r } = profile;
        
        const shape = new THREE.Shape();
        
        // Podstawa ceownika
        shape.moveTo(0, -h/2);
        shape.lineTo(b, -h/2);
        shape.lineTo(b, -h/2 + tf);
        
        // Przejście do środnika z zaokrągleniem
        shape.lineTo(tw + r, -h/2 + tf);
        shape.quadraticCurveTo(tw, -h/2 + tf, tw, -h/2 + tf + r);
        
        // Środnik
        shape.lineTo(tw, h/2 - tf - r);
        
        // Przejście do górnej półki
        shape.quadraticCurveTo(tw, h/2 - tf, tw + r, h/2 - tf);
        shape.lineTo(b, h/2 - tf);
        shape.lineTo(b, h/2);
        shape.lineTo(0, h/2);
        shape.lineTo(0, -h/2);
        
        const extrudeSettings = {
            depth: length,
            bevelEnabled: false
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.translate(0, 0, -length / 2);
        return geometry;
    },

    /**
     * Tworzy geometrię kątownika
     */
    createAngleGeometry(profile, length) {
        const { a, b, t, r } = profile;
        
        const shape = new THREE.Shape();
        
        // Kształt L
        shape.moveTo(0, 0);
        shape.lineTo(a, 0);
        shape.lineTo(a, t);
        shape.lineTo(t + r, t);
        shape.quadraticCurveTo(t, t, t, t + r);
        shape.lineTo(t, b);
        shape.lineTo(0, b);
        shape.lineTo(0, 0);
        
        const extrudeSettings = {
            depth: length,
            bevelEnabled: false
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.translate(0, 0, -length / 2);
        return geometry;
    }
};

// Funkcja pomocnicza do parsowania nazwy profilu
function parseProfileName(profileName) {
    if (profileName.startsWith('HEA')) {
        return { type: 'HEA', name: profileName };
    } else if (profileName.startsWith('IPE')) {
        return { type: 'IPE', name: profileName };
    } else if (profileName.startsWith('RHS')) {
        return { type: 'RHS', name: profileName };
    } else if (profileName.startsWith('CHS')) {
        return { type: 'CHS', name: profileName };
    } else if (profileName.startsWith('UPN')) {
        return { type: 'UPN', name: profileName };
    } else if (profileName.startsWith('L')) {
        return { type: 'L', name: profileName };
    }
    return { type: 'unknown', name: profileName };
}

// Główna funkcja do tworzenia geometrii profilu
function createProfileGeometry(profileName, length) {
    const parsed = parseProfileName(profileName);
    const profileData = SteelProfiles[parsed.type]?.[parsed.name];
    
    if (!profileData) {
        console.warn(`Profile ${profileName} not found, using default box geometry`);
        const geometry = new THREE.BoxGeometry(100, 100, length);
        return geometry;
    }
    
    let geometry;
    switch (parsed.type) {
        case 'HEA':
        case 'IPE':
            geometry = ProfileGeometry.createIBeamGeometry(profileData, length);
            break;
        case 'RHS':
            geometry = ProfileGeometry.createRHSGeometry(profileData, length);
            break;
        case 'CHS':
            geometry = ProfileGeometry.createCHSGeometry(profileData, length);
            break;
        case 'UPN':
            geometry = ProfileGeometry.createUPNGeometry(profileData, length);
            break;
        case 'L':
            geometry = ProfileGeometry.createAngleGeometry(profileData, length);
            break;
        default:
            geometry = new THREE.BoxGeometry(100, 100, length);
            break;
    }
    return geometry;
} 