# NeoForge 更新检查器

NeoForge 提供了一个非常轻量、需要主动启用的更新检查框架。如果任何模组存在可用更新，主菜单和模组列表中的“Mods”按钮上会显示闪烁图标，同时展示相应的更新日志。它*不会*自动下载更新。

## 入门

首先需要在 `mods.toml` 文件中指定 `updateJSONURL` 参数。该参数的值必须是指向更新 JSON 文件的有效 URL。只要模组的所有用户都能可靠访问，这个文件可以托管在你自己的 Web 服务器、GitHub 或任何其他位置。

## 更新 JSON 格式

JSON 本身采用相对简单的格式：

```json5
{
    "homepage": "<homepage/download page for your mod>",
    "<mcversion>": {
        "<modversion>": "<changelog for this version>", 
        // List all versions of your mod for the given Minecraft version, along with their changelogs
        // ...
    },
    "promos": {
        "<mcversion>-latest": "<modversion>",
        // Declare the latest "bleeding-edge" version of your mod for the given Minecraft version
        "<mcversion>-recommended": "<modversion>",
        // Declare the latest "stable" version of your mod for the given Minecraft version
        // ...
    }
}
```

该格式基本不言自明，但仍有几点需要注意：

- `homepage` 下的链接会在模组过期时展示给用户。
- NeoForge 使用内部算法判断模组的一个版本字符串是否比另一个“更新”。大多数版本方案应该都兼容；如果担心自己的方案是否受支持，请参阅 `ComparableVersion` 类。强烈建议遵循 [Maven 版本规则][mvnver]。
- 可以使用 `\n` 把更新日志字符串分成多行。有些人更喜欢只放入精简的更新日志，再链接到完整列出所有变更的外部网站。
- 手动录入数据会很麻烦。Groovy 原生支持解析 JSON，因此可以配置 `build.gradle`，在构建发行版时自动更新该文件。具体实现留作读者练习。
- [nocubes]、[Corail Tombstone][corail] 和 [Chisels & Bits 2][chisel] 提供了一些示例。

## 获取更新检查结果

可以使用 `VersionChecker#getResult(IModInfo)` 获取 NeoForge 更新检查器的结果。通过 `ModContainer#getModInfo` 可以取得自己的 `IModInfo`；`ModContainer` 可作为参数注入模组构造器。通过 `ModList.get().getModContainerById(<modId>)` 可以获取其他模组的 `ModContainer`。返回对象的 `#status` 方法表示版本检查状态。

| 状态 | 说明 |
|---:|:---|
| `FAILED` | 版本检查器无法连接到所提供的 URL。 |
| `UP_TO_DATE` | 当前版本与推荐版本相同。 |
| `AHEAD` | 在没有 latest 版本的情况下，当前版本比推荐版本更新。 |
| `OUTDATED` | 存在新的推荐版本或 latest 版本。 |
| `BETA_OUTDATED` | 存在新的 latest 版本。 |
| `BETA` | 当前版本与 latest 版本相同或比它更新。 |
| `PENDING` | 请求的结果尚未完成，应稍后重试。 |

返回对象还会包含 `update.json` 中指定的目标版本以及各行更新日志。

[mvnver]: ../gettingstarted/versioning.md
[nocubes]: https://cadiboo.github.io/projects/nocubes/update.json
[corail]: https://github.com/Corail31/tombstone_lite/blob/master/update.json
[chisel]: https://curseupdate.com/231095/chiselsandbits?ml=neoforge
