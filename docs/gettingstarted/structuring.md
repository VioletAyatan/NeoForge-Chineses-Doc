# 组织你的模组（Structuring Your Mod）

结构清晰的模组更易于维护、接受贡献，也能让人更清楚地理解底层代码库。下面列出了 Java、Minecraft 和 NeoForge 方面的一些建议。

:::info
你不必遵循下面的建议，可以用任何认为合适的方式组织模组。不过，我们仍然强烈建议遵循这些建议。
:::

## 包结构

组织模组时，应选择一个唯一的顶级包结构。许多程序员会为不同的类、接口等使用相同名称。Java 允许不同包中的类具有相同名称。因此，如果两个类的包和名称都相同，就只会加载其中一个，这很可能导致游戏崩溃。

```
a.jar
    - com.example.ExampleClass
b.jar
    - com.example.ExampleClass // This class will not normally be loaded
```

加载模块时，这一点更为重要。如果不同模块中存在两个同名包并且其中含有类文件，模组加载器会在启动时崩溃，因为模组模块会导出给游戏和其他模组。

```
module A
    - package X
        - class I
        - class J
module B
    - package X // This package will cause the mod loader to crash, as there already is a module with package X being exported
        - class R
        - class S
        - class T
```

因此，你的顶级包应当使用你所拥有的标识：域名、电子邮件地址、网站（或其子域名）等。也可以使用你的姓名或用户名，只要能够保证它在预期目标范围内具有唯一可识别性。此外，顶级包还应与你的 [group id][group] 相匹配。

|   类型    |       值       | 顶级包   |
|:---------:|:-----------------:|:--------------------|
|  域名   |    example.com    | `com.example`       |
| 子域名 | example.github.io | `io.github.example` |
|   电子邮件   | example@gmail.com | `com.gmail.example` |

下一层包应当使用模组 ID（例如 `com.example.examplemod`，其中 `examplemod` 是模组 ID）。这样可以保证，只要没有两个模组使用相同 ID（这种情况绝不应该发生），你的包在加载时就不会出现问题。

你可以在 [Oracle 教程页面][naming]中找到更多命名约定。

### 子包组织方式

除了顶级包之外，还强烈建议将模组的类划分到多个子包中。主要有两种组织方式：

- **按功能分组**：为用途相同的类创建子包。例如，Block 可以放在 `block` 下，Item 放在 `item` 下，Entity 放在 `entity` 下，依此类推。Minecraft 本身也采用了类似结构（有少数例外）。
- **按逻辑分组**：为逻辑相关的类创建子包。例如，如果你要创建一种新的工作台，可以把它的 Block、Menu、Item 等放在 `feature.crafting_table` 下。

#### 客户端、服务端和数据包

一般而言，仅供特定物理端或运行时使用的代码，应当放入单独的子包，与其他类隔离。例如，与[数据生成][datagen]有关的代码应放入 `data` 包，而仅供专用服务器使用的代码应放入 `server` 包。

强烈建议把[仅客户端代码][sides]隔离在 `client` 子包中。这是因为专用服务器无法访问 Minecraft 中任何仅客户端包；如果模组仍尝试访问它们，服务器就会崩溃。因此，使用专门的包也能提供一项有效的基本检查，帮助确认模组代码没有跨物理端访问。

## 类命名方案

采用统一的类命名方案，可以更容易判断类的用途，也更容易找到特定类。

类名通常会以类型作为后缀，例如：

- 名为 `PowerRing` 的 `Item` -> `PowerRingItem`。
- 名为 `NotDirt` 的 `Block` -> `NotDirtBlock`。
- `Oven` 的 Menu -> `OvenMenu`。

:::tip
除 Entity 外，Mojang 通常对所有类采用类似结构。Entity 只使用自身名称表示（例如 `Pig`、`Zombie` 等）。
:::

## 从多种方法中选定一种

执行某项任务往往有多种方法，例如注册对象、监听事件等。通常建议保持一致，对同一类任务只使用一种方法。这样可以提高可读性，并避免可能发生的异常交互或重复操作（例如事件处理器运行两次）。

[group]: index.md#the-group-id
[naming]: https://docs.oracle.com/javase/tutorial/java/package/namingpkgs.html
[datagen]: ../resources/index.md#data-generation
[sides]: ../concepts/sides.md

