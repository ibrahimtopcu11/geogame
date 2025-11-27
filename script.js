import * as THREE from 'three';

let scene, camera, renderer, taxi;
let keys = {};
let speed = 0, maxSpeed = 0.35, rotation = 0;
let money = 250, gameTime = 6;
let passengers = [], trafficLights = [];
let currentPassenger = null, gameState = 'free';
let pickupMarker = null, dropoffMarker = null;
let pathLine = null, pathPoints = [];
let roadNetwork = [];
let wheels = [];

const ACCEL_RATE = 0.012;
const BRAKE_RATE = 0.02;
const FRICTION = 0.95;
const TURN_SPEED = 0.028;

async function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, -40);
    
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('game-canvas'), 
        antialias: true,
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    setupLights();
    createWorld();
    createTaxi();
    buildRoadNetwork();
    await loadGameData();
    setupControls();
    updateMinimap();
    
    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    
    const sun = new THREE.DirectionalLight(0xffffee, 1.2);
    sun.position.set(200, 300, 150);
    sun.castShadow = true;
    sun.shadow.camera.left = -250;
    sun.shadow.camera.right = 250;
    sun.shadow.camera.top = 250;
    sun.shadow.camera.bottom = -250;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.bias = -0.0001;
    scene.add(sun);
    
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x4a7c42, 0.8);
    scene.add(hemisphereLight);
    
    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
    fillLight.position.set(-100, 50, -100);
    scene.add(fillLight);
}

function createWorld() {
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
    
    const textureLoader = new THREE.TextureLoader();
    
    const groundGeo = new THREE.PlaneGeometry(600, 600, 50, 50);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x5a9a5a,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    for (let i = 0; i < 100; i++) {
        const grass = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.8, 4),
            new THREE.MeshStandardMaterial({ color: 0x3d7c3d })
        );
        grass.position.set(
            Math.random() * 400 - 200,
            0.4,
            Math.random() * 400 - 200
        );
        grass.rotation.y = Math.random() * Math.PI * 2;
        scene.add(grass);
    }
    
    createDetailedRoads();
    createUnityStyleBuildings();
    createTrafficLights();
    createStreetFurniture();
}

function createDetailedRoads() {
    const roadMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a,
        roughness: 0.95,
        metalness: 0.05
    });
    
    const sidewalkMat = new THREE.MeshStandardMaterial({ 
        color: 0xaaaaaa,
        roughness: 0.7,
        metalness: 0.1
    });
    
    const lineMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
    });
    
    for (let i = -180; i <= 180; i += 60) {
        const road1 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 600), roadMat);
        road1.position.set(i, 0.15, 0);
        road1.receiveShadow = true;
        road1.castShadow = true;
        scene.add(road1);
        
        [-11, 11].forEach(offset => {
            const sidewalk = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.4, 600),
                sidewalkMat
            );
            sidewalk.position.set(i + offset, 0.2, 0);
            sidewalk.receiveShadow = true;
            scene.add(sidewalk);
            
            const curb = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 600),
                new THREE.MeshStandardMaterial({ color: 0x666666 })
            );
            curb.position.set(i + offset + (offset > 0 ? -2 : 2), 0.3, 0);
            scene.add(curb);
        });
        
        const road2 = new THREE.Mesh(new THREE.BoxGeometry(600, 0.3, 20), roadMat);
        road2.position.set(0, 0.15, i);
        road2.receiveShadow = true;
        road2.castShadow = true;
        scene.add(road2);
        
        [-11, 11].forEach(offset => {
            const sidewalk = new THREE.Mesh(
                new THREE.BoxGeometry(600, 0.4, 4),
                sidewalkMat
            );
            sidewalk.position.set(0, 0.2, i + offset);
            sidewalk.receiveShadow = true;
            scene.add(sidewalk);
            
            const curb = new THREE.Mesh(
                new THREE.BoxGeometry(600, 0.2, 0.2),
                new THREE.MeshStandardMaterial({ color: 0x666666 })
            );
            curb.position.set(0, 0.3, i + offset + (offset > 0 ? -2 : 2));
            scene.add(curb);
        });
        
        for (let j = -260; j < 260; j += 15) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.02, 8),
                lineMat
            );
            line.position.set(i, 0.32, j);
            scene.add(line);
        }
        
        for (let j = -260; j < 260; j += 15) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(8, 0.02, 0.5),
                lineMat
            );
            line.position.set(j, 0.32, i);
            scene.add(line);
        }
    }
    
    for (let i = -180; i <= 180; i += 60) {
        for (let j = -180; j <= 180; j += 60) {
            const intersection = new THREE.Mesh(
                new THREE.BoxGeometry(20, 0.31, 20),
                new THREE.MeshStandardMaterial({ 
                    color: 0x3a3a3a,
                    roughness: 0.95 
                })
            );
            intersection.position.set(i, 0.155, j);
            intersection.receiveShadow = true;
            scene.add(intersection);
            
            const crosswalkMat = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            
            for (let k = -8; k <= 8; k += 2) {
                const stripe1 = new THREE.Mesh(
                    new THREE.BoxGeometry(1, 0.02, 18),
                    crosswalkMat
                );
                stripe1.position.set(i + k, 0.33, j);
                scene.add(stripe1);
                
                const stripe2 = new THREE.Mesh(
                    new THREE.BoxGeometry(18, 0.02, 1),
                    crosswalkMat
                );
                stripe2.position.set(i, 0.33, j + k);
                scene.add(stripe2);
            }
        }
    }
}

