export const animations = {
  durations: {
    fast: 150,
    medium: 250,
    slow: 350
  },
  presets: {
    bounce: {
      damping: 15,
      mass: 0.8,
      stiffness: 120
    },
    smooth: {
      damping: 20,
      mass: 1,
      stiffness: 100
    }
  }
} as const;
