# GraphRAG Subpackage Knowledge

**Generated:** 2026-04-17

## OVERVIEW
微软 GraphRAG 独立子包 - 基于 Poetry 管理的数据管道和 RAG 检索系统。

## STRUCTURE
```
graphrag/
├── graphrag/              # 核心模块
│   ├── index/           # 索引工作流
│   ├── query/          # 查询引擎 (local/global/drift)
│   ├── prompt_tune/    # Prompt 调优
│   └── config/         # 配置模型
├── tests/              # 测试 (unit/integration/notebook/smoke/verbs)
├── data/               # 数据目录 (cache/output/prompts)
└── pyproject.toml      # 独立 Poetry 配置
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 索引流程 | `graphrag/index/workflows/` | 文档索引步骤 |
| 查询方法 | `graphrag/query/structured_search/` | local/global/drift search |
| 提示模板 | `graphrag/prompts/` | 系统提示词 |
| 配置模型 | `graphrag/config/models/` | Pydantic 配置 |

## CONVENTIONS (DIFFERENT FROM PARENT)
- **Python 版本**: `>=3.10,<3.13` (严格约束)
- **Linting**: Ruff (target py310, numpy docstyle)
- **测试**: PyTest + unittest 混合，conftest 定义 `--run_slow`
- **版本化**: poetry-dynamic-versioning (Git-based)

## ANTI-PATTERNS
- 注释中避免 DO NOT/NEVER/ALWAYS/DEPRECATED
- 不要在 tests/ 外运行 notebook 测试