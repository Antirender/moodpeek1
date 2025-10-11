import React from 'react';
import MapPinIcon from './icons/MapPinIcon';

export default function EntryIcon({mood, ...props}:{mood:string, [key: string]: any}){
  // Using the MapPinIcon component for consistency
  return <MapPinIcon {...props} />;
}