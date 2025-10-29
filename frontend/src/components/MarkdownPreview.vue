<template>
  <div class="markdown-body" v-html="renderedHtml"></div>
</template>

<script setup>
import { computed } from "vue";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

// 引入 GitHub 风格的 Markdown 样式和代码高亮主题
import "github-markdown-css/github-markdown-light.css";
import "highlight.js/styles/atom-one-dark.css";

// 创建 marked 实例，配置代码高亮
const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

// 接收 Markdown 内容
const props = defineProps({
  content: {
    type: String,
    default: '# Hello Markdown\n\n```js\nconsole.log("Hello, world!")\n```',
  },
});

// 转换为 HTML
const renderedHtml = computed(() => marked.parse(props.content));
</script>

<style scoped>
.markdown-body {
  margin: -10px -14px;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  line-height: 1.6;
  background: linear-gradient(
    135deg,
    rgba(255, 215, 0, 0.12),
    rgba(255, 0, 128, 0.08)
  );
}
</style>
