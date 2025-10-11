// src/components/ThemeToggle.tsx
import { useEffect, useState } from "react";
import { applyTheme, getTheme, Theme } from "../lib/theme";

export default function ThemeToggle(){
  const [t,setT]=useState<Theme>('light');
  useEffect(()=>{ const cur=getTheme(); setT(cur); applyTheme(cur); },[]);
  const toggle=()=>{
    const next = t==='light' ? 'dark' : 'light';
    setT(next); applyTheme(next);
  };
  return (
    <button className="secondary" onClick={toggle} aria-pressed={t==='dark'}>
      {t==='dark' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}