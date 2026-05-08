// ═══════════════════════════════════════════════════
// QUALIFICATION GROUPS
// Controllers who qualify for one sector in a group
// automatically qualify for all in the group.
// ═══════════════════════════════════════════════════
export const QUAL_GROUPS = {
  base:  ['FDO/FMP'],                   // Level 0 — everyone (base)
  south: ['S/E', 'S/C', 'S/S', 'S/W'], // Level 1 — one qual for all 4
  ne:    ['N/E'],                        // Level 2 — standalone
  north: ['AI/AS', 'N/W'],              // Level 3 — one qual for both
};

// For display: which group does a sector belong to?
export function getSectorGroup(sector) {
  for (const [gName, sects] of Object.entries(QUAL_GROUPS)) {
    if (sects.includes(sector)) return gName;
  }
  return 'base';
}

// Auto-propagate: when setting a qual level on one sector, apply to whole group
export function propagateQual(currentQuals, sector, value) {
  const updated = { ...currentQuals };

  // FDO always qualified (base for all)
  updated['FDO/FMP'] = updated['FDO/FMP'] || 'qualified';

  if (['S/E', 'S/C', 'S/S', 'S/W'].includes(sector)) {
    ['S/E', 'S/C', 'S/S', 'S/W'].forEach(s => updated[s] = value);
  } else if (['AI/AS', 'N/W'].includes(sector)) {
    ['AI/AS', 'N/W'].forEach(s => updated[s] = value);
  } else {
    updated[sector] = value;
  }

  // Instructeur gets everything
  if (value === 'instructeur') {
    ['S/E','S/C','S/S','S/W','N/E','AI/AS','N/W','FDO/FMP'].forEach(s => updated[s] = 'instructeur');
  }

  return updated;
}

// Build default quals for a new controller (only FDO)
export function defaultQuals() {
  const q = {};
  ['AI/AS','N/W','N/E','S/E','S/C','S/S','S/W'].forEach(s => q[s] = null);
  q['FDO/FMP'] = 'qualified';
  return q;
}

// ═══════════════════════════════════════════════════
// SECTORS
// ═══════════════════════════════════════════════════
export const SECTORS = ['AI/AS', 'N/W', 'N/E', 'S/E', 'S/C', 'S/S', 'S/W', 'FDO/FMP'];

export const SEC_CFG = {
  'AI/AS':   { color: '#ef4444', groupLabel: 'Nord (AI/AS+NW)', baseDiff: 4 },
  'N/W':     { color: '#f97316', groupLabel: 'Nord (AI/AS+NW)', baseDiff: 3 },
  'N/E':     { color: '#fb923c', groupLabel: 'Nord-Est',         baseDiff: 4 },
  'S/E':     { color: '#eab308', groupLabel: 'Sud',              baseDiff: 3 },
  'S/C':     { color: '#84cc16', groupLabel: 'Sud',              baseDiff: 3 },
  'S/S':     { color: '#22c55e', groupLabel: 'Sud',              baseDiff: 2 },
  'S/W':     { color: '#10b981', groupLabel: 'Sud',              baseDiff: 2 },
  'FDO/FMP': { color: '#8b5cf6', groupLabel: 'FDO',              baseDiff: 5 },
};

// ═══════════════════════════════════════════════════
// PEAK HOURS (with day-of-week awareness)
// dayOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
// ═══════════════════════════════════════════════════
export function getSectorPeakLevel(sector, slotStartHour, dayOfWeek, isNight) {
  // Night peaks
  if (isNight) {
    if (sector === 'S/S') {
      // 23:30 → 04:30 — hardest at night
      if (slotStartHour >= 23 || slotStartHour < 5) return 3; // heavy
      return 0;
    }
    if (sector === 'S/E' || sector === 'S/C') {
      // Same pressure as SS (traffic shifts from SS to SE/SC)
      if (slotStartHour >= 23 || slotStartHour < 5) return 3;
      return 0;
    }
    if (sector === 'N/E') {
      // 01:00 → 05:00
      if (slotStartHour >= 1 && slotStartHour < 5) return 2;
      return 0;
    }
    if (sector === 'AI/AS' || sector === 'N/W') {
      // Low traffic at night
      return 0;
    }
    return 0;
  }

  // Day peaks
  if (sector === 'N/E') {
    if (slotStartHour >= 8 && slotStartHour < 18) return 3; // hardest day sector
    return 1;
  }
  if (sector === 'AI/AS') {
    if (slotStartHour >= 8 && slotStartHour < 18) return 3; // = NE level
    return 1;
  }
  if (sector === 'S/E') {
    if (dayOfWeek === 5) return 0; // Friday exception — light
    if (slotStartHour >= 6 && slotStartHour < 17) {
      if (dayOfWeek === 2 || dayOfWeek === 3) return 4; // Tue/Wed — heaviest
      return 2; // normal day
    }
    return 0;
  }
  if (sector === 'S/C') {
    if (slotStartHour >= 10 && slotStartHour < 16) return 2;
    return 0;
  }
  if (sector === 'S/W' || sector === 'S/S') {
    if (slotStartHour >= 11 && slotStartHour < 18) return 2;
    return 0;
  }
  if (sector === 'N/W') {
    if (slotStartHour >= 8 && slotStartHour < 18) return 2;
    return 0;
  }
  return 0;
}

