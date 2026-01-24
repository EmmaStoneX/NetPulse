import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, isHovering: false, lastMoveTime: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const isDarkRef = useRef(true); // Track dark mode state

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check initial theme
    const checkTheme = () => {
      isDarkRef.current = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
    };
    checkTheme();

    // Observer for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    observer.observe(document.body, { attributes: true });

    const initParticles = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const particleCount = Math.floor((width * height) / 15000);

      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.1,
          baseAlpha: Math.random() * 0.5 + 0.1,
        });
      }
      particlesRef.current = particles;
    };

    const handleResize = () => {
      if (container && canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        initParticles();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          isHovering: true,
          lastMoveTime: Date.now(),
        };
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.isHovering = false;
    };

    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = isDarkRef.current;
      // Dark mode: bright particles (CornflowerBlue-ish). Light mode: dark particles (Slate-ish)
      const particleColor = isDark ? '100, 149, 237' : '71, 85, 105';

      // 计算鼠标静止时间
      const idleTime = Date.now() - mouseRef.current.lastMoveTime;
      const idleThreshold = 2000; // 2秒后开始排斥
      const transitionDuration = 1000; // 1秒过渡时间

      // 计算排斥因子：0 = 纯吸引，1 = 纯排斥
      let repulsionFactor = 0;
      if (idleTime > idleThreshold) {
        repulsionFactor = Math.min((idleTime - idleThreshold) / transitionDuration, 1);
      }

      // Update and draw particles
      particlesRef.current.forEach((p, i) => {
        // Movement
        p.x += p.vx;
        p.y += p.vy;

        // Boundary wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Mouse interaction
        if (mouseRef.current.isHovering) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 200;

          if (distance < maxDistance) {
            const force = (maxDistance - distance) / maxDistance;
            // 混合吸引和排斥：正值吸引，负值排斥
            const direction = 1 - 2 * repulsionFactor; // 1 -> -1
            const forceMultiplier = 0.02 * direction;

            p.x += dx * force * forceMultiplier;
            p.y += dy * force * forceMultiplier;
            p.alpha = Math.min(p.baseAlpha + force * 0.5, 1);
          } else {
            p.alpha = p.baseAlpha;
          }
        } else {
          p.alpha = p.baseAlpha;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particleColor}, ${p.alpha})`;
        ctx.fill();
      });

      // Draw connections
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxConnectDistance = 100;

          if (distance < maxConnectDistance) {
            const opacity = (1 - distance / maxConnectDistance) * 0.2;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${particleColor}, ${opacity})`;
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Initialize
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    draw();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      // Remove mix-blend-mode as it might interfere with light mode visibility
      />
      {/* Gradient overlay only for dark mode depth, controlled by CSS classes if needed, or simple conditional rendering */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/80 pointer-events-none" />
    </div>
  );
};

export default ParticleBackground;
