# MemOS 插件安装与配置指南（OpenCode）

> 日期：2026-08-20
> 适用：OpenCode 1.18.18 + MemOS Cloud MCP Server


## 一、MemOS 是什么

MemOS（Memory Operating System）是面向 LLM 与 AI Agent 的持久记忆系统，支持跨会话自动召回/写入记忆。本指南记录其在 OpenCode 中的 MCP Server 接入方式。

- 仓库：https://github.com/MemTensor/MemOS （⭐10k+）
- 云服务：https://memos.memtensor.cn
- Dashboard：https://memos-dashboard.openmem.net
- MCP Server 包：https://www.npmjs.com/package/@memtensor/memos-api-mcp


## 二、安装 MCP Server

```bash
npm install -g @memtensor/memos-api-mcp
```

验证安装：

```bash
which memos-api-mcp
# 输出: /home/huangwei/.local/bin/memos-api-mcp
```


## 三、配置 OpenCode

### 1. 获取 API Key

在 MemOS Dashboard 创建 API Key（以 `mpg-` 开头）：
https://memos-dashboard.openmem.net/cn/apikeys/

### 2. 写入凭据

`~/.config/opencode/opencode.jsonc` 的 `mcp` 节点中添加 `memos-api`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "getnote": {
      "type": "local",
      "command": ["node", "/home/huangwei/.local/lib/node_modules/@getnote/mcp/dist/index.js"],
      "enabled": true,
      "environment": {
        "GETNOTE_API_KEY": "gk_live_xxx",
        "GETNOTE_CLIENT_ID": "cli_xxx"
      }
    },
    "memos-api": {
      "type": "local",
      "command": ["npx", "-y", "@memtensor/memos-api-mcp"],
      "enabled": true,
      "environment": {
        "MEMOS_API_KEY": "mpg-QmBYeSZPRoBmON1NM81zBjxSFyNGLg5vap7qFzp9",
        "MEMOS_USER_ID": "yk"
      }
    }
  }
}
```

### 3. 重启 OpenCode

```bash
opencode
```


## 四、可用 MCP 工具

重启后自动获得以下工具：

| 工具 | 用途 | 关键参数 |
|------|------|----------|
| `add_message` | 写入对话记忆 | conversation_id, messages[], user_id |
| `search_memory` | 召回相关记忆 | query, user_id, memory_limit_number |
| `delete_memory` | 删除记忆 | user_ids[], memory_ids[] |
| `add_feedback` | 提交反馈修正记忆 | user_id, conversation_id, feedback_content |
| `get_user_profile` | 查看用户记忆画像 | include_preference, include_tool_memory |
| `create_knowledge_base` | 创建知识库 | knowledgebase_name |
| `add_kb_document` | 上传文档到知识库 | knowledgebase_id, file[] |
| `get_kb_documents` | 获取文档详情 | file_ids[] |
| `delete_kb_documents` | 删除知识库文档 | file_ids[] |
| `remove_knowledge_base` | 移除知识库 | knowledgebase_id |


## 五、userId 统一配置

OpenCode 与 DSH（DeepSeek Harness）共享同一记忆池，需统一 `user_id`：

| 平台 | 配置位置 | userId |
|------|----------|--------|
| OpenCode | `~/.config/opencode/opencode.jsonc` → `MEMOS_USER_ID` | `yk` |
| DSH | `~/.dsh/settings.yaml` → `memos-cloud.userId` | `yk` |

DSH 配置示例：

```yaml
memos-cloud:
  apiKeyEnv: MEMOS_API_KEY
  userId: yk
  includeToolMemory: true
  toolMemoryLimitNumber: 6
```

⚠️ 不同 `user_id` 的记忆互相隔离，统一后两边共享同一记忆池。


## 六、验证 API Key 有效性

```bash
curl -s -X POST "https://memos.memtensor.cn/api/openmem/v1/search/memory" \
  -H "Authorization: Token mpg-xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","user_id":"yk"}'
# 返回 {"code":0,"message":"ok"} 即鉴权成功
```


## 七、工作原理

- **写入**：调用 `add_message`，将对话原文提交给 MemOS Cloud，自动抽象、处理、存储为记忆
- **召回**：调用 `search_memory`，基于语义检索返回相关记忆（事实、偏好、工具轨迹等）
- **反馈**：调用 `add_feedback`，用自然语言修正/补充/替换已有记忆
- **Fail-open**：MemOS 请求失败不会中断 OpenCode 主流程
- **隐私**：仅提交显式调用的内容，不上传系统 prompt、附件等


## 八、注意事项

- 修改 `opencode.jsonc` 后必须重启 OpenCode 才生效
- 修改 `~/.dsh/settings.yaml` 后必须重启 DSH 才生效
- API Key 以 `mpg-` 开头，妥善保管，不要提交到 Git
- 工具记忆（tool memory）涉及调用数据上云，在意隐私时保持 `includeToolMemory: false`
- 单人使用建议两边保持同一 userId，记忆互通体验更连贯


## 九、相关链接

- MemOS 文档：https://memos-docs.openmem.net
- MemOS Dashboard：https://memos-dashboard.openmem.net
- MCP Server GitHub：https://github.com/MemTensor/MemOS/tree/main/apps/MemOS-Cloud-OpenClaw-Plugin
- OpenCode 配置文档：https://opencode.ai/config.json
