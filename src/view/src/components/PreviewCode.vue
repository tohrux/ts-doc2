<template>
  <pre style="tab-size: 0">
    <code :class="'language-' + type" v-html="Prism.highlight(code, Prism.languages[type], type)"></code>
 </pre>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import Prism from "prismjs";

const props = defineProps({
  code: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "html",
  },
  isShowlineNumbers: {
    type: Boolean,
    default: false,
  },
});

onMounted(() => {
  Prism.highlightAll(); //切换菜单重新渲染
});
</script>
