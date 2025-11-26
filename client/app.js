import * as THREE from 'three';
import { TaxiGame } from './modules/TaxiGame.js';

let game;

async function init() {
    const canvas = document.getElementById('game-canvas');
    game = new TaxiGame(canvas);
    
    await game.init();
    game.start();
    
    setupEventListeners();
}

function setupEventListeners() {
    const searchBtn = document.getElementById('search-passenger-btn');
    searchBtn.addEventListener('click', () => {
        game.showPassengerList();
    });
    
    const closeListBtn = document.getElementById('close-passenger-list');
    closeListBtn.addEventListener('click', () => {
        game.hidePassengerList();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            game.showPassengerList();
        }
    });
}

window.addEventListener('DOMContentLoaded', init);