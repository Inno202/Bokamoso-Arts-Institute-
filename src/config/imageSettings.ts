
/**
 * Image Management Configuration
 * Set 'isGrayscale' to true/false to enable or disable the effect globally or per section.
 */
export const ImageManagement = {
  sections: {
    hero: {
      isGrayscale: true,
      brightness: 'secondary' // technical choice for contrast
    },
    philosophy: {
      isGrayscale: true,
    },
    programs: {
      isGrayscale: true,
    },
    traditions: {
      isGrayscale: false, // Example of enabling color by default for traditions
    }
  },
  global: {
    transitionDuration: 'duration-1000',
    hoverEffect: true
  }
};
