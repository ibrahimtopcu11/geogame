// ========== Global Değişkenler ==========
let scene, camera, renderer, taxiModel, cityModel;
let keys = {};
let speed = 0, maxSpeed = 0.35, rotation = 0;
let money = 250, gameTime = 6;
let passengers = [], trafficLights = [], npcCars = [];
let currentPassenger = null, gameState = 'free';
let pickupMarker = null, dropoffMarker = null;
let pathLine = null, pathPoints = [];
let roadNetwork = [];

const ACCEL_RATE = 0.012;
const BRAKE_RATE = 0.02;
const FRICTION = 0.95;
const TURN_SPEED = 0.028;

// ========== Manuel Waypoint Sistemi ==========
const MANUAL_WAYPOINTS = [
    { x: -180, z: 0 }, { x: -120, z: 0 }, { x: -60, z: 0 }, { x: 0, z: 0 },
    { x: 60, z: 0 }, { x: 120, z: 0 }, { x: 180, z: 0 },
    { x: 0, z: -180 }, { x: 0, z: -120 }, { x: 0, z: -60 },
    { x: 0, z: 60 }, { x: 0, z: 120 }, { x: 0, z: 180 },
    { x: -180, z: -180 }, { x: -180, z: 180 }, { x: 180, z: -180 }, { x: 180, z: 180 }
];

// ========== Ana Başlatma Fonksiyonu ==========
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
    
    // Asset'leri yükle
    await loadAssets();
    
    buildRoadNetwork();
    await loadGameData();
    setupControls();
    setupMinimapToggle();
    updateMinimap();
    
    // Yükleme ekranını gizle
    document.getElementById('loading-screen').classList.add('hidden');
    
    animate();
}

// ========== Işıklandırma ==========
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

// ========== Asset Yükleme ==========
async function loadAssets() {
    const loader = new THREE.GLTFLoader();
    const loadingProgress = document.getElementById('loading-progress');
    const loadingText = document.getElementById('loading-text');
    
    let loaded = 0;
    const total = 3;
    
    const updateProgress = () => {
        loaded++;
        const percent = (loaded / total) * 100;
        loadingProgress.style.width = percent + '%';
        loadingText.textContent = `Loading... ${Math.round(percent)}%`;
    };
    
    try {
        // 1. Şehir Yükleme
        loadingText.textContent = 'Loading city...';
        try {
            const cityGLTF = await loader.loadAsync('assets/city.glb');
            cityModel = cityGLTF.scene;
            cityModel.position.set(0, 0, 0);
            cityModel.scale.set(1, 1, 1);
            cityModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            scene.add(cityModel);
            console.log('✅ City loaded successfully');
        } catch (error) {
            console.warn('⚠️ City.glb not found, using fallback city');
        }
        updateProgress();
        
        // 2. Taksi Yükleme
        loadingText.textContent = 'Loading taxi...';
        try {
            const taxiGLTF = await loader.loadAsync('assets/taxi.glb');
            taxiModel = taxiGLTF.scene;
            taxiModel.position.set(0, 0, 0);
            taxiModel.scale.set(1, 1, 1);
            taxiModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            scene.add(taxiModel);
            console.log('✅ Taxi loaded successfully');
        } catch (error) {
            console.warn('⚠️ Taxi.glb not found, using fallback taxi');
            createFallbackTaxi();
        }
        updateProgress();
        
        // 3. Yolcu Modeli Yükleme
        loadingText.textContent = 'Loading passengers...';
        try {
            const passengerGLTF = await loader.loadAsync('assets/passenger.glb');
            window.passengerModel = passengerGLTF.scene;
            console.log('✅ Passenger loaded successfully');
        } catch (error) {
            console.warn('⚠️ Passenger.glb not found, using fallback passenger');
        }
        updateProgress();
        
        loadingText.textContent = 'Creating world...';
        
        // Dünya elemanlarını oluştur
        createWorldElements();
        createTrafficLights();
        createNPCCars();
        
    } catch (error) {
        console.error('Asset loading error:', error);
        loadingText.textContent = 'Creating fallback world...';
        createFallbackWorld();
    }
}

