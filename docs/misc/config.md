# 配置（Configuration）

配置用于定义可以应用于模组实例的设置和用户偏好。NeoForge 使用基于 [TOML][toml] 文件的配置系统，并通过 [NightConfig][nightconfig] 读取。

## 创建配置

可以通过 `IConfigSpec` 的子类型创建配置。NeoForge 使用 `ModConfigSpec` 实现该类型，并通过 `ModConfigSpec.Builder` 构建它。builder 可以通过 `Builder#push` 创建区段，再通过 `Builder#pop` 退出区段，从而把配置值划分到不同区段。之后，可以使用以下两种方法之一构建配置：

 方法        | 说明
 :---        | :---
`build`      | 创建 `ModConfigSpec`。
`configure`  | 创建一个 pair，其中包含保存配置值的类和 `ModConfigSpec`。

:::info
`ModConfigSpec.Builder#configure` 通常与 `static` 块以及一个构造器接收 `ModConfigSpec.Builder` 的类配合使用，用于附加并保存值：

```java
//Define a field to keep the config and spec for later
public static final ExampleConfig CONFIG;
public static final ModConfigSpec CONFIG_SPEC;

private ExampleConfig(ModConfigSpec.Builder builder) {
    // Define properties used by the configuration
    // ...
}

//CONFIG and CONFIG_SPEC are both built from the same builder, so we use a static block to seperate the properties
static {
    Pair<ExampleConfig, ModConfigSpec> pair =
            new ModConfigSpec.Builder().configure(ExampleConfig::new);
        
    //Store the resulting values
    CONFIG = pair.getLeft();
    CONFIG_SPEC = pair.getRight();
}
```
:::

每个配置值都可以附加额外上下文，以提供额外行为。必须在配置值完全构建之前定义这些上下文：

| 方法 | 说明 |
|:---|:---|
| `comment` | 说明配置值的作用。可以提供多个字符串，形成多行注释。 |
| `translation` | 提供配置值名称的翻译键。 |
| `worldRestart` | 修改配置值前必须重启世界。 |
| `gameRestart` | 修改配置值前必须重启游戏。 |

### ConfigValue

可以使用任意 `#define` 方法，根据已经定义的上下文构建配置值。

所有配置值方法至少接收两项内容：

- 表示变量名称的路径：用 `.` 分隔的字符串，表示配置值所处的各个区段。
- 没有有效配置时使用的默认值。

`ConfigValue` 专用方法还会接收另外两项内容：

- validator，用于确保反序列化后的对象有效。
- 表示配置值数据类型的类。

```java
//Store the config properties as public finals
public final ModConfigSpec.ConfigValue<String> welcomeMessage;

private ExampleConfig(ModConfigSpec.Builder builder) {
    //Define each property
    //One property could be a message to log to the console when the game is initialised
    welcomeMessage = builder.define("welcome_message", "Hello from the config!");
}
```

可以使用 `ConfigValue#get` 取得值。值还会被缓存，以避免多次读取文件。

#### 其他配置值类型

- **范围值**
    - 说明：值必须位于定义的边界之间。
    - 类类型：`Comparable<T>`
    - 方法名称：`#defineInRange`
    - 附加内容：
        - 配置值允许的最小值和最大值。
        - 表示配置值数据类型的类。

:::info
`DoubleValue`、`IntValue` 和 `LongValue` 都是范围值，分别把类指定为 `Double`、`Integer` 和 `Long`。
:::

- **白名单值**
    - 说明：值必须存在于所提供的 collection 中。
    - 类类型：`T`
    - 方法名称：`#defineInList`
    - 附加内容：
        - 配置允许使用的值组成的 collection。

- **List 值**
    - 说明：值是由多个条目组成的 list。
    - 类类型：`List<T>`
    - 方法名称：`#defineList`；如果 list 可以为空，则使用 `#defineListAllowEmpty`。
    - 附加内容：
        - 在配置界面中添加新条目时，返回默认值的 supplier。
        - 确保 list 中反序列化元素有效的 validator。
        - 可选的 validator，用于确保 list 中的条目数量不会过少或过多。

- **枚举值**
    - 说明：所提供 collection 中的一个枚举值。
    - 类类型：`Enum<T>`
    - 方法名称：`#defineEnum`
    - 附加内容：
        - 把字符串或 integer 转换为枚举的 getter。
        - 配置允许使用的值组成的 collection。

- **Boolean 值**
    - 说明：一个 `boolean` 值。
    - 类类型：`Boolean`
    - 方法名称：`#define`

## 注册配置

构建 `ModConfigSpec` 后，必须对其进行注册，NeoForge 才能按需加载、跟踪和同步配置设置。应在模组构造器中通过 `ModContainer#registerConfig` 注册配置。注册时可以提供表示配置所属端的[类型][configtype]、`ModConfigSpec`，还可以选择提供特定的配置文件名。

