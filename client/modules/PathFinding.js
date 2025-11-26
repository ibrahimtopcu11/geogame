import * as THREE from 'three';

export class PathFinding {
    constructor(gameData) {
        this.gameData = gameData;
        this.graph = this.buildGraph();
    }
    
    buildGraph() {
        const graph = new Map();
        
        this.gameData.roads.forEach(road => {
            const startKey = `${road.start.x},${road.start.z}`;
            const endKey = `${road.end.x},${road.end.z}`;
            
            if (!graph.has(startKey)) {
                graph.set(startKey, []);
            }
            if (!graph.has(endKey)) {
                graph.set(endKey, []);
            }
            
            const distance = Math.sqrt(
                Math.pow(road.end.x - road.start.x, 2) +
                Math.pow(road.end.z - road.start.z, 2)
            );
            
            graph.get(startKey).push({ node: endKey, cost: distance });
            graph.get(endKey).push({ node: startKey, cost: distance });
        });
        
        return graph;
    }
    
    findPath(start, end) {
        const startNode = this.findNearestNode(start);
        const endNode = this.findNearestNode(end);
        
        if (!startNode || !endNode) {
            return [];
        }
        
        const path = this.aStar(startNode, endNode);
        return path.map(nodeKey => {
            const [x, z] = nodeKey.split(',').map(Number);
            return new THREE.Vector3(x, 0, z);
        });
    }
    
    findNearestNode(position) {
        let nearest = null;
        let minDistance = Infinity;
        
        for (const nodeKey of this.graph.keys()) {
            const [x, z] = nodeKey.split(',').map(Number);
            const distance = Math.sqrt(
                Math.pow(position.x - x, 2) +
                Math.pow(position.z - z, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = nodeKey;
            }
        }
        
        return nearest;
    }
    
    aStar(startKey, endKey) {
        const openSet = new Set([startKey]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startKey, endKey));
        
        while (openSet.size > 0) {
            let current = null;
            let lowestF = Infinity;
            
            for (const node of openSet) {
                const f = fScore.get(node) || Infinity;
                if (f < lowestF) {
                    lowestF = f;
                    current = node;
                }
            }
            
            if (current === endKey) {
                return this.reconstructPath(cameFrom, current);
            }
            
            openSet.delete(current);
            
            const neighbors = this.graph.get(current) || [];
            for (const neighbor of neighbors) {
                const tentativeG = (gScore.get(current) || Infinity) + neighbor.cost;
                
                if (tentativeG < (gScore.get(neighbor.node) || Infinity)) {
                    cameFrom.set(neighbor.node, current);
                    gScore.set(neighbor.node, tentativeG);
                    fScore.set(neighbor.node, tentativeG + this.heuristic(neighbor.node, endKey));
                    
                    openSet.add(neighbor.node);
                }
            }
        }
        
        return [];
    }
    
    heuristic(nodeKey1, nodeKey2) {
        const [x1, z1] = nodeKey1.split(',').map(Number);
        const [x2, z2] = nodeKey2.split(',').map(Number);
        
        return Math.sqrt(
            Math.pow(x2 - x1, 2) +
            Math.pow(z2 - z1, 2)
        );
    }
    
    reconstructPath(cameFrom, current) {
        const path = [current];
        
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
        }
        
        return path;
    }
}