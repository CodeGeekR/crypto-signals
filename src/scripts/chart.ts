import { gsap } from "gsap";

// Lazy load ScrollTrigger solo cuando sea necesario - 20KB savings iniciales
let ScrollTrigger: any = null;

interface Point {
  x: number;
  y: number;
}

class PerformanceChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private signalPoints: Point[] = [];
  private marketPoints: Point[] = [];
  private progress = 0;
  private isAnimating = false;
  private loadingElement: HTMLElement | null = null;

  // Responsive padding based on screen size
  private get padding() {
    const width = this.canvas.clientWidth;
    if (width < 640) { // Mobile
      return { top: 15, right: 25, bottom: 30, left: 25 };
    } else if (width < 1024) { // Tablet
      return { top: 20, right: 35, bottom: 35, left: 35 };
    } else { // Desktop
      return { top: 25, right: 40, bottom: 40, left: 40 };
    }
  }

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.loadingElement = container.querySelector('.chart-loading');
    this.setupCanvas(container);
    this.generatePoints();
    this.initAnimation();
  }

  private setupCanvas(container: HTMLElement) {
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.borderRadius = '0.75rem';
    container.appendChild(this.canvas);
    this.resizeCanvas();
    
    // Debounced resize handler for better performance
    let resizeTimeout: NodeJS.Timeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.resizeCanvas(), 150);
    });
  }

  private resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.generatePoints();
    if (this.progress > 0) {
      this.draw();
    }
  }

  private generatePoints() {
    this.signalPoints = [];
    this.marketPoints = [];
    
    const steps = 120; // More points for smoother curve on all devices
    const padding = this.padding;
    const minY = padding.top;
    const maxY = this.canvas.clientHeight - padding.bottom;
    const chartWidth = this.canvas.clientWidth - (padding.left + padding.right);

    // Generate our signals performance (higher performance)
    let currentSignalY = maxY - (maxY - minY) * 0.15; // Start at 15% up
    let signalTrend = 0;

    // Generate market performance (lower performance for comparison)
    let currentMarketY = maxY - (maxY - minY) * 0.25; // Start at 25% up
    let marketTrend = 0;

    for (let i = 0; i <= steps; i++) {
      const x = padding.left + (i / steps) * chartWidth;
      const progress = i / steps;
      
      // Our signals (89.7% win rate, higher volatility but better trend)
      const signalWinProbability = 0.897;
      const isSignalWin = Math.random() < signalWinProbability;
      
      if (isSignalWin) {
        signalTrend += Math.random() * 0.12; // Stronger positive trend
      } else {
        signalTrend -= Math.random() * 0.06; // Smaller losses
      }
      
      // Market performance (60% win rate, lower volatility)
      const marketWinProbability = 0.60;
      const isMarketWin = Math.random() < marketWinProbability;
      
      if (isMarketWin) {
        marketTrend += Math.random() * 0.05; // Moderate positive trend
      } else {
        marketTrend -= Math.random() * 0.04; // Moderate losses
      }
      
      // Add realistic market volatility
      const volatility = Math.sin(progress * Math.PI * 6) * (this.canvas.clientWidth < 640 ? 8 : 12);
      
      // Calculate signal Y position
      let signalY = currentSignalY - (signalTrend * 18 + volatility * 0.8);
      signalY = Math.max(minY, Math.min(maxY, signalY));
      
      // Apply exponential growth trend for signals
      const signalTrendLine = maxY - (Math.pow(progress, 1.1) * 0.85 * (maxY - minY));
      signalY = (signalY + signalTrendLine) / 2;
      
      // Calculate market Y position
      let marketY = currentMarketY - (marketTrend * 12 + volatility * 0.6);
      marketY = Math.max(minY, Math.min(maxY, marketY));
      
      // Apply moderate growth trend for market
      const marketTrendLine = maxY - (Math.pow(progress, 1.5) * 0.4 * (maxY - minY));
      marketY = (marketY + marketTrendLine) / 2;
      
      currentSignalY = signalY;
      currentMarketY = marketY;
      
      this.signalPoints.push({ x, y: signalY });
      this.marketPoints.push({ x, y: marketY });
    }

    // Ensure signals end higher than market
    const lastSignal = this.signalPoints[this.signalPoints.length - 1];
    const lastMarket = this.marketPoints[this.marketPoints.length - 1];
    
    if (lastSignal.y > lastMarket.y - 20) {
      // Adjust final points to ensure clear performance difference
      const adjustment = (lastMarket.y - lastSignal.y + 30) / 10;
      this.signalPoints.slice(-10).forEach((point, i) => {
        point.y = Math.max(point.y - adjustment * (i + 1), minY);
      });
    }
  }

  private async initAnimation() {
    // Usar Intersection Observer como alternativa lightweight
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.isAnimating) {
            this.animate();
            observer.unobserve(entry.target);
          }
        });
      }, {
        root: null,
        rootMargin: '20% 0px',
        threshold: 0.1
      });
      
      observer.observe(this.canvas);
    } else {
      // Fallback: cargar ScrollTrigger solo si es necesario
      if (!ScrollTrigger) {
        try {
          const { ScrollTrigger: ST } = await import("gsap/ScrollTrigger");
          ScrollTrigger = ST;
          gsap.registerPlugin(ScrollTrigger);
        } catch (error) {
          // Fallback sin ScrollTrigger
          setTimeout(() => this.animate(), 1000);
          return;
        }
      }
      
      ScrollTrigger.create({
        trigger: this.canvas,
        start: "top 80%",
        onEnter: () => {
          if (!this.isAnimating) {
            this.animate();
          }
        }
      });
    }
  }

  private animate() {
    this.isAnimating = true;
    
    // Hide loading state
    if (this.loadingElement) {
      gsap.to(this.loadingElement, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
      });
    }

    gsap.to(this, {
      progress: 1,
      duration: 3,
      ease: "power2.out",
      onUpdate: () => this.draw(),
      onComplete: () => {
        this.isAnimating = false;
        // Remove loading element completely
        if (this.loadingElement) {
          this.loadingElement.style.display = 'none';
        }
      }
    });
  }

  private drawGrid() {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    const padding = this.padding;
    
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    // Responsive grid lines
    const horizontalLines = width < 640 ? 3 : 4;
    const verticalLines = width < 640 ? 4 : 6;
    
    // Draw horizontal grid lines
    for (let i = 0; i <= horizontalLines; i++) {
      const y = padding.top + (i * (height - padding.top - padding.bottom) / horizontalLines);
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(width - padding.right, y);
    }
    
    // Draw vertical grid lines
    for (let i = 0; i <= verticalLines; i++) {
      const x = padding.left + (i * (width - padding.left - padding.right) / verticalLines);
      this.ctx.moveTo(x, padding.top);
      this.ctx.lineTo(x, height - padding.bottom);
    }
    
    this.ctx.stroke();
  }

  private drawLine(points: Point[], color: string, fillColor: string, lineWidth: number = 2) {
    const { clientHeight: height } = this.canvas;
    const padding = this.padding;
    
    // Calculate visible points based on progress
    const visiblePoints = points.filter((_, i) => 
      i <= Math.floor(points.length * this.progress)
    );

    if (visiblePoints.length < 2) return;

    // Draw gradient area
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.beginPath();
    this.ctx.moveTo(visiblePoints[0].x, height - padding.bottom);
    
    // Use curve for smoother line
    for (let i = 0; i < visiblePoints.length - 1; i++) {
      const xc = (visiblePoints[i].x + visiblePoints[i + 1].x) / 2;
      const yc = (visiblePoints[i].y + visiblePoints[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(visiblePoints[i].x, visiblePoints[i].y, xc, yc);
    }
    
    if (visiblePoints.length > 1) {
      const lastPoint = visiblePoints[visiblePoints.length - 1];
      const secondLastPoint = visiblePoints[visiblePoints.length - 2];
      this.ctx.quadraticCurveTo(
        secondLastPoint.x,
        secondLastPoint.y,
        lastPoint.x,
        lastPoint.y
      );
    }

    this.ctx.lineTo(visiblePoints[visiblePoints.length - 1].x, height - padding.bottom);
    this.ctx.closePath();
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Draw line with shadow
    this.ctx.shadowColor = color + '80';
    this.ctx.shadowBlur = this.canvas.clientWidth < 640 ? 6 : 10;
    this.ctx.beginPath();
    this.ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
    
    // Draw smooth line
    for (let i = 0; i < visiblePoints.length - 1; i++) {
      const xc = (visiblePoints[i].x + visiblePoints[i + 1].x) / 2;
      const yc = (visiblePoints[i].y + visiblePoints[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(visiblePoints[i].x, visiblePoints[i].y, xc, yc);
    }
    
    if (visiblePoints.length > 1) {
      const lastPoint = visiblePoints[visiblePoints.length - 1];
      const secondLastPoint = visiblePoints[visiblePoints.length - 2];
      this.ctx.quadraticCurveTo(
        secondLastPoint.x,
        secondLastPoint.y,
        lastPoint.x,
        lastPoint.y
      );
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.stroke();
    this.ctx.shadowColor = 'transparent';

    // Draw points (less frequent on mobile)
    const pointInterval = this.canvas.clientWidth < 640 ? 15 : 10;
    visiblePoints.forEach((point, i) => {
      if (i % pointInterval === 0 || i === visiblePoints.length - 1) {
        const pointSize = this.canvas.clientWidth < 640 ? 3 : 4;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, pointSize, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#0a0e27';
        this.ctx.lineWidth = 2;
        this.ctx.fill();
        this.ctx.stroke();
      }
    });
  }

  private draw() {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    this.drawGrid();
    
    // Draw market performance first (behind)
    this.drawLine(
      this.marketPoints, 
      '#6b7280', 
      'rgba(107, 114, 128, 0.1)', 
      this.canvas.clientWidth < 640 ? 1.5 : 2
    );
    
    // Draw our signals performance (in front)
    this.drawLine(
      this.signalPoints, 
      '#00d4aa', 
      'rgba(0, 212, 170, 0.15)', 
      this.canvas.clientWidth < 640 ? 2 : 2.5
    );
  }
}

export function initPerformanceChart() {
  const container = document.querySelector('.performance-chart') as HTMLElement;
  if (container) {
    new PerformanceChart(container);
  }
}