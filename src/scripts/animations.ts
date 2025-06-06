import { gsap } from "gsap";

// Lazy load ScrollTrigger solo para efectos avanzados - 20KB savings
let ScrollTrigger: any = null;

export class AnimationController {
  private tl: gsap.core.Timeline;

  constructor() {
    this.tl = gsap.timeline({ delay: 0.5 });
    this.initializeAnimations();
  }

  initializeAnimations() {
    this.heroAnimations();
    // ScrollTriggers solo si el usuario ya está interactuando
    this.setupScrollTriggersLazy();
  }

  heroAnimations() {
    // Set initial states
    gsap.set([".hero-badge-container", ".hero-title", ".hero-subtitle", ".hero-description", ".hero-metrics", ".hero-cta"], {
      opacity: 0,
      y: 30
    });

    this.tl
      .to(".hero-badge-container", {
        duration: 1,
        opacity: 1,
        y: 0,
        ease: "power2.out"
      })
      .to(".hero-title", {
        duration: 1.5,
        opacity: 1,
        y: 0,
        ease: "power3.out"
      }, "-=0.5")
      .to(".hero-subtitle", {
        duration: 1,
        opacity: 1,
        y: 0,
        ease: "power2.out"
      }, "-=0.8")
      .to(".hero-description", {
        duration: 1.2,
        opacity: 1,
        y: 0,
        ease: "power2.out"
      }, "-=0.6")
      .to(".hero-metrics", {
        duration: 0.8,
        opacity: 1,
        y: 0,
        stagger: 0.2,
        ease: "back.out(1.7)"
      }, "-=0.4")
      .to(".hero-cta", {
        duration: 1,
        opacity: 1,
        y: 0,
        scale: 1,
        ease: "elastic.out(1, 0.75)"
      }, "-=0.3");
  }

  async setupScrollTriggersLazy() {
    // Solo cargar ScrollTrigger si realmente es necesario
    try {
      if (!ScrollTrigger) {
        const { ScrollTrigger: ST } = await import("gsap/ScrollTrigger");
        ScrollTrigger = ST;
        gsap.registerPlugin(ScrollTrigger);
      }
      
      // Efecto parallax suave en el título
      gsap.to(".hero-title", {
        yPercent: -50,
        ease: "none",
        scrollTrigger: {
          trigger: "#hero",
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    } catch (error) {
      // Sin ScrollTrigger, las animaciones CSS son suficientes
      console.log("ScrollTrigger no disponible, usando animaciones CSS");
    }
  }
}

export function initHeroAnimations() {
  new AnimationController();
}