# 成就（Advancements）

成就是玩家可以完成的、类似任务的目标。游戏根据成就中定义的条件判定其是否完成，并可以在完成的时候执行一些行为。

在命名空间的 `advancement` 子文件夹中创建 JSON 文件即可添加新成就。例如，要为 mod id 为 `examplemod` 的 mod 添加名为 `example_name` 的成就，文件应位于 `data/examplemod/advancement/example_name.json`。成就 ID 相对于 `advancement` 目录，因此该示例的 ID 是 `examplemod:example_name`。名称可以任意选择，游戏会自动发现该成就。只有在需要添加新的条件触发器，或从代码中触发某个条件时，才需要 Java 代码（见下文）。

## 规范

成就 JSON 文件可以包含以下条目：

- `parent`：此成就的父成就 ID。游戏会检测循环引用；出现循环引用会导致加载失败。可选；若省略，此成就将被视为根成就。根成就是未设置父项的成就，也是其[成就树][tree]的根。
- `display`：包含成就在成就界面中显示时所用若干属性的对象。可选；若省略，此成就不可见，但仍可完成。
  - `icon`：[ItemStack 的 JSON 表示形式][itemstackjson]。
  - `title`：用作成就标题的[文本组件][text]。
  - `description`：用作成就描述的[文本组件][text]。
  - `frame`：成就的边框类型。接受 `challenge`、`goal` 和 `task`。它们只是成就的显示类型，不是不同的成就系统。可选，默认为 `task`。
  - `background`：用作成就树背景的纹理。路径相对于 `textures` 目录，即不应包含 `textures/` 文件夹前缀。可选，默认为缺失纹理。仅对根成就有效。
  - `show_toast`：完成时是否在右上角显示弹窗。可选，默认为 true。
  - `announce_to_chat`：是否在聊天中宣布成就完成。可选，默认为 true。
  - `hidden`：完成此成就前，是否在成就界面中隐藏它及其所有子成就。对根成就本身无效，但仍会隐藏其所有子成就。可选，默认为 false。
- `criteria`：此成就需要跟踪的条件 Map。每个条件通过其 Map 键标识。Minecraft 添加的条件触发器列表可在 `CriteriaTriggers` 类中找到，其 JSON 规范可在 [Minecraft Wiki][triggers] 查阅。有关实现自定义条件触发器或从代码中触发条件的内容，请参阅下文。
- `requirements`：确定所需条件的二维列表。它由多个 OR 列表组成，各列表之间再进行 AND 运算；换句话说，每个子列表中必须至少有一个条件匹配。可选，默认要求所有条件均满足。
- `rewards`：表示完成此成就时授予奖励的对象。可选；该对象中的所有值也都是可选的。
  - `experience`：授予玩家的经验值数量。
  - `recipes`：要解锁的[配方][recipe] ID 列表。
  - `loot`：要抽取并给予玩家的[战利品表][loottable]列表。
  - `function`：要运行的[函数][function]。如果需要运行多个函数，请创建一个能够运行其他所有函数的包装函数。
- `sends_telemetry_event`：决定完成此成就时是否收集遥测数据。只有处于 `minecraft` 命名空间时才真正起作用。可选，默认为 false。
- `neoforge:conditions`：由 NeoForge 添加。加载此成就前必须通过的[加载条件][conditions]列表。可选。这里的加载条件用于决定是否加载成就，不属于 `criteria` 中用于判定成就是否完成的条件。

### 成就树

成就文件可以按目录分组，这会让游戏创建多个成就选项卡。根据根成就数量，一个成就选项卡可以包含一棵或多棵成就树。空的成就选项卡会自动隐藏。

:::tip
Minecraft 的每个选项卡始终只有一个根成就，并且总是将根成就命名为 `root`。建议遵循这一惯例。
:::

## 条件触发器

