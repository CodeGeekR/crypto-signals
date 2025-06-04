import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Point {
  x: number;
  y: number;
}

class PerformanceChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private points: Point[] = [];
  private progress = 0;
  private padding = { top: 20, right: 40, bottom: 20, left: 40 };

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.setupCanvas(container);
    this.generatePoints();
    this.initAnimation();
  }

  private setupCanvas(container: HTMLElement) {
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.generatePoints();
  }

  private generatePoints() {
    this.points = [];
    const steps = 100; // More points for smoother curve
    const maxGrowth = 0.75; // Maximum height percentage
    const minY = this.padding.top;
    const maxY = this.canvas.height - this.padding.bottom;
    const chartWidth = this.canvas.width - (this.padding.left + this.padding.right);

    let currentY = maxY - (maxY - minY) * 0.2; // Start at 20% up
    let trend = 0;

    for (let i = 0; i <= steps; i++) {
      const x = this.padding.left + (i / steps) * chartWidth;
      const progress = i / steps;
      
      // Simulate trading volatility with win rate influence
      const winProbability = 0.897; // 89.7% win rate
      const isWin = Math.random() < winProbability;
      
      // Calculate trend changes
      if (isWin) {
        trend += Math.random() * 0.1; // Positive trend
      } else {
        trend -= Math.random() * 0.08; // Smaller losses
      }
      
      // Add market volatility
      const volatility = Math.sin(progress * Math.PI * 8) * 10;
      
      // Calculate new Y position
      let y = currentY - (trend * 15 + volatility);
      
      // Ensure we stay within bounds while maintaining overall upward trend
      y = Math.max(minY, Math.min(maxY, y));
      
      // Apply exponential growth trend
      const trendLine = maxY - (Math.pow(progress, 1.2) * maxGrowth * (maxY - minY));
      y = (y + trendLine) / 2;
      
      currentY = y;
      this.points.push({ x, y });
    }

    // Ensure ending is higher than start
    const lastPoint = this.points[this.points.length - 1];
    const firstPoint = this.points[0];
    if (lastPoint.y > firstPoint.y) {
      // Adjust final points to ensure upward trend
      const lastPoints = this.points.slice(-5);
      lastPoints.forEach((point, i) => {
        point.y = Math.max(point.y - (i * 5), minY);
      });
    }
  }

  private initAnimation() {
    ScrollTrigger.create({
      trigger: this.canvas,
      start: "top 80%",
      onEnter: () => this.animate()
    });
  }

  private animate() {
    gsap.to(this, {
      progress: 1,
      duration: 2.5,
      ease: "power2.out",
      onUpdate: () => this.draw()
    });
  }

  private drawGrid() {
    const { width, height } = this.canvas;
    
    // Draw horizontal grid lines
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
      const y = this.padding.top + (i * (height - this.padding.top - this.padding.bottom) / 4);
      this.ctx.moveTo(this.padding.left, y);
      this.ctx.lineTo(width - this.padding.right, y);
    }
    
    // Draw vertical grid lines
    for (let i = 0; i <= 6; i++) {
      const x = this.padding.left + (i * (width - this.padding.left - this.padding.right) / 6);
      this.ctx.moveTo(x, this.padding.top);
      this.ctx.lineTo(x, height - this.padding.bottom);
    }
    
    this.ctx.stroke();
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    this.drawGrid();
    
    // Calculate visible points based on progress
    const visiblePoints = this.points.filter((_, i) => 
      i <= Math.floor(this.points.length * this.progress)
    );

    if (visiblePoints.length < 2) return;

    // Draw gradient area
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 212, 170, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 212, 170, 0)');

    this.ctx.beginPath();
    this.ctx.moveTo(visiblePoints[0].x, height - this.padding.bottom);
    
    // Use curve for smoother line
    let i: number;
    for (i = 0; i < visiblePoints.length - 1; i++) {
      const xc = (visiblePoints[i].x + visiblePoints[i + 1].x) / 2;
      const yc = (visiblePoints[i].y + visiblePoints[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(visiblePoints[i].x, visiblePoints[i].y, xc, yc);
    }
    // Handle last point
    this.ctx.quadraticCurveTo(
      visiblePoints[i-1].x,
      visiblePoints[i-1].y,
      visiblePoints[i].x,
      visiblePoints[i].y
    );

    this.ctx.lineTo(visiblePoints[visiblePoints.length - 1].x, height - this.padding.bottom);
    this.ctx.closePath();
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Draw line with shadow
    this.ctx.shadowColor = 'rgba(0, 212, 170, 0.5)';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
    
    // Draw smooth line
    for (i = 0; i < visiblePoints.length - 1; i++) {
      const xc = (visiblePoints[i].x + visiblePoints[i + 1].x) / 2;
      const yc = (visiblePoints[i].y + visiblePoints[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(visiblePoints[i].x, visiblePoints[i].y, xc, yc);
    }
    // Handle last point
    this.ctx.quadraticCurveTo(
      visiblePoints[i-1].x,
      visiblePoints[i-1].y,
      visiblePoints[i].x,
      visiblePoints[i].y
    );

    this.ctx.strokeStyle = '#00d4aa';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.shadowColor = 'transparent';

    // Draw points
    visiblePoints.forEach((point, i) => {
      if (i % 10 === 0 || i === visiblePoints.length - 1) {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#00d4aa';
        this.ctx.strokeStyle = '#0a0e27';
        this.ctx.lineWidth = 2;
        this.ctx.fill();
        this.ctx.stroke();
      }
    });
  }
}

export function initPerformanceChart() {
  const container = document.querySelector('.performance-chart') as HTMLElement;
  if (container) {
    new PerformanceChart(container);
  }
}