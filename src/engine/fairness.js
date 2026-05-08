import {
  SECTORS, STATUS_CFG, getSectorPeakLevel,
} from './constants.js';

// ─────────────────────────────────────────────────
// FAIRNESS SCORE
// Higher = more priority for assignment
// ─────────────────────────────────────────────────
export function fairScore(ctrl, dayStatus, isNight) {
  const ds = dayStatus?.[ctrl.id] || 'normal';
  if (STATUS_CFG[ds]?.fdoOnly) return -99;
  if (isNight && ctrl.dayOnly) return -999;

  let sc = 100;
  sc -= ctrl.nights * 3;
  sc -= ctrl.hard * 2;

  if (ds === 'vacation_short') sc += 12;

  // Night rotation bonus (longer since last night → higher priority)
  if (isNight && ctrl.lastNight) {
    const daysAgo = (Date.now() - new Date(ctrl.lastNight).getTime()) / (1000 * 86400);
    sc += Math.min(20, Math.floor(daysAgo * 2));
  } else if (isNight && !ctrl.lastNight) {
    sc += 20; // never worked night → high priority
  }

  return sc;
}

// ─────────────────────────────────────────────────
// CAN WORK
// ─────────────────────────────────────────────────
export function canWork(ctrl, sector, dayStatus, isNight) {
  if (isNight && ctrl.dayOnly) return false;
  const ds = dayStatus?.[ctrl.id] || 'normal';
  if (STATUS_CFG[ds]?.fdoOnly && sector !== 'FDO/FMP') return false;
  const q = ctrl.quals[sector];
  return q === 'qualified' || q === 'instructeur' || q === 'stagiaire';
}

// ─────────────────────────────────────────────────
// BUILD GROUPS (Fouge 1 / Fouge 2)
// ─────────────────────────────────────────────────
export function buildGroups(presentCtrls, isNight) {
  const g1 = [], g2 = [];
  presentCtrls.forEach(c => {
    if (isNight && c.dayOnly) return;
    const pref = isNight ? c.ePref : c.mPref;
    if (pref === '1er') g1.push(c.id);
    else if (pref === '2eme') g2.push(c.id);
    else { if (g1.length <= g2.length) g1.push(c.id); else g2.push(c.id); }
  });
  return { g1, g2 };
}

// ─────────────────────────────────────────────────
// AUTO ASSIGN
// ─────────────────────────────────────────────────
export function autoAssign(slots, presentIds, ctrlMap, dayStatus, pressureMode, settings, mergedSectors = {}) {
  const isNight = slots[0]?.id?.startsWith('N');
  const today = new Date();
  const dayOfWeek = today.getDay();

  const presentCtrls = [...presentIds].map(id => ctrlMap[id]).filter(Boolean);
  const { g1, g2 } = buildGroups(presentCtrls, isNight);

  const roster = {};
  const sessionCount = {};
  presentCtrls.forEach(c => { sessionCount[c.id] = {}; });

  // Build effective sector list (accounting for merges)
  const getMergeName = (sector) => {
    for (const [merged, list] of Object.entries(mergedSectors)) {
      if (list.includes(sector)) return merged;
    }
    return sector;
  };

  slots.forEach(sl => {
    roster[sl.id] = {};
    const groupIds = sl.group === 1 ? g1 : g2;

    // Sort sectors: hardest + peak first
    const sectorOrder = [...SECTORS].sort((a, b) => {
      const peakA = getSectorPeakLevel(a, sl.startHour, dayOfWeek, isNight);
      const peakB = getSectorPeakLevel(b, sl.startHour, dayOfWeek, isNight);
      return (b + peakB * 2) - (a + peakA * 2); // just use diff
    }).sort((a, b) => {
      const pa = getSectorPeakLevel(a, sl.startHour, dayOfWeek, isNight) * 3;
      const pb = getSectorPeakLevel(b, sl.startHour, dayOfWeek, isNight) * 3;
      return pb - pa;
    });

    const usedInSlot = new Set();

    sectorOrder.forEach(sector => {
      const pools = pressureMode === 'high'
        ? presentCtrls.map(c => c.id)
        : [...groupIds, ...presentCtrls.map(c => c.id).filter(id => !groupIds.includes(id))];

      const eligible = pools.filter(id => {
        if (usedInSlot.has(id)) return false;
        const c = ctrlMap[id];
        if (!c || !canWork(c, sector, dayStatus, isNight)) return false;
        if ((c.conflicts || []).some(cid => usedInSlot.has(cid))) return false;
        return true;
      }).sort((a, b) => {
        const ca = ctrlMap[a], cb = ctrlMap[b];
        const repA = Object.values(sessionCount[a] || {}).reduce((s, v) => s + v, 0);
        const repB = Object.values(sessionCount[b] || {}).reduce((s, v) => s + v, 0);
        const sRepA = sessionCount[a]?.[sector] || 0;
        const sRepB = sessionCount[b]?.[sector] || 0;
        const inGrpA = groupIds.includes(a) ? 0 : -15;
        const inGrpB = groupIds.includes(b) ? 0 : -15;

        const scA = fairScore(ca, dayStatus, isNight) - repA * 5 - sRepA * 20 + inGrpA;
        const scB = fairScore(cb, dayStatus, isNight) - repB * 5 - sRepB * 20 + inGrpB;
        return scB - scA;
      });

      if (eligible.length > 0) {
        const chosen = eligible[0];
        roster[sl.id][sector] = chosen;
        usedInSlot.add(chosen);
        if (!sessionCount[chosen]) sessionCount[chosen] = {};
        sessionCount[chosen][sector] = (sessionCount[chosen][sector] || 0) + 1;
      } else {
        roster[sl.id][sector] = null;
      }
    });
  });

  return { roster, groups: { g1, g2 } };
}

