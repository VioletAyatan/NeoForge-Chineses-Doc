import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 配方

配方是在 Minecraft 世界中将一组对象转换成其他对象的方式。虽然 Minecraft 只将该系统用于 Item 转换，但系统本身允许转换任意类型的对象——Block、Entity 等。几乎所有配方都使用配方数据文件；除非另有明确说明，本文中的“配方”均指由数据驱动的配方。

配方数据文件位于 `data/<namespace>/recipe/<path>.json`。例如，配方 `minecraft:diamond_block` 位于 `data/minecraft/recipe/diamond_block.json`。

## 术语

- **配方 JSON** 或**配方文件**：由 `RecipeManager` 加载并存储的 JSON 文件。它包含配方类型、输入、输出以及其他信息（例如处理时间）。
- **`Recipe`**：保存所有 JSON 字段在代码中的表示形式，以及匹配逻辑（“此输入是否匹配该配方？”）和其他一些属性。
- **`RecipeInput`**：为配方提供输入的类型。它有多个子类，例如 `CraftingInput` 或 `SingleRecipeInput`（用于熔炉及类似设备）。
- **配方 Ingredient**，简称 **Ingredient**：配方的单个输入（而 `RecipeInput` 通常表示用于与配方 Ingredient 进行检查的一组输入）。Ingredient 是一套非常强大的系统，因此在[独立文章][ingredients]中说明。
- **`PlacementInfo`**：定义配方包含哪些 Item，以及这些 Item 应填入哪些索引。如果无法依据所提供的 Item 在一定程度上描述配方（例如只修改数据组件），则使用 `PlacementInfo#NOT_PLACEABLE`。
- **`SlotDisplay`**：定义单个槽位在配方查看器（如配方书）中的显示方式。
- **`RecipeDisplay`**：定义供配方查看器（如配方书）使用的配方 `SlotDisplay`。该接口本身只包含配方结果与执行配方所用工作站的方法，但其子类型可以保存 Ingredient 或网格大小等信息。
- **`RecipeManager`**：服务器上的单例字段，保存所有已加载配方。
- **`RecipeSerializer`**：本质上是对 [`MapCodec`][codec] 与 [`StreamCodec`][streamcodec] 的包装，两者均用于序列化。
- **`RecipeType`**：与 `Recipe` 对应的已注册类型，主要用于按类型查询配方。通常，不同的合成容器应使用不同的 `RecipeType`。例如，`minecraft:crafting` 配方类型涵盖 `minecraft:crafting_shaped`、`minecraft:crafting_shapeless` 配方序列化器以及特殊合成序列化器。
- **`RecipeBookCategory`**：在配方书中查看时代表一组配方的分组。
- **配方[进度][advancement]**：负责在配方书中解锁配方的进度。它不是必需的，而且玩家通常会使用配方查看器 mod 而忽略它；不过[配方数据提供器][datagen]会自动生成，因此建议沿用。
- **`RecipePropertySet`**：定义菜单中指定输入槽位可以接受的 Ingredient 列表。
- **`RecipeBuilder`**：在数据生成期间用于创建 JSON 配方。
- **配方工厂**：用于根据 `RecipeBuilder` 创建 `Recipe` 的方法引用。它可以是构造器引用、静态 builder 方法，或专门为此目的创建的函数式接口（通常命名为 `Factory`）。

## JSON 规范

配方文件的内容会随所选类型产生很大差异。所有配方文件都共有 `type` 与 [`neoforge:conditions`][conditions] 属性：

```json5
{
    // The recipe type. This maps to an entry in the recipe serializer registry.
    "type": "minecraft:crafting_shaped",
    // A list of data load conditions. Optional, NeoForge-added. See the article linked above for more information.
    "neoforge:conditions": [ /*...*/ ]
}
```

Minecraft 提供的完整类型列表可在[内置配方类型][builtin]一文中找到。mod 也可以[定义自己的配方类型][customrecipes]。

## 使用配方

配方通过 `RecipeManager` 类加载、存储和获取；该类又可通过 `ServerLevel#recipeAccess` 获取，或者在没有可用 `ServerLevel` 时，通过 `ServerLifecycleHooks.getCurrentServer()#getRecipeManager` 获取。服务器默认不会向客户端同步配方，只会发送用于限制菜单槽位输入的 `RecipePropertySet`。此外，每当配方书解锁一个配方时，其 `RecipeDisplay` 与对应的 `RecipeDisplayEntry` 会发送到客户端（不包括所有 `Recipe#isSpecial` 返回 true 的配方）。因此，配方逻辑应始终在服务器上运行。

