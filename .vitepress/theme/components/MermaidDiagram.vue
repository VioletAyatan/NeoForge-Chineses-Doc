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
			// 文档内容可能来自外部时，建议保持 strict
			securityLevel: 'strict',
		});

		const id = ['mermaid', Date.now(), Math.random().toString(36).slice(2)].join('-');

		const source = decodeURIComponent(props.code);

		const { svg, bindFunctions } = await mermaid.render(id, source);

		// 如果当前渲染已经过期，则放弃更新 DOM
		if (currentVersion !== renderVersion || !container.value) {
			return;
		}

		container.value.innerHTML = svg;

		// Mermaid 中存在交互事件时需要绑定
		bindFunctions?.(container.value);
	} catch (error) {
		if (!container.value) {
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
