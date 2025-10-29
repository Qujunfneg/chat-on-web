<template>
  <div
    v-bind="$attrs"
    class="quote-message-wrapper"
    :class="{ 'has-quote': hasReply }"
  >
  {{ console.log(processedMessage) }}
    <div
      v-for="(item, index) in processedMessage"
      :key="index"
      class="message-part-container"
    >
      <MarkdownPreview
        :content="item.content"
        v-if="['ai'].includes(item.type)"
      />
      <pre
        v-else-if="['normal', 'reply', 'mention'].includes(item.type)"
        :class="['message-part', item.type]"
        >{{ item.content }}</pre
      >
      <img
        v-else-if="item.type === 'emoji'"
        :src="item.content"
        :class="['message-emoji', { 'big-emoji': item.isBigFace }]"
        :alt="item.alt"
        @error="handleEmojiError($event, index)"
      />
    </div>
  </div>
</template>
<script setup>
import { computed } from "vue";
import MarkdownPreview from "./MarkdownPreview.vue";
const props = defineProps({
  message: {
    type: String,
    default: "",
  },
  dataInfo: {
    type: Object,
    default: () => {},
  },
  // 添加userInfoMap属性，用于获取最新的用户名
  userInfoMap: {
    type: Object,
    default: () => ({}),
  },
});

const processedMessage = computed(() => {
  if (typeof props.message === "string" && /^\]\n/.test(props.message)) {
    debugger;
    return parseMessageContent(props.message.slice(2));
  }
  return parseMessageContent(props.message);
});

// 检查消息是否包含回复
const hasReply = computed(() => {
  if (!props.message) return false;
  // 检查是否包含[回复： **** ]格式或回复 @**** 格式
  return /回复 @[^\n]*|\[回复：[^\]]*\]/.test(props.message);
});
function parseMessageContent(text) {
  // 存储结果
  const result = [];

  // 空值检查：如果text为空、undefined或null，直接返回空结果数组
  if (!text || text === "") {
    return result;
  }

  // 处理包含动态表情和@用户的内容
  // 不再单独处理回复内容，而是让processContentWithEmojis统一处理
  processContentWithEmojis(text, result);
  return result;
}

// 处理包含动态表情和@用户的内容
function processContentWithEmojis(content, result) {
  // 空值检查：如果content为空、undefined或null，直接返回
  if (!content || content === "") {
    return;
  }

  // 先处理@用户的内容
  const mentionPattern = /@(\S+)\s/g;
  let lastIndex = 0;
  let match;

  try {
    // 处理@用户
    while ((match = mentionPattern.exec(content)) !== null) {
      // 处理@用户前的普通文本（可能包含动态表情和回复内容）
      if (match.index > lastIndex) {
        const contentBefore = content.substring(lastIndex, match.index);
        processContentWithEmojisOnly(contentBefore, result);
      }

      // 获取原始用户名和@标记
      const originalMention = match[0];
      const mentionedUsername = match[1];

      // 尝试从userInfoMap中获取最新的用户名
      const displayName =
        props.userInfoMap[mentionedUsername]?.nickname || mentionedUsername;

      // 添加@用户文本，使用最新的用户名
      result.push({
        type: "mention",
        content: `@${displayName} `, // 保持结尾的空格
        username: mentionedUsername,
      });

      // 更新最后索引位置
      lastIndex = mentionPattern.lastIndex;
    }

    // 处理剩余内容中的动态表情和回复内容
    if (lastIndex < content.length) {
      const remainingContent = content.substring(lastIndex);
      processContentWithEmojisOnly(remainingContent, result);
    }
  } catch (error) {
    console.error("处理@用户和表情时出错:", error);
    // 出错时直接将原始内容作为普通文本添加
    result.push({
      type: "normal",
      content: content,
    });
  }
}

