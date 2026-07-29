# 自定义配方（Custom Recipes）

添加自定义配方至少需要三项内容：`Recipe`、`RecipeType` 和 `RecipeSerializer`。根据所实现的功能，如果无法复用现有子类，可能还需要自定义 `RecipeInput`、`RecipeDisplay`、`SlotDisplay`、`RecipeBookCategory` 与 `RecipePropertySet`。

为便于演示并突出多项功能，我们将实现一种由配方驱动的机制：玩家需要用特定物品右键点击世界中的 `BlockState`，破坏该 `BlockState` 并掉落结果物品。

## 配方输入

首先定义要放入配方的内容。必须理解，配方输入表示玩家当前实际使用的输入。因此，这里不使用标签或原料，而使用当前可用的实际物品堆叠与方块状态。

```java
// 输入为 BlockState 和 ItemStack。
public record RightClickBlockInput(BlockState state, ItemStack stack) implements RecipeInput {
    // 从特定槽位获取物品的方法。这里只含一个 ItemStack，并没有真正的槽位概念，因此假定
    // 槽位 0 存放我们的物品，然后扔到任何其他槽位上。 （取自 SingleRecipeInput#getItem。）
    @Override
    public ItemStack getItem(int slot) {
        if (slot != 0) throw new IllegalArgumentException("No item for index " + slot);
        return this.stack();
    }

    // 我们的输入需要的槽大小。再说一次，我们并没有真正的槽位概念，所以我们只是返回 1
    // 因为这里只涉及一个 ItemStack。包含多个物品的输入应返回实际数量。
    @Override
    public int size() {
        return 1;
    }
}
```

配方输入按需创建，因此无需以任何方式注册或序列化。并非总要创建自定义输入；原版输入（`CraftingInput`、`SingleRecipeInput` 和 `SmithingRecipeInput`）足以满足许多用例。

## 配方类

有了输入之后，接下来处理配方本身。它保存配方数据，同时负责匹配并返回配方结果，因此通常是自定义配方中最长的类。

```java
// Recipe<T> 的泛型参数是上文的 RightClickBlockInput。
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // 配方数据的代码内表示。这基本上可以是你想要的任何东西。
    // 这里常见的东西是某种处理时间整数，或者经验奖励。
    // 请注意，我们现在使用成分而不是ItemStack作为输入。
    private final Recipe.CommonInfo commonInfo;
    private final RightClickBlockRecipe.BlockBookInfo bookInfo;
    private final BlockState inputState;
    private final Ingredient inputItem;
    private final ItemStackTemplate result;

    // 添加一个设置所有属性的构造器。
    public RightClickBlockRecipe(Recipe.CommonInfo commonInfo, RightClickBlockRecipe.BlockBookInfo bookInfo, BlockState inputState, Ingredient inputItem, ItemStackTemplate result) {
        this.commonInfo = commonInfo;
        this.bookInfo = bookInfo;
        this.inputState = inputState;
        this.inputItem = inputItem;
        this.result = result;
    }

    // 检查给定输入是否与此配方匹配。第一个参数与泛型匹配。
    // 我们检查方块状态和ItemStack，如果两者都匹配，则仅检查返回 true。
    // 如果我们需要检查输入的尺寸，我们也可以在这里这样做。
    @Override
    public boolean matches(RightClickBlockInput input, Level level) {
        return this.inputState == input.state() && this.inputItem.test(input.stack());
    }

    // 根据给定的输入，返回此处配方的结果。该参数与泛型参数匹配。
    // 这可以使用 `ItemStackTemplate#create` 创建。
    @Override
    public ItemStack assemble(RightClickBlockInput input) {
        return this.result.create();
    }

    // 为 true 时，阻止配方同步到配方书，也不会在 use/unlock 时授予配方。
    // 如果配方不应出现在配方书中，例如地图扩展，则仅应为 true。
    // 虽然此配方处于输入状态，但它仍然可以在自定义配方书中使用
    //   方法如下。
    @Override
    public boolean isSpecial() {
        return true;
    }

    // 此示例概述了最重要的方法。还有许多其他方法可以覆盖。
    // 一些方法将在下面的章节中解释，因为它们在这里不容易压缩和理解。
    // 查看配方的类定义即可查看全部。
}
```

### 通用信息

所有配方都有从 JSON 解析的通用信息，尽管具体实现方式可能不同。原版为所有配方提供 `Recipe.CommonInfo`。目前，它允许配方指定解锁时是否显示通知弹窗。`CommonInfo` 还提供[映射 codec][codec] 与[流 codec][streamcodec]，用于与下文的 [`RecipeSerializer`][serializer] 集成。

因此，可以用 `CommonInfo` 指定 `Recipe` 上的一些方法：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    
    private final Recipe.CommonInfo commonInfo;
    // 其他字段

    public RightClickBlockRecipe(Recipe.CommonInfo commonInfo, ...) {
        this.commonInfo = commonInfo;
        // 其他初始化
    }

    @Override
    public boolean showNotification() {
        return this.commonInfo.showNotification();
    }

    // 其他方法
}
```

:::info
不强制使用 `CommonInfo` record，甚至不必在 JSON 中提供 `show_notification` 字段。是否适合使用由 mod 开发者决定。
:::

## 配方书信息

与通用信息类似，JSON 中还会解析与配方书有关的字段。配方书是一种在转换菜单（例如工作台、熔炉等）中显示配方的 [GUI][gui]。针对这些字段，原版提供 `Recipe.BookInfo<CategoryType>` 接口，其中 `CategoryType` 表示配方分类（前提是可序列化），或表示可转换为该分类的中间可序列化对象。与 `CommonInfo` 一样，它提供[映射 codec][codec] 与[流 codec][streamcodec]，用于与下文的 [`RecipeSerializer`][serializer] 集成。

