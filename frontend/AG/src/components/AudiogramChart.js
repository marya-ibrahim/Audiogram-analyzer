// ===================================================
// AUDIOGRAM CHART — SVG rendering of hearing thresholds
// Accepts either:
//   A) Raw threshold maps: leftThresholds, rightThresholds,
//      leftBoneThresholds, rightBoneThresholds  (freq → dB)
//   B) API audiogram response: apiData (from /audiogram/ or /audiogram/combined/)
//      The component auto-converts API format to internal format.
//
// Symbols (standard audiometry):
//   Air Right  → O (circle, red)
//   Air Left   → × (cross, blue)
//   Bone Right → ] (bracket, red dashed)
//   Bone Left  → [ (bracket, blue dashed)
// ===================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Path, Circle, Text as SvgText, Rect, G } from 'react-native-svg';
import { COLORS, FREQUENCIES, FREQ_LABELS, DB_LEVELS } from '../constants/theme';

const CHART_PADDING = { top: 30, right: 24, bottom: 40, left: 48 };

const ZONES = [
  { label: 'Normal',      range: [-10, 25],  color: '#00D68F' },
  { label: 'Mild',        range: [25, 40],   color: '#FFD600' },
  { label: 'Moderate',    range: [40, 55],   color: '#FFB347' },
  { label: 'Mod. Severe', range: [55, 70],   color: '#FF8C42' },
  { label: 'Severe',      range: [70, 90],   color: '#FF6B6B' },
  { label: 'Profound',    range: [90, 120],  color: '#CC3333' },
];

// Convert API points array → frequency map { 500: 40, 1000: 45, ... }
const pointsToMap = (points = []) => {
  const map = {};
  if (!Array.isArray(points)) return map;
  for (const p of points) {
    if (p.frequency != null && p.threshold_db != null) {
      map[p.frequency] = p.threshold_db;
    }
  }
  return map;
};

// Parse either raw map or API audiogram data for one side
const parseApiData = (apiData) => {
  if (!apiData) return { left: {}, right: {}, leftBone: {}, rightBone: {} };

  // combined endpoint: { air: { ear, points }, bone: { ear, points } }
  if (apiData.air || apiData.bone) {
    const airEar  = apiData.air?.ear;   // 'R' or 'L'
    const boneEar = apiData.bone?.ear;
    const airMap  = pointsToMap(apiData.air?.points);
    const boneMap = pointsToMap(apiData.bone?.points);

    return {
      left:     airEar  === 'L' ? airMap  : {},
      right:    airEar  === 'R' ? airMap  : {},
      leftBone: boneEar === 'L' ? boneMap : {},
      rightBone:boneEar === 'R' ? boneMap : {},
    };
  }

  // single endpoint: { ear, points }
  if (apiData.ear && apiData.points) {
    const map = pointsToMap(apiData.points);
    return {
      left:      apiData.ear === 'L' ? map : {},
      right:     apiData.ear === 'R' ? map : {},
      leftBone:  {},
      rightBone: {},
    };
  }

  return { left: {}, right: {}, leftBone: {}, rightBone: {} };
};