function createUnityStyleBuildings() {
    const buildingConfigs = [
        { color: 0x8B7355, windowColor: 0xffffcc, style: 'office' },
        { color: 0x696969, windowColor: 0x87CEEB, style: 'residential' },
        { color: 0xA0826D, windowColor: 0xffd700, style: 'mixed' },
        { color: 0x556B2F, windowColor: 0xffaa00, style: 'modern' }
    ];
    
    for (let i = -150; i <= 150; i += 60) {
        for (let j = -150; j <= 150; j += 60) {
            if (Math.abs(i) < 35 && Math.abs(j) < 35) continue;
            
            const height = 25 + Math.random() * 60;
            const width = 20 + Math.random() * 15;
            const depth = 20 + Math.random() * 15;
            
            const config = buildingConfigs[Math.floor(Math.random() * buildingConfigs.length)];
            
            const buildingGeo = new THREE.BoxGeometry(width, height, depth);
            const buildingMat = new THREE.MeshStandardMaterial({ 
                color: config.color,
                roughness: 0.7,
                metalness: 0.2
            });
            const building = new THREE.Mesh(buildingGeo, buildingMat);
            
            const offsetX = (Math.random() - 0.5) * 25;
            const offsetZ = (Math.random() - 0.5) * 25;
            building.position.set(i + offsetX, height / 2, j + offsetZ);
            building.castShadow = true;
            building.receiveShadow = true;
            scene.add(building);
            
            const roofGeo = new THREE.BoxGeometry(width + 1, 2, depth + 1);
            const roofMat = new THREE.MeshStandardMaterial({ 
                color: 0x444444,
                roughness: 0.6,
                metalness: 0.3
            });
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.set(i + offsetX, height + 1, j + offsetZ);
            roof.castShadow = true;
            scene.add(roof);
            
            const floors = Math.floor(height / 4.5);
            const windowsPerFloorWidth = Math.floor(width / 3.5);
            const windowsPerFloorDepth = Math.floor(depth / 3.5);
            
            for (let floor = 0; floor < floors; floor++) {
                const floorY = 3 + floor * 4.5;
                
                for (let win = 0; win < windowsPerFloorWidth; win++) {
                    const lit = Math.random() > 0.35;
                    const windowGeo = new THREE.BoxGeometry(1.5, 2, 0.1);
                    const windowMat = new THREE.MeshStandardMaterial({ 
                        color: lit ? config.windowColor : 0x0a0a0a,
                        emissive: lit ? config.windowColor : 0x000000,
                        emissiveIntensity: lit ? 0.5 : 0,
                        roughness: 0.1,
                        metalness: 0.9
                    });
                    
                    const window1 = new THREE.Mesh(windowGeo, windowMat);
                    window1.position.set(
                        i + offsetX - width / 2 + 2 + win * 3.5,
                        floorY,
                        j + offsetZ + depth / 2 + 0.05
                    );
                    scene.add(window1);
                    
                    const window2 = new THREE.Mesh(windowGeo, windowMat.clone());
                    window2.position.set(
                        i + offsetX - width / 2 + 2 + win * 3.5,
                        floorY,
                        j + offsetZ - depth / 2 - 0.05
                    );
                    window2.rotation.y = Math.PI;
                    scene.add(window2);
                }
                
                for (let win = 0; win < windowsPerFloorDepth; win++) {
                    const lit = Math.random() > 0.35;
                    const windowGeo = new THREE.BoxGeometry(0.1, 2, 1.5);
                    const windowMat = new THREE.MeshStandardMaterial({ 
                        color: lit ? config.windowColor : 0x0a0a0a,
                        emissive: lit ? config.windowColor : 0x000000,
                        emissiveIntensity: lit ? 0.5 : 0,
                        roughness: 0.1,
                        metalness: 0.9
                    });
                    
                    const window3 = new THREE.Mesh(windowGeo, windowMat);
                    window3.position.set(
                        i + offsetX + width / 2 + 0.05,
                        floorY,
                        j + offsetZ - depth / 2 + 2 + win * 3.5
                    );
                    scene.add(window3);
                    
                    const window4 = new THREE.Mesh(windowGeo, windowMat.clone());
                    window4.position.set(
                        i + offsetX - width / 2 - 0.05,
                        floorY,
                        j + offsetZ - depth / 2 + 2 + win * 3.5
                    );
                    scene.add(window4);
                }
            }
            
            if (Math.random() > 0.6) {
                const signGeo = new THREE.BoxGeometry(width * 0.8, 3, 0.5);
                const signMat = new THREE.MeshStandardMaterial({ 
                    color: 0xff6600,
                    emissive: 0xff3300,
                    emissiveIntensity: 0.7
                });
                const sign = new THREE.Mesh(signGeo, signMat);
                sign.position.set(i + offsetX, 2, j + offsetZ + depth / 2 + 0.3);
                scene.add(sign);
            }
        }
    }
}