例如：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    
    private final RightClickBlockRecipe.BlockBookInfo bookInfo;
    // 其他字段

    public RightClickBlockRecipe(RightClickBlockRecipe.BlockBookInfo bookInfo, ...) {
        this.bookInfo = bookInfo;
        // 其他初始化
    }

    @Override
    public String group() {
        return this.bookInfo.group();
    }

    @Override
    public RecipeBookCategory recipeBookCategory() {
        // 将可序列化条目转换为其配方书类别。
        return switch (this.bookInfo.category()) {
            case BUILDING -> RecipeBookCategories.CRAFTING_BUILDING_BLOCKS;
            case EQUIPMENT -> RecipeBookCategories.CRAFTING_EQUIPMENT;
            case REDSTONE -> RecipeBookCategories.CRAFTING_REDSTONE;
            case MISC -> RecipeBookCategories.CRAFTING_MISC;
        };
    }

    // 其他方法

    public record BlockBookInfo(CraftingBookCategory category, String group) implements Recipe.BookInfo<CraftingBookCategory> {
        public static final MapCodec<BlockBookInfo> MAP_CODEC = Recipe.BookInfo.mapCodec(
            // 接收通用编解码器、默认通用值和
            // `(category, group) -> bookInfo` 的构造器。
            CraftingBookCategory.CODEC, CraftingBookCategory.MISC, BlockBookInfo::new
        );
        public static final StreamCodec<RegistryFriendlyByteBuf, BlockBookInfo> STREAM_CODEC = Recipe.BookInfo.streamCodec(
            // 接收泛型的流编解码器和构造器
            // `(category, group) -> bookInfo`.
            CraftingBookCategory.STREAM_CODEC, BlockBookInfo::new
        );
    }
}
```

:::info
与 `CommonInfo` 一样，不强制使用 `BookInfo`，甚至不必在 JSON 中提供相关字段。mod 开发者应自行判断其配方是否适合使用（例如，`Recipe#isSpecial` 返回 true 的配方不会出现在配方书中，因此不应使用 `BookInfo`）。不过，`Recipe#group` 与 `recipeBookCategory` 都必须是非 null 对象。
:::

### 配方分组

分组充当键，用于把多个配方合并成配方书中的单个条目。如果分组设为空字符串，则会被视作独立的唯一条目。

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // 在此处理其他内容

    @Override
    public String group() {
        return this.bookInfo.group();
    }
}
```

### 配方书分类

`RecipeBookCategory` 只负责定义配方在配方书中显示于哪个分组。例如，铁镐合成配方会显示在 `RecipeBookCategories#CRAFTING_EQUIPMENT`，熟鳕鱼配方则显示在 `#FURNANCE_FOOD` 或 `#SMOKER_FOOD`。每个配方都关联一个 `RecipeBookCategory`。原版分类可在 `RecipeBookCategories` 中找到。

:::info
熟鳕鱼有两个配方，一个用于熔炉，另一个用于烟熏炉；二者具有不同的配方书分类。
:::

如果配方不适合任何现有分类（通常是因为它不使用现有工作站，如工作台或熔炉），可以创建新的 `RecipeBookCategory`。每个 `RecipeBookCategory` 都必须[注册][registry]到 `BuiltInRegistries#RECIPE_BOOK_CATEGORY`：

```java
/// 对于某个 DeferredRegister<RecipeBookCategory> RECIPE_BOOK_CATEGORIES
public static final Supplier<RecipeBookCategory> RIGHT_CLICK_BLOCK_CATEGORY = RECIPE_BOOK_CATEGORIES.register(
    "right_click_block", RecipeBookCategory::new
);
```

随后，为了设置分类，可以重写 `#recipeBookCategory`，直接返回自定义分类，或使用配方书信息（若已实现）映射到自定义分类：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // 在此处理其他内容

    @Override
    public RecipeBookCategory recipeBookCategory() {
        return switch (this.bookInfo.category()) {
            case BUILDING -> RecipeBookCategories.CRAFTING_BUILDING_BLOCKS;
            case EQUIPMENT -> RecipeBookCategories.CRAFTING_EQUIPMENT;
            case REDSTONE -> RecipeBookCategories.CRAFTING_REDSTONE;
            case MISC -> RIGHT_CLICK_BLOCK_CATEGORY.get();
        };
    }
}
```

### 搜索分类

从技术上讲，所有 `RecipeBookCategory` 都是 `ExtendedRecipeBookCategory`。另有一种名为 `SearchRecipeBookCategory` 的 `ExtendedRecipeBookCategory`，用于在配方书中查看所有配方时聚合多个 `RecipeBookCategory`。

NeoForge 允许用户在模组事件总线上通过 `RegisterRecipeBookSearchCategoriesEvent#register`，将自己的 `ExtendedRecipeBookCategory` 指定为搜索分类。`register` 接收代表搜索分类的 `ExtendedRecipeBookCategory`，以及组成该搜索分类的各个 `RecipeBookCategory`。作为搜索分类的 `ExtendedRecipeBookCategory` 无需注册到任何原版静态注册表。

```java
// 在某些位置
public static final ExtendedRecipeBookCategory RIGHT_CLICK_BLOCK_SEARCH_CATEGORY = new ExtendedRecipeBookCategory() {};

@SubscribeEvent // 位于模组事件总线上
public static void registerSearchCategories(RegisterRecipeBookSearchCategoriesEvent event) {
    event.register(
        // 搜索类别
        RIGHT_CLICK_BLOCK_SEARCH_CATEGORY,
        // 搜索类别中的所有配方类别作为可变参数
        RecipeBookCategories.CRAFTING_BUILDING_BLOCKS,
        RecipeBookCategories.CRAFTING_EQUIPMENT,
        RecipeBookCategories.CRAFTING_REDSTONE,
        RIGHT_CLICK_BLOCK_CATEGORY.get()
    )
}
```

