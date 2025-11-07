import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 10, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('scene-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Additional point lights for atmosphere
const pointLight1 = new THREE.PointLight(0x4488ff, 0.5, 30);
pointLight1.position.set(-10, 5, -10);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xff8844, 0.5, 30);
pointLight2.position.set(10, 5, 10);
scene.add(pointLight2);

// Floor
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a3a,
    roughness: 0.8,
    metalness: 0.2
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Grid Helper
const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
scene.add(gridHelper);

// HVAC Equipment Data
const equipmentData = {
    chiller1: { temp: 7.2, pressure: 4.5, flow: 120, status: 'Running' },
    ahu1: { temp: 18.5, humidity: 55, flow: 8500, status: 'Running' },
    pump1: { flow: 95, pressure: 6.2, power: 15.5, status: 'Running' },
    coolingTower: { temp: 32.1, flow: 150, fanSpeed: 85, status: 'Running' }
};

// Collision objects array
const collisionObjects = [];

// HVAC Equipment Creation
function createHVACEquipment() {
    const equipment = new THREE.Group();

    // Chiller (large rectangular unit)
    const chillerGeometry = new THREE.BoxGeometry(4, 3, 2.5);
    const chillerMaterial = new THREE.MeshStandardMaterial({ color: 0x3498db });
    const chiller = new THREE.Mesh(chillerGeometry, chillerMaterial);
    chiller.position.set(-10, 1.5, -8);
    chiller.castShadow = true;
    chiller.receiveShadow = true;
    chiller.userData = { type: 'chiller', id: 'chiller1', isObstacle: true, radius: 2.5 };
    equipment.add(chiller);
    collisionObjects.push(chiller);

    // Add pipes to chiller
    const pipeGeometry = new THREE.CylinderGeometry(0.15, 0.15, 3, 16);
    const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x95a5a6 });

    const pipe1 = new THREE.Mesh(pipeGeometry, pipeMaterial);
    pipe1.position.set(-10, 1.5, -6);
    pipe1.rotation.x = Math.PI / 2;
    equipment.add(pipe1);

    // AHU (Air Handling Unit)
    const ahuGeometry = new THREE.BoxGeometry(3, 2, 2);
    const ahuMaterial = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
    const ahu = new THREE.Mesh(ahuGeometry, ahuMaterial);
    ahu.position.set(8, 1, -8);
    ahu.castShadow = true;
    ahu.receiveShadow = true;
    ahu.userData = { type: 'ahu', id: 'ahu1', isObstacle: true, radius: 2 };
    equipment.add(ahu);
    collisionObjects.push(ahu);

    // Pump
    const pumpGeometry = new THREE.CylinderGeometry(0.8, 1, 1.5, 32);
    const pumpMaterial = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.position.set(-5, 0.75, 5);
    pump.castShadow = true;
    pump.receiveShadow = true;
    pump.userData = { type: 'pump', id: 'pump1', isObstacle: true, radius: 1.5 };
    equipment.add(pump);
    collisionObjects.push(pump);

    // Cooling Tower
    const towerBase = new THREE.CylinderGeometry(2, 2.5, 4, 8);
    const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x95a5a6 });
    const coolingTower = new THREE.Mesh(towerBase, towerMaterial);
    coolingTower.position.set(10, 2, 5);
    coolingTower.castShadow = true;
    coolingTower.receiveShadow = true;
    coolingTower.userData = { type: 'coolingTower', id: 'coolingTower', isObstacle: true, radius: 2.8 };
    equipment.add(coolingTower);
    collisionObjects.push(coolingTower);

    // Add some ductwork
    const ductGeometry = new THREE.BoxGeometry(8, 0.5, 0.5);
    const ductMaterial = new THREE.MeshStandardMaterial({ color: 0x7f8c8d });
    const duct = new THREE.Mesh(ductGeometry, ductMaterial);
    duct.position.set(0, 4, -8);
    equipment.add(duct);

    return equipment;
}

