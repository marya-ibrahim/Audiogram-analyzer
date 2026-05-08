// ===================================================
// TEST SCREEN — Hughson-Westlake Pure Tone Audiometry
// Local algorithm + backend save & diagnosis
// ===================================================
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, Dimensions, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, getHearingLevel } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import AppNavBar from '../components/AppNavBar';
import { useToast } from '../components/Toast';
import { useLang } from '../context/LanguageContext';
import { Platform } from 'react-native';
import { Svg, Polyline, Circle, Text as SvgText, Line, Rect, Path, Polygon } from 'react-native-svg';
import TestService from '../api/testService';
import { saveTestResult } from '../utils/database';

const { width } = Dimensions.get('window');

// -- Hughson-Westlake Algorithm ────────────────────────────
// Start: 60 dB
// Heard  → descend 10 dB, keep going
// Not heard → ascend 5 dB, give ONE chance:
//   - Heard at new level  → threshold = new level
//   - Not heard at new level → threshold = last heard level
class HughsonWestlake {
  constructor(startDB = 60) {
    this.currentDB  = startDB;
    this.lastHeard  = null;   // last level heard by the patient
    this.ascending  = false;  // true once we start ascending after first heard
    this.threshold  = null;
    this.done       = false;
  }

  record(heard) {
    if (this.done) return;
    const db = this.currentDB;

    if (!this.ascending) {
      if (heard) {
        this.lastHeard = db;
        if (db <= -10) { this.threshold = db; this.done = true; return; }
        this.currentDB = Math.max(-10, db - 10);
      } else {
        // Not heard while descending → start ascending
        this.ascending = true;
        this.currentDB = Math.min(120, db + 5);
      }
    } else {
      if (heard) {
        // Heard while ascending → this is the threshold
        this.threshold = db;
        this.done = true;
      } else {
        // Not heard while ascending
        if (this.lastHeard !== null) {
          // Already heard something before → lastHeard is the threshold
          this.threshold = this.lastHeard;
          this.done = true;
        } else if (db >= 120) {
          // Never heard anything and hit ceiling
          this.threshold = 120;
          this.done = true;
        } else {
          // Never heard anything yet → keep ascending
          this.currentDB = Math.min(120, db + 5);
        }
      }
    }
  }

  isComplete()   { return this.done; }
  getThreshold() { return this.threshold ?? this.lastHeard ?? this.currentDB; }
  getDB()        { return this.currentDB; }
}

// -- Local WAV Generator ───────────────────────────────────
const CAL = { 250:{r:26.5},500:{r:14},1000:{r:7},2000:{r:9},4000:{r:9.5},8000:{r:13} };
function toAmp(freq, db) {
  const spl = db + (CAL[freq]?.r ?? 0);
  return Math.min(Math.max(Math.pow(10,(spl-94)/20), 0.03), 1.0);
}
function makeWAV(freq, dur, amp, ch='both') {
  const sr=44100, n=Math.floor(sr*dur), buf=new ArrayBuffer(44+n*4), v=new DataView(buf);
  const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF');v.setUint32(4,buf.byteLength-8,true);ws(8,'WAVE');ws(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);
  ws(36,'data');v.setUint32(40,n*4,true);
  const ramp=Math.floor(sr*0.01);
  for(let i=0,o=44;i<n;i++,o+=4){
    let r=1;
    if(i<ramp)r=i/ramp; else if(i>n-ramp)r=(n-i)/ramp;
    const s=Math.round(Math.sin(2*Math.PI*freq*i/sr)*amp*r*32767);
    v.setInt16(o,   ch==='right'?0:s, true);
    v.setInt16(o+2, ch==='left' ?0:s, true);
  }
  const b=new Uint8Array(buf); let bin='';
  for(let i=0;i<b.length;i++) bin+=String.fromCharCode(b[i]);
  return 'data:audio/wav;base64,'+btoa(bin);
}
function playWAV(freq, db, dur=1.0, ch='both') {
  return new Promise(resolve => {
    const audio = new window.Audio(makeWAV(freq, dur, toAmp(freq,db), ch));
    audio.onended = resolve;
    audio.onerror = resolve;
    const p = audio.play();
    if (p) p.catch(resolve);
  });
}

// -- Constants ─────────────────────────────────────────────
const AIR_FREQS  = [1000, 2000, 4000, 8000, 500, 250];
const BONE_FREQS = [1000, 2000, 4000, 500, 250];
const FREQ_LABELS = {250:'250',500:'500',1000:'1k',2000:'2k',4000:'4k',8000:'8k'};

const S = { READY:'READY', PLAYING:'PLAYING', WAITING:'WAITING', SAVING:'SAVING', DONE:'DONE' };

