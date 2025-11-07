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
    color: 0xe0e0e0, // Whitish grey
    roughness: 0.9,
    metalness: 0.1
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Grid Helper
const gridHelper = new THREE.GridHelper(100, 50, 0xcccccc, 0xdddddd);
scene.add(gridHelper);

// HVAC Equipment Data
const equipmentData = {
    chiller1: { temp: 7.2, pressure: 4.5, flow: 120, status: 'Running', hasIssue: false },
    ahu1: { temp: 18.5, humidity: 55, flow: 8500, status: 'Running', hasIssue: false },
    pump1: { flow: 95, pressure: 6.2, power: 15.5, status: 'Running', hasIssue: false },
    coolingTower: { temp: 32.1, flow: 150, fanSpeed: 85, status: 'Running', hasIssue: false }
};

// Equipment positions for engineers to walk to
const equipmentPositions = {
    chiller1: new THREE.Vector3(-10, 0, -8),
    ahu1: new THREE.Vector3(8, 0, -8),
    pump1: new THREE.Vector3(-5, 0, 5),
    coolingTower: new THREE.Vector3(10, 0, 5)
};

// Collision objects array
const collisionObjects = [];

// HVAC Equipment Creation
function createHVACEquipment() {
    const equipment = new THREE.Group();

    // Load Chiller FBX Model
    const loader = new FBXLoader();
    loader.load('Chiller.fbx', (fbx) => {
        fbx.scale.setScalar(0.04); // 4 times bigger than before
        fbx.position.set(-10, 0, -8);

        fbx.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        fbx.userData = { type: 'chiller', id: 'chiller1', isObstacle: true, radius: 5 }; // Bigger collision radius
        equipment.add(fbx);
        collisionObjects.push(fbx);

        // Create equipment label for the chiller
        createEquipmentLabel(fbx);
    });

    // Load AHU FBX Model
    const ahuLoader = new FBXLoader();
    ahuLoader.load('AHU.fbx', (fbx) => {
        fbx.scale.setScalar(0.04); // Same scale as chiller
        fbx.position.set(8, 0, -8);

        fbx.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        fbx.userData = { type: 'ahu', id: 'ahu1', isObstacle: true, radius: 3 };
        equipment.add(fbx);
        collisionObjects.push(fbx);

        // Create equipment label for the AHU
        createEquipmentLabel(fbx);
    });

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

            // Store standing animation and play immediately
            if (fbx.animations.length > 0) {
                const action = this.mixer.clipAction(fbx.animations[0]);
                action.setLoop(THREE.LoopRepeat);
                this.animations.standing = action;
                this.animationsLoaded++;

                // Play standing animation immediately to avoid T-pose
                action.play();
                this.currentState = 'idle';
                this.currentAnimation = 'standing';
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

        // Check collision with equipment
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

        // Check collision with other engineers
        for (const otherEngineer of engineers) {
            if (otherEngineer === this || !otherEngineer.model) continue;

            const otherPos = otherEngineer.model.position;
            const distance = new THREE.Vector2(
                newPosition.x - otherPos.x,
                newPosition.z - otherPos.z
            ).length();

            if (distance < engineerRadius * 2) {
                return true;  // Collision with other engineer
            }
        }

        return false;  // No collision
    }

    moveTo(targetPos, onArrival = null) {
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
        this.onArrivalCallback = onArrival;
    }

    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }

        // Handle movement first (before state changes)
        if (this.targetPosition && this.model && !this.isWorking) {
            // Movement state
            const direction = new THREE.Vector3().subVectors(this.targetPosition, this.model.position);
            direction.y = 0;  // Keep movement on horizontal plane
            const distance = direction.length();

            if (distance > 0.5) {
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
                } else {
                    // Try to move around obstacle
                    // Try moving perpendicular to the direction
                    const perpendicular1 = new THREE.Vector3(-direction.z, 0, direction.x);
                    const perpendicular2 = new THREE.Vector3(direction.z, 0, -direction.x);

                    const alt1 = this.model.position.clone().addScaledVector(perpendicular1, moveDistance);
                    const alt2 = this.model.position.clone().addScaledVector(perpendicular2, moveDistance);

                    if (!this.checkCollision(alt1)) {
                        this.model.position.copy(alt1);
                    } else if (!this.checkCollision(alt2)) {
                        this.model.position.copy(alt2);
                    }
                    // If both blocked, just wait until path clears
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

                // Call arrival callback if it exists
                if (this.onArrivalCallback) {
                    this.onArrivalCallback();
                    this.onArrivalCallback = null;
                }

                if (!this.isSpeaking && !this.isWorking) {
                    this.setState('idle');
                }
            }
        }

        // State management - set animation based on current state
        if (this.isWorking) {
            if (this.currentState !== 'working') {
                this.setState('working');
            }
        } else if (this.isSpeaking && !this.targetPosition) {
            if (this.currentState !== 'talking') {
                this.setState('talking');
            }
        } else if (!this.targetPosition && !this.isWorking && !this.isSpeaking) {
            // Idle state
            if (this.currentState !== 'idle') {
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
                if (key !== 'hasIssue') {
                    text += `${key}: ${value}\n`;
                }
            });
            element.textContent = text;

            // Change color if there's an issue
            if (data.hasIssue) {
                element.style.color = '#ff0000';
                element.style.borderColor = '#ff0000';
            } else {
                element.style.color = '#0f0';
                element.style.borderColor = '#0f0';
            }
        }
    });
}