## 放置信息

`PlacementInfo` 用于定义配方使用者采用的合成要求，以及内容能否、应如何放入关联工作站（例如工作台、熔炉）。`PlacementInfo` 只面向物品原料；如果需要其他类型的原料（如流体、方块），则必须从头实现外围逻辑。在这些情况下，可以通过 `PlacementInfo#NOT_PLACEABLE` 将配方标记为不可放置。不过，如果配方中至少包含一个类似物品的对象，就应创建 `PlacementInfo`。

可以通过 `create` 创建 `PlacementInfo`，它接收一个或一组原料；也可通过 `createFromOptionals` 创建，它接收可选原料列表。如果配方包含空槽位的表示形式，应使用 `createFromOptionals`，并为每个空槽位提供空 Optional：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // 在此处理其他内容
    private PlacementInfo info;

    @Override
    public PlacementInfo placementInfo() {
        // 该代表是为了防止在此时间点成分未完全填充
        // 标签和配方同时加载，这就是此可能出现这种情况的原因。
        if (this.info == null) {
            // 使用可选成分，因为方块状态可能具有物品表示
            List<Optional<Ingredient>> ingredients = new ArrayList<>();
            Item stateItem = this.inputState.getBlock().asItem();
            ingredients.add(stateItem != Items.AIR ? Optional.of(Ingredient.of(stateItem)): Optional.empty());
            ingredients.add(Optional.of(this.inputItem));

            // 创建展示位置信息
            this.info = PlacementInfo.createFromOptionals(ingredients);
        }

        return this.info;
    }
}
```

## 槽位显示

`SlotDisplay` 表示由配方使用者（如配方书）查看时，各槽位应渲染何种内容。`SlotDisplay` 有两个方法。其一是 `resolve`：它接收包含可用注册表与燃料值的 `ContextMap`（如 `SlotDisplayContext` 所示），以及当前 `DisplayContentsFactory`；后者接收该槽位要显示的内容，并返回转换后的内容列表供输出使用。其二是 `type`，其中保存用于编码/解码显示内容的 [`MapCodec`][codec] 与 [`StreamCodec`][streamcodec]。

`SlotDisplay` 通常通过 [`Ingredient` 的 `#display` 实现；对于模组原料，则通过 `ICustomIngredient#display` 实现][ingredients]。不过，有些输入可能不是原料，此时需要使用现有 `SlotDisplay` 或创建新的 `SlotDisplay`。

原版与 NeoForge 提供以下可用槽位显示：

- `SlotDisplay.Empty`：表示无内容的槽位。
- `SlotDisplay.ItemSlotDisplay`：表示物品的槽位。
- `SlotDisplay.ItemStackSlotDisplay`：表示 ItemStack 模板的槽位。
- `SlotDisplay.TagSlotDisplay`：表示物品标签的槽位。
- `SlotDisplay.OnlyWithComponent`：对其他显示进行筛选，只保留具有给定数据组件的物品。
- `SlotDisplay.WithAnyPotion`：表示具有随机 `DataComponents#POTION_CONTENTS` 值的输入。
- `SlotDisplay.WithRemainder`：表示具有某种合成剩余物的输入。
- `SlotDisplay.AnyFuel`：表示所有燃料物品的槽位。
- `SlotDisplay.Composite`：表示多个其他槽位显示组合的槽位。
- `SlotDisplay.DyedSlotDemo`：表示将染料应用到目标并设置 `DataComponents#DYED_COLOR` 的槽位。
- `SlotDisplay.SmithingTrimDemoSlotDisplay`：表示使用给定材料将随机锻造纹饰应用到基础对象的槽位。
- `FluidSlotDisplay`：表示流体的槽位。
- `FluidStackSlotDisplay`：表示 FluidStack 的槽位。
- `FluidTagSlotDisplay`：表示流体标签的槽位。

我们的配方有三个“槽位”：`BlockState` 输入、原料输入和 `ItemStack` 结果。原料输入已经关联 `SlotDisplay`，`ItemStack` 可由 `SlotDisplay.ItemStackSlotDisplay` 表示。另一方面，`BlockState` 需要自定义 `SlotDisplay` 与 `DisplayContentsFactory`，因为现有实现只接收 `ItemStack`，而本示例会以不同方式处理 `BlockState`。

先看 `DisplayContentsFactory`，它用于将某种类型转换为所需的内容显示类型。可用工厂包括：

- `DisplayContentsFactory.ForStacks`：接收 `ItemStack` 的转换器。
- `DisplayContentsFactory.ForRemainders`：接收输入对象与剩余对象列表的转换器。
- `ForFluidStacks`：接收 `FluidStack` 的转换器。

据此，可以实现 `DisplayContentsFactory`，将提供的对象转换为所需输出。例如，`SlotDisplay.ItemStackContentsFactory` 接收 `ForStacks` 转换器，并把各 Stack 转换成 `ItemStack`。

对于 `BlockState`，创建一个接收该 State 的工厂，并提供直接输出 State 本身的基础实现。

