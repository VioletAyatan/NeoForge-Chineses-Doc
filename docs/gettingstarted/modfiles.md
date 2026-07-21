# 模组文件

模组文件负责确定哪些模组会被打包进 JAR、在“Mods”菜单中显示哪些信息，以及模组应如何加载到游戏中。

## `gradle.properties`

`gradle.properties` 文件保存模组的各种常用属性，例如模组 ID 或模组版本。构建期间，Gradle 会读取这些文件中的值，并将它们内联到多个位置，例如 [neoforge.mods.toml][neoforgemodstoml] 文件。这样，你只需在一个位置修改值，它们就会自动应用到所有位置。

[MDK 的 `gradle.properties` 文件][mdkgradleproperties]中也通过注释说明了大多数值。

| 属性                  | 说明                                                                                                                                                                                                                             | 示例                                    |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------|
| `org.gradle.jvmargs`      | 允许向 Gradle 传递额外 JVM 参数。最常见的用途是为 Gradle 分配更多或更少内存。请注意，这是针对 Gradle 本身，而不是 Minecraft。                                                                 | `org.gradle.jvmargs=-Xmx3G`                |
| `org.gradle.daemon`       | 构建时 Gradle 是否应使用 Daemon。                                                                                                                                                                                     | `org.gradle.daemon=false`                  |
| `org.gradle.parallel`     | Gradle 是否应派生 JVM 来并行执行项目。                                                                                                                                                                                     | `org.gradle.parallel=false`                  |
| `org.gradle.caching`      | Gradle 是否应复用先前构建的任务输出。                                                                                                                                                                                     | `org.gradle.caching=false`                  |
| `org.gradle.configuration-cache`  | Gradle 是否应复用先前构建的构建配置。                                                                                                                                                                                     | `org.gradle.configuration-cache=false`                  |
| `org.gradle.debug`        | 是否将 Gradle 设为调试模式。调试模式主要会输出更多 Gradle 日志。请注意，这是针对 Gradle 本身，而不是 Minecraft。                                                                                                | `org.gradle.debug=false`                   |
| `minecraft_version`       | 进行模组开发所针对的 Minecraft 版本。必须与 `neo_version` 匹配。                                                                                                                                                                | `minecraft_version=1.20.6`                 |
| `minecraft_version_range` | 此模组可使用的 Minecraft 版本范围，以 [Maven Version Range][mvr] 表示。请注意，[快照、预发布版和候选发布版][mcversioning]不保证能正确排序，因为它们不遵循 Maven 版本规则。    | `minecraft_version_range=[1.20.6,1.21)`    |
| `neo_version`             | 进行模组开发所针对的 NeoForge 版本。必须与 `minecraft_version` 匹配。有关 NeoForge 版本规则的更多信息，请参阅 [NeoForge 版本管理][neoversioning]。                                                           | `neo_version=20.6.62`                      |
| `mod_id`                  | 参阅[模组 ID][modid]。                                                                                                                                                                                                                | `mod_id=examplemod`                        |
| `mod_name`                | 模组的人类可读显示名称。默认情况下只能在模组列表中看到，不过 [JEI][jei] 等模组也会在 Item Tooltip 中醒目地显示模组名称。                                                | `mod_name=Example Mod`                     |
| `mod_license`             | 模组采用的许可证。建议将其设为所用的 [SPDX 标识符][spdx]和/或许可证链接。可以访问 https://choosealicense.com/ 帮助选择要使用的许可证。 | `mod_license=MIT`                          |
| `mod_version`             | 模组版本，会显示在模组列表中。更多信息请参阅[版本管理页面][versioning]。                                                                                                                          | `mod_version=1.0`                          |
| `mod_group_id`            | 参阅 [Group ID][group]。                                                                                                                                                                                                              | `mod_group_id=com.example.examplemod`      |

### 模组 ID

