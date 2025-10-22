
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';



//I'm going to make the "logo dummy" and the "logo element" the same thing, and have the nearest parent's child
//with 'ourthreecontainer' class be the canvas, so that we can just logically place the "model" component
//and give it padding etc in the layout, and still place the fullsizecanvas in the parent it needs to fill.
//So this helper function is to grab that 
function findNearestUpward(el, className) {
    let current = el;

    while (current) {
        const parent = current.parentElement;
        if (!parent) break;

        for (const sibling of parent.children) {
            if (sibling !== current) {
                const match = sibling.classList.contains(className)
                    ? sibling
                    : sibling.querySelector(`.${className}`);
                if (match) return match;
            }
        }

        current = parent;
    }

    return null;
}

const container = document.getElementById('cascontainer');
const wrappers = document.querySelectorAll('.casbackgroundstop');
const dots = document.querySelectorAll('.dot');
let currentDisplayingLogoIndex = 0;
let isScrollingToNewSection = false;
const visitedSections = new Set();

let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;

let mouseX = 0, mouseY = 0;
const maxTilt = 0.1; // radians

//For detecting touch devices and using fallback passive 'sway' in lieu of mouse-driven animation
let swayTime = 0;
const isTouchDevice = 'ontouchstart' in window;


function updateIndicator() {
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentDisplayingLogoIndex);
    });
}

function getImageCenter(index) {
    const img = wrappers[index];
    const imgTop = img.offsetTop;
    const imgHeight = img.offsetHeight;
    return imgTop + (imgHeight / 2) - (window.innerHeight / 2);
}

function scrollToImage(index) {
    if(index < 0 || index >= wrappers.length || isScrollingToNewSection) return;
    
    isScrollingToNewSection = true;
    currentDisplayingLogoIndex = index;
    updateIndicator();
    
    
    if(!visitedSections.has(index)) {
        visitedSections.add(index);
        wrappers[index].querySelector('.logo-heading').classList.add('focused');
        
        const threeContainer = wrappers[index].querySelector('.canvascontainer');
        if (threeContainer) {
            
            setTimeout(() => {
                threeContainer.classList.add('noblur');
            }, 200);

            setTimeout(() => {
                threeContainer.dispatchEvent(new Event('focusModel'));

            }, 400);
        } 
        
        
    }

    container.scrollTo({
        top: getImageCenter(index),
        behavior: 'smooth'
    });
    setTimeout(() => {
        isScrollingToNewSection = false
    }, 600);
}

function adjustScrollForCurrentSection() {
    if (currentDisplayingLogoIndex !== null) {
        container.scrollTo({
            top: getImageCenter(currentDisplayingLogoIndex),
            behavior: 'instant'
        });
    }
}

function getModelScaleForScreenWidthAndModelBboxWidth(screenWidth, bboxwidth) {
    
    const bboxfactor = Math.min(bboxwidth * 0.4, 0.6);
    
    if (screenWidth < 450) return 1.0 - (bboxfactor);
    if (screenWidth < 600) return 1.0 - (bboxfactor * 0.7);
    if (screenWidth < 800) return 1.0 - (bboxfactor / 4);
    return 1.0;
}

function resizeIfNeeded() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width === lastWidth && height === lastHeight) return;

    lastWidth = width;
    lastHeight = height;
    
    
    

    viewers.forEach(({ renderer, camera, model, bbox }, container) => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);

        //Scale down the model based on the model's bounding box x size and the screen width
        const scaleFactor = getModelScaleForScreenWidthAndModelBboxWidth(width, bbox.getSize(new THREE.Vector3()).x);

        if (model) {
            model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
    });

    adjustScrollForCurrentSection();
}

container.addEventListener('wheel', (e) => {
    if (isScrollingToNewSection) {
        e.preventDefault();
        return;
    }

    e.preventDefault();

    if (e.deltaY > 0) {
        scrollToImage(currentDisplayingLogoIndex + 1);
    } else {
        scrollToImage(currentDisplayingLogoIndex - 1);
    }
}, {passive: false});

dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
        scrollToImage(i);
    });
});

window.addEventListener('load', () => {
    scrollToImage(0);
});

//Touch support for the scrolling
let touchStartY = 0;
let touchEndY = 0;

container.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
}, {passive: true});

container.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, {passive: false});

container.addEventListener('touchend', (e) => {
    if (isScrollingToNewSection) return;
    touchEndY = e.changedTouches[0].clientY;
    const delta = touchStartY - touchEndY;

    if (Math.abs(delta) > 50) {
        if (delta > 0) {
            scrollToImage(currentDisplayingLogoIndex + 1);
        } else {
            scrollToImage(currentDisplayingLogoIndex - 1);
        }
    }
});

//A handful of listeners to try and cover all events where we need a resize (turns out it's not only resize!)
window.addEventListener('resize', resizeIfNeeded);
window.addEventListener('focus', resizeIfNeeded);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resizeIfNeeded();
});
document.addEventListener('fullscreenchange', resizeIfNeeded);



//This is to fix a thing that annoyed me that if a user grabs the scrollbar on the browser and scrolls to a page our programmatic scrolling doesn't play along.
//Now it will wait 100ms and then scroll to the nearest section using our logic so everything feels correct
let manualScrollTimeout = null;

