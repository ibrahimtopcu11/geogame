export class MiniMap {
    constructor(gameData, vehicle) {
        this.canvas = document.getElementById('minimap');
        this.ctx = this.canvas.getContext('2d');
        this.gameData = gameData;
        this.vehicle = vehicle;
        
        this.scale = 0.4;
        this.offsetX = 125;
        this.offsetY = 125;
        
        this.markers = [];
    }
    
    update(vehiclePosition) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawRoads();
        this.drawBuildings();
        this.drawPassengers();
        this.drawMarkers();
        this.drawVehicle(vehiclePosition);
    }
    
    worldToMap(x, z) {
        return {
            x: x * this.scale + this.offsetX,
            y: z * this.scale + this.offsetY
        };
    }
    
    drawRoads() {
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 3;
        
        this.gameData.roads.forEach(road => {
            const start = this.worldToMap(road.start.x, road.start.z);
            const end = this.worldToMap(road.end.x, road.end.z);
            
            this.ctx.beginPath();
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(end.x, end.y);
            this.ctx.stroke();
        });
    }
    
    drawBuildings() {
        this.ctx.fillStyle = '#888';
        
        this.gameData.buildings.forEach(building => {
            const pos = this.worldToMap(building.position.x, building.position.z);
            const width = building.width * this.scale;
            const depth = building.depth * this.scale;
            
            this.ctx.fillRect(
                pos.x - width / 2,
                pos.y - depth / 2,
                width,
                depth
            );
        });
    }
    
    drawPassengers() {
        this.gameData.passengers.forEach(passenger => {
            const pos = this.worldToMap(passenger.pickup.x, passenger.pickup.z);
            
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#FFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
    }
    
    drawMarkers() {
        this.markers.forEach(marker => {
            const pos = this.worldToMap(marker.x, marker.z);
            
            if (marker.type === 'pickup') {
                this.ctx.fillStyle = '#FFCC00';
            } else if (marker.type === 'dropoff') {
                this.ctx.fillStyle = '#2196F3';
            }
            
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#FFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
    }
    
    drawVehicle(vehiclePosition) {
        const pos = this.worldToMap(vehiclePosition.x, vehiclePosition.z);
        
        this.ctx.save();
        this.ctx.translate(pos.x, pos.y);
        
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -6);
        this.ctx.lineTo(-4, 4);
        this.ctx.lineTo(4, 4);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    addMarker(x, z, type) {
        this.markers.push({ x, z, type });
    }
    
    removeMarker(type) {
        this.markers = this.markers.filter(m => m.type !== type);
    }
    
    clearMarkers() {
        this.markers = [];
    }
}