模组 ID 是区分你的模组与其他模组的主要方式。它用在许多地方，包括作为模组 [Registry][registration] 的命名空间，以及作为模组 [Resource Pack 和 Data Pack][resource] 的命名空间。如果两个模组使用相同 ID，游戏将无法加载。

因此，模组 ID 应当唯一且易记。通常会使用模组显示名称的小写形式，或其某种变体。模组 ID 只能包含小写字母、数字和下划线，长度必须在 2 到 64 个字符之间（含两端）。

:::info
在 `gradle.properties` 文件中更改此属性，会自动把更改应用到所有位置，但主模组类中的 [`@Mod` 注解][javafml]除外。该处需要手动修改，以匹配 `gradle.properties` 文件中的值。
:::

### Group ID

虽然只有在计划将模组发布到 Maven 时，`build.gradle` 中的 `group` 属性才是必需的，但始终正确设置它仍被视为良好实践。系统会通过 `gradle.properties` 的 `mod_group_id` 属性为你完成设置。

Group ID 应设置为你的顶级包。更多信息请参阅[包结构][packaging]。

```properties
# In your gradle.properties file
mod_group_id=com.example
```

Java 源代码（`src/main/java`）中的包也应遵循这一结构，并用一个内部包表示模组 ID：

```text
com
- example (top-level package specified in group property)
    - mymod (the mod id)
        - MyMod.java (renamed ExampleMod.java)
```

## `neoforge.mods.toml`

`neoforge.mods.toml` 文件位于 `src/main/resources/META-INF/neoforge.mods.toml`，它是一个 [TOML][toml] 格式文件，用于定义模组的 Metadata。它还包含关于模组应如何加载到游戏中的附加信息，以及在“Mods”菜单中显示的信息。[MDK 提供的 `neoforge.mods.toml` 文件][mdkneoforgemodstoml]中含有解释每个条目的注释，下面将更详细地说明这些条目。

`neoforge.mods.toml` 可分为三部分：与模组文件关联的非模组特定属性；每个模组各有一节的模组属性；以及每个模组依赖项各有一节的依赖配置。`neoforge.mods.toml` 文件中的某些属性是必填项；必填属性必须指定值，否则会抛出异常。

:::note
在默认 MDK 中，Gradle 会使用 `gradle.properties` 文件中指定的值替换此文件内的多个属性。例如，`license="${mod_license}"` 这一行表示 `license` 字段会替换为 `gradle.properties` 中的 `mod_license` 属性。对于这样替换的值，应在 `gradle.properties` 中修改，而不是在这里修改。
:::

### 非模组特定属性

非模组特定属性是与 JAR 本身相关的属性，用来指示如何加载模组，以及所有附加的全局 Metadata。

| 属性             | 类型     | 默认值        | 说明                                                                                                                                                                                                                                                                                                                                         | 示例                                                                        |
|----------------------|----------|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| `modLoader`          | string   | `javafml`      | 模组使用的 Language Loader。可以用来支持其他语言结构，例如以 Kotlin Object 作为主文件；也可以支持不同的 Entrypoint 确定方式，例如接口或方法。NeoForge 提供 Java Loader [`"javafml"`][javafml]。  | `modLoader="javafml"`                                                          |
| `loaderVersion`      | string   | `""`           | Language Loader 可接受的版本范围，以 [Maven Version Range][mvr] 表示。对于 `javafml`，当前版本为 `1`。如果未指定版本，则可以使用任意版本的 Mod Loader。                                                                                                                                                                                      | `loaderVersion="[1,)"`                                                         |
| `license`            | string   | **必填**  | 此 JAR 中模组采用的许可证。建议将其设为所用的 [SPDX 标识符][spdx]和/或许可证链接。可以访问 https://choosealicense.com/ 帮助选择要使用的许可证。                                                                                              | `license="MIT"`                                                                |
| `showAsResourcePack` | boolean  | `false`        | 为 `true` 时，模组资源会在“Resource Packs”菜单中显示为独立 Resource Pack，而不是合并到“Mod Resources”Pack 中。                                                                                                                                                                           | `showAsResourcePack=true`                                                      |
| `showAsDataPack`     | boolean  | `false`        | 为 `true` 时，模组数据文件会在“Data Packs”菜单中显示为独立 Data Pack，而不是合并到“Mod Data”Pack 中。                                                                                                                                                                           | `showAsDataPack=true`                                                          |
| `services`           | array    | `[]`           | 模组使用的 Service 数组。NeoForge 实现 Java Platform Module System 时，会把它用作所创建模组模块的一部分。                                                                                                                                                                                   | `services=["net.neoforged.neoforgespi.language.IModLanguageProvider"]`         |
| `properties`         | table    | `{}`           | 替换属性表。`StringSubstitutor` 使用它将 `${file.<key>}` 替换为对应值。                                                                                                                                                                                                                    | `properties={"example"="1.2.3"}`（随后可通过 `${file.example}` 引用） |
| `issueTrackerURL`    | string   | _无_      | 表示模组问题报告和跟踪位置的 URL。                                                                                                                                                                                                                                                                            | `"https://github.com/neoforged/NeoForge/issues"`                               |

