# LangGraph Agent Knowledge

**Generated:** 2026-04-17

## OVERVIEW
基于 LangGraph 的多智能体系统 - 包含知识图谱子图和 Agentic RAG。

## STRUCTURE
```
lg_agent/
├── lg_builder.py       # 状态图构建 (520行)
├── lg_states.py         # AgentState, InputState, Router 定义
├── lg_prompts.py       # 提示词模板
├── kg_sub_graph/       # 知识图谱子图
│   ├── kg_tools_list.py    # Neo4j 查询/写入工具
│   ├── kg_neo4j_conn.py   # 图数据库连接
│   └── agentic_rag_agents/ # Agentic RAG 组件
└── main.py             # Agent 入口
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Agent 图构建 | `lg_agent/lg_builder.py` | 状态机定义 |
| 路由逻辑 | `route_query()` 函数 | 查询分类 |
| 状态定义 | `lg_agent/lg_states.py` | AgentState/InputState |
| 知识工具 | `kg_sub_graph/kg_tools_list.py` | Neo4j 工具 |

## CONVENTIONS
- 使用 `@tool` 装饰器定义工具
- 流式响应: `StreamingResponse` + SSE
- Thread 级状态: `thread_id` + `configurable`
- 断点处理: 检查 `state.interrupts`

## ANTI-PATTERNS
- 禁止在注释中使用绝对化表达