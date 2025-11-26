import * as THREE from 'three';

export class PassengerSystem {
    constructor(scene, passengers) {
        this.scene = scene;
        this.passengers = passengers;
        this.markers = new Map();
        this.passengerMeshes = [];
        
        this.createPassengerMeshes();
    }
    
    createPassengerMeshes() {
        this.passengers.forEach(passenger => {
            const mesh = this.createPassengerMesh();
            mesh.position.set(
                passenger.pickup.x,
                0,
                passenger.pickup.z
            );
            this.scene.add(mesh);
            this.passengerMeshes.push({ passenger, mesh });
        });
    }
    
    createPassengerMesh() {
        const group = new THREE.Group();
        
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        group.add(body);
        
        const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2;
        group.add(head);
        
        return group;
    }
    
    showMarker(position, type) {
        const geometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
        let material;
        
        if (type === 'pickup') {
            material = new THREE.MeshBasicMaterial({ 
                color: 0xFFCC00,
                transparent: true,
                opacity: 0.8
            });
        } else {
            material = new THREE.MeshBasicMaterial({ 
                color: 0x2196F3,
                transparent: true,
                opacity: 0.8
            });
        }
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(position.x, 0.1, position.z);
        
        this.scene.add(marker);
        this.markers.set(type, marker);
        
        this.animateMarker(marker);
    }
    
    animateMarker(marker) {
        const animate = () => {
            if (!this.scene.children.includes(marker)) return;
            
            marker.rotation.y += 0.02;
            marker.position.y = 0.1 + Math.sin(Date.now() * 0.003) * 0.3;
            
            requestAnimationFrame(animate);
        };
        animate();
    }
    
    hideMarker(type) {
        const marker = this.markers.get(type);
        if (marker) {
            this.scene.remove(marker);
            this.markers.delete(type);
        }
    }
    
    removePassenger(passengerId) {
        const index = this.passengerMeshes.findIndex(
            item => item.passenger.id === passengerId
        );
        
        if (index !== -1) {
            this.scene.remove(this.passengerMeshes[index].mesh);
            this.passengerMeshes.splice(index, 1);
        }
    }
}