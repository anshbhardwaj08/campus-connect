// Animated particle-network canvas used behind the auth screens.
// Particles drift, link to nearby neighbours, and react to the cursor.
import { useEffect, useRef } from 'react';

const LINK_DISTANCE = 140;
const MOUSE_DISTANCE = 190;

export default function TechBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let particles = [];
    let frame;
    const mouse = { x: null, y: null };

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(Math.round((width * height) / 13000), 95);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.5 + 0.7,
      }));
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= width) p.vx *= -1;
        if (p.y <= 0 || p.y >= height) p.vy *= -1;
      }

      // Links between neighbouring particles
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > LINK_DISTANCE) continue;

          ctx.strokeStyle = `rgba(139, 92, 246, ${0.22 * (1 - dist / LINK_DISTANCE)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Cursor links — brighter, cyan tinted
      if (mouse.x !== null) {
        for (const p of particles) {
          const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (dist > MOUSE_DISTANCE) continue;

          ctx.strokeStyle = `rgba(34, 211, 238, ${0.5 * (1 - dist / MOUSE_DISTANCE)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      // Particles themselves
      for (const p of particles) {
        ctx.fillStyle = 'rgba(196, 181, 253, 0.85)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(render);
    };

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    setSize();
    if (reduceMotion) {
      render();
      cancelAnimationFrame(frame);
    } else {
      render();
    }

    window.addEventListener('resize', setSize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', setSize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#07070f]">
      {/* Drifting glow orbs */}
      <div className="absolute -left-32 -top-32 h-[36rem] w-[36rem] animate-drift-slow rounded-full bg-violet-600/25 blur-[120px]" />
      <div className="absolute -bottom-40 -right-24 h-[32rem] w-[32rem] animate-drift-slower rounded-full bg-fuchsia-600/20 blur-[120px]" />
      <div className="absolute left-1/2 top-1/3 h-80 w-80 animate-drift-slow rounded-full bg-cyan-500/15 blur-[100px]" />

      {/* Perspective grid, faded toward the horizon */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(139,92,246,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
          transform: 'perspective(340px) rotateX(58deg)',
          transformOrigin: 'bottom',
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Vignette so the form card stays readable */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(7,7,15,0.85)_100%)]" />
    </div>
  );
}
