export class HeaderController {
  private mobileMenuBtn: HTMLElement | null = null;
  private mobileMenu: HTMLElement | null = null;
  private header: HTMLElement | null = null;
  private isMenuOpen: boolean = false;

  constructor() {
    // Defer non-critical initializations
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  private init() {
    this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
    this.mobileMenu = document.getElementById('mobile-menu');
    this.header = document.querySelector('.header-main');

    this.setupEventListeners(); // Critical: menu interaction
    this.setupSignupButtons();   // Critical: primary CTA

    // Defer non-critical scroll-related functionalities
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        this.setupScrollEffect();
        this.setupSmoothScrolling();
      });
    } else {
      setTimeout(() => {
        this.setupScrollEffect();
        this.setupSmoothScrolling();
      }, 300);
    }
  }

  private setupEventListeners() {
    // Mobile menu toggle
    this.mobileMenuBtn?.addEventListener('click', () => {
      this.toggleMobileMenu();
    });

    // Close menu when clicking navigation links
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        this.closeMobileMenu();
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isMenuOpen && 
          !this.mobileMenu?.contains(e.target as Node) && 
          !this.mobileMenuBtn?.contains(e.target as Node)) {
        this.closeMobileMenu();
      }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMenuOpen) {
        this.closeMobileMenu();
      }
    });

    // Handle resize
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024 && this.isMenuOpen) {
        this.closeMobileMenu();
      }
    });
  }

  private toggleMobileMenu() {
    if (this.isMenuOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  private openMobileMenu() {
    this.isMenuOpen = true;
    this.mobileMenu?.classList.add('open');
    this.mobileMenuBtn?.setAttribute('aria-expanded', 'true');
    
    // Toggle icons
    const menuIcon = this.mobileMenuBtn?.querySelector('.menu-icon');
    const closeIcon = this.mobileMenuBtn?.querySelector('.close-icon');
    menuIcon?.classList.add('hidden');
    closeIcon?.classList.remove('hidden');

    // Focus trap
    this.trapFocus();
  }

  private closeMobileMenu() {
    this.isMenuOpen = false;
    this.mobileMenu?.classList.remove('open');
    this.mobileMenuBtn?.setAttribute('aria-expanded', 'false');
    
    // Toggle icons
    const menuIcon = this.mobileMenuBtn?.querySelector('.menu-icon');
    const closeIcon = this.mobileMenuBtn?.querySelector('.close-icon');
    menuIcon?.classList.remove('hidden');
    closeIcon?.classList.add('hidden');
  }

  private trapFocus() {
    const focusableElements = this.mobileMenu?.querySelectorAll(
      'a[href], button, [tabindex]:not([tabindex="-1"])'
    );
    
    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    firstElement.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Cleanup function
    const cleanup = () => {
      document.removeEventListener('keydown', handleTabKey);
    };

    // Store cleanup function for later use
    (this.mobileMenu as any).focusTrapCleanup = cleanup;
  }

  private setupScrollEffect() {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 100) {
        this.header?.classList.add('scrolled');
      } else {
        this.header?.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  private setupSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (!href) return;

        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          const headerHeight = this.header?.offsetHeight || 0;
          const targetPosition = targetElement.offsetTop - headerHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  private setupSignupButtons() {
    // Handle desktop signup button
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
      signupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.scrollToContact();
      });
    }

    // Handle mobile signup button with retry logic
    const setupMobileButton = () => {
      const mobileSignupBtn = document.querySelector('.mobile-signup-btn');
      if (mobileSignupBtn) {
        mobileSignupBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.scrollToContact();
          this.closeMobileMenu();
        });
      } else {
        // Retry after a short delay in case the DOM isn't fully loaded
        setTimeout(setupMobileButton, 100);
      }
    };

    setupMobileButton();
  }

  private scrollToContact() {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      const headerHeight = this.header?.offsetHeight || 80;
      const targetPosition = contactSection.offsetTop - headerHeight - 20; // Extra padding for better UX

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // Track button click for analytics
      if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'signup_click', {
          event_category: 'engagement',
          event_label: 'header_signup',
          value: 1,
        });
      }
    } else {
      // Fallback: try to find the section by querySelector
      const fallbackSection = document.querySelector('[id="contact"], section[id*="contact"]');
      if (fallbackSection) {
        fallbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}

export function initHeader() {
  new HeaderController();
} 