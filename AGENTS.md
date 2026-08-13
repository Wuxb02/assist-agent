# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-17
**Branch:** (current)

## OVERVIEW
AssistGen 智能客服系统 - 基于 FastAPI + LangGraph + GraphRAG + Neo4j 的多智能体客服后端服务。核心语言: Python (>=3.11,<3.13)。

## STRUCTURE
```
assist-agent/
├── .venv/                        # uv 虚拟环境 (已 gitignore)
├── llm_backend/                  # 后端服务根目录
│   ├── app/
│   │   ├── api/                  # REST API 路由
│   │   ├── core/                 # 核心配置 (config, database, logger, security, middleware)
│   │   ├── services/             # 业务服务层 (LLM工厂、搜索、会话、索引)
│   │   ├── lg_agent/             # LangGraph 多智能体系统
│   │   │   ├── kg_sub_graph/     # 知识图谱子图 (Neo4j 工具、Agentic RAG)
│   │   │   ├── lg_builder.py     # Agent 图构建 (520行)
│   │   │   ├── lg_states.py      # 状态定义
│   │   │   └── lg_prompts.py     # 提示词模板
│   │   ├── graphrag/             # 微软 GraphRAG 集成 (子包独立 Poetry 管理)
│   │   ├── models/               # SQLAlchemy 数据模型
│   │   ├── prompts/              # 提示词模板
│   │   ├── schemas/              # Pydantic 请求/响应模型
│   │   ├── test/                 # 测试脚本 (benchmark, 性能测试)
│   │   └── tools/                # 工具模块
│   ├── main.py                   # FastAPI 入口（挂载前端构建产物到 /）
│   ├── run.py                    # 服务启动脚本
│   ├── scripts/                  # 工具脚本 (init_db.py)
│   └── uploads/                  # 文件上传存储
├── llm_frontend/                 # 前端根目录 (Vue 3 + Vite)
│   ├── src/
│   │   ├── views/                # 页面 (Home/Login/Register)
│   │   ├── services/             # API 服务层 (axios + SSE 流式)
│   │   ├── stores/               # Pinia 状态 (user/conversation)
│   │   ├── router/               # 路由与登录守卫
│   │   └── styles/               # 全局样式 (深色主题)
│   ├── dist/                     # 构建产物（由后端静态挂载）
│   ├── package.json              # 前端依赖
│   └── vite.config.js            # Vite 配置 (/api 代理)
├── pyproject.toml                # uv 项目依赖配置
├── uv.lock                       # uv 锁定依赖版本
├── .env.example                  # 环境变量示例
├── .gitignore
├── AGENTS.md                     # 项目知识库
└── README.md
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 新增 API 端点 | `llm_backend/app/api/` | 扩展 auth.py 或新建路由文件 |
| LLM 服务接入 | `llm_backend/app/services/llm_factory.py` | 工厂模式选择 DeepSeek/Ollama |
| Agent 逻辑修改 | `llm_backend/app/lg_agent/lg_builder.py` | 状态图构建核心 |
| 知识图谱工具 | `llm_backend/app/lg_agent/kg_sub_graph/kg_tools_list.py` | Neo4j 查询/写入工具 |
| GraphRAG 索引 | `llm_backend/app/graphrag/graphrag/index/` | 文档索引工作流 |
| 会话管理 | `llm_backend/app/services/conversation_service.py` | MySQL 持久化 |
| 配置管理 | `llm_backend/app/core/config.py` | 环境变量统一入口 |
| 前端页面 | `llm_frontend/src/views/` | Home/Login/Register 页面组件 |
| 前端 API 对接 | `llm_frontend/src/services/` | axios 封装 + SSE 流式解析 |
| 前端状态管理 | `llm_frontend/src/stores/` | Pinia user/conversation store |

## CONVENTIONS
- **依赖管理**: 根目录用 uv（`pyproject.toml` + `uv.lock`），GraphRAG 子包用 Poetry (pyproject.toml)
- **代码风格**: GraphRAG 使用 Ruff + Pyright，规则见 GraphRAG 子包 `pyproject.toml` (target-version: py310, numpy docstyle)
- **测试**: GraphRAG 子包用 PyTest + unittest 混合风格，conftest 定义 `--run_slow` 选项
- **API 路由**: 统一挂载到 `/api` 前缀 via `api_router`
- **状态管理**: LangGraph + MemorySaver 持久化对话状态
- **日志**: 使用 `app/core/logger.py` 的结构化日志，记录 service 标签

## ANTI-PATTERNS (THIS PROJECT)
- 禁止在注释中使用 DO NOT/NEVER/ALWAYS/DEPRECATED 等绝对化表达 (30+ 文件存在此类注释)
- 根目录 (uv) 与 GraphRAG 子包 (Poetry) 两套依赖管理并存，导致依赖管理割裂

## UNIQUE STYLES
- **多模型动态切换**: 通过 `ServiceType` Enum 和 `settings.CHAT/REASON/AGENT_SERVICE` 动态选择 LLM
- **流式响应**: 所有 LLM 调用使用 `StreamingResponse` + Server-Sent Events
- **Thread 级状态**: LangGraph 使用 `thread_id` + `configurable` 存储用户/图片上下文
- **GraphRAG 嵌套**: 子包独立维护 Poetry + 动态版本化 (poetry-dynamic-versioning)

## COMMANDS
```bash
# 同步依赖 (uv)
uv sync

# 启动服务
cd llm_backend && python run.py

# 前端开发 (热更新, /api 代理到 localhost:8000)
cd llm_frontend && npm install && npm run dev

# 前端构建 (产物输出到 llm_frontend/dist, 由后端挂载)
cd llm_frontend && npm run build

# GraphRAG 索引
cd llm_backend/app/graphrag && python -m graphrag index --root .

# 测试 (GraphRAG 子包)
cd llm_backend/app/graphrag && pytest tests/

# Lint 检查 (GraphRAG)
cd llm_backend/app/graphrag && ruff check .
```

## NOTES
- 环境变量配置: `llm_backend/.env` (参考根目录 `.env.example`)
- GraphRAG 子包需要独立初始化: `python -m graphrag init --root .`
- Neo4j 连接默认 `bolt://localhost:7687`，需确保图数据库运行
- LangGraph 断点处理: 检查 `state.interrupts` 并返回中断标识