export default function AudiogramChart({
  leftThresholds      = null,
  rightThresholds     = null,
  leftBoneThresholds  = null,
  rightBoneThresholds = null,
  apiData             = null,
  width               = 340,
}) {
  // Use fixed internal dimensions for consistent rendering
  const W      = 340;
  const height = 270;
  const plotW  = W      - CHART_PADDING.left - CHART_PADDING.right;
  const plotH  = height - CHART_PADDING.top  - CHART_PADDING.bottom;

  const DB_MIN = -10;
  const DB_MAX = 120;

  const xPos = (i) => CHART_PADDING.left + (i / (FREQUENCIES.length - 1)) * plotW;
  const yPos = (db) => CHART_PADDING.top + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * plotH;

  // Resolve data source
  let left, right, leftBone, rightBone;
  if (apiData) {
    const parsed = parseApiData(apiData);
    left      = parsed.left;
    right     = parsed.right;
    leftBone  = parsed.leftBone;
    rightBone = parsed.rightBone;
  } else {
    left      = leftThresholds      ?? {};
    right     = rightThresholds     ?? {};
    leftBone  = leftBoneThresholds  ?? {};
    rightBone = rightBoneThresholds ?? {};
  }

  const hasLeft      = Object.keys(left).length > 0;
  const hasRight     = Object.keys(right).length > 0;
  const hasLeftBone  = Object.keys(leftBone).length > 0;
  const hasRightBone = Object.keys(rightBone).length > 0;

  const buildPath = (thresholds) => {
    const points = FREQUENCIES
      .map((f, i) => thresholds[f] != null ? `${xPos(i)},${yPos(thresholds[f])}` : null)
      .filter(Boolean);
    if (points.length < 2) return null;
    return 'M' + points.join(' L');
  };

  return (
    <View style={styles.wrapper}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`}>

        {/* Zone bands */}
        {ZONES.map((zone, i) => {
          const y1 = yPos(Math.max(zone.range[0], DB_MIN));
          const y2 = yPos(Math.min(zone.range[1], DB_MAX));
          return (
            <G key={i}>
              <Rect
                x={CHART_PADDING.left} y={Math.min(y1, y2)}
                width={plotW} height={Math.abs(y2 - y1)}
                fill={zone.color + '12'}
              />
            </G>
          );
        })}

        {/* Horizontal grid lines (dB) */}
        {DB_LEVELS.map((db) =>
          db % 20 === 0 ? (
            <G key={db}>
              <Line
                x1={CHART_PADDING.left} y1={yPos(db)}
                x2={CHART_PADDING.left + plotW} y2={yPos(db)}
                stroke={COLORS.border} strokeWidth={1}
              />
              <SvgText
                x={CHART_PADDING.left - 6} y={yPos(db) + 4}
                fill={COLORS.textDim} fontSize={10} textAnchor="end"
              >
                {db}
              </SvgText>
            </G>
          ) : null
        )}

        {/* Vertical grid lines (frequency) */}
        {FREQUENCIES.map((f, i) => (
          <G key={f}>
            <Line
              x1={xPos(i)} y1={CHART_PADDING.top}
              x2={xPos(i)} y2={CHART_PADDING.top + plotH}
              stroke={COLORS.border} strokeWidth={1}
            />
            <SvgText
              x={xPos(i)} y={height - 8}
              fill={COLORS.textDim} fontSize={10} textAnchor="middle"
            >
              {FREQ_LABELS[i]}
            </SvgText>
          </G>
        ))}

        {/* Normal hearing boundary (25 dB) */}
        <Line
          x1={CHART_PADDING.left} y1={yPos(25)}
          x2={CHART_PADDING.left + plotW} y2={yPos(25)}
          stroke={COLORS.success} strokeWidth={1.5} strokeDasharray="6,4"
        />
        <SvgText
          x={CHART_PADDING.left + plotW - 4} y={yPos(25) - 5}
          fill={COLORS.success} fontSize={9} textAnchor="end"
        >
          Normal limit
        </SvgText>

        {/* ── LEFT EAR AIR — × markers, blue solid line ─── */}
        {hasLeft && (
          <>
            {buildPath(left) && (
              <Path d={buildPath(left)} stroke={COLORS.leftEar} strokeWidth={2.5} fill="none" />
            )}
            {FREQUENCIES.map((f, i) =>
              left[f] != null ? (
                <SvgText
                  key={f}
                  x={xPos(i)} y={yPos(left[f]) + 5}
                  fill={COLORS.leftEar} fontSize={15} fontWeight="bold" textAnchor="middle"
                >
                  ×
                </SvgText>
              ) : null
            )}
          </>
        )}

        {/* ── RIGHT EAR AIR — O markers, red solid line ─── */}
        {hasRight && (
          <>
            {buildPath(right) && (
              <Path d={buildPath(right)} stroke={COLORS.rightEar} strokeWidth={2.5} fill="none" />
            )}
            {FREQUENCIES.map((f, i) =>
              right[f] != null ? (
                <Circle
                  key={f}
                  cx={xPos(i)} cy={yPos(right[f])}
                  r={5} fill="none"
                  stroke={COLORS.rightEar} strokeWidth={2.5}
                />
              ) : null
            )}
          </>
        )}

        {/* ── LEFT EAR BONE — [ markers, blue dashed line ── */}
        {hasLeftBone && (
          <>
            {buildPath(leftBone) && (
              <Path
                d={buildPath(leftBone)}
                stroke={COLORS.leftEar} strokeWidth={2}
                fill="none" strokeDasharray="6,3"
              />
            )}
            {FREQUENCIES.map((f, i) =>
              leftBone[f] != null ? (
                <SvgText
                  key={f}
                  x={xPos(i)} y={yPos(leftBone[f]) + 5}
                  fill={COLORS.leftEar} fontSize={16} fontWeight="bold" textAnchor="middle"
                >
                  [
                </SvgText>
              ) : null
            )}
          </>
        )}

        {/* ── RIGHT EAR BONE — ] markers, red dashed line ── */}
        {hasRightBone && (
          <>
            {buildPath(rightBone) && (
              <Path
                d={buildPath(rightBone)}
                stroke={COLORS.rightEar} strokeWidth={2}
                fill="none" strokeDasharray="6,3"
              />
            )}
            {FREQUENCIES.map((f, i) =>
              rightBone[f] != null ? (
                <SvgText
                  key={f}
                  x={xPos(i)} y={yPos(rightBone[f]) + 5}
                  fill={COLORS.rightEar} fontSize={16} fontWeight="bold" textAnchor="middle"
                >
                  ]
                </SvgText>
              ) : null
            )}
          </>
        )}

        {/* Axes */}
        <Line
          x1={CHART_PADDING.left} y1={CHART_PADDING.top}
          x2={CHART_PADDING.left} y2={CHART_PADDING.top + plotH}
          stroke={COLORS.textDim} strokeWidth={1.5}
        />
        <Line
          x1={CHART_PADDING.left} y1={CHART_PADDING.top + plotH}
          x2={CHART_PADDING.left + plotW} y2={CHART_PADDING.top + plotH}
          stroke={COLORS.textDim} strokeWidth={1.5}
        />
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        {hasLeft && (
          <View style={styles.legendItem}>
            <Text style={[styles.legendSym, { color: COLORS.leftEar }]}>×</Text>
            <Text style={styles.legendLabel}>Left Air</Text>
          </View>
        )}
        {hasRight && (
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { borderColor: COLORS.rightEar }]} />
            <Text style={styles.legendLabel}>Right Air</Text>
          </View>
        )}
        {hasLeftBone && (
          <View style={styles.legendItem}>
            <Text style={[styles.legendSym, { color: COLORS.leftEar, fontSize: 16 }]}>[</Text>
            <Text style={styles.legendLabel}>Left Bone</Text>
          </View>
        )}
        {hasRightBone && (
          <View style={styles.legendItem}>
            <Text style={[styles.legendSym, { color: COLORS.rightEar, fontSize: 16 }]}>]</Text>
            <Text style={styles.legendLabel}>Right Bone</Text>
          </View>
        )}
      </View>

      <Text style={styles.xAxisLabel}>Frequency (Hz)</Text>
      <Text style={styles.yAxisLabel}>dB HL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'hidden', width: '100%' },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSym: { fontSize: 16, fontWeight: '800', lineHeight: 20 },
  legendCircle: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
  legendLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  xAxisLabel: { textAlign: 'center', fontSize: 11, color: COLORS.textDim, marginTop: 4 },
  yAxisLabel: {
    position: 'absolute', left: -20, top: '50%',
    fontSize: 10, color: COLORS.textDim, transform: [{ rotate: '-90deg' }],
  },
});
