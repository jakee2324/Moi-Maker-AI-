
import React from 'react';
import { MiiFeatures } from '../types';
import * as Constants from '../constants';

interface MiiPreviewProps {
  features: MiiFeatures;
  size?: number;
  className?: string;
}

const MiiPreview: React.FC<MiiPreviewProps> = ({ features, size = 300, className }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="-25 -25 150 200" 
      className={`mii-canvas ${className}`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shirt/Body */}
      <path 
        d="M0,150 Q0,180 50,180 Q100,180 100,150 L100,200 L0,200 Z" 
        fill={features.shirtColor} 
      />
      
      {/* Face Base */}
      <path 
        d={Constants.FACE_SHAPES[features.faceShape as keyof typeof Constants.FACE_SHAPES]} 
        fill={features.skinTone} 
      />

      {/* Eyes */}
      <path 
        d={Constants.EYE_TYPES[features.eyeType as keyof typeof Constants.EYE_TYPES].left} 
        stroke={features.eyeColor} 
        strokeWidth="4" 
        strokeLinecap="round" 
      />
      <path 
        d={Constants.EYE_TYPES[features.eyeType as keyof typeof Constants.EYE_TYPES].right} 
        stroke={features.eyeColor} 
        strokeWidth="4" 
        strokeLinecap="round" 
      />

      {/* Nose */}
      <path 
        d={Constants.NOSE_TYPES[features.noseType as keyof typeof Constants.NOSE_TYPES]} 
        stroke="rgba(0,0,0,0.3)" 
        strokeWidth="2" 
        fill="none" 
      />

      {/* Mouth */}
      <path 
        d={Constants.MOUTH_TYPES[features.mouthType as keyof typeof Constants.MOUTH_TYPES]} 
        stroke="#6b21a8" 
        strokeWidth="3" 
        strokeLinecap="round" 
        fill="none" 
      />

      {/* Hair */}
      {features.hairStyle !== 'bald' && (
        <path 
          d={Constants.HAIR_STYLES[features.hairStyle as keyof typeof Constants.HAIR_STYLES]} 
          fill={features.hairColor} 
        />
      )}

      {/* Glasses */}
      {features.glasses !== 'none' && (
        <path 
          d={Constants.GLASSES_TYPES[features.glasses as keyof typeof Constants.GLASSES_TYPES]} 
          stroke="#4b5563" 
          strokeWidth="2.5" 
          fill="none" 
        />
      )}
    </svg>
  );
};

export default MiiPreview;