获取配方最简单的方式是使用其资源键：

```java
RecipeManager recipes = serverLevel.recipeAccess();
// RecipeHolder<?> is a record of the resource key and the recipe itself.
Optional<RecipeHolder<?>> optional = recipes.byKey(
    ResourceKey.create(Registries.RECIPE, Identifier.withDefaultNamespace("diamond_block"))
);
optional.map(RecipeHolder::value).ifPresent(recipe -> {
    // Do whatever you want to do with the recipe here. Be aware that the recipe may be of any type.
});
```

更实用的方法是构造 `RecipeInput` 并尝试获取匹配配方。在此示例中，使用 `CraftingInput#of` 创建一个包含钻石块的 `CraftingInput`。这会创建无序输入；有序输入应改用 `CraftingInput#ofPositioned`，其他输入则使用其他 `RecipeInput`（例如，熔炉配方通常使用 `new SingleRecipeInput`）。

```java
RecipeManager recipes = serverLevel.recipeAccess();
// Construct a RecipeInput, as required by the recipe. For example, construct a CraftingInput for a crafting recipe.
// The parameters are width, height and items, respectively.
CraftingInput input = CraftingInput.of(1, 1, List.of(new ItemStack(Items.DIAMOND_BLOCK)));
// The generic wildcard on the recipe holder should then extend CraftingRecipe.
// This allows for more type safety later on.
Optional<RecipeHolder<? extends CraftingRecipe>> optional = recipes.getRecipeFor(
        // The recipe type to get the recipe for. In our case, we use the crafting type.
        RecipeType.CRAFTING,
        // Our recipe input.
        input,
        // Our level context.
        serverLevel
);
// This returns the diamond block -> 9 diamonds recipe (unless a datapack changes that recipe).
optional.map(RecipeHolder::value).ifPresent(recipe -> {
    // Do whatever you want here. Note that the recipe is now a CraftingRecipe instead of a Recipe<?>.
});
```

或者，也可以获取一个可能为空的、与输入匹配的配方列表；当可以合理假设有多个配方匹配时，这尤其有用：

```java
RecipeManager recipes = serverLevel.recipeAccess();
CraftingInput input = CraftingInput.of(1, 1, List.of(new ItemStack(Items.DIAMOND_BLOCK)));
// These are not Optionals, and can be used directly. However, the list may be empty, indicating no matching recipes.
Stream<RecipeHolder<? extends Recipe<CraftingInput>>> list = recipes.recipeMap().getRecipesFor(
    // Same parameters as above.
    RecipeType.CRAFTING, input, serverLevel
);
```

得到正确的配方输入后，还需要获取配方输出。为此请调用 `Recipe#assemble`：

```java
RecipeManager recipes = serverLevel.recipeAccess();
CraftingInput input = CraftingInput.of(...);
Optional<RecipeHolder<? extends CraftingRecipe>> optional = recipes.getRecipeFor(...);
// Use ItemStack.EMPTY as a fallback.
ItemStack result = optional
        .map(RecipeHolder::value)
        .map(recipe -> recipe.assemble(input))
        .orElse(ItemStack.EMPTY);
```

如有需要，也可以遍历某一类型的所有配方：

```java
RecipeManager recipes = serverLevel.recipeAccess();
// Like before, pass the desired recipe type.
Collection<RecipeHolder<?>> list = recipes.recipeMap().byType(RecipeType.CRAFTING);
```

## 配方优先级

配方有时会与其他配方重叠，通常是因为一个图案使用特定 Item，而另一个相同图案使用了包含该 Item 的标签。在这种情况下，原版会采用找到的第一个配方，而这取决于哪个配方最先被读取并加载。这可能造成问题：如果特定 Item 配方晚于基于标签的配方加载，那么将永远无法获得该特定 Item 配方。

