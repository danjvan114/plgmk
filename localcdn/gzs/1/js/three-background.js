/***
 *    ____   _                   _   _____
 *   / ___| | |__    _ __ ___   | | |  ___|  _ __   _ __
 *  | |     | '_ \  | '_ ` _ \  | | | |_    | '__| | '_ \
 *  | |___  | | | | | | | | | | | | |  _|   | |    | |_) |
 *   \____| |_| |_| |_| |_| |_| |_| |_|     |_|    | .__/
 *                                                 |_|
 * Copyright © 2021 - 2025 南充市轻爪网络科技有限公司 All rights reserved.
 */
let scene, camera, renderer, particleGrid, lineSystem;
let mouseX = 0,
  mouseY = 0;
let heroSection, canvasWidth, canvasHeight;
let mouseWorldX = 0,
  mouseWorldY = 0;
let smoothMouseX = 0,
  smoothMouseY = 0;
let shapeMode = 1;
let shapeTransition = 1;
let lastShapeChange = 0;
let previousShapePositions = null;
let lastFrameTime = Date.now();

function initThreeBackground() {
  heroSection = document.getElementById("home");
  if (!heroSection) return;

  updateCanvasSize();

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 1, 3000);
  camera.position.set(0, 0, 600);
  camera.lookAt(0, 0, 0);

  const canvas = document.getElementById("three-canvas");
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(canvasWidth, canvasHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  createParticleGrid();
  createLineSystem();
  createLights();

  heroSection.addEventListener("mousemove", onDocumentMouseMove, false);
  heroSection.addEventListener("mouseenter", onMouseEnter, false);
  heroSection.addEventListener("mouseleave", onMouseLeave, false);
  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("scroll", updateCanvasPosition, false);

  updateCanvasPosition();

  lastShapeChange = Date.now() * 0.001;
  lastFrameTime = Date.now();

  animate();
}

function createParticleGrid() {
  const fov = 75;
  const distance = 600;
  const aspect = canvasWidth / canvasHeight;
  const fovRad = (fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
  const visibleWidth = visibleHeight * aspect;

  const gridWidth = 35;
  const gridHeight = Math.floor(gridWidth / aspect);
  const spacingX = visibleWidth / gridWidth;
  const spacingY = visibleHeight / gridHeight;
  const particleCount = gridWidth * gridHeight;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const originalPositions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const color1 = new THREE.Color(0x4f46e5);
  const color2 = new THREE.Color(0xec4899);

  let index = 0;
  for (let i = 0; i < gridWidth; i++) {
    for (let j = 0; j < gridHeight; j++) {
      const i3 = index * 3;

      const x = (i - gridWidth / 2) * spacingX;
      const y = (j - gridHeight / 2) * spacingY;
      const z = 0;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      originalPositions[i3] = x;
      originalPositions[i3 + 1] = y;
      originalPositions[i3 + 2] = z;

      const colorProgress = (i / gridWidth + j / gridHeight) / 2;
      const color = color1.clone().lerp(color2, colorProgress);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[index] = 3;

      index++;
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.userData.originalPositions = originalPositions;
  geometry.userData.gridWidth = gridWidth;
  geometry.userData.gridHeight = gridHeight;
  geometry.userData.spacingX = spacingX;
  geometry.userData.spacingY = spacingY;
  geometry.userData.particleCount = particleCount;

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
  });

  particleGrid = new THREE.Points(geometry, material);
  scene.add(particleGrid);
}

function createLineSystem() {
  const fov = 75;
  const distance = 600;
  const aspect = canvasWidth / canvasHeight;
  const fovRad = (fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
  const visibleWidth = visibleHeight * aspect;

  const gridWidth = 35;
  const gridHeight = Math.floor(gridWidth / aspect);
  const spacingX = visibleWidth / gridWidth;
  const spacingY = visibleHeight / gridHeight;

  const lineGeometry = new THREE.BufferGeometry();
  const linePositions = [];
  const lineColors = [];

  const color1 = new THREE.Color(0x4f46e5);
  const color2 = new THREE.Color(0xec4899);

  for (let i = 0; i < gridWidth; i++) {
    for (let j = 0; j < gridHeight; j++) {
      const x = (i - gridWidth / 2) * spacingX;
      const y = (j - gridHeight / 2) * spacingY;

      if (i < gridWidth - 1) {
        const nextX = (i + 1 - gridWidth / 2) * spacingX;
        linePositions.push(x, y, 0);
        linePositions.push(nextX, y, 0);

        const colorProgress = (i / gridWidth + j / gridHeight) / 2;
        const color = color1.clone().lerp(color2, colorProgress);
        lineColors.push(color.r, color.g, color.b, 0.3);
        lineColors.push(color.r, color.g, color.b, 0.3);
      }

      if (j < gridHeight - 1) {
        const nextY = (j + 1 - gridHeight / 2) * spacingY;
        linePositions.push(x, y, 0);
        linePositions.push(x, nextY, 0);

        const colorProgress = (i / gridWidth + j / gridHeight) / 2;
        const color = color1.clone().lerp(color2, colorProgress);
        lineColors.push(color.r, color.g, color.b, 0.3);
        lineColors.push(color.r, color.g, color.b, 0.3);
      }
    }
  }

  lineGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(linePositions, 3)
  );
  lineGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(lineColors, 4)
  );

  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
  });

  lineSystem = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lineSystem);
}