:::note
`services` 属性在功能上等同于在模块中指定 [`uses` 指令][uses]，它允许[加载给定类型的 Service][serviceload]。

也可以在 `src/main/resources/META-INF/services` 文件夹内的 Service 文件中定义它，其中，文件名是 Service 的完全限定名称，文件内容则是要加载的 Service 名称（另请参阅 [AtlasViewer 模组中的此示例][atlasviewer]）。
:::

### 模组特定属性

模组特定属性通过 `[[mods]]` 标头与指定模组绑定。这是一个[表数组][array]；直到下一个标头出现之前，所有键值属性都会附加到该模组。

```toml
# Properties for examplemod1
[[mods]]
modId = "examplemod1"

# Properties for examplemod2
[[mods]]
modId = "examplemod2"
```

| 属性         | 类型     | 默认值                      | 说明                                                                                                                                                                                                                                                                    | 示例                                                         |
|------------------|----------|------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| `modId`          | string   | **必填**                | 参阅[模组 ID][modid]。                                                                                                                                                                                                                                                       | `modId="examplemod"`                                            |
| `namespace`      | string   | `modId` 的值             | 模组的覆盖命名空间。它也必须是有效的[模组 ID][modid]，但还可以包含句点或连字符。目前未使用。                                                                                                                                        | `namespace="example"`                                           |
| `version`        | string   | `"1"`                        | 模组版本，最好采用 [Maven 版本规则的某种变体][versioning]。设为 `${file.jarVersion}` 时，会替换为 JAR Manifest 中 `Implementation-Version` 属性的值（在开发环境中显示为 `0.0NONE`）。 | `version="1.20.2-1.0.0"`                                        |
| `displayName`    | string   | `modId` 的值             | 模组的显示名称。在界面上表示模组时使用（例如模组列表、模组不匹配提示）。                                                                                                                                                                        | `displayName="Example Mod"`                                     |
| `description`    | string   | `'''MISSING DESCRIPTION'''`  | 模组列表界面中显示的模组说明。建议使用[多行字面量字符串][multiline]。此值也可翻译，更多信息请参阅[翻译模组 Metadata][i18n]。                                                                | `description='''This is an example.'''`                         |
| `logoFile`       | string   | _无_                    | 模组列表界面中使用的图像文件名称及扩展名。位置必须是从 JAR 或 source set 根目录开始的绝对路径（例如 main source set 对应 `src/main/resources`）。有效文件名字符为小写字母（`a-z`）、数字（`0-9`）、斜杠（`/`）、下划线（`_`）、句点（`.`）和连字符（`-`）。完整字符集为 `[a-z0-9_-.]`。                                                                  | `logoFile="test/example_logo.png"`                              |
| `logoBlur`       | boolean  | `true`                       | 渲染 `logoFile` 时使用 `GL_LINEAR*`（true）还是 `GL_NEAREST*`（false）。简单来说，它决定缩放 Logo 时是否对其进行模糊处理。                                                                                    | `logoBlur=false`                                                |
| `updateJSONURL`  | string   | _无_                    | [更新检查器][update]使用的 JSON URL，用来确保正在运行的模组是最新版本。                                                                                                                                                               | `updateJSONURL="https://example.github.io/update_checker.json"` |
| `modUrl`         | string   | _无_                    | 模组下载页面的 URL。目前未使用。                                                                                                                                                                                                                       | `modUrl="https://neoforged.net/"`                               |
| `credits`        | string   | _无_                    | 在模组列表界面显示的模组致谢信息。                                                                                                                                                                                                             | `credits="The person over here and there."`                     |
| `authors`        | string   | _无_                    | 在模组列表界面显示的模组作者。                                                                                                                                                                                                                           | `authors="Example Person"`                                      |
| `displayURL`     | string   | _无_                    | 在模组列表界面显示的模组展示页面 URL。                                                                                                                                                                                                             | `displayURL="https://neoforged.net/"`                           |
| `enumExtensions` | string   | _无_                    | 用于 [Enum 扩展][enumextension]的 JSON 文件路径                                                                                                                                                                                                          | `enumExtensions="META_INF/enumextensions.json"`                 |
| `featureFlags`   | string   | _无_                    | 用于 [Feature Flag][featureflags] 的 JSON 文件路径                                                                                                                                                                                                            | `featureFlags="META-INF/feature_flags.json"`                    |

