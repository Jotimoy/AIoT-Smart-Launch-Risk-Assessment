import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSafetyRisk } from './riskEngine';

test('Safety Risk Engine: returns SAFE when all parameters are nominal', () => {
  const result = calculateSafetyRisk({
    passengerCount: 150,
    maxCapacity: 500,
    totalLoadKg: 12000,
    maxLoadKg: 40000,
    leftLoadKg: 6000,
    rightLoadKg: 6000,
    rollAngle: 1.2,
    pitchAngle: 0.8,
    waterLevelPercent: 5,
    waterLevelRaw: 200,
    dualHX711Connected: true
  });

  assert.equal(result.level, 'SAFE');
  assert.ok(result.score <= 24, `Expected score <= 24 but got ${result.score}`);
  assert.equal(result.primaryHazard, null);
});

test('Safety Risk Engine: triggers WARNING or HIGH RISK on passenger overcrowding', () => {
  const warningResult = calculateSafetyRisk({
    passengerCount: 460, // 92% of 500
    maxCapacity: 500,
    totalLoadKg: 35000,
    maxLoadKg: 40000,
    leftLoadKg: null,
    rightLoadKg: null,
    rollAngle: 2.0,
    pitchAngle: 1.0,
    waterLevelPercent: 8,
    waterLevelRaw: 300,
    dualHX711Connected: false
  });

  assert.ok(warningResult.score >= 12, 'Expected elevated score on near-capacity');

  const highResult = calculateSafetyRisk({
    passengerCount: 560, // 112% of 500
    maxCapacity: 500,
    totalLoadKg: 42000,
    maxLoadKg: 40000,
    leftLoadKg: null,
    rightLoadKg: null,
    rollAngle: 2.0,
    pitchAngle: 1.0,
    waterLevelPercent: 8,
    waterLevelRaw: 300,
    dualHX711Connected: false
  });

  assert.ok(highResult.score >= 50, 'Overcrowding should yield at least HIGH RISK (50+)');
  assert.ok(highResult.factors.some(f => f.factor.includes('Overcrowding')));
});

test('Safety Risk Engine: escalates to CRITICAL on dangerous roll angle (listing launch)', () => {
  const result = calculateSafetyRisk({
    passengerCount: 200,
    maxCapacity: 500,
    totalLoadKg: null,
    maxLoadKg: 40000,
    leftLoadKg: null,
    rightLoadKg: null,
    rollAngle: 15.5, // > critical 14.0 deg
    pitchAngle: 2.1,
    waterLevelPercent: 10,
    waterLevelRaw: 400,
    dualHX711Connected: false
  });

  assert.equal(result.level, 'CRITICAL');
  assert.ok(result.score >= 75);
  assert.ok(result.primaryHazard?.includes('Roll'));
});

test('Safety Risk Engine: escalates to CRITICAL on major bilge water ingress', () => {
  const result = calculateSafetyRisk({
    passengerCount: 180,
    maxCapacity: 500,
    totalLoadKg: null,
    maxLoadKg: 40000,
    leftLoadKg: null,
    rightLoadKg: null,
    rollAngle: 2.0,
    pitchAngle: 1.0,
    waterLevelPercent: 78, // > critical 65%
    waterLevelRaw: 3200,
    dualHX711Connected: false
  });

  assert.equal(result.level, 'CRITICAL');
  assert.ok(result.score >= 85);
  assert.ok(result.primaryHazard?.includes('Water'));
});

test('Safety Risk Engine: evaluates load imbalance when dual HX711 is enabled', () => {
  const result = calculateSafetyRisk({
    passengerCount: 300,
    maxCapacity: 500,
    totalLoadKg: 20000,
    maxLoadKg: 40000,
    leftLoadKg: 15000, // heavily loaded to port side
    rightLoadKg: 5000,  // starboard is light (50% imbalance)
    rollAngle: 4.0,
    pitchAngle: 1.0,
    waterLevelPercent: 5,
    waterLevelRaw: 200,
    dualHX711Connected: true
  });

  assert.ok(result.score >= 50);
  assert.ok(result.factors.some(f => f.factor.includes('Imbalance')));
});
