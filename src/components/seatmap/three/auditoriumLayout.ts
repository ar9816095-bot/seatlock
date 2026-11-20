import type { Seat, SeatSection, SeatViewMode } from '../../../types';
import { getSeatHeatTier, type PriceTierThresholds } from '../../../utils/seatLogic';

export const ROWS_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;

export type CameraPresetId = 'overview' | 'stage' | 'balcony' | 'top' | 'seat-pov';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface SeatTransform3D {
  seatId: string;
  row: string;
  rowIndex: number;
  number: number;
  section: SeatSection;
  x: number;
  y: number; // Floor deck top Y where seat pedestal sits flush
  z: number;
  rotationY: number; // Inward angle facing the stage at (0, stageY, STAGE_Z)
}

export interface RowTierMetrics {
  row: string;
  rowIndex: number;
  section: SeatSection;
  floorY: number;
  baseZ: number;
  depth: number;
  width: number;
  isSectionStart: boolean;
}

export interface CameraPresetPose {
  position: Vec3Tuple;
  target: Vec3Tuple;
  label: string;
}

// Spatial architectural constants (meters, right-handed Y-up; stage is toward -Z)
export const STAGE_Z = -8.6;
export const STAGE_SURFACE_Y = 1.05;
export const STAGE_SCREEN_TARGET: Vec3Tuple = { x: 0, y: 3.1, z: -10.8 };

const ROW_START_Z = -3.4;
const ROW_SPACING_Z = 1.48;
const SECTION_GAP_Z = 0.95;
const SEAT_SPACING_X = 1.04;
const CENTER_AISLE_HALF_GAP = 0.92;
const ARC_CURVE_FACTOR = 0.022;

/**
 * Compute architectural riser elevation and Z depth for each row A..I.
 * Rows A-C = Orchestra Front, D-F = Mezzanine Center, G-I = Balcony.
 */
export function computeRowTierMetrics(rowIndex: number): RowTierMetrics {
  const clampedIdx = Math.max(0, Math.min(ROWS_ORDER.length - 1, rowIndex));
  const row = ROWS_ORDER[clampedIdx];

  let section: SeatSection = 'Orchestra Front';
  let floorY = 0;
  let extraZ = 0;
  let isSectionStart = clampedIdx === 0;

  if (clampedIdx <= 2) {
    section = 'Orchestra Front';
    floorY = clampedIdx * 0.24;
    extraZ = 0;
  } else if (clampedIdx <= 5) {
    section = 'Mezzanine Center';
    const localIdx = clampedIdx - 3;
    floorY = 0.72 + 0.52 + localIdx * 0.34;
    extraZ = SECTION_GAP_Z;
    isSectionStart = localIdx === 0;
  } else {
    section = 'Balcony';
    const localIdx = clampedIdx - 6;
    floorY = 1.92 + 0.72 + localIdx * 0.42;
    extraZ = SECTION_GAP_Z * 2.15;
    isSectionStart = localIdx === 0;
  }

  const baseZ = ROW_START_Z + clampedIdx * ROW_SPACING_Z + extraZ;
  const width = 14.6 + clampedIdx * 0.24;

  return {
    row,
    rowIndex: clampedIdx,
    section,
    floorY: Number(floorY.toFixed(3)),
    baseZ: Number(baseZ.toFixed(3)),
    depth: ROW_SPACING_Z,
    width: Number(width.toFixed(3)),
    isSectionStart,
  };
}

/**
 * Compute 3D seat placement in a gently curved amphitheatre bowl facing the stage.
 * Left bank: seat numbers 1..6 (negative X), Right bank: seat numbers 7..12 (positive X).
 */
export function computeSeatTransform3D(seat: Seat): SeatTransform3D {
  const rowIndex = Math.max(0, ROWS_ORDER.indexOf(seat.row as (typeof ROWS_ORDER)[number]));
  const tier = computeRowTierMetrics(rowIndex);

  const isRightBank = seat.number >= 7;
  const bankOffset = isRightBank ? seat.number - 6.5 : seat.number - 6.5;
  const aisleShift = isRightBank ? CENTER_AISLE_HALF_GAP : -CENTER_AISLE_HALF_GAP;
  const x = bankOffset * SEAT_SPACING_X + aisleShift;

  // Gently curve outer seats forward toward the stage for natural auditorium sightlines
  const curvePull = Math.min(1.15, x * x * ARC_CURVE_FACTOR);
  const z = tier.baseZ - curvePull;

  // Angle each chair inward toward center stage (-Z)
  const dx = 0 - x;
  const dz = STAGE_Z - z;
  const rotationY = Math.atan2(dx, dz) + Math.PI;

  return {
    seatId: seat.id,
    row: seat.row,
    rowIndex,
    number: seat.number,
    section: seat.section,
    x: Number(x.toFixed(3)),
    y: tier.floorY,
    z: Number(z.toFixed(3)),
    rotationY: Number(rotationY.toFixed(4)),
  };
}