为解决这一问题，NeoForge 引入配方优先级，用于安排哪些配方应先显示。条目表示为从配方 Registry 键映射到整数优先级值的 Map。优先级按值从高到低排序，未指定的配方默认为 `0`。这意味着优先级大于 `0` 的配方排在前面，小于 `0` 的配方排在最后。优先级 Map 位于 `data/<namespace>/recipe_priorities.json`，其中所有配方优先级会合并在一起；但如果 `replace` 为 true，则会清除先前加载的所有条目。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    // When true, clears out all previously loaded entries.
    "replace": false,
    // The map of recipe entries to their priority values.
    // If a recipe does not have a priority, it defaults to 0.
    "entries": {
        // Points to 'data/examplemod/recipe/higher_priority.json'
        // This recipe will be checked before any defaults.
        "examplemod:higher_priority": 1,
        // Points to 'data/examplemod/recipe/lower_priority.json'
        // This recipe will be checked after any defaults.
        "examplemod:lower_priority": -1,
        // Points to 'data/examplemod/recipe/even_lower_priority.json'
        // This recipe will be checked after any defaults and the
        // 'lower_priority' recipe.
        "examplemod:even_lower_priority": -2
    }
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Generates the recipe priorities
public class ExamplePrioritiesProvider extends RecipePrioritiesProvider {

    public ExamplePrioritiesProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> registries) {
        // Replace 'examplemod' with your mod id.
        super(output, registries, "examplemod");
    }

    @Override
    protected void start() {
        // Registers a recipe entry to a priority value.

        this.add(
            // Points to 'data/examplemod/recipe/higher_priority.json'
            ResourceKey.create(Registries.RECIPE, Identifier.fromNamespaceAndPath("examplemod", "higher_priority")),
            // This recipe will be checked before any defaults.
            1
        );

        this.add(
            // Points to 'data/examplemod/recipe/lower_priority.json'
            Identifier.fromNamespaceAndPath("examplemod", "lower_priority"),
            // This recipe will be checked after any defaults.
            -1
        );

        this.add(
            // Points to 'data/examplemod/recipe/even_lower_priority.json'
            // The namespace is inferred from the mod id passed to the provider.
            "even_lower_priority",
            // This recipe will be checked after any defaults and the 'lower_priority' recipe.
            -2
        );
    }
}
```

</TabItem>
</Tabs>

## 其他配方机制

原版中的一些机制通常也被视为配方，但在代码中采用了不同实现。这通常是出于历史原因，或因为这些“配方”由其他数据（例如[标签][tags]）构造。

:::warning
配方查看器 mod 通常不会发现这些配方。必须手动添加对此类 mod 的支持；更多信息请参阅相应 mod 的文档。
:::

### 铁砧配方

铁砧有两个输入槽位与一个输出槽位。原版用例只有工具修复、合并和重命名；由于每种用例都需要特殊处理，因此未提供配方文件。不过，可以使用 `AnvilUpdateEvent` 扩展该系统。此[事件][event]允许获取输入（左侧输入槽位）和材料（右侧输入槽位），并可设置输出 ItemStack、经验花费及要消耗的材料数量。还可以通过[取消][cancel]事件完全阻止该过程。

```java
// This example allows repairing a stone pickaxe with a full stack of dirt, consuming half the stack, for 3 levels.
@SubscribeEvent // on the game event bus
public static void onAnvilUpdate(AnvilUpdateEvent event) {
    ItemStack left = event.getLeft();
    ItemStack right = event.getRight();
    if (left.is(Items.STONE_PICKAXE) && right.is(Items.DIRT) && right.getCount() >= 32) {
        event.setOutput(new ItemStack(Items.STONE_PICKAXE));
        event.setMaterialCost(32);
        event.setXpCost(3);
    }
}
```

### 酿造

参阅“生物效果与药水”一文中的[酿造章节][brewing]。

### 扩展合成网格大小

负责保存有序合成配方内存表示形式的 `ShapedRecipePattern` 类硬编码了 3x3 槽位限制，这会妨碍希望在复用原版有序合成配方类型的同时添加更大合成台的 mod。为解决该问题，NeoForge 补入了静态方法 `ShapedRecipePattern#setCraftingSize(int width, int height)`，用于提高限制。应在 `FMLCommonSetupEvent` 期间调用它。此处每个维度取最大值；例如，一个 mod 添加 4x6 合成台，另一个添加 6x5 合成台，最终限制为 6x6。

:::danger
`ShapedRecipePattern#setCraftingSize` 不是线程安全的，必须放在 `event#enqueueWork` 调用中执行。
:::

### 客户端配方

默认情况下，原版不会向[逻辑客户端][logicalside]发送任何配方，而是同步 `RecipePropertySet` / `SelectableRecipe.SingleInputSet`，以在用户交互时正确处理客户端行为。此外，当配方在配方书中解锁时，会同步其 `RecipeDisplay`。不过，这两种情况的适用范围有限，尤其是需要从配方本身获取更多数据时。对于这些情况，NeoForge 提供了将给定 `RecipeType` 的完整配方发送到客户端的方法。