function createStreetFurniture() {
    const positions = [-150, -90, -30, 30, 90, 150];
    
    positions.forEach(x => {
        positions.forEach(z => {
            if (Math.abs(x) < 25 && Math.abs(z) < 25) return;
            
            const lampPole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.25, 10, 8),
                new THREE.MeshStandardMaterial({ 
                    color: 0x2a2a2a,
                    roughness: 0.4,
                    metalness: 0.8
                })
            );
            lampPole.position.set(x + 13, 5, z + 13);
            lampPole.castShadow = true;
            scene.add(lampPole);
            
            const lampHead = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 12, 12),
                new THREE.MeshStandardMaterial({ 
                    color: 0xffffdd,
                    emissive: 0xffffcc,
                    emissiveIntensity: 1,
                    roughness: 0.2,
                    metalness: 0.1
                })
            );
            lampHead.position.set(x + 13, 10, z + 13);
            scene.add(lampHead);
            
            const streetLight = new THREE.PointLight(0xffffcc, 1.5, 35);
            streetLight.position.copy(lampHead.position);
            streetLight.castShadow = true;
            scene.add(streetLight);
        });
    });
    
    for (let i = 0; i < 30; i++) {
        const benchX = Math.random() * 300 - 150;
        const benchZ = Math.random() * 300 - 150;
        
        if (Math.abs(benchX % 60) > 15 && Math.abs(benchZ % 60) > 15) {
            const bench = new THREE.Group();
            
            const seat = new THREE.Mesh(
                new THREE.BoxGeometry(2, 0.3, 0.8),
                new THREE.MeshStandardMaterial({ color: 0x8B4513 })
            );
            seat.position.y = 0.5;
            bench.add(seat);
            
            const backrest = new THREE.Mesh(
                new THREE.BoxGeometry(2, 0.8, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x8B4513 })
            );
            backrest.position.set(0, 0.9, -0.35);
            bench.add(backrest);
            
            [-0.8, 0.8].forEach(x => {
                const leg = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6),
                    new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
                );
                leg.position.set(x, 0.25, 0);
                bench.add(leg);
            });
            
            bench.position.set(benchX, 0, benchZ);
            bench.rotation.y = Math.random() * Math.PI * 2;
            bench.castShadow = true;
            scene.add(bench);
        }
    }
}

function createTrafficLights() {
    const positions = [
        [0, 60], [60, 0], [0, -60], [-60, 0], 
        [60, 60], [-60, 60], [60, -60], [-60, -60],
        [120, 0], [0, 120], [-120, 0], [0, -120],
        [120, 60], [60, 120], [-120, -60], [-60, -120]
    ];
    
    positions.forEach(([x, z]) => {
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 9, 12),
            new THREE.MeshStandardMaterial({ 
                color: 0x2a2a2a,
                roughness: 0.4,
                metalness: 0.8
            })
        );
        pole.position.set(x, 4.5, z);
        pole.castShadow = true;
        scene.add(pole);
        
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 3),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
        );
        arm.position.set(x, 8.5, z + 1.5);
        scene.add(arm);
        
        const lightBox = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 3.5, 0.8),
            new THREE.MeshStandardMaterial({ 
                color: 0x1a1a1a,
                roughness: 0.3,
                metalness: 0.7
            })
        );
        lightBox.position.set(x, 10, z + 3);
        lightBox.castShadow = true;
        scene.add(lightBox);
        
        const redLight = new THREE.Mesh(
            new THREE.CircleGeometry(0.4, 20),
            new THREE.MeshStandardMaterial({ 
                color: 0x330000,
                emissive: 0x330000,
                emissiveIntensity: 0.2
            })
        );
        redLight.position.set(x, 11, z + 3.41);
        scene.add(redLight);
        
        const yellowLight = new THREE.Mesh(
            new THREE.CircleGeometry(0.4, 20),
            new THREE.MeshStandardMaterial({ 
                color: 0x333300,
                emissive: 0x333300,
                emissiveIntensity: 0.2
            })
        );
        yellowLight.position.set(x, 10, z + 3.41);
        scene.add(yellowLight);
        
        const greenLight = new THREE.Mesh(
            new THREE.CircleGeometry(0.4, 20),
            new THREE.MeshStandardMaterial({ 
                color: 0x003300,
                emissive: 0x003300,
                emissiveIntensity: 0.2
            })
        );
        greenLight.position.set(x, 9, z + 3.41);
        scene.add(greenLight);
        
        trafficLights.push({
            position: new THREE.Vector3(x, 0, z),
            red: redLight,
            yellow: yellowLight,
            green: greenLight,
            state: 'green',
            timer: Math.random() * 15,
            greenTime: 15,
            yellowTime: 3,
            redTime: 12
        });
    });
}