export function getPeakLabel(level) {
  return ['', 'LÉGER', 'MODÉRÉ', 'FORT', 'MAX'][level] || '';
}

export function getPeakColor(level) {
  return ['#374151', '#4ade80', '#f59e0b', '#ef4444', '#dc2626'][level] || '#374151';
}

// Parse slot label like "17h00→19h00" → start hour number
export function parseSlotStartHour(label) {
  const m = label.match(/^(\d+)h/);
  return m ? parseInt(m[1]) : 0;
}

// ═══════════════════════════════════════════════════
// TIME SLOTS
// ═══════════════════════════════════════════════════
export const NIGHT_SLOTS = [
  { id: 'N1', label: '17h00→19h00', group: 1, reshuffle: false, startHour: 17 },
  { id: 'N2', label: '19h00→21h00', group: 2, reshuffle: false, startHour: 19 },
  { id: 'N3', label: '21h00→23h30', group: 1, reshuffle: false, startHour: 21 },
  { id: 'N4', label: '23h30→01h30', group: 1, reshuffle: true,  startHour: 23.5 },
  { id: 'N5', label: '01h30→03h30', group: 2, reshuffle: false, startHour: 1.5  },
  { id: 'N6', label: '03h30→06h00', group: 2, reshuffle: true,  startHour: 3.5  },
];

export const DAY_SLOTS = [
  { id: 'D1', label: '06h00→08h00', group: 1, reshuffle: false, startHour: 6  },
  { id: 'D2', label: '08h00→10h00', group: 2, reshuffle: false, startHour: 8  },
  { id: 'D3', label: '10h00→11h30', group: 1, reshuffle: false, startHour: 10, narrow: true },
  { id: 'D4', label: '11h30→13h00', group: 2, reshuffle: false, startHour: 11.5, narrow: true },
  { id: 'D5', label: '13h00→15h00', group: 1, reshuffle: false, startHour: 13 },
  { id: 'D6', label: '15h00→17h00', group: 2, reshuffle: false, startHour: 15 },
];

// ═══════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════
export const STATUS_CFG = {
  normal:         { label: 'Normal',        color: '#4ade80', bg: '#052e16', border: '#166534', fdoOnly: false },
  sick:           { label: 'Malade/Unable', color: '#f87171', bg: '#3f0f0f', border: '#991b1b', fdoOnly: true  },
  suspended:      { label: 'Suspendu',      color: '#fb923c', bg: '#431407', border: '#9a3412', fdoOnly: true  },
  vacation_short: { label: 'Retour <28j',  color: '#60a5fa', bg: '#0c1a4a', border: '#1e40af', fdoOnly: false },
  vacation_long:  { label: 'Retour >28j',  color: '#c4b5fd', bg: '#2e1065', border: '#6d28d9', fdoOnly: true  },
};

export const QUAL_LEVELS = [null, 'stagiaire', 'qualified', 'instructeur'];
export const QUAL_CFG = {
  null:        { label: '—',          color: '#374151', short: '—',   bg: 'transparent' },
  stagiaire:   { label: 'Stagiaire',  color: '#f59e0b', short: 'Stg', bg: '#451a03'     },
  qualified:   { label: 'Qualifié',   color: '#22c55e', short: 'Qal', bg: '#052e16'     },
  instructeur: { label: 'Instructeur',color: '#818cf8', short: 'Ins', bg: '#1e1b4b'     },
};

// ═══════════════════════════════════════════════════
// COLOURS
// ═══════════════════════════════════════════════════
export const C = {
  bg: '#07090f', card: '#0d1626', border: '#1e3a5f',
  dim: '#4b6a8a', accent: '#3b82f6', text: '#e2e8f0',
  mono: "'Share Tech Mono','Courier New',monospace",
  sans: "'Rajdhani',sans-serif",
};
export const btn = (active, col = '#1e40af') => ({
  padding: '8px 12px', borderRadius: 8,
  border: `1px solid ${active ? col : C.border}`,
  background: active ? col : C.card, color: active ? '#fff' : C.dim,
  cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: C.sans,
  transition: 'all .12s',
});
export const card = (ex = {}) => ({
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 10, padding: 12, marginBottom: 10, ...ex,
});
export const lbl = {
  fontSize: 10, letterSpacing: 1.5, color: C.dim, display: 'block', marginBottom: 6,
};
