import assert from 'node:assert/strict';
import test from 'node:test';
import type { Seat } from '../../../types';
import { computePriceTierThresholds } from '../../../utils/seatLogic';
import {
  computeRowTierMetrics,
  computeSeatPovCamera,
  computeSeatTransform3D,
  getStaticCameraPresets,
  resolveSeatColorState,
  STAGE_SCREEN_TARGET,
} from './auditoriumLayout';

function makeSeat(overrides: Partial<Seat>): Seat {
  return {
    id: 'D6',
    row: 'D',
    number: 6,
    section: 'Mezzanine Center',
    price: 370,
    status: 'available',
    isAisle: true,
    nearExit: false,
    stageDistance: 4,
    viewScore: 94,
    ...overrides,
  };
}

test('computeRowTierMetrics steps risers upward from Orchestra -> Mezzanine -> Balcony', () => {
  const rowA = computeRowTierMetrics(0);
  const rowC = computeRowTierMetrics(2);
  const rowD = computeRowTierMetrics(3);
  const rowG = computeRowTierMetrics(6);
  const rowI = computeRowTierMetrics(8);

  assert.equal(rowA.section, 'Orchestra Front');
  assert.equal(rowD.section, 'Mezzanine Center');
  assert.equal(rowG.section, 'Balcony');

  assert.ok(rowC.floorY > rowA.floorY, 'Orchestra rises monotonically');
  assert.ok(rowD.floorY > rowC.floorY + 0.4, 'Mezzanine has architectural elevation step');
  assert.ok(rowG.floorY > rowD.floorY + 1.0, 'Balcony sits higher than Mezzanine');
  assert.ok(rowI.floorY > rowG.floorY, 'Balcony tiers climb toward back');
  assert.equal(rowD.isSectionStart, true);
  assert.equal(rowG.isSectionStart, true);
});

test('computeSeatTransform3D separates left/right banks across center aisle and curves toward stage', () => {
  const leftAisle = computeSeatTransform3D(makeSeat({ id: 'D6', row: 'D', number: 6 }));
  const rightAisle = computeSeatTransform3D(makeSeat({ id: 'D7', row: 'D', number: 7 }));
  const farOuter = computeSeatTransform3D(makeSeat({ id: 'D1', row: 'D', number: 1 }));

  assert.ok(leftAisle.x < 0 && rightAisle.x > 0, 'Seats 6 and 7 flank center aisle');
  assert.ok(rightAisle.x - leftAisle.x > 2.2, 'Center aisle gap is wider than normal seat spacing');
  assert.ok(farOuter.z < leftAisle.z, 'Outer wing seats curve gently forward toward stage');
});

test('computeSeatPovCamera positions eye level above seat deck looking at stage screen', () => {
  const tr = computeSeatTransform3D(makeSeat({ id: 'E7', row: 'E', number: 7 }));
  const pov = computeSeatPovCamera(tr);

  assert.ok(pov.position.y > tr.y + 1.2, 'Eye height is above floor deck');
  assert.equal(pov.target.z, STAGE_SCREEN_TARGET.z);
  assert.equal(pov.label, 'Seat E7 POV');
});

test('resolveSeatColorState maps selected, AI, conflict, and SeatHeat heatmap tiers accurately', () => {
  const seats = [
    makeSeat({ id: 'A1', price: 650 }),
    makeSeat({ id: 'D5', price: 370 }),
    makeSeat({ id: 'H5', price: 220 }),
  ];
  const thresholds = computePriceTierThresholds(seats);

  const selected = resolveSeatColorState(seats[1], {
    isSelected: true,
    isAi: false,
    isConflict: false,
    isHovered: false,
    viewMode: 'availability',
    thresholds,
    hasAiRecommendations: false,
  });
  assert.equal(selected.cushionHex, 0x6366f1);
  assert.equal(selected.elevated, true);

  const aiPick = resolveSeatColorState(seats[1], {
    isSelected: false,
    isAi: true,
    isConflict: false,
    isHovered: false,
    viewMode: 'ai',
    thresholds,
    hasAiRecommendations: true,
  });
  assert.equal(aiPick.cushionHex, 0x8b5cf6);
  assert.equal(aiPick.elevated, true);

  const budgetHeat = resolveSeatColorState(seats[2], {
    isSelected: false,
    isAi: false,
    isConflict: false,
    isHovered: false,
    viewMode: 'heatmap',
    thresholds,
    hasAiRecommendations: false,
  });
  assert.equal(budgetHeat.cushionHex, 0x0891b2);

  const presets = getStaticCameraPresets();
  assert.ok(presets.overview.position.z > 0 && presets.stage.position.z < 0);
});