// ─────────────────────────────────────────────────
// PRESSURE DETECTION
// ─────────────────────────────────────────────────
export function detectPressure(presentCount, isNight) {
  const ideal = isNight ? 16 : 22;
  const ratio = presentCount / ideal;
  if (ratio < 0.6) return 'high';
  if (ratio > 0.85) return 'calm';
  return 'normal';
}

export const PRESSURE_CFG = {
  high:   { label: '⚠ PRESSION HAUTE', color: '#ef4444', bg: '#3f0f0f', border: '#991b1b', desc: 'Règles assouplies' },
  normal: { label: '◉ NORMAL',         color: '#f5a623', bg: '#1a0f00', border: '#78350f', desc: 'Équilibre' },
  calm:   { label: '✓ CALME',          color: '#4ade80', bg: '#052e16', border: '#166534', desc: 'Justice stricte' },
};

// ─────────────────────────────────────────────────
// EXPLAIN CHOICE
// ─────────────────────────────────────────────────
export function buildExplanation(ctrl, sector, allEligible, dayStatus, isNight) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const ds = dayStatus?.[ctrl.id] || 'normal';
  const score = fairScore(ctrl, dayStatus, isNight);
  const reasons = [];

  if (ds === 'vacation_short') reasons.push('Retour de congé court → récupération');
  if (isNight && !ctrl.lastNight) reasons.push('Jamais travaillé de nuit → priorité max');
  if (ctrl.nights < 2) reasons.push(`Peu de nuits (${ctrl.nights}) → priorité`);
  if (ctrl.hard < 3) reasons.push(`Peu de postes difficiles (${ctrl.hard})`);
  if (score >= 90) reasons.push('Score de justice le plus élevé');

  // Day-of-week peak explanation
  const peakLevel = getSectorPeakLevel(sector, 8, dayOfWeek, isNight);
  if (peakLevel >= 3) {
    reasons.push(`Secteur sous forte pression ${dayNames[dayOfWeek]} (PEAK ${peakLevel}/4)`);
  }
  if (sector === 'S/E' && dayOfWeek === 5) {
    reasons.push('Vendredi: S/E en mode allégé');
  }
  if (sector === 'S/E' && (dayOfWeek === 2 || dayOfWeek === 3)) {
    reasons.push('Mardi/Mercredi: S/E en pression MAXIMALE');
  }

  const runner = allEligible.filter(c => c.id !== ctrl.id)[0];
  let runnerNote = '';
  if (runner) {
    const rs = fairScore(runner, dayStatus, isNight);
    runnerNote = `Meilleure alternative: ${runner.name} (${rs > 0 ? '+' : ''}${rs}) — ${
      score >= rs ? 'Score inférieur' : 'Préférence de fouge'
    }`;
  }

  return {
    reasons: reasons.length ? reasons : ['Contrôleur qualifié disponible dans ce fouge'],
    runnerNote,
    score,
    scoreBreakdown: {
      base: 100,
      nights: -(ctrl.nights * 3),
      hard: -(ctrl.hard * 2),
      status: ds === 'vacation_short' ? 12 : 0,
      nightBonus: isNight && !ctrl.lastNight ? 20 : 0,
    },
  };
}