必须在[游戏事件总线][events]上监听两个事件：`OnDatapackSyncEvent` 与 `RecipesReceivedEvent`。首先调用 `OnDatapackSyncEvent#sendRecipes`，指定要同步到客户端的 `RecipeType`。随后通过 `RecipesReceivedEvent#getRecipeMap`，从提供的 `RecipeMap` 访问配方。此外，玩家退出世界后，应通过 `ClientPlayerNetworkEvent.LoggingOut` 清除客户端存储的所有配方。

```java
// Assume we have some custom RecipeType<ExampleRecipe> EXAMPLE_RECIPE_TYPE

@SubscribeEvent // on the game event bus
public static void datapackSync(OnDatapackSyncEvent event) {
    // Specify what recipe types to sync to the client
    event.sendRecipes(EXAMPLE_RECIPE_TYPE);
}

// In some class only on the physical client

private static final List<RecipeHolder<ExampleRecipe>> EXAMPLE_RECIPES = new ArrayList<>();

@SubscribeEvent // on the game event bus only on the physical client
public static void recipesReceived(RecipesReceivedEvent event) {
    // First remove the previous recipes
    EXAMPLE_RECIPES.clear();

    // Then store the recipes you want
    EXAMPLE_RECIPES.addAll(event.getRecipeMap().byType(EXAMPLE_RECIPE_TYPE));
}

@SubscribeEvent // on the game event bus only on the physical client
public static void clientLogOut(ClientPlayerNetworkEvent.LoggingOut event) {
    // Clear the stored recipes on world log out
    EXAMPLE_RECIPES.clear();
}
```

:::warning
如果计划同步自定义配方类型的配方，应在两个物理端都调用 `OnDatapackSyncEvent`。所有世界（包括单人游戏）都明确区分服务器与客户端，因此在客户端引用来自服务器的数据包 Registry 条目很可能导致游戏崩溃。
:::

## 数据生成

与大多数其他 JSON 文件一样，配方可以通过数据生成创建。对于配方，需要扩展 `RecipeProvider` 类并重写 `#buildRecipes`，还要扩展 `RecipeProvider.Runner` 类并将其传给数据生成器：

```java
public class MyRecipeProvider extends RecipeProvider {

    // Construct the provider to run
    protected MyRecipeProvider(HolderLookup.Provider provider, RecipeOutput output) {
        super(provider, output);
    }
 
    @Override
    protected void buildRecipes() {
        // Add your recipes here.
    }

    // The runner to add to the data generator
    public static class Runner extends RecipeProvider.Runner {
        // Get the parameters from the `GatherDataEvent`s.
        public Runner(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider) {
            super(output, lookupProvider);
        }

        @Override
        protected RecipeProvider createRecipeProvider(HolderLookup.Provider provider, RecipeOutput output) {
            return new MyRecipeProvider(provider, output);
        }
    }
}
```

需要注意 `RecipeOutput` 参数。Minecraft 使用该对象自动生成配方进度。此外，NeoForge 为 `RecipeOutput` 注入了[条件][conditions]支持，可通过 `#withConditions` 调用。

配方本身通常通过 `RecipeBuilder` 的子类添加。列出所有原版配方 builder 超出了本文范围（它们在[内置配方类型][builtin]一文中说明），不过[自定义配方页面][customdatagen]介绍了如何创建自己的 builder。

与其他所有数据提供器一样，配方提供器必须注册到 `GatherDataEvent`：

```java
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    // Call event.createDatapackRegistryObjects(...) first if adding datapack objects

    event.createProvider(MyRecipeProvider.Runner::new);
}
```

配方提供器还为常见场景添加了辅助方法，例如 `twoByTwoPacker`（用于 2x2 Block 配方）、`threeByThreePacker`（用于 3x3 Block 配方）和 `nineBlockStorageRecipes`（用于 3x3 Block 配方，以及 1 个 Block 分解为 9 个 Item 的配方）。

[advancement]: ../advancements.md
[brewing]: ../../../items/mobeffects.md#brewing
[builtin]: builtin.md
[cancel]: ../../../concepts/events.md#cancellable-events
[codec]: ../../../datastorage/codecs.md
[conditions]: ../conditions.md
[customdatagen]: custom.md#data-generation
[customrecipes]: custom.md
[datagen]: #data-generation
[event]: ../../../concepts/events.md
[ingredients]: ingredients.md
[logicalside]: ../../../concepts/sides.md#the-logical-side
[streamcodec]: ../../../networking/streamcodecs.md
[tags]: ../tags.md
