const easeOutExpo = [0.22, 1, 0.36, 1];

export const springTransition = {
  type: "spring",
  stiffness: 150,
  damping: 18,
  mass: 0.95,
};

export const softSpring = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 1,
};

export const pageTransition = {
  initial: { opacity: 0, y: 20, scale: 0.985, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -14, scale: 0.992, filter: "blur(8px)" },
  transition: { duration: 0.46, ease: easeOutExpo },
};

export const routeShellTransition = {
  initial: { opacity: 0, y: 18, scale: 0.992 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 1.003 },
  transition: { duration: 0.38, ease: easeOutExpo },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.06,
      staggerChildren: 0.08,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: easeOutExpo },
  },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.42, ease: easeOutExpo },
};

export const hoverLift = {
  y: -6,
  scale: 1.01,
  transition: softSpring,
};

export const floatingAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: "easeInOut",
  },
};
