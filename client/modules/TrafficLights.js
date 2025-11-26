import * as THREE from 'three';

export class TrafficLights {
    constructor(scene, trafficLightData) {
        this.scene = scene;
        this.lights = [];
        
        trafficLightData.forEach(data => {
            const light = this.createTrafficLight(data);
            this.lights.push(light);
        });
    }
    
    createTrafficLight(data) {
        const group = new THREE.Group();
        
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 5, 8);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 2.5;
        group.add(pole);
        
        const housingGeometry = new THREE.BoxGeometry(0.8, 2, 0.5);
        const housingMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.y = 6;
        group.add(housing);
        
        const redGeometry = new THREE.CircleGeometry(0.25, 16);
        const redMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        const redLight = new THREE.Mesh(redGeometry, redMaterial);
        redLight.position.set(0, 6.6, 0.26);
        group.add(redLight);
        
        const yellowGeometry = new THREE.CircleGeometry(0.25, 16);
        const yellowMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        const yellowLight = new THREE.Mesh(yellowGeometry, yellowMaterial);
        yellowLight.position.set(0, 6, 0.26);
        group.add(yellowLight);
        
        const greenGeometry = new THREE.CircleGeometry(0.25, 16);
        const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
        const greenLight = new THREE.Mesh(greenGeometry, greenMaterial);
        greenLight.position.set(0, 5.4, 0.26);
        group.add(greenLight);
        
        group.position.set(data.position.x, 0, data.position.z);
        this.scene.add(group);
        
        return {
            group: group,
            redLight: redLight,
            yellowLight: yellowLight,
            greenLight: greenLight,
            state: 'green',
            timer: 0,
            cycleTime: data.cycleTime,
            greenDuration: data.greenDuration,
            yellowDuration: data.yellowDuration,
            redDuration: data.redDuration,
            position: data.position
        };
    }
    
    update(deltaTime) {
        this.lights.forEach(light => {
            light.timer += deltaTime;
            
            if (light.state === 'green' && light.timer >= light.greenDuration) {
                this.setState(light, 'yellow');
            } else if (light.state === 'yellow' && light.timer >= light.yellowDuration) {
                this.setState(light, 'red');
            } else if (light.state === 'red' && light.timer >= light.redDuration) {
                this.setState(light, 'green');
            }
        });
    }
    
    setState(light, state) {
        light.state = state;
        light.timer = 0;
        
        light.redLight.material.emissive = new THREE.Color(0x000000);
        light.yellowLight.material.emissive = new THREE.Color(0x000000);
        light.greenLight.material.emissive = new THREE.Color(0x000000);
        
        light.redLight.material.opacity = 0.3;
        light.yellowLight.material.opacity = 0.3;
        light.greenLight.material.opacity = 0.3;
        
        if (state === 'red') {
            light.redLight.material.emissive = new THREE.Color(0xFF0000);
            light.redLight.material.opacity = 1;
        } else if (state === 'yellow') {
            light.yellowLight.material.emissive = new THREE.Color(0xFFFF00);
            light.yellowLight.material.opacity = 1;
        } else if (state === 'green') {
            light.greenLight.material.emissive = new THREE.Color(0x00FF00);
            light.greenLight.material.opacity = 1;
        }
    }
    
    getNearbyLight(position) {
        for (const light of this.lights) {
            const distance = Math.sqrt(
                Math.pow(position.x - light.position.x, 2) +
                Math.pow(position.z - light.position.z, 2)
            );
            
            if (distance < 10) {
                return light;
            }
        }
        return null;
    }
}