export default function TestScreen({ navigation, route }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { showModal, hideModal } = useToast();
  const { t, textStyle, lang } = useLang();
  const { ear, sessionType = 'air', algorithm = 'traditional' } = route.params;
  const isBone   = sessionType === 'bone';
  // Map frontend algorithm name to backend name
  const backendAlgorithm = algorithm === 'gpc' ? 'gaussian_process' : 'hughson_westlake';
  const earLabel = ear === 'left' ? 'Left Ear' : 'Right Ear';
  const earColor = ear === 'left' ? colors.leftEar : colors.rightEar;
  const color    = isBone ? colors.secondary : earColor;
  const FREQS    = isBone ? BONE_FREQS : AIR_FREQS;
  const audioChannel = isBone ? 'both' : ear; // Bone = both ears, Air = specific ear

  const [freqIdx,     setFreqIdx]     = useState(0);
  const [uiState,     setUiState]     = useState(S.READY);
  const [currentDB,   setCurrentDB]   = useState(60);
  const [thresholds,  setThresholds]  = useState({});
  const [diagnosis,   setDiagnosis]   = useState(null);
  const [boneNeeded,  setBoneNeeded]  = useState(false);

  // Session ref — used by both traditional and GPC
  const sessionRef = useRef(null);
  const isGPC = algorithm === 'gpc';

  const hw          = useRef(new HughsonWestlake(60));
  const stateRef    = useRef(S.READY);

  // -- Animations ────────────────────────────────────────────
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const completeFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
  }, []);
  const idxRef      = useRef(0);
  const threshRef   = useRef({});
  const playRef     = useRef(null);
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const loopRef     = useRef(null);

  const initFreqRef = useRef(null);

  const setUI = s => { stateRef.current = s; setUiState(s); };

  // -- Pulse ─────────────────────────────────────────────────
  const startPulse = () => {
    loopRef.current = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim,{toValue:1.3,duration:500,useNativeDriver:true}),
      Animated.timing(pulseAnim,{toValue:1.0,duration:500,useNativeDriver:true}),
    ]));
    loopRef.current.start();
  };
  const stopPulse = () => {
    loopRef.current?.stop();
    Animated.timing(pulseAnim,{toValue:1.0,duration:200,useNativeDriver:true}).start();
  };

  // -- Play tone ─────────────────────────────────────────────
  const playTone = async () => {
    if (stateRef.current === S.PLAYING) return;
    setUI(S.PLAYING);
    startPulse();
    const db = isGPC ? currentDB : hw.current.getDB();
    await playWAV(FREQS[idxRef.current], db, 3.0, audioChannel).catch(()=>{});
    stopPulse();
    setUI(S.WAITING);
  };
  playRef.current = playTone;

  // -- Init frequency ────────────────────────────────────────
  const initFreq = async (idx) => {
    idxRef.current = idx;
    setFreqIdx(idx);
    setUI(S.READY);
    hw.current = new HughsonWestlake(60);
    setCurrentDB(60);

// -- Create backend session on first frequency
    if (idx === 0 && !sessionRef.current) {
      try {
        const session = await TestService.createSession({
          ear, sessionType, hasHearingLoss: isBone, strategyType: backendAlgorithm,
        });
        sessionRef.current = session.id;
      } catch (e) {
        console.warn('[TestScreen] Could not create backend session:', e.message);
      }
    }

    if (idx > 0) setTimeout(() => playRef.current?.(), 700);
  };
  initFreqRef.current = initFreq;

  useEffect(() => { initFreqRef.current(0); }, []);

  // -- Handle response ───────────────────────────────────────
  const handleResponse = async (heard) => {
    if (stateRef.current !== S.WAITING) return;

    if (isGPC && sessionRef.current) {
      // -- GPC mode: backend decides the next dB level ──────     
       try {
        const result = await TestService.respond(sessionRef.current, heard);
        const nextDB = result.current_db ?? currentDB;
        setCurrentDB(nextDB);
        hw.current.currentDB = nextDB;

        if (result.is_complete) {
          const freq      = FREQS[idxRef.current];
          const threshold = result.threshold;
          const newT      = { ...threshRef.current, [freq]: threshold };
          threshRef.current = newT;
          setThresholds(newT);

          const next = idxRef.current + 1;
          if (next < FREQS.length) {
            setTimeout(() => initFreqRef.current(next), 500);
          } else {
            setUI(S.SAVING);
            await finishTest(newT);
          }
        } else {
          setUI(S.READY);
          setTimeout(() => playRef.current?.(), 700);
        }
      } catch (e) {
        showToast('Backend error, using local fallback', 'warning');
        _handleLocalHW(heard);
      }
    } else {
      // -- Traditional mode: local H-W + fire-and-forget to backend
      _handleLocalHW(heard);
    }
  };

  const _handleLocalHW = async (heard) => {
    hw.current.record(heard);
    const nextDB = hw.current.getDB();
    setCurrentDB(nextDB);

    // Send response to backend (fire-and-forget, non-blocking)
    if (sessionRef.current) {
      TestService.respond(sessionRef.current, heard).catch(() => {});
    }

    if (hw.current.isComplete()) {
      const freq      = FREQS[idxRef.current];
      const threshold = hw.current.getThreshold();
      const newT      = { ...threshRef.current, [freq]: threshold };
      threshRef.current = newT;
      setThresholds(newT);

      const next = idxRef.current + 1;
      if (next < FREQS.length) {
        setTimeout(() => initFreqRef.current(next), 500);
      } else {
        setUI(S.SAVING);
        await finishTest(newT);
      }
    } else {
      setUI(S.READY);
      setTimeout(() => playRef.current?.(), 700);
    }
  };

  // -- Finish: save to backend (user account) ───────────────
  const finishTest = async (finalThresholds) => {
    const vals = Object.values(finalThresholds);
    const avg  = vals.reduce((a,b)=>a+b,0)/vals.length;
    const zone = getHearingLevel(avg);

    // Show results immediately
    setDiagnosis({
      pta: avg,
      classification: zone.label,
      classification_ar: zone.label,
      needs_bone_conduction: avg > 25,
    });
    if (!isBone && avg > 25) setBoneNeeded(true);
    setUI(S.DONE);
    Animated.timing(completeFade, { toValue: 1, duration: 600, useNativeDriver: false }).start();

    // Save to backend (linked to user account)
    try {
      let sessionId;

      if (isGPC && sessionRef.current) {
        // GPC: session already exists in backend from createSession
        sessionId = sessionRef.current;
      } else if (sessionRef.current) {
        // Traditional: session exists; submitThreshold saves final thresholds
        sessionId = sessionRef.current;
        for (const [freq, threshold] of Object.entries(finalThresholds)) {
          await TestService.submitThreshold(sessionId, parseInt(freq), threshold).catch(() => {});
        }
      } else {
        // Fallback: create a new session if none was created earlier
        const session = await TestService.createSession({
          ear, sessionType, hasHearingLoss: isBone, strategyType: backendAlgorithm,
        });
        sessionId = session.id;
        for (const [freq, threshold] of Object.entries(finalThresholds)) {
          await TestService.submitThreshold(sessionId, parseInt(freq), threshold);
        }
      }

      const result = await TestService.classifySession(sessionId);
      setDiagnosis(prev => ({ ...prev, ...result, sessionId }));

      const existing = (() => { try { return JSON.parse(localStorage.getItem('audiogram_tests') || '[]'); } catch { return []; } })();
      existing.unshift({
        id: sessionId, date: new Date().toISOString(),
        ear, session_type: sessionType, results: finalThresholds,
        avg_threshold: result.pta ?? avg, hearing_level: result.classification ?? zone.label,
        from_backend: true,
      });
      localStorage.setItem('audiogram_tests', JSON.stringify(existing));
    } catch (e) {
      console.warn('[TestScreen] backend save failed, saving locally:', e.message);
      showToast('Results saved locally (offline mode)', 'warning');
      const existing = (() => { try { return JSON.parse(localStorage.getItem('audiogram_tests') || '[]'); } catch { return []; } })();
      existing.unshift({
        id: Date.now(), date: new Date().toISOString(),
        ear, session_type: sessionType, results: finalThresholds,
        avg_threshold: avg, hearing_level: zone.label, from_backend: false,
      });
      localStorage.setItem('audiogram_tests', JSON.stringify(existing));
    }
  };

  const progress = freqIdx / FREQS.length;

  // -- SAVING ────────────────────────────────────────────────
  if (uiState === S.SAVING) {
    return (
      <View style={[styles.container, styles.center, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={color} />
        <Text style={[styles.savingText, {color}]}>{t.analyzing}</Text>
      </View>
    );
  }

  // -- DONE ──────────────────────────────────────────────────
  if (uiState === S.DONE) {
    const pta  = diagnosis?.pta ?? 0;
    const zone = getHearingLevel(pta);
    const classAr = diagnosis?.classification_ar ?? zone.label;
    const classEn = diagnosis?.classification ?? zone.label;
    const displayClass = lang === 'ar' ? classAr : classEn;

    return (
      <View style={[styles.container, {backgroundColor: colors.bg}]}>
        <AppNavBar navigation={navigation} title={isBone ? 'Bone Test' : 'Air Test'} />
        <ScrollView contentContainerStyle={styles.doneScroll}>
          <Animated.View style={{ opacity: completeFade }}>

          {/* Header */}
          <View style={styles.doneHeader}>
            <View style={[styles.doneIconWrap, {backgroundColor: zone.color+'20'}]}>
              <Ionicons name="checkmark-circle" size={64} color={zone.color} />
            </View>
            <Text style={[styles.doneTitle, {color: colors.text}]}>{t.testComplete}</Text>
            <View style={[styles.badge, {backgroundColor: color+'20', borderColor: color+'50'}]}>
              <Ionicons name={isBone?'radio-outline':'headset-outline'} size={13} color={color} />
              <Text style={[styles.badgeText, {color}]}>
                {isBone ? t.boneTest : t.airTest} · {earLabel}
              </Text>
            </View>
            {/* Algorithm badge */}
            <View style={[styles.algBadge, {
              backgroundColor: isGPC ? colors.secondary + '20' : colors.primary + '15',
              borderColor: isGPC ? colors.secondary + '50' : colors.primary + '30',
            }]}>
              <Ionicons
                name={isGPC ? 'analytics-outline' : 'trending-up-outline'}
                size={12}
                color={isGPC ? colors.secondary : colors.primary}
              />
              <Text style={[styles.algBadgeText, { color: isGPC ? colors.secondary : colors.primary }]}>
                {isGPC ? t.gpcLabel : t.hwLabel}
              </Text>
            </View>
          </View>

          {/* Diagnosis Card */}
          <View style={[styles.diagCard, {borderColor: zone.color+'40', backgroundColor: colors.bgCard}]}>
            <Text style={[styles.diagLabel, {color: colors.textDim}]}>{t.diagnosis}</Text>
            <Text style={[styles.diagValue, {color: zone.color}]}>{displayClass}</Text>
            {lang === 'ar' && classEn !== classAr && (
              <Text style={[styles.diagValueEn, {color: colors.textMuted}]}>{classEn}</Text>
            )}
            <View style={styles.ptaRow}>
              <Text style={[styles.ptaLabel, {color: colors.textMuted}]}>{t.pta}</Text>
              <Text style={[styles.ptaValue, {color: zone.color}]}>{pta.toFixed(0)} dB HL</Text>
            </View>
            <Text style={[styles.disclaimer, textStyle]}>{t.disclaimer2}</Text>
          </View>

          {/* Audiogram Chart */}
          <View style={[styles.chartCard, {backgroundColor: colors.bgCard, borderColor: colors.border}]}>
            <Text style={[styles.chartTitle, {color: colors.text}]}>
              {earLabel} · {isBone ? 'Bone' : 'Air'} Conduction Audiogram
            </Text>
            {(() => {
              const CHART_FREQS = [250,500,1000,2000,4000,8000];
              const W=300, H=200, PAD_L=32, PAD_B=20, PAD_T=10, PAD_R=10;
              const PW=W-PAD_L-PAD_R, PH=H-PAD_T-PAD_B;
              const DB_MIN=-10, DB_MAX=120;
              const toX = i  => PAD_L + (i/(CHART_FREQS.length-1))*PW;
              const toY = db => PAD_T + ((db-DB_MIN)/(DB_MAX-DB_MIN))*PH;
              const ZONES=[
                {min:-10,max:25,c:'#00D68F'},{min:25,max:40,c:'#FFD600'},
                {min:40,max:55,c:'#FFB347'},{min:55,max:70,c:'#FF8C42'},
                {min:70,max:90,c:'#FF6B6B'},{min:90,max:120,c:'#CC3333'},
              ];
              const pts = CHART_FREQS.filter(f=>thresholds[f]!=null);
              const polyPoints = pts.map((_,i)=>`${toX(CHART_FREQS.indexOf(pts[i]))},${toY(thresholds[pts[i]])}`).join(' ');
              const symbol = isBone?(ear==='right'?']':'['):(ear==='right'?'O':'X');
              return (
                <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
                  {/* Zone bands */}
                  {ZONES.map((z,i)=>(
                    <Rect key={i} x={PAD_L} y={toY(z.min)} width={PW}
                      height={toY(z.max)-toY(z.min)} fill={z.c} opacity={0.12}/>
                  ))}
                  {/* Grid lines */}
                  {[-10,0,20,40,60,80,100,120].map(db=>(
                    <Line key={db} x1={PAD_L} y1={toY(db)} x2={W-PAD_R} y2={toY(db)}
                      stroke="#ffffff10" strokeWidth={1}/>
                  ))}
                  {/* Y axis labels */}
                  {[-10,0,20,40,60,80,100,120].map(db=>(
                    <SvgText key={db} x={PAD_L-4} y={toY(db)+4} fontSize={8}
                      fill={colors.textDim} textAnchor="end">{db}</SvgText>
                  ))}
                  {/* X axis labels */}
                  {CHART_FREQS.map((f,i)=>(
                    <SvgText key={f} x={toX(i)} y={H-4} fontSize={8}
                      fill={colors.textDim} textAnchor="middle">{FREQ_LABELS[f]}</SvgText>
                  ))}
                  {/* Connecting line */}
                  {pts.length>1 && (
                    <Polyline points={polyPoints} fill="none" stroke={color} strokeWidth={2}/>
                  )}
                  {/* Points */}
                  {pts.map((f,i)=>(
                    <React.Fragment key={f}>
                      <Circle cx={toX(CHART_FREQS.indexOf(f))} cy={toY(thresholds[f])}
                        r={7} fill={color}/>
                      <SvgText x={toX(CHART_FREQS.indexOf(f))} y={toY(thresholds[f])+4}
                        fontSize={9} fill="#fff" textAnchor="middle" fontWeight="bold">
                        {symbol}
                      </SvgText>
                    </React.Fragment>
                  ))}
                  {/* Axes */}
                  <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H-PAD_B} stroke={colors.border} strokeWidth={1}/>
                  <Line x1={PAD_L} y1={H-PAD_B} x2={W-PAD_R} y2={H-PAD_B} stroke={colors.border} strokeWidth={1}/>
                </Svg>
              );
            })()}
            <Text style={[styles.axisLabel,{marginTop:4}]}>Frequency (Hz)</Text>
          </View>

          {/* Threshold Table */}
          <View style={[styles.tableCard, {backgroundColor: colors.bgCard, borderColor: colors.border}]}>
            <Text style={[styles.tableTitle, {color: colors.text}]}>{t.thresholds}</Text>
            {FREQS.map(f => thresholds[f] != null ? (
              <View key={f} style={styles.tableRow}>
                <Text style={[styles.tableFreq, {color: colors.textMuted}]}>{FREQ_LABELS[f]} Hz</Text>
                <View style={[styles.tableBar, {backgroundColor: colors.bgElevated}]}>
                  <Animated.View style={[styles.tableBarFill, {
                    width: `${Math.min(100,((thresholds[f]+10)/130)*100)}%`,
                    backgroundColor: color,
                  }]} />
                </View>
                <Text style={[styles.tableDB, {color}]}>{thresholds[f]} dB</Text>
                <TouchableOpacity
                  style={[styles.retestBtn, {borderColor: colors.border}]}
                  onPress={() => {
                    // Reset only this frequency and restart from it
                    const newT = { ...threshRef.current };
                    delete newT[f];
                    threshRef.current = newT;
                    setThresholds(newT);
                    setDiagnosis(null);
                    setBoneNeeded(false);
                    const idx = FREQS.indexOf(f);
                    initFreqRef.current(idx);
                  }}
                >
                  <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
                    <Text style={[styles.retestText, {color: colors.textMuted}]}>{t.retest}</Text>
                </TouchableOpacity>
              </View>
            ) : null)}
          </View>

          {/* Bone test recommendation */}
          {boneNeeded && (
            <View style={styles.boneCard}>
              <View style={styles.boneTop}>
                <Ionicons name="alert-circle" size={20} color="#A78BFA" />
                <Text style={styles.boneTitle}>{t.boneRec}</Text>
              </View>
                <Text style={[styles.boneBody, {color: colors.textMuted}]}>
                {'Air test showed hearing loss of '}
                <Text style={{color: zone.color, fontWeight:'700'}}>{pta.toFixed(0)} dB HL</Text>
                {' (' + classAr + ').\n\nBone conduction test is recommended to determine the type of hearing loss.'}
              </Text>
              <TouchableOpacity
                style={styles.boneBtn}
                onPress={() => showModal(
                  <View style={[styles.modalOverlay, { pointerEvents: 'auto' }]}>
                    <View style={[styles.modalBox, { backgroundColor: colors.bgCard, borderColor: colors.secondary + '40' }]}>
                      <View style={[styles.boneModalIcon, { backgroundColor: colors.secondary + '15' }]}>
                        <Ionicons name="radio-outline" size={36} color={colors.secondary} />
                      </View>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>{t.boneModalTitle}</Text>
                      <View style={[styles.boneIllustration, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                        <Svg width="200" height="110" viewBox="0 0 200 110">
                          <Circle cx="100" cy="45" r="35" fill={colors.secondary + '20'} stroke={colors.secondary} strokeWidth="1.5" />
                          <Path d="M135 38 Q145 45 135 55" fill="none" stroke={colors.secondary} strokeWidth="2.5" strokeLinecap="round"/>
                          <Circle cx="68" cy="52" r="8" fill={colors.secondary + '30'} stroke={colors.secondary} strokeWidth="1.5" strokeDasharray="3,2"/>
                          <Rect x="56" y="46" width="24" height="12" rx="4" fill={colors.secondary} opacity="0.85"/>
                          <Circle cx="68" cy="52" r="3" fill="#fff" opacity="0.7"/>
                          <Line x1="68" y1="75" x2="68" y2="65" stroke={colors.accent} strokeWidth="2" strokeLinecap="round"/>
                          <Polygon points="64,65 72,65 68,58" fill={colors.accent}/>
                          <SvgText x="100" y="95" fontSize="9" fill={colors.textMuted} textAnchor="middle">Place vibrator on mastoid bone</SvgText>
                        </Svg>
                      </View>
                      <Text style={[styles.modalBody, { color: colors.textMuted }]}>{t.boneModalBody}</Text>
                      <View style={styles.modalBtns}>
                        <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={hideModal}>
                          <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>{t.cancel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalQuit, { backgroundColor: colors.secondary + '20', borderColor: colors.secondary + '50' }]}
                          onPress={() => { hideModal(); navigation.replace('Test', { ear, sessionType: 'bone' }); }}
                        >
                          <Text style={[styles.modalQuitText, { color: colors.secondary }]}>{t.startBoneTest}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              >
                <LinearGradient colors={['#A78BFA','#7C3AED']} style={styles.boneBtnGrad}>
                  <Ionicons name="radio-outline" size={18} color="#fff" />
                  <Text style={styles.boneBtnText}>{t.startBone}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Actions */}
          {(() => {
            const otherEar = ear === 'left' ? 'right' : 'left';
            const otherEarLabel = otherEar === 'left' ? 'Left Ear' : 'Right Ear';
            const otherEarColor = otherEar === 'left' ? colors.leftEar : colors.rightEar;
            // Check if other ear already tested today
            const tests = (() => { try { return JSON.parse(localStorage.getItem('audiogram_tests') || '[]'); } catch { return []; } })();
            const otherTested = tests.some(t =>
              t.ear === otherEar &&
              t.session_type === 'air' &&
              Math.abs(new Date(t.date) - new Date()) < 24 * 60 * 60 * 1000
            );

            return (
              <View style={styles.actions}>
                {/* Test other ear — only if not tested yet */}
                {!otherTested && !isBone && (
                  <TouchableOpacity
                    style={styles.otherEarBtn}
                    onPress={() => navigation.replace('Test', { ear: otherEar, sessionType: 'air' })}
                  >
                    <LinearGradient
                      colors={[otherEarColor+'30', otherEarColor+'10']}
                      style={styles.btnGrad}
                    >
                      <Ionicons name="ear-outline" size={18} color={otherEarColor} style={{marginRight:8}} />
                      <Text style={[styles.btnText, {color: otherEarColor}]}>Test {otherEarLabel} →</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.historyBtn} onPress={()=>navigation.navigate('History', { openTestId: diagnosis?.sessionId })}>
                  <LinearGradient colors={isBone?['#A78BFA','#7C3AED']:[color,color+'BB']} style={styles.btnGrad}>
                    <Ionicons name="bar-chart-outline" size={18} color={colors.bg} style={{marginRight:8}} />
                    <Text style={styles.btnText}>{t.viewResults}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.homeBtn, {backgroundColor: colors.bgCard, borderColor: colors.border}]} onPress={()=>navigation.navigate('Home')}>
                  <Text style={[styles.homeBtnText, {color: colors.textMuted}]}>{t.backHome}</Text>
                </TouchableOpacity>
              </View>
            );
          })()}

          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // -- MAIN TEST UI ──────────────────────────────────────────
  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      <AppNavBar navigation={navigation} title={isBone ? 'Bone Conduction' : 'Air Conduction'} disableBack={true} isTestActive={true} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => showModal(
          <View style={[styles.modalOverlay, { pointerEvents: 'auto' }]}>
            <View style={[styles.modalBox, {backgroundColor: colors.bgCard, borderColor: colors.border}]}>
              <Ionicons name="warning-outline" size={36} color={colors.warning} style={{marginBottom:12}} />
              <Text style={[styles.modalTitle, {color: colors.text}]}>{t.quitTest}</Text>
              <Text style={[styles.modalBody, {color: colors.textMuted}]}>{t.quitBody}</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalCancel, {borderColor: colors.border}]} onPress={hideModal}>
                  <Text style={[styles.modalCancelText, {color: colors.textMuted}]}>{t.continueBtn}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalQuit, {backgroundColor: colors.danger+'15', borderColor: colors.danger+'40'}]} onPress={() => { hideModal(); navigation.navigate('SelectEar'); }}>
                  <Text style={[styles.modalQuitText, {color: colors.danger}]}>{t.quit}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}>
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.earBadge}>
          <View style={[styles.earDot,{backgroundColor:color}]} />
          <Text style={[styles.earBadgeText,{color}]}>{earLabel} {isBone?'· Bone':'· Air'}</Text>
        </View>
        <Text style={[styles.stepText,{color:colors.textMuted}]}>{freqIdx+1}/{FREQS.length}</Text>
      </View>

      {/* Progress */}
      <View style={[styles.progressBg, {backgroundColor: colors.bgElevated}]}>
        <View style={[styles.progressFill,{width:`${progress*100}%`,backgroundColor:color}]} />
      </View>

      {/* Frequency dots */}
      <View style={styles.freqRow}>
        {FREQS.map((f,i)=>(
          <View key={f} style={styles.freqItem}>
            <View style={[styles.freqDot,
              i<freqIdx  && {backgroundColor:color},
              i===freqIdx && {backgroundColor:color,transform:[{scale:1.4}]},
              i>freqIdx  && {backgroundColor:colors.bgElevated},
            ]} />
            <Text style={[styles.freqLabel, {color: colors.textDim}, i===freqIdx&&{color,fontWeight:'700'}]}>
              {FREQ_LABELS[f]}
            </Text>
          </View>
        ))}
      </View>

      {/* Test area */}
      <View style={styles.testArea}>
        <Text style={[styles.freqDisplay, {color: colors.text}]}>{FREQS[freqIdx]} Hz</Text>
        <Text style={[styles.dbDisplay, {color: colors.textMuted}]}>{currentDB} dB HL</Text>

        <TouchableOpacity onPress={playTone} disabled={uiState!==S.READY} activeOpacity={0.75} style={styles.playWrap}>
          <Animated.View style={[styles.playRing,{
            transform:[{scale:pulseAnim}],
            borderColor: uiState===S.PLAYING ? color : 'transparent',
          }]} />
          <LinearGradient
            colors={uiState===S.PLAYING?[color+'40',color+'20']:[color+'25',color+'10']}
            style={[styles.playBtn,{borderColor:color+'60'}]}
          >
            <Ionicons name={uiState===S.PLAYING?'volume-high':(isBone?'radio':'play')} size={52} color={uiState===S.READY?color:color+'CC'} />
            <Text style={[styles.playLabel,{color}]}>
              {uiState===S.READY ? t.playTone : uiState===S.PLAYING ? t.playing : t.respondBelow}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.respondPrompt, {color: colors.textMuted}, textStyle]}>{t.didYouHear}</Text>
        <View style={styles.responseRow}>
          <TouchableOpacity
            style={[styles.responseBtn, styles.heardBtn, {backgroundColor:colors.success+'10', borderColor:colors.success+'40'}, uiState!==S.WAITING&&styles.btnDisabled]}
            onPress={()=>handleResponse(true)} disabled={uiState!==S.WAITING} activeOpacity={0.75}
          >
            <Ionicons name="checkmark-circle" size={28} color={uiState===S.WAITING?colors.success:colors.textDim} />
            <Text style={[styles.responseBtnText,{color:uiState===S.WAITING?colors.success:colors.textDim}]}>{t.heard}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.responseBtn, styles.notHeardBtn, {backgroundColor:colors.danger+'10', borderColor:colors.danger+'40'}, uiState!==S.WAITING&&styles.btnDisabled]}
            onPress={()=>handleResponse(false)} disabled={uiState!==S.WAITING} activeOpacity={0.75}
          >
            <Ionicons name="close-circle" size={28} color={uiState===S.WAITING?colors.danger:colors.textDim} />
            <Text style={[styles.responseBtnText,{color:uiState===S.WAITING?colors.danger:colors.textDim}]}>{t.notHeard}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.algHint, {color: colors.textDim}, textStyle]}>
          {isBone
            ? (isGPC ? t.boneGpcHint : t.boneHint)
            : (isGPC ? t.gpcHint    : t.hwHint)
          }
        </Text>

        <TouchableOpacity
          style={[styles.retestCurrentBtn, {borderColor: colors.border}]}
          onPress={() => { hw.current = new HughsonWestlake(currentDB); setUI(S.READY); }}
          disabled={uiState === S.PLAYING}
        >
          <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.retestCurrentText, {color: colors.textMuted}]}>{t.retest}</Text>
        </TouchableOpacity>
      </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex:1 },
  center:       { alignItems:'center', justifyContent:'center', flex:1 },
  savingText:   { marginTop:16, fontSize:16, fontWeight:'700' },

  // Header
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:SPACING.lg, paddingTop:12, paddingBottom:12 },
  earBadge:     { flexDirection:'row', alignItems:'center', gap:6 },
  earDot:       { width:8, height:8, borderRadius:4 },
  earBadgeText: { fontSize:14, fontWeight:'700' },
  themeBtn:     { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center', borderWidth:1 },
  stepText:     { fontSize:14, fontWeight:'600' },
  progressBg:   { height:3, marginHorizontal:SPACING.lg, borderRadius:2 },
  progressFill: { height:3, borderRadius:2 },
  freqRow:      { flexDirection:'row', justifyContent:'space-around', paddingHorizontal:SPACING.lg, paddingVertical:20 },
  freqItem:     { alignItems:'center', gap:6 },
  freqDot:      { width:10, height:10, borderRadius:5 },
  freqLabel:    { fontSize:11 },

  // Test area
  testArea:     { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:SPACING.xl },
  freqDisplay:  { fontSize:48, fontWeight:'800', letterSpacing:-2 },
  dbDisplay:    { fontSize:16, marginBottom:32 },
  playWrap:     { position:'relative', alignItems:'center', justifyContent:'center', marginBottom:32 },
  playRing:     { position:'absolute', width:160, height:160, borderRadius:80, borderWidth:2 },
  playBtn:      { width:140, height:140, borderRadius:70, alignItems:'center', justifyContent:'center', gap:6, borderWidth:2 },
  playLabel:    { fontSize:13, fontWeight:'600' },
  respondPrompt:{ fontSize:16, marginBottom:16, fontWeight:'500' },
  responseRow:  { flexDirection:'row', gap:16, width:'100%' },
  responseBtn:  { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:18, borderRadius:RADIUS.lg, borderWidth:1.5 },
  heardBtn:     {},
  notHeardBtn:  {},
  btnDisabled:  { opacity:0.35 },
  responseBtnText:{ fontSize:16, fontWeight:'700' },
  algHint:      { marginTop:20, fontSize:11, fontStyle:'italic', textAlign:'center' },
  retestCurrentBtn: { flexDirection:'row', alignItems:'center', gap:5, marginTop:10, paddingHorizontal:14, paddingVertical:8, borderRadius:RADIUS.full, borderWidth:1 },
  retestCurrentText:{ fontSize:12, fontWeight:'600' },

  // Done screen
  doneScroll:   { padding:SPACING.lg, paddingTop:60 },
  doneHeader:   { alignItems:'center', marginBottom:20 },
  doneIconWrap: { width:110, height:110, borderRadius:55, alignItems:'center', justifyContent:'center', marginBottom:16 },
  doneTitle:    { fontSize:32, fontWeight:'800', marginBottom:8 },
  badge:        { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:5, borderRadius:RADIUS.full, borderWidth:1 },
  badgeText:    { fontSize:12, fontWeight:'700' },
  algBadge:     { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:4, borderRadius:RADIUS.full, borderWidth:1, marginTop:6 },
  algBadgeText: { fontSize:11, fontWeight:'700' },

  // Diagnosis card
  diagCard:     { borderRadius:RADIUS.xl, padding:SPACING.lg, borderWidth:1.5, marginBottom:16, alignItems:'center' },
  diagLabel:    { fontSize:12, marginBottom:4, textTransform:'uppercase', letterSpacing:1 },
  diagValue:    { fontSize:28, fontWeight:'800', textAlign:'center' },
  diagValueEn:  { fontSize:14, marginTop:2, marginBottom:12 },
  ptaRow:       { flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 },
  ptaLabel:     { fontSize:13 },
  ptaValue:     { fontSize:20, fontWeight:'800' },
  disclaimer:   { fontSize:11, textAlign:'center', lineHeight:16 },

  // Chart
  chartCard:    { borderRadius:RADIUS.lg, padding:SPACING.lg, borderWidth:1, marginBottom:16 },
  chartTitle:   { fontSize:14, fontWeight:'700', marginBottom:12 },
  chart:        { flexDirection:'row', height:200 },
  yAxis:        { width:32, position:'relative', height:200 },
  yLabel:       { fontSize:9 },
  plotArea:     { flex:1, position:'relative', borderLeftWidth:1, borderBottomWidth:1 },
  zoneBand:     { position:'absolute', left:0, right:0 },
  point:        { position:'absolute', width:16, height:16, borderRadius:8, alignItems:'center', justifyContent:'center' },
  pointSymbol:  { fontSize:10, color:'#fff', fontWeight:'800' },
  line:         { position:'absolute', height:2, transformOrigin:'left center' },
  xAxis:        { flexDirection:'row', justifyContent:'space-around', marginTop:4, marginLeft:32 },
  xLabel:       { fontSize:10 },
  axisLabel:    { fontSize:10, textAlign:'center', marginTop:4 },

  // Table
  tableCard:    { borderRadius:RADIUS.lg, padding:SPACING.lg, borderWidth:1, marginBottom:16 },
  tableTitle:   { fontSize:14, fontWeight:'700', marginBottom:12 },
  tableRow:     { flexDirection:'row', alignItems:'center', marginBottom:10, gap:10 },
  tableFreq:    { width:48, fontSize:12, fontWeight:'600' },
  tableBar:     { flex:1, height:6, borderRadius:3, overflow:'hidden' },
  tableBarFill: { height:'100%', borderRadius:3 },
  tableDB:      { width:48, fontSize:12, fontWeight:'700', textAlign:'right' },
  retestBtn:    { flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:8, paddingVertical:4, borderRadius:RADIUS.sm, borderWidth:1, marginLeft:6 },
  retestText:   { fontSize:10, fontWeight:'600' },

  // Bone card
  boneCard:     { backgroundColor:'#A78BFA12', borderRadius:RADIUS.lg, borderWidth:1.5, borderColor:'#A78BFA40', padding:SPACING.lg, marginBottom:16, gap:10 },
  boneTop:      { flexDirection:'row', alignItems:'center', gap:8 },
  boneTitle:    { fontSize:14, fontWeight:'800', color:'#A78BFA', flex:1 },
  boneBody:     { fontSize:13, lineHeight:20 },
  boneBtn:      { borderRadius:RADIUS.lg, overflow:'hidden', marginTop:4 },
  boneBtnGrad:  { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, padding:16 },
  boneBtnText:  { fontSize:15, fontWeight:'800', color:'#fff' },

  // Actions
  actions:      { gap:12, marginBottom:32 },
  historyBtn:   { borderRadius:RADIUS.lg, overflow:'hidden' },
  otherEarBtn:  { borderRadius:RADIUS.lg, overflow:'hidden', borderWidth:1.5 },
  btnGrad:      { padding:18, alignItems:'center', justifyContent:'center', flexDirection:'row' },
  btnText:      { fontSize:16, fontWeight:'800' },
  homeBtn:      { padding:18, alignItems:'center', borderRadius:RADIUS.lg, borderWidth:1 },
  homeBtnText:  { fontSize:16, fontWeight:'600' },

  // Modals
  modalOverlay:    {
    flex: 1,
    alignItems:'center', justifyContent:'center',
    zIndex:9999,
  },
  modalBox:        { borderRadius:RADIUS.xl, padding:SPACING.xl, width:'85%', maxWidth:360, alignItems:'center', borderWidth:1 },
  boneModalIcon:   { width:72, height:72, borderRadius:36, alignItems:'center', justifyContent:'center', marginBottom:12 },
  boneIllustration:{ borderRadius:RADIUS.md, borderWidth:1, padding:8, marginBottom:12, alignItems:'center' },
  modalTitle:      { fontSize:20, fontWeight:'800', marginBottom:8 },
  modalBody:       { fontSize:14, textAlign:'center', marginBottom:24, lineHeight:20 },
  modalBtns:       { flexDirection:'row', gap:12, width:'100%' },
  modalCancel:     { flex:1, padding:14, borderRadius:RADIUS.md, borderWidth:1, alignItems:'center' },
  modalCancelText: { fontSize:15, fontWeight:'700' },
  modalQuit:       { flex:1, padding:14, borderRadius:RADIUS.md, borderWidth:1, alignItems:'center' },
  modalQuitText:   { fontSize:15, fontWeight:'700' },
});
