import React, { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  radius: number;
  color: string;
  speedX: number;
  speedY: number;
};

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles.current = [];
      const particleCount = Math.min(window.innerWidth * 0.1, 100);
      
      const baseOpacity = 0.35; // Lower base opacity
      
      for (let i = 0; i < particleCount; i++) {
        particles.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          // Generate softer colors
          color: `rgba(${Math.floor(Math.random() * 40 + 200)}, ${Math.floor(Math.random() * 40 + 200)}, ${Math.floor(Math.random() * 40 + 220)}, ${baseOpacity})`,
          speedX: Math.random() * 0.3 - 0.15,  // Reduced from 0.5 to 0.3
          speedY: Math.random() * 0.3 - 0.15,  // Reduced from 0.5 to 0.3
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.current.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
        
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.speedX *= -1;
        }
        
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.speedY *= -1;
        }
      });
      
      // Connect particles that are close to each other
      connectParticles();
      
      animationRef.current = requestAnimationFrame(drawParticles);
    };
    
    const connectParticles = () => {
      const maxDistance = 120;
      
      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const p1 = particles.current[i];
          const p2 = particles.current[j];
          
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = 1 - (distance / maxDistance);
            ctx.strokeStyle = `rgba(200, 200, 200, ${opacity * 0.08})`;  // 从 0.15 降到 0.08
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    };

    // 添加主题变化的响应
    const updateParticlesForTheme = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const baseOpacity = 0.35;
      particles.current = particles.current.map(p => ({
        ...p,
        color: isDark 
          ? `rgba(${Math.floor(Math.random() * 40 + 120)}, ${Math.floor(Math.random() * 40 + 120)}, ${Math.floor(Math.random() * 40 + 160)}, ${baseOpacity})`
          : `rgba(${Math.floor(Math.random() * 40 + 200)}, ${Math.floor(Math.random() * 40 + 200)}, ${Math.floor(Math.random() * 40 + 220)}, ${baseOpacity})`
      }));
    };

    // 添加 MutationObserver 监听主题变化
    const observer = new MutationObserver(mutations => {
      for(const mutation of mutations) {
        if (mutation.attributeName === 'data-theme') {
          updateParticlesForTheme();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    drawParticles();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1
      }}
    />
  );
}