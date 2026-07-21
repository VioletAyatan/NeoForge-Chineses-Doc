# GameTest

GameTest 是运行游戏内单元测试的一种方式。该系统的设计目标是可扩展、可并行，以便高效运行大量不同测试。测试对象交互与行为只是此框架众多用途中的一小部分。由于该系统既可完全用代码实现，也可通过 [datapack][datapacks] 实现，下面将同时展示两种方式。

## 创建 GameTest

标准 GameTest 遵循四个基本步骤：

1. 加载一个包含场景的 structure（即 template），在其中测试交互或行为。
1. 提供测试运行所用的 environment。
1. 提供用于运行逻辑的已注册 function。如果达到成功状态，测试成功；否则测试失败，并将结果存储在场景旁的讲台中。
1. 提供一个 test instance，把其他三个对象连接在一起。

## 测试数据

所有 test instance 都持有某个 `TestData`，它定义 GameTest 的运行方式，从初始配置到所用 environment 与 structure template。由于 `TestData` 序列化为 `MapCodec`，数据与其他所有 instance 特定参数一起存储在文件根级别。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some game test examplemod:example_test
// In 'data/examplemod/test_instance/example_test.json'
{
    // `TestData`

    // The environment to run the test in
    // Points to 'data/examplemod/test_environment/example_environment.json'
    "environment": "examplemod:example_environment",

    // The structure used for the game test
    // Points to 'data/examplemod/structure/example_structure.nbt'
    "structure": "examplemod:example_structure",

    // The number of ticks that the game test will run until it automatically fails
    "max_ticks": 400,

    // The number of ticks that are used to setup everything required for the game test
    // This is not counted towards the maximum number of ticks the test can take
    // If not specified, defaults to 0
    "setup_ticks": 50,

    // Whether the test is required to succeed to mark the batch run as successful
    // If not specified, defaults to true
    "required": true,

    // Specifies how the structure and all subsequent helper methods should be rotated for the test
    // If not specified, nothing is rotated
    // Can be 'none', 'clockwise_90', '180', 'counterclockwise_90'
    "rotation": "clockwise_90",

    // When true, the test can only be ran through the `/test` command
    // If not specified, defaults to false
    "manual_only": true,

    // Specifies the maximum number of times that the test can be reran
    // If not specified, defaults to 1
    "max_attempts": 3,

    // Specifies the minimum number of successes that must occur for a test to be marked as successful
    // This must be less than or equal to the maximum number of attempts allowed
    // If not specified, defaults to 1
    "required_successes": 1,

    // Returns whether the structure boundary should keep the top empty
    // This is currently only used in block-based test instances
    // If not specified, defaults to false 
    "sky_access": false

    // ...
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_INSTANCE, bootstrap -> {
            // Use this to get the test environments
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // Register a game test
            // Any fields not relevant to the test data are hidden
            bootstrap.register(..., new FunctionGameTestInstance(...,
                new TestData<>(
                    // The environment to run the test in
                    // Points to 'data/examplemod/test_environment/example_environment.json'
                    environments.getOrThrow(EXAMPLE_ENVIRONMENT),

                    // The structure used for the game test
                    // Points to 'data/examplemod/structure/example_structure.nbt'
                    Identifier.fromNamespaceAndPath("examplemod", "example_structure"),

                    // The number of ticks that the game test will run until it automatically fails
                    400,

                    // The number of ticks that are used to setup everything required for the game test
                    // This is not counted towards the maximum number of ticks the test can take
                    // If not specified, defaults to 0
                    50,

                    // Whether the test is required to succeed to mark the batch run as successful
                    // If not specified, defaults to true
                    true,

                    // Specifies how the structure and all subsequent helper methods should be rotated for the test
                    // If not specified, nothing is rotated
                    // Can be 'none', 'clockwise_90', '180', 'counterclockwise_90'
                    Rotation.CLOCKWISE_90,

                    // When true, the test can only be ran through the `/test` command
                    // If not specified, defaults to false
                    true,

                    // Specifies the maximum number of times that the test can be reran
                    // If not specified, defaults to 1
                    3,

                    // Specifies the minimum number of successes that must occur for a test to be marked as successful
                    // This must be less than or equal to the maximum number of attempts allowed
                    // If not specified, defaults to 1
                    1,

                    // Returns whether the structure boundary should keep the top empty
                    // This is currently only used in block-based test instances
                    // If not specified, defaults to false 
                    false
                )
            ));
        })
    );
}
```

</TabItem>
</Tabs>

## Structure Template

GameTest 在 structure（即 template）所加载的场景中执行。所有 template 都定义场景尺寸，以及将要加载的初始数据（Block 与 Entity）。Template 必须以 `.nbt` 文件形式存储在 `data/<namespace>/structure` 中。`TestData#structure` 使用相对 `Identifier` 引用 NBT 文件（例如，`examplemod:example_structure` 指向 `data/examplemod/structure/example_structure.nbt`）。

