import { Telemetry } from './firebase';

export interface RelaxationResult {
    state: 'Deeply Relaxed' | 'Moderately Relaxed' | 'Not Relaxed' | 'Insufficient Data';
    confidence: number;
    reason: string;
    metrics: {
        pulseDrop: number;
        pulseStability: number;
        spo2Change: number;
        relaxationIndex: number;
    };
}

export function analyzeRelaxation(history: Telemetry[], finalRelaxIndex: number): RelaxationResult {
    if (!history || history.length < 30) {
        return {
            state: 'Insufficient Data',
            confidence: 0,
            reason: 'Session too short for analysis',
            metrics: {
                pulseDrop: 0,
                pulseStability: 0,
                spo2Change: 0,
                relaxationIndex: finalRelaxIndex
            }
        };
    }

    // Sort by timestamp just in case
    const sorted = [...history].sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp as any).getTime();
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp as any).getTime();
        return tA - tB;
    });

    const startWindow = sorted.slice(0, Math.min(20, Math.floor(sorted.length / 3)));
    const endWindow = sorted.slice(-Math.min(20, Math.floor(sorted.length / 3)));

    // Calculate Averages
    const getAvgPulse = (arr: Telemetry[]) => {
        const pulses = arr.map(t => t.pulse || 0).filter(p => p > 0);
        if (pulses.length === 0) return 0;
        return pulses.reduce((a, b) => a + b, 0) / pulses.length;
    };

    const getAvgSpO2 = (arr: Telemetry[]) => {
        const vals = arr.map(t => t.spo2 || 0).filter(s => s > 0);
        if (vals.length === 0) return 0;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const getStdDevPulse = (arr: Telemetry[]) => {
        const pulses = arr.map(t => t.pulse || 0).filter(p => p > 0);
        if (pulses.length < 2) return 0;
        const avg = pulses.reduce((a, b) => a + b, 0) / pulses.length;
        const sqDiff = pulses.map(p => Math.pow(p - avg, 2));
        const avgSqDiff = sqDiff.reduce((a, b) => a + b, 0) / sqDiff.length;
        return Math.sqrt(avgSqDiff);
    };

    const prePulse = getAvgPulse(startWindow);
    const postPulse = getAvgPulse(endWindow);
    const pulseDrop = Math.max(0, prePulse - postPulse);
    const pulseStability = getStdDevPulse(endWindow);

    const preSpO2 = getAvgSpO2(startWindow);
    const postSpO2 = getAvgSpO2(endWindow);
    const spo2Change = postSpO2 - preSpO2;

    // Classification Logic
    let state: RelaxationResult['state'] = 'Not Relaxed';
    let reason = '';

    if (finalRelaxIndex >= 70 && pulseDrop >= 5 && pulseStability <= 5) {
        state = 'Deeply Relaxed';
        reason = `Significant pulse reduction (-${pulseDrop.toFixed(1)} bpm) and stability.`;
    } else if (finalRelaxIndex >= 50 && (pulseDrop >= 2 || spo2Change >= 0)) {
        state = 'Moderately Relaxed';
        reason = `Steady vitals with mild relaxation signs.`;
    } else {
        state = 'Not Relaxed';
        reason = `Vitals remained elevated or unstable.`;
    }

    // Confidence Calculation
    // Cap at 1.0 (100%)
    let confidence = (finalRelaxIndex / 100) * 0.4;
    confidence += (pulseDrop / 15) * 0.3; // Up to 0.3 for big drops
    confidence += (pulseStability < 3 ? 0.2 : 0); // Stability bonus
    confidence += (spo2Change > 0 ? 0.1 : 0); // Oxygen bonus

    confidence = Math.min(0.98, Math.max(0.1, confidence));

    return {
        state,
        confidence,
        reason,
        metrics: {
            pulseDrop,
            pulseStability,
            spo2Change,
            relaxationIndex: finalRelaxIndex
        }
    };
}