function createTaxi() {
    const group = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(4.5, 2.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0xFFD700,
        roughness: 0.3,
        metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.6;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    
    const hoodGeo = new THREE.BoxGeometry(4.5, 0.5, 2);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 2.7, 2.5);
    hood.rotation.x = -0.1;
    hood.castShadow = true;
    group.add(hood);
    
    const cabinGeo = new THREE.BoxGeometry(4, 2, 5);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 3.6, -0.5);
    cabin.castShadow = true;
    group.add(cabin);
    
    const roofGeo = new THREE.BoxGeometry(4, 0.3, 5);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, 4.75, -0.5);
    roof.castShadow = true;
    group.add(roof);
    
    const signGeo = new THREE.BoxGeometry(3, 0.6, 1.5);
    const signMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.y = 5.3;
    sign.castShadow = true;
    group.add(sign);
    
    const textGeo = new THREE.PlaneGeometry(2.5, 0.5);
    const textMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
    });
    const taxiText1 = new THREE.Mesh(textGeo, textMat);
    taxiText1.position.set(0, 5.3, 0.76);
    group.add(taxiText1);
    
    const taxiText2 = new THREE.Mesh(textGeo, textMat);
    taxiText2.position.set(0, 5.3, -0.76);
    taxiText2.rotation.y = Math.PI;
    group.add(taxiText2);
    
    const windowMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a3d5f,
        transparent: true,
        opacity: 0.75,
        roughness: 0.1,
        metalness: 0.9
    });
    
    const frontWindowGeo = new THREE.PlaneGeometry(3.5, 1.5);
    const frontWindow = new THREE.Mesh(frontWindowGeo, windowMat);
    frontWindow.position.set(0, 3.6, 2.6);
    frontWindow.rotation.x = -0.25;
    group.add(frontWindow);
    
    const backWindowGeo = new THREE.PlaneGeometry(3.5, 1.5);
    const backWindow = new THREE.Mesh(backWindowGeo, windowMat);
    backWindow.position.set(0, 3.6, -3.6);
    backWindow.rotation.x = 0.25;
    backWindow.rotation.y = Math.PI;
    group.add(backWindow);
    
    [-2.05, 2.05].forEach(x => {
        const sideWindowGeo = new THREE.PlaneGeometry(4.5, 1.5);
        const sideWindow = new THREE.Mesh(sideWindowGeo, windowMat);
        sideWindow.position.set(x, 3.6, -0.5);
        sideWindow.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(sideWindow);
    });
    
    const grillGeo = new THREE.BoxGeometry(4, 0.8, 0.2);
    const grillMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.6,
        metalness: 0.4
    });
    const grill = new THREE.Mesh(grillGeo, grillMat);
    grill.position.set(0, 1.2, 4.05);
    group.add(grill);
    
    const bumperGeo = new THREE.BoxGeometry(4.5, 0.4, 0.6);
    const bumperMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a,
        roughness: 0.3,
        metalness: 0.8
    });
    const frontBumper = new THREE.Mesh(bumperGeo, bumperMat);
    frontBumper.position.set(0, 0.5, 4.3);
    frontBumper.castShadow = true;
    group.add(frontBumper);
    
    const backBumper = new THREE.Mesh(bumperGeo, bumperMat);
    backBumper.position.set(0, 0.5, -4.3);
    backBumper.castShadow = true;
    group.add(backBumper);
    
    const sideMirrorGeo = new THREE.BoxGeometry(0.15, 0.3, 0.4);
    const sideMirrorMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.2,
        metalness: 0.9
    });
    
    [-2.4, 2.4].forEach(x => {
        const mirrorArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.6),
            sideMirrorMat
        );
        mirrorArm.position.set(x, 3.5, 1.5);
        mirrorArm.rotation.y = x > 0 ? -0.3 : 0.3;
        group.add(mirrorArm);
        
        const mirror = new THREE.Mesh(sideMirrorGeo, sideMirrorMat);
        mirror.position.set(x > 0 ? x + 0.4 : x - 0.4, 3.5, 1.7);
        group.add(mirror);
    });
    
    const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 20);
    const wheelMat = new THREE.MeshStandardMaterial({ 
        color: 0x0a0a0a,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const rimGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.55, 16);
    const rimMat = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.3,
        metalness: 0.9
    });
    
    const wheelPositions = [
        [-1.8, 0.6, 2.8], [1.8, 0.6, 2.8],
        [-1.8, 0.6, -2.8], [1.8, 0.6, -2.8]
    ];
    
    wheels = [];
    wheelPositions.forEach((pos, index) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        wheel.castShadow = true;
        group.add(wheel);
        wheels.push(wheel);
        
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(...pos);
        rim.castShadow = true;
        group.add(rim);
        
        const hubcap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.56, 8),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        hubcap.rotation.z = Math.PI / 2;
        hubcap.position.set(...pos);
        group.add(hubcap);
        
        for (let i = 0; i < 5; i++) {
            const spoke = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.05, 0.05),
                rimMat
            );
            spoke.rotation.z = Math.PI / 2;
            spoke.rotation.y = (i * Math.PI * 2) / 5;
            spoke.position.set(...pos);
            group.add(spoke);
        }
    });
    
    const headlightGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const headlightMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffee,
        emissive: 0xffffee,
        emissiveIntensity: 1,
        roughness: 0.1,
        metalness: 0.1
    });
    
    [-1.5, 1.5].forEach(x => {
        const headlight = new THREE.Mesh(headlightGeo, headlightMat);
        headlight.position.set(x, 1.4, 4.2);
        group.add(headlight);
        
        const spotLight = new THREE.SpotLight(0xffffee, 2, 80, Math.PI / 6, 0.5);
        spotLight.position.copy(headlight.position);
        spotLight.target.position.set(x, 0, 100);
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        group.add(spotLight);
        group.add(spotLight.target);
    });
    
    const tailLightGeo = new THREE.BoxGeometry(0.8, 0.5, 0.2);
    const tailLightMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.8,
        roughness: 0.2
    });
    
    [-1.7, 1.7].forEach(x => {
        const tailLight = new THREE.Mesh(tailLightGeo, tailLightMat);
        tailLight.position.set(x, 1.4, -4.2);
        group.add(tailLight);
    });
    
    const licensePlateGeo = new THREE.BoxGeometry(1.2, 0.3, 0.05);
    const licenseMatFront = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const licenseMatBack = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    
    const licenseFront = new THREE.Mesh(licensePlateGeo, licenseMatFront);
    licenseFront.position.set(0, 0.6, 4.35);
    group.add(licenseFront);
    
    const licenseBack = new THREE.Mesh(licensePlateGeo, licenseMatBack);
    licenseBack.position.set(0, 0.6, -4.35);
    group.add(licenseBack);
    
    taxi = group;
    scene.add(taxi);
}