// ========== Fallback Taksi ==========
function createFallbackTaxi() {
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
    group.add(body);
    
    const cabinGeo = new THREE.BoxGeometry(4, 2, 5);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 3.6, -0.5);
    cabin.castShadow = true;
    group.add(cabin);
    
    const signGeo = new THREE.BoxGeometry(3, 0.6, 1.5);
    const signMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.y = 5.3;
    group.add(sign);
    
    // Tekerlekler
    const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 20);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
    
    const wheelPositions = [
        [-1.8, 0.6, 2.8], [1.8, 0.6, 2.8],
        [-1.8, 0.6, -2.8], [1.8, 0.6, -2.8]
    ];
    
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        wheel.castShadow = true;
        group.add(wheel);
    });
    
    taxiModel = group;
    scene.add(taxiModel);
}

// ========== Fallback Dünya ==========
function createFallbackWorld() {
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
    
    // Zemin
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x5a9a5a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    createFallbackTaxi();
    createWorldElements();
    createTrafficLights();
    createNPCCars();
}

// ========== Dünya Elemanları ==========
function createWorldElements() {
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
    
    // Yollar
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    for (let i = -180; i <= 180; i += 60) {
        const road1 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 600), roadMat);
        road1.position.set(i, 0.15, 0);
        road1.receiveShadow = true;
        scene.add(road1);
        
        const road2 = new THREE.Mesh(new THREE.BoxGeometry(600, 0.3, 20), roadMat);
        road2.position.set(0, 0.15, i);
        road2.receiveShadow = true;
        scene.add(road2);
    }
    
    // Binalar
    const buildingColors = [0x8B7355, 0x696969, 0xA0826D, 0x556B2F];
    for (let i = -150; i <= 150; i += 60) {
        for (let j = -150; j <= 150; j += 60) {
            if (Math.abs(i) < 35 && Math.abs(j) < 35) continue;
            
            const height = 25 + Math.random() * 60;
            const width = 20 + Math.random() * 15;
            const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
            
            const building = new THREE.Mesh(
                new THREE.BoxGeometry(width, height, width),
                new THREE.MeshStandardMaterial({ color })
            );
            building.position.set(i + (Math.random() - 0.5) * 25, height / 2, j + (Math.random() - 0.5) * 25);
            building.castShadow = true;
            building.receiveShadow = true;
            scene.add(building);
        }
    }
}

