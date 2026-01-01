
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

export interface SavedMii {
  id: string;
  features: MiiFeatures;
  personality: MiiPersonality;
  createdAt: number;
}

export enum EditorTab {
  FACE = 'Face',
  HAIR = 'Hair',
  EYES = 'Eyes',
  NOSE_MOUTH = 'Details',
  CLOTHING = 'Colors'
}

export type ViewMode = 'editor' | 'city';