要完成成就，必须满足指定条件。条件通过触发器进行跟踪；当关联动作发生时，会从代码执行触发器（例如，当玩家击杀指定 [Entity][entity] 时执行 `player_killed_entity` 触发器）。每当游戏加载一个成就时，都会读取其中定义的条件，并将其作为监听器添加到触发器。执行触发器时，会重新检查所有为相应条件注册了监听器的成就是否完成。如果成就完成，则移除监听器。

自定义条件触发器由两部分组成：触发器本身，通过在代码中调用 `#trigger` 激活；以及实例，用于判定该条件在何种情况下满足。触发器扩展 `SimpleCriterionTrigger<T>`，实例则实现 `SimpleCriterionTrigger.SimpleInstance`。泛型值 `T` 表示触发器实例类型。

### `SimpleCriterionTrigger.SimpleInstance`

`SimpleCriterionTrigger.SimpleInstance` 表示 `criteria` 对象中定义的单个条件。触发器实例负责保存已定义的条件，并返回输入是否与条件匹配。

条件通常通过构造器传入。`SimpleCriterionTrigger.SimpleInstance` 接口只要求实现一个名为 `#player` 的函数，它以 `Optional<ContextAwarePredicate>` 的形式返回玩家必须满足的条件。如果子类是一个带有此类型 `player` 参数的 record（如下所示），自动生成的 `#player` 方法即可满足要求。

```java
public record ExampleTriggerInstance(Optional<ContextAwarePredicate> player/*，其他参数在这里*/)
        implements SimpleCriterionTrigger.SimpleInstance {}
```

触发器实例通常会提供静态辅助方法，根据实例参数构造完整的 `Criterion<T>` 对象。这使得数据生成期间可以轻松创建这些实例，但并非必需。

```java
// 在此示例中，EXAMPLE_TRIGGER 是 DeferredHolder<CriterionTrigger<?>, ExampleTrigger>。
// 请参阅下文了解如何注册触发器。
public static Criterion<ExampleTriggerInstance> instance(ContextAwarePredicate player, ItemPredicate item) {
    return EXAMPLE_TRIGGER.get().createCriterion(new ExampleTriggerInstance(Optional.of(player), item));
}
```

最后，应添加一个接收当前数据状态并返回用户是否满足必要条件的方法。玩家条件已经通过 `SimpleCriterionTrigger#trigger(ServerPlayer, Predicate)` 检查。大多数触发器实例将此方法命名为 `#matches`。

```java
// 假设我们有一个附加的 ItemPredicate 参数。这可以是你需要的任何内容。
// 例如，也可以是 Predicate<LivingEntity>。
public record ExampleTriggerInstance(Optional<ContextAwarePredicate> player, ItemPredicate predicate)
        implements SimpleCriterionTrigger.SimpleInstance {
    // 该方法对于每个实例都是唯一的，因此不会被覆盖。
    // 该参数可以是你需要正确匹配的任何参数，例如，此也可以是 LivingEntity。
    // 如果除了玩家之外不需要上下文，此也可能根本不带任何参数。
    public boolean matches(ItemStack stack) {
        // 由于 ItemPredicate 匹配堆栈，因此我们在这里使用堆栈作为输入。
        return this.predicate.test(stack);
    }
}
```

### `SimpleCriterionTrigger`

`SimpleCriterionTrigger<T>` 实现有两个用途：提供用于检查触发器实例并在成功时运行已附加监听器的方法，以及指定一个用于序列化触发器实例（`T`）的 [codec]。

首先，添加一个接收所需输入并调用 `SimpleCriterionTrigger#trigger` 的方法，以正确处理所有监听器的检查。大多数触发器实例也将此方法命名为 `#trigger`。继续使用上面的触发器实例示例，触发器大致如下：

```java
public class ExampleCriterionTrigger extends SimpleCriterionTrigger<ExampleTriggerInstance> {
    // 此方法对于每个触发器来说都是唯一的，因此不是覆盖的方法
    public void trigger(ServerPlayer player, ItemStack stack) {
        this.trigger(player,
                // SimpleCriterionTrigger.SimpleInstance 子类中的条件检查器方法
                triggerInstance -> triggerInstance.matches(stack)
        );
    }
}
```

