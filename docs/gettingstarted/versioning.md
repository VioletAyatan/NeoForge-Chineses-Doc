# 版本管理（Versioning）

本文将说明 Minecraft 和 NeoForge 的版本规则，并给出一些模组版本管理建议。

## Minecraft

Minecraft 的版本规则多年来经历了变化。

从 1.0 到 1.21.11 的版本采用受 [semver] 启发的格式 `major.minor.<patch>`，为简洁起见会省略 patch 版本。例如 1.21 和 1.21.11。

26.1 及更高版本采用受 [calver] 启发的格式 `year.release.<patch>`，为简洁起见同样会省略 patch 版本。例如 26.1 和 26.1.1。

### 早期发布时代

在游戏正式发布之前，版本规则经常变化，曾出现 `a1.1`（Alpha 1.1）、`b1.7.3`（Beta 1.7.3），甚至还有完全不遵循明确版本规则的 `infdev` 版本。

### 大型更新时代

游戏以 Minecraft 1.0 正式发布时，采用了一套新的版本规则：以 `1` 作为 major 版本，第二个数字表示一次（通常每年一次的）大型更新，第三个数字表示小版本和补丁。例如，Minecraft 1.20.2 的 major 版本为 1，minor 版本为 20，patch 版本为 2。该格式从 2011 年沿用到 2026 年，即从 Minecraft 1.0 推出直至 2026 年初的 26.1 更新。起初这种格式运作良好，直到 Minecraft 开始发布 drop。由于 drop 属于小型更新，只会增加 patch 版本号，最终导致 1.21 更新周期持续了将近两年。

#### 快照

1.21.11 及更低版本的快照不遵循标准版本规则。它们标记为 `YYwWWa`，其中 `YY` 代表年份的后两位数字（例如 `23`），`WW` 代表该年的周数（例如 `01`）。因此，快照 `23w01a` 就是 2023 年第一周发布的快照。

后缀 `a` 用于一周内发布两次快照的情况（第二个快照会命名为类似 `23w01b` 的形式）。Mojang 过去偶尔会这样做。其他后缀也曾用于 `20w14infinite` 这类快照，它是 [2020 年无限维度愚人节玩笑][infinite]。

#### 预发布版和候选发布版

当一个快照周期接近完成时，Mojang 会开始发布所谓的预发布版。预发布版被视为该版本的功能完备版本，只专注于修复缺陷。它们使用目标版本的 semver 表示法，并加上 `-preX` 后缀。例如，1.20.2 的第一个预发布版名为 `1.20.2-pre1`。预发布版可以有多个，并且通常确实如此，它们会依次使用 `-pre2`、`-pre3` 等后缀。

同样，当预发布周期结束时，Mojang 会发布 Release Candidate 1（为版本加上 `-rc1` 后缀，例如 `1.20.2-rc1`）。Mojang 的目标是只提供一个候选发布版，如果不再出现缺陷，就将其正式发布。不过，如果出现意外缺陷，也可能像预发布版一样出现 `-rc2`、`-rc3` 等版本。

### 游戏 Drop 时代

由于决定从每年一次大型更新、年内发布补丁的方式，转向每季度发布游戏 drop，Mojang 决定把 Minecraft 的版本格式更改为 `year.release.<patch>`。例如，26.1 是第一个采用新版本规则的发行版，代表 2026 年的第一个 drop。如果需要发布热修复，其版本将是 26.1.1，而 2026 年的第二个 drop 将是 26.2。

#### 快照、预发布版和候选发布版

开发下一次更新时，Mojang 会发布称为快照的早期版本。快照会快速改变游戏的各个方面，相当不稳定，但很适合用来了解下一次更新正在发展成什么样子。26.1 及更高版本的快照使用目标版本的 calver 表示法，并加上 `-snapshot-X` 后缀。例如，26.1-snapshot-1 是即将发布的 26.1 更新的第一个快照，后续快照标记为 `snapshot-2` 或 `snapshot-3`。