const hvacEquipment = createHVACEquipment();
scene.add(hvacEquipment);

// Engineer System
class Engineer {
    constructor(name, position, role) {
        this.name = name;
        this.position = position;
        this.role = role;
        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
        this.currentState = 'idle';  // idle, walking, talking, working
        this.targetPosition = null;
        this.speed = 0.05;
        this.dialogue = null;
        this.dialogueElement = null;
        this.isSpeaking = false;
        this.isWorking = false;
        this.animationsLoaded = 0;
        this.totalAnimations = 4;
    }

    loadModel() {
        const loader = new FBXLoader();

        // Load base model (Standing)
        loader.load('Standing.fbx', (fbx) => {
            this.model = fbx;
            this.model.scale.setScalar(0.01);
            this.model.position.copy(this.position);
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            scene.add(this.model);

            // Set up animation mixer
            this.mixer = new THREE.AnimationMixer(this.model);

            // Store standing animation
            if (fbx.animations.length > 0) {
                const action = this.mixer.clipAction(fbx.animations[0]);
                action.setLoop(THREE.LoopRepeat);
                this.animations.standing = action;
                this.animationsLoaded++;
            }

            // Load other animations
            this.loadAnimation('Walking.fbx', 'walking');
            this.loadAnimation('Talking.fbx', 'talking');
            this.loadAnimation('Working.fbx', 'working');
        });
    }

    loadAnimation(file, name) {
        const loader = new FBXLoader();
        loader.load(file, (fbx) => {
            if (fbx.animations.length > 0) {
                const action = this.mixer.clipAction(fbx.animations[0]);
                action.setLoop(THREE.LoopRepeat);
                this.animations[name] = action;
                this.animationsLoaded++;

                // Once all animations loaded, start with standing
                if (this.animationsLoaded === this.totalAnimations) {
                    this.setState('idle');
                }
            }
        });
    }

    setState(newState) {
        if (this.currentState === newState) return;

        const stateAnimationMap = {
            'idle': 'standing',
            'walking': 'walking',
            'talking': 'talking',
            'working': 'working'
        };

        const animName = stateAnimationMap[newState];
        if (!animName || !this.animations[animName]) return;

        // Stop all current animations
        Object.values(this.animations).forEach(action => {
            action.stop();
        });

        // Start new animation
        const newAction = this.animations[animName];
        newAction.reset();
        newAction.setEffectiveTimeScale(1);
        newAction.setEffectiveWeight(1);
        newAction.play();

        this.currentState = newState;
        this.currentAnimation = animName;
    }

    checkCollision(newPosition) {
        const engineerRadius = 0.5;

        for (const obj of collisionObjects) {
            const objPos = new THREE.Vector3();
            obj.getWorldPosition(objPos);

            const distance = new THREE.Vector2(
                newPosition.x - objPos.x,
                newPosition.z - objPos.z
            ).length();

            const minDistance = engineerRadius + (obj.userData.radius || 1);

            if (distance < minDistance) {
                return true;  // Collision detected
            }
        }

        return false;  // No collision
    }

