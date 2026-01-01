
import { MiiFeatures } from './types';

export const SKIN_TONES = [
  '#ffe4c4', '#ffdbac', '#f1c27d', '#e0ac69', '#8d5524', '#c68642'
];

export const HAIR_COLORS = [
  '#1a1a1a', '#4b3621', '#8b4513', '#d2b48c', '#ffffff', '#ff0000', '#0000ff', '#00ff00'
];

export const SHIRT_COLORS = [
  '#ef4444', '#3b82f6', '#eab308', '#22c55e', '#ec4899', '#f97316', '#18181b', '#f8fafc'
];

export const INITIAL_FEATURES: MiiFeatures = {
  faceShape: 'round',
  skinTone: SKIN_TONES[0],
  hairStyle: 'bowl',
  hairColor: HAIR_COLORS[1],
  eyeType: 'standard',
  eyeColor: '#1a1a1a',
  noseType: 'triangle',
  mouthType: 'smile',
  shirtColor: SHIRT_COLORS[1],
  eyebrows: 'straight',
  glasses: 'none'
};

export const FACE_SHAPES = {
  round: 'M100,50 Q100,150 50,150 Q0,150 0,50 Q0,0 50,0 Q100,0 100,50',
  pointy: 'M100,50 Q100,120 50,150 Q0,120 0,50 Q0,0 50,0 Q100,0 100,50',
  square: 'M100,20 L100,100 Q100,140 50,140 Q0,140 0,100 L0,20 Q0,0 50,0 Q100,0 100,20',
};

export const HAIR_STYLES = {
  bald: '',
  bowl: 'M0,40 Q0,-10 50,-10 Q100,-10 100,40 L100,60 L0,60 Z',
  spiky: 'M0,50 L10,30 L25,50 L40,20 L55,50 L75,10 L90,50 L100,30 L100,60 L0,60 Z',
  ponytail: 'M10,60 Q10,0 50,0 Q90,0 90,60 M90,30 Q120,30 120,80',
  curly: 'M0,60 Q0,0 50,0 Q100,0 100,60 M-10,30 Q10,20 10,40 M90,40 Q90,20 110,30',
};

export const EYE_TYPES = {
  standard: { left: 'M25,60 A5,5 0 1,1 25,61', right: 'M75,60 A5,5 0 1,1 75,61' },
  happy: { left: 'M20,60 Q25,50 30,60', right: 'M70,60 Q75,50 80,60' },
  angry: { left: 'M20,55 L30,65 M20,65 L30,55', right: 'M70,55 L80,65 M70,65 L80,55' },
  surprised: { left: 'M25,60 A7,7 0 1,1 25,61', right: 'M75,60 A7,7 0 1,1 75,61' },
};

export const NOSE_TYPES = {
  triangle: 'M45,90 L55,90 L50,80 Z',
  round: 'M47,85 A3,3 0 1,1 53,85',
  line: 'M50,80 L50,90',
};

export const MOUTH_TYPES = {
  smile: 'M35,110 Q50,125 65,110',
  neutral: 'M40,115 L60,115',
  sad: 'M35,120 Q50,105 65,120',
  open: 'M40,115 A10,5 0 1,1 60,115',
};

export const GLASSES_TYPES = {
  none: '',
  round: 'M20,60 A10,10 0 1,1 40,60 M60,60 A10,10 0 1,1 80,60 M40,60 L60,60',
  square: 'M15,55 L40,55 L40,70 L15,70 Z M60,55 L85,55 L85,70 L60,70 Z M40,60 L60,60',
};