// ========== Trafik Işıkları ==========
function createTrafficLights() {
    const positions = [
        [0, 60], [60, 0], [0, -60], [-60, 0], 
        [60, 60], [-60, 60], [60, -60], [-60, -60],
        [120, 0], [0, 120], [-120, 0], [0, -120]
    ];
    
    positions.forEach(([x, z]) => {
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 9, 12),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
        );
        pole.position.set(x, 4.5, z);
        pole.castShadow = true;
        scene.add(pole);
        
        const lightBox = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 3.5, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        lightBox.position.set(x, 10, z + 3);
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
            new THREE.MeshStandardMaterial({ color: 0x333300, emissive: 0x333300, emissiveIntensity: 0.2 })
        );
        yellowLight.position.set(x, 10, z + 3.41);
        scene.add(yellowLight);
        
        const greenLight = new THREE.Mesh(
            new THREE.CircleGeometry(0.4, 20),
            new THREE.MeshStandardMaterial({ color: 0x003300, emissive: 0x003300, emissiveIntensity: 0.2 })
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

// ========== NPC Arabalar ==========
function createNPCCars() {
    const carColor = [0xFF0000, 0x0000FF, 0x00FF00, 0xFFFFFF, 0x000000];
    const routes = [
        { start: [-180, 0], end: [180, 0], axis: 'x' },
        { start: [180, 0], end: [-180, 0], axis: 'x' },
        { start: [0, -180], end: [0, 180], axis: 'z' },
        { start: [0, 180], end: [0, -180], axis: 'z' }
    ];
    
    for (let i = 0; i < 8; i++) {
        const route = routes[Math.floor(Math.random() * routes.length)];
        const color = carColor[Math.floor(Math.random() * carColor.length)];
        
        const car = new THREE.Mesh(
            new THREE.BoxGeometry(3, 1.5, 5),
            new THREE.MeshStandardMaterial({ color })
        );
        car.position.set(route.start[0], 0.75, route.start[1]);
        car.castShadow = true;
        scene.add(car);
        
        npcCars.push({
            mesh: car,
            route: route,
            speed: 0.15 + Math.random() * 0.1,
            stopped: false,
            stopTimer: 0
        });
    }
}

// ========== NPC Araba Hareketi ==========
function updateNPCCars() {
    npcCars.forEach(car => {
        let nearRedLight = false;
        trafficLights.forEach(light => {
            if (light.state === 'red') {
                const dist = car.mesh.position.distanceTo(light.position);
                if (dist < 15) {
                    nearRedLight = true;
                }
            }
        });
        
        if (nearRedLight) {
            car.stopped = true;
            car.stopTimer = 60;
        }
        
        if (car.stopped) {
            car.stopTimer--;
            if (car.stopTimer <= 0) {
                car.stopped = false;
            }
            return;
        }
        
        if (car.route.axis === 'x') {
            car.mesh.position.x += (car.route.end[0] > car.route.start[0] ? car.speed : -car.speed);
            if (Math.abs(car.mesh.position.x) > 200) {
                car.mesh.position.x = car.route.start[0];
            }
        } else {
            car.mesh.position.z += (car.route.end[1] > car.route.start[1] ? car.speed : -car.speed);
            if (Math.abs(car.mesh.position.z) > 200) {
                car.mesh.position.z = car.route.start[1];
            }
        }
    });
}

// ========== Yol Ağı ==========
function buildRoadNetwork() {
    roadNetwork = MANUAL_WAYPOINTS.map((pos, index) => ({
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

// ========== Dijkstra ==========
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

// ========== Yol Çizimi ==========
function drawPath(path) {
    if (pathLine) {
        scene.remove(pathLine);
        pathLine.geometry.dispose();
        pathLine.material.dispose();
    }
    
    if (path.length < 2) return;
    
    const points = path.map(node => new THREE.Vector3(node.x, 1, node.z));
    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(path.length * 3);
    
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const material = new THREE.LineBasicMaterial({ 
        color: 0x00ff00,
        linewidth: 4
    });
    
    pathLine = new THREE.Line(geometry, material);
    scene.add(pathLine);
}

function updatePath() {
    if (gameState === 'free' || !currentPassenger) return;
    
    const targetPos = gameState === 'going_to_pickup' 
        ? currentPassenger.pickup 
        : currentPassenger.dropoff;
    
    const startNode = findNearestNode(taxiModel.position.x, taxiModel.position.z);
    const endNode = findNearestNode(targetPos.x, targetPos.z);
    
    pathPoints = dijkstra(startNode, endNode);
    drawPath(pathPoints);
}

// ========== Oyun Verileri ==========
async function loadGameData() {
    try {
        const response = await fetch('assets/taxi_data.json');
        const data = await response.json();
        passengers = data.passengers;
        
        passengers.forEach(p => {
            let passengerMesh;
            if (window.passengerModel) {
                passengerMesh = window.passengerModel.clone();
                passengerMesh.scale.set(2, 2, 2);
            } else {
                const personBody = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.5, 2, 12),
                    new THREE.MeshStandardMaterial({ color: 0x4169E1 })
                );
                personBody.castShadow = true;
                
                const head = new THREE.Mesh(
                    new THREE.SphereGeometry(0.5, 12, 12),
                    new THREE.MeshStandardMaterial({ color: 0xFFD7A8 })
                );
                head.position.y = 1.2;
                head.castShadow = true;
                
                const group = new THREE.Group();
                group.add(personBody);
                group.add(head);
                passengerMesh = group;
            }
            
            passengerMesh.position.set(p.pickup.x, 0, p.pickup.z);
            scene.add(passengerMesh);
            p.marker = passengerMesh;
            
            let time = 0;
            const animateMarker = () => {
                time += 0.05;
                passengerMesh.position.y = Math.sin(time) * 0.3;
                passengerMesh.rotation.y += 0.02;
            };
            passengerMesh.userData.animate = animateMarker;
        });
    } catch (error) {
        console.error('Failed to load game data:', error);
    }
}

// ========== Kontroller ==========
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

// ========== Minimap Toggle ==========
function setupMinimapToggle() {
    const minimapContainer = document.getElementById('minimap-container');
    const minimapToggle = document.getElementById('minimap-toggle');
    const minimapClose = document.getElementById('minimap-close');
    const minimap = document.getElementById('minimap');
    
    minimapToggle.addEventListener('click', () => {
        minimapContainer.classList.add('fullscreen');
        minimapToggle.classList.add('hidden');
        minimapClose.classList.remove('hidden');
    });
    
    minimapClose.addEventListener('click', () => {
        minimapContainer.classList.remove('fullscreen');
        minimapToggle.classList.remove('hidden');
        minimapClose.classList.add('hidden');
    });
    
    minimap.addEventListener('click', () => {
        if (!minimapContainer.classList.contains('fullscreen')) {
            minimapContainer.classList.add('fullscreen');
            minimapToggle.classList.add('hidden');
            minimapClose.classList.remove('hidden');
        }
    });
}

// ========== Animasyon ==========
let frameCount = 0;

function animate() {
    requestAnimationFrame(animate);
    frameCount++;
    
    if (!taxiModel) return;
    
    let targetSpeed = 0;
    if (keys['w']) targetSpeed = maxSpeed;
    else if (keys['s']) targetSpeed = -maxSpeed * 0.6;
    
    if (targetSpeed > speed) speed = Math.min(speed + ACCEL_RATE, targetSpeed);
    else if (targetSpeed < speed) speed = Math.max(speed - BRAKE_RATE, targetSpeed);
    
    speed *= FRICTION;
    if (Math.abs(speed) < 0.001) speed = 0;
    
    if (keys['a'] && Math.abs(speed) > 0.02) rotation += TURN_SPEED * Math.sign(speed);
    if (keys['d'] && Math.abs(speed) > 0.02) rotation -= TURN_SPEED * Math.sign(speed);
    if (keys[' ']) speed *= 0.9;
    
    taxiModel.rotation.y = rotation;
    
    const dir = new THREE.Vector3(0, 0, 1)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    taxiModel.position.add(dir.multiplyScalar(speed));
    
    const cameraDistance = 40 + Math.abs(speed) * 30;
    const cameraHeight = 20 + Math.abs(speed) * 12;
    const cameraOffset = new THREE.Vector3(0, 0, -1)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation)
        .multiplyScalar(cameraDistance);
    
    const targetCamPos = new THREE.Vector3(
        taxiModel.position.x + cameraOffset.x,
        cameraHeight,
        taxiModel.position.z + cameraOffset.z
    );
    
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(new THREE.Vector3(
        taxiModel.position.x,
        taxiModel.position.y + 2,
        taxiModel.position.z
    ));
    
    updateTrafficLights();
    updateNPCCars();
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

// ========== Trafik Işıkları ==========
let lastViolationTime = 0;

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
        
        const now = Date.now();
        if (light.state === 'red' && 
            taxiModel && taxiModel.position.distanceTo(light.position) < 14 && 
            speed > 0.18 &&
            now - lastViolationTime > 1000) {
            money = Math.max(money - 10, -2000);
            document.getElementById('money').textContent = money;
            showNotification('🚨 RED LIGHT VIOLATION! -$10');
            lastViolationTime = now;
        }
    });
}

