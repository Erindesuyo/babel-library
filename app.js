import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. 기본 설정 (Scene, Renderer)
const scene = new THREE.Scene();
const canvas = document.getElementById("experience-canvas");
const sizes = { width: window.innerWidth, height: window.innerHeight };

// --- 책 페이지  ---
const popup = document.getElementById('book-popup');
const popupContent = document.getElementById('popup-content');
const closeBtn = document.getElementById('close-btn');
const mouse = new THREE.Vector2();
const selectionRaycaster = new THREE.Raycaster();

// --- 시체 관련 변수 ---
let corpseModel = null;
const clickableCorpses = []; 
const corpseLoader = new GLTFLoader();

// --- 📄 유서 내용 데이터베이스 ---
const suicideNotes = [
    "I have been walking for 40 years. There is no end.",
    "The letters... they mean nothing. It's all just noise.",
    "If you find this, do not look for the exit. There is none.",
    "I found a book with my name in it, but the pages were blank.",
    "The silence is louder than the sound of my footsteps.",
    "Everything that can be written has already been written.",
    "I am the 4th librarian of this sector. I am leaving now. Into the void.",
    "God is a librarian who went mad long ago.",
    "Stop searching. The truth is as random as these letters.",
    "I see the same hallway again. Or is it just a twin?"
];

// --- 유서 또는 랜덤 텍스트 선택 함수 ---
function getBookContent() {
    const isSuicideNote = Math.random() < 0.5; 

    if (isSuicideNote) {
        const randomNote = suicideNotes[Math.floor(Math.random() * suicideNotes.length)];
        return `\n\n\n\n   [ FRAGMENT FOUND ]\n\n   "${randomNote}"\n\n\n\n` + generateBabelText().substring(0, 1000);
    } else {
        return generateBabelText();
    }
}

// --- 원작 고증: 랜덤 텍스트 생성 ---
function generateBabelText() {
    const characters = "abcdefghijklmnopqrstuvwxyz, .";
    let fullPage = "";
    for (let line = 0; line < 40; line++) {
        let lineText = "";
        for (let char = 0; char < 80; char++) {
            lineText += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        fullPage += lineText + (line < 39 ? "\n" : ""); 
    }
    return fullPage;
}

// --- 🖱️ 클릭 핸들러 (🌟 수정된 부분) ---
function handleSelection(event) {
    if (event.target !== canvas) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    selectionRaycaster.setFromCamera(mouse, camera);
    const intersects = selectionRaycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const target = intersects[0].object;
        const objName = target.name ? target.name.toLowerCase() : "";

        // 💀 시체 클릭 시 이동 여부 묻기!
        if (objName.includes("corpse") || (target.parent && target.parent.name && target.parent.name.toLowerCase().includes("corpse"))) {
            
            // 🌟 팝업창을 띄워 사용자에게 묻습니다.
            const wantsToMove = confirm("Would you like to go to the document?");
            
            // 사용자가 '예(확인)'를 눌렀을 때만 이동합니다.
            if (wantsToMove) {
                // 👇 여기에 이동하고자 하는 프로세스 웹사이트 주소를 적어주세요!
                window.location.href = "https://erindesuyo.github.io/documents/"; 
            }
            
            return; // 팝업창 결과와 상관없이 책 검사는 하지 않고 종료
        }

        if (objName.includes("book")) {
            popupContent.innerText = getBookContent(); 
            popup.style.display = 'block';
            
            if (popupContent.innerText.includes("[ FRAGMENT FOUND ]")) {
                popupContent.style.color = "#8b0000"; 
            } else {
                popupContent.style.color = "#000";
            }
        }
    }
}

window.addEventListener('pointerup', handleSelection);
closeBtn.onclick = (event) => {
    event.stopPropagation(); 
    popup.style.display = 'none';
};

// ------------------------------------------
// 화면 및 조명 세팅
// ------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const darkColor = 0x050508;
scene.background = new THREE.Color(darkColor);
scene.fog = new THREE.Fog(darkColor, 1.5, 7);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0.5, 0.3, 0.5); 

const lanternLight = new THREE.PointLight(0xffaa55, 0.4, 6); 
lanternLight.castShadow = true; 
camera.add(lanternLight); 
scene.add(camera); 

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false; 
controls.enableZoom = false; 
controls.target.copy(camera.position).add(new THREE.Vector3(0, 0, -0.01));
controls.maxPolarAngle = Math.PI / 1.1; 
controls.minPolarAngle = Math.PI / 5;   

// ------------------------------------------
// 모델 로드 및 장애물 세팅
// ------------------------------------------
const loader = new GLTFLoader();
const obstacles = []; 
let roomSpacingX = 0; 
const targetNames = ['기본', 'fence', 'hall', 'stair', 'stair step', '기둥','cube'];

