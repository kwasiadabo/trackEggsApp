import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const API_URL = env.VITE_API_URL || 'http://localhost:5000';

	return {
		plugins: [
			react(),
			VitePWA({
				registerType: 'autoUpdate',
				includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
				manifest: {
					name: 'EggTrack',
					short_name: 'EggTrack',
					description: 'Egg Distribution & Sales Management System',
					theme_color: '#d97706',
					background_color: '#fafaf9',
					display: 'standalone',
					scope: '/',
					start_url: '/',
					icons: [
						{
							src: 'pwa-192x192.png',
							sizes: '192x192',
							type: 'image/png',
						},
						{
							src: 'pwa-512x512.png',
							sizes: '512x512',
							type: 'image/png',
						},
						{
							src: 'pwa-512x512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'any maskable',
						},
					],
				},
				workbox: {
					globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
				},
			}),
		],
		server: {
			port: 5173,
			proxy: {
				'/api': {
					target: API_URL,
					changeOrigin: true,
				},
			},
		},
	};
});