export function getStaticCameraPresets(): Record<Exclude<CameraPresetId, 'seat-pov'>, CameraPresetPose> {
  return {
    overview: {
      position: { x: 0, y: 14.2, z: 23.2 },
      target: { x: 0, y: 1.4, z: 0.4 },
      label: '3D Overview',
    },
    stage: {
      position: { x: 0, y: 4.4, z: -7.2 },
      target: { x: 0, y: 2.3, z: 6.2 },
      label: 'From Stage',
    },
    balcony: {
      position: { x: 0, y: 8.6, z: 14.4 },
      target: { x: 0, y: 2.2, z: -7.5 },
      label: 'Balcony View',
    },
    top: {
      position: { x: 0, y: 24.5, z: 3.4 },
      target: { x: 0, y: 0.8, z: 1.8 },
      label: 'Top Plan',
    },
  };
}

/**
 * Compute an authentic eye-level "View From Seat" camera pose looking directly at the stage.
 */
export function computeSeatPovCamera(transform: SeatTransform3D): CameraPresetPose {
  return {
    position: {
      x: transform.x,
      y: Number((transform.y + 1.38).toFixed(3)),
      z: Number((transform.z - 0.14).toFixed(3)),
    },
    target: {
      x: transform.x * 0.12,
      y: STAGE_SCREEN_TARGET.y,
      z: STAGE_SCREEN_TARGET.z,
    },
    label: `Seat ${transform.seatId} POV`,
  };
}

export interface SeatColorState {
  cushionHex: number;
  rimHex: number;
  elevated: boolean;
  dimmed: boolean;
}

export function resolveSeatColorState(
  seat: Seat,
  opts: {
    isSelected: boolean;
    isAi: boolean;
    isConflict: boolean;
    isHovered: boolean;
    viewMode: SeatViewMode;
    thresholds: PriceTierThresholds;
    hasAiRecommendations: boolean;
  }
): SeatColorState {
  const { isSelected, isAi, isConflict, isHovered, viewMode, thresholds, hasAiRecommendations } =
    opts;

  if (isConflict) {
    return {
      cushionHex: 0xef4444,
      rimHex: 0xfca5a5,
      elevated: true,
      dimmed: false,
    };
  }

  if (isSelected) {
    return {
      cushionHex: isHovered ? 0x818cf8 : 0x6366f1,
      rimHex: 0x22d3ee,
      elevated: true,
      dimmed: false,
    };
  }

  if (seat.status === 'booked') {
    return {
      cushionHex: 0x991b1b,
      rimHex: 0xef4444,
      elevated: false,
      dimmed: true,
    };
  }

  if (seat.status === 'held') {
    return {
      cushionHex: 0xb45309,
      rimHex: 0xf59e0b,
      elevated: false,
      dimmed: true,
    };
  }

  if (seat.status === 'blocked') {
    return {
      cushionHex: 0x334155,
      rimHex: 0x475569,
      elevated: false,
      dimmed: true,
    };
  }

  // Available seats
  const aiDim = viewMode === 'ai' && hasAiRecommendations && !isAi;

  if (viewMode === 'heatmap') {
    const tier = getSeatHeatTier(seat.price, thresholds);
    if (tier === 'budget') {
      return {
        cushionHex: isHovered ? 0x22d3ee : 0x0891b2,
        rimHex: isAi ? 0xa78bfa : 0x67e8f9,
        elevated: isHovered || isAi,
        dimmed: false,
      };
    }
    if (tier === 'mid') {
      return {
        cushionHex: isHovered ? 0x818cf8 : 0x4f46e5,
        rimHex: isAi ? 0xc4b5fd : 0xa5b4fc,
        elevated: isHovered || isAi,
        dimmed: false,
      };
    }
    return {
      cushionHex: isHovered ? 0xc084fc : 0x7c3aed,
      rimHex: isAi ? 0x22d3ee : 0xddd6fe,
      elevated: isHovered || isAi,
      dimmed: false,
    };
  }

  if (isAi) {
    return {
      cushionHex: isHovered ? 0xa78bfa : 0x8b5cf6,
      rimHex: 0x22d3ee,
      elevated: true,
      dimmed: false,
    };
  }

  return {
    cushionHex: isHovered ? 0x34d399 : aiDim ? 0x164e3e : 0x10b981,
    rimHex: isHovered ? 0x22d3ee : aiDim ? 0x1f2937 : 0x6ee7b7,
    elevated: isHovered,
    dimmed: aiDim,
  };
}
