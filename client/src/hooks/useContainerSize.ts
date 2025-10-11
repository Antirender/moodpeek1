import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for measuring the size of a container element and determining
 * responsive breakpoints based on CSS variables.
 * 
 * Usage:
 * const { ref, width, height, isSm, isMd, isLg } = useContainerSize();
 * <div ref={ref}>Content that needs responsive sizing</div>
 */
export function useContainerSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [breakpoints, setBreakpoints] = useState({
    bpSm: 480,
    bpMd: 768,
    bpLg: 1024
  });
  
  // Function to get CSS variable value
  const getCSSVariable = useCallback((varName: string): number => {
    if (typeof window === 'undefined') return 0;
    
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
      
    return parseInt(value, 10) || 0;
  }, []);
  
  // Get CSS breakpoint variables
  useEffect(() => {
    const bpSm = getCSSVariable('--bp-sm');
    const bpMd = getCSSVariable('--bp-md');
    const bpLg = getCSSVariable('--bp-lg');
    
    setBreakpoints({
      bpSm: bpSm || 480,
      bpMd: bpMd || 768,
      bpLg: bpLg || 1024
    });
  }, [getCSSVariable]);
  
  useEffect(() => {
    if (!ref.current) return;
    
    // Use requestAnimationFrame to debounce resize events
    let rafId: number;
    
    const updateSize = () => {
      if (ref.current) {
        const { width, height } = ref.current.getBoundingClientRect();
        setSize({ width, height });
      }
    };
    
    const debouncedUpdateSize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateSize);
    };
    
    // Create ResizeObserver instance
    const observer = new ResizeObserver(debouncedUpdateSize);
    observer.observe(ref.current);
    
    // Initialize size
    updateSize();
    
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);
  
  // Calculate responsive breakpoint booleans
  const { width, height } = size;
  const { bpSm, bpMd, bpLg } = breakpoints;
  
  const isSm = width < bpMd;
  const isMd = width >= bpMd && width < bpLg;
  const isLg = width >= bpLg;
  
  return {
    ref,
    width,
    height,
    isSm,
    isMd,
    isLg
  };
}

export default useContainerSize;