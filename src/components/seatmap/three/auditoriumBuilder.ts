import * as THREE from 'three';
import type { Seat, SeatViewMode } from '../../../types';
import type { PriceTierThresholds } from '../../../utils/seatLogic';
import {
  computeRowTierMetrics,
  computeSeatTransform3D,
  resolveSeatColorState,
  ROWS_ORDER,
  STAGE_SURFACE_Y,
  STAGE_Z,
  type SeatTransform3D,
} from './auditoriumLayout';

export interface AuditoriumSceneHandles {
  rootGroup: THREE.Group;
  seatRaycastMesh: THREE.InstancedMesh;
  seatTransforms: SeatTransform3D[];
  seatIndexById: Map<string, number>;
  updateSeatStates: (params: {
    seats: Seat[];
    selectedSet: Set<string>;
    aiSet: Set<string>;
    conflictSet: Set<string>;
    hoveredSeatId: string | null;
    viewMode: SeatViewMode;
    thresholds: PriceTierThresholds;
  }) => void;
  updateThemeAtmosphere: (opts: {
    isDark: boolean;
    bgHex: string;
    primaryHex: string;
    accentHex: string;
  }) => void;
  dispose: () => void;
}

interface BuildOptions {
  seats: Seat[];
  eventTitle: string;
  venue: string;
  hall: string;
  maxAnisotropy: number;
  isSoftwareGl: boolean;
  isDark: boolean;
  bgHex: string;
  primaryHex: string;
  accentHex: string;
}

