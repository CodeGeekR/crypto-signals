interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  isNode: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private connectionDistance: number = 200;

  constructor(container: HTMLElement) {
    this.setupCanvas(container);
    this.setupMouseTracking();
    this.init();
  }

  private setupCanvas(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private setupMouseTracking() {
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });
  }

  init() {
    this.createParticles();
    this.animate();
  }

  createParticles() {
    const density = 1/8000; // One particle per 8000 pixels
    const area = this.canvas.width * this.canvas.height;
    const particleCount = Math.floor(area * density);
    
    for (let i = 0; i < particleCount; i++) {
      const particle: Particle = {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        isNode: Math.random() < 0.3 // 30% chance of being a node
      };
      this.particles.push(particle);
    }
  }

  private drawParticle(particle: Particle) {
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
    this.ctx.fill();
  }

  private drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      const particle1 = this.particles[i];
      
      // Only draw connections from nodes
      if (!particle1.isNode) continue;

      // Connect to nearby particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const particle2 = this.particles[j];
        
        const dx = particle1.x - particle2.x;
        const dy = particle1.y - particle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.connectionDistance) {
          const opacity = (1 - distance / this.connectionDistance) * 0.15;
          this.ctx.beginPath();
          this.ctx.moveTo(particle1.x, particle1.y);
          this.ctx.lineTo(particle2.x, particle2.y);
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }

      // Mouse interaction
      const dx = this.mouseX - particle1.x;
      const dy = this.mouseY - particle1.y;
      const mouseDistance = Math.sqrt(dx * dx + dy * dy);

      if (mouseDistance < this.connectionDistance * 1.5) {
        const opacity = (1 - mouseDistance / (this.connectionDistance * 1.5)) * 0.3;
        this.ctx.beginPath();
        this.ctx.moveTo(particle1.x, particle1.y);
        this.ctx.lineTo(this.mouseX, this.mouseY);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();
      }
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw connections first
    this.drawConnections();

    // Then update and draw particles
    this.particles.forEach(particle => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Wrap around edges
      if (particle.x < 0) particle.x = this.canvas.width;
      if (particle.x > this.canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.canvas.height;
      if (particle.y > this.canvas.height) particle.y = 0;
      
      this.drawParticle(particle);
    });
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    this.canvas.remove();
  }
}

export function initParticleSystem() {
  const container = document.querySelector('.crypto-particles') as HTMLElement;
  if (container) {
    new ParticleSystem(container);
  }
}