// Simulate data changes
setInterval(() => {
    Object.keys(equipmentData).forEach(key => {
        const data = equipmentData[key];
        if (data.temp !== undefined) {
            data.temp = parseFloat((parseFloat(data.temp) + (Math.random() - 0.5) * 0.5).toFixed(1));
        }
        if (data.pressure !== undefined) {
            data.pressure = parseFloat((parseFloat(data.pressure) + (Math.random() - 0.5) * 0.2).toFixed(1));
        }
        if (data.flow !== undefined) {
            data.flow = Math.round(parseFloat(data.flow) + (Math.random() - 0.5) * 5);
        }
    });
}, 2000);

// Function to create an equipment issue
window.createIssue = function(equipmentId) {
    if (equipmentData[equipmentId]) {
        equipmentData[equipmentId].status = 'FAULT';
        equipmentData[equipmentId].hasIssue = true;
        addChatMessage(`⚠️ ALERT: ${equipmentId.toUpperCase()} has a fault!`, 'ai');
    }
};

// Simulate random equipment issues every 30 seconds
setInterval(() => {
    const equipmentIds = Object.keys(equipmentData);
    const randomEquipment = equipmentIds[Math.floor(Math.random() * equipmentIds.length)];

    if (!equipmentData[randomEquipment].hasIssue && Math.random() > 0.7) {
        createIssue(randomEquipment);
    }
}, 30000);

// Chatbot Functions
window.toggleChatbot = function() {
    const chatbot = document.getElementById('chatbot-container');
    const icon = document.getElementById('chatbot-icon');

    chatbot.classList.toggle('collapsed');
    icon.classList.toggle('hidden');
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

    // Fix commands
    if (lowerMessage.includes('fix') || lowerMessage.includes('repair')) {
        let equipmentId = null;
        let equipmentName = '';

        if (lowerMessage.includes('chiller')) {
            equipmentId = 'chiller1';
            equipmentName = 'chiller';
        } else if (lowerMessage.includes('ahu') || lowerMessage.includes('air')) {
            equipmentId = 'ahu1';
            equipmentName = 'AHU';
        } else if (lowerMessage.includes('pump')) {
            equipmentId = 'pump1';
            equipmentName = 'pump';
        } else if (lowerMessage.includes('tower') || lowerMessage.includes('cooling')) {
            equipmentId = 'coolingTower';
            equipmentName = 'cooling tower';
        }

        if (equipmentId && equipmentPositions[equipmentId]) {
            const engineer = engineers[Math.floor(Math.random() * engineers.length)];

            // Calculate position next to equipment based on equipment size
            const equipmentPos = equipmentPositions[equipmentId].clone();
            const targetPos = equipmentPos.clone();

            // Position based on specific equipment - just outside collision radius
            if (equipmentId === 'chiller1') {
                // Chiller has radius 5, so stand at 5.5 units away
                targetPos.x -= 5.5; // Stand to the left of chiller
                targetPos.z += 0;
            } else if (equipmentId === 'ahu1') {
                // AHU has radius 3, so stand at 3.5 units away
                targetPos.x += 3.5; // Stand to the right of AHU
                targetPos.z += 0;
            } else if (equipmentId === 'pump1') {
                // Pump has radius 1.5, so stand at 2 units away
                targetPos.x -= 2; // Stand to the left of pump
                targetPos.z += 0;
            } else if (equipmentId === 'coolingTower') {
                // Tower has radius 2.8, so stand at 3.3 units away
                targetPos.x -= 3.3; // Stand to the left of tower
                targetPos.z += 0;
            }

            // Move to equipment with callback when arrived
            engineer.moveTo(targetPos, () => {
                // This runs when engineer actually arrives at the equipment
                engineer.work(8000); // Work for 8 seconds
                engineer.speak(`Working on the ${equipmentName} now...`, 3000);

                // Fix the equipment after working
                setTimeout(() => {
                    if (equipmentData[equipmentId].hasIssue) {
                        equipmentData[equipmentId].status = 'Running';
                        equipmentData[equipmentId].hasIssue = false;
                        engineer.speak(`${equipmentName} is fixed! Back to normal operation.`, 4000);
                    }
                }, 8000);
            });

            return {
                text: `${engineer.name} is heading to fix the ${equipmentName}.`,
                engineer: engineer.name,
                engineerResponse: `On my way to the ${equipmentName}!`
            };
        }
    }

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
        const issues = Object.entries(equipmentData).filter(([id, data]) => data.hasIssue);
        if (issues.length > 0) {
            const issueList = issues.map(([id]) => id).join(', ');
            return {
                text: `Warning: Issues detected on ${issueList}`,
                engineer: 'Sarah',
                engineerResponse: `We have ${issues.length} equipment fault(s) that need attention.`
            };
        } else {
            return {
                text: "All HVAC systems are running normally.",
                engineer: 'Sarah',
                engineerResponse: "All equipment operating within parameters. No issues detected."
            };
        }
    } else {
        return {
            text: "I can help you with equipment status, temperatures, and maintenance tasks. Try 'fix chiller' or 'status'.",
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
