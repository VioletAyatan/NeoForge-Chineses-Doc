import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

import MermaidDiagram from './components/MermaidDiagram.vue';

export default {
	extends: DefaultTheme,

	enhanceApp({ app }) {
		app.component('MermaidDiagram', MermaidDiagram);
	},
} satisfies Theme;
