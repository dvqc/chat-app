import { type Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import radixPlugin from 'tailwindcss-radix'
import { publicPreset } from './app/routes/public+/tailwind-preset'
import { extendedTheme } from './app/utils/extended-theme.ts'

export default {
	content: ['./app/**/*.{ts,tsx,jsx,js}'],
	darkMode: 'class',
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: extendedTheme,
	},
	presets: [publicPreset],
	plugins: [animatePlugin, radixPlugin],
} satisfies Config