当一个快照周期接近完成时，Mojang 会开始发布所谓的预发布版。预发布版被视为该版本的功能完备版本，只专注于修复缺陷。类似地，这些版本会加上 `-pre-X` 后缀。例如，26.1 的第一个预发布版名为 `26.1-pre-1`。预发布版可以有多个，并且通常确实如此，它们会依次使用 `-pre-2`、`-pre-3` 等后缀。

同样，当预发布周期结束时，Mojang 会发布 Release Candidate 1（为版本加上 `-rc1` 后缀，例如 `26.1-rc-1`）。Mojang 的目标是只提供一个候选发布版，如果不再出现缺陷，就将其正式发布。不过，如果出现意外缺陷，也可能像预发布版一样出现 `-rc-2`、`-rc-3` 等版本。

## NeoForge

NeoForge 使用经过调整的 semver 系统：major 版本是 Minecraft 的 minor 版本，minor 版本是 Minecraft 的 patch 版本，patch 版本则是“实际的”NeoForge 版本。例如，NeoForge 20.2.59 是 Minecraft 1.20.2 对应的第 60 个版本（从 0 开始计数）。以 `1` 开头的版本曾省略 `1`，因为当时认为这个数字不会变化。当事实证明并非如此后，NeoForge 的版本规则改为包含完整的 Minecraft 版本号，并在需要时以 `0` 作为 patch 数字。例如，NeoForge 26.1.0.5-beta 是 Minecraft 26.1 对应的第 6 个版本。

NeoForge 中有些地方还会使用 [Maven 版本范围][mvr]，例如 [`neoforge.mods.toml`][neoforgemodstoml] 文件中的 Minecraft 和 NeoForge 版本范围。它们与 semver 大体兼容，但并非完全兼容（例如不考虑 `pre` 标签）。

## 模组

不存在绝对最佳的版本管理系统。不同的开发风格、项目范围等都会影响版本管理系统的选择。有时还可以组合使用不同的版本系统。本节尝试通过真实示例，概述几种常用的版本管理系统。

模组文件名通常类似 `modid-<version>.jar`。因此，如果模组 ID 是 `examplemod`，版本为 `1.2.3`，模组文件就会命名为 `examplemod-1.2.3.jar`。

:::info
版本管理系统只是建议，并不是严格执行的规则。对于何时以及以何种方式改变（“递增”）版本号，尤其如此。如果你想使用其他版本管理系统，也不会有人阻止你。
:::

### 语义化版本

语义化版本（“semver”）由 `major.minor.patch` 三部分组成。代码库发生重大变更时递增 major 版本，这通常对应重大的新功能和缺陷修复；引入次要功能时递增 minor 版本；如果更新只包含缺陷修复，则递增 patch 版本。

人们普遍认为，任何 `0.x.x` 版本都属于开发版本，在第一次（正式）发布时应将版本递增到 `1.0.0`。

实践中，“minor 用于功能、patch 用于缺陷修复”这一规则经常被忽略。Minecraft 本身就是一个著名例子：它通过 minor 版本号发布重大功能，通过 patch 版本号发布次要功能，并在快照中修复缺陷（见上文）。

根据模组更新频率，这些数字可能较小，也可能较大。例如，[Supplementaries][supplementaries] 在本文撰写时的版本为 `2.6.31`。尤其是在 `patch` 部分，出现三位数甚至四位数完全有可能。

### “精简”和“扩展”Semver

有时只用两个数字表示 semver。这是一种“精简”semver，也称“双段式”semver，其版本号只有 `major.minor` 结构。它常用于只添加少量简单对象、因此除 Minecraft 版本更新外很少需要更新的小型模组；这类模组往往永远停留在 `1.0` 版本。

“扩展”semver，也称“四段式”semver，由四个数字组成（类似 `1.0.0.0`）。根据模组不同，格式可以是 `major.api.minor.patch`、`major.minor.patch.hotfix`，也可以完全不同——并不存在统一标准。

对于 `major.api.minor.patch`，`major` 版本与 `api` 版本相互独立。这意味着可以分别递增 `major`（功能）部分和 `api` 部分。公开 API 供其他模组开发者使用的模组通常采用这种方式。例如，[Mekanism][mekanism] 在本文撰写时的版本为 10.4.5.19。