```java
// 方块状态的基本变压器
public interface ForBlockStates<T> extends DisplayContentsFactory<T> {

    // 委托方法
    default forState(Holder<Block> block) {
        return this.forState(block.value());
    }

    default forState(Block block) {
        return this.forState(block.defaultBlockState());
    }

    // 接收并转换为所需输出的方块状态
    T forState(BlockState state);
}

// 方块状态输出的实现
public class BlockStateContentsFactory implements ForBlockStates<BlockState> {
    // 单例实例
    public static final BlockStateContentsFactory INSTANCE = new BlockStateContentsFactory();

    private BlockStateContentsFactory() {}

    @Override
    public BlockState forState(BlockState state) {
        return state;
    }
}

// ItemStack输出的实现
public class BlockStateStackContentsFactory implements ForBlockStates<ItemStack> {
    // 单例实例
    public static final BlockStateStackContentsFactory INSTANCE = new BlockStateStackContentsFactory();

    private BlockStateStackContentsFactory() {}

    @Override
    public ItemStack forState(BlockState state) {
        return new ItemStack(state.getBlock());
    }
}
```

随后即可创建新的 `SlotDisplay`。`SlotDisplay.Type` 必须[注册][registry]：

```java
// 一个简单的老虎机展示
public record BlockStateSlotDisplay(BlockState state) implements SlotDisplay {
    public static final MapCodec<BlockStateSlotDisplay> CODEC = BlockState.CODEC.fieldOf("state")
        .xmap(BlockStateSlotDisplay::new, BlockStateSlotDisplay::state);
    public static final StreamCodec<RegistryFriendlyByteBuf, BlockStateSlotDisplay> STREAM_CODEC =
        StreamCodec.composite(
            ByteBufCodecs.idMapper(Block.BLOCK_STATE_REGISTRY), BlockStateSlotDisplay::state,
            BlockStateSlotDisplay::new
        );
    
    @Override
    public <T> Stream<T> resolve(ContextMap context, DisplayContentsFactory<T> factory) {
        return switch (factory) {
            // 检查我们的内容工厂并在必要时进行改造
            case ForBlockStates<T> states -> Stream.of(states.forState(this.state));
            // 如果你希望根据内容显示对内容进行不同的处理
            //   那么你可以像这样在其他显示器上使用
            case ForStacks<T> stacks -> Stream.of(stacks.forStack(state.getBlock().asItem()));
            // 如果没有工厂匹配，则不要返回转换后的流中的任何内容
            default -> Stream.empty();
        }
    }

    @Override
    public SlotDisplay.Type<? extends SlotDisplay> type() {
        // 从下面返回注册的类型
        return BLOCK_STATE_SLOT_DISPLAY.get();
    }
}

// 在某些注册商类别中
/// 对于某些 DeferredRegister<SlotDisplay.Type<?>> SLOT_DISPLAY_TYPES
public static final Supplier<SlotDisplay.Type<BlockStateSlotDisplay>> BLOCK_STATE_SLOT_DISPLAY = SLOT_DISPLAY_TYPES.register(
    "block_state",
    () -> new SlotDisplay.Type<>(BlockStateSlotDisplay.CODEC, BlockStateSlotDisplay.STREAM_CODEC)
);
```

## 配方显示

`RecipeDisplay` 与 `SlotDisplay` 相似，但它表示完整配方。默认接口只跟踪配方的 `result` 和 `craftingStation`，后者表示应用配方的工作台。`RecipeDisplay` 也有一个 `type`，其中保存用于编码/解码显示内容的 [`MapCodec`][codec] 与 [`StreamCodec`][streamcodec]。然而，现有 `RecipeDisplay` 子类型都不包含在客户端正确渲染本配方所需的全部信息，因此需要创建自己的 `RecipeDisplay`。

所有槽位与原料都应表示为 `SlotDisplay`。网格大小等限制可以由用户选择任意方式提供。

```java
// 一个简单的菜谱展示
public record RightClickBlockRecipeDisplay(
    SlotDisplay inputState,
    SlotDisplay inputItem,
    SlotDisplay result, // 实现 RecipeDisplay#result
    SlotDisplay craftingStation // 实现 RecipeDisplay#craftingStation
) implements RecipeDisplay {
    public static final MapCodec<RightClickBlockRecipeDisplay> MAP_CODEC = RecordCodecBuilder.mapCodec(
        instance -> instance.group(
                    SlotDisplay.CODEC.fieldOf("input_state").forGetter(RightClickBlockRecipeDisplay::inputState),
                    SlotDisplay.CODEC.fieldOf("input_item").forGetter(RightClickBlockRecipeDisplay::inputItem),
                    SlotDisplay.CODEC.fieldOf("result").forGetter(RightClickBlockRecipeDisplay::result),
                    SlotDisplay.CODEC.fieldOf("crafting_station").forGetter(RightClickBlockRecipeDisplay::craftingStation)
                )
                .apply(instance, RightClickBlockRecipeDisplay::new)
    );
    public static final StreamCodec<RegistryFriendlyByteBuf, RightClickBlockRecipeDisplay> STREAM_CODEC = StreamCodec.composite(
        SlotDisplay.STREAM_CODEC,
        RightClickBlockRecipeDisplay::inputState,
        SlotDisplay.STREAM_CODEC,
        RightClickBlockRecipeDisplay::inputItem,
        SlotDisplay.STREAM_CODEC,
        RightClickBlockRecipeDisplay::result,
        SlotDisplay.STREAM_CODEC,
        RightClickBlockRecipeDisplay::craftingStation,
        RightClickBlockRecipeDisplay::new
    );

    @Override
    public RecipeDisplay.Type<? extends RecipeDisplay> type() {
        // 从下面返回注册的类型
        return RIGHT_CLICK_BLOCK_RECIPE_DISPLAY.get();
    }
}

// 在某些注册商类别中
/// 对于某些 DeferredRegister<RecipeDisplay.Type<?>> RECIPE_DISPLAY_TYPES
public static final Supplier<RecipeDisplay.Type<RightClickBlockRecipeDisplay>> RIGHT_CLICK_BLOCK_RECIPE_DISPLAY = RECIPE_DISPLAY_TYPES.register(
    "right_click_block",
    () -> new RecipeDisplay.Type<>(RightClickBlockRecipeDisplay.CODEC, RightClickBlockRecipeDisplay.STREAM_CODEC)
);
```