    moveTo(targetPos) {
        // Check if target position has collision
        if (this.checkCollision(targetPos)) {
            // Find alternative position nearby
            const angle = Math.random() * Math.PI * 2;
            const offset = 3;
            targetPos = new THREE.Vector3(
                targetPos.x + Math.cos(angle) * offset,
                0,
                targetPos.z + Math.sin(angle) * offset
            );
        }

        this.targetPosition = targetPos.clone();
        this.targetPosition.y = 0;
    }

    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }

        // State machine
        if (this.isSpeaking) {
            if (this.currentState !== 'talking') {
                this.setState('talking');
            }
        } else if (this.isWorking) {
            if (this.currentState !== 'working') {
                this.setState('working');
            }
        } else if (this.targetPosition && this.model) {
            // Movement state
            const direction = new THREE.Vector3().subVectors(this.targetPosition, this.model.position);
            direction.y = 0;  // Keep movement on horizontal plane
            const distance = direction.length();

            if (distance > 0.2) {
                // Ensure walking animation is playing
                if (this.currentState !== 'walking') {
                    this.setState('walking');
                }

                direction.normalize();

                // Calculate new position
                const moveDistance = Math.min(this.speed, distance);
                const newPosition = this.model.position.clone();
                newPosition.addScaledVector(direction, moveDistance);
                newPosition.y = 0;

                // Check collision before moving
                if (!this.checkCollision(newPosition)) {
                    this.model.position.copy(newPosition);
                }

                // Smoothly rotate to face movement direction
                const targetAngle = Math.atan2(direction.x, direction.z);
                const currentAngle = this.model.rotation.y;
                const angleDiff = targetAngle - currentAngle;
                const shortestAngle = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                this.model.rotation.y += shortestAngle * 0.1;  // Smooth rotation
            } else {
                // Reached destination
                this.targetPosition = null;
                if (!this.isSpeaking && !this.isWorking) {
                    this.setState('idle');
                }
            }
        } else {
            // Idle state
            if (this.currentState !== 'idle' && !this.isSpeaking && !this.isWorking) {
                this.setState('idle');
            }
        }

        // Update dialogue position
        this.updateDialoguePosition();
    }

    speak(text, duration = 3000) {
        this.dialogue = text;
        this.isSpeaking = true;
        this.showDialogue(text, duration);

        setTimeout(() => {
            this.dialogue = null;
            this.isSpeaking = false;
        }, duration);
    }

    work(duration = 5000) {
        this.isWorking = true;

        setTimeout(() => {
            this.isWorking = false;
        }, duration);
    }

    showDialogue(text, duration) {
        // Remove existing dialogue
        if (this.dialogueElement) {
            document.body.removeChild(this.dialogueElement);
        }

        // Create speech bubble
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = text;

        // Create typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        bubble.appendChild(typingDiv);

        document.body.appendChild(bubble);
        this.dialogueElement = bubble;

        // Remove after duration
        setTimeout(() => {
            if (this.dialogueElement === bubble) {
                document.body.removeChild(bubble);
                this.dialogueElement = null;
            }
        }, duration);
    }

    updateDialoguePosition() {
        if (this.dialogueElement && this.model) {
            const vector = new THREE.Vector3();
            vector.setFromMatrixPosition(this.model.matrixWorld);
            vector.y += 2.5; // Position above head

            vector.project(camera);

            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

            this.dialogueElement.style.left = `${x}px`;
            this.dialogueElement.style.top = `${y}px`;
            this.dialogueElement.style.transform = 'translate(-50%, -100%)';
        }
    }
}

// Create Engineers
const engineers = [
    new Engineer('Mike', new THREE.Vector3(-3, 0, 0), 'Air Side Specialist'),
    new Engineer('Sarah', new THREE.Vector3(3, 0, 0), 'Water Side Specialist'),
    new Engineer('John', new THREE.Vector3(0, 0, -5), 'Controls Engineer')
];

engineers.forEach(engineer => engineer.loadModel());

// Equipment Labels
const equipmentLabels = [];

function createEquipmentLabel(equipment) {
    const label = document.createElement('div');
    label.className = 'equipment-label';
    document.body.appendChild(label);
    equipmentLabels.push({ element: label, equipment });
}

// Create labels for each equipment
hvacEquipment.children.forEach(child => {
    if (child.userData.type) {
        createEquipmentLabel(child);
    }
});

function updateEquipmentLabels() {
    equipmentLabels.forEach(({ element, equipment }) => {
        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(equipment.matrixWorld);
        vector.y += 2;

        vector.project(camera);

        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.transform = 'translate(-50%, -100%)';

        // Update data
        const data = equipmentData[equipment.userData.id];
        if (data) {
            let text = `${equipment.userData.type.toUpperCase()}\n`;
            Object.entries(data).forEach(([key, value]) => {
                text += `${key}: ${value}\n`;
            });
            element.textContent = text;
        }
    });
}