function getShapePosition(
  i,
  j,
  gridWidth,
  gridHeight,
  spacingX,
  spacingY,
  time,
  mode,
  transition
) {
  const centerX = (i - gridWidth / 2) * spacingX;
  const centerY = (j - gridHeight / 2) * spacingY;
  const radius = Math.sqrt(centerX * centerX + centerY * centerY);
  const maxRadius = Math.sqrt(
    Math.pow((gridWidth * spacingX) / 2, 2) +
      Math.pow((gridHeight * spacingY) / 2, 2)
  );

  let targetX, targetY, targetZ;

  switch (mode) {
    case 0:
      targetX = centerX;
      targetY = centerY;
      targetZ =
        Math.sin(centerX * 0.02 + time * 2) * 40 +
        Math.cos(centerY * 0.02 + time * 2) * 40;
      break;

    case 1:
      const angle = Math.atan2(centerY, centerX);
      const circleRadius = maxRadius * 0.4;
      targetX = Math.cos(angle) * circleRadius;
      targetY = Math.sin(angle) * circleRadius;
      targetZ = Math.sin(radius * 0.02 + time * 2) * 30;
      break;

    case 2:
      const starAngle = Math.atan2(centerY, centerX);
      const starRadius = radius * 0.7;
      const starPoints = 5;
      const starRadiusVariation = Math.sin(starAngle * starPoints) * 0.3 + 0.7;
      targetX = Math.cos(starAngle) * starRadius * starRadiusVariation;
      targetY = Math.sin(starAngle) * starRadius * starRadiusVariation;
      targetZ = Math.sin(starAngle * starPoints + time * 2) * 20;
      break;

    default:
      targetX = centerX;
      targetY = centerY;
      targetZ = 0;
  }

  if (transition < 1) {
    let startX, startY, startZ;
    let startMode = (mode - 1 + 3) % 3;

    const prevCenterX = (i - gridWidth / 2) * spacingX;
    const prevCenterY = (j - gridHeight / 2) * spacingY;
    const prevRadius = Math.sqrt(
      prevCenterX * prevCenterX + prevCenterY * prevCenterY
    );
    const prevMaxRadius = Math.sqrt(
      Math.pow((gridWidth * spacingX) / 2, 2) +
        Math.pow((gridHeight * spacingY) / 2, 2)
    );

    switch (startMode) {
      case 0:
        startX = prevCenterX;
        startY = prevCenterY;
        startZ =
          Math.sin(prevCenterX * 0.02 + time * 2) * 40 +
          Math.cos(prevCenterY * 0.02 + time * 2) * 40;
        break;
      case 1:
        const prevAngle = Math.atan2(prevCenterY, prevCenterX);
        const prevCircleRadius = prevMaxRadius * 0.4;
        startX = Math.cos(prevAngle) * prevCircleRadius;
        startY = Math.sin(prevAngle) * prevCircleRadius;
        startZ = Math.sin(prevRadius * 0.02 + time * 2) * 30;
        break;
      case 2:
        const prevStarAngle = Math.atan2(prevCenterY, prevCenterX);
        const prevStarRadius = prevRadius * 0.7;
        const prevStarPoints = 5;
        const prevStarRadiusVariation =
          Math.sin(prevStarAngle * prevStarPoints) * 0.3 + 0.7;
        startX =
          Math.cos(prevStarAngle) * prevStarRadius * prevStarRadiusVariation;
        startY =
          Math.sin(prevStarAngle) * prevStarRadius * prevStarRadiusVariation;
        startZ = Math.sin(prevStarAngle * prevStarPoints + time * 2) * 20;
        break;
      default:
        startX = prevCenterX;
        startY = prevCenterY;
        startZ = 0;
    }

    const t = transition;
    const easeInOutCubic =
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const smoothStep = t * t * (3 - 2 * t);
    const finalEase = easeInOutCubic * 0.7 + smoothStep * 0.3;

    if (mode === 0) {
      const currentWaveZ =
        Math.sin(centerX * 0.02 + time * 2) * 40 +
        Math.cos(centerY * 0.02 + time * 2) * 40;
      targetZ = startZ + (currentWaveZ - startZ) * finalEase;
    } else if (startMode === 0) {
      const currentWaveZ =
        Math.sin(prevCenterX * 0.02 + time * 2) * 40 +
        Math.cos(prevCenterY * 0.02 + time * 2) * 40;
      targetZ = currentWaveZ + (targetZ - currentWaveZ) * finalEase;
    } else {
      targetZ = startZ + (targetZ - startZ) * finalEase;
    }

    targetX = startX + (targetX - startX) * finalEase;
    targetY = startY + (targetY - startY) * finalEase;
  }

  return { x: targetX, y: targetY, z: targetZ };
}

function createLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);
}

function updateCanvasSize() {
  if (!heroSection) return;
  const rect = heroSection.getBoundingClientRect();
  canvasWidth = rect.width;
  canvasHeight = rect.height;
}

function updateCanvasPosition() {
  if (!heroSection || !renderer) return;
  const rect = heroSection.getBoundingClientRect();
  const canvas = renderer.domElement;
  canvas.style.top = rect.top + "px";
  canvas.style.left = rect.left + "px";
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
}

function onDocumentMouseMove(event) {
  if (!heroSection) return;
  const rect = heroSection.getBoundingClientRect();

  const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const normalizedY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const targetMouseWorldX = normalizedX * canvasWidth * 0.5;
  const targetMouseWorldY = normalizedY * canvasHeight * 0.5;

  mouseWorldX += (targetMouseWorldX - mouseWorldX) * 0.15;
  mouseWorldY += (targetMouseWorldY - mouseWorldY) * 0.15;

  mouseX = normalizedX;
  mouseY = normalizedY;
}

function onMouseEnter() {
  if (particleGrid && particleGrid.material) {
    particleGrid.material.opacity = 0.9;
  }
  if (lineSystem && lineSystem.material) {
    lineSystem.material.opacity = 0.4;
  }
}

function onMouseLeave() {
  if (particleGrid && particleGrid.material) {
    particleGrid.material.opacity = 0.7;
  }
  if (lineSystem && lineSystem.material) {
    lineSystem.material.opacity = 0.2;
  }
}

function onWindowResize() {
  updateCanvasSize();
  updateCanvasPosition();

  if (camera && renderer) {
    camera.aspect = canvasWidth / canvasHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasWidth, canvasHeight);
  }
}

