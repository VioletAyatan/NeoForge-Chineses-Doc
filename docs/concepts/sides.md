# 端（Sides）

与许多其他程序一样，Minecraft 采用客户端—服务端概念：客户端负责显示数据，服务端负责更新数据。使用这些术语时，我们似乎能相当直观地理解其含义……对吧？

事实并非如此简单。许多困惑源于 Minecraft 根据上下文使用了两种不同的端概念：物理端与逻辑端。

## 逻辑端与物理端

### 物理端

当你打开 Minecraft 启动器、选择一个 Minecraft 安装并点击开始游戏时，启动的是一个**物理客户端**。这里的“物理”表示“这是一个客户端程序”。这尤其意味着渲染等客户端侧功能在此可用，并能按需使用。与之相对，启动 Minecraft 服务端 JAR 时打开的是**物理服务端**，也称专用服务端。尽管 Minecraft 服务端带有一个基础 GUI，但它不包含任何仅客户端可用的功能。最值得注意的是，服务端 JAR 中缺少多种客户端类。在物理服务端调用这些类会导致类缺失错误，也就是崩溃，因此我们需要采取防护措施。

### 逻辑端

逻辑端主要关注 Minecraft 的内部程序结构。**逻辑服务端**是游戏逻辑运行的位置。时间和天气变化、Entity tick、Entity 生成等都在服务端运行。物品栏内容等各类数据也由服务端负责。另一方面，**逻辑客户端**负责显示所有需要显示的内容。Minecraft 将全部客户端代码隔离在 `net.minecraft.client` 包中，并在一个称为 Render Thread 的独立线程里运行它们；其余所有内容则视为通用代码（即客户端与服务端共用的代码）。

### 有什么区别？

物理端与逻辑端之间的区别，最好通过以下两种场景说明：

- 玩家加入一个**多人游戏**世界。这个场景相当直接：玩家的物理（以及逻辑）客户端连接到别处的一个物理（以及逻辑）服务端——玩家并不关心它在哪里；只要能够连接，这就是客户端所知道、也只需知道的全部。
- 玩家加入一个**单人游戏**世界。这时情况变得有趣。玩家的物理客户端会启动一个逻辑服务端，然后以逻辑客户端的身份连接到同一台机器上的该逻辑服务端。如果你熟悉网络，可以将其理解为连接到 `localhost`（仅为概念上的类比；实际上并不涉及 socket 或类似机制）。

这两个场景也揭示了其中的主要问题：逻辑服务端能够使用你的代码，并不代表物理服务端也一定能够使用它。因此，你应始终使用专用服务端进行测试，以检查意外行为。由于客户端与服务端分离不正确而产生的 `NoClassDefFoundError` 和 `ClassNotFoundException`，是模组开发中最常见的错误之一。另一个常见错误是使用静态字段，并从两个逻辑端访问它们；这尤其棘手，因为通常不会有任何迹象表明出了问题。

:::tip
如果需要将数据从一个端传输到另一个端，必须[发送数据包][networking]。
:::

在 NeoForge 代码库中，物理端由名为 `Dist` 的枚举表示，逻辑端则由名为 `LogicalSide` 的枚举表示。

:::info
历史上，服务端 JAR 曾包含客户端所没有的类。现代版本中已不再如此；可以说，物理服务端是物理客户端的一个子集。
:::

## 执行特定端的操作

### `Level#isClientSide()`

这个 boolean 检查将是你最常用的端检查方式。查询 `Level` 对象上的这个字段，可以确定该 Level 所属的**逻辑端**：如果该字段为 `true`，Level 正运行在逻辑客户端；如果为 `false`，Level 正运行在逻辑服务端。由此可知，物理服务端上的该字段始终为 `false`，但不能反过来认为 `false` 就代表物理服务端，因为物理客户端内部的逻辑服务端（即单人游戏世界）上，该字段同样可能为 `false`。

每当需要判断是否应运行游戏逻辑或其他机制时，都应使用此检查。例如，如果你想让玩家每次点击你的 Block 时受到伤害，或让你的机器把泥土加工成钻石，就只应在确认 `#isClientSide()` 为 `false` 后执行。在逻辑客户端应用游戏逻辑，轻则造成不同步（幽灵 Entity、属性不同步等），重则导致崩溃。

:::tip
应将此检查作为首选默认方式。只要有可用的 `Level`，就使用此检查。
:::

### `FMLEnvironment#getDist()`

`FMLEnvironment#getDist()` 是 `Level#isClientSide()` 检查在**物理端**方面的对应方式。如果该字段为 `Dist.CLIENT`，你正处于物理客户端；如果为 `Dist.DEDICATED_SERVER`，你正处于物理服务端。

#### `@Mod`

处理仅客户端可用的类时，检查物理环境十分重要。要分离只应在某一个物理端执行的代码，推荐做法是指定一个单独的 [`@Mod` 注解][mod]，并将 `dist` 参数设置为应加载该 mod 类的物理端：

```java
@Mod("examplemod")
public class ExampleMod {
    public ExampleMod(IEventBus modBus) {
        // 执行应在两端运行的逻辑
    }
}

@Mod(value = "examplemod", dist = Dist.CLIENT) 
public class ExampleModClient {
    public ExampleModClient(IEventBus modBus) {
        // 执行仅应在物理客户端运行的逻辑
    }
}

@Mod(value = "examplemod", dist = Dist.DEDICATED_SERVER) 
public class ExampleModDedicatedServer {
    public ExampleModDedicatedServer(IEventBus modBus) {
        // 执行仅应在物理服务端运行的逻辑
    }
}
```

:::tip
通常期望模组能在任一端正常工作。这尤其意味着：如果你正在开发仅客户端模组，应验证该模组确实运行在物理客户端上，并在不满足条件时不执行任何操作。
:::

[networking]: ../networking/index.md
[mod]: ../gettingstarted/modfiles.md#javafml-and-mod
