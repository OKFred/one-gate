# OKFred SOC 改造与质量保障待办事项总览 (TODO)

本项目为了实现清洁架构和职责分离（SOC），需要对各业务子模块进行 **Service/Repository 仓储层解耦重构** 以及 **双运行时（Workers & Node）自动化集成测试建设**。

为了使职责和任务跟踪更清晰，我们已将相关待办事项细化为以下两个子文件，存放在根目录下：

* 📘 **[仓储层解耦重构待办清单 (todo_repository.md)](./todo_repository.md)**
  记录了尚未解耦 Drizzle ORM 查询的各个模块（如 `system`, `ai`, `swarm` 等），以及具体的重构规范。

* 🧪 **[测试用例建设与重构待办清单 (todo_test.md)](./todo_test.md)**
  记录了如何在同构或异构的测试架构设计下，为各个业务模块补充完整的单元测试和集成测试。