#### Feature

Feature 系统允许模组要求加载系统时必须具备特定设置、软件或硬件。如果不满足某项 Feature，模组加载将会失败，并向用户说明相应要求。这些配置使用[表数组][array] `[[features.<modid>]]` 创建，其中 `modid` 是使用该 Feature 的模组标识符。目前，NeoForge 提供以下 Feature：

| Feature          | 说明                                                                                                                                                                                                | 示例                             |
|------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------|
| `javaVersion`   | 可接受的 Java 版本范围，以 [Maven Version Range][mvr] 表示。它应为 Minecraft 所使用的受支持版本。                                                       | `javaVersion="[17,)"`  |

#### 模组属性

模组属性系统是与特定模组关联的任意键值 Map。当一个模组文件定义多个提供不同 Metadata 的模组时，这些属性会很有用。之后，可以通过 `IModInfo#getModProperties` 从 Map 中获取对象值，从而取得某个键对应的具体属性值。这些配置使用[表数组][array] `[[modproperties.<modid>]]` 创建，其中 `modid` 是使用已定义属性的模组标识符。

```java
// Assume we have two mods `mod1` and `mod2` with the following property configuration
// [[modproperties.mod1]]
// key="value1"
// [[modproperties.mod2]]
// key="value2"

@Mod("mod1")
public class ModOne {

    private final String key;

    public ModOne(ModContainer container) {
        // Will store 'value1' in key
        this.key = (String) container.getModInfo().getModProperties().get("key");
    }
}

@Mod("mod2")
public class ModTwo {

    private final String key;

    public ModTwo(ModContainer container) {
        // Will store 'value2' in key
        this.key = (String) container.getModInfo().getModProperties().get("key");
    }
}
```

### Access Transformer 特定属性

[Access Transformer 特定属性][accesstransformer]通过 `[[accessTransformers]]` 标头与指定的 Access Transformer 绑定。这是一个[表数组][array]；直到下一个标头出现之前，所有键值属性都会附加到该 Access Transformer。Access Transformer 标头是可选的；但是一旦指定，其中所有元素都是必填项。

| 属性 |  类型  |    默认值    |             说明              |     示例     |
|:--------:|:------:|:-------------:|:------------------------------------:|:----------------|
| `file`   | string | **必填** | 参阅[添加 AT][accesstransformer]。 | `file="at.cfg"` |

### Mixin 配置属性

