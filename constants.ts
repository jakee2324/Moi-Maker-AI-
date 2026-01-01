import { MiiFeatures, ShopItem } from './types';

export const SKIN_TONES = [
  '#ffe4c4', '#ffdbac', '#f1c27d', '#e0ac69', '#8d5524', '#c68642'
];

export const HAIR_COLORS = [
  '#1a1a1a', '#4b3621', '#8b4513', '#d2b48c', '#ffffff', '#ff0000', '#0000ff', '#00ff00'
];

export const SHIRT_COLORS = [
  '#ef4444', '#3b82f6', '#eab308', '#22c55e', '#ec4899', '#f97316', '#18181b', '#f8fafc'
];

export const FACE_SHAPES = {
  round: "M10,50 Q10,10 50,10 Q90,10 90,50 Q90,130 50,130 Q10,130 10,50",
  square: "M15,50 Q15,15 50,15 Q85,15 85,50 L85,100 Q85,125 50,125 Q15,125 15,100 Z",
  heart: "M20,50 Q20,10 50,25 Q80,10 80,50 Q80,120 50,140 Q20,120 20,50"
};

export const HAIR_STYLES = {
  bald: "",
  short: "M10,50 Q10,0 50,0 Q90,0 90,50 L95,60 Q50,40 5,60 Z",
  bowl: "M5,55 Q5,5 50,5 Q95,5 95,55 L95,70 Q50,60 5,70 Z",
  spiked: "M10,50 L0,30 L20,40 L30,10 L50,40 L70,10 L80,40 L100,30 L90,50 Z",
  ponytail: "M10,50 Q10,5 50,5 Q90,5 90,50 L100,80 Q90,90 80,70 L80,50 Z"
};

export const EYE_TYPES = {
  dots: {
    left: "M30,55 A5,5 0 1,1 30.1,55",
    right: "M70,55 A5,5 0 1,1 70.1,55"
  },
  almond: {
    left: "M25,55 Q35,45 45,55 Q35,65 25,55",
    right: "M55,55 Q65,45 75,55 Q65,65 55,55"
  },
  closed: {
    left: "M25,60 Q35,50 45,60",
    right: "M55,60 Q65,50 75,60"
  },
  round: {
    left: "M30,50 A8,8 0 1,1 30,66 A8,8 0 1,1 30,50",
    right: "M70,50 A8,8 0 1,1 70,66 A8,8 0 1,1 70,50"
  }
};

export const NOSE_TYPES = {
  dot: "M50,85 A2,2 0 1,1 50.1,85",
  triangle: "M45,95 L50,85 L55,95",
  hook: "M50,80 Q55,85 50,90 L45,90"
};

export const MOUTH_TYPES = {
  smile: "M35,110 Q50,125 65,110",
  flat: "M40,115 L60,115",
  o: "M45,115 A5,5 0 1,1 45,116",
  cat: "M35,115 Q42,125 50,115 Q58,125 65,115"
};

export const GLASSES_TYPES = {
  none: "",
  round: "M20,55 A15,15 0 1,0 50,55 A15,15 0 1,0 20,55 M50,55 L50,55 M50,55 A15,15 0 1,0 80,55 A15,15 0 1,0 50,55",
  square: "M20,40 L45,40 L45,65 L20,65 Z M45,52 L55,52 M55,40 L80,40 L80,65 L55,65 Z"
};

export const INITIAL_FEATURES: MiiFeatures = {
  faceShape: 'round',
  skinTone: SKIN_TONES[1],
  hairStyle: 'short',
  hairColor: HAIR_COLORS[0],
  eyeType: 'dots',
  eyeColor: '#000000',
  noseType: 'dot',
  mouthType: 'smile',
  shirtColor: SHIRT_COLORS[1],
  eyebrows: 'none',
  glasses: 'none'
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hair_gold', name: 'Gold Hair', type: 'hairColor', value: '#ffd700', price: 500 },
  { id: 'hair_silver', name: 'Silver Hair', type: 'hairColor', value: '#c0c0c0', price: 400 },
  { id: 'hair_neon_pink', name: 'Neon Pink Hair', type: 'hairColor', value: '#ff00ff', price: 300 },
  { id: 'shirt_gold', name: 'Gold Shirt', type: 'shirtColor', value: '#daa520', price: 600 },
  { id: 'shirt_royal_purple', name: 'Royal Purple Shirt', type: 'shirtColor', value: '#7851a9', price: 350 },
  { id: 'shirt_cyan', name: 'Cyan Shirt', type: 'shirtColor', value: '#00ffff', price: 200 },
  
  // Furniture Items
  { id: 'furn_arcade', name: 'Arcade Cabinet', type: 'furniture', value: '🕹️', price: 1000, slot: 'left' },
  { id: 'furn_piano', name: 'Grand Piano', type: 'furniture', value: '🎹', price: 1200, slot: 'right' },
  { id: 'furn_bookshelf', name: 'Huge Bookshelf', type: 'furniture', value: '📚', price: 800, slot: 'wall' },
  { id: 'furn_disco', name: 'Disco Ball', type: 'furniture', value: '🪩', price: 1500, slot: 'wall' },
  { id: 'furn_cat', name: 'Cat Tower', type: 'furniture', value: '🐈', price: 700, slot: 'right' },
  { id: 'furn_plant', name: 'Monsteria Plant', type: 'furniture', value: '🌿', price: 300, slot: 'left' }
];
