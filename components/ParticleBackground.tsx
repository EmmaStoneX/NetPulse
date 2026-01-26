import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseOffset: number;
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 }); // Initialize off-screen
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const isDarkRef = useRef(true);

  // Constants from reference
  const CONNECTION_DISTANCE = 120;
  const MOUSE_RADIUS = 150;
  const BASE_SPEED = 0.3;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const checkTheme = () => {
      isDarkRef.current = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
    };
    checkTheme();

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
      // Adjust density to match reference feel (approx 100 particles for standard screen)
      const particleCount = Math.floor((width * height) / 15000);

      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * BASE_SPEED,
          vy: (Math.random() - 0.5) * BASE_SPEED,
          size: Math.random() * 3 + 1.5, // 1.5px to 4.5px
          baseAlpha: Math.random() * 0.5 + 0.1, // 0.1 to 0.6
          alpha: 0, // Will be set in update
          pulseSpeed: 0.02 + Math.random() * 0.03,
          pulseOffset: Math.random() * Math.PI * 2,
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
        };
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = isDarkRef.current;
      // Reference color: 100, 220, 255 (Cyan/Blueish)
      // We can keep a fallback for light mode or use the same if it fits
      const colorRGB = isDark ? '100, 220, 255' : '71, 85, 105';

      particlesRef.current.forEach((p) => {
        // 1. Update Physics

        // Normal movement
        p.x += p.vx;
        p.y += p.vy;

        // Pulse opacity
        p.alpha = p.baseAlpha + Math.sin(Date.now() * 0.001 * p.pulseSpeed + p.pulseOffset) * 0.1;

        // Mouse Interaction
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MOUSE_RADIUS) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
          const directionMultiplier = -1; // Repulsion

          // Push particle gently
          p.vx += forceDirectionX * force * 0.05 * directionMultiplier;
          p.vy += forceDirectionY * force * 0.05 * directionMultiplier;
        }

        // Friction to stabilize velocity
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > BASE_SPEED * 2) {
          p.vx *= 0.95;
          p.vy *= 0.95;
        }

        // Boundary wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // 2. Draw Particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorRGB}, ${p.alpha})`;
        ctx.fill();

        // Glow effect for larger particles
        if (p.size > 3 && isDark) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = `rgba(${colorRGB}, 0.5)`;
        } else {
          ctx.shadowBlur = 0;
        }
        // Reset shadow for other elements
        ctx.shadowBlur = 0;
      });

      // 3. Draw Connections
      const particles = particlesRef.current;
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONNECTION_DISTANCE) {
            const opacity = 1 - (distance / CONNECTION_DISTANCE);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${colorRGB}, ${opacity * 0.2})`;
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

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
      />
      {/* Optional: Gradient overlay to match the 'Deep Slate' feel if desired, 
          but keeping it subtle to respect the app's existing theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background/50 pointer-events-none" />
    </div>
  );
};

export default ParticleBackground;