corpseLoader.load("./corpse.glb", function(corpseGlb) {
    corpseModel = corpseGlb.scene;
    
    corpseModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.name = "corpse_part"; 
        }
    });

    loader.load("./babel_final.glb", function(glb) {
        const roomModel = glb.scene;
        const box = new THREE.Box3().setFromObject(roomModel);
        const size = box.getSize(new THREE.Vector3());
        
        const floorHeight = size.y * 0.95; 
        const gapTweak = 0.98; 
        roomSpacingX = size.x * gapTweak; 
        
        const holeRadius = size.x * 0.1; 
        const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, floorHeight, 16);
        const holeMaterial = new THREE.MeshBasicMaterial({ visible: false }); 

        for (let floor = -3; floor <= 3; floor++) {     
            for (let i = -3; i <= 3; i++) {             
                const clone = roomModel.clone();
                const x = i * roomSpacingX;
                const y = floor * floorHeight;
                const z = 0; 
                clone.position.set(x, y, z);
                scene.add(clone);

                if (floor === 0 && Math.random() < 1.0) {
                    const cClone = corpseModel.clone();
                    cClone.position.set(x, 0.01, z); 
                    scene.add(cClone);
                    clickableCorpses.push(cClone);
                }

                clone.traverse((child) => {
                    if (child.isLight) { child.intensity = 0; }
                    if (child.isMesh) {
                        const meshName = child.name.toLowerCase();
                        child.castShadow = true;    
                        child.receiveShadow = true; 
                        if (targetNames.some(target => meshName.includes(target))) {
                            child.material.side = THREE.DoubleSide; 
                            obstacles.push(child);
                        }
                    }
                });

                const holeBlocker = new THREE.Mesh(holeGeometry, holeMaterial);
                holeBlocker.position.set(x, y + (floorHeight / 2), z);
                scene.add(holeBlocker);
                obstacles.push(holeBlocker); 
            }
        }
    });
});

// ------------------------------------------
// 입력 감지 (키보드 및 조이스틱)
// ------------------------------------------
const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

let joystickVector = { x: 0, y: 0 };
const joystickZone = document.getElementById('joystick-zone');

const manager = nipplejs.create({
    zone: joystickZone,
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: '#ffaa55',
    size: 100
});

manager.on('move', (evt, data) => {
    joystickVector.x = data.vector.x;
    joystickVector.y = data.vector.y; 
});

manager.on('end', () => {
    joystickVector.x = 0;
    joystickVector.y = 0;
});

window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
});

// ------------------------------------------
// 이동 및 물리 로직
// ------------------------------------------
const raycaster = new THREE.Raycaster();
const speed = 0.02; 
const collisionDistance = 0.1; 

function animate() {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; 
    forward.normalize();
    
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const moveDir = new THREE.Vector3();

    if (keys.w) moveDir.add(forward);
    if (keys.s) moveDir.sub(forward);
    if (keys.d) moveDir.add(right);
    if (keys.a) moveDir.sub(right);

    if (joystickVector.y !== 0) moveDir.addScaledVector(forward, joystickVector.y);
    if (joystickVector.x !== 0) moveDir.addScaledVector(right, joystickVector.x);

    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        const rayOrigins = [
            camera.position.clone(),                                  
            camera.position.clone().setY(camera.position.y - 0.15),   
            camera.position.clone().setY(camera.position.y - 0.25)    
        ];

        let canMove = true;
        for (const origin of rayOrigins) {
            raycaster.set(origin, moveDir);
            const intersects = raycaster.intersectObjects(obstacles, false);
            if (intersects.length > 0 && intersects[0].distance < collisionDistance) {
                canMove = false;
                break; 
            }
        }

        if (canMove) {
            camera.position.addScaledVector(moveDir, speed);
            controls.target.addScaledVector(moveDir, speed);
        }
    }

    if (roomSpacingX > 0) {
        if (camera.position.x > roomSpacingX / 2) {
            camera.position.x -= roomSpacingX;
            controls.target.x -= roomSpacingX;
            clickableCorpses.forEach(c => c.position.x -= roomSpacingX);
        } 
        else if (camera.position.x < -roomSpacingX / 2) {
            camera.position.x += roomSpacingX;
            controls.target.x += roomSpacingX;
            clickableCorpses.forEach(c => c.position.x += roomSpacingX);
        }
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate); 
}
animate();

// ------------------------------------------
// 검색 시스템 로직
// ------------------------------------------
const searchOverlay = document.getElementById('search-overlay');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResult = document.getElementById('search-result');
const enterLibraryBtn = document.getElementById('enter-library-btn');

function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let roomHex = "";
    for(let i = 0; i < 6; i++) roomHex += chars.charAt(Math.floor(Math.random() * chars.length));
    
    searchResult.innerHTML = `"${query}"<br><br><span style="color:#ffaa55; font-size: 1.2rem; font-weight:bold;">Room No.${roomHex}, Bookshelf No.${Math.floor(Math.random() * 4) + 1},<br> Row ${Math.floor(Math.random() * 5) + 1}, Book No.${Math.floor(Math.random() * 32) + 1}</span><br><br>`;
    
    searchBtn.style.display = 'none';
    searchInput.style.display = 'none';
    enterLibraryBtn.style.display = 'inline-block';
}

searchBtn.addEventListener('click', performSearch);
enterLibraryBtn.addEventListener('click', () => { searchOverlay.style.display = 'none'; });
