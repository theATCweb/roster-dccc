import { defaultQuals, propagateQual } from './constants.js';

function makeQuals(southVal, neVal, northVal, fdoVal = 'qualified') {
  let q = defaultQuals();
  q['FDO/FMP'] = fdoVal;
  if (southVal) q = propagateQual(q, 'S/E', southVal);
  if (neVal)    q = propagateQual(q, 'N/E', neVal);
  if (northVal) q = propagateQual(q, 'AI/AS', northVal);
  return q;
}

const allQuals = (level = 'qualified') => makeQuals(level, level, level, level);

export const SUPERVISORS = [
  { id: 'sv1', name: 'BOUDINA',    pw: '1111', gender: 'M' },
  { id: 'sv2', name: 'MERAZGA',    pw: '2222', gender: 'M' },
  { id: 'sv3', name: 'BRAHIMI',    pw: '3333', gender: 'M' },
  { id: 'sv4', name: 'OULD-AISSA', pw: '4444', gender: 'M' },
  { id: 'sv5', name: 'MAHIEDDINE', pw: '5555', gender: 'M' },
];

// 40 controllers: 24M + 16F (8 dayOnly)
export const DEFAULT_CONTROLLERS = [
  // ─── MALES ────────────────────────────────────────────────────────────────
  { id:1,  name:'ZIANI-CHÉRIF', gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified','qualified'),         mPref:'dynamic',ePref:'1er',    conflicts:[], nights:3, hard:5, vacStart:null, vacEnd:null, lastNight:null },
  { id:2,  name:'BELKAÏD',      gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified',null),                mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:2, hard:3, vacStart:null, vacEnd:null, lastNight:null },
  { id:3,  name:'DJABRI',       gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified',null),                mPref:'1er',    ePref:'1er',    conflicts:[], nights:5, hard:7, vacStart:null, vacEnd:null, lastNight:null },
  { id:4,  name:'BENYELLES',    gender:'M', dayOnly:false, quals:makeQuals('qualified',null,null),                       mPref:'dynamic',ePref:'2eme',   conflicts:[], nights:1, hard:2, vacStart:null, vacEnd:null, lastNight:null },
  { id:5,  name:'CHERGUI',      gender:'M', dayOnly:false, quals:makeQuals('qualified',null,null),                       mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:4, hard:4, vacStart:null, vacEnd:null, lastNight:null },
  { id:6,  name:'AMRANE',       gender:'M', dayOnly:false, quals:allQuals('instructeur'),                                mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:2, hard:6, vacStart:null, vacEnd:null, lastNight:null },
  { id:7,  name:'LARIBI',       gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified','qualified'),         mPref:'1er',    ePref:'dynamic',conflicts:[], nights:3, hard:3, vacStart:null, vacEnd:null, lastNight:null },
  { id:8,  name:'HADJEL',       gender:'M', dayOnly:false, quals:makeQuals(null,null,'qualified'),                       mPref:'dynamic',ePref:'2eme',   conflicts:[], nights:0, hard:1, vacStart:null, vacEnd:null, lastNight:null },
  { id:9,  name:'KHALDI',       gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified','stagiaire'),         mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:2, hard:4, vacStart:null, vacEnd:null, lastNight:null },
  { id:10, name:'SAYAH',        gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified',null),                mPref:'dynamic',ePref:'1er',    conflicts:[], nights:5, hard:5, vacStart:null, vacEnd:null, lastNight:null },
  { id:11, name:'BOUKHLIFA',    gender:'M', dayOnly:false, quals:allQuals('qualified'),                                  mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:1, hard:2, vacStart:null, vacEnd:null, lastNight:null },
  { id:12, name:'GACEM',        gender:'M', dayOnly:false, quals:makeQuals('qualified',null,null),                       mPref:'1er',    ePref:'dynamic',conflicts:[], nights:3, hard:3, vacStart:null, vacEnd:null, lastNight:null },
  { id:13, name:'ZERROUKI',     gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified','qualified'),         mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:2, hard:4, vacStart:null, vacEnd:null, lastNight:null },
  { id:14, name:'TOUATI',       gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified','qualified'),         mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:4, hard:6, vacStart:null, vacEnd:null, lastNight:null },
  { id:15, name:'LAZREG',       gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified',null),                mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:0, hard:1, vacStart:null, vacEnd:null, lastNight:null },
  { id:16, name:'MESKINE',      gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified',null),                mPref:'1er',    ePref:'1er',    conflicts:[], nights:2, hard:4, vacStart:null, vacEnd:null, lastNight:null },
  { id:17, name:'RAHMANI',      gender:'M', dayOnly:false, quals:makeQuals('qualified',null,'qualified'),                mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:1, hard:2, vacStart:null, vacEnd:null, lastNight:null },
  { id:18, name:'YAHIAOUI',     gender:'M', dayOnly:false, quals:makeQuals('qualified',null,null),                       mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:4, hard:5, vacStart:null, vacEnd:null, lastNight:null },
  { id:19, name:'SMAILI',       gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified','qualified'),         mPref:'dynamic',ePref:'1er',    conflicts:[], nights:2, hard:3, vacStart:null, vacEnd:null, lastNight:null },
  { id:20, name:'DJAOU',        gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified',null),                mPref:'1er',    ePref:'dynamic',conflicts:[], nights:3, hard:4, vacStart:null, vacEnd:null, lastNight:null },
  { id:21, name:'MEFTAH',       gender:'M', dayOnly:false, quals:makeQuals('qualified','qualified','qualified'),         mPref:'dynamic',ePref:'2eme',   conflicts:[], nights:3, hard:5, vacStart:null, vacEnd:null, lastNight:null },
  { id:22, name:'AISSANI',      gender:'M', dayOnly:false, quals:makeQuals('qualified',null,null),                       mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:1, hard:2, vacStart:null, vacEnd:null, lastNight:null },
  { id:23, name:'BENMECHIA',    gender:'M', dayOnly:false, quals:makeQuals('qualified','stagiaire',null),                mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:4, hard:4, vacStart:null, vacEnd:null, lastNight:null },
  { id:24, name:'KADI',         gender:'M', dayOnly:false, quals:makeQuals(null,null,'qualified'),                       mPref:'dynamic',ePref:'1er',    conflicts:[], nights:2, hard:6, vacStart:null, vacEnd:null, lastNight:null },
  // ─── FEMALES (16: 8 dayOnly, 8 all-shifts) ────────────────────────────────
  { id:25, name:'BOUZIANE',     gender:'F', dayOnly:true,  quals:makeQuals('qualified','qualified',null),                mPref:'dynamic',ePref:'2eme',   conflicts:[], nights:0, hard:1, vacStart:null, vacEnd:null, lastNight:null },
  { id:26, name:'ABDI',         gender:'F', dayOnly:false, quals:makeQuals('qualified',null,null),                       mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:3, hard:2, vacStart:null, vacEnd:null, lastNight:null },
  { id:27, name:'MOKRANI',      gender:'F', dayOnly:true,  quals:makeQuals('qualified','qualified','qualified'),         mPref:'1er',    ePref:'1er',    conflicts:[], nights:0, hard:2, vacStart:null, vacEnd:null, lastNight:null },
  { id:28, name:'KERROUCHE',    gender:'F', dayOnly:false, quals:makeQuals('qualified',null,null),                       mPref:'1er',    ePref:'1er',    conflicts:[], nights:2, hard:3, vacStart:null, vacEnd:null, lastNight:null },
  { id:29, name:'TOUNSI',       gender:'F', dayOnly:true,  quals:makeQuals('qualified',null,null),                       mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:0, hard:1, vacStart:null, vacEnd:null, lastNight:null },
  { id:30, name:'HAMIDI',       gender:'F', dayOnly:false, quals:makeQuals('qualified','qualified',null),                mPref:'dynamic',ePref:'2eme',   conflicts:[], nights:2, hard:2, vacStart:null, vacEnd:null, lastNight:null },
  { id:31, name:'SAIDI',        gender:'F', dayOnly:true,  quals:makeQuals('qualified',null,null),                       mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:0, hard:1, vacStart:null, vacEnd:null, lastNight:null },
  { id:32, name:'CHERIF F.',    gender:'F', dayOnly:false, quals:makeQuals('qualified','qualified','qualified'),         mPref:'1er',    ePref:'dynamic',conflicts:[], nights:1, hard:3, vacStart:null, vacEnd:null, lastNight:null },
  { id:33, name:'BENALI',       gender:'F', dayOnly:true,  quals:makeQuals('qualified',null,null),                       mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:0, hard:1, vacStart:null, vacEnd:null, lastNight:null },
  { id:34, name:'LAZIZ',        gender:'F', dayOnly:false, quals:makeQuals('qualified',null,null),                       mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:3, hard:3, vacStart:null, vacEnd:null, lastNight:null },
  { id:35, name:'OUALI',        gender:'F', dayOnly:true,  quals:makeQuals(null,null,'qualified'),                       mPref:'1er',    ePref:'1er',    conflicts:[], nights:0, hard:2, vacStart:null, vacEnd:null, lastNight:null },
  { id:36, name:'HADJOUT',      gender:'F', dayOnly:false, quals:makeQuals('qualified',null,null),                       mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:1, hard:2, vacStart:null, vacEnd:null, lastNight:null },
  { id:37, name:'DALI',         gender:'F', dayOnly:true,  quals:makeQuals('qualified',null,null),                       mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:0, hard:1, vacStart:null, vacEnd:null, lastNight:null },
  { id:38, name:'MEDDOUR',      gender:'F', dayOnly:false, quals:makeQuals('qualified','qualified',null),                mPref:'1er',    ePref:'1er',    conflicts:[], nights:2, hard:4, vacStart:null, vacEnd:null, lastNight:null },
  { id:39, name:'KHELIFI',      gender:'F', dayOnly:true,  quals:makeQuals('qualified','stagiaire',null),                mPref:'dynamic',ePref:'dynamic',conflicts:[], nights:0, hard:1, vacStart:null, vacEnd:null, lastNight:null },
  { id:40, name:'BOUAZZA',      gender:'F', dayOnly:false, quals:allQuals('qualified'),                                  mPref:'2eme',   ePref:'2eme',   conflicts:[], nights:3, hard:3, vacStart:null, vacEnd:null, lastNight:null },
];

// Check if a controller is on vacation today
export function isOnVacation(ctrl, today = new Date().toISOString().split('T')[0]) {
  if (!ctrl.vacStart || !ctrl.vacEnd) return false;
  return today >= ctrl.vacStart && today <= ctrl.vacEnd;
}
