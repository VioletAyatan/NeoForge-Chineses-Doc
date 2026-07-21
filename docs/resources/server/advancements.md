# 进度

进度是玩家可以达成的、类似任务的目标。进度会根据进度条件授予，并可在完成时执行相应行为。

在命名空间的 `advancement` 子文件夹中创建 JSON 文件即可添加新进度。例如，要为 mod id 为 `examplemod` 的 mod 添加名为 `example_name` 的进度，文件应位于 `data/examplemod/advancement/example_name.json`。进度 ID 相对于 `advancement` 目录，因此该示例的 ID 是 `examplemod:example_name`。名称可以任意选择，游戏会自动发现该进度。只有在需要添加新条件，或从代码中触发某个条件时，才需要 Java 代码（见下文）。

## 规范

进度 JSON 文件可以包含以下条目：

- `parent`：此进度的父进度 ID。游戏会检测循环引用；出现循环引用会导致加载失败。可选；若省略，此进度将被视为根进度。根进度是未设置父项的进度，也是其[进度树][tree]的根。
- `display`：包含进度在进度 GUI 中显示时所用若干属性的对象。可选；若省略，此进度不可见，但仍可被触发。
    - `icon`：[ItemStack 的 JSON 表示形式][itemstackjson]。
    - `title`：用作进度标题的[文本组件][text]。
    - `description`：用作进度描述的[文本组件][text]。
    - `frame`：进度的边框类型。接受 `challenge`、`goal` 和 `task`。可选，默认为 `task`。
    - `background`：用作进度树背景的纹理。路径相对于 `textures` 目录，即不应包含 `textures/` 文件夹前缀。可选，默认为缺失纹理。仅对根进度有效。
    - `show_toast`：完成时是否在右上角显示弹窗。可选，默认为 true。
    - `announce_to_chat`：是否在聊天中宣布进度完成。可选，默认为 true。
    - `hidden`：完成此进度前，是否在进度 GUI 中隐藏它及其所有子进度。对根进度本身无效，但仍会隐藏其所有子进度。可选，默认为 false。
- `criteria`：此进度需要跟踪的条件 Map。每个条件通过其 Map 键标识。Minecraft 添加的条件触发器列表可在 `CriteriaTriggers` 类中找到，其 JSON 规范可在 [Minecraft Wiki][triggers] 查阅。有关实现自定义条件或从代码触发条件的内容，请参阅下文。
- `requirements`：确定所需条件的二维列表。它由多个 OR 列表组成，各列表之间再进行 AND 运算；换句话说，每个子列表中必须至少有一个条件匹配。可选，默认要求所有条件均满足。
- `rewards`：表示完成此进度时授予奖励的对象。可选；该对象中的所有值也都是可选的。
    - `experience`：授予玩家的经验值数量。
    - `recipes`：要解锁的[配方][recipe] ID 列表。
    - `loot`：要抽取并给予玩家的[战利品表][loottable]列表。
    - `function`：要运行的[函数][function]。如果需要运行多个函数，请创建一个能够运行其他所有函数的包装函数。
- `sends_telemetry_event`：决定完成此进度时是否收集遥测数据。只有处于 `minecraft` 命名空间时才真正起作用。可选，默认为 false。
- `neoforge:conditions`：由 NeoForge 添加。加载此进度前必须通过的[条件][conditions]列表。可选。

### 进度树

进度文件可以按目录分组，这会让游戏创建多个进度选项卡。根据根进度数量，一个进度选项卡可以包含一棵或多棵进度树。空的进度选项卡会自动隐藏。

:::tip
Minecraft 的每个选项卡始终只有一个根进度，并且总是将根进度命名为 `root`。建议遵循这一惯例。
:::

## 条件触发器

要解锁进度，必须满足指定条件。条件通过触发器进行跟踪；当关联动作发生时，会从代码执行触发器（例如，当玩家击杀指定 [Entity][entity] 时执行 `player_killed_entity` 触发器）。每当游戏加载一个进度时，都会读取其中定义的条件，并将其作为监听器添加到触发器。执行触发器时，会重新检查所有为相应条件注册了监听器的进度是否完成。如果进度完成，则移除监听器。

自定义条件触发器由两部分组成：触发器本身，通过在代码中调用 `#trigger` 激活；以及实例，用于定义触发器应在何种条件下授予该条件。触发器扩展 `SimpleCriterionTrigger<T>`，实例则实现 `SimpleCriterionTrigger.SimpleInstance`。泛型值 `T` 表示触发器实例类型。