// ========== Oyun Zamanı ==========
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
    
    let skyColor, fogColor;
    if (hours >= 5 && hours < 7) {
        skyColor = 0xffa07a;
        fogColor = 0xffb88c;
    } else if (hours >= 7 && hours < 17) {
        skyColor = 0x87CEEB;
        fogColor = 0xa0d8f0;
    } else if (hours >= 17 && hours < 19) {
        skyColor = 0xff6347;
        fogColor = 0xff8c69;
    } else if (hours >= 19 && hours < 21) {
        skyColor = 0x4a5f7f;
        fogColor = 0x5a6f8f;
    } else {
        skyColor = 0x0a1929;
        fogColor = 0x1a2939;
    }
    
    scene.background.lerp(new THREE.Color(skyColor), 0.005);
    scene.fog.color.lerp(new THREE.Color(fogColor), 0.005);
}

// ========== Minimap ==========
function updateMinimap() {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const isFullscreen = document.getElementById('minimap-container').classList.contains('fullscreen');
    
    const width = isFullscreen ? canvas.parentElement.clientWidth : 200;
    const height = isFullscreen ? canvas.parentElement.clientHeight : 200;
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = width / 5;
    for (let i = 0; i < width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }
    
    const scale = width / 400;
    
    if (pathPoints.length > 0) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4 * scale;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10 * scale;
        ctx.beginPath();
        pathPoints.forEach((node, index) => {
            const x = (node.x + 200) * scale;
            const z = (node.z + 200) * scale;
            if (index === 0) ctx.moveTo(x, z);
            else ctx.lineTo(x, z);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    passengers.forEach(p => {
        if (p === currentPassenger) return;
        const x = (p.pickup.x + 200) * scale;
        const z = (p.pickup.z + 200) * scale;
        
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 8 * scale;
        ctx.beginPath();
        ctx.arc(x, z, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
    
    if (pickupMarker) {
        const x = (pickupMarker.position.x + 200) * scale;
        const z = (pickupMarker.position.z + 200) * scale;
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12 * scale;
        ctx.beginPath();
        ctx.arc(x, z, 8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    if (dropoffMarker) {
        const x = (dropoffMarker.position.x + 200) * scale;
        const z = (dropoffMarker.position.z + 200) * scale;
        ctx.fillStyle = '#00BFFF';
        ctx.shadowColor = '#00BFFF';
        ctx.shadowBlur = 12 * scale;
        ctx.beginPath();
        ctx.arc(x, z, 8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    if (!taxiModel) return;
    
    const taxiX = (taxiModel.position.x + 200) * scale;
    const taxiZ = (taxiModel.position.z + 200) * scale;
    
    ctx.save();
    ctx.translate(taxiX, taxiZ);
    ctx.rotate(rotation + Math.PI);
    
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 15 * scale;
    ctx.beginPath();
    ctx.moveTo(0, -10 * scale);
    ctx.lineTo(-6 * scale, 6 * scale);
    ctx.lineTo(6 * scale, 6 * scale);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.restore();
}

// ========== Yolcu Alma/Bırakma ==========
function checkPassengerPickup() {
    if (gameState !== 'going_to_pickup' || !currentPassenger || !taxiModel) return;
    
    const dist = taxiModel.position.distanceTo(
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
                opacity: 0.85
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
        showNotification(`✅ Passenger Picked Up!`);
    }
}

function checkPassengerDropoff() {
    if (gameState !== 'going_to_dropoff' || !currentPassenger || !taxiModel) return;
    
    const dist = taxiModel.position.distanceTo(
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

// ========== Yolcu Listesi ==========
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
                <div style="font-size:24px;margin-bottom:10px;">${p.pickup.marker} ${p.name}</div>
                <div style="color:#aaa;margin:6px 0;">Type: <span style="color:#FFD700">${p.type.toUpperCase()}</span></div>
                <div style="color:${urgencyColor};margin:6px 0;">🔥 ${p.urgency.toUpperCase()}</div>
                <div style="color:#4CAF50;font-size:22px;font-weight:bold;margin-top:12px;">💵 $${p.baseTip}</div>
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
            opacity: 0.85
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
    
    showNotification(`🎯 Going to ${passenger.name}`);
}

function showNotification(message) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.classList.add('active');
    setTimeout(() => notif.classList.remove('active'), 3000);
}

window.togglePassengerList = togglePassengerList;

// ========== Başlat ==========
init();