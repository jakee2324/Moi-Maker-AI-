export type ColorTheme = 'red' | 'blue' | 'yellow' | 'green' | 'pink' | 'orange' | 'black' | 'white';

export interface MiiFeatures {
  faceShape: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeType: string;
  eyeColor: string;
  noseType: string;
  mouthType: string;
  shirtColor: string;
  eyebrows: string;
  glasses: string;
}

export interface MiiPersonality {
  name: string;
  catchphrase: string;
  hobbies: string[];
  favoriteFood: string;
  biography: string;
  zodiacSign: string;
}

export interface HomeDecor {
  leftSlot?: string;
  rightSlot?: string;
  wallSlot?: string;
}

// Fixed missing ShopItem interface
export interface ShopItem {
  id: string;
  name: string;
  type: 'hairColor' | 'shirtColor' | 'furniture';
  value: string;
  price: number;
  slot?: 'left' | 'right' | 'wall';
}

export interface SavedMii {
  id: string;
  features: MiiFeatures;
  personality: MiiPersonality;
  createdAt: number;
  homeTheme?: string;
  homeDecor?: HomeDecor;
}

export enum EditorTab {
  FACE = 'Face',
  HAIR = 'Hair',
  EYES = 'Eyes',
  NOSE_MOUTH = 'Details',
  CLOTHING = 'Colors'
}

export type ViewMode = 'editor' | 'city' | 'shop' | 'home' | 'cinema' | 'games';