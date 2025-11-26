import * as THREE from 'three';
import { Vehicle } from './Vehicle.js';
import { MiniMap } from './Map.js';
import { PathFinding } from './PathFinding.js';
import { TrafficLights } from './TrafficLights.js';
import { TimeSystem } from './TimeSystem.js';
import { PassengerSystem } from './PassengerSystem.js';

export class TaxiGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.vehicle = null;
        this.miniMap = null;
        this.pathFinding = null;
        this.trafficLights = null;
        this.timeSystem = null;
        this.passengerSystem = null;
        
        this.gameData = null;
        this.buildings = [];
        this.roads = [];
        this.currentPath = null;
        this.currentPassenger = null;
        this.gameState = 'free';
        
        this.money = 250;
        this.tripCount = 0;
        this.rating = 5.0;
        
        this.keys = {};
    }
    
    async init() {
        await this.loadGameData();
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.createCity();
        this.setupVehicle();
        this.setupSystems();
        this.setupControls();
        this.setupUI();
    }
    
    async loadGameData() {
        const response = await fetch('assets/taxi_data.json');
        this.gameData = await response.json();
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 15, -30);
    }
    
    setupLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);
        
        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.sunLight.position.set(100, 200, 100);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.camera.left = -200;
        this.sunLight.shadow.camera.right = 200;
        this.sunLight.shadow.camera.top = 200;
        this.sunLight.shadow.camera.bottom = -200;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.scene.add(this.sunLight);
    }
    
    createCity() {
        this.createGround();
        this.createRoads();
        this.createBuildings();
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: 0x2d5016
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    createRoads() {
        this.gameData.roads.forEach(roadData => {
            const width = roadData.lanes * 3.5;
            const length = Math.sqrt(
                Math.pow(roadData.end.x - roadData.start.x, 2) +
                Math.pow(roadData.end.z - roadData.start.z, 2)
            );
            
            const roadGeometry = new THREE.PlaneGeometry(width, length);
            const roadMaterial = new THREE.MeshLambertMaterial({
                color: 0x333333
            });
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            
            const midX = (roadData.start.x + roadData.end.x) / 2;
            const midZ = (roadData.start.z + roadData.end.z) / 2;
            
            road.position.set(midX, 0.1, midZ);
            road.rotation.x = -Math.PI / 2;
            
            const angle = Math.atan2(
                roadData.end.z - roadData.start.z,
                roadData.end.x - roadData.start.x
            );
            road.rotation.z = -angle;
            
            road.receiveShadow = true;
            this.scene.add(road);
            this.roads.push(road);
            
            this.createRoadMarkings(roadData, width, length, midX, midZ, angle);
        });
    }
    
    createRoadMarkings(roadData, width, length, midX, midZ, angle) {
        const lineGeometry = new THREE.PlaneGeometry(0.2, length);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF
        });
        
        for (let i = -roadData.lanes / 2; i < roadData.lanes / 2; i++) {
            if (i === 0) continue;
            
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.position.set(midX, 0.15, midZ);
            line.rotation.x = -Math.PI / 2;
            line.rotation.z = -angle;
            line.position.x += Math.cos(angle + Math.PI / 2) * i * 3.5;
            line.position.z += Math.sin(angle + Math.PI / 2) * i * 3.5;
            this.scene.add(line);
        }
    }
    
    createBuildings() {
        this.gameData.buildings.forEach(buildingData => {
            const geometry = new THREE.BoxGeometry(
                buildingData.width,
                buildingData.height,
                buildingData.depth
            );
            
            const material = new THREE.MeshLambertMaterial({
                color: new THREE.Color().setHSL(Math.random(), 0.3, 0.6)
            });
            
            const building = new THREE.Mesh(geometry, material);
            building.position.set(
                buildingData.position.x,
                buildingData.height / 2,
                buildingData.position.z
            );
            building.castShadow = true;
            building.receiveShadow = true;
            
            this.scene.add(building);
            this.buildings.push(building);
        });
    }
    
    setupVehicle() {
        this.vehicle = new Vehicle(this.scene);
        this.vehicle.position.set(100, 0, 100);
    }
    
    setupSystems() {
        this.miniMap = new MiniMap(this.gameData, this.vehicle);
        this.pathFinding = new PathFinding(this.gameData);
        this.trafficLights = new TrafficLights(this.scene, this.gameData.trafficLights);
        this.timeSystem = new TimeSystem(this.gameData.timeSystem, this.scene, this.sunLight, this.ambientLight);
        this.passengerSystem = new PassengerSystem(this.scene, this.gameData.passengers);
    }
    
    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key.toLowerCase() === 'h') {
                this.vehicle.playHorn();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    setupUI() {
        this.updateMoneyDisplay();
        this.updateStatsDisplay();
    }
    
    showPassengerList() {
        const passengerList = document.getElementById('passenger-list');
        const passengerGrid = document.getElementById('passenger-grid');
        
        passengerGrid.innerHTML = '';
        
        this.gameData.passengers.forEach(passenger => {
            const card = this.createPassengerCard(passenger);
            passengerGrid.appendChild(card);
        });
        
        passengerList.classList.remove('hidden');
    }
    
    hidePassengerList() {
        document.getElementById('passenger-list').classList.add('hidden');
    }
    
    createPassengerCard(passenger) {
        const card = document.createElement('div');
        card.className = 'passenger-card';
        card.innerHTML = `
            <h3>${passenger.name}</h3>
            <span class="type ${passenger.type}">${passenger.type.toUpperCase()}</span>
            <p>${passenger.description}</p>
            <p>Distance: ${this.calculateDistance(passenger)} miles</p>
            <p class="tip">Tip: $${passenger.baseTip.toFixed(2)}</p>
        `;
        
        card.addEventListener('click', () => {
            this.selectPassenger(passenger);
            this.hidePassengerList();
        });
        
        return card;
    }
    
    selectPassenger(passenger) {
        this.currentPassenger = passenger;
        this.gameState = 'going_to_pickup';
        
        this.currentPath = this.pathFinding.findPath(
            this.vehicle.position,
            passenger.pickup
        );
        
        this.passengerSystem.showMarker(passenger.pickup, 'pickup');
        
        this.showMissionInfo(passenger);
        this.showNotification(`Picking up ${passenger.name}`);
    }
    
    showMissionInfo(passenger) {
        const missionInfo = document.getElementById('mission-info');
        document.getElementById('passenger-name').textContent = passenger.name;
        document.getElementById('passenger-desc').textContent = passenger.description;
        document.getElementById('distance').textContent = this.calculateDistance(passenger).toFixed(2);
        document.getElementById('estimated-tip').textContent = passenger.baseTip.toFixed(2);
        missionInfo.classList.remove('hidden');
    }
    
    hideMissionInfo() {
        document.getElementById('mission-info').classList.add('hidden');
    }
    
    calculateDistance(passenger) {
        const dx = passenger.dropoff.x - passenger.pickup.x;
        const dz = passenger.dropoff.z - passenger.pickup.z;
        return Math.sqrt(dx * dx + dz * dz) / 100;
    }
    
    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 2000);
    }
    
    updateMoneyDisplay() {
        document.getElementById('money').textContent = this.money;
    }
    
    updateStatsDisplay() {
        document.getElementById('trip-count').textContent = this.tripCount;
        document.getElementById('rating').textContent = this.rating.toFixed(1);
    }
    
    update(deltaTime) {
        if (this.keys['w']) {
            this.vehicle.accelerate(deltaTime);
        }
        if (this.keys['s']) {
            this.vehicle.brake(deltaTime);
        }
        if (this.keys['a']) {
            this.vehicle.steerLeft(deltaTime);
        }
        if (this.keys['d']) {
            this.vehicle.steerRight(deltaTime);
        }
        if (this.keys[' ']) {
            this.vehicle.handbrake(deltaTime);
        }
        
        this.vehicle.update(deltaTime);
        this.updateCamera();
        this.updateSpeedometer();
        
        this.trafficLights.update(deltaTime);
        this.timeSystem.update(deltaTime);
        this.miniMap.update(this.vehicle.position);
        
        if (this.gameState === 'going_to_pickup') {
            this.checkPickupReached();
        } else if (this.gameState === 'going_to_dropoff') {
            this.checkDropoffReached();
        }
        
        this.checkTrafficViolations();
    }
    
    updateCamera() {
        const cameraOffset = new THREE.Vector3(0, 15, -30);
        cameraOffset.applyQuaternion(this.vehicle.mesh.quaternion);
        
        this.camera.position.copy(this.vehicle.position).add(cameraOffset);
        this.camera.lookAt(this.vehicle.position);
    }
    
    updateSpeedometer() {
        const speed = Math.abs(this.vehicle.speed * 2.237);
        document.getElementById('speed').textContent = Math.round(speed);
        this.drawSpeedometer(speed);
    }
    
    drawSpeedometer(speed) {
        const canvas = document.getElementById('speedometer-canvas');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 80;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, 0.25 * Math.PI);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 10;
        ctx.stroke();
        
        const angle = 0.75 * Math.PI + (speed / 120) * 1.5 * Math.PI;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, angle);
        ctx.strokeStyle = '#FFCC00';
        ctx.lineWidth = 10;
        ctx.stroke();
    }
    
    checkPickupReached() {
        const distance = this.vehicle.position.distanceTo(
            new THREE.Vector3(
                this.currentPassenger.pickup.x,
                0,
                this.currentPassenger.pickup.z
            )
        );
        
        if (distance < 5 && this.vehicle.speed < 0.1) {
            this.pickupPassenger();
        }
    }
    
    pickupPassenger() {
        this.gameState = 'going_to_dropoff';
        
        this.currentPath = this.pathFinding.findPath(
            this.vehicle.position,
            this.currentPassenger.dropoff
        );
        
        this.passengerSystem.hideMarker('pickup');
        this.passengerSystem.showMarker(this.currentPassenger.dropoff, 'dropoff');
        
        this.showNotification(`Passenger picked up! Going to destination...`);
    }
    
    checkDropoffReached() {
        const distance = this.vehicle.position.distanceTo(
            new THREE.Vector3(
                this.currentPassenger.dropoff.x,
                0,
                this.currentPassenger.dropoff.z
            )
        );
        
        if (distance < 5 && this.vehicle.speed < 0.1) {
            this.dropoffPassenger();
        }
    }
    
    dropoffPassenger() {
        const tip = this.calculateTip();
        this.money += tip;
        this.tripCount++;
        
        this.updateMoneyDisplay();
        this.updateStatsDisplay();
        
        this.passengerSystem.hideMarker('dropoff');
        this.hideMissionInfo();
        
        this.showNotification(`Trip completed! Earned $${tip.toFixed(2)}`);
        
        this.currentPassenger = null;
        this.currentPath = null;
        this.gameState = 'free';
    }
    
    calculateTip() {
        let tip = this.currentPassenger.baseTip;
        
        const timeBonus = this.timeSystem.getTimeBonus();
        tip *= timeBonus;
        
        if (this.rating > 4.5) {
            tip *= 1.2;
        }
        
        return tip;
    }
    
    checkTrafficViolations() {
        const nearbyLight = this.trafficLights.getNearbyLight(this.vehicle.position);
        
        if (nearbyLight && nearbyLight.state === 'red' && this.vehicle.speed > 5) {
            this.money -= 5;
            this.rating -= 0.1;
            this.updateMoneyDisplay();
            this.updateStatsDisplay();
            this.showNotification('Traffic violation! -$5');
        }
    }
    
    start() {
        let lastTime = performance.now();
        
        const animate = (currentTime) => {
            requestAnimationFrame(animate);
            
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            
            this.update(deltaTime);
            this.renderer.render(this.scene, this.camera);
        };
        
        animate(lastTime);
    }
}