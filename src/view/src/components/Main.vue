<script setup lang="ts">
import { meta } from "../../meta";
import { useRoute } from "vue-router";
import { watch, ref } from "vue";
import PreviewCode from "./PreviewCode.vue";
import {
  revertEscapeCharacter,
  booleanHandler,
  paramsCommentsHandler,
  paramsTypeHandler,
} from "../utils/index";

const route = useRoute();

function goAnchor(selector: string) {
  document.querySelector("#" + selector)?.scrollIntoView({ behavior: "smooth" });
}

let targetClass = ref(meta?.[0]);

watch(
  () => route.fullPath,
  (v) => {
    targetClass.value =
      meta.find((v) => v.className === route.params.className) || meta?.[0];
    if (route.hash) {
      goAnchor(route.hash.slice(1));
    }
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="meta.length" class="theme">
    <aside class="sidebar">
      <ul class="sidebar-links">
        <li v-for="c in meta" class="sidebar-link">
          <router-link :class="$route.params.className === c.className ? 'sidebar-link-active ' : ''"
            :to="'/doc/' + c.className">
            {{ c.className }}</router-link>
          <div class="sidebar-link-sub" v-for="method in c.methods" v-if="$route.params.className === c.className">
            <router-link :to="'/doc/' + c.className + '#' + method.name"
              :class="$route.hash === '#' + method.name ? 'sidebar-link-sub-active ' : ''">
              {{ method.name }}</router-link>
          </div>
        </li>
      </ul>
    </aside>
    <main>
      <div class="meta">
        <div class="class-block">
          <div class="name">{{ targetClass.className }}</div>
          <div class="desc font-bold" v-html="revertEscapeCharacter(targetClass.classComments?.[0])"></div>
        </div>

        <div class="method-block" v-for="method in targetClass.methods">
          <div class="name" :id="method.name">
            <router-link :to="'#' + method.name" @click="goAnchor(method.name)">{{
                method.name
            }}</router-link>
          </div>
          <h5 class="desc color-gray" v-html="revertEscapeCharacter(method.methodComments?.[0])"></h5>
          <h4>请求参数</h4>
          <table cellpadding="0" cellspacing="0" class="params-table" v-if="method?.params?.length">
            <tr>
              <th>参数名</th>
              <th>是否必传</th>
              <th>类型</th>
              <th>描述</th>
            </tr>
            <tr v-for="param in method.params">
              <td>{{ param.name }}</td>
              <td :class="param.required ? 'font-bold' : ''">
                {{ booleanHandler(param.required) }}
              </td>
              <td>{{ paramsTypeHandler(param.type) }}</td>
              <td>{{ paramsCommentsHandler(param.comments[0]) }}</td>
            </tr>
          </table>
          <div v-else>无</div>
          <h4>响应</h4>
          <preview-code :code="method.returnType" type="json"> </preview-code>
        </div>
      </div>
    </main>
  </div>
  <div v-else>似乎没有找到带有注释的方法呢~</div>
</template>

<style lang="scss">
.sidebar {
  width: 320px;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 6;
  overflow-y: auto;
  background: #f0f0f0;

  .sidebar-links {
    margin-top: 28px;
    padding: 10px;

    .sidebar-link {
      line-height: 30px;
      font-size: 20px;
      text-align: left;
      font-weight: bold;

      >a {
        margin: 0 auto;
        display: block;
        padding: 5px;
        border-radius: 8px;
        position: relative;
      }

      >a:hover {
        background-color: #ccc;
      }

      .sidebar-link-sub {
        >a {
          font-size: 18px;
          padding: 5px;
          padding-left: 20px;
          color: rgba(0, 0, 0, 0.6);
          font-weight: 500;
        }
      }

      .sidebar-link-sub-active {
        color: #000 !important;

        &:after {
          content: ">";
          left: 13px;
          font-size: 15px;
          color: #ff7f50;
          font-weight: bold;
          position: absolute;
        }
      }
    }

    .sidebar-link-active {
      background-color: #ccc;
    }
  }
}

main {
  margin-left: 320px;

  .meta {
    margin: 0 auto;
    padding: 20px;
    max-width: 720px;

    .class-block {
      .name {
        font-size: 40px;
        font-weight: bold;
      }
    }

    .method-block {
      .name {
        position: relative;
        color: white;
        background: coral;
        margin: 30px 0 6px 0;
        display: inline-block;
        padding: 5px 5px 5px 5px;
        border-radius: 5px;
        font-size: 30px;
        font-weight: bold;
        cursor: pointer;

        >a {
          color: white;
        }

        &:hover:after {
          content: "#";
          left: 0;
          transform: translateX(-120%);
          color: #303030;
          position: absolute;
        }

        &:hover {
          text-decoration: underline;
        }
      }

      .desc {
        margin-bottom: 20px;
      }

      margin-bottom: 50px;
    }

    .params-table {
      text-align: center;
      margin: 8px 0px 16px 0;
      color: #303030;
      border: 0;
      width: auto;
      display: block;
      overflow-x: auto;
      font-size: 14px;

      th {
        border: 1px solid #dbdbdb;
        background-color: #f0f0f0;
        padding: 10px 16px;
        border-bottom: solid 2px #bfbfbf;
      }

      td {
        padding: 10px 16px;
        line-height: 20px;
        vertical-align: center;
        border: 1px solid #dbdbdb;
      }
    }

    .returnType {
      background-color: #ccc;
    }

    .gap {
      height: 30px;
    }
  }
}

.font-bold {
  font-weight: bold;
}

.color-gray {
  color: #999988;
}
</style>
