import {
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { usePreferences } from '../../context/PreferencesContext';
import type { Seat, SeatViewMode } from '../../types';
import { computePriceTierThresholds } from '../../utils/seatLogic';
import { buildAuditoriumScene, type AuditoriumSceneHandles } from './three/auditoriumBuilder';
import {
  computeSeatPovCamera,
  getStaticCameraPresets,
  type CameraPresetId,
  type Vec3Tuple,
} from './three/auditoriumLayout';

interface AuditoriumSeatMap3DProps {
  eventTitle: string;
  venue: string;
  hall: string;
  seats: Seat[];
  selectedSeatIds: string[];
  aiRecommendedIds: string[];
  conflictedSeatIds: string[];
  viewMode: SeatViewMode;
  onToggleSeat: (seat: Seat) => void;
}

// Reusable module-scoped vectors for zero GC churn in render/raycast paths
const _ndc = new THREE.Vector2();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _zoomVec = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function AuditoriumSeatMap3D({
  eventTitle,
  venue,
  hall,
  seats,
  selectedSeatIds,
  aiRecommendedIds,
  conflictedSeatIds,
  viewMode,
  onToggleSeat,
}: AuditoriumSeatMap3DProps) {
  const { resolvedTheme, activeThemePreset, activeBgHex, preferences } = usePreferences();

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('overview');
  const [povSeatId, setPovSeatId] = useState<string | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const thresholds = useMemo(() => computePriceTierThresholds(seats), [seats]);
  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const aiSet = useMemo(() => new Set(aiRecommendedIds), [aiRecommendedIds]);
  const conflictSet = useMemo(() => new Set(conflictedSeatIds), [conflictedSeatIds]);

  // Refs to keep Three.js lifecycle completely isolated from React re-renders
  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const selectedSetRef = useRef(selectedSet);
  selectedSetRef.current = selectedSet;
  const aiSetRef = useRef(aiSet);
  aiSetRef.current = aiSet;
  const conflictSetRef = useRef(conflictSet);
  conflictSetRef.current = conflictSet;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const thresholdsRef = useRef(thresholds);
  thresholdsRef.current = thresholds;
  const hoveredSeatIdRef = useRef<string | null>(null);
  const onToggleSeatRef = useRef(onToggleSeat);
  onToggleSeatRef.current = onToggleSeat;
  const reducedMotionRef = useRef(preferences.reducedMotion);
  reducedMotionRef.current = preferences.reducedMotion;

  // Engine control hooks exposed from the WebGL setup effect
  const engineRef = useRef<{
    handles: AuditoriumSceneHandles;
    requestRender: () => void;
    glideToCamera: (pos: Vec3Tuple, target: Vec3Tuple) => void;
    nudgeZoom: (factor: number) => void;
    syncSize: () => void;
  } | null>(null);

  const syncSeatVisuals = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.handles.updateSeatStates({
      seats: seatsRef.current,
      selectedSet: selectedSetRef.current,
      aiSet: aiSetRef.current,
      conflictSet: conflictSetRef.current,
      hoveredSeatId: hoveredSeatIdRef.current,
      viewMode: viewModeRef.current,
      thresholds: thresholdsRef.current,
    });
    engine.requestRender();
  }, []);

  // Initialize Three.js WebGLRenderer, scene, studio environment, lighting, and controls once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL 3D rendering is unavailable in this browser. Switch to 2D Classic view.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.outline = 'none';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D auditorium seat map');

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialBg = new THREE.Color(resolvedTheme === 'dark' ? '#090E1C' : '#E2E8F0');
    scene.background = initialBg;
    scene.fog = new THREE.FogExp2(initialBg.getHex(), resolvedTheme === 'dark' ? 0.017 : 0.013);

    // Mandatory studio environment map for PBR reflections on metal pedestals & handrails
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.15, 140);
    const presets = getStaticCameraPresets();
    camera.position.set(
      presets.overview.position.x,
      presets.overview.position.y,
      presets.overview.position.z
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(
      presets.overview.target.x,
      presets.overview.target.y,
      presets.overview.target.z
    );
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.minDistance = 2.4;
    controls.maxDistance = 38;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    // Balanced 3-point + stage architectural lighting rig (warm key, cool hemisphere fill, rim, stage glow)
    const hemiLight = new THREE.HemisphereLight(0xc7d2fe, 0x1e293b, 0.95);
    hemiLight.position.set(0, 24, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.45);
    keyLight.position.set(11, 18, 12);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 48;
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 18;
    keyLight.shadow.camera.bottom = -18;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.62);
    rimLight.position.set(-14, 10, -12);
    scene.add(rimLight);

    const stageWashLight = new THREE.PointLight(0x22d3ee, 14, 24, 1.6);
    stageWashLight.position.set(0, 5.2, -7.2);
    scene.add(stageWashLight);

    // Build procedural 3D auditorium geometry & instanced 5-part chairs
    const handles = buildAuditoriumScene(scene, {
      seats: seatsRef.current,
      eventTitle,
      venue,
      hall,
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      isSoftwareGl,
      isDark: resolvedTheme === 'dark',
      bgHex: activeBgHex,
      primaryHex: activeThemePreset.primary,
      accentHex: activeThemePreset.accent,
    });

    handles.updateSeatStates({
      seats: seatsRef.current,
      selectedSet: selectedSetRef.current,
      aiSet: aiSetRef.current,
      conflictSet: conflictSetRef.current,
      hoveredSeatId: hoveredSeatIdRef.current,
      viewMode: viewModeRef.current,
      thresholds: thresholdsRef.current,
    });

    renderer.setSize(width, height, false);
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // --- Coalesced On-Demand Render Pipeline + Software-WebGL fenceSync pacing ---
    let disposed = false;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let transitionActive = false;
    let lastFrameTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min(0.1, Math.max(0.001, (now - lastFrameTime) / 1000));
        lastFrameTime = now;

        if (transitionActive) {
          if (isSoftwareGl || reducedMotionRef.current) {
            camera.position.copy(_targetPos);
            controls.target.copy(_targetLook);
            transitionActive = false;
          } else {
            const lambda = 7.5;
            camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, lambda, dt);
            camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, lambda, dt);
            camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, lambda, dt);

            controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, lambda, dt);
            controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, lambda, dt);
            controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, lambda, dt);

            if (
              camera.position.distanceToSquared(_targetPos) < 0.0015 &&
              controls.target.distanceToSquared(_targetLook) < 0.0015
            ) {
              camera.position.copy(_targetPos);
              controls.target.copy(_targetLook);
              transitionActive = false;
            } else {
              renderDirty = true;
            }
          }
        }

        const didDamp = controls.update();
        if (didDamp && !isSoftwareGl && controls.enableDamping) {
          // OrbitControls damping only needs follow-up frames while velocity remains noticeable
          renderDirty = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && renderDirty) {
            requestRender();
          }
        };
        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    }

    const glideToCamera = (pos: Vec3Tuple, target: Vec3Tuple) => {
      _targetPos.set(pos.x, pos.y, pos.z);
      _targetLook.set(target.x, target.y, target.z);
      transitionActive = true;
      lastFrameTime = performance.now();
      requestRender();
    };

    const nudgeZoom = (factor: number) => {
      transitionActive = false;
      _zoomVec.copy(camera.position).sub(controls.target);
      const nextDist = THREE.MathUtils.clamp(
        _zoomVec.length() * factor,
        controls.minDistance,
        controls.maxDistance
      );
      _zoomVec.setLength(nextDist);
      camera.position.copy(controls.target).add(_zoomVec);
      controls.update();
      requestRender();
    };

    const syncSize = () => {
      if (disposed) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      requestRender();
    };

    // Cancel scripted camera transition immediately when user starts orbiting/zooming
    const onControlStart = () => {
      transitionActive = false;
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    // --- High-Performance Layer-1 Raycasting (Throttled Hover + Click-vs-Drag Guard) ---
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);

    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastHoverRaycast = 0;

    const pickSeatAtClientPoint = (clientX: number, clientY: number): Seat | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_ndc, camera);
      const hits = raycaster.intersectObject(handles.seatRaycastMesh, false);
      if (hits.length === 0 || hits[0].instanceId === undefined) return null;
      const tr = handles.seatTransforms[hits[0].instanceId];
      if (!tr) return null;
      return seatsRef.current.find((s) => s.id === tr.seatId) ?? null;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverRaycast < 36) return;
      lastHoverRaycast = now;

      const hitSeat = pickSeatAtClientPoint(e.clientX, e.clientY);
      const nextId = hitSeat?.id ?? null;
      if (nextId !== hoveredSeatIdRef.current) {
        hoveredSeatIdRef.current = nextId;
        setHoveredSeat(hitSeat);
        renderer.domElement.style.cursor = hitSeat
          ? hitSeat.status === 'available' || selectedSetRef.current.has(hitSeat.id)
            ? 'pointer'
            : 'not-allowed'
          : 'grab';
        handles.updateSeatStates({
          seats: seatsRef.current,
          selectedSet: selectedSetRef.current,
          aiSet: aiSetRef.current,
          conflictSet: conflictSetRef.current,
          hoveredSeatId: nextId,
          viewMode: viewModeRef.current,
          thresholds: thresholdsRef.current,
        });
        requestRender();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      if (dist > 6) return; // User orbited/panned, do not toggle seat
      const hitSeat = pickSeatAtClientPoint(e.clientX, e.clientY);
      if (hitSeat) {
        setHoveredSeat(hitSeat);
        hoveredSeatIdRef.current = hitSeat.id;
        onToggleSeatRef.current(hitSeat);
      }
    };

    const onPointerLeave = () => {
      if (hoveredSeatIdRef.current !== null) {
        hoveredSeatIdRef.current = null;
        setHoveredSeat(null);
        renderer.domElement.style.cursor = 'grab';
        handles.updateSeatStates({
          seats: seatsRef.current,
          selectedSet: selectedSetRef.current,
          aiSet: aiSetRef.current,
          conflictSet: conflictSetRef.current,
          hoveredSeatId: null,
          viewMode: viewModeRef.current,
          thresholds: thresholdsRef.current,
        });
        requestRender();
      }
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    const resizeObserver = new ResizeObserver(() => {
      syncSize();
    });
    resizeObserver.observe(container);

    engineRef.current = {
      handles,
      requestRender,
      glideToCamera,
      nudgeZoom,
      syncSize,
    };

    // Initial render
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      handles.dispose();
      envTarget.dispose();
      renderer.dispose();
      engineRef.current = null;
    };
    // Rebuild scene only when the event itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTitle, venue, hall]);

  // Sync seat colors/elevation instantaneously when selection, SeatHeat, AI picks, or conflicts change
  useEffect(() => {
    syncSeatVisuals();
  }, [seats, selectedSeatIds, aiRecommendedIds, conflictedSeatIds, viewMode, syncSeatVisuals]);

  // Sync 3D atmosphere with active Theme Studio preset or custom background
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.handles.updateThemeAtmosphere({
      isDark: resolvedTheme === 'dark',
      bgHex: activeBgHex,
      primaryHex: activeThemePreset.primary,
      accentHex: activeThemePreset.accent,
    });
    engine.requestRender();
  }, [resolvedTheme, activeBgHex, activeThemePreset]);

  // Re-sync canvas aspect ratio when expanding/collapsing full view
  useEffect(() => {
    const id = window.setTimeout(() => {
      engineRef.current?.syncSize();
    }, 60);
    return () => window.clearTimeout(id);
  }, [isExpanded]);

  // Keyboard shortcut 'H' to toggle bottom control dock, Escape to exit expanded mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((c) => !c);
      } else if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  const applyCameraPreset = (presetId: Exclude<CameraPresetId, 'seat-pov'>) => {
    const engine = engineRef.current;
    if (!engine) return;
    const pose = getStaticCameraPresets()[presetId];
    setActivePreset(presetId);
    setPovSeatId(null);
    engine.glideToCamera(pose.position, pose.target);
  };

  const applySeatPov = (seatId?: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    const targetSeatId =
      seatId ??
      hoveredSeat?.id ??
      selectedSeatIds[selectedSeatIds.length - 1] ??
      aiRecommendedIds[0] ??
      'D6';

    const idx = engine.handles.seatIndexById.get(targetSeatId);
    if (idx === undefined) return;
    const tr = engine.handles.seatTransforms[idx];
    const pose = computeSeatPovCamera(tr);
    setActivePreset('seat-pov');
    setPovSeatId(targetSeatId);
    engine.glideToCamera(pose.position, pose.target);
  };

  const surfaceHudClass =
    resolvedTheme === 'dark'
      ? 'border-slate-700/90 bg-[#0d1426]/92 text-slate-100'
      : 'border-slate-300 bg-white/95 text-slate-900 shadow-md';

  const activeInspectSeat =
    hoveredSeat ??
    (selectedSeatIds.length > 0
      ? seats.find((s) => s.id === selectedSeatIds[selectedSeatIds.length - 1]) ?? null
      : null);

  if (webglError) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center text-sm text-amber-800 dark:text-amber-200">
        {webglError}
      </div>
    );
  }

  return (
    <div
      className={
        isExpanded
          ? 'fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#090E1C] shadow-2xl sm:inset-6'
          : 'relative overflow-hidden rounded-2xl border border-slate-200 bg-[#090E1C] dark:border-slate-800'
      }
      style={isExpanded ? undefined : { height: 'clamp(420px, 56vh, 560px)' }}
    >
      {/* Dedicated Isolated WebGL Canvas Mount */}
      <div ref={canvasMountRef} className="h-full w-full" />

      {/* Minimal Top-Left Spec & Hover Readout Badge (No backdrop-blur over WebGL) */}
      <div
        aria-live="polite"
        className={`pointer-events-auto absolute left-3 top-3 z-10 max-w-[calc(100%-64px)] rounded-xl border px-3 py-2 text-xs ${surfaceHudClass}`}
      >
        {activeInspectSeat ? (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-mono-num font-extrabold">Seat {activeInspectSeat.id}</span>
            <span className="opacity-75">{activeInspectSeat.section}</span>
            <span className="font-mono-num font-bold text-[#6366F1] dark:text-[#22D3EE]">
              ₹{activeInspectSeat.price}
            </span>
            <span className="opacity-80">
              ·{' '}
              {selectedSet.has(activeInspectSeat.id)
                ? 'Selected'
                : activeInspectSeat.status.charAt(0).toUpperCase() +
                  activeInspectSeat.status.slice(1)}
            </span>
            <span className="opacity-75">· View {activeInspectSeat.viewScore}%</span>
            {aiSet.has(activeInspectSeat.id) && (
              <span className="inline-flex items-center gap-1 font-semibold text-violet-500 dark:text-violet-300">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                AI Pick
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold">3D Auditorium</span>
            <span className="opacity-75">
              · Drag to orbit · Scroll to zoom · Click any green chair to select
            </span>
          </div>
        )}
      </div>

      {/* Minimal Top-Right Fullscreen Expand Button */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-label={isExpanded ? 'Exit full 3D view' : 'Expand 3D auditorium view'}
        title={isExpanded ? 'Exit full 3D view (Esc)' : 'Expand 3D view'}
        className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border transition hover:opacity-90 ${surfaceHudClass}`}
      >
        {isExpanded ? (
          <Minimize2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {/* Unified Collapsible Bottom Control Dock (Zero Center Occlusion, No backdrop-blur) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center px-3">
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          aria-expanded={!dockCollapsed}
          aria-label={dockCollapsed ? 'Show 3D camera controls' : 'Hide 3D camera controls'}
          className={`pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${surfaceHudClass}`}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Show 3D Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div
            role="toolbar"
            aria-label="3D Auditorium Camera Controls"
            className={`pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-2 ${surfaceHudClass}`}
          >
            {(
              [
                ['overview', '3D Overview'],
                ['stage', 'From Stage'],
                ['balcony', 'Balcony'],
                ['top', 'Top Plan'],
              ] as const
            ).map(([id, label]) => {
              const isActive = activePreset === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyCameraPreset(id)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#6366F1] text-white'
                      : 'hover:bg-slate-500/15'
                  }`}
                >
                  {id === 'overview' && <Compass className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => applySeatPov()}
              title="Sit inside your selected or hovered seat to inspect the real stage view"
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                activePreset === 'seat-pov'
                  ? 'bg-[#22D3EE] text-slate-950'
                  : 'border border-indigo-500/35 text-indigo-600 hover:bg-indigo-500/10 dark:text-[#22D3EE]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {activePreset === 'seat-pov' && povSeatId
                  ? `Seat ${povSeatId} POV`
                  : selectedSeatIds.length > 0
                    ? `View from ${selectedSeatIds[selectedSeatIds.length - 1]}`
                    : 'Seat POV'}
              </span>
            </button>

            <span
              aria-hidden="true"
              className="mx-0.5 hidden h-5 w-px bg-slate-500/30 sm:inline-block"
            />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => engineRef.current?.nudgeZoom(0.82)}
                aria-label="Zoom in 3D auditorium"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-500/15"
              >
                <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.nudgeZoom(1.22)}
                aria-label="Zoom out 3D auditorium"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-500/15"
              >
                <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => applyCameraPreset('overview')}
                aria-label="Reset 3D camera"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-500/15"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
