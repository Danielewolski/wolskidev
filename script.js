document.addEventListener('DOMContentLoaded', () => {
  // Initialize all components
  initTypingEffect();
  initMobileMenu();
  initSmoothScroll();
  initTabs();
  initContactForm();
  initScrollAnimations();
  initNavbarScroll();
});

/**
 * Typing Effect for Hero Section
 */
function initTypingEffect() {
  const typingElement = document.getElementById('typingText');
  if (!typingElement) return;

  const texts = [
    'Front-End Web Developer',

  ];
  
  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  const typingSpeed = 100;
  const deletingSpeed = 50;
  const pauseTime = 2000;

  function type() {
    const currentText = texts[textIndex];
    
    if (isDeleting) {
      typingElement.textContent = currentText.substring(0, charIndex - 1);
      charIndex--;
    } else {
      typingElement.textContent = currentText.substring(0, charIndex + 1);
      charIndex++;
    }

    let timeout = isDeleting ? deletingSpeed : typingSpeed;

    if (!isDeleting && charIndex === currentText.length) {
      timeout = pauseTime;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      timeout = 500;
    }

    setTimeout(type, timeout);
  }

  type();
}

/**
 * Mobile Menu Toggle
 */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (!menuBtn || !mobileMenu) return;

  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    menuBtn.classList.toggle('active');
  });

  // Close menu when clicking a link
  const menuLinks = mobileMenu.querySelectorAll('.nav-link');
  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('active');
      menuBtn.classList.remove('active');
    });
  });
}

/**
 * Smooth Scrolling for Anchor Links
 */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = link.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Tabs for Experience Section
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

/**
 * Contact Form Handling
 */
function initContactForm() {
  const form = document.getElementById('contactForm');
  
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message')
    };

    // Demo mode
    console.log('Form submitted:', data);
    
    alert(`Grazie ${data.name}! Il tuo messaggio è stato inviato.`);
    form.reset();
  });
}

/**
 * Scroll Animations (Intersection Observer)
 */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll(
    '.skills-card, .timeline-item, .contact-item, .stat-item'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        entry.target.style.animation = 'slideUp 0.6s ease forwards';
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    observer.observe(el);
  });
}

/**
 * Navbar Background on Scroll
 */
function initNavbarScroll() {
  const navbar = document.getElementById('navigation');
  
  if (!navbar) return;

  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
      navbar.style.background = 'hsla(222, 47%, 6%, 0.95)';
    } else {
      navbar.style.background = 'hsla(222, 47%, 6%, 0.8)';
    }

    lastScroll = currentScroll;
  });
}

/**
 * Update Active Navigation Link on Scroll
 */
function initActiveNavOnScroll() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPosition = window.pageYOffset + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}