// Reusable module-scoped math helpers (zero GC churn)
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function createAcousticCarpetTexture(maxAnisotropy: number, isDark: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isDark ? '#10182b' : '#cbd5e1';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle woven architectural carpet rib lines
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.08)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.fillStyle = isDark ? 'rgba(99, 102, 241, 0.06)' : 'rgba(79, 70, 229, 0.05)';
  for (let x = 0; x < 256; x += 32) {
    ctx.fillRect(x, 0, 4, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createStageScreenTexture(
  eventTitle: string,
  venue: string,
  hall: string,
  primaryHex: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 384);
  grad.addColorStop(0, '#070b17');
  grad.addColorStop(0.5, '#131d3b');
  grad.addColorStop(1, '#090f21');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 384);

  // Architectural radial stage glow
  const glow = ctx.createRadialGradient(512, 160, 20, 512, 180, 440);
  glow.addColorStop(0, `${primaryHex}55`);
  glow.addColorStop(0.55, `${accentHex}24`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 384);

  // Perspective acoustic grid overlay
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 384);
    ctx.stroke();
  }
  for (let y = 0; y <= 384; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Top badge
  ctx.fillStyle = accentHex;
  ctx.font = '700 22px "Plus Jakarta Sans", Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SEATLOCK LIVE STAGE  ·  3D AUDITORIUM', 512, 86);

  // Event Title (auto-fit width)
  ctx.fillStyle = '#F8FAFC';
  const titleText = eventTitle.length > 34 ? `${eventTitle.slice(0, 32)}…` : eventTitle;
  ctx.font = '800 54px "Plus Jakarta Sans", Inter, system-ui, sans-serif';
  ctx.fillText(titleText, 512, 194);

  // Venue & Hall subtitle
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '600 26px Inter, system-ui, sans-serif';
  ctx.fillText(`${venue}  •  ${hall}`, 512, 256);

  // Bottom accent equalizer bar
  const barGrad = ctx.createLinearGradient(160, 0, 864, 0);
  barGrad.addColorStop(0, 'rgba(99,102,241,0)');
  barGrad.addColorStop(0.25, primaryHex);
  barGrad.addColorStop(0.5, accentHex);
  barGrad.addColorStop(0.75, primaryHex);
  barGrad.addColorStop(1, 'rgba(99,102,241,0)');
  ctx.fillStyle = barGrad;
  ctx.fillRect(160, 312, 704, 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createRowMarkerTexture(rowLetter: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 50, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 58px "Plus Jakarta Sans", Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rowLetter, 64, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Create sculpted, beveled auditorium chair sub-geometries grounded at local y = 0.
 * All 5 parts compose a realistic cinema/auditorium seat rather than a bare primitive.
 */
function createSeatPartGeometries() {
  // 1. Contoured seat cushion (extruded rounded silhouette)
  const cushionShape = new THREE.Shape();
  cushionShape.moveTo(-0.31, -0.24);
  cushionShape.lineTo(0.31, -0.24);
  cushionShape.quadraticCurveTo(0.36, -0.24, 0.36, -0.18);
  cushionShape.lineTo(0.36, 0.22);
  cushionShape.quadraticCurveTo(0.36, 0.28, 0.3, 0.28);
  cushionShape.lineTo(-0.3, 0.28);
  cushionShape.quadraticCurveTo(-0.36, 0.28, -0.36, 0.22);
  cushionShape.lineTo(-0.36, -0.18);
  cushionShape.quadraticCurveTo(-0.36, -0.24, -0.31, -0.24);

  const cushionGeo = new THREE.ExtrudeGeometry(cushionShape, {
    depth: 0.11,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  cushionGeo.rotateX(-Math.PI / 2);
  cushionGeo.translate(0, 0.36, 0.04);

  // 2. Sculpted ergonomic reclined backrest
  const backShape = new THREE.Shape();
  backShape.moveTo(-0.33, 0);
  backShape.lineTo(0.33, 0);
  backShape.quadraticCurveTo(0.37, 0.02, 0.36, 0.56);
  backShape.quadraticCurveTo(0.34, 0.72, 0.24, 0.74);
  backShape.lineTo(-0.24, 0.74);
  backShape.quadraticCurveTo(-0.34, 0.72, -0.36, 0.56);
  backShape.quadraticCurveTo(-0.37, 0.02, -0.33, 0);

  const backrestGeo = new THREE.ExtrudeGeometry(backShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.022,
    bevelSegments: 2,
  });
  backrestGeo.rotateX(-0.18); // Gentle ergonomic recline
  backrestGeo.translate(0, 0.36, 0.22);

  // 3. Glowing top status rim strip (makes Selected / AI / Hover readable from any orbit angle)
  const rimGeo = new THREE.BoxGeometry(0.56, 0.055, 0.07);
  rimGeo.translate(0, 1.11, 0.12);

  // 4. Sculpted paired armrests (merged into a single geometry for 1 instanced draw call)
  const armLeft = new THREE.BoxGeometry(0.08, 0.24, 0.46);
  armLeft.translate(-0.39, 0.46, 0.02);
  const armRight = new THREE.BoxGeometry(0.08, 0.24, 0.46);
  armRight.translate(0.39, 0.46, 0.02);
  const armrestsGeo = mergeSimpleBufferGeometries([armLeft, armRight]);
  armLeft.dispose();
  armRight.dispose();

  // 5. Cast-aluminum pedestal & floor mounting plate grounded flush at y = 0
  const basePlate = new THREE.CylinderGeometry(0.24, 0.28, 0.05, 10);
  basePlate.translate(0, 0.025, 0.04);
  const pedestalPost = new THREE.CylinderGeometry(0.065, 0.09, 0.34, 8);
  pedestalPost.translate(0, 0.2, 0.04);
  const pedestalGeo = mergeSimpleBufferGeometries([basePlate, pedestalPost]);
  basePlate.dispose();
  pedestalPost.dispose();

  // 6. Simplified raycast proxy box covering the entire chair footprint
  const proxyGeo = new THREE.BoxGeometry(0.88, 1.18, 0.84);
  proxyGeo.translate(0, 0.59, 0.04);

  return {
    cushionGeo,
    backrestGeo,
    rimGeo,
    armrestsGeo,
    pedestalGeo,
    proxyGeo,
  };
}

/**
 * Lightweight zero-dependency non-indexed geometry merger for static sub-parts.
 */
function mergeSimpleBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
  let totalVertices = 0;
  for (const g of nonIndexed) {
    totalVertices += g.attributes.position.count;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  let offset = 0;

  for (const g of nonIndexed) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    const norm = g.attributes.normal as THREE.BufferAttribute;
    positions.set(pos.array as Float32Array, offset * 3);
    if (norm) {
      normals.set(norm.array as Float32Array, offset * 3);
    }
    offset += pos.count;
    if (g !== geometries[nonIndexed.indexOf(g)]) {
      g.dispose();
    }
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.computeBoundingSphere();
  return merged;
}

export function buildAuditoriumScene(
  scene: THREE.Scene,
  options: BuildOptions
): AuditoriumSceneHandles {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const { seats, eventTitle, venue, hall, maxAnisotropy, isSoftwareGl } = options;

  // --- 1. Materials Library ---
  const carpetTexDark = track(createAcousticCarpetTexture(maxAnisotropy, true));
  const carpetTexLight = track(createAcousticCarpetTexture(maxAnisotropy, false));

  const floorMat = track(
    new THREE.MeshStandardMaterial({
      map: options.isDark ? carpetTexDark : carpetTexLight,
      roughness: 0.88,
      metalness: 0.06,
    })
  );

  const riserFrontMat = track(
    new THREE.MeshStandardMaterial({
      color: options.isDark ? 0x1e293b : 0x94a3b8,
      roughness: 0.62,
      metalness: 0.25,
    })
  );

  const aisleGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(options.accentHex),
      emissive: new THREE.Color(options.accentHex),
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.2,
    })
  );

  const brushedMetalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.24,
      metalness: 0.88,
    })
  );

  const glassRailMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      clearcoat: 0.8,
    })
  );

  const wallMat = track(
    new THREE.MeshStandardMaterial({
      color: options.isDark ? 0x0f172a : 0xdbe4f0,
      roughness: 0.78,
      metalness: 0.12,
    })
  );

  // --- 2. Ground Base Foundation & Acoustic Side Borders ---
  const foundationGeo = track(new THREE.BoxGeometry(24, 0.5, 29));
  const foundationMesh = new THREE.Mesh(foundationGeo, floorMat);
  foundationMesh.position.set(0, -0.25, 1.5);
  foundationMesh.receiveShadow = !isSoftwareGl;
  rootGroup.add(foundationMesh);

  // Soft radial contact shadow halo under the entire bowl
  const bowlShadowCanvas = document.createElement('canvas');
  bowlShadowCanvas.width = 256;
  bowlShadowCanvas.height = 256;
  const bCtx = bowlShadowCanvas.getContext('2d')!;
  const rad = bCtx.createRadialGradient(128, 128, 12, 128, 128, 120);
  rad.addColorStop(0, 'rgba(0,0,0,0.42)');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  bCtx.fillStyle = rad;
  bCtx.fillRect(0, 0, 256, 256);
  const shadowTex = track(new THREE.CanvasTexture(bowlShadowCanvas));
  const contactPlane = new THREE.Mesh(
    track(new THREE.PlaneGeometry(34, 36)),
    track(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      })
    )
  );
  contactPlane.rotation.x = -Math.PI / 2;
  contactPlane.position.set(0, -0.49, 1.5);
  rootGroup.add(contactPlane);

  // --- 3. Stepped Tiered Risers, Illuminated Center Aisle & Row Medallions ---
  const aisleStripGeo = track(new THREE.BoxGeometry(1.56, 0.04, 0.06));
  const rowBadgeGeo = track(new THREE.CircleGeometry(0.32, 24));

  for (let i = 0; i < ROWS_ORDER.length; i++) {
    const tier = computeRowTierMetrics(i);
    const slabHeight = Math.max(0.22, tier.floorY + 0.04);

    // Tiered floor block
    const riserGeo = track(new THREE.BoxGeometry(tier.width, slabHeight, tier.depth + 0.34));
    const riserMesh = new THREE.Mesh(riserGeo, floorMat);
    riserMesh.position.set(0, tier.floorY - slabHeight / 2, tier.baseZ - 0.14);
    riserMesh.receiveShadow = !isSoftwareGl;
    rootGroup.add(riserMesh);

    // Metallic step-edge nosing strip
    const nosingGeo = track(new THREE.BoxGeometry(tier.width + 0.04, 0.05, 0.06));
    const nosingMesh = new THREE.Mesh(nosingGeo, riserFrontMat);
    nosingMesh.position.set(0, tier.floorY - 0.015, tier.baseZ - tier.depth / 2 - 0.28);
    rootGroup.add(nosingMesh);

    // Center illuminated aisle step LED
    const aisleLed = new THREE.Mesh(aisleStripGeo, aisleGlowMat);
    aisleLed.position.set(0, tier.floorY + 0.02, tier.baseZ - tier.depth / 2 - 0.25);
    rootGroup.add(aisleLed);

    // Row letter floor medallion centered in the aisle
    const rowTex = track(createRowMarkerTexture(tier.row, maxAnisotropy));
    const rowMat = track(
      new THREE.MeshBasicMaterial({
        map: rowTex,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    const rowBadge = new THREE.Mesh(rowBadgeGeo, rowMat);
    rowBadge.rotation.x = -Math.PI / 2;
    rowBadge.position.set(0, tier.floorY + 0.025, tier.baseZ - 0.05);
    rootGroup.add(rowBadge);

    // Architectural divider wall + glass safety balustrade at Mezzanine & Balcony fronts
    if (tier.isSectionStart && i > 0) {
      const parapetZ = tier.baseZ - tier.depth / 2 - 0.36;
      const wingWidth = tier.width / 2 - 1.15;

      for (const side of [-1, 1]) {
        const cx = side * (1.15 + wingWidth / 2);

        // Low concrete/acoustic parapet wall
        const parapet = new THREE.Mesh(
          track(new THREE.BoxGeometry(wingWidth, 0.42, 0.16)),
          wallMat
        );
        parapet.position.set(cx, tier.floorY + 0.21, parapetZ);
        rootGroup.add(parapet);

        // Translucent safety glass panel above parapet
        const glassPanel = new THREE.Mesh(
          track(new THREE.BoxGeometry(wingWidth - 0.12, 0.48, 0.04)),
          glassRailMat
        );
        glassPanel.position.set(cx, tier.floorY + 0.66, parapetZ);
        glassPanel.renderOrder = 3;
        rootGroup.add(glassPanel);

        // Brushed-aluminum handrail bar
        const rail = new THREE.Mesh(
          track(new THREE.BoxGeometry(wingWidth, 0.05, 0.09)),
          brushedMetalMat
        );
        rail.position.set(cx, tier.floorY + 0.92, parapetZ);
        rootGroup.add(rail);
      }
    }
  }

  // Subtle low architectural side acoustic ribs (kept low so orbit camera is never blocked)
  const ribGeo = track(new THREE.BoxGeometry(0.28, 1.35, 0.42));
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 8; k++) {
      const zPos = -5.8 + k * 2.65;
      const tierApprox = Math.min(8, Math.max(0, k));
      const yBase = computeRowTierMetrics(tierApprox).floorY;
      const rib = new THREE.Mesh(ribGeo, wallMat);
      rib.position.set(s * (8.4 + k * 0.12), yBase + 0.65, zPos);
      rootGroup.add(rib);

      // Subtle vertical accent sconce strip on each rib
      const sconce = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.06, 0.72, 0.08)),
        aisleGlowMat
      );
      sconce.position.set(s * (8.24 + k * 0.12), yBase + 0.68, zPos);
      rootGroup.add(sconce);
    }
  }

  // --- 4. Composite 8-Part Cinematic Auditorium Stage ---
  const stageGroup = new THREE.Group();
  stageGroup.position.set(0, 0, STAGE_Z);
  rootGroup.add(stageGroup);

  // Part 1: Main stage platform deck
  const stageDeckMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.42,
      metalness: 0.22,
    })
  );
  const stageDeck = new THREE.Mesh(
    track(new THREE.BoxGeometry(15.2, STAGE_SURFACE_Y, 4.6)),
    stageDeckMat
  );
  stageDeck.position.set(0, STAGE_SURFACE_Y / 2, 0);
  stageDeck.receiveShadow = !isSoftwareGl;
  stageGroup.add(stageDeck);

  // Part 2: Curved front stage apron
  const apronGeo = track(
    new THREE.CylinderGeometry(7.6, 7.6, STAGE_SURFACE_Y, 32, 1, false, -Math.PI * 0.35, Math.PI * 0.7)
  );
  const apronMesh = new THREE.Mesh(apronGeo, stageDeckMat);
  apronMesh.scale.set(1, 1, 0.24);
  apronMesh.position.set(0, STAGE_SURFACE_Y / 2, 2.28);
  stageGroup.add(apronMesh);

  // Part 3: Glowing front stage footlight rim
  const stageTrim = new THREE.Mesh(
    track(new THREE.BoxGeometry(15.24, 0.07, 0.12)),
    aisleGlowMat
  );
  stageTrim.position.set(0, STAGE_SURFACE_Y + 0.02, 2.29);
  stageGroup.add(stageTrim);

  // Part 4: Stage screen housing bezel
  const screenBezel = new THREE.Mesh(
    track(new THREE.BoxGeometry(12.8, 4.7, 0.36)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0x0b1120,
        roughness: 0.35,
        metalness: 0.72,
      })
    )
  );
  screenBezel.position.set(0, STAGE_SURFACE_Y + 2.55, -1.95);
  stageGroup.add(screenBezel);

  // Part 5: Widescreen procedural LED event display
  const screenTex = track(
    createStageScreenTexture(
      eventTitle,
      venue,
      hall,
      options.primaryHex,
      options.accentHex,
      maxAnisotropy
    )
  );
  const screenMat = track(
    new THREE.MeshStandardMaterial({
      map: screenTex,
      emissiveMap: screenTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.85,
      roughness: 0.22,
      metalness: 0.08,
    })
  );
  const screenPlane = new THREE.Mesh(track(new THREE.PlaneGeometry(12.2, 4.2)), screenMat);
  screenPlane.position.set(0, STAGE_SURFACE_Y + 2.55, -1.75);
  stageGroup.add(screenPlane);

  // Part 6: Overhead brushed-metal stage lighting truss & support pillars
  const trussBar = new THREE.Mesh(track(new THREE.BoxGeometry(14.8, 0.28, 0.36)), brushedMetalMat);
  trussBar.position.set(0, STAGE_SURFACE_Y + 5.35, 0.85);
  stageGroup.add(trussBar);

  const pillarGeo = track(new THREE.CylinderGeometry(0.14, 0.16, 5.4, 12));
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(pillarGeo, brushedMetalMat);
    pillar.position.set(side * 7.2, STAGE_SURFACE_Y + 2.7, 0.85);
    stageGroup.add(pillar);

    // Part 7: Suspended line-array speaker towers
    const speakerBody = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.82, 2.1, 0.68)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.55,
          metalness: 0.35,
        })
      )
    );
    speakerBody.position.set(side * 6.85, STAGE_SURFACE_Y + 3.25, -0.5);
    speakerBody.rotation.y = side * -0.22;
    stageGroup.add(speakerBody);
  }

  // Part 8: 6 Sculpted stage spotlight cans + subtle volumetric cones
  const spotCanGeo = track(new THREE.CylinderGeometry(0.14, 0.2, 0.42, 10));
  const beamGeo = track(new THREE.ConeGeometry(1.5, 5.2, 16, 1, true));
  const beamMat = track(
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(options.accentHex),
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  for (let i = 0; i < 6; i++) {
    const xPos = -5.2 + i * 2.08;
    const can = new THREE.Mesh(spotCanGeo, brushedMetalMat);
    can.position.set(xPos, STAGE_SURFACE_Y + 5.1, 0.92);
    can.rotation.x = 0.38;
    stageGroup.add(can);

    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(xPos, STAGE_SURFACE_Y + 2.75, 1.85);
    beam.rotation.x = -0.35;
    stageGroup.add(beam);
  }

  // --- 5. Composite 5-Part Instanced Auditorium Chairs (108 seats) ---
  const seatTransforms = seats.map((seat) => computeSeatTransform3D(seat));
  const seatIndexById = new Map<string, number>();
  seatTransforms.forEach((tr, idx) => seatIndexById.set(tr.seatId, idx));

  const count = seats.length;
  const seatGeos = createSeatPartGeometries();
  track(seatGeos.cushionGeo);
  track(seatGeos.backrestGeo);
  track(seatGeos.rimGeo);
  track(seatGeos.armrestsGeo);
  track(seatGeos.pedestalGeo);
  track(seatGeos.proxyGeo);

  // Upholstered velvet fabric material (uses instanceColor)
  const fabricMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.08,
    })
  );

  // Emissive accent rim strip material (uses instanceColor)
  const rimMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.25,
      emissive: new THREE.Color(0x222222),
      emissiveIntensity: 0.45,
    })
  );

  // Sculpted armrest trim
  const armrestMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
      metalness: 0.35,
    })
  );

  // Cast-aluminum pedestal
  const pedestalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.26,
      metalness: 0.88,
    })
  );

  // Invisible simplified raycasting hit proxy
  const proxyMat = track(
    new THREE.MeshBasicMaterial({
      visible: false,
    })
  );

  const cushionMesh = new THREE.InstancedMesh(seatGeos.cushionGeo, fabricMat, count);
  const backrestMesh = new THREE.InstancedMesh(seatGeos.backrestGeo, fabricMat, count);
  const rimMesh = new THREE.InstancedMesh(seatGeos.rimGeo, rimMat, count);
  const armrestsMesh = new THREE.InstancedMesh(seatGeos.armrestsGeo, armrestMat, count);
  const pedestalMesh = new THREE.InstancedMesh(seatGeos.pedestalGeo, pedestalMat, count);
  const seatRaycastMesh = new THREE.InstancedMesh(seatGeos.proxyGeo, proxyMat, count);

  cushionMesh.castShadow = !isSoftwareGl;
  cushionMesh.receiveShadow = !isSoftwareGl;
  backrestMesh.castShadow = !isSoftwareGl;
  backrestMesh.receiveShadow = !isSoftwareGl;

  // Set raycast mesh on layer 1 too for crisp selective picking
  seatRaycastMesh.layers.enable(1);

  for (let i = 0; i < count; i++) {
    const tr = seatTransforms[i];
    _dummy.position.set(tr.x, tr.y, tr.z);
    _dummy.rotation.set(0, tr.rotationY, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();

    cushionMesh.setMatrixAt(i, _dummy.matrix);
    backrestMesh.setMatrixAt(i, _dummy.matrix);
    rimMesh.setMatrixAt(i, _dummy.matrix);
    armrestsMesh.setMatrixAt(i, _dummy.matrix);
    pedestalMesh.setMatrixAt(i, _dummy.matrix);
    seatRaycastMesh.setMatrixAt(i, _dummy.matrix);
  }

  [cushionMesh, backrestMesh, rimMesh, armrestsMesh, pedestalMesh, seatRaycastMesh].forEach((m) => {
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    m.computeBoundingSphere();
    rootGroup.add(m);
  });

  // --- 6. Dynamic Seat State Updater (zero GC allocations) ---
  const updateSeatStates: AuditoriumSceneHandles['updateSeatStates'] = ({
    seats: latestSeats,
    selectedSet,
    aiSet,
    conflictSet,
    hoveredSeatId,
    viewMode,
    thresholds,
  }) => {
    const hasAi = aiSet.size > 0;
    for (let i = 0; i < latestSeats.length; i++) {
      const seat = latestSeats[i];
      const idx = seatIndexById.get(seat.id);
      if (idx === undefined) continue;
      const tr = seatTransforms[idx];

      const visual = resolveSeatColorState(seat, {
        isSelected: selectedSet.has(seat.id),
        isAi: aiSet.has(seat.id),
        isConflict: conflictSet.has(seat.id),
        isHovered: hoveredSeatId === seat.id,
        viewMode,
        thresholds,
        hasAiRecommendations: hasAi,
      });

      _color.setHex(visual.cushionHex);
      cushionMesh.setColorAt(idx, _color);
      backrestMesh.setColorAt(idx, _color);

      _color.setHex(visual.rimHex);
      rimMesh.setColorAt(idx, _color);

      // Subtle vertical pop & scale emphasis on selected / hovered / AI seats
      const yLift = visual.elevated ? 0.14 : 0;
      const scaleXZ = visual.elevated ? 1.055 : 1;
      _dummy.position.set(tr.x, tr.y + yLift, tr.z);
      _dummy.rotation.set(0, tr.rotationY, 0);
      _dummy.scale.set(scaleXZ, visual.elevated ? 1.06 : 1, scaleXZ);
      _dummy.updateMatrix();

      cushionMesh.setMatrixAt(idx, _dummy.matrix);
      backrestMesh.setMatrixAt(idx, _dummy.matrix);
      rimMesh.setMatrixAt(idx, _dummy.matrix);
    }

    if (cushionMesh.instanceColor) cushionMesh.instanceColor.needsUpdate = true;
    if (backrestMesh.instanceColor) backrestMesh.instanceColor.needsUpdate = true;
    if (rimMesh.instanceColor) rimMesh.instanceColor.needsUpdate = true;
    cushionMesh.instanceMatrix.needsUpdate = true;
    backrestMesh.instanceMatrix.needsUpdate = true;
    rimMesh.instanceMatrix.needsUpdate = true;
  };

  // --- 7. Live Theme Atmosphere Sync ---
  const updateThemeAtmosphere: AuditoriumSceneHandles['updateThemeAtmosphere'] = ({
    isDark,
    bgHex,
    accentHex,
  }) => {
    const bgColor = new THREE.Color(bgHex);
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2(bgColor.getHex(), isDark ? 0.017 : 0.013);

    floorMat.map = isDark ? carpetTexDark : carpetTexLight;
    floorMat.needsUpdate = true;
    riserFrontMat.color.setHex(isDark ? 0x1e293b : 0x94a3b8);
    wallMat.color.setHex(isDark ? 0x0f172a : 0xdbe4f0);

    aisleGlowMat.color.set(accentHex);
    aisleGlowMat.emissive.set(accentHex);
    beamMat.color.set(accentHex);
  };

  const dispose = () => {
    scene.remove(rootGroup);
    for (const d of disposables) {
      d.dispose();
    }
  };

  return {
    rootGroup,
    seatRaycastMesh,
    seatTransforms,
    seatIndexById,
    updateSeatStates,
    updateThemeAtmosphere,
    dispose,
  };
}
