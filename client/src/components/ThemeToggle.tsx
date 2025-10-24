// src/components/ThemeToggle.tsx
import { useEffect, useState } from "react";
import { applyTheme, getTheme, Theme } from "../lib/theme";
// AI Assistance: Content and explanations were generated/refined with ChatGPT (OpenAI, 2025)
// Reference: https://chatgpt.com/share/68fb7f17-3f1c-800c-8e20-adf8340fb1dd
// Add/remove/refine more details by myself

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