触发器必须注册到 `Registries.TRIGGER_TYPE` [Registry][registration]：

```java
public static final DeferredRegister<CriterionTrigger<?>> TRIGGER_TYPES =
        DeferredRegister.create(Registries.TRIGGER_TYPE, ExampleMod.MOD_ID);

public static final Supplier<ExampleCriterionTrigger> EXAMPLE_TRIGGER =
        TRIGGER_TYPES.register("example", ExampleCriterionTrigger::new);
```

随后，触发器必须通过重写 `#codec` 定义一个 [codec]，用于序列化和反序列化触发器实例。该 codec 通常在实例实现中创建为常量。

```java
public record ExampleTriggerInstance(Optional<ContextAwarePredicate> player/*，其他参数在这里*/)
        implements SimpleCriterionTrigger.SimpleInstance {
    public static final Codec<ExampleTriggerInstance> CODEC = ...;

    // ...
}

public class ExampleTrigger extends SimpleCriterionTrigger<ExampleTriggerInstance> {
    @Override
    public Codec<ExampleTriggerInstance> codec() {
        return ExampleTriggerInstance.CODEC;
    }

    // ...
}
```

对于之前那个包含 `ContextAwarePredicate` 和 `ItemPredicate` 的 record 示例，codec 可以写成：

```java
public static final Codec<ExampleTriggerInstace> CODEC = RecordCodecBuilder.create(instance -> instance.group(
        EntityPredicate.ADVANCEMENT_CODEC.optionalFieldOf("player").forGetter(ExampleTriggerInstance::player),
        ItemPredicate.CODEC.fieldOf("item").forGetter(ExampleTriggerInstance::item)
).apply(instance, ExampleTriggerInstance::new));
```

### 调用条件触发器

每当发生受检查的动作时，都应调用 `SimpleCriterionTrigger` 子类定义的 `#trigger` 方法。当然，也可以调用原版触发器；它们位于 `CriteriaTriggers` 中。

```java
// 在执行操作的某些代码段中
// 同样，EXAMPLE_TRIGGER 是自定义条件触发器的注册实例的提供器
public void performExampleAction(ServerPlayer player, additionalContextParametersHere) {
    // 运行代码以在此处执行操作
    EXAMPLE_TRIGGER.get().trigger(player, additionalContextParametersHere);
}
```

## 数据生成

可以使用 `AdvancementProvider` 通过[数据生成][datagen]创建成就。`AdvancementProvider` 接受一个 `AdvancementSubProviders` 列表，后者使用 `Advancement.Builder` 实际生成成就。

首先，在某个 `GatherDataEvent` 中创建 `AdvancementProvider` 实例：

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    // 添加数据包对象时，请先调用 event.createDatapackRegistryObjects(...)

    event.createProvider((output, lookupProvider) -> new AdvancementProvider(
        output, lookupProvider,
        // 在此添加生成器
        List.of(...)
    ));

     // 其他提供器
}
```

下一步是在列表中填入生成器。为此，可以将生成器实现为类或 Lambda 表达式，再把每个生成器的实例添加到构造器参数中目前为空的列表。

```java
// 类示例
public class MyAdvancementGenerator implements AdvancementSubProvider {

    @Override
    public void generate(HolderLookup.Provider registries, Consumer<AdvancementHolder> saver) {
        // 在此生成你的进步。
    }
}

// 方法示例
public class ExampleClass {

    // 匹配AdvancementSubProvider#generate提供的参数
    public static void generateExampleAdvancements(HolderLookup.Provider registries, Consumer<AdvancementHolder> saver) {
        // 在此生成你的进步。
    }
}

// 在 `GatherDataEvent` 之一中
event.createProvider((output, lookupProvider) -> new AdvancementProvider(
    output, lookupProvider,
    // 在此添加生成器
    List.of(
        // 将生成器的实例添加到列表参数中。你可以根据需要多次执行此操作。
        // 拥有多个生成器纯粹是为了组织，所有功能都可以通过单个生成器实现。
        new MyAdvancementGenerator(),
        ExampleClass::generateExampleAdvancements
    )
));
```

要生成成就，请使用 `Advancement.Builder`：

```java
// 所有方法都遵循 builder 模式，这意味着链接是可能的并且受到鼓励。
// 为了提高解释的可读性，这里不会进行链接。

