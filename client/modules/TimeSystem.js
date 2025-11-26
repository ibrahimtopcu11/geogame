export class TimeSystem {
    constructor(config, scene, sunLight, ambientLight) {
        this.scene = scene;
        this.sunLight = sunLight;
        this.ambientLight = ambientLight;
        
        this.currentTime = config.startTime;
        this.timeScale = config.timeScale;
        this.dayNightCycle = config.dayNightCycle;
    }
    
    update(deltaTime) {
        this.currentTime += (deltaTime * this.timeScale) / 3600;
        
        if (this.currentTime >= 24) {
            this.currentTime -= 24;
        }
        
        this.updateSky();
        this.updateLighting();
        this.updateUI();
    }
    
    updateSky() {
        if (!this.dayNightCycle) return;
        
        const hour = this.currentTime;
        let skyColor;
        
        if (hour >= 6 && hour < 8) {
            skyColor = this.lerpColor(0x001a33, 0x87CEEB, (hour - 6) / 2);
        } else if (hour >= 8 && hour < 18) {
            skyColor = 0x87CEEB;
        } else if (hour >= 18 && hour < 20) {
            skyColor = this.lerpColor(0x87CEEB, 0xFF6B35, (hour - 18) / 2);
        } else if (hour >= 20 && hour < 22) {
            skyColor = this.lerpColor(0xFF6B35, 0x001a33, (hour - 20) / 2);
        } else {
            skyColor = 0x001a33;
        }
        
        this.scene.background = new THREE.Color(skyColor);
        this.scene.fog.color = new THREE.Color(skyColor);
    }
    
    updateLighting() {
        if (!this.dayNightCycle) return;
        
        const hour = this.currentTime;
        let sunIntensity, ambientIntensity;
        
        if (hour >= 6 && hour < 18) {
            sunIntensity = 0.8;
            ambientIntensity = 0.6;
        } else if (hour >= 18 && hour < 20) {
            const t = (hour - 18) / 2;
            sunIntensity = 0.8 * (1 - t) + 0.2 * t;
            ambientIntensity = 0.6 * (1 - t) + 0.3 * t;
        } else if (hour >= 20 || hour < 6) {
            sunIntensity = 0.2;
            ambientIntensity = 0.3;
        } else {
            const t = (hour - 6) / 2;
            sunIntensity = 0.2 * (1 - t) + 0.8 * t;
            ambientIntensity = 0.3 * (1 - t) + 0.6 * t;
        }
        
        this.sunLight.intensity = sunIntensity;
        this.ambientLight.intensity = ambientIntensity;
    }
    
    updateUI() {
        const hours = Math.floor(this.currentTime);
        const minutes = Math.floor((this.currentTime - hours) * 60);
        
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        document.getElementById('game-time').textContent = timeString;
        
        let period;
        if (hours >= 6 && hours < 12) {
            period = 'Morning';
        } else if (hours >= 12 && hours < 18) {
            period = 'Afternoon';
        } else if (hours >= 18 && hours < 22) {
            period = 'Evening';
        } else {
            period = 'Night';
        }
        
        document.getElementById('day-night').textContent = period;
    }
    
    getTimeBonus() {
        const hour = this.currentTime;
        
        if (hour >= 6 && hour < 12) {
            return 1.0;
        } else if (hour >= 12 && hour < 18) {
            return 0.9;
        } else if (hour >= 18 && hour < 22) {
            return 1.2;
        } else {
            return 1.5;
        }
    }
    
    lerpColor(color1, color2, t) {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        return c1.lerp(c2, t).getHex();
    }
}