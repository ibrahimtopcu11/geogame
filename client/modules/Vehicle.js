import * as THREE from 'three';

export class Vehicle {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.speed = 0;
        this.maxSpeed = 30;
        this.acceleration = 8;
        this.brakeForce = 15;
        this.friction = 2;
        this.steerAngle = 0;
        this.maxSteerAngle = 0.6;
        this.steerSpeed = 2;
        
        this.createMesh();
    }
    
    createMesh() {
        const taxiGroup = new THREE.Group();
        
        const bodyGeometry = new THREE.BoxGeometry(4, 2, 7);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.5;
        body.castShadow = true;
        taxiGroup.add(body);
        
        const roofGeometry = new THREE.BoxGeometry(3.5, 1.5, 4);
        const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
        roof.position.y = 3;
        roof.castShadow = true;
        taxiGroup.add(roof);
        
        const windowMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.6
        });
        
        const frontWindowGeometry = new THREE.PlaneGeometry(3, 1.2);
        const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
        frontWindow.position.set(0, 3, 2.5);
        frontWindow.rotation.x = -0.3;
        taxiGroup.add(frontWindow);
        
        const backWindowGeometry = new THREE.PlaneGeometry(3, 1.2);
        const backWindow = new THREE.Mesh(backWindowGeometry, windowMaterial);
        backWindow.position.set(0, 3, -2.5);
        backWindow.rotation.x = 0.3;
        backWindow.rotation.y = Math.PI;
        taxiGroup.add(backWindow);
        
        const sideWindowGeometry = new THREE.PlaneGeometry(3.5, 1.2);
        const leftWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
        leftWindow.position.set(-1.9, 3, 0);
        leftWindow.rotation.y = Math.PI / 2;
        taxiGroup.add(leftWindow);
        
        const rightWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
        rightWindow.position.set(1.9, 3, 0);
        rightWindow.rotation.y = -Math.PI / 2;
        taxiGroup.add(rightWindow);
        
        const signGeometry = new THREE.BoxGeometry(2, 0.3, 1);
        const signMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.y = 4;
        taxiGroup.add(sign);
        
        const signTextGeometry = new THREE.PlaneGeometry(1.5, 0.2);
        const signTextMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const signText = new THREE.Mesh(signTextGeometry, signTextMaterial);
        signText.position.set(0, 4, 0.51);
        taxiGroup.add(signText);
        
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const wheels = [
            { x: -1.5, z: 2.5 },
            { x: 1.5, z: 2.5 },
            { x: -1.5, z: -2.5 },
            { x: 1.5, z: -2.5 }
        ];
        
        this.wheels = [];
        wheels.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, 0.5, pos.z);
            wheel.castShadow = true;
            taxiGroup.add(wheel);
            this.wheels.push(wheel);
        });
        
        const headlightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1, 1.5, 3.6);
        taxiGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(1, 1.5, 3.6);
        taxiGroup.add(rightHeadlight);
        
        const leftLight = new THREE.SpotLight(0xFFFFFF, 0.8, 50, Math.PI / 6);
        leftLight.position.copy(leftHeadlight.position);
        leftLight.target.position.set(-1, 0, 50);
        taxiGroup.add(leftLight);
        taxiGroup.add(leftLight.target);
        
        const rightLight = new THREE.SpotLight(0xFFFFFF, 0.8, 50, Math.PI / 6);
        rightLight.position.copy(rightHeadlight.position);
        rightLight.target.position.set(1, 0, 50);
        taxiGroup.add(rightLight);
        taxiGroup.add(rightLight.target);
        
        this.mesh = taxiGroup;
        this.scene.add(this.mesh);
    }
    
    accelerate(deltaTime) {
        this.speed += this.acceleration * deltaTime;
        this.speed = Math.min(this.speed, this.maxSpeed);
    }
    
    brake(deltaTime) {
        if (this.speed > 0) {
            this.speed -= this.brakeForce * deltaTime;
            this.speed = Math.max(this.speed, 0);
        } else {
            this.speed -= this.acceleration * 0.5 * deltaTime;
            this.speed = Math.max(this.speed, -this.maxSpeed * 0.5);
        }
    }
    
    handbrake(deltaTime) {
        this.speed -= this.brakeForce * 2 * deltaTime;
        if (Math.abs(this.speed) < 0.5) {
            this.speed = 0;
        }
    }
    
    steerLeft(deltaTime) {
        if (Math.abs(this.speed) > 0.5) {
            this.steerAngle += this.steerSpeed * deltaTime;
            this.steerAngle = Math.min(this.steerAngle, this.maxSteerAngle);
        }
    }
    
    steerRight(deltaTime) {
        if (Math.abs(this.speed) > 0.5) {
            this.steerAngle -= this.steerSpeed * deltaTime;
            this.steerAngle = Math.max(this.steerAngle, -this.maxSteerAngle);
        }
    }
    
    update(deltaTime) {
        if (Math.abs(this.speed) < 0.1) {
            this.steerAngle *= 0.9;
        }
        
        if (this.speed !== 0) {
            this.speed -= Math.sign(this.speed) * this.friction * deltaTime;
            if (Math.abs(this.speed) < 0.1) {
                this.speed = 0;
            }
        }
        
        if (this.speed !== 0) {
            this.mesh.rotation.y += this.steerAngle * deltaTime * (this.speed / this.maxSpeed);
        }
        
        this.steerAngle *= 0.95;
        
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(this.mesh.quaternion);
        
        this.velocity.copy(direction).multiplyScalar(this.speed);
        
        this.mesh.position.add(
            this.velocity.clone().multiplyScalar(deltaTime)
        );
        
        this.position.copy(this.mesh.position);
        
        this.animateWheels(deltaTime);
    }
    
    animateWheels(deltaTime) {
        const rotationSpeed = this.speed * deltaTime * 2;
        
        this.wheels.forEach((wheel, index) => {
            wheel.rotation.x += rotationSpeed;
            
            if (index < 2) {
                wheel.rotation.y = this.steerAngle * 0.5;
            }
        });
    }
    
    playHorn() {
        const hornAudio = new Audio('assets/sounds/horn.mp3');
        hornAudio.volume = 0.3;
        hornAudio.play().catch(e => {});
    }
}