随后可通过重写 `#display` 为配方创建配方显示：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // 在此处理其他内容

    @Override
    public List<RecipeDisplay> display() {
        // 同一配方可以有多种不同的显示
        // 但此示例将仅使用一个像其他配方一样。
        return List.of(
            // 添加我们的配方显示与指定的槽位
            new RightClickBlockRecipeDisplay(
                new BlockStateSlotDisplay(this.inputState),
                this.inputItem.display(),
                new SlotDisplay.ItemStackSlotDisplay(this.result),
                new SlotDisplay.ItemSlotDisplay(Items.GRASS_BLOCK)
            )
        )
    }
}
```

## 配方类型

接下来是配方类型。这相当直接，因为配方类型除名称外不关联其他数据。它是配方系统中两个需要[注册][registry]的部分之一，因此与其他注册表一样，创建 `DeferredRegister` 并向其中注册：

```java
public static final DeferredRegister<RecipeType<?>> RECIPE_TYPES =
        DeferredRegister.create(Registries.RECIPE_TYPE, ExampleMod.MOD_ID);

public static final Supplier<RecipeType<RightClickBlockRecipe>> RIGHT_CLICK_BLOCK_TYPE =
        RECIPE_TYPES.register(
                "right_click_block",
                // 创建配方类型，将 `toString` 设置为该类型的注册表名称
                RecipeType::simple
        );
```

注册配方类型后，必须在配方中重写 `#getType`：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // 在此处理其他内容

    @Override
    public RecipeType<? extends Recipe<RightClickBlockInput>> getType() {
        return RIGHT_CLICK_BLOCK_TYPE.get();
    }
}
```

## 配方序列化器

配方序列化器提供两个 codec：映射 codec 与流 codec，分别用于与 JSON 之间及与网络之间的序列化。本节不会深入介绍 codec 的工作方式；更多信息请参阅[映射 Codec][codec] 与[流 Codec][streamcodec]。

在配方类中创建映射 codec 与流 codec。

```java
public static final MapCodec<RightClickBlockRecipe> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
        Recipe.CommonInfo.MAP_CODEC.forGetter(recipe -> recipe.commonInfo),
        RightClickBlockRecipe.BlockBookInfo.MAP_CODEC.forGetter(recipe -> recipe.bookInfo),
        BlockState.CODEC.fieldOf("state").forGetter(RightClickBlockRecipe::getInputState),
        Ingredient.CODEC.fieldOf("ingredient").forGetter(RightClickBlockRecipe::getInputItem),
        ItemStack.CODEC.fieldOf("result").forGetter(RightClickBlockRecipe::getResult)
).apply(inst, RightClickBlockRecipe::new));

public static final StreamCodec<RegistryFriendlyByteBuf, RightClickBlockRecipe> STREAM_CODEC = StreamCodec.composite(
        Recipe.CommonInfo.STREAM_CODEC, recipe -> recipe.commonInfo,
        RightClickBlockRecipe.BlockBookInfo.STREAM_CODEC, recipe -> recipe.bookInfo,
        ByteBufCodecs.idMapper(Block.BLOCK_STATE_REGISTRY), RightClickBlockRecipe::getInputState,
        Ingredient.CONTENTS_STREAM_CODEC, RightClickBlockRecipe::getInputItem,
        ItemStack.STREAM_CODEC, RightClickBlockRecipe::getResult,
        RightClickBlockRecipe::new
);
```

与配方类型相同，创建并注册序列化器：

```java
public static final DeferredRegister<RecipeType<?>> RECIPE_SERIALIZERS =
        DeferredRegister.create(Registries.RECIPE_SERIALIZER, ExampleMod.MOD_ID);

public static final Supplier<RecipeSerializer<RightClickBlockRecipe>> RIGHT_CLICK_BLOCK =
        RECIPE_SERIALIZERS.register("right_click_block", ()-> new RecipeSerializer<>(RightClickBlockRecipe.CODEC, RightClickBlockRecipe.STREAM_CODEC));
```

同样，还必须在配方中重写 `#getSerializer`：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // 在此处理其他内容

    @Override
    public RecipeSerializer<? extends Recipe<RightClickBlockInput>> getSerializer() {
        return RIGHT_CLICK_BLOCK.get();
    }
}
```

## 合成机制

现在配方的所有部分都已完成，可以制作配方 JSON（参阅[数据生成][datagen]一节），再像上面那样从配方管理器查询配方。随后如何使用配方由你决定。常见用例是能够处理配方的机器，并将当前配方存储为字段。

不过在本例中，我们要在用物品右键点击方块时应用配方。为此将使用[事件处理器][event]。请记住，这只是示例实现，可以任意修改（只要在服务器上运行）。由于交互状态需要在客户端与服务器保持一致，还必须[通过网络同步所有相关输入状态][networking]。

可以建立一个简单的网络实现来同步配方输入：

```java
// 基本包类，必须注册。
public record ClientboundRightClickBlockRecipesPayload(
    Set<BlockState> inputStates, Set<Holder<Item>> inputItems
) implements CustomPacketPayload {

    // ...
}

// Packet 将数据存储在实例类中。
// 存在于服务器和客户端上进行初始匹配。
public interface RightClickBlockRecipeInputs {

    Set<BlockState> inputStates();
    Set<Holder<Item>> inputItems();

    default boolean test(BlockState state, ItemStack stack) {
        return this.inputStates().contains(state) && this.inputItems().contains(stack.getItemHolder());
    }
}