container.addEventListener('scroll', () => {
    if (isScrollingToNewSection) return; //ignore our programmatic scrolls, this is for users grabbing the scroll bar

    if (manualScrollTimeout) clearTimeout(manualScrollTimeout);

    manualScrollTimeout = setTimeout(() => {
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        wrappers.forEach((wrapper, i) => {
            const wrapperCenter = wrapper.offsetTop + wrapper.offsetHeight / 2;
            const distance = Math.abs(wrapperCenter - (container.scrollTop + window.innerHeight / 2));
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        });

        if (nearestIndex !== currentDisplayingLogoIndex) {
            scrollToImage(nearestIndex);
        }
    }, 100);
});

let activeContainer = wrappers[currentDisplayingLogoIndex].querySelector('.canvascontainer');
let lastActiveContainerIndex = currentDisplayingLogoIndex;
function animateActiveViewer() {
    if(lastActiveContainerIndex !== currentDisplayingLogoIndex) {
        lastActiveContainerIndex = currentDisplayingLogoIndex;
        activeContainer = wrappers[currentDisplayingLogoIndex].querySelector('.canvascontainer');
    }
    
    const viewer = viewers.get(activeContainer);

    if (viewer) {
        if (viewer.pivot) {
            let targetRotX, targetRotY;

            if (isTouchDevice) {

                //Idle sway fallback
                swayTime += 0.016;
                targetRotX = Math.sin(swayTime * 0.7) * maxTilt * 0.5;
                targetRotY = Math.sin(swayTime * 0.9) * maxTilt * 0.5;

            } else {
                // Desktop: mouse-follow
                targetRotX = mouseY * maxTilt;
                targetRotY = mouseX * maxTilt;
            }

            viewer.pivot.rotation.x += (targetRotX - viewer.pivot.rotation.x) * 0.1;
            viewer.pivot.rotation.y += (targetRotY - viewer.pivot.rotation.y) * 0.1;
        }

        // Update camera animation if any
        if (viewer.cameraAnimation) {
            viewer.cameraAnimation(performance.now());
        }

        // Render only the active viewer
        viewer.renderer.render(viewer.scene, viewer.camera);
    }

    requestAnimationFrame(animateActiveViewer);
}


//Code to create the threejs parts
const containers = document.querySelectorAll('.canvascontainer');
const viewers = new Map();

containers.forEach(container => {
    const modelinstance = container.parentElement.querySelector('.animatedmodelinstance');
    const modelPath = modelinstance.dataset.modelPath;
    initThreeViewer(container, modelPath, viewers);
});


function initThreeViewer(container, modelPath, viewers) {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        100
    );

    // Start camera close, will ease out when triggered
    camera.position.set(0, 0.0, 0);
    const targetCameraPos = new THREE.Vector3(0, 0, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setScissorTest(false);
    renderer.setClearColor(0xffffff, 0);
    container.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 5);
    light.position.set(0, 1.3, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Viewer entry
    const viewer = {
        renderer,
        scene,
        camera,
        animationFrame: null,
        model: null,
        hasAnimatedIn: false,
        bbox: null
    };
    viewers.set(container, viewer);

    // Load model
    const loader = new GLTFLoader();
    loader.load(
         modelPath,
        (gltf) => {

            const pivot = new THREE.Object3D();
            pivot.position.z = -0.1
            scene.add(pivot);

            viewer.model = gltf.scene;

            //Center the model based on its bounding box
            const box = new THREE.Box3().setFromObject(viewer.model);
            const center = box.getCenter(new THREE.Vector3());

            //plus a small adjustment upward to sit with the heading
            const adjustmentForHeaderHeight = 0.1;
            center.y -= adjustmentForHeaderHeight;
            center.z += pivot.position.z;
            viewer.model.position.sub(center);

            const boxSize = new THREE.Vector3();
            box.getSize(boxSize);

            const scaleFactor = getModelScaleForScreenWidthAndModelBboxWidth(window.innerWidth, boxSize.x);
            viewer.model.scale.set(scaleFactor, scaleFactor, scaleFactor);

            pivot.add(viewer.model);
            viewer.pivot = pivot;
            viewer.bbox = box;



        },
        undefined,
        (error) => console.error('Failed to load model:', error)
    );

    // Mouse-based tilt
    window.addEventListener('mousemove', (e) => {
        // Normalize mouse coordinates to -1..1 relative to viewport
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });



    // Smooth camera ease-in (triggered once per section)
    container.addEventListener('focusModel', () => {
        if (viewer.hasAnimatedIn) return;
        viewer.hasAnimatedIn = true;

        const duration = 1200;
        const startTime = performance.now();
        const startPos = camera.position.clone();

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        viewer.cameraAnimation = (time) => {
            const elapsed = time - startTime;
            const t = Math.min(elapsed / duration, 1);
            const easedT = easeOutCubic(t);
            camera.position.lerpVectors(startPos, targetCameraPos, easedT);

            if (t >= 1) {
                viewer.cameraAnimation = null; // done
            }
        };
    });
}




//Finally start the RAF loop
requestAnimationFrame(animateActiveViewer);


