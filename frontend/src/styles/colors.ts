// Centralized color palette for SafeRoute
// Use these colors in Tailwind config or inline styles

const colors = {
  brand: {
    900: '#213A57',
    800: '#0B6477',
    600: '#14919B',
    500: '#0AD1C8', // DEFAULT
    400: '#45DFB1',
    300: '#80ED99',
    DEFAULT: '#0AD1C8',
  },
  primary: {
    DEFAULT: "#2563EB", // Blue-600
    light: "#3B82F6",   // Blue-500
    dark: "#1E40AF",    // Blue-800
  },
  secondary: {
    DEFAULT: "#FACC15", // Yellow-400
    light: "#FDE047",   // Yellow-300
    dark: "#CA8A04",    // Yellow-600
  },
  success: {
    DEFAULT: "#16A34A", // Green-600
    light: "#22C55E",   // Green-500
    dark: "#15803D",    // Green-800
  },
  danger: {
    DEFAULT: "#DC2626", // Red-600
    light: "#EF4444",   // Red-500
    dark: "#991B1B",    // Red-800
  },
  neutral: {
    light: "#F3F4F6",   // Gray-100
    DEFAULT: "#9CA3AF", // Gray-400
    dark: "#374151",    // Gray-700
  },
};

export default colors;
