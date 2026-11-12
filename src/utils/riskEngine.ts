import { RiskLevel, VesselConfig } from '../types/iot';

export interface RiskInput {
  passengerCount: number;
  maxCapacity: number;
  totalLoadKg: number | null;
  maxLoadKg: number;
  leftLoadKg: number | null;
  rightLoadKg: number | null;
  rollAngle: number;
  pitchAngle: number;
  waterLevelPercent: number | null;
  waterLevelRaw: number;
  dualHX711Connected: boolean;
}

export interface RiskFactorDetail {
  factor: string;
  scoreContribution: number;
  severity: RiskLevel;
  detail: string;
}

export interface RiskAssessmentResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactorDetail[];
  recommendedActions: string[];
  primaryHazard: string | null;
}

/**
 * Calculates a transparent, explainable maritime safety risk score (0-100)
 * designed for Bangladesh passenger river launches.
 * 
 * Score Ranges:
 * 0 - 24:   SAFE (Normal operational limits)
 * 25 - 49:  WARNING (Elevated vigilance, boarding restriction)
 * 50 - 74:  HIGH RISK (Immediate passenger redistribution, bilge pumping)
 * 75 - 100: CRITICAL (Imminent capsize/sinking risk, muster lifebuoys, abort voyage)
 */
export function calculateSafetyRisk(
  input: RiskInput,
  config: Partial<VesselConfig> = {}
): RiskAssessmentResult {
  const maxCapacity = config.maxPassengerCapacity || input.maxCapacity || 500;
  const maxLoad = config.maxLoadKg || input.maxLoadKg || 40000;
  const warningRoll = config.warningRollAngle ?? 7.0;
  const criticalRoll = config.criticalRollAngle ?? 14.0;
  const warningPitch = config.warningPitchAngle ?? 5.0;
  const criticalPitch = config.criticalPitchAngle ?? 10.0;
  const warningWater = config.warningWaterLevelPercent ?? 30.0;
  const criticalWater = config.criticalWaterLevelPercent ?? 65.0;
  const maxImbalance = config.maxLoadImbalancePercent ?? 18.0;

  const factors: RiskFactorDetail[] = [];
  const recommendedActions: string[] = [];

  let passengerScore = 0;
  let loadScore = 0;
  let imbalanceScore = 0;
  let tiltScore = 0;
  let waterScore = 0;

  // 1. Passenger Overcrowding Analysis
  const capacityRatio = input.passengerCount / Math.max(1, maxCapacity);
  const capacityPercent = Math.round(capacityRatio * 100);

  if (capacityRatio > 1.25) {
    passengerScore = 35;
    factors.push({
      factor: 'Severe Overcrowding',
      scoreContribution: 35,
      severity: 'CRITICAL',
      detail: `Passenger count (${input.passengerCount}) exceeds licensed limit (${maxCapacity}) by ${capacityPercent - 100}%. Severe threat to buoyancy and stability.`
    });
    recommendedActions.push('Immediately stop boarding at entry gates; disembark excess passengers before departure.');
  } else if (capacityRatio > 1.05) {
    passengerScore = 25;
    factors.push({
      factor: 'Overcrowding Detected',
      scoreContribution: 25,
      severity: 'HIGH RISK',
      detail: `Passenger count (${input.passengerCount}) is at ${capacityPercent}% of licensed capacity (${maxCapacity}).`
    });
    recommendedActions.push('Close entry gates and sound local passenger boarding warning.');
  } else if (capacityRatio >= 0.90) {
    passengerScore = 12;
    factors.push({
      factor: 'Near Maximum Capacity',
      scoreContribution: 12,
      severity: 'WARNING',
      detail: `Passenger capacity is at ${capacityPercent}% (${input.passengerCount}/${maxCapacity}).`
    });
    recommendedActions.push('Prepare gate personnel to halt entry queue.');
  } else {
    factors.push({
      factor: 'Passenger Capacity',
      scoreContribution: 0,
      severity: 'SAFE',
      detail: `Normal loading: ${input.passengerCount} passengers (${capacityPercent}% of ${maxCapacity}).`
    });
  }

  // 2. Total Load Analysis (if load cells connected)
  if (input.totalLoadKg !== null) {
    const loadRatio = input.totalLoadKg / Math.max(1, maxLoad);
    const loadPercent = Math.round(loadRatio * 100);

    if (loadRatio > 1.20) {
      loadScore = 25;
      factors.push({
        factor: 'Gross Overload',
        scoreContribution: 25,
        severity: 'CRITICAL',
        detail: `Vessel displacement weight (${input.totalLoadKg.toLocaleString()} kg) is ${loadPercent}% of maximum rated load (${maxLoad.toLocaleString()} kg). Freeboard dangerously compromised.`
      });
      recommendedActions.push('Unload cargo immediately; verify draught marks before leaving dock.');
    } else if (loadRatio > 1.02) {
      loadScore = 15;
      factors.push({
        factor: 'Rated Load Exceeded',
        scoreContribution: 15,
        severity: 'HIGH RISK',
        detail: `Total load (${input.totalLoadKg.toLocaleString()} kg) exceeds maximum permissible load by ${loadPercent - 100}%.`
      });
      recommendedActions.push('Restrict additional freight loading.');
    } else if (loadRatio >= 0.88) {
      loadScore = 6;
      factors.push({
        factor: 'High Deck Load',
        scoreContribution: 6,
        severity: 'WARNING',
        detail: `Deck load is currently at ${loadPercent}% of maximum limit.`
      });
    }
  }

  // 3. Load Imbalance Analysis (Requires dual independent measurement)
  if (input.dualHX711Connected && input.leftLoadKg !== null && input.rightLoadKg !== null) {
    const totalLR = input.leftLoadKg + input.rightLoadKg;
    if (totalLR > 50) {
      const diff = Math.abs(input.leftLoadKg - input.rightLoadKg);
      const imbalanceRatio = (diff / totalLR) * 100;

      if (imbalanceRatio > maxImbalance * 1.5) {
        imbalanceScore = 25;
        factors.push({
          factor: 'Severe Port/Starboard Imbalance',
          scoreContribution: 25,
          severity: 'CRITICAL',
          detail: `Load imbalance is ${imbalanceRatio.toFixed(1)}% (Port: ${input.leftLoadKg.toFixed(0)} kg vs Starboard: ${input.rightLoadKg.toFixed(0)} kg). Extreme list risk during river turn.`
        });
        recommendedActions.push('Instruct crew to re-distribute passengers evenly across port and starboard decks.');
      } else if (imbalanceRatio > maxImbalance) {
        imbalanceScore = 14;
        factors.push({
          factor: 'Uneven Load Distribution',
          scoreContribution: 14,
          severity: 'WARNING',
          detail: `Port/Starboard imbalance is ${imbalanceRatio.toFixed(1)}% (Threshold: ${maxImbalance}%).`
        });
        recommendedActions.push('Direct boarding passengers to lighter side of vessel.');
      }
    }
  }

  // 4. Vessel Roll & Pitch Stability (MPU6050)
  const absRoll = Math.abs(input.rollAngle);
  const absPitch = Math.abs(input.pitchAngle);

  if (absRoll >= criticalRoll) {
    tiltScore = 40;
    factors.push({
      factor: 'Critical Roll / Severe List',
      scoreContribution: 40,
      severity: 'CRITICAL',
      detail: `Roll angle is ${absRoll.toFixed(1)}° (Critical threshold: ${criticalRoll}°). Vessel is listing dangerously; imminent risk of capsizing.`
    });
    recommendedActions.push('EMERGENCY: Reduce engine speed, steer into calm water, muster passengers away from listing side.');
  } else if (absRoll >= warningRoll) {
    tiltScore = 22;
    factors.push({
      factor: 'Elevated Roll Angle',
      scoreContribution: 22,
      severity: 'WARNING',
      detail: `Roll angle is ${absRoll.toFixed(1)}° (Warning threshold: ${warningRoll}°). Excessive movement in river swell.`
    });
    recommendedActions.push('Verify passenger distribution; adjust helm to stabilize roll dynamics.');
  }

  if (absPitch >= criticalPitch) {
    const pitchAddition = 20;
    tiltScore = Math.max(tiltScore, tiltScore + pitchAddition);
    factors.push({
      factor: 'Critical Pitch Angle',
      scoreContribution: pitchAddition,
      severity: 'CRITICAL',
      detail: `Pitch angle is ${absPitch.toFixed(1)}° (Critical threshold: ${criticalPitch}°). Danger of bow dipping or stern swamping.`
    });
    recommendedActions.push('Check forward/aft trim and inspect cargo placement.');
  } else if (absPitch >= warningPitch) {
    tiltScore = Math.max(tiltScore, tiltScore + 10);
    factors.push({
      factor: 'Elevated Pitch Angle',
      scoreContribution: 10,
      severity: 'WARNING',
      detail: `Pitch angle is ${absPitch.toFixed(1)}° (Warning threshold: ${warningPitch}°).`
    });
  }

  // 5. Water Level Ingress (Bilge/Hull sensor)
  const waterPct = input.waterLevelPercent;
  if (waterPct !== null) {
    if (waterPct >= criticalWater) {
      waterScore = 45;
      factors.push({
        factor: 'Critical Water Ingress',
        scoreContribution: 45,
        severity: 'CRITICAL',
        detail: `Bilge water level is at ${waterPct.toFixed(0)}% (Critical threshold: ${criticalWater}%). Rapid water accumulation in hull.`
      });
      recommendedActions.push('CRITICAL EMERGENCY: Start primary and auxiliary bilge pumps; inspect hull compartments for breach; notify nearest river station / BIWTA.');
    } else if (waterPct >= warningWater) {
      waterScore = 25;
      factors.push({
        factor: 'Abnormal Water Ingress Detected',
        scoreContribution: 25,
        severity: 'HIGH RISK',
        detail: `Bilge water level is at ${waterPct.toFixed(0)}% (Warning threshold: ${warningWater}%). Hull moisture elevated.`
      });
      recommendedActions.push('Activate bilge pump and inspect engine room / hull floor.');
    }
  }

  // Aggregate raw score
  let totalScore = passengerScore + loadScore + imbalanceScore + tiltScore + waterScore;

  // Rule-based safety clamps:
  // If water ingress is critical OR roll is critical, the status MUST be at least CRITICAL (>= 75)
  if (waterScore >= 45 || absRoll >= criticalRoll) {
    totalScore = Math.max(totalScore, 85);
  } else if (passengerScore >= 35 || imbalanceScore >= 25) {
    totalScore = Math.max(totalScore, 75);
  } else if (waterScore >= 25 || absRoll >= warningRoll || passengerScore >= 25) {
    totalScore = Math.max(totalScore, 50);
  }

  // Clamp strictly between 0 and 100
  totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  // Categorize
  let level: RiskLevel = 'SAFE';
  if (totalScore >= 75) {
    level = 'CRITICAL';
  } else if (totalScore >= 50) {
    level = 'HIGH RISK';
  } else if (totalScore >= 25) {
    level = 'WARNING';
  } else {
    level = 'SAFE';
  }

  if (recommendedActions.length === 0) {
    recommendedActions.push('All parameters within standard maritime river safety limits. Maintain normal navigation watch.');
  }

  // Identify primary hazard
  let primaryHazard: string | null = null;
  const criticalOrHigh = factors.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH RISK');
  if (criticalOrHigh.length > 0) {
    criticalOrHigh.sort((a, b) => b.scoreContribution - a.scoreContribution);
    primaryHazard = criticalOrHigh[0].factor;
  }

  return {
    score: totalScore,
    level,
    factors,
    recommendedActions,
    primaryHazard
  };
}
