# NeoForge 入门（Getting Started）

本节介绍如何搭建 NeoForge 工作区，以及如何运行和测试你的模组。

## 前置要求

- 熟悉 Java 编程语言，尤其是面向对象、多态、泛型和函数式特性。
- 已安装 Java 25 开发工具包（JDK）和 64 位 Java 虚拟机（JVM）。NeoForge 推荐并正式支持 [Microsoft 的 OpenJDK 发行版][jdk]，不过其他 JDK 通常也可以正常使用。

:::warning
请确保你使用的是 64 位 JVM。一种检查方法是在终端中运行 `java -version`。Minecraft 不支持 32 位 JVM。
:::

- 熟悉你所选择的集成开发环境（IDE）。
  - NeoForge 正式支持 [IntelliJ IDEA][intellij] 和 [Eclipse][eclipse]，二者都集成了 Gradle 支持。不过，从 NetBeans、Visual Studio Code 到 Vim 或 Emacs，任何 IDE 都可以使用。
- 熟悉 [Git][git] 和 [GitHub][github]。严格来说这不是必需条件，但它会让你的开发工作轻松许多。

## 搭建工作区

- 前往 [Mod Generator][modgen] 网页，填写模组名称（以及可选的模组 ID）、包名、Minecraft 版本和 Gradle 插件（[ModDevGradle][mdg] 或 [NeoGradle][ng]），单击“Download Mod Project”，然后解压下载的 ZIP 文件。
- 打开 IDE 并导入 Gradle 项目。Eclipse 和 IntelliJ IDEA 会自动完成这一步。如果你的 IDE 不会自动导入，也可以通过终端命令 `gradlew` 完成。
  - 第一次执行时，Gradle 会下载 NeoForge 的全部依赖项（包括 Minecraft 本身）并对其进行反编译。这个过程可能需要相当长时间（取决于硬件和网络状况，最长可能达到一小时）。
  - 每当你修改 Gradle 文件后，都需要重新加载 Gradle 变更；可以单击 IDE 中的“Reload Gradle”按钮，也可以再次运行终端命令 `gradlew`。

## 自定义模组信息

模组的许多基本属性都可以在 `gradle.properties` 文件中修改，包括模组名称、模组版本等。更多信息请参阅 `gradle.properties` 文件内的注释，或查看 [`gradle.properties` 文件文档][properties]。

如果还想进一步修改构建流程，可以编辑 `build.gradle` 和 `settings.gradle` 文件。NeoForge 提供的 Gradle 插件（[ModDevGradle][mdg] 或 [NeoGradle][ng]）提供了多种配置选项，其中一些已在构建脚本中通过注释加以说明。

:::warning
只有在清楚自己正在做什么的情况下，才应编辑 `build.gradle` 和 `settings.gradle` 文件。所有基本属性都可以通过 `gradle.properties` 设置。
:::

## 构建和测试模组

要构建模组，请运行 `gradlew build`。该命令会在 `build/libs` 中输出一个名为 `<archivesBaseName>-<version>.jar` 的文件。`<archivesBaseName>` 和 `<version>` 分别是由 `build.gradle` 设置的属性，默认对应 `gradle.properties` 文件中的 `mod_id` 和 `mod_version` 值；如有需要，可以在 `build.gradle` 中更改。生成的 JAR 文件随后可放入启用了 NeoForge 的 Minecraft 实例的 `mods` 文件夹，也可以上传到模组分发平台。

要在测试环境中运行模组，可以使用生成的运行配置，也可以使用相应任务（例如 `gradlew runClient`）。这会从对应的运行目录（例如 `runs/client` 或 `runs/server`）启动 Minecraft，并加载所有指定的 source set。默认 MDK 包含 `main` source set，因此写在 `src/main/java` 中的所有代码都会生效。

### 服务端测试

如果通过运行配置或 `gradlew runServer` 启动专用服务器，服务器会立即关闭。你需要编辑运行目录中的 `eula.txt` 文件，接受 Minecraft EULA。

接受后，服务器会加载并可通过 `localhost`（默认也就是 `127.0.0.1`）访问。不过，你仍然无法加入，因为服务器默认会启用在线模式，而该模式要求进行身份验证（Dev 玩家没有这种身份凭据）。要解决此问题，请再次停止服务器，并将 `server.properties` 文件中的 `online-mode` 属性设置为 `false`。现在重新启动服务器，应该就可以连接了。

:::tip
你应该始终在专用服务器环境中测试模组。这也包括[仅客户端模组][client]，因为这类模组在服务端加载时不应执行任何操作。
:::

[client]: ../concepts/sides.md
[eclipse]: https://www.eclipse.org/downloads/
[git]: https://www.git-scm.com/
[github]: https://github.com/
[intellij]: https://www.jetbrains.com/idea/
[jdk]: https://learn.microsoft.com/en-us/java/openjdk/download#openjdk-25
[mdg]: https://github.com/neoforged/ModDevGradle
[modgen]: https://neoforged.net/mod-generator/
[ng]: https://github.com/neoforged/NeoGradle
[properties]: modfiles.md#gradleproperties