```java
// In the main mod file with a ModConfigSpec CONFIG_SPEC
public ExampleMod(ModContainer container) {
    ...
    //Register the config
    container.registerConfig(ModConfig.Type.COMMON, ExampleConfig.CONFIG_SPEC);
    ...
}
```

### 配置类型

配置类型决定配置文件所在位置、加载时机，以及文件是否通过网络同步。默认情况下，所有配置都从物理客户端上的 `.minecraft/config` 或物理服务器上的 `<server_folder>/config` 加载。各配置类型之间的具体区别如下。

:::tip
NeoForge 在其代码库中记录了[配置类型][type]。
:::

- `STARTUP`
    - 在物理客户端和物理服务器上均从 config 文件夹加载。
    - 注册时立即读取。
    - **不会**通过网络同步。
    - 默认使用 `-startup` 后缀。

:::warning
注册为 `STARTUP` 类型的配置可能导致客户端与服务器不同步，例如使用该配置禁止注册某些内容时。因此，强烈建议不要使用 `STARTUP` 中的配置来启用或禁用可能改变模组内容的功能。
:::

- `CLIENT`
    - **仅**在物理客户端上从 config 文件夹加载。
        - 该配置类型没有服务器端位置。
    - 在触发 `FMLCommonSetupEvent` 之前立即读取。
    - **不会**通过网络同步。
    - 默认使用 `-client` 后缀。
- `COMMON`
    - 在物理客户端和物理服务器上均从 config 文件夹加载。
    - 在触发 `FMLCommonSetupEvent` 之前立即读取。
    - **不会**通过网络同步。
    - 默认使用 `-common` 后缀。
- `SERVER`
    - 在物理客户端和物理服务器上均从 config 文件夹加载。
        - 可以通过在以下位置添加配置，为每个世界覆盖该配置：
            - 客户端：`.minecraft/saves/<world_name>/serverconfig`
            - 服务器：`<server_folder>/world/serverconfig`
    - 在触发 `ServerAboutToStartEvent` 之前立即读取。
    - 通过网络同步到客户端。
    - 默认使用 `-server` 后缀。

## 配置事件

每当配置被加载、重新加载或卸载时，可以分别使用 `ModConfigEvent.Loading`、`ModConfigEvent.Reloading` 和 `ModConfigEvent.Unloading` 事件执行操作。这些事件必须[注册][events]到模组事件总线。

:::warning
这些事件会针对模组的所有配置调用；应使用事件提供的 `ModConfig` 对象判断正在加载或重新加载的是哪个配置。
:::

## 配置界面

配置界面允许用户在游戏内编辑模组的配置值，而无需打开任何文件。界面会自动解析已经注册的配置文件，并填充相应内容。

模组可以使用 NeoForge 提供的内置配置界面；可以继承 `ConfigurationScreen` 修改默认界面的行为，也可以创建自己的配置界面。模组还可以完全从头创建界面，再通过下述 extension point 把自定义界面提供给 NeoForge。

可以在构建[客户端][client]模组时注册 `IConfigScreenFactory` extension point，为模组注册配置界面：

```java
// In the main client mod file
public ExampleModClient(ModContainer container) {
    ...
    // This will use NeoForge's ConfigurationScreen to display this mod's configs
    container.registerExtensionPoint(IConfigScreenFactory.class, ConfigurationScreen::new);
    ...
}
```

在游戏内打开“Mods”页面，从侧栏选择模组，再单击“Config”按钮，即可访问配置界面。Startup、Common 和 Client 配置选项始终可以编辑。只有在本地世界中游玩时，才能在该界面编辑 Server 配置；如果连接到服务器或其他人的局域网世界，界面中的 Server 配置选项会被禁用。模组配置界面的第一页会列出所有已注册的配置文件，供玩家选择要编辑的文件。

:::warning
如果要制作配置界面，应为所有配置条目添加翻译键，并在语言 JSON 中定义对应文本。

可以使用 `ModConfigSpec$Builder#translation` 方法为配置指定翻译键。因此，前面的代码可以扩展为：

```java
ConfigValue<T> value = builder.comment("This value is called 'config_value_name', and is set to defaultValue if no existing config is present")
    .translation("modid.config.config_value_name")
    .define("config_value_name", defaultValue);
```

为了更方便地完成翻译，请打开配置界面并访问所有配置及其子区段，然后返回模组列表界面。此时，遇到的所有未翻译配置条目都会输出到控制台，因此更容易确定需要翻译哪些内容以及对应的翻译键。
:::

[toml]: https://toml.io/
[nightconfig]: https://github.com/TheElectronWill/night-config
[configtype]: #configuration-types
[type]: https://github.com/neoforged/FancyModLoader/blob/aafe4660ae6eff2702ec786dba8e83c69c0d9e91/loader/src/main/java/net/neoforged/fml/config/ModConfig.java#L88-L121
[events]: ../concepts/events.md#注册事件处理器
[client]: ../concepts/sides.md#mod