function buildRoadNetwork() {
    const roadPositions = [];
    for (let i = -180; i <= 180; i += 60) {
        for (let j = -240; j <= 240; j += 20) {
            roadPositions.push({ x: i, z: j });
            roadPositions.push({ x: j, z: i });
        }
    }
    
    roadNetwork = roadPositions.map((pos, index) => ({
        id: index,
        x: pos.x,
        z: pos.z,
        neighbors: []
    }));
    
    roadNetwork.forEach((node, i) => {
        roadNetwork.forEach((other, j) => {
            if (i === j) return;
            const dist = Math.sqrt(
                Math.pow(node.x - other.x, 2) + 
                Math.pow(node.z - other.z, 2)
            );
            if (dist < 65) {
                node.neighbors.push({ id: j, cost: dist });
            }
        });
    });
}

function dijkstra(startNode, endNode) {
    const distances = new Array(roadNetwork.length).fill(Infinity);
    const previous = new Array(roadNetwork.length).fill(null);
    const visited = new Set();
    
    distances[startNode] = 0;
    
    while (visited.size < roadNetwork.length) {
        let minDist = Infinity;
        let current = -1;
        
        for (let i = 0; i < roadNetwork.length; i++) {
            if (!visited.has(i) && distances[i] < minDist) {
                minDist = distances[i];
                current = i;
            }
        }
        
        if (current === -1 || current === endNode) break;
        
        visited.add(current);
        
        roadNetwork[current].neighbors.forEach(neighbor => {
            const newDist = distances[current] + neighbor.cost;
            if (newDist < distances[neighbor.id]) {
                distances[neighbor.id] = newDist;
                previous[neighbor.id] = current;
            }
        });
    }
    
    const path = [];
    let current = endNode;
    while (current !== null) {
        path.unshift(roadNetwork[current]);
        current = previous[current];
    }
    
    return path;
}

function findNearestNode(x, z) {
    let nearest = 0;
    let minDist = Infinity;
    
    roadNetwork.forEach((node, index) => {
        const dist = Math.sqrt(
            Math.pow(node.x - x, 2) + 
            Math.pow(node.z - z, 2)
        );
        if (dist < minDist) {
            minDist = dist;
            nearest = index;
        }
    });
    
    return nearest;
}

function drawPath(path) {
    if (pathLine) {
        scene.remove(pathLine);
        pathLine.geometry.dispose();
        pathLine.material.dispose();
    }
    
    if (path.length < 2) return;
    
    const points = path.map(node => 
        new THREE.Vector3(node.x, 1, node.z)
    );
    
    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(path.length * 3);
    
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const material = new THREE.LineBasicMaterial({ 
        color: 0x00ff00,
        linewidth: 4,
        transparent: true,
        opacity: 0.9
    });
    
    pathLine = new THREE.Line(geometry, material);
    scene.add(pathLine);
    
    path.forEach((node, index) => {
        if (index % 3 === 0) {
            const marker = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 12, 12),
                new THREE.MeshBasicMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.7
                })
            );
            marker.position.set(node.x, 0.8, node.z);
            scene.add(marker);
            setTimeout(() => scene.remove(marker), 200);
        }
    });
}