// 只处理动态表情和回复内容的函数
function processContentWithEmojisOnly(content, result) {
  // 空值检查：如果content为空、undefined或null，直接返回
  if (!content || content === "") {
    return;
  }

  // 首先匹配回复格式 [回复：用户名: 内容]
  const replyPattern = /\[回复：[^\]]*\]/g;
  let lastIndex = 0;
  let match;

  try {
    // 处理回复内容
    while ((match = replyPattern.exec(content)) !== null) {
      // 处理回复前的普通文本
      if (match.index > lastIndex) {
        // 直接添加回复前的普通文本，不进行嵌套处理
        result.push({
          type: "normal",
          content: content.substring(lastIndex, match.index),
        });
      }

      // 提取回复内容文本
      const replyText = match[0];

      // 进一步处理回复内容中的动态表情
      // 1. 提取回复内容中的文本部分（去掉前后的[]）
      const innerReplyContent = replyText.substring(1, replyText.length - 1);

      // 2. 创建临时数组来存储处理后的回复内容
      const replyParts = [];

      // 3. 对回复内容内部进行表情处理
      const tempEmojiPattern = /\[(\w+)\s+([^\]]+)\s*\]/g;
      let tempLastIndex = 0;
      let tempMatch;

      // 重置正则表达式的lastIndex确保从0开始匹配
      tempEmojiPattern.lastIndex = 0;

      while ((tempMatch = tempEmojiPattern.exec(innerReplyContent)) !== null) {
        // 处理表情前的文本
        if (tempMatch.index > tempLastIndex) {
          replyParts.push({
            type: "text",
            content: innerReplyContent.substring(
              tempLastIndex,
              tempMatch.index
            ),
          });
        }

        // 处理表情
        const category = tempMatch[1];
        let emojiName = tempMatch[2].trim();
        let emojiUrl = `/emojis/${category}/${emojiName}.gif`;

        replyParts.push({
          type: "emoji",
          content: emojiUrl,
          alt: `${category}-${emojiName}`,
          isBigFace: category === "bigface",
        });

        // 检查是否发生无限循环（当正则表达式匹配空字符串时会发生）
        if (tempEmojiPattern.lastIndex === tempMatch.index) {
          tempEmojiPattern.lastIndex++;
        }

        tempLastIndex = tempEmojiPattern.lastIndex;
      }

      // 处理剩余文本
      if (tempLastIndex < innerReplyContent.length) {
        replyParts.push({
          type: "text",
          content: innerReplyContent.substring(tempLastIndex),
        });
      }

      // 4. 根据处理结果决定如何添加回复内容
      if (replyParts.length === 1 && replyParts[0].type === "text") {
        // 如果回复内容只有纯文本，保持原来的处理方式
        result.push({
          type: "reply",
          content: replyText,
        });
      } else {
        // 如果回复内容包含表情，分别添加
        // 先添加回复开始标记
        result.push({
          type: "normal",
          content: "回复@",
        });

        // 然后添加处理后的回复内容
        replyParts.forEach((part) => {
          if (part.type === "text") {
            result.push({
              type: "normal",
              content: part.content,
            });
          } else {
            // 表情直接添加到结果中
            result.push(part);
          }
        });

        // 不再添加结束标记，避免多一个中括号
      }

      // 更新最后索引位置
      lastIndex = replyPattern.lastIndex;
    }

    // 处理剩余内容中的动态表情
    if (lastIndex < content.length) {
      const remainingContent = content.substring(lastIndex);
      // 匹配格式：[分类 表情名称 ] （注意结尾可能有空格）
      const emojiPattern = /\[(\w+)\s+([^\]]+)\s*\]/g;
      let emojiLastIndex = 0;
      let emojiMatch;

      // 重置正则表达式的lastIndex确保从0开始匹配
      emojiPattern.lastIndex = 0;

      // 避免重复使用test方法，直接通过exec方法处理所有匹配
      while ((emojiMatch = emojiPattern.exec(remainingContent)) !== null) {
        // 处理表情前的普通文本
        if (emojiMatch.index > emojiLastIndex) {
          result.push({
            type: "normal",
            content: remainingContent.substring(
              emojiLastIndex,
              emojiMatch.index
            ),
          });
        }

        // 处理表情
        const category = emojiMatch[1]; // 表情分类：qq 或 funny 或 bigface
        let emojiName = emojiMatch[2].trim(); // 表情名称

        // 构建表情图片URL
        let emojiUrl = `/emojis/${category}/${emojiName}.gif`;

        // 添加表情元素（同时保存原始匹配文本，便于出错时回退）
        result.push({
          type: "emoji",
          content: emojiUrl,
          alt: `${category}-${emojiName}`,
          originalText: emojiMatch[0], // 保存原始匹配文本
          isBigFace: category === "bigface", // 标识是否为大黄人表情
        });

        // 检查是否发生无限循环（当正则表达式匹配空字符串时会发生）
        if (emojiPattern.lastIndex === emojiMatch.index) {
          emojiPattern.lastIndex++;
        }

        // 更新最后索引位置
        emojiLastIndex = emojiPattern.lastIndex;
      }

      // 处理最后剩余的普通文本
      if (emojiLastIndex < remainingContent.length) {
        result.push({
          type: "normal",
          content: remainingContent.substring(emojiLastIndex),
        });
      }
    }
  } catch (error) {
    console.error("处理消息内容时出错:", error);
    // 出错时直接将原始内容作为普通文本添加
    result.push({
      type: "normal",
      content: content,
    });
  }
}

// 处理表情图片加载错误
function handleEmojiError(event, index) {
  // 阻止默认错误行为
  event.preventDefault();

  // 尝试获取表情项数据
  const emojiItem = processedMessage.value[index];

  if (emojiItem && emojiItem.originalText) {
    // 如果有原始文本，将表情项转换为普通文本
    processedMessage.value.splice(index, 1, {
      type: "normal",
      content: emojiItem.originalText,
    });
  }
}
</script>

<style scoped>
/* 样式从chatStyles.css获取，这里保持最小化的样式定义 */
.quote-message-wrapper {
  position: relative;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-part-container {
  display: inline-block;
}

.message-part {
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  display: inline;
}

.message-part.reply {
  font-size: 12px;
  opacity: 0.8;
  color: #666;
}

.message-part.normal {
  font-size: inherit;
  opacity: 1;
  margin-left: 5px;
}

/* @用户的样式 - 与微信一致 */
.message-part.mention {
  color: #1296db;
  font-weight: 500;
}

.message-emoji {
  vertical-align: middle;
  object-fit: contain;
  margin: 0 2px;
}

/* 大黄人表情更大的尺寸 */
.message-emoji.big-emoji {
  object-fit: contain;
}
</style>
