import * as THREE from 'three';

let scene, camera, renderer, taxi;
let keys = {};
let speed = 0;
let rotation = 0;

async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, -20);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 50, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);
    
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    createRoad();
    createBuildings();
    createTaxi();
    
    document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    animate();
}

function createRoad() {
    const roadGeometry = new THREE.PlaneGeometry(20, 300);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    scene.add(road);
    
    for (let i = -140; i < 140; i += 20) {
        const lineGeometry = new THREE.PlaneGeometry(0.5, 10);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.02, i);
        scene.add(line);
    }
}

function createBuildings() {
    for (let i = 0; i < 10; i++) {
        const height = 20 + Math.random() * 40;
        const geometry = new THREE.BoxGeometry(15, height, 15);
        const material = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.3, 0.6) 
        });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(
            (Math.random() > 0.5 ? 30 : -30) + Math.random() * 20,
            height / 2,
            Math.random() * 200 - 100
        );
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
    }
}

function createTaxi() {
    const group = new THREE.Group();
    
    const bodyGeometry = new THREE.BoxGeometry(3, 1.5, 5);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);
    
    const roofGeometry = new THREE.BoxGeometry(2.5, 1, 3);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.y = 2.2;
    roof.castShadow = true;
    group.add(roof);
    
    const windowMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x87CEEB, 
        transparent: true, 
        opacity: 0.7 
    });
    
    const frontWindowGeometry = new THREE.PlaneGeometry(2, 0.8);
    const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    frontWindow.position.set(0, 2.2, 2);
    frontWindow.rotation.x = -0.2;
    group.add(frontWindow);
    
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    const positions = [[-1.2, 0.4, 1.8], [1.2, 0.4, 1.8], [-1.2, 0.4, -1.8], [1.2, 0.4, -1.8]];
    positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        wheel.castShadow = true;
        group.add(wheel);
    });
    
    group.position.set(0, 0, 0);
    taxi = group;
    scene.add(taxi);
}

function animate() {
    requestAnimationFrame(animate);
    
    const maxSpeed = 0.5;
    const acceleration = 0.02;
    const braking = 0.03;
    const turnSpeed = 0.03;
    
    if (keys['w']) {
        speed = Math.min(speed + acceleration, maxSpeed);
    } else if (keys['s']) {
        speed = Math.max(speed - braking, -maxSpeed * 0.5);
    } else {
        speed *= 0.98;
    }
    
    if (keys['a'] && Math.abs(speed) > 0.05) {
        rotation += turnSpeed * (speed / maxSpeed);
    }
    if (keys['d'] && Math.abs(speed) > 0.05) {
        rotation -= turnSpeed * (speed / maxSpeed);
    }
    
    taxi.rotation.y = rotation;
    
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    
    taxi.position.add(direction.multiplyScalar(speed));
    
    camera.position.x = taxi.position.x;
    camera.position.z = taxi.position.z - 20;
    camera.position.y = 10;
    camera.lookAt(taxi.position);
    
    document.getElementById('speed').textContent = Math.round(Math.abs(speed) * 50);
    
    renderer.render(scene, camera);
}

init();