// 服务器资源侦听器，以便在配方出现时可以重新加载。
public class ServerRightClickBlockRecipeInputs implements ResourceManagerReloadListener, RightClickBlockRecipeInputs {

    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "block_recipe_inputs");

    private final RecipeManager recipeManager;

    private Set<BlockState> inputStates;
    private Set<Holder<Item>> inputItems;

    public RightClickBlockRecipeInputs(RecipeManager recipeManager) {
        this.recipeManager = recipeManager;
    }

    // 设置在此处输入，因为 #apply 根据侦听器注册顺序同步触发。
    // 配方始终首先应用。
    @Override
    public void onResourceManagerReload(ResourceManager manager) {
        MinecraftServer server = ServerLifecycleHooks.getCurrentServer();
        if (server == null) return; // 永远不应该是 null

        // 填充输入
        Set<BlockState> inputStates = new HashSet<>();
        Set<Holder<Item>> inputItems = new HashSet<>();

        this.recipeManager.recipeMap().byType(RIGHT_CLICK_BLOCK_TYPE.get())
            .forEach(holder -> {
                var recipe = holder.value();
                inputStates.add(recipe.getInputState());
                inputItems.addAll(recipe.getInputItem().items());
            });
        
        this.inputStates = Set.copyOf(inputStates);
        this.inputItems = Set.copyOf(inputItems);
    }

    public void syncToClient(Stream<ServerPlayer> players) {
        ClientboundRightClickBlockRecipesPayload payload =
            new ClientboundRightClickBlockRecipesPayload(this.inputStates, this.inputItems);
        players.forEach(player -> PacketDistributor.sendToPlayer(player, payload));
    }

    @Override
    public Set<BlockState> inputStates() {
        return this.inputStates;
    }

    @Override
    public Set<Holder<Item>> inputItems() {
        return this.inputItems;
    }
}

// 客户端实现来保存输入。
public record ClientRightClickBlockRecipeInputs(
    Set<BlockState> inputStates, Set<Holder<Item>> inputItems
) implements RightClickBlockRecipeInputs {

    public ClientRightClickBlockRecipeInputs(Set<BlockState> inputStates, Set<Holder<Item>> inputItems) {
        this.inputStates = Set.copyOf(inputStates);
        this.inputItems = Set.copyOf(inputItems);
    }
}

// 根据侧面处理配方实例。
public class ServerRightClickBlockRecipes {

    private static ServerRightClickBlockRecipeInputs inputs;

    public static RightClickBlockRecipeInputs inputs() {
        return ServerRightClickBlockRecipes.inputs;
    }

    @SubscribeEvent // 位于游戏事件总线上
    public static void addListener(AddServerReloadListenersEvent event) {
        // 注册服务器重载监听器
        ServerRightClickBlockRecipes.inputs = new ServerRightClickBlockRecipeInputs(
            event.getServerResources().getRecipeManager()
        );
        event.addListener(ServerRightClickBlockRecipeInputs.ID, ServerRightClickBlockRecipes.inputs);
        // 确保它在配方之后运行
        event.addDependency(VanillaServerListeners.RECIPES, ServerRightClickBlockRecipeInputs.ID);
    }

    @SubscribeEvent // 位于游戏事件总线上
    public static void datapackSync(OnDatapackSyncEvent event) {
        // 发送给客户端
        ServerRightClickBlockRecipes.inputs.syncToClient(event.getRelevantPlayers());
    }
}

public class ClientRightClickBlockRecipes {

    private static ClientRightClickBlockRecipeInputs inputs;

    public static RightClickBlockRecipeInputs inputs() {
        return ClientRightClickBlockRecipes.inputs;
    }

    // 处理发送的数据包
    public static void handle(final ClientboundRightClickBlockRecipesPayload data, final IPayloadContext context) {
        // 在主线程上对数据做一些事情
        ClientRightClickBlockRecipes.inputs = new ClientRightClickBlockRecipeInputs(
            data.inputStates(), data.inputItems()
        );
    }

    @SubscribeEvent // 仅在物理客户端上的游戏事件总线上
    public static void clientLogOut(ClientPlayerNetworkEvent.LoggingOut event) {
        // 退出世界时清除存储的输入
        ClientRightClickBlockRecipes.inputs = null;
    }
}

public class RightClickBlockRecipes {
    // 制作代理方法才能正常访问
    public static RightClickBlockRecipeInputs inputs(Level level) {
        return level.isClientSide()
            ? ClientRightClickBlockRecipes.inputs()
            : ServerRightClickBlockRecipes.inputs();
    }
}
```

或者，也可以改为将[完整配方同步到客户端][clientrecipes]：

```java
// 存在于服务器和客户端上进行初始匹配。
public interface RightClickBlockRecipeInputs {

    Set<BlockState> inputStates();
    Set<Holder<Item>> inputItems();

    default boolean test(BlockState state, ItemStack stack) {
        return this.inputStates().contains(state) && this.inputItems().contains(stack.getItemHolder());
    }
}

