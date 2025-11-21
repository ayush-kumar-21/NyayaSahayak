
import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
}

const NetworkBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const particles: Particle[] = [];
        const particleCount = 100; // Number of nodes
        const connectionDistance = 150;
        const fov = 250;

        // Initialize particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: (Math.random() - 0.5) * width * 1.5,
                y: (Math.random() - 0.5) * height * 1.5,
                z: (Math.random() - 0.5) * fov * 2,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                vz: (Math.random() - 0.5) * 0.5
            });
        }

        let mouseX = 0;
        let mouseY = 0;

        const handleMouseMove = (e: MouseEvent) => {
            // Normalize mouse position for rotation
            mouseX = (e.clientX - width / 2) * 0.0005;
            mouseY = (e.clientY - height / 2) * 0.0005;
        };
        
        window.addEventListener('mousemove', handleMouseMove);

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            
            const isDark = document.documentElement.classList.contains('dark');
            // Network colors - adapting to theme
            const particleColorBase = isDark ? '96, 165, 250' : '59, 130, 246'; 
            const lineColorBase = isDark ? '59, 130, 246' : '37, 99, 235';

            const cx = width / 2;
            const cy = height / 2;

            const projected: { x: number, y: number, scale: number, original: Particle }[] = [];

            particles.forEach(p => {
                // Rotate particle cloud based on mouse interaction
                const cosX = Math.cos(mouseY);
                const sinX = Math.sin(mouseY);
                const cosY = Math.cos(mouseX);
                const sinY = Math.sin(mouseX);

                let x1 = p.x * cosY - p.z * sinY;
                let z1 = p.z * cosY + p.x * sinY;

                let y1 = p.y * cosX - z1 * sinX;
                let z2 = z1 * cosX + p.y * sinX;

                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz;

                // Wrap around screen boundaries for infinite feel
                const limit = Math.max(width, height); 
                if (p.x > limit) p.x = -limit;
                if (p.x < -limit) p.x = limit;
                if (p.y > limit) p.y = -limit;
                if (p.y < -limit) p.y = limit;
                if (p.z > fov) p.z = -fov;
                if (p.z < -fov) p.z = fov;

                // 3D Projection
                const scale = fov / (fov + z2 + 400);
                const x2d = x1 * scale + cx;
                const y2d = y1 * scale + cy;

                if (scale > 0) {
                    projected.push({ x: x2d, y: y2d, scale, original: p });
                }
            });

            // Draw Connections
            ctx.lineWidth = 0.5;
            for (let i = 0; i < projected.length; i++) {
                const p1 = projected[i];
                for (let j = i + 1; j < projected.length; j++) {
                    const p2 = projected[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance) {
                        const opacity = 1 - (dist / connectionDistance);
                        ctx.strokeStyle = `rgba(${lineColorBase}, ${opacity * 0.3})`; 
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            // Draw Particles
            projected.forEach(p => {
                ctx.fillStyle = `rgba(${particleColorBase}, ${Math.min(1, p.scale)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2 * p.scale, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-50 dark:opacity-40 transition-opacity duration-500"
        />
    );
};

export default NetworkBackground;