function updatePath() {
    if (gameState === 'free' || !currentPassenger) return;
    
    const targetPos = gameState === 'going_to_pickup' 
        ? currentPassenger.pickup 
        : currentPassenger.dropoff;
    
    const startNode = findNearestNode(taxi.position.x, taxi.position.z);
    const endNode = findNearestNode(targetPos.x, targetPos.z);
    
    pathPoints = dijkstra(startNode, endNode);
    drawPath(pathPoints);
}

async function loadGameData() {
    try {
        const response = await fetch('assets/taxi_data.json');
        const data = await response.json();
        passengers = data.passengers;
        
        passengers.forEach(p => {
            const markerGroup = new THREE.Group();
            
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(2, 2, 0.5, 24),
                new THREE.MeshStandardMaterial({ 
                    color: 0x00ff00,
                    emissive: 0x00ff00,
                    emissiveIntensity: 0.5,
                    transparent: true,
                    opacity: 0.8,
                    roughness: 0.3
                })
            );
            base.position.y = 0.25;
            base.receiveShadow = true;
            markerGroup.add(base);
            
            const personBody = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 2, 12),
                new THREE.MeshStandardMaterial({ 
                    color: 0x4169E1,
                    roughness: 0.7
                })
            );
            personBody.position.y = 2;
            personBody.castShadow = true;
            markerGroup.add(personBody);
            
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 12, 12),
                new THREE.MeshStandardMaterial({ 
                    color: 0xFFD7A8,
                    roughness: 0.8
                })
            );
            head.position.y = 3.2;
            head.castShadow = true;
            markerGroup.add(head);
            
            [-0.6, 0.6].forEach(x => {
                const arm = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8),
                    new THREE.MeshStandardMaterial({ color: 0x4169E1 })
                );
                arm.position.set(x, 1.5, 0);
                arm.castShadow = true;
                markerGroup.add(arm);
            });
            
            markerGroup.position.set(p.pickup.x, 0, p.pickup.z);
            scene.add(markerGroup);
            p.marker = markerGroup;
            
            let time = 0;
            const animateMarker = () => {
                time += 0.05;
                markerGroup.position.y = Math.sin(time) * 0.3;
                markerGroup.rotation.y += 0.02;
            };
            markerGroup.userData.animate = animateMarker;
        });
    } catch (error) {
        console.error('Failed to load game data:', error);
    }
}

function setupControls() {
    document.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true;
        if (e.key.toLowerCase() === 'r') togglePassengerList();
    });
    document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

let frameCount = 0;

function animate() {
    requestAnimationFrame(animate);
    frameCount++;
    
    let targetSpeed = 0;
    let acceleration = 0;
    
    if (keys['w']) {
        targetSpeed = maxSpeed;
        acceleration = ACCEL_RATE;
    } else if (keys['s']) {
        targetSpeed = -maxSpeed * 0.6;
        acceleration = -BRAKE_RATE;
    } else {
        targetSpeed = 0;
        acceleration = 0;
    }
    
    if (targetSpeed > speed) {
        speed = Math.min(speed + acceleration, targetSpeed);
    } else if (targetSpeed < speed) {
        speed = Math.max(speed + acceleration, targetSpeed);
    }
    
    speed *= FRICTION;
    
    if (Math.abs(speed) < 0.001) speed = 0;
    
    if (keys['a'] && Math.abs(speed) > 0.02) {
        rotation += TURN_SPEED * Math.sign(speed);
    }
    if (keys['d'] && Math.abs(speed) > 0.02) {
        rotation -= TURN_SPEED * Math.sign(speed);
    }
    if (keys[' ']) {
        speed *= 0.9;
    }
    
    taxi.rotation.y = rotation;
    
    wheels.forEach((wheel, index) => {
        wheel.rotation.x += speed * 3;
        if (index < 2) {
            const steerAngle = (keys['a'] ? 0.3 : 0) + (keys['d'] ? -0.3 : 0);
            wheel.parent.children.find(c => c === wheel).rotation.y = steerAngle;
        }
    });
    
    const dir = new THREE.Vector3(0, 0, 1)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    taxi.position.add(dir.multiplyScalar(speed));
    
    const cameraDistance = 40 + Math.abs(speed) * 30;
    const cameraHeight = 20 + Math.abs(speed) * 12;
    const cameraOffset = new THREE.Vector3(0, 0, -1)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation)
        .multiplyScalar(cameraDistance);
    
    const targetCamPos = new THREE.Vector3(
        taxi.position.x + cameraOffset.x,
        cameraHeight,
        taxi.position.z + cameraOffset.z
    );
    
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(new THREE.Vector3(
        taxi.position.x,
        taxi.position.y + 2,
        taxi.position.z
    ));
    
    updateTrafficLights();
    updateGameTime();
    checkPassengerPickup();
    checkPassengerDropoff();
    updateMinimap();
    
    passengers.forEach(p => {
        if (p.marker && p.marker.userData.animate) {
            p.marker.userData.animate();
        }
    });
    
    if (gameState !== 'free' && frameCount % 60 === 0) {
        updatePath();
    }
    
    const displaySpeed = Math.abs(speed) * 140;
    document.getElementById('speed').textContent = Math.round(displaySpeed);
    
    renderer.render(scene, camera);
}

