// src/lib/theme.ts
const KEY="theme";
export type Theme = 'light'|'dark';
export function getTheme():Theme{
  const t = localStorage.getItem(KEY) as Theme|null;
  return t ?? 'light';
}
export function applyTheme(t:Theme){
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(KEY, t);
}