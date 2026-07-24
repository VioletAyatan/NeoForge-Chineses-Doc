<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useData } from 'vitepress';

const props = defineProps<{
	code: string;
}>();

const container = ref<HTMLElement | null>(null);

const { isDark } = useData();

// 用于避免异步渲染覆盖较新的结果
let renderVersion = 0;

/**
 * Mermaid 预定义样式。
 *
 * 后续在 Markdown 中只需要写：
 *
 * class Entity,Projectile red;
 * class ItemFrame,Painting blue;
 *
 * 不需要再写 classDef。
 */
const presetClasses = {
	red: {
		light: 'fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:2px',
		dark: 'fill:#7f1d1d,stroke:#f87171,color:#fee2e2,stroke-width:2px',
	},
	blue: {
		light: 'fill:#dbeafe,stroke:#2563eb,color:#1e3a8a,stroke-width:2px',
		dark: 'fill:#1e3a8a,stroke:#60a5fa,color:#dbeafe,stroke-width:2px',
	},
	green: {
		light: 'fill:#dcfce7,stroke:#16a34a,color:#14532d,stroke-width:2px',
		dark: 'fill:#14532d,stroke:#4ade80,color:#dcfce7,stroke-width:2px',
	},
	yellow: {
		light: 'fill:#fef9c3,stroke:#ca8a04,color:#713f12,stroke-width:2px',
		dark: 'fill:#713f12,stroke:#facc15,color:#fef9c3,stroke-width:2px',
	},
	gray: {
		light: 'fill:#f3f4f6,stroke:#6b7280,color:#1f2937,stroke-width:2px',
		dark: 'fill:#374151,stroke:#9ca3af,color:#f3f4f6,stroke-width:2px',
	},
};

/**
 * 检查当前 Mermaid 代码是否已经定义了指定的 classDef。
 *
 * 同时支持：
 *
 * classDef red ...
 * classDef red,blue ...
 */
function hasClassDefinition(source: string, className: string): boolean {
	return source.split(/\r?\n/).some((line) => {
		const match = line.match(/^\s*classDef\s+([^\s]+)\s+/);

		if (!match) {
			return false;
		}

		const classNames = match[1].split(',');

		return classNames.includes(className);
	});
}

/**
 * 向支持 classDef 的 Mermaid 图表中自动注入预定义样式。
 */
function injectPresetClasses(source: string): string {
	/*
	 * 目前主要为 Flowchart 和 Class Diagram 注入。
	 *
	 * graph 是 flowchart 的别名。
	 * 使用多行匹配，因此即使前面存在 frontmatter，
	 * 也可以找到图表声明。
	 */
	const supportsClassDef = /^\s*(?:graph|flowchart|classDiagram)\b/m.test(source);

	if (!supportsClassDef) {
		return source;
	}

	const theme = isDark.value ? 'dark' : 'light';

	const definitions = Object.entries(presetClasses)
		.filter(([className]) => {
			/*
			 * 当前图表已经自己定义同名 classDef 时，
			 * 不注入预设样式，允许单张图覆盖全局设置。
			 */
			return !hasClassDefinition(source, className);
		})
		.map(([className, styles]) => {
			return `classDef ${className} ${styles[theme]};`;
		});

	if (definitions.length === 0) {
		return source;
	}

	return [source.trimEnd(), '', ...definitions].join('\n');
}

async function renderDiagram() {
	if (!container.value) {
		return;
	}

	const currentVersion = ++renderVersion;

	container.value.classList.remove('mermaid-error');
	container.value.textContent = '';

	try {
		/*
		 * 只在客户端加载 Mermaid。
		 * 避免 VitePress 构建阶段因为 document/window 不存在而报错。
		 */
		const { default: mermaid } = await import('mermaid');

		mermaid.initialize({
			startOnLoad: false,
			// 跟随 VitePress 明暗主题
			theme: isDark.value ? 'dark' : 'default',
			darkMode: isDark.value,
			// 文档内容可能来自外部时，建议保持 strict
			securityLevel: 'strict',
		});

		const id = ['mermaid', Date.now(), Math.random().toString(36).slice(2)].join('-');

		const originalSource = decodeURIComponent(props.code);

		// 自动补充预定义 classDef
		const source = injectPresetClasses(originalSource);

		const { svg, bindFunctions } = await mermaid.render(id, source);

		// 如果当前渲染已经过期，则放弃更新 DOM
		if (currentVersion !== renderVersion || !container.value) {
			return;
		}

		container.value.innerHTML = svg;

		// Mermaid 中存在交互事件时需要绑定
		bindFunctions?.(container.value);
	} catch (error) {
		/*
		 * 旧渲染发生异常时，也不能覆盖较新的渲染结果。
		 */
		if (currentVersion !== renderVersion || !container.value) {
			return;
		}

		container.value.classList.add('mermaid-error');
		container.value.textContent = error instanceof Error ? error.message : String(error);
	}
}

onMounted(renderDiagram);

// Mermaid 源码或 VitePress 明暗主题变化时重新渲染
watch([() => props.code, isDark], renderDiagram);
</script>

<template>
	<div ref="container" class="mermaid-diagram" />
</template>

<style scoped>
.mermaid-diagram {
	display: flex;
	justify-content: center;
	width: 100%;
	margin: 20px 0;
	overflow-x: auto;
}

.mermaid-diagram :deep(svg) {
	display: block;
	max-width: 100%;
	height: auto;
}

.mermaid-error {
	display: block;
	padding: 16px;
	overflow-x: auto;
	color: var(--vp-c-danger-1);
	white-space: pre-wrap;
	background: var(--vp-c-danger-soft);
	border-radius: 8px;
}
</style>