对于 `major.minor.patch.hotfix`，patch 级别被拆分成两部分。[Create][create] 模组采用了这种方式，其在本文撰写时的版本为 0.5.1f。请注意，为与常规 semver 保持兼容，Create 使用字母而不是第四个数字表示 hotfix。

:::info
精简 semver、扩展 semver、双段式 semver 和四段式 semver 都不是正式术语，也不属于任何标准化格式。
:::

### Alpha、Beta 和 Release

与 Minecraft 本身一样，模组开发通常也会采用软件工程中经典的 `alpha`/`beta`/`release` 阶段。`alpha` 表示不稳定或实验版本（有时也称 `experimental` 或 `snapshot`），`beta` 表示较为稳定的版本，`release` 表示稳定版本（有时也使用 `stable` 代替 `release`）。

有些模组用 major 版本表示 Minecraft 版本的提升。[JEI][jei] 就是一个例子：它对 Minecraft 1.19.2 使用 `13.x.x.x`，对 Minecraft 1.19.4 使用 `14.x.x.x`，对 Minecraft 1.20.1 使用 `15.x.x.x`（没有对应 1.19.3 和 1.20.0 的版本）。还有一些模组会把标签附加到模组名称后，例如 [Minecolonies][minecolonies] 模组在本文撰写时的版本为 `1.1.328-BETA`。

### 包含 Minecraft 版本

通常会在文件名中包含模组所适用的 Minecraft 版本，以便最终用户轻松判断模组适用于哪个 Minecraft 版本。常见做法是把它放在模组版本之前或之后，前者比后者更普遍。例如，用于 1.20.2 的 JEI `16.0.0.28` 版本（本文撰写时的最新版本）可以命名为 `jei-1.20.2-16.0.0.28` 或 `jei-16.0.0.28-1.20.2`。

### 包含 Mod Loader

你很可能已经知道，NeoForge 并不是唯一的 Mod Loader，而且许多模组开发者会面向多个平台进行开发。因此，需要一种方式区分同一个模组、同一版本中面向不同 Mod Loader 的两个文件。

通常的做法是在名称中的某个位置包含 Mod Loader。`jei-neoforge-1.20.2-16.0.0.28`、`jei-1.20.2-neoforge-16.0.0.28` 和 `jei-1.20.2-16.0.0.28-neoforge` 都是有效写法。对于其他 Mod Loader，`neoforge` 部分可替换为 `forge`、`fabric`、`quilt`，或者你在 NeoForge 之外同时支持的其他 Mod Loader。

### 关于 Maven 的说明

用于托管依赖项的 Maven 系统采用的版本规则，在一些细节上与 semver 不同（但整体仍保持 `major.minor.patch` 模式）。相关的 [Maven Versioning Range（MVR）][mvr]系统会用在 NeoForge 的某些位置（见[上文][neoforge]）。选择版本方案时，应确保它与 MVR 兼容，否则其他模组将无法依赖你模组的特定版本！

[create]: https://www.curseforge.com/minecraft/mc-mods/create
[infinite]: https://minecraft.wiki/w/Java_Edition_20w14∞
[jei]: https://www.curseforge.com/minecraft/mc-mods/jei
[mekanism]: https://www.curseforge.com/minecraft/mc-mods/mekanism
[minecolonies]: https://www.curseforge.com/minecraft/mc-mods/minecolonies
[minecraft]: #minecraft
[neoforgemodstoml]: modfiles.md#neoforgemodstoml
[mvr]: https://maven.apache.org/enforcer/enforcer-rules/versionRanges.html
[mvr]: https://maven.apache.org/ref/3.9.9/maven-artifact/apidocs/org/apache/maven/artifact/versioning/ComparableVersion.html
[neoforge]: #neoforge
[pre]: #pre-releases
[rc]: #release-candidates
[semver]: https://semver.org/
[calver]: https://calver.org/
[supplementaries]: https://www.curseforge.com/minecraft/mc-mods/supplementaries