// 服务器资源侦听器，以便在配方出现时可以重新加载。
public class ServerRightClickBlockRecipeInputs implements ResourceManagerReloadListener, RightClickBlockRecipeInputs {

    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "block_recipe_inputs");

    private final RecipeManager recipeManager;

    private Set<BlockState> inputStates;
    private Set<Holder<Item>> inputItems;

    public RightClickBlockRecipeInputs(RecipeManager recipeManager) {
        this.recipeManager = recipeManager;
    }

    // 设置在此处输入，因为 #apply 根据侦听器注册顺序同步触发。
    // 配方始终首先应用。
    @Override
    public void onResourceManagerReload(ResourceManager manager) {
        MinecraftServer server = ServerLifecycleHooks.getCurrentServer();
        if (server != null) { // 永远不应该是 null
            // 填充输入
            Set<BlockState> inputStates = new HashSet<>();
            Set<Holder<Item>> inputItems = new HashSet<>();

            this.recipeManager.recipeMap().byType(RIGHT_CLICK_BLOCK_TYPE.get())
                .forEach(holder -> {
                    var recipe = holder.value();
                    inputStates.add(recipe.getInputState());
                    inputItems.addAll(recipe.getInputItem().items());
                });
            
            this.inputStates = Set.copyOf(inputStates);
            this.inputItems = Set.copyOf(inputItems);
        }
    }

    @Override
    public Set<BlockState> inputStates() {
        return this.inputStates;
    }

    @Override
    public Set<Holder<Item>> inputItems() {
        return this.inputItems;
    }
}

// 客户端实现来保存输入。
public record ClientRightClickBlockRecipeInputs(
    Set<BlockState> inputStates, Set<Holder<Item>> inputItems
) implements RightClickBlockRecipeInputs {

    public ClientRightClickBlockRecipeInputs(Set<BlockState> inputStates, Set<Holder<Item>> inputItems) {
        this.inputStates = Set.copyOf(inputStates);
        this.inputItems = Set.copyOf(inputItems);
    }
}

// 根据侧面处理配方实例。
public class ServerRightClickBlockRecipes {

    private static ServerRightClickBlockRecipeInputs inputs;

    public static RightClickBlockRecipeInputs inputs() {
        return ServerRightClickBlockRecipes.inputs;
    }

    @SubscribeEvent // 位于游戏事件总线上
    public static void addListener(AddServerReloadListenersEvent event) {
        // 注册服务器重载监听器
        ServerRightClickBlockRecipes.inputs = new ServerRightClickBlockRecipeInputs(
            event.getServerResources().getRecipeManager()
        );
        event.addListener(ServerRightClickBlockRecipeInputs.ID, ServerRightClickBlockRecipes.inputs);
        // 确保它在配方之后运行
        event.addDependency(VanillaServerListeners.RECIPES, ServerRightClickBlockRecipeInputs.ID);
    }

    @SubscribeEvent // 位于游戏事件总线上
    public static void datapackSync(OnDatapackSyncEvent event) {
        // 指定要同步到客户端的配方类型
        event.sendRecipes(RIGHT_CLICK_BLOCK_TYPE.get());
    }
}

public class ClientRightClickBlockRecipes {

    private static ClientRightClickBlockRecipeInputs inputs;

    public static RightClickBlockRecipeInputs inputs() {
        return ClientRightClickBlockRecipes.inputs;
    }

    @SubscribeEvent // 仅在物理客户端上的游戏事件总线上
    public static void recipesReceived(RecipesReceivedEvent event) {
        // 存储配方
        Set<BlockState> inputStates = new HashSet<>();
        Set<Holder<Item>> inputItems = new HashSet<>();

        event.getRecipeMap().byType(RIGHT_CLICK_BLOCK_TYPE.get())
            .forEach(holder -> {
                var recipe = holder.value();
                inputStates.add(recipe.getInputState());
                inputItems.addAll(recipe.getInputItem().items());
            });
        
        ClientRightClickBlockRecipes.inputs = new ClientRightClickBlockRecipeInputs(
            inputStates, inputItems
        );
    }

    @SubscribeEvent // 仅在物理客户端上的游戏事件总线上
    public static void clientLogOut(ClientPlayerNetworkEvent.LoggingOut event) {
        // 退出世界时清除存储的输入
        ClientRightClickBlockRecipes.inputs = null;
    }
}

public class RightClickBlockRecipes {
    // 制作代理方法才能正常访问
    public static RightClickBlockRecipeInputs inputs(Level level) {
        return level.isClientSide()
            ? ClientRightClickBlockRecipes.inputs()
            : ServerRightClickBlockRecipes.inputs();
    }
}
```

随后使用已同步输入，检查游戏中实际使用的输入：

```java
@SubscribeEvent // 位于游戏事件总线上
public static void useItemOnBlock(UseItemOnBlockEvent event) {
    // 如果我们没有处于事件的方块指定阶段，则跳过。有关详细信息，请参阅事件的 javadoc。
    if (event.getUsePhase() != UseItemOnBlockEvent.UsePhase.BLOCK) return;
    // 获取参数先检查输入
    Level level = event.getLevel();
    BlockPos pos = event.getPos();
    BlockState blockState = level.getBlockState(pos);
    ItemStack itemStack = event.getItemStack();

    // 检查输入是否可以产生双面配方
    if (!RightClickBlockRecipes.inputs(level).test(blockState, itemStack)) return;

    // 如果是这样，请在检查配方之前在服务器上确保
    if (!level.isClientSide() && level instanceof ServerLevel serverLevel) {
        // 创建输入并查询配方。
        RightClickBlockInput input = new RightClickBlockInput(blockState, itemStack);
        Optional<RecipeHolder<? extends Recipe<CraftingInput>>> optional = serverLevel.recipeAccess().getRecipeFor(
            // 配方类型。
            RIGHT_CLICK_BLOCK_TYPE.get(),
            input,
            level
        );
        ItemStack result = optional
            .map(RecipeHolder::value)
            .map(e -> e.assemble(input))
            .orElse(ItemStack.EMPTY);
        
        // 如果有结果，则打破方块并将结果扔到世界中。
        if (!result.isEmpty()) {
            level.removeBlock(pos, false);
            ItemEntity entity = new ItemEntity(level,
                    // 位置中心。
                    pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5,
                    result);
            level.addFreshEntity(entity);
        }
    }

    // 取消该事件以停止交互管道，无论哪一方。
    // 已经确定可以有结果了。
    event.cancelWithResult(InteractionResult.SUCCESS_SERVER);
}
```

## 数据生成

要为自定义配方序列化器创建配方 builder，需要实现 `RecipeBuilder` 及其方法。一个部分复制自原版的常见实现如下：

```java
// 该类是 abstract，因为有很多每个配方序列化器逻辑。
// 它的目的是显示 all（普通）配方 builder 的公共部分。
public abstract class SimpleRecipeBuilder implements RecipeBuilder {
    // 将字段设为 protected，以便我们的子类可以使用它们。
    protected final ItemStackTemplate result;
    protected String group = "";
    protected boolean showNotification = true;