### `SimpleCriterionTrigger.SimpleInstance`

`SimpleCriterionTrigger.SimpleInstance` 表示 `criteria` 对象中定义的单个条件。触发器实例负责保存已定义的条件，并返回输入是否与条件匹配。

条件通常通过构造器传入。`SimpleCriterionTrigger.SimpleInstance` 接口只要求实现一个名为 `#player` 的函数，它以 `Optional<ContextAwarePredicate>` 的形式返回玩家必须满足的条件。如果子类是一个带有此类型 `player` 参数的 record（如下所示），自动生成的 `#player` 方法即可满足要求。

```java
public record ExampleTriggerInstance(Optional<ContextAwarePredicate> player/*, other parameters here*/)
        implements SimpleCriterionTrigger.SimpleInstance {}
```

触发器实例通常会提供静态辅助方法，根据实例参数构造完整的 `Criterion<T>` 对象。这使得数据生成期间可以轻松创建这些实例，但并非必需。

```java
// In this example, EXAMPLE_TRIGGER is a DeferredHolder<CriterionTrigger<?>, ExampleTrigger>.
// See below for how to register triggers.
public static Criterion<ExampleTriggerInstance> instance(ContextAwarePredicate player, ItemPredicate item) {
    return EXAMPLE_TRIGGER.get().createCriterion(new ExampleTriggerInstance(Optional.of(player), item));
}
```

最后，应添加一个接收当前数据状态并返回用户是否满足必要条件的方法。玩家条件已经通过 `SimpleCriterionTrigger#trigger(ServerPlayer, Predicate)` 检查。大多数触发器实例将此方法命名为 `#matches`。

```java
// Let's assume we have an additional ItemPredicate parameter. This can be whatever you need.
// For example, this could also be a Predicate<LivingEntity>.
public record ExampleTriggerInstance(Optional<ContextAwarePredicate> player, ItemPredicate predicate)
        implements SimpleCriterionTrigger.SimpleInstance {
    // This method is unique for each instance and is as such not overridden.
    // The parameter may be whatever you need to properly match, for example, this could also be a LivingEntity.
    // If you need no context other than the player, this may also take no parameters at all.
    public boolean matches(ItemStack stack) {
        // Since ItemPredicate matches a stack, we use a stack as the input here.
        return this.predicate.test(stack);
    }
}
```

### `SimpleCriterionTrigger`

`SimpleCriterionTrigger<T>` 实现有两个用途：提供用于检查触发器实例并在成功时运行已附加监听器的方法，以及指定一个用于序列化触发器实例（`T`）的 [codec]。

首先，添加一个接收所需输入并调用 `SimpleCriterionTrigger#trigger` 的方法，以正确处理所有监听器的检查。大多数触发器实例也将此方法命名为 `#trigger`。继续使用上面的触发器实例示例，触发器大致如下：

```java
public class ExampleCriterionTrigger extends SimpleCriterionTrigger<ExampleTriggerInstance> {
    // This method is unique for each trigger and is as such not a method to override
    public void trigger(ServerPlayer player, ItemStack stack) {
        this.trigger(player,
                // The condition checker method within the SimpleCriterionTrigger.SimpleInstance subclass
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
public record ExampleTriggerInstance(Optional<ContextAwarePredicate> player/*, other parameters here*/)
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
// In some piece of code where the action is being performed
// Again, EXAMPLE_TRIGGER is a supplier for the registered instance of the custom criterion trigger
public void performExampleAction(ServerPlayer player, additionalContextParametersHere) {
    // Run code to perform action here
    EXAMPLE_TRIGGER.get().trigger(player, additionalContextParametersHere);
}
```

## 数据生成

可以使用 `AdvancementProvider` 通过[数据生成][datagen]创建进度。`AdvancementProvider` 接受一个 `AdvancementSubProviders` 列表，后者使用 `Advancement.Builder` 实际生成进度。

首先，在某个 `GatherDataEvent` 中创建 `AdvancementProvider` 实例：

```java
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    // Call event.createDatapackRegistryObjects(...) first if adding datapack objects

    event.createProvider((output, lookupProvider) -> new AdvancementProvider(
        output, lookupProvider,
        // Add generators here
        List.of(...)
    ));

     // Other providers
}
```

