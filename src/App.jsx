import { useState, useMemo, useEffect, useReducer, useCallback } from 'react';
import { SECTORS, SEC_CFG, STATUS_CFG, QUAL_LEVELS, QUAL_CFG, NIGHT_SLOTS, DAY_SLOTS,
         C, btn, card, lbl, getSectorPeakLevel, getPeakLabel, getPeakColor, propagateQual,
         defaultQuals, QUAL_GROUPS } from './engine/constants.js';
import { SUPERVISORS, DEFAULT_CONTROLLERS, isOnVacation } from './engine/data.js';
import { fairScore, canWork, buildGroups, autoAssign, detectPressure,
         PRESSURE_CFG, buildExplanation } from './engine/fairness.js';
import { storageGet, storageSet, storageSyncSet, exportAllData, importAllData, shareExport } from './engine/storage.js';

/* ════════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
input,button,select,textarea{-webkit-tap-highlight-color:transparent;outline:none;font-family:inherit;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px;}
body{background:#07090f;overscroll-behavior:none;}
@media print{
  #print-zone{display:block!important;position:fixed;top:0;left:0;width:100%;
    background:white;color:black;padding:16px;font-size:10px;}
  .no-print{display:none!important;}
}
`;

/* ════════════════════════════════════════════════════════════
   ROSTER REDUCER (for Undo)
════════════════════════════════════════════════════════════ */
function rosterReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { past: [...state.past, state.current].slice(-15), current: action.payload };
    case 'UNDO':
      if (!state.past.length) return state;
      return { past: state.past.slice(0, -1), current: state.past[state.past.length - 1] };
    default: return state;
  }
}