[Mixin 配置属性][mixinconfig]通过 `[[mixins]]` 标头与指定的 Mixin Config 绑定。这是一个[表数组][array]；直到下一个标头出现之前，所有键值属性都会附加到该 Mixin 块。Mixin 标头是可选的；但是一旦指定，其中所有元素都是必填项。

| 属性 |  类型  |    默认值    |             说明                       |     示例                       |
|:--------:|:------:|:-------------:|:---------------------------------------------:|:----------------------------------|
| `config` | string | **必填** | Mixin 配置文件的位置。 | `config="examplemod.mixins.json"` |
| `requiredMods` | array | `[]` | 要应用这些 Mixin 时必须存在的模组 ID。 | `requiredMods=["sodium"]` |
| `behaviorVersion` | string | _无_ | 要匹配其行为的 [Fabric Mixin 版本](https://github.com/FabricMC/Mixin/tags)。必须介于默认行为版本（Neo 每次离开破坏性变更窗口时固定）和运行时存在的 Fabric Mixin 版本之间。 | `behaviorVersion="0.17.1"` |

### 依赖项配置

模组可以指定依赖项，NeoForge 会在加载模组前检查这些依赖项。这些配置使用[表数组][array] `[[dependencies.<modid>]]` 创建，其中 `modid` 是使用该依赖项的模组标识符。

| 属性       | 类型    | 默认值        | 说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 示例                                      |
|----------------|---------|----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| `modId`        | string  | **必填**  | 添加为依赖项的模组标识符。                                                                                                                                                                                                                                                                                                                                                                                                                           | `modId="jei"`                                |
| `type`         | string  | `"required"`   | 指定此依赖项的性质：`"required"` 是默认值，缺少此依赖项时会阻止模组加载；`"optional"` 在缺少依赖项时不会阻止模组加载，但仍会验证依赖项是否兼容；`"incompatible"` 在存在此依赖项时阻止模组加载；`"discouraged"` 在存在依赖项时仍允许模组加载，但会向用户显示警告。 | `type="incompatible"`                        |
| `reason`       | string  | _无_      | 可选的用户可见消息，用来说明为什么需要此依赖项，或为什么它不兼容。                                                                                                                                                                                                                                                                                                                                                                    | `reason="integration"`                       |
| `versionRange` | string  | `""`           | Language Loader 可接受的版本范围，以 [Maven Version Range][mvr] 表示。空字符串匹配任意版本。                                                                                                                                                                                                                                                                                                                                       | `versionRange="[1, 2)"`                      |
| `ordering`     | string  | `"NONE"`       | 定义模组必须在此依赖项之前（`"BEFORE"`）还是之后（`"AFTER"`）加载。如果顺序无关，则返回 `"NONE"`。                                                                                                                                                                                                                                                                                                                                    | `ordering="AFTER"`                           |
| `side`         | string  | `"BOTH"`       | 依赖项必须存在的[物理端][sides]：`"CLIENT"`、`"SERVER"` 或 `"BOTH"`。                                                                                                                                                                                                                                                                                                                                                                         | `side="CLIENT"`                              |
| `referralUrl`  | string  | _无_      | 依赖项下载页面的 URL。目前未使用。                                                                                                                                                                                                                                                                                                                                                                                                            | `referralUrl="https://library.example.com/"` |

:::danger
两个模组的 `ordering` 可能因循环依赖而导致崩溃，例如模组 A 必须在模组 B `"BEFORE"` 加载，而模组 B 同时又必须在模组 A `"BEFORE"` 加载。
:::

## 模组 Entrypoint

现在 `neoforge.mods.toml` 已填写完毕，需要为模组提供 Entrypoint。Entrypoint 本质上是模组开始执行的位置。Entrypoint 本身由 `neoforge.mods.toml` 中使用的 Language Loader 决定。

### `javafml` 和 `@Mod`

`javafml` 是 NeoForge 为 Java 编程语言提供的 Language Loader。Entrypoint 使用带 `@Mod` 注解的 public 类定义。`@Mod` 的值必须包含 `neoforge.mods.toml` 中指定的某个模组 ID。随后，所有初始化逻辑（例如[注册事件][events]或[添加 `DeferredRegister`][registration]）都可以写在该类的构造器中。

主模组类只能有一个 public 构造器，否则会抛出 `RuntimeException`。构造器可以按**任意**顺序使用以下**任意**参数；这些参数都不是明确必需的。不过，不允许出现重复参数。

参数类型     | 说明                                                                                              |
------------------|----------------------------------------------------------------------------------------------------------|
`IEventBus`       | [模组专用 Event Bus][modbus]（注册、事件等需要使用）                             |
`ModContainer`    | 保存此模组 Metadata 的抽象容器                                                       |
`FMLModContainer` | `javafml` 定义的实际容器，用于保存此模组 Metadata；它是 `ModContainer` 的扩展 |
`Dist`            | 此模组正在加载的[物理端][sides]                                                        |

```java
@Mod("examplemod") // Must match a mod id in the neoforge.mods.toml
public class ExampleMod {
    // Valid constructor, only uses two of the available argument types
    public ExampleMod(IEventBus modBus, ModContainer container) {
        // Initialize logic here
    }
}
```

默认情况下，`@Mod` 注解会在两个[端][sides]上加载。可以通过指定 `dist` 参数更改这一点：

```java
// Must match a mod id in the neoforge.mods.toml
// This mod class will only be loaded on the physical client
@Mod(value = "examplemod", dist = Dist.CLIENT) 
public class ExampleModClient {
    // Valid constructor
    public ExampleModClient(FMLModContainer container, IEventBus modBus, Dist dist) {
        // Initialize client-only logic here
    }
}
```

:::note
`neoforge.mods.toml` 中的条目不必有对应的 `@Mod` 注解。同样，一个 `neoforge.mods.toml` 条目可以有多个 `@Mod` 注解，例如需要分离通用逻辑与仅客户端逻辑时。
:::

[accesstransformer]: ../advanced/accesstransformers.md#adding-ats
[array]: https://toml.io/en/v1.0.0#array-of-tables
[atlasviewer]: https://github.com/XFactHD/AtlasViewer/blob/1.20.2/neoforge/src/main/resources/META-INF/services/xfacthd.atlasviewer.platform.services.IPlatformHelper
[events]: ../concepts/events.md
[features]: #features
[group]: #the-group-id
[i18n]: ../resources/client/i18n.md#translating-mod-metadata
[javafml]: #javafml-and-mod
[jei]: https://www.curseforge.com/minecraft/mc-mods/jei
[mcversioning]: versioning.md#minecraft
[mdkgradleproperties]: https://github.com/NeoForgeMDKs/MDK-26.1-NeoGradle/blob/main/gradle.properties
[mdkneoforgemodstoml]: https://github.com/NeoForgeMDKs/MDK-26.1-NeoGradle/blob/main/src/main/resources/META-INF/neoforge.mods.toml
[neoforgemodstoml]: #neoforgemodstoml
[mixinconfig]: https://github.com/SpongePowered/Mixin/wiki/Introduction-to-Mixins---The-Mixin-Environment#mixin-configuration-files
[modbus]: ../concepts/events.md#event-buses
[modid]: #the-mod-id
[multiline]: https://toml.io/en/v1.0.0#string
[mvr]: https://maven.apache.org/enforcer/enforcer-rules/versionRanges.html
[neoversioning]: versioning.md#neoforge
[packaging]: structuring.md#packaging
[registration]: ../concepts/registries.md#deferredregister
[resource]: ../resources/index.md
[serviceload]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ServiceLoader.html#load(java.lang.Class)
[sides]: ../concepts/sides.md
[spdx]: https://spdx.org/licenses/
[toml]: https://toml.io/
[update]: ../misc/updatechecker.md
[uses]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html#jls-7.7.3
[versioning]: versioning.md
[enumextension]: ../advanced/extensibleenums.md
[featureflags]: ../advanced/featureflags.md