function updateTrafficLights() {
    trafficLights.forEach(light => {
        light.timer += 0.016;
        
        let totalCycle = light.greenTime + light.yellowTime + light.redTime;
        let cyclePosition = light.timer % totalCycle;
        
        if (cyclePosition < light.greenTime) {
            if (light.state !== 'green') {
                light.state = 'green';
                light.red.material.color.setHex(0x330000);
                light.red.material.emissiveIntensity = 0.1;
                light.yellow.material.color.setHex(0x333300);
                light.yellow.material.emissiveIntensity = 0.1;
                light.green.material.color.setHex(0x00ff00);
                light.green.material.emissiveIntensity = 1;
            }
        } else if (cyclePosition < light.greenTime + light.yellowTime) {
            if (light.state !== 'yellow') {
                light.state = 'yellow';
                light.red.material.color.setHex(0x330000);
                light.red.material.emissiveIntensity = 0.1;
                light.yellow.material.color.setHex(0xffff00);
                light.yellow.material.emissiveIntensity = 1;
                light.green.material.color.setHex(0x003300);
                light.green.material.emissiveIntensity = 0.1;
            }
        } else {
            if (light.state !== 'red') {
                light.state = 'red';
                light.red.material.color.setHex(0xff0000);
                light.red.material.emissiveIntensity = 1;
                light.yellow.material.color.setHex(0x333300);
                light.yellow.material.emissiveIntensity = 0.1;
                light.green.material.color.setHex(0x003300);
                light.green.material.emissiveIntensity = 0.1;
            }
        }
        
        if (light.state === 'red' && 
            taxi.position.distanceTo(light.position) < 14 && 
            speed > 0.18) {
            money = Math.max(money - 5, -2000);
            document.getElementById('money').textContent = money;
            showNotification('🚨 Red Light Violation! -$5');
        }
    });
}