    // 提供构建配方解锁进度的通用方法。
    // 如果使用，构建者还必须指定 `RecipeCategory` 来确定
    // 输出文件夹。
    protected final RecipeUnlockAdvancementBuilder advancementBuilder;
    protected final RecipeCategory category;

    // 构造器接受ItemStackTemplate是很常见的。
    // 或者，static builder 方法也是可能的。
    public SimpleRecipeBuilder(ItemStackTemplate result, RecipeCategory category) {
        this.result = result;
        this.category = category;
        this.advancementBuilder = new RecipeUnlockAdvancementBuilder();
    }

    // 该方法增加了配方推进的标准。
    @Override
    public SimpleRecipeBuilder unlockedBy(String name, Criterion<?> criterion) {
        this.criteria.put(name, criterion);
        return this;
    }

    // 该方法添加菜谱书组。如果你不想使用配方书组，
    // 删除 this.group 字段并使此方法成为 no-op (即返回此)。
    @Override
    public SimpleRecipeBuilder group(@Nullable String group) {
        this.group = Objects.requireNonNullElse(group, "");
        return this;
    }

    // 该方法设置解锁时是否显示通知Toast。如果你想
    // 此值要进行硬编码，删除 this.showNotification 字段和此方法。
    public SimpleRecipeBuilder showNotification(boolean showNotification) {
        this.showNotification = showNotification;
        return this;
    }

    // 使用 `#save(RecipeOutput)` 时返回配方的 ID。
    @Override
    public ResourceKey<Recipe<?>> defaultId() {
        // 如果结果不是 `ItemStackTemplate`，则需要手动
        // 使用结果构造 `ResourceKey`。
        return RecipeBuilder.getDefaultRecipeId(this.result);
    }
}
```

至此已有配方 builder 的基础。在继续处理依赖配方序列化器的部分前，应先确定配方工厂的形式。本例适合直接使用构造器；其他情况下，可以使用静态辅助方法或小型函数式接口。若一个 builder 用于多个配方类，这一点尤其重要。

使用 `RightClickBlockRecipe::new` 作为配方工厂，并复用上面的 `SimpleRecipeBuilder` 类，可以为 `RightClickBlockRecipe` 创建以下配方 builder：

```java
public class RightClickBlockRecipeBuilder extends SimpleRecipeBuilder {
    private final BlockState inputState;
    private final Ingredient inputItem;

    // 由于我们只有每个输入之一，因此我们将它们传递给构造器。
    // 具有某种成分列表的配方序列化器的 builder 通常会
    // 初始化一个空列表并使用 #addIngredient 或类似的方法代替。
    public RightClickBlockRecipeBuilder(ItemStackTemplate result, RecipeCategory category, BlockState inputState, Ingredient inputItem) {
        super(result, category);
        this.inputState = inputState;
        this.inputItem = inputItem;
    }

    // 使用给定的 RecipeOutput 和键保存配方。该方法在RecipeBuilder接口中定义。
    @Override
    public void save(RecipeOutput output, ResourceKey<Recipe<?>> key) {
        // 创建配方。
        RightClickBlockRecipe recipe = new RightClickBlockRecipe(
            RecipeBuilder.createCraftingCommonInfo(this.showNotification),
            new RightClickBlockRecipe.BlockBookInfo(
                RecipeBuilder.determineCraftingBookCategory(this.category),
                this.group
            ),
            this.inputState,
            this.inputItem,
            this.result
        );

        // 将 ID、配方和配方进度传递到 RecipeOutput。
        output.accept(key, recipe, this.advancementBuilder.build(output, key, this.category));
    }
}
```

现在，在[数据生成][recipedatagen]期间，可以像使用其他 builder 一样调用自定义配方 builder：

```java
@Override
protected void buildRecipes(RecipeOutput output) {
    new RightClickRecipeBuilder(
            // 我们的构造器参数。此示例添加了一直流行的污垢 -> 钻石转换。
            new ItemStackTemplate(Items.DIAMOND),
            RecipeCategory.MISC,
            Blocks.DIRT.defaultBlockState(),
            Ingredient.of(Items.APPLE)
    )
            .unlockedBy("has_apple", this.has(Items.APPLE))
            .save(output);
    // 其他配方 builder 在这里
}
```

:::info
也可以将 `SimpleRecipeBuilder` 合并进 `RightClickBlockRecipeBuilder`（或自己的配方 builder），尤其是在只有一两个配方 builder 时。此处的抽象旨在说明 builder 的哪些部分依赖配方、哪些部分不依赖。
:::

[clientrecipes]: index.md#client-side-recipes
[codec]: ../../../datastorage/codecs.md
[datagen]: #数据生成
[event]: ../../../concepts/events.md
[gui]: ../../../rendering/screens.md
[ingredients]: ingredients.md
[networking]: ../../../networking/payload.md
[recipedatagen]: index.md#数据生成
[registry]: ../../../concepts/registries.md#methods-for-registering
[serializer]: #the-recipe-serializer
[streamcodec]: ../../../networking/streamcodecs.md