// Simulate data changes
setInterval(() => {
    Object.keys(equipmentData).forEach(key => {
        const data = equipmentData[key];
        if (data.temp !== undefined) {
            data.temp = (data.temp + (Math.random() - 0.5) * 0.5).toFixed(1);
        }
        if (data.pressure !== undefined) {
            data.pressure = (data.pressure + (Math.random() - 0.5) * 0.2).toFixed(1);
        }
        if (data.flow !== undefined) {
            data.flow = Math.round(data.flow + (Math.random() - 0.5) * 5);
        }
    });
}, 2000);

// Chatbot Functions
window.toggleChatbot = function() {
    const chatbot = document.getElementById('chatbot-container');
    chatbot.classList.toggle('collapsed');
};

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (message) {
        addChatMessage(message, 'user');
        input.value = '';

        // Simulate AI response
        setTimeout(() => {
            const response = handleAIResponse(message);
            addChatMessage(response.text, 'ai');

            // Make engineer respond
            if (response.engineer) {
                const engineer = engineers.find(e => e.name === response.engineer);
                if (engineer) {
                    engineer.speak(response.engineerResponse, 4000);
                }
            }
        }, 1000);
    }
};

function addChatMessage(text, sender) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function handleAIResponse(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('temperature') || lowerMessage.includes('temp')) {
        return {
            text: "I'll check the temperature readings for you.",
            engineer: 'Mike',
            engineerResponse: `Current chiller temperature is ${equipmentData.chiller1.temp}°C. All within normal range.`
        };
    } else if (lowerMessage.includes('maintenance') || lowerMessage.includes('check')) {
        const engineer = engineers[Math.floor(Math.random() * engineers.length)];
        engineer.moveTo(new THREE.Vector3(
            Math.random() * 10 - 5,
            0,
            Math.random() * 10 - 5
        ));
        return {
            text: `${engineer.name} is heading to perform the maintenance check.`,
            engineer: engineer.name,
            engineerResponse: "On my way to inspect the equipment now."
        };
    } else if (lowerMessage.includes('status') || lowerMessage.includes('how')) {
        return {
            text: "All HVAC systems are running normally.",
            engineer: 'Sarah',
            engineerResponse: "All equipment operating within parameters. No issues detected."
        };
    } else {
        return {
            text: "I can help you with equipment status, temperatures, and maintenance tasks.",
            engineer: null
        };
    }
}

// Allow Enter key to send
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chat-input');
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

// Engineer interactions
let engineersInteracting = true;

function simulateEngineerInteractions() {
    if (!engineersInteracting) return;

    setInterval(() => {
        // Random engineer movement
        const engineer = engineers[Math.floor(Math.random() * engineers.length)];
        if (!engineer.targetPosition && Math.random() > 0.7) {
            engineer.moveTo(new THREE.Vector3(
                Math.random() * 20 - 10,
                0,
                Math.random() * 20 - 10
            ));
        }

        // Random engineer dialogue
        if (Math.random() > 0.85) {
            const dialogues = [
                "Checking chiller performance...",
                "AHU filter needs replacement soon.",
                "Pump pressure looking good.",
                "Temperature differential optimal.",
                "Running diagnostics...",
                "All systems nominal."
            ];
            const randomEngineer = engineers[Math.floor(Math.random() * engineers.length)];
            randomEngineer.speak(dialogues[Math.floor(Math.random() * dialogues.length)]);
        }
    }, 5000);
}

simulateEngineerInteractions();

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Update engineers
    engineers.forEach(engineer => engineer.update(deltaTime));

    // Update controls
    controls.update();

    // Update equipment labels
    updateEquipmentLabels();

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