## 测试 Environment

所有 GameTest 都在某个 `TestEnvironmentDefinition` 中运行，它决定如何设置当前 `ServerLevel`。测试完成后会拆除 environment，让下一个或下一批 instance 运行。所有 environment 都会分批处理，这意味着如果多个 test instance 具有相同 environment，它们会同时运行。所有测试 environment 都位于 `data/<namespace>/test_environment/<path>.json`。

Vanilla 提供不会修改 `ServerLevel` 的 `minecraft:default`。不过，还支持其他可用于构造 environment 的 definition type。

### GameRule

此 environment type 设置测试使用的 GameRule。拆除期间，GameRule 会重置为默认值。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// In 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:game_rules",

    // A map of game rules to their set values
    "rules": {
        "minecraft:fire_damage": false,
        "minecraft:players_sleeping_percentage": 50
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {

            // Register the environment
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.SetGameRules(
                    new GameRuleMap.Builder()
                        // A map of game rules to their set values
                        .set(GameRules.FIRE_DAMAGE, false)
                        .set(GameRules.PLAYERS_SLEEPING_PERCENTAGE, 50)
                        .build()
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### Clock 时间

此 environment type 将指定 `WorldClock` 的时间设置为某个非负整数，其方式类似使用 `/time of <clock> set <number>` 命令。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// In 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:clock_time",

    // The clock to set the time of
    // Points to a registered clock at `data/<namespace>/world_clock/<path>.json`
    "clock": "minecraft:overworld",

    // Sets the time of the clock
    "time": 13000
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {
            // Getting clocks
            HolderGetter<WorldClock> clocks = bootstrap.lookup(Registries.WORLD_CLOCK);

            // Register the environment
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.ClockTime(
                    // The clock to set the time of
                    clocks.getOrThrow(WorldClocks.OVERWORLD),
                    // Sets the time of the clock
                    13000
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### Timeline Attribute

此 environment type 设置应用到 Level 中 environment attribute 的 timeline。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// In 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:timeline_attributes",

    // The timelines to apply to the level
    "timelines": [
        "minecraft:day",
        "minecraft:moon"
    ]
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {
            // Getting timelines
            HolderGetter<Timeline> timelines = bootstrap.lookup(Registries.TIMELINE);

            // Register the environment
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.Timelines(
                    // The timelines to apply to the level
                    List.of(
                        timelines.getOrThrow(Timelines.OVERWORLD_DAY),
                        timelines.getOrThrow(Timelines.MOON)
                    )
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### 天气

此 environment type 设置天气，其方式类似使用 `/weather` 命令。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// In 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:weather",

    // Can be one of three values:
    // - clear   (No weather)
    // - rain    (Rain)
    // - thunder (Rain and thunder)
    "weather": "thunder"
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {

            // Register the environment
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.Weather(
                    // Can be one of three values:
                    // - clear   (No weather)
                    // - rain    (Rain)
                    // - thunder (Rain and thunder)
                    TestEnvironmentDefinition.Weather.Type.THUNDER
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### Minecraft Function

此 environment type 分别向两个 `mcfunction` 提供 Identifier，用于设置与拆除 Level。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// In 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:function",

    // The setup mcfunction to use
    // If not specified, nothing will be ran
    // Points to 'data/examplemod/function/example/setup.mcfunction'
    "setup": "examplemod:example/setup",

    // The teardown mcfunction to use
    // If not specified, nothing will be ran
    // Points to 'data/examplemod/function/example/teardown.mcfunction'
    "teardown": "examplemod:example/teardown"
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {

            // Register the environment
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.Functions(
                    // The setup mcfunction to use
                    // If not specified, nothing will be ran
                    // Points to 'data/examplemod/function/example/setup.mcfunction'
                    Optional.of(Identifier.fromNamespaceAndPath("examplemod", "example/setup")),

                    // The teardown mcfunction to use
                    // If not specified, nothing will be ran
                    // Points to 'data/examplemod/function/example/teardown.mcfunction'
                    Optional.of(Identifier.fromNamespaceAndPath("examplemod", "example/teardown"))
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### 组合

可以使用 composite environment type 合并多个 environment。Definition 列表可以接受对现有 definition 的引用，也可以接受 inline definition。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// In 'data/examplemod/test_environment/example_environment.json'
{
    "type": "minecraft:all_of",

    // A list of test environments to use
    // Can either specified the registry name or the environment itself
    "definitions": [
        // Points to 'data/minecraft/test_environment/default.json'
        "minecraft:default",
        {
            // A raw environment definition
            "type": "..."
        }
        // ...
    ]
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {
            // Getting existing environments
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // Register the environment
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new TestEnvironmentDefinition.AllOf(
                    List.of(
                        // Points to 'data/minecraft/test_environment/default.json'
                        environments.getOrThrow(GameTestEnvironments.DEFAULT_KEY),
                        Holder.direct(
                            // Create a new TestEnvironmentDefinition here
                            ...
                        )
                        // ...
                    )
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

### 自定义 Definition Type

自定义 `TestEnvironmentDefinition<SavedDataType>` type 提供三个方法：`setup` 用于修改 `ServerLevel` 并返回先前的 `SavedDataType` generic 状态；`teardown` 使用 `SavedDataType` 重置所做的修改；`codec` 提供用于编解码该类型的 `MapCodec`：

```java
public record ExampleEnvironmentType(int value1, boolean value2) implements TestEnvironmentDefinition<Pair<Integer, Boolean>> {

    // Construct the map codec to register
    public static final MapCodec<ExampleEnvironmentType> CODEC = RecordCodecBuilder.mapCodec(instance -> instance.group(
            Codec.INT.fieldOf("value1").forGetter(ExampleEnvironmentType::value1),
            Codec.BOOL.fieldOf("value2").forGetter(ExampleEnvironmentType::value2)
        ).apply(instance, ExampleEnvironmentType::new)
    );

    @Override
    public Pair<Integer, Boolean> setup(ServerLevel level) {
        // Setup whatever is necessary here
        // return the original values of the modified level data
    }

    @Override
    public void teardown(ServerLevel level, Pair<Integer, Boolean> originalState) {
        // Undo whatever was changed within the setup method
        // This use the original state to reset the data
    }

    @Override
    public MapCodec<ExampleEnvironmentType> codec() {
        return CODEC;
    }
}
```

随后可以[注册][registered] `MapCodec`：


```java
public static final DeferredRegister<MapCodec<? extends TestEnvironmentDefinition>> TEST_ENVIRONMENT_DEFINITION_TYPES = DeferredRegister.create(
        BuiltInRegistries.TEST_ENVIRONMENT_DEFINITION_TYPE,
        "examplemod"
);

public static final Supplier<MapCodec<ExampleEnvironmentType>> EXAMPLE_ENVIRONMENT_CODEC = TEST_ENVIRONMENT_DEFINITION_TYPES.register(
    "example_environment_type",
    () -> ExampleEnvironmentType.CODEC
);
```

最后，即可在 environment definition 中使用该 type：

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// examplemod:example_environment
// In 'data/examplemod/test_environment/example_environment.json'
{
    "type": "examplemod:example_environment_type",

    "value1": 0,
    "value2": true
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_ENVIRONMENT, bootstrap -> {

            // Register the environment
            bootstrap.register(
                EXAMPLE_ENVIRONMENT,
                new ExampleEnvironmentType(
                    0, true
                )
            );
        })
    );
}
```

</TabItem>
</Tabs>

## 测试 Function

GameTest 的基本概念围绕运行某个接受 `GameTestHelper` 且不返回任何内容的方法构建。调用 `GameTestHelper` 中的方法决定测试成功还是失败。每个测试 function 都会[注册][registered]，以便在 test instance 中引用：

```java
public class ExampleFunctions {

    // Here is our example function
    public static void exampleTest(GameTestHelper helper) {
        // Do Stuff
    }
}

// Register our function for use
public static final DeferredRegister<Consumer<GameTestHelper>> TEST_FUNCTION = DeferredRegister.create(
        BuiltInRegistries.TEST_FUNCTION,
        "examplemod"
);

public static final DeferredHolder<Consumer<GameTestHelper>, Consumer<GameTestHelper>> EXAMPLE_FUNCTION = TEST_FUNCTION.register(
    "example_function",
    () -> ExampleFunctions::exampleTest
);
```

### 相对位置

所有测试 function 都会使用 structure block 的当前位置，把 structure template 场景内的相对坐标转换为绝对坐标。为了便于在相对位置与绝对位置间转换，可以分别使用 `GameTestHelper#absolutePos` 与 `GameTestHelper#relativePos`。

要在游戏中获取 structure template 的相对位置，可以通过[测试命令][test]加载 structure，把玩家置于所需位置，最后运行 `/test pos` 命令。它会获取玩家相对于 200 个 Block 范围内最近 structure 的坐标。该命令会在聊天中把相对位置导出为可复制的文本 component，以用作 final local variable。

:::tip
`/test pos` 生成的 local variable 可以通过在命令末尾追加名称来指定其引用名称：

```bash
/test pos <var> # Exports 'final BlockPos <var> = new BlockPos(...);'
```
:::

### 成功完成

测试 function 只负责一件事：有效完成时将测试标记为成功。如果在达到超时前（由 `TestData#maxTicks` 定义）没有实现成功状态，测试会自动失败。

`GameTestHelper` 中有许多可用于定义成功状态的抽象方法，但有四个方法尤其重要。

方法                 | 说明
:---:                | :---
`#succeed`           | 将测试标记为成功。
`#succeedIf`         | 立即测试所提供的 `Runnable`；如果未抛出 `GameTestAssertException`，则成功。如果测试未在当前 tick 成功，则标记为失败。
`#succeedWhen`       | 每个 tick 都测试所提供的 `Runnable`，直到超时；如果某个 tick 上的检查未抛出 `GameTestAssertException`，则成功。
`#succeedOnTickWhen` | 在指定 tick 测试所提供的 `Runnable`；如果未抛出 `GameTestAssertException`，则成功。如果 `Runnable` 在其他任何 tick 成功，则标记为失败。

:::caution
GameTest 会在每个 tick 执行，直到测试标记为成功。因此，在给定 tick 调度成功的方法必须注意：在之前的每个 tick 上始终失败。
:::

### 调度操作

并非所有操作都会在测试开始时发生。可以调度操作在特定时间或时间间隔发生：

方法             | 说明
:---:            | :---
`#runAtTickTime` | 在指定 tick 运行操作。
`#runAfterDelay` | 在当前 tick 之后 `x` 个 tick 运行操作。
`#onEachTick`    | 每个 tick 运行操作。

### Assertion

GameTest 期间的任何时候都可以进行 assertion，检查给定条件是否为 true。`GameTestHelper` 中有大量 assertion 方法；简而言之，只要未满足适当状态，就会抛出 `GameTestAssertException`。

## 注册 Test Instance

有了 `TestData`、`TestEnvironmentDefinition` 与测试 function 后，现在可以通过 `GameTestInstance` 将所有内容连接起来。每个 test instance 表示一项要运行的 GameTest。所有 test instance 都位于 `data/<namespace>/test_instance/<path>.json`。

### 基于 Function 的测试

`FunctionGameTestInstance` 将 `TestData` 连接到某个已注册测试 function。调用 test instance 时会运行该测试 function。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some game test examplemod:example_test
// In 'data/examplemod/test_instance/example_test.json'
{
    // `TestData`

    "environment": "examplemod:example_environment",
    "structure": "examplemod:example_structure",
    "max_ticks": 400,
    "setup_ticks": 50,
    "required": true,
    "rotation": "clockwise_90",
    "manual_only": true,
    "max_attempts": 3,
    "required_successes": 1,
    "sky_access": false,

    // `FunctionGameTestInstance`
    "type": "minecraft:function",

    // Points to a 'Consumer<GameTestHelper>' in the test function registry
    "function": "examplemod:example_function"
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// The test instance key
public static final ResourceKey<GameTestInstance> EXAMPLE_TEST_INSTANCE = ResourceKey.create(
    Registries.TEST_INSTANCE,
    Identifier.fromNamespaceAndPath("examplemod", "example_test")
);

// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_INSTANCE, bootstrap -> {
            // Use this to get the test environments
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // Register a game test
            // Any fields not relevant to the test data are hidden
            bootstrap.register(EXAMPLE_TEST_INSTANCE,
                new FunctionGameTestInstance(
                    // Points to a 'Consumer<GameTestHelper>' in the test function registry
                    EXAMPLE_FUNCTION.getKey()
                    new TestData<>(
                        environments.getOrThrow(EXAMPLE_ENVIRONMENT),
                        Identifier.fromNamespaceAndPath("examplemod", "example_structure"),
                        400,
                        50,
                        true,
                        Rotation.CLOCKWISE_90,
                        true,
                        3,
                        1,
                        false
                    )
            ));
        })
    );
}
```

</TabItem>
</Tabs>

### 基于 Block 的测试

`BlockBasedTestInstance` 是一种特殊 test instance，依赖 `Blocks#TEST_BLOCK` 发送和接收的红石信号。为使测试正常工作，structure template 必须包含至少两个测试 Block：一个且只能有一个设置为 `TestBlockMode#START`，另一个设置为 `TestBlockMode#ACCEPT`。测试开始时，会触发起始测试 Block，发送持续一个 tick、强度为 15 的信号脉冲。预期该信号最终会触发处于 `LOG`、`FAIL` 或 `ACCEPT` 状态的其他测试 Block。`LOG` 测试 Block 激活时也会发送强度为 15 的信号脉冲。`ACCEPT` 与 `FAIL` 测试 Block 分别使 test instance 成功或失败。在给定 tick 上，`ACCEPT` 始终优先于 `FAIL`。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some game test examplemod:example_test
// In 'data/examplemod/test_instance/example_test.json'
{
    // `TestData`

    "environment": "examplemod:example_environment",
    "structure": "examplemod:example_structure",
    "max_ticks": 400,
    "setup_ticks": 50,
    "required": true,
    "rotation": "clockwise_90",
    "manual_only": true,
    "max_attempts": 3,
    "required_successes": 1,
    "sky_access": false,

    // `BlockBasedTestInstance`
    "type": "minecraft:block_based"
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// The test instance key
public static final ResourceKey<GameTestInstance> EXAMPLE_TEST_INSTANCE = ResourceKey.create(
    Registries.TEST_INSTANCE,
    Identifier.fromNamespaceAndPath("examplemod", "example_test")
);

// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_INSTANCE, bootstrap -> {
            // Use this to get the test environments
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // Register a game test
            // Any fields not relevant to the test data are hidden
            bootstrap.register(EXAMPLE_TEST_INSTANCE,
                new BlockBasedTestInstance(
                    new TestData<>(
                        environments.getOrThrow(EXAMPLE_ENVIRONMENT),
                        Identifier.fromNamespaceAndPath("examplemod", "example_structure"),
                        400,
                        50,
                        true,
                        Rotation.CLOCKWISE_90,
                        true,
                        3,
                        1,
                        false
                    )
            ));
        })
    );
}
```

</TabItem>
</Tabs>

### 自定义 Test Instance

如果出于任何原因需要实现自己的测试逻辑，可以扩展 `GameTestInstance`。必须实现两个方法：表示测试 function 的 `run`，以及提供 test instance 说明的 `typeDescription`。如果 test instance 应用于 datagen，则必须有 `MapCodec` 供[注册][registered]。

```java
public class ExampleTestInstance extends GameTestInstance {

    public ExampleTestInstance(int value1, boolean value2, TestData<Holder<TestEnvironmentDefinition>> info) {
        super(info);
    }

    @Override
    public void run(GameTestHelper helper) {
        // Run whatever game test commands you want
        helper.assertBlockPresent(...);

        // Make sure you have some way to succeed
        helper.succeedIf(() -> ...);
    }

    @Override
    public MapCodec<ExampleTestInstance> codec() {
        return EXAMPLE_INSTANCE_CODEC.get();
    }

    @Override
    protected MutableComponent typeDescription() {
        // Provides a description about what this test is supposed to be
        // Should use a translatable component
        return Component.literal("Example Test Instance");
    }
}

// Register our test instance for use
public static final DeferredRegister<MapCodec<? extends GameTestInstance>> TEST_INSTANCE = DeferredRegister.create(
        BuiltInRegistries.TEST_INSTANCE_TYPE,
        "examplemod"
);

public static final Supplier<MapCodec<? extends GameTestInstance>> EXAMPLE_INSTANCE_CODEC = TEST_INSTANCE.register(
    "example_test_instance",
    () -> RecordCodecBuilder.mapCodec(instance -> instance.group(
            Codec.INT.fieldOf("value1").forGetter(test -> test.value1),
            Codec.BOOL.fieldOf("value2").forGetter(test -> test.value2),
            TestData.CODEC.forGetter(ExampleTestInstance::info)
        ).apply(instance, ExampleTestInstance::new)
    )
);
```

随后即可在 datapack 中使用该 test instance：

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some game test examplemod:example_test
// In 'data/examplemod/test_instance/example_test.json'
{
    // `TestData`

    "environment": "examplemod:example_environment",
    "structure": "examplemod:example_structure",
    "max_ticks": 400,
    "setup_ticks": 50,
    "required": true,
    "rotation": "clockwise_90",
    "manual_only": true,
    "max_attempts": 3,
    "required_successes": 1,
    "sky_access": false,

    // `ExampleTestInstance`
    "type": "examplemod:example_test_instance",

    "value1": 0,
    "value2": true
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// The test instance key
public static final ResourceKey<GameTestInstance> EXAMPLE_TEST_INSTANCE = ResourceKey.create(
    Registries.TEST_INSTANCE,
    Identifier.fromNamespaceAndPath("examplemod", "example_test")
);

// Let's assume we have some test environment
public static final ResourceKey<TestEnvironmentDefinition<?>> EXAMPLE_ENVIRONMENT = ResourceKey.create(
    Registries.TEST_ENVIRONMENT,
    Identifier.fromNamespaceAndPath("examplemod", "example_environment")
);

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(
        new RegistrySetBuilder().add(Registries.TEST_INSTANCE, bootstrap -> {
            // Use this to get the test environments
            HolderGetter<TestEnvironmentDefinition<?>> environments = bootstrap.lookup(Registries.TEST_ENVIRONMENT);

            // Register a game test
            // Any fields not relevant to the test data are hidden
            bootstrap.register(EXAMPLE_TEST_INSTANCE,
                new ExampleTestInstance(
                    0,
                    true,
                    new TestData<>(
                        environments.getOrThrow(EXAMPLE_ENVIRONMENT),
                        Identifier.fromNamespaceAndPath("examplemod", "example_structure"),
                        400,
                        50,
                        true,
                        Rotation.CLOCKWISE_90,
                        true,
                        3,
                        1,
                        false
                    )
            ));
        })
    );
}
```

</TabItem>
</Tabs>

### 不使用 Datapack

如果不想使用 datapack 构造 GameTest，可以改为在 [mod event bus][event] 上监听 `RegisterGameTestsEvent`，并分别通过 `registerEnvironment` 与 `registerTest` 注册 environment 和 test instance。

```java
@SubscribeEvent // on the mod event bus
public static void registerTests(RegisterGameTestsEvent event) {
    Holder<TestEnvironmentDefinition<?>> environment = event.registerEnvironment(
        // The name of the test environment
        EXAMPLE_ENVIRONMENT.identifier(),
        // A varargs of test environment definitions
        new ExampleEnvironmentType(
            0, true
        )
    );

    event.registerTest(
        // The name of the test instance
        EXAMPLE_TEST_INSTANCE.identifier(),
        new ExampleTestInstance(
            0,
            true,
            new TestData<>(
                environment,
                Identifier.fromNamespaceAndPath("examplemod", "example_structure"),
                400,
                50,
                true,
                Rotation.CLOCKWISE_90,
                true,
                3,
                1,
                false
            )
        )
    );
}
```

## 运行 GameTest

可以使用 `/test` 命令运行 GameTest。`test` 命令可高度配置，但对运行测试而言，只有少数 subcommand 较为重要：

| Subcommand   | 说明                                                  |
|:------------:|:------------------------------------------------------|
| `run`        | 运行指定测试：`run <test_name>`。                     |
| `runall`     | 运行所有可用测试。                                    |
| `runclosest` | 运行玩家 15 个 Block 范围内最近的测试。               |
| `runthese`   | 运行玩家 200 个 Block 范围内的测试。                  |
| `runfailed`  | 运行上次执行中失败的所有测试。                        |

:::note
Subcommand 跟在 test 命令之后：`/test <subcommand>`。
:::

## Buildscript 配置

GameTest 在 buildscript（`build.gradle` 文件）中提供额外配置设置，以便在不同场景下运行和集成。

### GameTest Server 运行配置

GameTest Server 是运行构建服务端的特殊配置。构建服务端返回的 exit code 是必需但失败的 GameTest 数量。所有失败测试，无论必需还是可选，都会记录日志。可以使用 `gradlew runGameTestServer` 运行此服务端。

### 在其他运行配置中启用 GameTest

默认情况下，只有 `client` 与 `gameTestServer` 运行配置启用 GameTest。如果其他运行配置也应运行 GameTest，必须把 `neoforge.enableGameTest` property 设置为 `true`。

```gradle
// Inside a run configuration
property 'neoforge.enableGameTest', 'true'
```

[datapacks]: ../resources/index.md#data
[registered]: ../concepts/registries.md#methods-for-registering
[test]: #running-game-tests
[event]: ../concepts/events.md#registering-an-event-handler