下一步是在列表中填入生成器。为此，可以将生成器实现为类或 lambda，再把每个生成器的实例添加到构造器参数中目前为空的列表。

```java
// Class example
public class MyAdvancementGenerator implements AdvancementSubProvider {

    @Override
    public void generate(HolderLookup.Provider registries, Consumer<AdvancementHolder> saver) {
        // Generate your advancements here.
    }
}

// Method Example
public class ExampleClass {

    // Matches the parameters provided by AdvancementSubProvider#generate
    public static void generateExampleAdvancements(HolderLookup.Provider registries, Consumer<AdvancementHolder> saver) {
        // Generate your advancements here.
    }
}

// In one of the `GatherDataEvent`s
event.createProvider((output, lookupProvider) -> new AdvancementProvider(
    output, lookupProvider,
    // Add generators here
    List.of(
        // Add an instance of our generator to the list parameter. This can be done as many times as you want.
        // Having multiple generators is purely for organization, all functionality can be achieved with a single generator.
        new MyAdvancementGenerator(),
        ExampleClass::generateExampleAdvancements
    )
));
```

要生成进度，请使用 `Advancement.Builder`：

```java
// All methods follow the builder pattern, meaning that chaining is possible and encouraged.
// For better readability of the explanations, chaining will not be done here.

// Create an advancement builder using the static #advancement() method.
// Using #advancement() automatically enables telemetry events. If you do not want this,
// #recipeAdvancement() can be used instead, there are no other functional differences.
Advancement.Builder builder = Advancement.Builder.advancement();

// Sets the parent of the advancement. You can use another advancement you have already generated,
// or create a placeholder advancement using the static AdvancementSubProvider#createPlaceholder method.
builder.parent(AdvancementSubProvider.createPlaceholder("minecraft:story/root"));

// Sets the display properties of the advancement. This can either be a DisplayInfo object,
// or pass in the values directly. If values are passed in directly, a DisplayInfo object will be created for you.
builder.display(
        // The advancement icon. Can be an ItemStackTemplate or an ItemLike.
        new ItemStackTemplate(Items.GRASS_BLOCK),
        // The advancement title and description. Don't forget to add translations for these!
        Component.translatable("advancements.examplemod.example_advancement.title"),
        Component.translatable("advancements.examplemod.example_advancement.description"),
        // The background texture. Use null if you don't want a background texture (for non-root advancements).
        null,
        // The frame type. Valid values are AdvancementType.TASK, CHALLENGE, or GOAL.
        AdvancementType.GOAL,
        // Whether to show the advancement toast or not.
        true,
        // Whether to announce the advancement into chat or not.
        true,
        // Whether the advancement should be hidden or not.
        false
);

// An advancement reward builder. Can be created with any of the four reward types, and further rewards
// can be added using the methods prefixed with add. This can also be built beforehand,
// and the resulting AdvancementRewards can then be reused across multiple advancement builders.
builder.rewards(
    // Alternatively, use addExperience() to add to an existing builder.
    AdvancementRewards.Builder.experience(100)
    // Alternatively, use loot() to create a new builder.
    .addLootTable(ResourceKey.create(Registries.LOOT_TABLE, Identifier.fromNamespaceAndPath("minecraft", "chests/igloo")))
    // Alternatively, use recipe() to create a new builder.
    .addRecipe(ResourceKey.create(Registries.RECIPE, Identifier.fromNamespaceAndPath("minecraft", "iron_ingot")))
    // Alternatively, use function() to create a new builder.
    .runs(Identifier.fromNamespaceAndPath("examplemod", "example_function"))
);

// Adds a criterion with the given name to the advancement. Use the corresponding trigger instance's static method.
builder.addCriterion("pickup_dirt", InventoryChangeTrigger.TriggerInstance.hasItems(Items.DIRT));

// Adds a requirements handler. Minecraft natively provides allOf() and anyOf(), more complex requirements
// must be implemented manually. Only has an effect with two or more criteria.
builder.requirements(AdvancementRequirements.allOf(List.of("pickup_dirt")));

// Save the advancement to disk, using the given resource location. This returns an AdvancementHolder,
// which may be stored in a variable and used as a parent by other advancement builders.
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
[root]: #root-advancements
[text]: ../client/i18n.md#components
[tree]: #advancement-trees
[triggers]: https://minecraft.wiki/w/Advancement/JSON_format#List_of_triggers