function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();
  const deltaTime = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  const time = now * 0.0008;
  const currentTime = now * 0.001;

  if (currentTime - lastShapeChange > 8) {
    if (particleGrid && shapeTransition >= 0.99) {
      const gridWidth = particleGrid.geometry.userData.gridWidth;
      const gridHeight = particleGrid.geometry.userData.gridHeight;
      const spacingX = particleGrid.geometry.userData.spacingX;
      const spacingY = particleGrid.geometry.userData.spacingY;
      const positions = particleGrid.geometry.attributes.position.array;

      previousShapePositions = [];
      let index = 0;
      for (let i = 0; i < gridWidth; i++) {
        previousShapePositions[i] = [];
        for (let j = 0; j < gridHeight; j++) {
          const i3 = index * 3;
          previousShapePositions[i][j] = {
            x: positions[i3],
            y: positions[i3 + 1],
            z: positions[i3 + 2],
          };
          index++;
        }
      }
    }

    shapeMode = (shapeMode + 1) % 3;
    lastShapeChange = currentTime;
    shapeTransition = 0;
  }

  if (shapeTransition < 1) {
    const transitionDuration = 3.5;
    const transitionSpeed = deltaTime / transitionDuration;
    shapeTransition = Math.min(1, shapeTransition + transitionSpeed);

    if (shapeTransition > 0.95) {
      shapeTransition = Math.min(1, shapeTransition + transitionSpeed * 1.5);
    }
  }

  const targetX = mouseX * 100;
  const targetY = mouseY * 100;
  camera.position.x += (targetX - camera.position.x) * 0.05;
  camera.position.y += (targetY - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);

  if (particleGrid) {
    const positions = particleGrid.geometry.attributes.position.array;
    const originalPositions = particleGrid.geometry.userData.originalPositions;
    const sizes = particleGrid.geometry.attributes.size.array;
    const colors = particleGrid.geometry.attributes.color.array;
    const gridWidth = particleGrid.geometry.userData.gridWidth;
    const gridHeight = particleGrid.geometry.userData.gridHeight;
    const spacingX = particleGrid.geometry.userData.spacingX;
    const spacingY = particleGrid.geometry.userData.spacingY;

    const mouseActive = Math.abs(mouseWorldX) > 5 || Math.abs(mouseWorldY) > 5;

    if (!mouseActive) {
      mouseWorldX *= 0.95;
      mouseWorldY *= 0.95;
    }

    let index = 0;
    for (let i = 0; i < gridWidth; i++) {
      for (let j = 0; j < gridHeight; j++) {
        const i3 = index * 3;

        const originalX = originalPositions[i3];
        const originalY = originalPositions[i3 + 1];

        const shapePos = getShapePosition(
          i,
          j,
          gridWidth,
          gridHeight,
          spacingX,
          spacingY,
          time,
          shapeMode,
          shapeTransition
        );

        let offsetX = 0;
        let offsetY = 0;
        let offsetZ = shapePos.z;
        let sizeMultiplier = 1;
        let glowIntensity = 0;

        if (mouseActive) {
          const dx = shapePos.x - mouseWorldX;
          const dy = shapePos.y - mouseWorldY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 300;

          if (distance < maxDistance) {
            const normalizedDist = distance / maxDistance;
            const smoothForce =
              1 - normalizedDist * normalizedDist * (3 - 2 * normalizedDist);

            const rippleDistance = distance;
            const rippleSpeed = time * 3;
            const rippleWave =
              Math.sin(rippleDistance * 0.05 - rippleSpeed) * 0.3 + 0.7;
            const finalForce = smoothForce * rippleWave;

            const angle = Math.atan2(dy, dx);
            const attractionStrength = finalForce * 60;
            offsetX = -Math.cos(angle) * attractionStrength;
            offsetY = -Math.sin(angle) * attractionStrength;

            const rotationAngle = angle + Math.PI / 2;
            const rotationRadius = finalForce * 15;
            offsetX += Math.cos(rotationAngle) * rotationRadius;
            offsetY += Math.sin(rotationAngle) * rotationRadius;

            offsetZ += finalForce * 40;

            sizeMultiplier = 1 + finalForce * 2.5;
            glowIntensity = finalForce;

            const colorProgress = (i / gridWidth + j / gridHeight) / 2;
            const color1 = new THREE.Color(0x4f46e5);
            const color2 = new THREE.Color(0xec4899);
            const baseColor = color1.clone().lerp(color2, colorProgress);

            const glowColor = new THREE.Color(0xffffff);
            const enhancedColor = baseColor
              .clone()
              .lerp(glowColor, glowIntensity * 0.4);

            enhancedColor.r = Math.min(
              1,
              enhancedColor.r * (1 + glowIntensity * 0.2)
            );
            enhancedColor.g = Math.min(
              1,
              enhancedColor.g * (1 + glowIntensity * 0.2)
            );
            enhancedColor.b = Math.min(
              1,
              enhancedColor.b * (1 + glowIntensity * 0.2)
            );

            colors[i3] = enhancedColor.r;
            colors[i3 + 1] = enhancedColor.g;
            colors[i3 + 2] = enhancedColor.b;
          } else {
            const colorProgress = (i / gridWidth + j / gridHeight) / 2;
            const color1 = new THREE.Color(0x4f46e5);
            const color2 = new THREE.Color(0xec4899);
            const color = color1.clone().lerp(color2, colorProgress);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
          }
        } else {
          const colorProgress = (i / gridWidth + j / gridHeight) / 2;
          const color1 = new THREE.Color(0x4f46e5);
          const color2 = new THREE.Color(0xec4899);
          const color = color1.clone().lerp(color2, colorProgress);
          colors[i3] = color.r;
          colors[i3 + 1] = color.g;
          colors[i3 + 2] = color.b;
        }

        positions[i3] = shapePos.x + offsetX;
        positions[i3 + 1] = shapePos.y + offsetY;
        positions[i3 + 2] = offsetZ;

        sizes[index] = 3 * sizeMultiplier;

        index++;
      }
    }

    particleGrid.geometry.attributes.position.needsUpdate = true;
    particleGrid.geometry.attributes.size.needsUpdate = true;
    particleGrid.geometry.attributes.color.needsUpdate = true;

    particleGrid.rotation.z = Math.sin(time * 0.5) * 0.02;
  }

  if (lineSystem && particleGrid) {
    const linePositions = lineSystem.geometry.attributes.position.array;
    const gridWidth = particleGrid.geometry.userData.gridWidth;
    const gridHeight = particleGrid.geometry.userData.gridHeight;
    const spacingX = particleGrid.geometry.userData.spacingX;
    const spacingY = particleGrid.geometry.userData.spacingY;

    let lineIndex = 0;
    for (let i = 0; i < gridWidth; i++) {
      for (let j = 0; j < gridHeight; j++) {
        const shapePos1 = getShapePosition(
          i,
          j,
          gridWidth,
          gridHeight,
          spacingX,
          spacingY,
          time,
          shapeMode,
          shapeTransition
        );

        if (i < gridWidth - 1) {
          const shapePos2 = getShapePosition(
            i + 1,
            j,
            gridWidth,
            gridHeight,
            spacingX,
            spacingY,
            time,
            shapeMode,
            shapeTransition
          );
          linePositions[lineIndex * 6] = shapePos1.x;
          linePositions[lineIndex * 6 + 1] = shapePos1.y;
          linePositions[lineIndex * 6 + 2] = shapePos1.z;
          linePositions[lineIndex * 6 + 3] = shapePos2.x;
          linePositions[lineIndex * 6 + 4] = shapePos2.y;
          linePositions[lineIndex * 6 + 5] = shapePos2.z;
          lineIndex++;
        }

        if (j < gridHeight - 1) {
          const shapePos2 = getShapePosition(
            i,
            j + 1,
            gridWidth,
            gridHeight,
            spacingX,
            spacingY,
            time,
            shapeMode,
            shapeTransition
          );
          linePositions[lineIndex * 6] = shapePos1.x;
          linePositions[lineIndex * 6 + 1] = shapePos1.y;
          linePositions[lineIndex * 6 + 2] = shapePos1.z;
          linePositions[lineIndex * 6 + 3] = shapePos2.x;
          linePositions[lineIndex * 6 + 4] = shapePos2.y;
          linePositions[lineIndex * 6 + 5] = shapePos2.z;
          lineIndex++;
        }
      }
    }

    lineSystem.geometry.attributes.position.needsUpdate = true;

    const opacity = 0.2 + Math.sin(time * 2) * 0.1;
    lineSystem.material.opacity = opacity;
  }

  renderer.render(scene, camera);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThreeBackground);
} else {
  initThreeBackground();
}
