# Services Layer Knowledge

**Generated:** 2026-04-17

## OVERVIEW
业务服务层 - LLM 工厂、搜索、会话、索引等核心服务。

## STRUCTURE
```
services/
├── llm_factory.py           # LLM 服务工厂 (DeepSeek/Ollama)
├── deepseek_service.py      # DeepSeek 服务
├── ollama_service.py     # Ollama 服务
├── search_service.py     # 搜索服务 (SerpAPI)
├── conversation_service.py # 会话管理 (MySQL)
├── indexing_service.py  # 索引服务
├── embedding_service.py # 向量嵌入
├── redis_semantic_cache.py # Redis 缓存
└── user_service.py     # 用户服务
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| LLM 选择 | `llm_factory.py` | 工厂模式 |
| 会话持久化 | `conversation_service.py` | MySQL |
| 搜索集成 | `search_service.py` | SerpAPI |

## CONVENTIONS
- 使用 `@tool` 装饰器定义工具
- 服务使用 `get_logger(service="xxx")`
- 依赖注入通过工厂模式

## ANTI-PATTERNS
- 禁止在注释中使用绝对化表达