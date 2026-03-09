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

// --- 랜덤 텍스트 생성 함수 ---
function generateBabelText(length) {
    const characters = "abcdefghijklmnopqrstuvwxyz, .";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// --- [완벽 수정] PC & 모바일 통합 터치/클릭 핸들러 ---
function handleSelection(event) {
    // 🌟 핵심 1: 사용자가 3D 화면(canvas)을 터치한 게 아니라면 무시!
    // (이렇게 하면 조이스틱을 움직이거나 닫기 버튼을 누를 때 책이 눌리는 걸 완벽히 막아줍니다)
    if (event.target !== canvas) return;

    // 🌟 핵심 2: PointerEvent는 마우스든 터치든 상관없이 clientX, clientY를 바로 줍니다. (복잡한 touches 배열 계산 삭제!)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    selectionRaycaster.setFromCamera(mouse, camera);
    
    // scene.children 검사
    const intersects = selectionRaycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const target = intersects[0].object;
        
        // 이름 확인 (소문자 변환)
        const objName = target.name.toLowerCase();
        if (objName.includes("book")) {
            console.log("선택된 오브젝트:", target.name);

            popupContent.innerText = generateBabelText(500);
            popup.style.display = 'block';
        }
    }
}

// 기존의 window.addEventListener('click', ...) 과 'touchstart' 를 싹 다 지우고
// 🌟 마우스 클릭과 모바일 터치를 하나로 통합하는 'pointerup'으로 묶어줍니다!
window.addEventListener('pointerup', handleSelection);

// --- 닫기 버튼 리스너 (그대로 유지) ---
closeBtn.onclick = (event) => {
    event.stopPropagation(); 
    popup.style.display = 'none';
};


// PC 클릭 이벤트
window.addEventListener('click', handleSelection);

// 모바일 터치 이벤트 추가
window.addEventListener('touchstart', (e) => {
    // 스크롤 등 기본 동작 방해를 피하려면 조건부로 preventDefault 사용 가능
    handleSelection(e);
}, { passive: false });

// --- 닫기 버튼 리스너 수정 ---
closeBtn.onclick = (event) => {
    // 클릭 이벤트가 뒷배경(window)으로 퍼지는 것을 방지
    event.stopPropagation(); 
    popup.style.display = 'none';
};




const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 🌟 그림자 활성화 및 부드러운 그림자 설정
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 🌫️ 심연의 안개 세팅
const darkColor = 0x050508;
scene.background = new THREE.Color(darkColor);
scene.fog = new THREE.Fog(darkColor, 1.5, 7);

// 🌙 전체 조명은 아주 어둡게!
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// 🎥 카메라 설정 (🌟 손전등을 달기 위해 위로 끌어올렸어!)
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0.5, 0.3, 0.5); 

// 🔦 내 카메라에 달린 손전등! (이제 카메라가 먼저 생겼으니 에러 안 남!)
const lanternLight = new THREE.PointLight(0xffaa55, 0.4, 6); // 주황빛 
lanternLight.castShadow = true; // 그림자 쏴랏!
lanternLight.position.set(0, 0, 0); 
lanternLight.shadow.mapSize.width = 600;
lanternLight.shadow.mapSize.height = 600;
camera.add(lanternLight); // 씬이 아니라 카메라에 추가!
scene.add(camera); 

// 컨트롤 설정
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false; 
controls.enableZoom = false; 
controls.target.copy(camera.position).add(new THREE.Vector3(0, 0, -0.01));
controls.maxPolarAngle = Math.PI / 1.1; 
controls.minPolarAngle = Math.PI / 5;   

// 2. 모델 로드 및 장애물, 🕳️ 투명 기둥 세팅
const loader = new GLTFLoader();
const obstacles = []; 
let roomSpacingX = 0; 
const targetNames = ['기본', 'fence', 'hall', 'stair', 'stair step', '기둥','cube'];

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

    // 1차원 일렬 복도 코드로 완벽 세팅
    for (let floor = -3; floor <= 3; floor++) {     
        for (let i = -3; i <= 3; i++) {             
            
            const clone = roomModel.clone();
            clone.rotation.y = 0; 
            
            const x = i * roomSpacingX;
            const y = floor * floorHeight;
            const z = 0; 
            
            clone.position.set(x, y, z);
            scene.add(clone);

            // 🧱 모델 내부의 벽/펜스 장애물 등록 & 💡 그림자/조명 처리
            clone.traverse((child) => {
                
                // 🛑 수백 개로 복사되어 화면을 하얗게 터뜨린 블렌더 조명 끄기
                if (child.isLight) {
                    child.intensity = 0; 
                    child.castShadow = false;
                }

                if (child.isMesh) {
                    const meshName = child.name.toLowerCase();
                    
                    // 🌟 모든 책장과 펜스가 그림자를 만들도록 허락!
                    child.castShadow = true;    
                    child.receiveShadow = true; 

                    const isObstacle = targetNames.some(target => meshName.includes(target));
                    if (isObstacle) {
                        child.material.side = THREE.DoubleSide; 
                        obstacles.push(child);
                    }
                }
            });

            // 🕳️ 2. 방 중앙마다 투명 기둥 세우기
            const holeBlocker = new THREE.Mesh(holeGeometry, holeMaterial);
            holeBlocker.position.set(x, y + (floorHeight / 2), z);
            scene.add(holeBlocker);
            obstacles.push(holeBlocker); 
        }
    }
});

// 4. 입력 감지 (키보드 & 조이스틱)
const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => {
    if(e.key === 'w') keys.w = true;
    if(e.key === 'a') keys.a = true;
    if(e.key === 's') keys.s = true;
    if(e.key === 'd') keys.d = true;
});
window.addEventListener('keyup', (e) => {
    if(e.key === 'w') keys.w = false;
    if(e.key === 'a') keys.a = false;
    if(e.key === 's') keys.s = false;
    if(e.key === 'd') keys.d = false;
});

const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');
let isDragging = false;
let joystickVector = { x: 0, y: 0 }; 
const maxRadius = 50; 

joystickZone.addEventListener('touchstart', (e) => { isDragging = true; updateJoystick(e.touches[0]); });
joystickZone.addEventListener('touchmove', (e) => { if (isDragging) updateJoystick(e.touches[0]); });
joystickZone.addEventListener('touchend', () => {
    isDragging = false;
    joystickVector = { x: 0, y: 0 };
    joystickKnob.style.transform = `translate(-50%, -50%)`;
});

function updateJoystick(touch) {
    const rect = joystickZone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRadius) {
        dx = (dx / distance) * maxRadius;
        dy = (dy / distance) * maxRadius;
    }
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joystickVector.x = dx / maxRadius;
    joystickVector.y = -dy / maxRadius; 
}

window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
});

// 5. 이동 및 🛡️ 물리 로직
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

    // 🌌 1차원(앞뒤) 복도용 무한 루프 텔레포트 코드
    if (roomSpacingX > 0) {
        if (camera.position.x > roomSpacingX / 2) {
            camera.position.x -= roomSpacingX;
            controls.target.x -= roomSpacingX;
        } 
        else if (camera.position.x < -roomSpacingX / 2) {
            camera.position.x += roomSpacingX;
            controls.target.x += roomSpacingX;
        }
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate); 
}
animate();