/* ════════════════════════════════════════════════════════════
   SCREEN: LOGIN
════════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }) {
  const [eq, setEq] = useState('D');
  const [svId, setSvId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const svList = eq === 'D' ? SUPERVISORS : [];

  const go = () => {
    const sv = svList.find(s => s.id === svId);
    if (!sv) { setErr('Choisissez un superviseur'); return; }
    if (sv.pw !== pw) { setErr('Mot de passe incorrect'); return; }
    onLogin({ equipe: eq, supervisor: sv });
  };

  return (
    <div style={{ padding: 20, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>
      <div style={{ textAlign: 'center', paddingBottom: 16 }}>
        <div style={{ fontSize: 42, marginBottom: 6 }}>✈️</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa', letterSpacing: 2, fontFamily: C.sans }}>
          ROSTER ASSISTANT
        </div>
        <div style={{ fontSize: 11, color: C.dim, letterSpacing: 2 }}>ENNA · DCCC ALGER · v4.0</div>
      </div>
      <div style={card()}>
        <span style={lbl}>ÉQUIPE</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['A', 'C', 'D', 'E'].map(e => (
            <button key={e} onClick={() => { setEq(e); setSvId(''); setPw(''); }}
              style={{ ...btn(eq === e), flex: 1, fontSize: 18, fontWeight: 700, padding: '10px 0' }}>{e}</button>
          ))}
        </div>
      </div>
      <div style={card()}>
        <span style={lbl}>SUPERVISEUR</span>
        <select value={svId} onChange={e => setSvId(e.target.value)}
          style={{ width: '100%', background: '#060c18', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: C.sans }}>
          <option value=''>— Choisir —</option>
          {svList.map(sv => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
        </select>
      </div>
      <div style={card()}>
        <span style={lbl}>MOT DE PASSE</span>
        <input type='password' value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()} placeholder='••••'
          style={{ width: '100%', background: '#060c18', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 20, fontFamily: C.mono, letterSpacing: 4 }} />
      </div>
      {err && <div style={{ color: '#f87171', fontSize: 12, textAlign: 'center' }}>{err}</div>}
      <button onClick={go} style={{
        width: '100%', padding: 14, background: 'linear-gradient(135deg,#1e40af,#7c3aed)',
        border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700,
        cursor: 'pointer', letterSpacing: 2, fontFamily: C.sans,
        boxShadow: '0 4px 20px rgba(99,102,241,.35)',
      }}>CONNEXION →</button>
      <div style={{ textAlign: 'center', fontSize: 10, color: C.dim }}>
        Demo: BOUDINA/1111 · MERAZGA/2222 · BRAHIMI/3333
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SCREEN: ATTENDANCE
════════════════════════════════════════════════════════════ */
function AttendanceScreen({ ctrls, present, togglePresent, dayStatus, setDayStatus, isNight, pressure, today }) {
  const [search, setSearch] = useState('');
  const [exp, setExp] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toUpperCase();
    // Filter out on-vacation controllers
    return ctrls.filter(c => !isOnVacation(c, today) && c.name.includes(q));
  }, [ctrls, search, today]);

  const onVacCount = useMemo(() => ctrls.filter(c => isOnVacation(c, today)).length, [ctrls, today]);
  const pcfg = PRESSURE_CFG[pressure];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 12px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ background: pcfg.bg, border: `1px solid ${pcfg.border}`, borderRadius: 6, padding: '4px 10px', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: pcfg.color, fontFamily: C.sans }}>{pcfg.label}</span>
          <span style={{ fontSize: 10, color: C.dim }}>{pcfg.desc}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', fontFamily: C.sans }}>
            PRÉSENCE ({filtered.length} disponibles{onVacCount > 0 ? `, ${onVacCount} en congé` : ''})
          </span>
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: 16, padding: '2px 10px', fontSize: 13, fontWeight: 700, color: '#4ade80', fontFamily: C.mono }}>{present.size}</div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='🔍 Rechercher...'
          style={{ width: '100%', background: '#060c18', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, fontFamily: C.sans }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
        {filtered.map(ctrl => {
          const isP = present.has(ctrl.id);
          const ds = dayStatus[ctrl.id] || 'normal';
          const scfg = STATUS_CFG[ds];
          const isExp = exp === ctrl.id;
          const isNightExempt = ctrl.dayOnly && isNight;
          return (
            <div key={ctrl.id} style={{ marginBottom: 3 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: isExp ? '8px 8px 0 0' : 8,
                background: isP ? '#0a1f0a' : isNightExempt ? '#1a0810' : '#0d1118',
                border: `1px solid ${isP ? '#166534' : isNightExempt ? '#6d28d9' : '#1a2035'}`,
                cursor: 'pointer',
              }}>
                <div onClick={() => !isNightExempt && togglePresent(ctrl.id)} style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${isP ? '#22c55e' : isNightExempt ? '#6d28d9' : '#374151'}`,
                  background: isP ? '#22c55e' : isNightExempt ? '#2e1065' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700,
                }}>{isP ? '✓' : isNightExempt ? '🌞' : ''}</div>
                <div style={{ flex: 1 }} onClick={() => !isNightExempt && togglePresent(ctrl.id)}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: C.mono, color: ctrl.gender === 'F' ? '#f9a8d4' : (isP ? C.text : '#4b6a8a') }}>
                    {ctrl.name}
                    {ctrl.gender === 'F' && <span style={{ fontSize: 9, marginLeft: 3, color: '#f9a8d4' }}>♀</span>}
                    {ctrl.dayOnly && <span style={{ fontSize: 8, marginLeft: 4, color: '#c4b5fd', background: '#2e1065', borderRadius: 3, padding: '0 4px' }}>JOUR/J</span>}
                  </div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 1 }}>
                    {SECTORS.filter(s => ctrl.quals[s]).slice(0, 5).map(s => (
                      <span key={s} style={{ marginRight: 3, color: ctrl.quals[s] === 'instructeur' ? '#818cf8' : ctrl.quals[s] === 'stagiaire' ? '#f59e0b' : '#374151' }}>{s}</span>
                    ))}
                    {isNightExempt && <span style={{ color: '#818cf8', marginLeft: 4 }}>· Nuit exemptée</span>}
                  </div>
                </div>
                {isP && (
                  <div onClick={() => setExp(isExp ? null : ctrl.id)} style={{ background: scfg.bg, border: `1px solid ${scfg.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 9, color: scfg.color, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    {scfg.label} ▾
                  </div>
                )}
              </div>
              {isExp && isP && (
                <div style={{ background: '#060c18', border: `1px solid ${C.border}`, borderRadius: '0 0 8px 8px', padding: 10 }}>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 6, letterSpacing: 1 }}>STATUT DU JOUR</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <button key={k} onClick={() => { setDayStatus(p => ({ ...p, [ctrl.id]: k })); setExp(null); }}
                        style={{ ...btn(ds === k, v.border), fontSize: 10, padding: '4px 8px', color: ds === k ? v.color : C.dim, background: ds === k ? v.bg : C.card, border: `1px solid ${ds === k ? v.border : C.border}` }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                  {(ds === 'sick' || ds === 'suspended' || ds === 'vacation_long') && (
                    <div style={{ marginTop: 8, fontSize: 10, color: '#f87171', background: '#3f0f0f', borderRadius: 6, padding: '5px 8px', border: '1px solid #991b1b' }}>⚠ Assigné uniquement à FDO/FMP</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ROSTER SCREEN with SECTOR MERGE/SPLIT
════════════════════════════════════════════════════════════ */
function RosterScreen({ slots, rosterState, rosterDispatch, groups, locked, setLocked,
                         present, dayStatus, rosterMode, setRosterMode, onAutoAssign,
                         ctrlMap, settings, pressure, ctrls, mergedSectors, setMergedSectors }) {
  const [explainTarget, setExplainTarget] = useState(null);
  const [modal, setModal] = useState(null);
  const [showMergePanel, setShowMergePanel] = useState(false);
  const roster = rosterState.current;
  const isNight = slots[0]?.id?.startsWith('N');
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  const total = slots.length * SECTORS.length;
  const filled = useMemo(() => {
    let n = 0;
    slots.forEach(sl => { SECTORS.forEach(sec => { if (roster[sl.id]?.[sec]) n++; }); });
    return n;
  }, [roster, slots]);

  const setCell = (slotId, sec, cid) => {
    const next = { ...roster, [slotId]: { ...(roster[slotId] || {}), [sec]: cid } };
    rosterDispatch({ type: 'SET', payload: next });
    setModal(null);
  };
  const clearCell = (slotId, sec) => {
    const next = { ...roster, [slotId]: { ...(roster[slotId] || {}), [sec]: null } };
    rosterDispatch({ type: 'SET', payload: next });
    setModal(null);
  };

  const pcfg = PRESSURE_CFG[pressure];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <div style={{ padding: '7px 10px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ background: pcfg.bg, border: `1px solid ${pcfg.border}`, borderRadius: 5, padding: '3px 8px', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: pcfg.color }}>{pcfg.label} · {dayNames[dayOfWeek]}</span>
          <span style={{ fontSize: 9, color: C.dim }}>{filled}/{total} couverts</span>
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
          {[{ id: 'auto', icon: '⚡', l: 'Auto' }, { id: 'manual', icon: '✋', l: 'Manuel' }, { id: 'locked', icon: '🔒', l: 'Figé' }].map(m => (
            <button key={m.id} onClick={() => setRosterMode(m.id)} style={{ ...btn(rosterMode === m.id), flex: 1, padding: '5px 2px', fontSize: 10 }}>
              {m.icon} {m.l}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={onAutoAssign} style={{ ...btn(true, '#065f46'), flex: 1, padding: '6px', fontSize: 10 }}>↺ Redistribuer</button>
          <button onClick={() => rosterDispatch({ type: 'UNDO' })} disabled={!rosterState.past.length}
            style={{ ...btn(rosterState.past.length > 0, '#374151'), padding: '6px 10px', fontSize: 11 }}>↩</button>
          <button onClick={() => setShowMergePanel(true)} style={{ ...btn(false), padding: '6px 10px', fontSize: 10, color: '#f5a623', border: '1px solid #78350f' }}>⊕ Fusion</button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 640, width: '100%', fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 10, background: '#0a0f1e', padding: '6px 4px', border: `1px solid ${C.border}`, color: C.dim, fontSize: 9, minWidth: 82 }}>HORAIRE</th>
              {SECTORS.map(sec => {
                const peakLvl = getSectorPeakLevel(sec, 8, dayOfWeek, isNight);
                return (
                  <th key={sec} style={{ padding: '5px 2px', border: `1px solid ${C.border}`, background: '#0a0f1e', minWidth: 65, textAlign: 'center' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: SEC_CFG[sec].color, margin: '0 auto 2px' }} />
                    <div style={{ color: SEC_CFG[sec].color, fontWeight: 700, fontSize: 10 }}>{sec}</div>
                    {peakLvl > 0 && (
                      <div style={{ fontSize: 7, color: getPeakColor(peakLvl), background: '#0a0f1e', borderRadius: 2, padding: '0 2px' }}>
                        {getPeakLabel(peakLvl)}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slots.map(sl => {
              const isG1 = sl.group === 1;
              return (
                <tr key={sl.id}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: isG1 ? '#0a1020' : '#0f0e08', border: `1px solid ${isG1 ? '#1e3a5f' : '#3a2e0f'}`, padding: '4px 5px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontFamily: C.mono, fontWeight: 700, color: isG1 ? '#60a5fa' : '#fbbf24', whiteSpace: 'nowrap' }}>{sl.label}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 1 }}>
                      <span style={{ fontSize: 7, background: isG1 ? '#3b82f6' : '#f59e0b', color: '#fff', borderRadius: 2, padding: '0 3px' }}>G{sl.group}</span>
                      {sl.reshuffle && <span style={{ fontSize: 7, color: '#f5a623' }}>↺</span>}
                      {sl.narrow && <span style={{ fontSize: 7, color: C.dim }}>1h½</span>}
                    </div>
                  </td>
                  {SECTORS.map(sec => {
                    const cid = roster[sl.id]?.[sec];
                    const ctrl = cid ? ctrlMap[cid] : null;
                    const lk = locked.has(`${sl.id}|${sec}`);
                    const slPeak = getSectorPeakLevel(sec, sl.startHour, dayOfWeek, isNight);
                    const isMergeLeader = Object.keys(mergedSectors).some(k => k === sec);
                    const isMergeFollower = Object.values(mergedSectors).some(arr => arr.includes(sec) && arr[0] !== sec);
                    if (isMergeFollower) return <td key={sec} style={{ border: `1px solid ${C.border}`, background: '#060a12', fontSize: 8, color: C.dim, textAlign: 'center' }}>⊂</td>;
                    return (
                      <td key={sec}
                        onClick={() => { if (rosterMode === 'locked') return; if (ctrl) setExplainTarget({ ctrl, sector: sec, slot: sl }); else setModal({ slotId: sl.id, sector: sec, slot: sl }); }}
                        style={{ border: `1px solid ${C.border}`, background: ctrl ? (lk ? '#0c1f3a' : (slPeak >= 3 ? '#1a0f00' : '#071810')) : '#0d1118', cursor: rosterMode !== 'locked' ? 'pointer' : 'default', padding: '2px', textAlign: 'center', verticalAlign: 'middle', minWidth: 65 }}>
                        {ctrl ? (
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 700, fontFamily: C.mono, lineHeight: 1.2, color: ctrl.gender === 'F' ? '#f9a8d4' : STATUS_CFG[dayStatus[ctrl.id] || 'normal']?.color || '#4ade80' }}>
                              {ctrl.name.length > 9 ? ctrl.name.slice(0, 9) + '…' : ctrl.name}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                              {lk && <span style={{ fontSize: 7 }}>🔒</span>}
                              {ctrl.gender === 'F' && <span style={{ fontSize: 7, color: '#f9a8d4' }}>♀</span>}
                              <span style={{ fontSize: 7, color: C.dim, background: '#0a0f1e', borderRadius: 2, padding: '0 2px' }}>
                                {fairScore(ctrl, dayStatus, isNight) > 0 ? '+' : ''}{fairScore(ctrl, dayStatus, isNight)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: slPeak >= 3 ? '#ef444444' : '#1e3a5f', fontSize: 13 }}>—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Groups legend */}
      <div style={{ padding: '5px 10px', background: '#060a12', borderTop: `1px solid ${C.border}`, flexShrink: 0, fontSize: 8, color: C.dim, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span><b style={{ color: '#60a5fa' }}>G1:</b> {(groups.g1 || []).map(id => ctrlMap[id]?.name?.split(' ')[0] || '?').join(', ')}</span>
        <span><b style={{ color: '#fbbf24' }}>G2:</b> {(groups.g2 || []).map(id => ctrlMap[id]?.name?.split(' ')[0] || '?').join(', ')}</span>
      </div>

      {/* Modals */}
      {modal && (
        <CellSelectorModal slot={modal.slot} sector={modal.sector} slotId={modal.slotId}
          slots={slots} present={present} dayStatus={dayStatus} roster={roster}
          ctrlMap={ctrlMap} locked={locked} groups={groups} pressure={pressure}
          isNight={isNight}
          onSelect={(id) => setCell(modal.slotId, modal.sector, id)}
          onClear={() => clearCell(modal.slotId, modal.sector)}
          onLock={() => { const k = `${modal.slotId}|${modal.sector}`; setLocked(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; }); }}
          onClose={() => setModal(null)} />
      )}
      {explainTarget && (
        <ExplainModal ctrl={explainTarget.ctrl} sector={explainTarget.sector}
          slot={explainTarget.slot} roster={roster} ctrlMap={ctrlMap}
          dayStatus={dayStatus} slots={slots} isNight={isNight}
          onClose={() => setExplainTarget(null)}
          onReplace={() => { setModal({ slotId: explainTarget.slot.id, sector: explainTarget.sector, slot: explainTarget.slot }); setExplainTarget(null); }} />
      )}
      {showMergePanel && (
        <SectorMergePanel mergedSectors={mergedSectors} setMergedSectors={setMergedSectors} onClose={() => setShowMergePanel(false)} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SECTOR MERGE/SPLIT PANEL
════════════════════════════════════════════════════════════ */
function SectorMergePanel({ mergedSectors, setMergedSectors, onClose }) {
  const MERGEABLE = [
    { name: 'AI/AS + N/W', sectors: ['AI/AS', 'N/W'], key: 'AI/AS+NW' },
    { name: 'S/E + S/C',   sectors: ['S/E', 'S/C'],   key: 'SE+SC' },
    { name: 'S/S + S/W',   sectors: ['S/S', 'S/W'],   key: 'SS+SW' },
    { name: 'S/E + S/C + S/S + S/W', sectors: ['S/E', 'S/C', 'S/S', 'S/W'], key: 'South' },
    { name: 'N/E + AI/AS', sectors: ['N/E', 'AI/AS', 'N/W'], key: 'NE+North' },
  ];

  const toggleMerge = (key, sectors) => {
    setMergedSectors(p => {
      const n = { ...p };
      if (n[sectors[0]]) { sectors.forEach(s => delete n[s]); }
      else { sectors.forEach((s, i) => { if (i > 0) n[s] = [sectors[0]]; }); }
      return n;
    });
  };

  const isMerged = (sectors) => !!mergedSectors[sectors[1]];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.88)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: '14px 14px 0 0', border: `1px solid ${C.border}`, maxHeight: '60vh' }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f5a623', fontFamily: C.sans }}>⊕ FUSION / SÉPARATION DES SECTEURS</div>
          <button onClick={onClose} style={{ ...btn(false), padding: '4px 9px', fontSize: 12 }}>✕</button>
        </div>
        <div style={{ padding: 12, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 10 }}>
            Fusionner des secteurs pour qu'ils soient couverts par le même mraaqib
          </div>
          {MERGEABLE.map(m => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#060a12', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: C.sans }}>{m.name}</div>
                <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{m.sectors.map(s => <span key={s} style={{ marginRight: 6, color: SEC_CFG[s]?.color }}>{s}</span>)}</div>
              </div>
              <button onClick={() => toggleMerge(m.key, m.sectors)} style={{ ...btn(isMerged(m.sectors), isMerged(m.sectors) ? '#065f46' : '#374151'), padding: '6px 12px', fontSize: 11 }}>
                {isMerged(m.sectors) ? '✓ Fusionné' : 'Fusionner'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   EXPLAIN MODAL
════════════════════════════════════════════════════════════ */
function ExplainModal({ ctrl, sector, slot, roster, ctrlMap, dayStatus, slots, isNight, onClose, onReplace }) {
  const allEligible = Object.values(ctrlMap).filter(c => canWork(c, sector, dayStatus, isNight))
    .sort((a, b) => fairScore(b, dayStatus, isNight) - fairScore(a, dayStatus, isNight));
  const { reasons, runnerNote, score, scoreBreakdown } = buildExplanation(ctrl, sector, allEligible, dayStatus, isNight);
  const ds = dayStatus[ctrl.id] || 'normal';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d1626', border: `1px solid ${C.border}`, borderRadius: 12, width: '100%', maxWidth: 420, maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ padding: '13px 14px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1 }}>💡 POURQUOI CE CHOIX ?</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: C.mono, color: ctrl.gender === 'F' ? '#f9a8d4' : C.text }}>{ctrl.name}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onReplace} style={{ ...btn(false), padding: '4px 8px', fontSize: 10, color: '#f5a623', border: '1px solid #78350f' }}>✏ Changer</button>
              <button onClick={onClose} style={{ ...btn(false), padding: '4px 8px', fontSize: 11 }}>✕</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ background: `${SEC_CFG[sector]?.color}22`, border: `1px solid ${SEC_CFG[sector]?.color}`, borderRadius: 5, padding: '2px 8px', fontSize: 11, color: SEC_CFG[sector]?.color, fontWeight: 700 }}>{sector}</div>
            <div style={{ background: STATUS_CFG[ds].bg, border: `1px solid ${STATUS_CFG[ds].border}`, borderRadius: 5, padding: '2px 8px', fontSize: 11, color: STATUS_CFG[ds].color }}>{STATUS_CFG[ds].label}</div>
            <div style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, fontFamily: C.mono, color: score > 80 ? '#4ade80' : score > 60 ? '#f5a623' : '#ef4444' }}>{score > 0 ? '+' : ''}{score}</div>
          </div>
        </div>
        <div style={{ padding: '10px 14px' }}>
          <div style={card({ marginBottom: 10 })}>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, marginBottom: 8 }}>DÉCOMPOSITION DU SCORE</div>
            {Object.entries(scoreBreakdown).filter(([, v]) => v !== 0).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid #0d1118` }}>
                <span style={{ fontSize: 11, color: C.dim }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: v > 0 ? '#4ade80' : '#f87171', fontFamily: C.mono }}>{v > 0 ? '+' : ''}{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 0', fontWeight: 700 }}>
              <span style={{ color: C.text }}>TOTAL</span>
              <span style={{ color: score > 80 ? '#4ade80' : score > 60 ? '#f5a623' : '#ef4444', fontFamily: C.mono }}>{score > 0 ? '+' : ''}{score}</span>
            </div>
          </div>
          <div style={card({ marginBottom: 10 })}>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, marginBottom: 8 }}>RAISONS</div>
            {reasons.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 11, color: C.text, lineHeight: 1.4 }}>{r}</span>
              </div>
            ))}
          </div>
          {runnerNote && (
            <div style={{ background: '#0a0f1e', border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 10px', fontSize: 10, color: '#f5a623' }}>
              🔁 {runnerNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CELL SELECTOR MODAL
════════════════════════════════════════════════════════════ */
function CellSelectorModal({ slot, sector, slotId, slots, present, dayStatus, roster, ctrlMap, locked, groups, pressure, isNight, onSelect, onClear, onLock, onClose }) {
  const groupIds = slot.group === 1 ? groups.g1 : groups.g2;
  const currentId = roster[slotId]?.[sector];
  const lk = locked.has(`${slotId}|${sector}`);

  const eligible = useMemo(() => {
    const all = [...(groups.g1 || []), ...(groups.g2 || [])];
    return all.filter(id => { const c = ctrlMap[id]; return c && canWork(c, sector, dayStatus, isNight); })
      .sort((a, b) => fairScore(ctrlMap[b], dayStatus, isNight) - fairScore(ctrlMap[a], dayStatus, isNight));
  }, [groups, sector, dayStatus, ctrlMap, isNight]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.88)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: '14px 14px 0 0', border: `1px solid ${C.border}`, maxHeight: '78vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '11px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: SEC_CFG[sector]?.color, fontFamily: C.sans }}>{sector}</div>
            <div style={{ fontSize: 10, color: C.dim }}>{slot.label} · Fouge {slot.group}</div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {currentId && <button onClick={onLock} style={{ ...btn(lk, '#1e40af'), padding: '4px 8px', fontSize: 10 }}>{lk ? '🔓' : '🔒'}</button>}
            {currentId && <button onClick={onClear} style={{ ...btn(false), padding: '4px 8px', fontSize: 10, color: '#ef4444', border: '1px solid #7f1d1d' }}>✕</button>}
            <button onClick={onClose} style={{ ...btn(false), padding: '4px 8px', fontSize: 11 }}>✕</button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '7px 10px' }}>
          {[
            { ids: eligible.filter(id => groupIds.includes(id)), label: `─ Fouge ${slot.group} (priorité)`, col: slot.group === 1 ? '#60a5fa' : '#fbbf24' },
            { ids: eligible.filter(id => !groupIds.includes(id)), label: '─ Autre fouge (manuel)', col: C.dim },
          ].map(({ ids, label, col }) => ids.length === 0 ? null : (
            <div key={label}>
              <div style={{ fontSize: 8, color: col, padding: '5px 3px', letterSpacing: 1 }}>{label}</div>
              {ids.map(id => {
                const c = ctrlMap[id]; if (!c) return null;
                const isS = currentId === id;
                const ds = dayStatus[id] || 'normal';
                const sc = fairScore(c, dayStatus, isNight);
                const scfg = STATUS_CFG[ds];
                return (
                  <div key={id} onClick={() => onSelect(id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 9px', borderRadius: 7, marginBottom: 3, background: isS ? '#0c2810' : '#060a12', border: `1px solid ${isS ? '#166534' : '#1a2035'}`, cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `2px solid ${isS ? '#22c55e' : '#374151'}`, background: isS ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff' }}>{isS ? '✓' : ''}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: C.mono, color: c.gender === 'F' ? '#f9a8d4' : C.text }}>{c.name}{c.gender === 'F' && <span style={{ fontSize: 8, marginLeft: 3, color: '#f9a8d4' }}>♀</span>}</div>
                      <div style={{ fontSize: 8, color: C.dim }}>🌙{c.nights} ⚡{c.hard}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: C.mono, color: sc > 80 ? '#4ade80' : sc > 60 ? '#f5a623' : '#ef4444' }}>{sc > 0 ? '+' : ''}{sc}</div>
                      <div style={{ fontSize: 8, background: scfg.bg, color: scfg.color, border: `1px solid ${scfg.border}`, borderRadius: 2, padding: '1px 3px' }}>{scfg.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {/* Supervisors */}
          <div style={{ fontSize: 8, color: '#818cf8', padding: '5px 3px', letterSpacing: 1 }}>─ SUPERVISEURS (manuel)</div>
          {SUPERVISORS.map(sv => (
            <div key={sv.id} onClick={() => onSelect(sv.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', borderRadius: 7, marginBottom: 3, background: currentId === sv.id ? '#1a1040' : '#060a12', border: `1px solid ${currentId === sv.id ? '#6d28d9' : '#1a2035'}`, cursor: 'pointer' }}>
              <div style={{ flex: 1, fontSize: 11, fontWeight: 700, fontFamily: C.mono, color: '#c4b5fd' }}>{sv.name}</div>
              <div style={{ fontSize: 8, color: '#818cf8', background: '#1a0f40', borderRadius: 3, padding: '1px 5px' }}>SUP</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PROFILES SCREEN (with Add/Delete/Vacation)
════════════════════════════════════════════════════════════ */
function ProfilesScreen({ ctrls, setCtrls }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showVac, setShowVac] = useState(null); // ctrl id

  const filtered = useMemo(() => {
    const q = search.toUpperCase();
    return ctrls.filter(c => c.name.includes(q));
  }, [ctrls, search]);

  const ctrl = sel ? ctrls.find(c => c.id === sel) : null;

  const upd = (id, patch) => setCtrls(p => p.map(c => c.id === id ? { ...c, ...patch } : c));

  const updQual = (id, sector, value) => {
    setCtrls(p => p.map(c => {
      if (c.id !== id) return c;
      return { ...c, quals: propagateQual(c.quals, sector, value) };
    }));
  };

  const deleteCtrl = (id) => {
    if (!confirm('Supprimer ce contrôleur ?')) return;
    setCtrls(p => p.filter(c => c.id !== id));
    setSel(null);
  };

  const toggleConfl = (cid, oid) => setCtrls(p => p.map(c => {
    if (c.id !== cid) return c;
    const cs = c.conflicts || [];
    return { ...c, conflicts: cs.includes(oid) ? cs.filter(x => x !== oid) : [...cs, oid] };
  }));

  if (sel && ctrl) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '9px 12px', background: C.card, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={() => setSel(null)} style={{ ...btn(false), padding: '4px 9px', fontSize: 12 }}>← Retour</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: C.mono, color: ctrl.gender === 'F' ? '#f9a8d4' : C.text }}>{ctrl.name}</div>
        </div>
        <button onClick={() => setShowVac(ctrl.id)} style={{ ...btn(false), padding: '4px 8px', fontSize: 10, color: '#60a5fa', border: '1px solid #1e40af' }}>📅 Congé</button>
        <button onClick={() => deleteCtrl(ctrl.id)} style={{ ...btn(false), padding: '4px 8px', fontSize: 10, color: '#ef4444', border: '1px solid #7f1d1d' }}>🗑</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* Vacation display */}
        {(ctrl.vacStart || ctrl.vacEnd) && (
          <div style={{ ...card({ marginBottom: 10, background: '#0c1a4a', border: '1px solid #1e40af' }) }}>
            <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700 }}>📅 CONGÉ PROGRAMMÉ</div>
            <div style={{ fontSize: 11, color: C.text, marginTop: 4 }}>
              {ctrl.vacStart} → {ctrl.vacEnd}
              {isOnVacation(ctrl) && <span style={{ marginLeft: 8, color: '#f5a623', fontWeight: 700 }}>EN COURS</span>}
            </div>
          </div>
        )}
        {/* Day-only (females) */}
        {ctrl.gender === 'F' && (
          <div style={card()}>
            <span style={lbl}>RÉGIME DE TRAVAIL</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => upd(ctrl.id, { dayOnly: false })} style={{ ...btn(!ctrl.dayOnly, '#065f46'), flex: 1, fontSize: 11 }}>🌙 Jour + Nuit</button>
              <button onClick={() => upd(ctrl.id, { dayOnly: true })} style={{ ...btn(ctrl.dayOnly, '#6d28d9'), flex: 1, fontSize: 11 }}>🌞 Jour seul</button>
            </div>
          </div>
        )}
        {/* Preferences */}
        {[{ label: 'PRÉFÉRENCE MATIN', key: 'mPref' }, { label: 'PRÉFÉRENCE SOIR', key: 'ePref' }].map(({ label, key }) => (
          <div key={key} style={card()}>
            <span style={lbl}>{label} (Fouge)</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {['1er', '2eme', 'dynamic'].map(p => (
                <button key={p} onClick={() => upd(ctrl.id, { [key]: p })} style={{ ...btn(ctrl[key] === p), flex: 1, fontSize: 10 }}>
                  {p === '1er' ? '1ᵉʳ' : p === '2eme' ? '2ᵉᵐᵉ' : 'Dyn.'}
                </button>
              ))}
            </div>
          </div>
        ))}
        {/* Qualifications — grouped */}
        <div style={card()}>
          <span style={lbl}>QUALIFICATIONS (propagation automatique par groupe)</span>
          {/* Show by group */}
          {[
            { group: 'FDO', sectors: ['FDO/FMP'], note: 'Tous les contrôleurs' },
            { group: 'Sud (SE/SC/SS/SW)', sectors: ['S/E'], note: 'Qualifier SE → SC/SS/SW auto' },
            { group: 'Nord-Est', sectors: ['N/E'], note: 'Indépendant' },
            { group: 'Nord (AI/AS + NW)', sectors: ['AI/AS'], note: 'Qualifier AI/AS → NW auto' },
          ].map(({ group, sectors, note }) => {
            const sec = sectors[0];
            const q = ctrl.quals[sec];
            return (
              <div key={group} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: C.mono, color: SEC_CFG[sec]?.color || C.text, fontWeight: 700 }}>{group}</div>
                    <div style={{ fontSize: 9, color: C.dim }}>{note}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {QUAL_LEVELS.map(v => (
                      <button key={String(v)} onClick={() => updQual(ctrl.id, sec, v)}
                        disabled={sec === 'FDO/FMP'}
                        style={{ padding: '2px 5px', borderRadius: 3, fontSize: 8, cursor: sec === 'FDO/FMP' ? 'default' : 'pointer', border: `1px solid ${q === v ? QUAL_CFG[v].color : C.border}`, background: q === v ? QUAL_CFG[v].bg : 'transparent', color: q === v ? QUAL_CFG[v].color : C.dim, fontWeight: 600 }}>
                        {QUAL_CFG[v].short}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Conflicts */}
        <div style={card()}>
          <span style={lbl}>INCOMPATIBILITÉS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {ctrls.filter(c => c.id !== ctrl.id).map(c => {
              const isC = (ctrl.conflicts || []).includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleConfl(ctrl.id, c.id)} style={{ padding: '3px 7px', borderRadius: 4, fontSize: 9, cursor: 'pointer', border: `1px solid ${isC ? '#991b1b' : C.border}`, background: isC ? '#3f0f0f' : 'transparent', color: isC ? '#f87171' : C.dim, fontFamily: C.mono }}>
                  {isC ? '✕ ' : ''}{c.name}
                </button>
              );
            })}
          </div>
        </div>
        {/* Stats */}
        <div style={card()}>
          <span style={lbl}>STATISTIQUES</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ label: 'Nuits', key: 'nights', col: '#818cf8' }, { label: 'Postes diff.', key: 'hard', col: '#ef4444' }].map(({ label, key, col }) => (
              <div key={key} style={{ background: '#060a12', borderRadius: 7, padding: '8px 10px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9, color: C.dim, marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <button onClick={() => upd(ctrl.id, { [key]: Math.max(0, ctrl[key] - 1) })} style={{ ...btn(false), padding: '1px 7px', fontSize: 14 }}>−</button>
                  <div style={{ fontSize: 18, fontWeight: 700, color: col, fontFamily: C.mono, flex: 1, textAlign: 'center' }}>{ctrl[key]}</div>
                  <button onClick={() => upd(ctrl.id, { [key]: ctrl[key] + 1 })} style={{ ...btn(false), padding: '1px 7px', fontSize: 14 }}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showVac === ctrl.id && (
        <VacationModal ctrl={ctrl} onSave={(start, end) => { upd(ctrl.id, { vacStart: start, vacEnd: end }); setShowVac(null); }} onClose={() => setShowVac(null)} />
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '9px 12px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', fontFamily: C.sans }}>PROFILS · {ctrls.length} contrôleurs</div>
          <button onClick={() => setShowAdd(true)} style={{ ...btn(true, '#065f46'), padding: '5px 10px', fontSize: 11 }}>+ Ajouter</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='🔍 Rechercher...'
          style={{ width: '100%', background: '#060c18', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, fontFamily: C.sans }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '7px 12px' }}>
        {filtered.map(c => {
          const onVac = isOnVacation(c);
          return (
            <div key={c.id} onClick={() => setSel(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 7, marginBottom: 3, background: onVac ? '#0c1a0a' : '#0d1118', border: `1px solid ${onVac ? '#166534' : '#1a2035'}`, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: C.mono, color: c.gender === 'F' ? '#f9a8d4' : C.text }}>
                  {c.name}
                  {c.gender === 'F' && <span style={{ fontSize: 9, marginLeft: 3, color: '#f9a8d4' }}>♀</span>}
                  {c.dayOnly && <span style={{ fontSize: 8, marginLeft: 4, color: '#c4b5fd', background: '#2e1065', borderRadius: 3, padding: '0 4px' }}>🌞</span>}
                  {onVac && <span style={{ fontSize: 8, marginLeft: 4, color: '#4ade80', background: '#052e16', borderRadius: 3, padding: '0 4px' }}>🏖 CONGÉ</span>}
                </div>
                <div style={{ fontSize: 9, color: C.dim }}>
                  {SECTORS.filter(s => c.quals[s]).slice(0, 5).map(s => <span key={s} style={{ marginRight: 4, color: c.quals[s] === 'instructeur' ? '#818cf8' : c.quals[s] === 'stagiaire' ? '#f59e0b' : '#374151' }}>{s}</span>)}
                </div>
              </div>
              <span style={{ color: C.dim, fontSize: 15 }}>›</span>
            </div>
          );
        })}
      </div>
      {showAdd && <AddControllerModal ctrls={ctrls} onAdd={(newCtrl) => { setCtrls(p => [...p, newCtrl]); setShowAdd(false); }} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VACATION MODAL
════════════════════════════════════════════════════════════ */
function VacationModal({ ctrl, onSave, onClose }) {
  const [start, setStart] = useState(ctrl.vacStart || '');
  const [end, setEnd] = useState(ctrl.vacEnd || '');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid #1e40af`, borderRadius: 12, padding: 20, width: '100%', maxWidth: 380 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>📅 CONGÉ — {ctrl.name}</div>
        <div style={{ marginBottom: 12 }}>
          <span style={lbl}>DÉBUT DU CONGÉ</span>
          <input type='date' value={start} onChange={e => setStart(e.target.value)}
            style={{ width: '100%', background: '#060c18', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: C.sans }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <span style={lbl}>FIN DU CONGÉ</span>
          <input type='date' value={end} onChange={e => setEnd(e.target.value)}
            style={{ width: '100%', background: '#060c18', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: C.sans }} />
        </div>
        <div style={{ fontSize: 10, color: C.dim, marginBottom: 12, background: '#0c1a4a', borderRadius: 6, padding: '6px 10px', border: '1px solid #1e40af' }}>
          ℹ Ce contrôleur sera masqué de la liste de présence pendant toute la durée du congé.
          Au retour, il faudra marquer s'il revient de moins ou plus de 28 jours.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onSave(start || null, end || null)} style={{ ...btn(true, '#065f46'), flex: 1 }}>✓ Enregistrer</button>
          <button onClick={() => onSave(null, null)} style={{ ...btn(false), padding: '8px 14px', color: '#f87171', border: '1px solid #7f1d1d' }}>🗑 Supprimer</button>
          <button onClick={onClose} style={{ ...btn(false), padding: '8px 12px' }}>✕</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ADD CONTROLLER MODAL
════════════════════════════════════════════════════════════ */
function AddControllerModal({ ctrls, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('M');
  const [dayOnly, setDayOnly] = useState(false);
  const [err, setErr] = useState('');

  const handleAdd = () => {
    if (!name.trim()) { setErr('Nom requis'); return; }
    const newId = Math.max(0, ...ctrls.map(c => typeof c.id === 'number' ? c.id : 0)) + 1;
    onAdd({
      id: newId, name: name.trim().toUpperCase(), gender, dayOnly: gender === 'F' ? dayOnly : false,
      quals: defaultQuals(), mPref: 'dynamic', ePref: 'dynamic',
      conflicts: [], nights: 0, hard: 0,
      vacStart: null, vacEnd: null, lastNight: null,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid #166534`, borderRadius: 12, padding: 20, width: '100%', maxWidth: 380 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', marginBottom: 16 }}>+ NOUVEAU CONTRÔLEUR</div>
        <div style={{ marginBottom: 10 }}>
          <span style={lbl}>NOM COMPLET</span>
          <input value={name} onChange={e => setName(e.target.value.toUpperCase())} placeholder='NOM PRÉNOM'
            style={{ width: '100%', background: '#060c18', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: C.mono, textTransform: 'uppercase' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={lbl}>GENRE</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setGender('M'); setDayOnly(false); }} style={{ ...btn(gender === 'M'), flex: 1 }}>♂ Homme</button>
            <button onClick={() => setGender('F')} style={{ ...btn(gender === 'F', '#be185d'), flex: 1 }}>♀ Femme</button>
          </div>
        </div>
        {gender === 'F' && (
          <div style={{ marginBottom: 10 }}>
            <span style={lbl}>RÉGIME</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDayOnly(false)} style={{ ...btn(!dayOnly, '#065f46'), flex: 1, fontSize: 11 }}>🌙 Jour + Nuit</button>
              <button onClick={() => setDayOnly(true)} style={{ ...btn(dayOnly, '#6d28d9'), flex: 1, fontSize: 11 }}>🌞 Jour seul</button>
            </div>
          </div>
        )}
        <div style={{ fontSize: 10, color: '#4ade80', background: '#052e16', borderRadius: 6, padding: '5px 8px', marginBottom: 12, border: '1px solid #166534' }}>
          ℹ Les qualifications seront à définir dans le profil du contrôleur (FDO/FMP attribué par défaut).
        </div>
        {err && <div style={{ color: '#f87171', fontSize: 11, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleAdd} style={{ ...btn(true, '#065f46'), flex: 1 }}>✓ Ajouter</button>
          <button onClick={onClose} style={{ ...btn(false), padding: '8px 14px' }}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SYNC SCREEN
════════════════════════════════════════════════════════════ */
function SyncScreen({ ctrls, history, settings }) {
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const handleExport = async () => {
    const json = exportAllData(ctrls, history, settings);
    const result = await shareExport(json);
    if (result === true) setMsg({ type: 'ok', text: 'Données partagées avec succès ✓' });
    else if (result === 'clipboard') setMsg({ type: 'ok', text: 'Données copiées dans le presse-papiers ✓' });
    else setMsg({ type: 'err', text: 'Impossible de partager' });
  };

  return (
    <div style={{ padding: 14, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', fontFamily: C.sans, letterSpacing: 1, marginBottom: 12 }}>🔄 SYNCHRONISATION</div>

      <div style={card()}>
        <span style={lbl}>EXPORTER LES DONNÉES</span>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 10, lineHeight: 1.6 }}>
          Exportez et partagez les données avec les autres superviseurs de l'équipe via WhatsApp, email, ou Bluetooth.
          Les données restent sur les appareils — aucun serveur requis.
        </div>
        <button onClick={handleExport} style={{ width: '100%', ...btn(true, '#065f46'), padding: '12px', fontSize: 13, letterSpacing: 1 }}>
          📤 EXPORTER ET PARTAGER
        </button>
      </div>

      <div style={card()}>
        <span style={lbl}>IMPORTER LES DONNÉES</span>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>Collez les données reçues d'un autre superviseur :</div>
        <button onClick={() => setShowImport(!showImport)} style={{ ...btn(showImport, '#374151'), padding: '8px 14px', fontSize: 11, marginBottom: 8 }}>
          {showImport ? '▲ Masquer' : '▼ Afficher le champ import'}
        </button>
        {showImport && (
          <>
            <textarea value={importText} onChange={e => setImportText(e.target.value)}
              placeholder='Collez le JSON ici...'
              rows={6}
              style={{ width: '100%', background: '#060c18', border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.text, fontSize: 11, fontFamily: C.mono, resize: 'vertical', marginBottom: 8 }} />
            <button onClick={() => {
              try {
                importAllData(importText);
                setMsg({ type: 'ok', text: 'Format valide — rechargez l\'app pour appliquer' });
              } catch (e) {
                setMsg({ type: 'err', text: 'Format invalide: ' + e.message });
              }
            }} style={{ width: '100%', ...btn(true, '#1e40af'), padding: '10px', fontSize: 12 }}>
              📥 VALIDER L'IMPORT
            </button>
          </>
        )}
      </div>

      {msg && (
        <div style={{ background: msg.type === 'ok' ? '#052e16' : '#3f0f0f', border: `1px solid ${msg.type === 'ok' ? '#166534' : '#991b1b'}`, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: msg.type === 'ok' ? '#4ade80' : '#f87171' }}>
          {msg.text}
        </div>
      )}

      <div style={card()}>
        <span style={lbl}>INFORMATIONS</span>
        <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8 }}>
          <div>• Les données sont sauvegardées <b style={{ color: C.text }}>localement sur l'appareil</b></div>
          <div>• Aucune connexion internet requise pour l'utilisation</div>
          <div>• La synchro se fait manuellement par partage JSON</div>
          <div>• Tous les superviseurs du même équipe peuvent modifier le roster de la même journée</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FAIRNESS SCREEN
════════════════════════════════════════════════════════════ */
function FairnessScreen({ present, ctrls, dayStatus, isNight }) {
  const list = useMemo(() =>
    ctrls.filter(c => present.has(c.id)).sort((a, b) => fairScore(b, dayStatus, isNight) - fairScore(a, dayStatus, isNight)),
    [ctrls, present, dayStatus, isNight]
  );
  const max = list.length ? Math.max(...list.map(c => Math.abs(fairScore(c, dayStatus, isNight))), 1) : 1;
  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', fontFamily: C.sans, letterSpacing: 1, marginBottom: 10 }}>⚖ INDICE DE JUSTICE</div>
      {list.length === 0 ? <div style={{ textAlign: 'center', color: C.dim, padding: 40 }}>Marquez des présences d'abord</div> :
        list.map(c => {
          const sc = fairScore(c, dayStatus, isNight);
          const pct = Math.min(100, (Math.abs(sc) / max) * 100);
          const col = sc > 80 ? '#22c55e' : sc > 60 ? '#f5a623' : '#ef4444';
          return (
            <div key={c.id} style={{ background: '#0d1118', border: '1px solid #1a2035', borderRadius: 7, padding: '8px 11px', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <div style={{ flex: 1, fontSize: 11, fontWeight: 700, fontFamily: C.mono, color: c.gender === 'F' ? '#f9a8d4' : C.text }}>{c.name}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: C.mono }}>{sc > 0 ? '+' : ''}{sc}</div>
              </div>
              <div style={{ background: '#060a12', borderRadius: 3, height: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: col }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 8, color: C.dim }}>
                <span>🌙{c.nights}</span><span>⚡{c.hard}</span>
                <span>M:{c.mPref} S:{c.ePref}</span>
              </div>
            </div>
          );
        })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRINT SCREEN
════════════════════════════════════════════════════════════ */
function PrintScreen({ session, slots, roster, ctrlMap }) {
  const d = new Date(session.date);
  const DN = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
  const MN = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
  const isNight = session.shiftType === 'night';
  const title = isNight
    ? `NUIT DU ${DN[d.getDay()]} ${d.getDate()} AU ${DN[(d.getDay() + 1) % 7]} ${d.getDate() + 1} ${MN[d.getMonth()]} ${d.getFullYear()}`
    : `JOUR DU ${DN[d.getDay()]} ${d.getDate()} ${MN[d.getMonth()]} ${d.getFullYear()}`;
  const th = { border: '1px solid #000', padding: '4px 3px', background: '#e0e0e0', fontWeight: 700, textAlign: 'center', fontSize: 9 };
  const td = { border: '1px solid #000', padding: '4px 3px', textAlign: 'center', fontSize: 9 };
  return (
    <div style={{ padding: 12 }}>
      <button onClick={() => window.print()} style={{ width: '100%', padding: 12, marginBottom: 12, background: 'linear-gradient(135deg,#7c3aed,#1e40af)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
        🖨 IMPRIMER / EXPORTER PDF
      </button>
      <div id='print-zone' style={{ background: '#fff', color: '#000', borderRadius: 8, padding: 14, fontSize: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: .5 }}>ETABLISSEMENT NATIONAL DE LA NAVIGATION AERIENNE</div>
          <div style={{ fontWeight: 600, fontSize: 11 }}>CENTRE DE CONTRÔLE REGIONAL D'ALGER</div>
          <div style={{ fontWeight: 700, fontSize: 11, marginTop: 2 }}>{title}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 9 }}>
          <div><b>DATE :</b> {d.getDate()} {MN[d.getMonth()]} {d.getFullYear()}</div>
          <div><b>ÉQUIPE :</b> {session.equipe}</div>
          <div><b>Responsable :</b> <b>{session.supervisorName}</b></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <thead><tr>
              <th style={{ ...th, minWidth: 68 }}>HORAIRE</th>
              {SECTORS.map(s => <th key={s} style={{ ...th, minWidth: 56 }}>{s}</th>)}
            </tr></thead>
            <tbody>
              {slots.map(sl => (
                <tr key={sl.id}>
                  <td style={{ ...td, fontWeight: 700, background: '#f5f5f5' }}>{sl.label.replace('→', '/')}{sl.reshuffle ? ' ↺' : ''}</td>
                  {SECTORS.map(sec => {
                    const id = roster[sl.id]?.[sec];
                    const ctrl = id ? ctrlMap[id] : null;
                    const sv = id ? SUPERVISORS.find(s => s.id === id) : null;
                    return <td key={sec} style={{ ...td, fontWeight: ctrl || sv ? 600 : 400 }}>{ctrl ? ctrl.name : sv ? sv.name : ''}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', fontSize: 9 }}>
          <div style={{ textAlign: 'center' }}>
            <div>Responsable de vacation</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{session.supervisorName}</div>
            <div style={{ marginTop: 18, borderTop: '1px solid #000', width: 110, margin: '18px auto 0' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HEADER + BOTTOM NAV
════════════════════════════════════════════════════════════ */
function Header({ session, pressure, setScreen }) {
  const pcfg = PRESSURE_CFG[pressure];
  return (
    <div className='no-print' style={{ background: '#060c18', borderBottom: `1px solid ${C.border}`, padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
      <div style={{ width: 24, height: 24, borderRadius: 5, flexShrink: 0, background: 'linear-gradient(135deg,#1e40af,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✈</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', letterSpacing: 1, fontFamily: C.sans }}>ROSTER DCCC ALGER v4</div>
      </div>
      <div style={{ fontSize: 8, background: pcfg.bg, color: pcfg.color, border: `1px solid ${pcfg.border}`, borderRadius: 4, padding: '2px 5px' }}>{pcfg.label}</div>
      <div style={{ textAlign: 'right', fontSize: 8, color: C.dim }}>
        <div style={{ color: '#f5a623', fontFamily: C.mono }}>{session.equipe} · {session.supervisorName}</div>
        <div>{session.shiftType === 'night' ? '🌙' : '☀️'} {session.date}</div>
      </div>
      <button onClick={() => setScreen('settings')} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, color: C.dim, padding: '3px 6px', fontSize: 11, cursor: 'pointer' }}>⚙</button>
    </div>
  );
}

function BottomNav({ screen, setScreen, badges }) {
  const tabs = [
    { id: 'attendance', icon: '👥', label: 'Présence', badge: badges.present },
    { id: 'roster',     icon: '📋', label: 'Roster',   badge: badges.unfilled > 0 ? badges.unfilled : null },
    { id: 'profiles',   icon: '🗂',  label: 'Profils',  badge: null },
    { id: 'fairness',   icon: '⚖️',  label: 'Justice',  badge: null },
    { id: 'sync',       icon: '🔄',  label: 'Sync',     badge: null },
    { id: 'print',      icon: '🖨️',  label: 'Imprimer', badge: null },
  ];
  return (
    <div className='no-print' style={{ display: 'flex', borderTop: `1px solid ${C.border}`, background: '#0a0f1e', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setScreen(t.id)} style={{ flex: 1, padding: '8px 1px 6px', border: 'none', background: screen === t.id ? '#0d1a2e' : 'transparent', borderTop: screen === t.id ? `2px solid ${C.accent}` : '2px solid transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, position: 'relative' }}>
          <span style={{ fontSize: 14 }}>{t.icon}</span>
          <span style={{ fontSize: 7, color: screen === t.id ? '#60a5fa' : C.dim, fontFamily: C.sans, fontWeight: 600 }}>{t.label}</span>
          {t.badge != null && t.badge > 0 && <div style={{ position: 'absolute', top: 4, right: '8%', background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 8, fontWeight: 700, padding: '0 4px', minWidth: 13, textAlign: 'center' }}>{t.badge}</div>}
        </button>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ROOT APP
════════════════════════════════════════════════════════════ */
export default function App() {
  const [auth, setAuth] = useState(null);
  const [session, setSession] = useState({ date: new Date().toISOString().split('T')[0], shiftType: 'night', equipe: 'D', supervisorName: '' });
  const [screen, setScreen] = useState('setup');
  const [ctrls, setCtrls] = useState(DEFAULT_CONTROLLERS);
  const [present, setPresent] = useState(new Set());
  const [dayStatus, setDayStatus] = useState({});
  const [locked, setLocked] = useState(new Set());
  const [rosterMode, setRosterMode] = useState('auto');
  const [groups, setGroups] = useState({ g1: [], g2: [] });
  const [rosterState, rosterDispatch] = useReducer(rosterReducer, { past: [], current: {} });
  const [settings, setSettings] = useState({ womenTogether: false });
  const [history, setHistory] = useState([]);
  const [mergedSectors, setMergedSectors] = useState({});

  const today = session.date;
  const slots = session.shiftType === 'night' ? NIGHT_SLOTS : DAY_SLOTS;
  const isNight = session.shiftType === 'night';

  // Load from storage on mount
  useEffect(() => {
    Promise.all([storageGet('controllers_v4'), storageGet('history'), storageGet('settings')]).then(([saved, hist, sett]) => {
      if (saved) setCtrls(saved);
      if (hist) setHistory(hist);
      if (sett) setSettings(sett);
    });
  }, []);

  // Auto-save
  useEffect(() => { storageSyncSet('controllers_v4', ctrls); }, [ctrls]);
  useEffect(() => { storageSyncSet('history', history); }, [history]);
  useEffect(() => { storageSyncSet('settings', settings); }, [settings]);

  const ctrlMap = useMemo(() => {
    const m = {};
    ctrls.forEach(c => m[c.id] = c);
    SUPERVISORS.forEach(sv => m[sv.id] = { ...sv, quals: { 'AI/AS': 'qualified', 'N/W': 'qualified', 'N/E': 'qualified', 'S/E': 'qualified', 'S/C': 'qualified', 'S/S': 'qualified', 'S/W': 'qualified', 'FDO/FMP': 'qualified' }, mPref: 'dynamic', ePref: 'dynamic', conflicts: [], nights: 0, hard: 0, dayOnly: false, lastNight: null });
    return m;
  }, [ctrls]);

  const pressure = useMemo(() => detectPressure(present.size, isNight), [present.size, isNight]);

  const unfilled = useMemo(() => {
    let n = 0;
    slots.forEach(sl => { SECTORS.forEach(sec => { if (!rosterState.current[sl.id]?.[sec]) n++; }); });
    return n;
  }, [rosterState.current, slots]);

  const togglePresent = (id) => setPresent(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doAutoAssign = useCallback(() => {
    const result = autoAssign(slots, present, ctrlMap, dayStatus, pressure, settings, mergedSectors);
    rosterDispatch({ type: 'SET', payload: result.roster });
    setGroups(result.groups);
    setScreen('roster');
  }, [slots, present, ctrlMap, dayStatus, pressure, settings, mergedSectors]);

  if (!auth) return (
    <div style={{ fontFamily: C.sans, background: C.bg, color: C.text, height: '100vh', maxWidth: 480, margin: '0 auto', overflow: 'auto' }}>
      <style>{GLOBAL_CSS}</style>
      <LoginScreen onLogin={({ equipe, supervisor }) => { setAuth({ equipe, supervisor }); setSession(p => ({ ...p, equipe, supervisorName: supervisor.name })); setScreen('setup'); }} />
    </div>
  );

  return (
    <div style={{ fontFamily: C.sans, background: C.bg, color: C.text, height: '100vh', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>
      {screen !== 'setup' && <Header session={session} pressure={pressure} setScreen={setScreen} />}
      <div style={{ flex: 1, overflowY: screen === 'roster' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {screen === 'setup' && (
          <div style={{ padding: 14, overflowY: 'auto', height: '100%' }}>
            <div style={card()}>
              <span style={lbl}>DATE</span>
              <input type='date' value={session.date} onChange={e => setSession(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', background: '#060c18', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: C.sans }} />
            </div>
            <div style={card()}>
              <span style={lbl}>TYPE DE SERVICE</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ id: 'night', icon: '🌙', label: 'NUIT', sub: '17h00→06h00' }, { id: 'day', icon: '☀️', label: 'JOUR', sub: '06h00→17h00' }].map(t => (
                  <button key={t.id} onClick={() => setSession(p => ({ ...p, shiftType: t.id }))}
                    style={{ ...btn(session.shiftType === t.id), padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <span style={{ fontWeight: 700 }}>{t.label}</span>
                    <span style={{ fontSize: 10, opacity: .7 }}>{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setScreen('attendance')} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#065f46,#047857)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
              PRÉSENCES →
            </button>
          </div>
        )}
        {screen === 'attendance' && <AttendanceScreen ctrls={ctrls} present={present} togglePresent={togglePresent} dayStatus={dayStatus} setDayStatus={setDayStatus} isNight={isNight} pressure={pressure} today={today} />}
        {screen === 'roster' && <RosterScreen slots={slots} rosterState={rosterState} rosterDispatch={rosterDispatch} groups={groups} locked={locked} setLocked={setLocked} present={present} dayStatus={dayStatus} rosterMode={rosterMode} setRosterMode={setRosterMode} onAutoAssign={doAutoAssign} ctrlMap={ctrlMap} settings={settings} pressure={pressure} ctrls={ctrls} mergedSectors={mergedSectors} setMergedSectors={setMergedSectors} />}
        {screen === 'profiles' && <ProfilesScreen ctrls={ctrls} setCtrls={setCtrls} />}
        {screen === 'fairness' && <FairnessScreen present={present} ctrls={ctrls} dayStatus={dayStatus} isNight={isNight} />}
        {screen === 'sync' && <SyncScreen ctrls={ctrls} history={history} settings={settings} />}
        {screen === 'print' && <PrintScreen session={session} slots={slots} roster={rosterState.current} ctrlMap={ctrlMap} />}
        {screen === 'settings' && (
          <div style={{ padding: 14, overflowY: 'auto', height: '100%' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', fontFamily: C.sans, marginBottom: 12 }}>⚙ PARAMÈTRES — {auth.supervisor.name}</div>
            <div style={card()}>
              <span style={lbl}>REGROUPEMENT DES FEMMES</span>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>Préférer que les contrôleuses travaillent dans des secteurs proches.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setSettings(p => ({ ...p, womenTogether: true }))} style={{ ...btn(settings.womenTogether, '#be185d'), flex: 1 }}>✅ Activé</button>
                <button onClick={() => setSettings(p => ({ ...p, womenTogether: false }))} style={{ ...btn(!settings.womenTogether), flex: 1 }}>Désactivé</button>
              </div>
            </div>
            <button onClick={() => { setAuth(null); setScreen('setup'); setPresent(new Set()); setDayStatus({}); rosterDispatch({ type: 'SET', payload: {} }); setGroups({ g1: [], g2: [] }); }}
              style={{ width: '100%', ...btn(false), padding: '12px', fontSize: 12, color: '#f87171', border: '1px solid #7f1d1d', marginTop: 12 }}>
              🚪 Déconnexion
            </button>
          </div>
        )}
      </div>
      {screen === 'attendance' && present.size > 0 && (
        <div className='no-print' style={{ padding: '9px 12px', background: C.card, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={doAutoAssign} style={{ width: '100%', padding: 11, background: 'linear-gradient(135deg,#065f46,#047857)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
            ⚡ DISTRIBUER → ROSTER
          </button>
        </div>
      )}
      {screen !== 'setup' && <BottomNav screen={screen} setScreen={setScreen} badges={{ present: present.size, unfilled }} />}
    </div>
  );
}