function updateGameTime() {
    gameTime += 0.0001;
    if (gameTime >= 24) gameTime = 0;
    
    const hours = Math.floor(gameTime);
    const minutes = Math.floor((gameTime - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    document.getElementById('game-time').textContent = 
        `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    let period = 'Morning';
    if (hours >= 12 && hours < 17) period = 'Afternoon';
    else if (hours >= 17 && hours < 20) period = 'Evening';
    else if (hours >= 20 || hours < 6) period = 'Night';
    
    document.getElementById('day-period').textContent = period;
    
    let skyColor, fogColor, sunIntensity;
    
    if (hours >= 5 && hours < 7) {
        skyColor = 0xffa07a;
        fogColor = 0xffb88c;
        sunIntensity = 0.8;
    } else if (hours >= 7 && hours < 17) {
        skyColor = 0x87CEEB;
        fogColor = 0xa0d8f0;
        sunIntensity = 1.2;
    } else if (hours >= 17 && hours < 19) {
        skyColor = 0xff6347;
        fogColor = 0xff8c69;
        sunIntensity = 0.7;
    } else if (hours >= 19 && hours < 21) {
        skyColor = 0x4a5f7f;
        fogColor = 0x5a6f8f;
        sunIntensity = 0.4;
    } else {
        skyColor = 0x0a1929;
        fogColor = 0x1a2939;
        sunIntensity = 0.2;
    }
    
    scene.background.lerp(new THREE.Color(skyColor), 0.005);
    scene.fog.color.lerp(new THREE.Color(fogColor), 0.005);
}

function updateMinimap() {
    const canvas = document.getElementById('minimap');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 200, 200);
    
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 200, 200);
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < 200; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 200);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(200, i);
        ctx.stroke();
    }
    
    if (pathPoints.length > 0) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        pathPoints.forEach((node, index) => {
            const x = (node.x + 200) * 0.5;
            const z = (node.z + 200) * 0.5;
            if (index === 0) ctx.moveTo(x, z);
            else ctx.lineTo(x, z);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    passengers.forEach(p => {
        if (p === currentPassenger) return;
        const x = (p.pickup.x + 200) * 0.5;
        const z = (p.pickup.z + 200) * 0.5;
        
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, z, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
    
    if (pickupMarker) {
        const x = (pickupMarker.position.x + 200) * 0.5;
        const z = (pickupMarker.position.z + 200) * 0.5;
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x, z, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    if (dropoffMarker) {
        const x = (dropoffMarker.position.x + 200) * 0.5;
        const z = (dropoffMarker.position.z + 200) * 0.5;
        ctx.fillStyle = '#00BFFF';
        ctx.shadowColor = '#00BFFF';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x, z, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    const taxiX = (taxi.position.x + 200) * 0.5;
    const taxiZ = (taxi.position.z + 200) * 0.5;
    
    ctx.save();
    ctx.translate(taxiX, taxiZ);
    ctx.rotate(rotation + Math.PI);
    
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-6, 6);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.restore();
}

function checkPassengerPickup() {
    if (gameState !== 'going_to_pickup' || !currentPassenger) return;
    
    const dist = taxi.position.distanceTo(
        new THREE.Vector3(currentPassenger.pickup.x, 0, currentPassenger.pickup.z)
    );
    
    if (dist < 7 && Math.abs(speed) < 0.08) {
        gameState = 'going_to_dropoff';
        scene.remove(pickupMarker);
        pickupMarker = null;
        
        dropoffMarker = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.8, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0x00BFFF,
                emissive: 0x00BFFF,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.85,
                roughness: 0.2
            })
        );
        dropoffMarker.position.set(
            currentPassenger.dropoff.x,
            0.4,
            currentPassenger.dropoff.z
        );
        dropoffMarker.castShadow = true;
        scene.add(dropoffMarker);
        
        updatePath();
        showNotification(`✅ ${currentPassenger.pickup.marker} Passenger Picked Up!`);
    }
}

function checkPassengerDropoff() {
    if (gameState !== 'going_to_dropoff' || !currentPassenger) return;
    
    const dist = taxi.position.distanceTo(
        new THREE.Vector3(currentPassenger.dropoff.x, 0, currentPassenger.dropoff.z)
    );
    
    if (dist < 7 && Math.abs(speed) < 0.08) {
        const tip = calculateTip();
        money += tip;
        document.getElementById('money').textContent = money;
        
        scene.remove(dropoffMarker);
        dropoffMarker = null;
        scene.remove(currentPassenger.marker);
        
        if (pathLine) {
            scene.remove(pathLine);
            pathLine = null;
        }
        pathPoints = [];
        
        passengers = passengers.filter(p => p.id !== currentPassenger.id);
        currentPassenger = null;
        gameState = 'free';
        
        document.getElementById('passenger-info').classList.remove('active');
        showNotification(`💰 Trip Complete! Earned $${tip}`);
    }
}

function calculateTip() {
    let tip = currentPassenger.baseTip;
    
    const hour = Math.floor(gameTime);
    if (hour >= 20 || hour < 6) tip *= 2.0;
    else if (hour >= 17) tip *= 1.4;
    
    if (currentPassenger.urgency === 'critical') tip *= 1.6;
    else if (currentPassenger.urgency === 'high') tip *= 1.3;
    
    return Math.round(tip);
}

function togglePassengerList() {
    const list = document.getElementById('passenger-list');
    list.classList.toggle('active');
    
    if (list.classList.contains('active')) {
        const cards = document.getElementById('passenger-cards');
        cards.innerHTML = '';
        
        passengers.forEach(p => {
            const card = document.createElement('div');
            card.className = 'passenger-card';
            
            let urgencyColor = '#4CAF50';
            if (p.urgency === 'critical') urgencyColor = '#F44336';
            else if (p.urgency === 'high') urgencyColor = '#FF9800';
            
            card.innerHTML = `
                <div style="font-size:24px;margin-bottom:10px;text-shadow: 0 0 10px rgba(255,215,0,0.5)">${p.pickup.marker} ${p.name}</div>
                <div style="color:#aaa;margin:6px 0;font-size:14px">Type: <span style="color:#FFD700;font-weight:bold">${p.type.toUpperCase()}</span></div>
                <div style="color:${urgencyColor};margin:6px 0;font-size:14px;font-weight:bold">🔥 Urgency: ${p.urgency.toUpperCase()}</div>
                <div style="color:#4CAF50;font-size:22px;font-weight:bold;margin-top:12px;text-shadow: 0 0 10px rgba(76,175,80,0.5)">💵 Tip: $${p.baseTip}</div>
            `;
            card.onclick = () => selectPassenger(p);
            cards.appendChild(card);
        });
    }
}

function selectPassenger(passenger) {
    currentPassenger = passenger;
    gameState = 'going_to_pickup';
    togglePassengerList();
    
    pickupMarker = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, 0.8, 32),
        new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.85,
            roughness: 0.2
        })
    );
    pickupMarker.position.set(passenger.pickup.x, 0.4, passenger.pickup.z);
    pickupMarker.castShadow = true;
    scene.add(pickupMarker);
    
    updatePath();
    
    document.getElementById('current-passenger-name').textContent = passenger.name;
    document.getElementById('current-passenger-type').textContent = `${passenger.type} - ${passenger.urgency}`;
    document.getElementById('current-tip').textContent = passenger.baseTip;
    document.getElementById('passenger-info').classList.add('active');
    
    showNotification(`🎯 Going to pick up ${passenger.name} ${passenger.pickup.marker}`);
}

function showNotification(message) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.classList.add('active');
    setTimeout(() => notif.classList.remove('active'), 3000);
}

window.togglePassengerList = togglePassengerList;

init();