// 使用 static #advancement() 方法创建进度 builder。
// 使用 #advancement() 自动启用遥测事件。如果你不想要此， 可以用
// #recipeAdvancement()代替，没有其他功能差异。
Advancement.Builder builder = Advancement.Builder.advancement();

// 设置进度的父级。你可以使用你已经生成的另一个进步，
// 或使用 static AdvancementSubProvider#createPlaceholder 方法创建占位符进度。
builder.parent(AdvancementSubProvider.createPlaceholder("minecraft:story/root"));

// 设置进度的显示 property。这可以是 DisplayInfo 对象，
// 或者直接传入值。如果直接传入值，将为你创建一个 DisplayInfo 对象。
builder.display(
        // 进度图标。可以是 ItemStackTemplate 或 ItemLike。
        new ItemStackTemplate(Items.GRASS_BLOCK),
        // 进度标题和描述。不要忘记添加这些内容的翻译！
        Component.translatable("advancements.examplemod.example_advancement.title"),
        Component.translatable("advancements.examplemod.example_advancement.description"),
        // 背景纹理。如果你不需要后台纹理（用于非 root 升级），请使用 null。
        null,
        // 帧类型。有效值为 AdvancementType.TASK、CHALLENGE 或 GOAL。
        AdvancementType.GOAL,
        // 是否显示进度吐司。
        true,
        // 是否宣布进入聊天状态。
        true,
        // 是否应隐藏进度。
        false
);

// 进步奖励 builder。可以使用四种奖励类型中的任何一种以及更多奖励来创建
// 可以使用以 add 为前缀的方法添加。这也可以预先构建， 然后，
// 和生成的 AdvancementRewards 可以在多个高级 builder 中重复使用。
builder.rewards(
    // 或者，使用 addExperience() 添加到现有 builder。
    AdvancementRewards.Builder.experience(100)
    // 或者，使用 loot() 创建新 builder。
    .addLootTable(ResourceKey.create(Registries.LOOT_TABLE, Identifier.fromNamespaceAndPath("minecraft", "chests/igloo")))
    // 或者，使用配方() 创建新 builder。
    .addRecipe(ResourceKey.create(Registries.RECIPE, Identifier.fromNamespaceAndPath("minecraft", "iron_ingot")))
    // 或者，使用函数() 创建新 builder。
    .runs(Identifier.fromNamespaceAndPath("examplemod", "example_function"))
);

// 将具有给定名称的条件添加到进度中。使用相应的触发器实例的static方法。
builder.addCriterion("pickup_dirt", InventoryChangeTrigger.TriggerInstance.hasItems(Items.DIRT));

// 添加需求处理器。 Minecraft原生提供allOf()和anyOf()，需求比较复杂
// 必须手动实现。仅具有两个或多个标准的效果。
builder.requirements(AdvancementRequirements.allOf(List.of("pickup_dirt")));

// 使用给定的资源位置将进度保存到磁盘。这将返回 AdvancementHolder，
// 可以存储在变量中并由其他进度 builder 用作父级。
builder.save(saver, Identifier.fromNamespaceAndPath("examplemod", "example_advancement"));
```

[codec]: ../../datastorage/codecs.md
[conditions]: conditions.md
[datagen]: ../index.md#data-generation
[entity]: ../../entities/index.md
[function]: https://minecraft.wiki/w/Function_(Java_Edition)
[itemstackjson]: ../../items/index.md#json-representation
[loottable]: loottables/index.md
[recipe]: recipes/index.md
[registration]: ../../concepts/registries.md#methods-for-registering
[text]: ../client/i18n.md#components
[tree]: #成就树
[triggers]: https://minecraft.wiki/w/Advancement/JSON_format#List_of_triggers
