/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Custom colors that complement your gradient scheme
        'primary': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        'secondary': {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        // Gradient colors
        'gradient': {
          'primary-start': '#8b5cf6',
          'primary-end': '#ec4899',
          'secondary-start': '#6366f1',
          'secondary-end': '#8b5cf6',
          'accent-start': '#10b981',
          'accent-end': '#3b82f6',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'gradient-accent': 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow': '0 0 50px rgba(139, 92, 246, 0.3)',
        'glow-lg': '0 0 100px rgba(139, 92, 246, 0.4)',
        'glow-sm': '0 0 20px rgba(139, 92, 246, 0.2)',
        'card': '0 10px 30px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 20px 60px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'slide-in-left': 'slideInLeft 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-20px)',
          },
        },
        gradient: {
          '0%': {
            'background-position': '0% 50%',
          },
          '50%': {
            'background-position': '100% 50%',
          },
          '100%': {
            'background-position': '0% 50%',
          },
        },
        fadeInUp: {
          from: {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInRight: {
          from: {
            opacity: '0',
            transform: 'translateX(30px)',
          },
          to: {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        slideInLeft: {
          from: {
            opacity: '0',
            transform: 'translateX(-30px)',
          },
          to: {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        scaleIn: {
          from: {
            opacity: '0',
            transform: 'scale(0.9)',
          },
          to: {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '120': '30rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [
    // Custom plugin for your utility classes
    function({ addUtilities, addComponents }) {
      const newUtilities = {
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.gradient-text': {
          'background': 'linear-gradient(to right, rgb(196 181 253), rgb(251 113 133))',
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          'color': 'transparent',
        },
        '.glass-effect': {
          'background': 'rgba(255, 255, 255, 0.05)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.3)',
        },
        '.glow-effect': {
          'box-shadow': '0 0 20px rgba(139, 92, 246, 0.3)',
        },
        '.glow-effect:hover': {
          'box-shadow': '0 0 30px rgba(139, 92, 246, 0.5)',
        },
      }
      addUtilities(newUtilities)
      
      // Add component classes
      const newComponents = {
        '.btn-primary': {
          '@apply bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg': {},
        },
        '.btn-secondary': {
          '@apply border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white font-semibold py-3 px-6 rounded-full transition-all duration-200': {},
        },
        '.card': {
          '@apply bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-200': {},
        },
        '.input-field': {
          '@apply w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200': {},
        },
      }
      addComponents(newComponents)
    },
  ],
}