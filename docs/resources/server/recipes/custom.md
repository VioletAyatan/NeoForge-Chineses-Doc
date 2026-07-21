# 自定义配方

添加自定义配方至少需要三项内容：`Recipe`、`RecipeType` 和 `RecipeSerializer`。根据所实现的功能，如果无法复用现有子类，可能还需要自定义 `RecipeInput`、`RecipeDisplay`、`SlotDisplay`、`RecipeBookCategory` 与 `RecipePropertySet`。

为便于演示并突出多项功能，我们将实现一种由配方驱动的机制：玩家需要用特定 Item 右键点击世界中的 `BlockState`，破坏该 `BlockState` 并掉落结果 Item。

## 配方输入

首先定义要放入配方的内容。必须理解，配方输入表示玩家当前实际使用的输入。因此，这里不使用标签或 Ingredient，而使用当前可用的实际 ItemStack 与 BlockState。

```java
// Our inputs are a BlockState and an ItemStack.
public record RightClickBlockInput(BlockState state, ItemStack stack) implements RecipeInput {
    // Method to get an item from a specific slot. We have one stack and no concept of slots, so we just assume
    // that slot 0 holds our item, and throw on any other slot. (Taken from SingleRecipeInput#getItem.)
    @Override
    public ItemStack getItem(int slot) {
        if (slot != 0) throw new IllegalArgumentException("No item for index " + slot);
        return this.stack();
    }

    // The slot size our input requires. Again, we don't really have a concept of slots, so we just return 1
    // because we have one item stack involved. Inputs with multiple items should return the actual count here.
    @Override
    public int size() {
        return 1;
    }
}
```

配方输入按需创建，因此无需以任何方式注册或序列化。并非总要创建自定义输入；原版输入（`CraftingInput`、`SingleRecipeInput` 和 `SmithingRecipeInput`）足以满足许多用例。

## Recipe 类

有了输入之后，接下来处理配方本身。它保存配方数据，同时负责匹配并返回配方结果，因此通常是自定义配方中最长的类。

```java
// The generic parameter for Recipe<T> is our RightClickBlockInput from above.
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // An in-code representation of our recipe data. This can be basically anything you want.
    // Common things to have here is a processing time integer of some kind, or an experience reward.
    // Note that we now use an ingredient instead of an item stack for the input.
    private final Recipe.CommonInfo commonInfo;
    private final RightClickBlockRecipe.BlockBookInfo bookInfo;
    private final BlockState inputState;
    private final Ingredient inputItem;
    private final ItemStackTemplate result;

    // Add a constructor that sets all properties. 
    public RightClickBlockRecipe(Recipe.CommonInfo commonInfo, RightClickBlockRecipe.BlockBookInfo bookInfo, BlockState inputState, Ingredient inputItem, ItemStackTemplate result) {
        this.commonInfo = commonInfo;
        this.bookInfo = bookInfo;
        this.inputState = inputState;
        this.inputItem = inputItem;
        this.result = result;
    }

    // Check whether the given input matches this recipe. The first parameter matches the generic.
    // We check our blockstate and our item stack, and only return true if both match.
    // If we needed to check the dimensions of our input, we would also do so here.
    @Override
    public boolean matches(RightClickBlockInput input, Level level) {
        return this.inputState == input.state() && this.inputItem.test(input.stack());
    }

    // Return the result of the recipe here, based on the given input. The parameter matches the generic.
    // This can be created using `ItemStackTemplate#create`.
    @Override
    public ItemStack assemble(RightClickBlockInput input) {
        return this.result.create();
    }

    // When true, will prevent the recipe from being synced within the recipe book or awarded on use/unlock.
    // This should only be true if the recipe shouldn't appear in a recipe book, such as map extending.
    // Although this recipe takes in an input state, it could still be used in a custom recipe book using
    //   the methods below.
    @Override
    public boolean isSpecial() {
        return true;
    }

    // This example outlines the most important methods. There is a number of other methods to override.
    // Some methods will be explained in the below sections as they cannot be easily compressed and understood here.
    // Check the class definition of Recipe to view them all.
}
```

### 通用信息

所有配方都有从 JSON 解析的通用信息，尽管具体实现方式可能不同。原版为所有配方提供 `Recipe.CommonInfo`。目前，它允许配方指定解锁时是否显示通知弹窗。`CommonInfo` 还提供[映射 codec][codec] 与[流 codec][streamcodec]，用于与下文的 [`RecipeSerializer`][serializer] 集成。

因此，可以用 `CommonInfo` 指定 `Recipe` 上的一些方法：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    
    private final Recipe.CommonInfo commonInfo;
    // Other fields

    public RightClickBlockRecipe(Recipe.CommonInfo commonInfo, ...) {
        this.commonInfo = commonInfo;
        // Other initializations
    }

    @Override
    public boolean showNotification() {
        return this.commonInfo.showNotification();
    }

    // Other methods
}
```

:::note
不强制使用 `CommonInfo` record，甚至不必在 JSON 中提供 `show_notification` 字段。是否适合使用由 mod 开发者决定。
:::

## 配方书信息

与通用信息类似，JSON 中还会解析与配方书有关的字段。配方书是一种在转换菜单（例如工作台、熔炉等）中显示配方的 [GUI][gui]。针对这些字段，原版提供 `Recipe.BookInfo<CategoryType>` 接口，其中 `CategoryType` 表示配方分类（前提是可序列化），或表示可转换为该分类的中间可序列化对象。与 `CommonInfo` 一样，它提供[映射 codec][codec] 与[流 codec][streamcodec]，用于与下文的 [`RecipeSerializer`][serializer] 集成。

例如：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    
    private final RightClickBlockRecipe.BlockBookInfo bookInfo;
    // Other fields

    public RightClickBlockRecipe(RightClickBlockRecipe.BlockBookInfo bookInfo, ...) {
        this.bookInfo = bookInfo;
        // Other initializations
    }

    @Override
    public String group() {
        return this.bookInfo.group();
    }

    @Override
    public RecipeBookCategory recipeBookCategory() {
        // Convert the serializable entry to its recipe book category.
        return switch (this.bookInfo.category()) {
            case BUILDING -> RecipeBookCategories.CRAFTING_BUILDING_BLOCKS;
            case EQUIPMENT -> RecipeBookCategories.CRAFTING_EQUIPMENT;
            case REDSTONE -> RecipeBookCategories.CRAFTING_REDSTONE;
            case MISC -> RecipeBookCategories.CRAFTING_MISC;
        };
    }

    // Other methods

    public record BlockBookInfo(CraftingBookCategory category, String group) implements Recipe.BookInfo<CraftingBookCategory> {
        public static final MapCodec<BlockBookInfo> MAP_CODEC = Recipe.BookInfo.mapCodec(
            // Takes in the codec for the generic, the default generic value, and the
            // constructor of `(category, group) -> bookInfo`.
            CraftingBookCategory.CODEC, CraftingBookCategory.MISC, BlockBookInfo::new
        );
        public static final StreamCodec<RegistryFriendlyByteBuf, BlockBookInfo> STREAM_CODEC = Recipe.BookInfo.streamCodec(
            // Takes in the stream codec for the generic and the constructor of
            // `(category, group) -> bookInfo`.
            CraftingBookCategory.STREAM_CODEC, BlockBookInfo::new
        );
    }
}
```

:::note
与 `CommonInfo` 一样，不强制使用 `BookInfo`，甚至不必在 JSON 中提供相关字段。mod 开发者应自行判断其配方是否适合使用（例如，`Recipe#isSpecial` 返回 true 的配方不会出现在配方书中，因此不应使用 `BookInfo`）。不过，`Recipe#group` 与 `recipeBookCategory` 都必须是非 null 对象。
:::

### 配方分组

分组充当键，用于把多个配方合并成配方书中的单个条目。如果分组设为空字符串，则会被视作独立的唯一条目。

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // other stuff here

    @Override
    public String group() {
        return this.bookInfo.group();
    }
}
```

### 配方书分类

`RecipeBookCategory` 只负责定义配方在配方书中显示于哪个分组。例如，铁镐合成配方会显示在 `RecipeBookCategories#CRAFTING_EQUIPMENT`，熟鳕鱼配方则显示在 `#FURNANCE_FOOD` 或 `#SMOKER_FOOD`。每个配方都关联一个 `RecipeBookCategory`。原版分类可在 `RecipeBookCategories` 中找到。

:::note
熟鳕鱼有两个配方，一个用于熔炉，另一个用于烟熏炉；二者具有不同的配方书分类。
:::

如果配方不适合任何现有分类（通常是因为它不使用现有工作站，如工作台或熔炉），可以创建新的 `RecipeBookCategory`。每个 `RecipeBookCategory` 都必须[注册][registry]到 `BuiltInRegistries#RECIPE_BOOK_CATEGORY`：

```java
/// For some DeferredRegister<RecipeBookCategory> RECIPE_BOOK_CATEGORIES
public static final Supplier<RecipeBookCategory> RIGHT_CLICK_BLOCK_CATEGORY = RECIPE_BOOK_CATEGORIES.register(
    "right_click_block", RecipeBookCategory::new
);
```

随后，为了设置分类，可以重写 `#recipeBookCategory`，直接返回自定义分类，或使用配方书信息（若已实现）映射到自定义分类：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // other stuff here

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

NeoForge 允许用户在 mod 事件总线上通过 `RegisterRecipeBookSearchCategoriesEvent#register`，将自己的 `ExtendedRecipeBookCategory` 指定为搜索分类。`register` 接收代表搜索分类的 `ExtendedRecipeBookCategory`，以及组成该搜索分类的各个 `RecipeBookCategory`。作为搜索分类的 `ExtendedRecipeBookCategory` 无需注册到任何原版静态 Registry。

```java
// In some location
public static final ExtendedRecipeBookCategory RIGHT_CLICK_BLOCK_SEARCH_CATEGORY = new ExtendedRecipeBookCategory() {};

@SubscribeEvent // on the mod event bus
public static void registerSearchCategories(RegisterRecipeBookSearchCategoriesEvent event) {
    event.register(
        // The search category
        RIGHT_CLICK_BLOCK_SEARCH_CATEGORY,
        // All recipe categories within the search category as varargs
        RecipeBookCategories.CRAFTING_BUILDING_BLOCKS,
        RecipeBookCategories.CRAFTING_EQUIPMENT,
        RecipeBookCategories.CRAFTING_REDSTONE,
        RIGHT_CLICK_BLOCK_CATEGORY.get()
    )
}
```

## 放置信息

`PlacementInfo` 用于定义配方使用者采用的合成要求，以及内容能否、应如何放入关联工作站（例如工作台、熔炉）。`PlacementInfo` 只面向 Item Ingredient；如果需要其他类型的 Ingredient（如流体、Block），则必须从头实现外围逻辑。在这些情况下，可以通过 `PlacementInfo#NOT_PLACEABLE` 将配方标记为不可放置。不过，如果配方中至少包含一个类似 Item 的对象，就应创建 `PlacementInfo`。

可以通过 `create` 创建 `PlacementInfo`，它接收一个或一组 Ingredient；也可通过 `createFromOptionals` 创建，它接收可选 Ingredient 列表。如果配方包含空槽位的表示形式，应使用 `createFromOptionals`，并为每个空槽位提供空 Optional：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // other stuff here
    private PlacementInfo info;

    @Override
    public PlacementInfo placementInfo() {
        // This delegate is in case the ingredient is not fully populated at this point in time
        // Tags and recipes are loaded at the same time, which is why this might be the case.
        if (this.info == null) {
            // Use optional ingredient as the block state may have an item representation
            List<Optional<Ingredient>> ingredients = new ArrayList<>();
            Item stateItem = this.inputState.getBlock().asItem();
            ingredients.add(stateItem != Items.AIR ? Optional.of(Ingredient.of(stateItem)): Optional.empty());
            ingredients.add(Optional.of(this.inputItem));

            // Create placement info
            this.info = PlacementInfo.createFromOptionals(ingredients);
        }

        return this.info;
    }
}
```

## 槽位显示

`SlotDisplay` 表示由配方使用者（如配方书）查看时，各槽位应渲染何种内容。`SlotDisplay` 有两个方法。其一是 `resolve`：它接收包含可用 Registry 与燃料值的 `ContextMap`（如 `SlotDisplayContext` 所示），以及当前 `DisplayContentsFactory`；后者接收该槽位要显示的内容，并返回转换后的内容列表供输出使用。其二是 `type`，其中保存用于编码/解码显示内容的 [`MapCodec`][codec] 与 [`StreamCodec`][streamcodec]。

`SlotDisplay` 通常通过 [`Ingredient` 的 `#display` 实现；对于 mod Ingredient，则通过 `ICustomIngredient#display` 实现][ingredients]。不过，有些输入可能不是 Ingredient，此时需要使用现有 `SlotDisplay` 或创建新的 `SlotDisplay`。

原版与 NeoForge 提供以下可用槽位显示：

- `SlotDisplay.Empty`：表示无内容的槽位。
- `SlotDisplay.ItemSlotDisplay`：表示 Item 的槽位。
- `SlotDisplay.ItemStackSlotDisplay`：表示 ItemStack 模板的槽位。
- `SlotDisplay.TagSlotDisplay`：表示 Item 标签的槽位。
- `SlotDisplay.OnlyWithComponent`：对其他显示进行筛选，只保留具有给定数据组件的 Item。
- `SlotDisplay.WithAnyPotion`：表示具有随机 `DataComponents#POTION_CONTENTS` 值的输入。
- `SlotDisplay.WithRemainder`：表示具有某种合成剩余物的输入。
- `SlotDisplay.AnyFuel`：表示所有燃料 Item 的槽位。
- `SlotDisplay.Composite`：表示多个其他槽位显示组合的槽位。
- `SlotDisplay.DyedSlotDemo`：表示将染料应用到目标并设置 `DataComponents#DYED_COLOR` 的槽位。
- `SlotDisplay.SmithingTrimDemoSlotDisplay`：表示使用给定材料将随机锻造纹饰应用到基础对象的槽位。
- `FluidSlotDisplay`：表示流体的槽位。
- `FluidStackSlotDisplay`：表示 FluidStack 的槽位。
- `FluidTagSlotDisplay`：表示流体标签的槽位。

我们的配方有三个“槽位”：`BlockState` 输入、`Ingredient` 输入和 `ItemStack` 结果。`Ingredient` 输入已经关联 `SlotDisplay`，`ItemStack` 可由 `SlotDisplay.ItemStackSlotDisplay` 表示。另一方面，`BlockState` 需要自定义 `SlotDisplay` 与 `DisplayContentsFactory`，因为现有实现只接收 ItemStack，而本示例会以不同方式处理 BlockState。

先看 `DisplayContentsFactory`，它用于将某种类型转换为所需的内容显示类型。可用工厂包括：

- `DisplayContentsFactory.ForStacks`：接收 `ItemStack` 的转换器。
- `DisplayContentsFactory.ForRemainders`：接收输入对象与剩余对象列表的转换器。
- `ForFluidStacks`：接收 `FluidStack` 的转换器。

据此，可以实现 `DisplayContentsFactory`，将提供的对象转换为所需输出。例如，`SlotDisplay.ItemStackContentsFactory` 接收 `ForStacks` 转换器，并把各 Stack 转换成 `ItemStack`。

对于 `BlockState`，创建一个接收该 State 的工厂，并提供直接输出 State 本身的基础实现。

```java
// A basic transformer for block states
public interface ForBlockStates<T> extends DisplayContentsFactory<T> {

    // Delegate methods
    default forState(Holder<Block> block) {
        return this.forState(block.value());
    }

    default forState(Block block) {
        return this.forState(block.defaultBlockState());
    }

    // The block state to take in and transform to the desired output
    T forState(BlockState state);
}

// An implementation for a block state output
public class BlockStateContentsFactory implements ForBlockStates<BlockState> {
    // Singleton instance
    public static final BlockStateContentsFactory INSTANCE = new BlockStateContentsFactory();

    private BlockStateContentsFactory() {}

    @Override
    public BlockState forState(BlockState state) {
        return state;
    }
}

// An implementation for an item stack output
public class BlockStateStackContentsFactory implements ForBlockStates<ItemStack> {
    // Singleton instance
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
// A simple slot display
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
            // Check for our contents factory and transform if necessary
            case ForBlockStates<T> states -> Stream.of(states.forState(this.state));
            // If you want the contents to be handled differently depending on contents display
            //   then you can case on other displays like so
            case ForStacks<T> stacks -> Stream.of(stacks.forStack(state.getBlock().asItem()));
            // If no factories match, then do not return anything in the transformed stream
            default -> Stream.empty();
        }
    }

    @Override
    public SlotDisplay.Type<? extends SlotDisplay> type() {
        // Return the registered type from below
        return BLOCK_STATE_SLOT_DISPLAY.get();
    }
}

// In some registrar class
/// For some DeferredRegister<SlotDisplay.Type<?>> SLOT_DISPLAY_TYPES
public static final Supplier<SlotDisplay.Type<BlockStateSlotDisplay>> BLOCK_STATE_SLOT_DISPLAY = SLOT_DISPLAY_TYPES.register(
    "block_state",
    () -> new SlotDisplay.Type<>(BlockStateSlotDisplay.CODEC, BlockStateSlotDisplay.STREAM_CODEC)
);
```

## 配方显示

`RecipeDisplay` 与 `SlotDisplay` 相似，但它表示完整配方。默认接口只跟踪配方的 `result` 和 `craftingStation`，后者表示应用配方的工作台。`RecipeDisplay` 也有一个 `type`，其中保存用于编码/解码显示内容的 [`MapCodec`][codec] 与 [`StreamCodec`][streamcodec]。然而，现有 `RecipeDisplay` 子类型都不包含在客户端正确渲染本配方所需的全部信息，因此需要创建自己的 `RecipeDisplay`。

所有槽位与 Ingredient 都应表示为 `SlotDisplay`。网格大小等限制可以由用户选择任意方式提供。

```java
// A simple recipe display
public record RightClickBlockRecipeDisplay(
    SlotDisplay inputState,
    SlotDisplay inputItem,
    SlotDisplay result, // Implements RecipeDisplay#result
    SlotDisplay craftingStation // Implements RecipeDisplay#craftingStation
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
        // Return the registered type from below
        return RIGHT_CLICK_BLOCK_RECIPE_DISPLAY.get();
    }
}

// In some registrar class
/// For some DeferredRegister<RecipeDisplay.Type<?>> RECIPE_DISPLAY_TYPES
public static final Supplier<RecipeDisplay.Type<RightClickBlockRecipeDisplay>> RIGHT_CLICK_BLOCK_RECIPE_DISPLAY = RECIPE_DISPLAY_TYPES.register(
    "right_click_block",
    () -> new RecipeDisplay.Type<>(RightClickBlockRecipeDisplay.CODEC, RightClickBlockRecipeDisplay.STREAM_CODEC)
);
```

随后可通过重写 `#display` 为配方创建配方显示：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // other stuff here

    @Override
    public List<RecipeDisplay> display() {
        // You can have many different displays for the same recipe
        // But this example will only use one like the other recipes.
        return List.of(
            // Add our recipe display with the specified slots
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

接下来是配方类型。这相当直接，因为配方类型除名称外不关联其他数据。它是配方系统中两个需要[注册][registry]的部分之一，因此与其他 Registry 一样，创建 `DeferredRegister` 并向其中注册：

```java
public static final DeferredRegister<RecipeType<?>> RECIPE_TYPES =
        DeferredRegister.create(Registries.RECIPE_TYPE, ExampleMod.MOD_ID);

public static final Supplier<RecipeType<RightClickBlockRecipe>> RIGHT_CLICK_BLOCK_TYPE =
        RECIPE_TYPES.register(
                "right_click_block",
                // Creates the recipe type, setting `toString` to the registry name of the type
                RecipeType::simple
        );
```

注册配方类型后，必须在配方中重写 `#getType`：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    // other stuff here

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
    // other stuff here

    @Override
    public RecipeSerializer<? extends Recipe<RightClickBlockInput>> getSerializer() {
        return RIGHT_CLICK_BLOCK.get();
    }
}
```

## 合成机制

现在配方的所有部分都已完成，可以制作配方 JSON（参阅[数据生成][datagen]一节），再像上面那样从配方管理器查询配方。随后如何使用配方由你决定。常见用例是能够处理配方的机器，并将当前配方存储为字段。

不过在本例中，我们要在用 Item 右键点击 Block 时应用配方。为此将使用[事件处理器][event]。请记住，这只是示例实现，可以任意修改（只要在服务器上运行）。由于交互状态需要在客户端与服务器保持一致，还必须[通过网络同步所有相关输入状态][networking]。

可以建立一个简单的网络实现来同步配方输入：

```java
// A basic packet class, must be registered.
public record ClientboundRightClickBlockRecipesPayload(
    Set<BlockState> inputStates, Set<Holder<Item>> inputItems
) implements CustomPacketPayload {

    // ...
}

// Packet stores data in an instance class.
// Present on both server and client to do initial matching.
public interface RightClickBlockRecipeInputs {

    Set<BlockState> inputStates();
    Set<Holder<Item>> inputItems();

    default boolean test(BlockState state, ItemStack stack) {
        return this.inputStates().contains(state) && this.inputItems().contains(stack.getItemHolder());
    }
}

// Server resource listener so it can be reloaded when recipes are.
public class ServerRightClickBlockRecipeInputs implements ResourceManagerReloadListener, RightClickBlockRecipeInputs {

    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "block_recipe_inputs");

    private final RecipeManager recipeManager;

    private Set<BlockState> inputStates;
    private Set<Holder<Item>> inputItems;

    public RightClickBlockRecipeInputs(RecipeManager recipeManager) {
        this.recipeManager = recipeManager;
    }

    // Set inputs here as #apply is fired synchronously based on listener registration order.
    // Recipes are always applied first.
    @Override
    public void onResourceManagerReload(ResourceManager manager) {
        MinecraftServer server = ServerLifecycleHooks.getCurrentServer();
        if (server == null) return; // Should never be null

        // Populate inputs
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

// Client implementation to hold the inputs.
public record ClientRightClickBlockRecipeInputs(
    Set<BlockState> inputStates, Set<Holder<Item>> inputItems
) implements RightClickBlockRecipeInputs {

    public ClientRightClickBlockRecipeInputs(Set<BlockState> inputStates, Set<Holder<Item>> inputItems) {
        this.inputStates = Set.copyOf(inputStates);
        this.inputItems = Set.copyOf(inputItems);
    }
}

// Handling the recipe instance depending on side.
public class ServerRightClickBlockRecipes {

    private static ServerRightClickBlockRecipeInputs inputs;

    public static RightClickBlockRecipeInputs inputs() {
        return ServerRightClickBlockRecipes.inputs;
    }

    @SubscribeEvent // on the game event bus
    public static void addListener(AddServerReloadListenersEvent event) {
        // Register server reload listener
        ServerRightClickBlockRecipes.inputs = new ServerRightClickBlockRecipeInputs(
            event.getServerResources().getRecipeManager()
        );
        event.addListener(ServerRightClickBlockRecipeInputs.ID, ServerRightClickBlockRecipes.inputs);
        // Make sure it runs after recipes
        event.addDependency(VanillaServerListeners.RECIPES, ServerRightClickBlockRecipeInputs.ID);
    }

    @SubscribeEvent // on the game event bus
    public static void datapackSync(OnDatapackSyncEvent event) {
        // Send to client
        ServerRightClickBlockRecipes.inputs.syncToClient(event.getRelevantPlayers());
    }
}

public class ClientRightClickBlockRecipes {

    private static ClientRightClickBlockRecipeInputs inputs;

    public static RightClickBlockRecipeInputs inputs() {
        return ClientRightClickBlockRecipes.inputs;
    }

    // Handling the sent packet
    public static void handle(final ClientboundRightClickBlockRecipesPayload data, final IPayloadContext context) {
        // Do something with the data, on the main thread
        ClientRightClickBlockRecipes.inputs = new ClientRightClickBlockRecipeInputs(
            data.inputStates(), data.inputItems()
        );
    }

    @SubscribeEvent // on the game event bus only on the physical client
    public static void clientLogOut(ClientPlayerNetworkEvent.LoggingOut event) {
        // Clear the stored inputs on world log out
        ClientRightClickBlockRecipes.inputs = null;
    }
}

public class RightClickBlockRecipes {
    // Make proxy method to access properly
    public static RightClickBlockRecipeInputs inputs(Level level) {
        return level.isClientSide()
            ? ClientRightClickBlockRecipes.inputs()
            : ServerRightClickBlockRecipes.inputs();
    }
}
```

或者，也可以改为将[完整配方同步到客户端][clientrecipes]：

```java
// Present on both server and client to do initial matching.
public interface RightClickBlockRecipeInputs {

    Set<BlockState> inputStates();
    Set<Holder<Item>> inputItems();

    default boolean test(BlockState state, ItemStack stack) {
        return this.inputStates().contains(state) && this.inputItems().contains(stack.getItemHolder());
    }
}

// Server resource listener so it can be reloaded when recipes are.
public class ServerRightClickBlockRecipeInputs implements ResourceManagerReloadListener, RightClickBlockRecipeInputs {

    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "block_recipe_inputs");

    private final RecipeManager recipeManager;

    private Set<BlockState> inputStates;
    private Set<Holder<Item>> inputItems;

    public RightClickBlockRecipeInputs(RecipeManager recipeManager) {
        this.recipeManager = recipeManager;
    }

    // Set inputs here as #apply is fired synchronously based on listener registration order.
    // Recipes are always applied first.
    @Override
    public void onResourceManagerReload(ResourceManager manager) {
        MinecraftServer server = ServerLifecycleHooks.getCurrentServer();
        if (server != null) { // Should never be null
            // Populate inputs
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

// Client implementation to hold the inputs.
public record ClientRightClickBlockRecipeInputs(
    Set<BlockState> inputStates, Set<Holder<Item>> inputItems
) implements RightClickBlockRecipeInputs {

    public ClientRightClickBlockRecipeInputs(Set<BlockState> inputStates, Set<Holder<Item>> inputItems) {
        this.inputStates = Set.copyOf(inputStates);
        this.inputItems = Set.copyOf(inputItems);
    }
}

// Handling the recipe instance depending on side.
public class ServerRightClickBlockRecipes {

    private static ServerRightClickBlockRecipeInputs inputs;

    public static RightClickBlockRecipeInputs inputs() {
        return ServerRightClickBlockRecipes.inputs;
    }

    @SubscribeEvent // on the game event bus
    public static void addListener(AddServerReloadListenersEvent event) {
        // Register server reload listener
        ServerRightClickBlockRecipes.inputs = new ServerRightClickBlockRecipeInputs(
            event.getServerResources().getRecipeManager()
        );
        event.addListener(ServerRightClickBlockRecipeInputs.ID, ServerRightClickBlockRecipes.inputs);
        // Make sure it runs after recipes
        event.addDependency(VanillaServerListeners.RECIPES, ServerRightClickBlockRecipeInputs.ID);
    }

    @SubscribeEvent // on the game event bus
    public static void datapackSync(OnDatapackSyncEvent event) {
        // Specify what recipe types to sync to the client
        event.sendRecipes(RIGHT_CLICK_BLOCK_TYPE.get());
    }
}

public class ClientRightClickBlockRecipes {

    private static ClientRightClickBlockRecipeInputs inputs;

    public static RightClickBlockRecipeInputs inputs() {
        return ClientRightClickBlockRecipes.inputs;
    }

    @SubscribeEvent // on the game event bus only on the physical client
    public static void recipesReceived(RecipesReceivedEvent event) {
        // Store the recipes
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

    @SubscribeEvent // on the game event bus only on the physical client
    public static void clientLogOut(ClientPlayerNetworkEvent.LoggingOut event) {
        // Clear the stored inputs on world log out
        ClientRightClickBlockRecipes.inputs = null;
    }
}

public class RightClickBlockRecipes {
    // Make proxy method to access properly
    public static RightClickBlockRecipeInputs inputs(Level level) {
        return level.isClientSide()
            ? ClientRightClickBlockRecipes.inputs()
            : ServerRightClickBlockRecipes.inputs();
    }
}
```

随后使用已同步输入，检查游戏中实际使用的输入：

```java
@SubscribeEvent // on the game event bus
public static void useItemOnBlock(UseItemOnBlockEvent event) {
    // Skip if we are not in the block-dictated phase of the event. See the event's javadocs for details.
    if (event.getUsePhase() != UseItemOnBlockEvent.UsePhase.BLOCK) return;
    // Get parameters to check input first
    Level level = event.getLevel();
    BlockPos pos = event.getPos();
    BlockState blockState = level.getBlockState(pos);
    ItemStack itemStack = event.getItemStack();

    // Check if the input can result in a recipe on both sides
    if (!RightClickBlockRecipes.inputs(level).test(blockState, itemStack)) return;

    // If so, make sure on server before checking recipe
    if (!level.isClientSide() && level instanceof ServerLevel serverLevel) {
        // Create an input and query the recipe.
        RightClickBlockInput input = new RightClickBlockInput(blockState, itemStack);
        Optional<RecipeHolder<? extends Recipe<CraftingInput>>> optional = serverLevel.recipeAccess().getRecipeFor(
            // The recipe type.
            RIGHT_CLICK_BLOCK_TYPE.get(),
            input,
            level
        );
        ItemStack result = optional
            .map(RecipeHolder::value)
            .map(e -> e.assemble(input))
            .orElse(ItemStack.EMPTY);
        
        // If there is a result, break the block and drop the result in the world.
        if (!result.isEmpty()) {
            level.removeBlock(pos, false);
            ItemEntity entity = new ItemEntity(level,
                    // Center of pos.
                    pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5,
                    result);
            level.addFreshEntity(entity);
        }
    }

    // Cancel the event to stop the interaction pipeline regardless of side.
    // Already made sure that there could be a result.
    event.cancelWithResult(InteractionResult.SUCCESS_SERVER);
}
```

## 数据生成

要为自定义配方序列化器创建配方 builder，需要实现 `RecipeBuilder` 及其方法。一个部分复制自原版的常见实现如下：

```java
// This class is abstract because there is a lot of per-recipe-serializer logic.
// It serves the purpose of showing the common part of all (vanilla) recipe builders.
public abstract class SimpleRecipeBuilder implements RecipeBuilder {
    // Make the fields protected so our subclasses can use them.
    protected final ItemStackTemplate result;
    protected String group = "";
    protected boolean showNotification = true;

    // Provides a common way to build the recipe unlock advancement.
    // If used, the builder must also specify a `RecipeCategory` to determine
    // the output folder.
    protected final RecipeUnlockAdvancementBuilder advancementBuilder;
    protected final RecipeCategory category;

    // It is common for constructors to accept the result item stack template.
    // Alternatively, static builder methods are also possible.
    public SimpleRecipeBuilder(ItemStackTemplate result, RecipeCategory category) {
        this.result = result;
        this.category = category;
        this.advancementBuilder = new RecipeUnlockAdvancementBuilder();
    }

    // This method adds a criterion for the recipe advancement.
    @Override
    public SimpleRecipeBuilder unlockedBy(String name, Criterion<?> criterion) {
        this.criteria.put(name, criterion);
        return this;
    }

    // This method adds a recipe book group. If you do not want to use recipe book groups,
    // remove the this.group field and make this method no-op (i.e. return this).
    @Override
    public SimpleRecipeBuilder group(@Nullable String group) {
        this.group = Objects.requireNonNullElse(group, "");
        return this;
    }

    // This method sets whether to show the notification toast when unlocking. If you want
    // this value to be hardcoded, remove the this.showNotification field and this method.
    public SimpleRecipeBuilder showNotification(boolean showNotification) {
        this.showNotification = showNotification;
        return this;
    }

    // Returns the id of the recipe when using `#save(RecipeOutput)`.
    @Override
    public ResourceKey<Recipe<?>> defaultId() {
        // If the result is not an `ItemStackTemplate`, you will need to manually
        // construct the `ResourceKey` using the result.
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

    // Since we have exactly one of each input, we pass them to the constructor.
    // Builders for recipe serializers that have ingredient lists of some sort would usually
    // initialize an empty list and have #addIngredient or similar methods instead.
    public RightClickBlockRecipeBuilder(ItemStackTemplate result, RecipeCategory category, BlockState inputState, Ingredient inputItem) {
        super(result, category);
        this.inputState = inputState;
        this.inputItem = inputItem;
    }

    // Saves a recipe using the given RecipeOutput and key. This method is defined in the RecipeBuilder interface.
    @Override
    public void save(RecipeOutput output, ResourceKey<Recipe<?>> key) {
        // Create the recipe.
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

        // Pass the id, recipe, and the recipe advancement into the RecipeOutput.
        output.accept(key, recipe, this.advancementBuilder.build(output, key, this.category));
    }
}
```

现在，在[数据生成][recipedatagen]期间，可以像使用其他 builder 一样调用自定义配方 builder：

```java
@Override
protected void buildRecipes(RecipeOutput output) {
    new RightClickRecipeBuilder(
            // Our constructor parameters. This example adds the ever-popular dirt -> diamond conversion.
            new ItemStackTemplate(Items.DIAMOND),
            RecipeCategory.MISC,
            Blocks.DIRT.defaultBlockState(),
            Ingredient.of(Items.APPLE)
    )
            .unlockedBy("has_apple", this.has(Items.APPLE))
            .save(output);
    // other recipe builders here
}
```

:::note
也可以将 `SimpleRecipeBuilder` 合并进 `RightClickBlockRecipeBuilder`（或自己的配方 builder），尤其是在只有一两个配方 builder 时。此处的抽象旨在说明 builder 的哪些部分依赖配方、哪些部分不依赖。
:::

[clientrecipes]: index.md#client-side-recipes
[codec]: ../../../datastorage/codecs.md
[datagen]: #data-generation
[event]: ../../../concepts/events.md
[gui]: ../../../rendering/screens.md
[ingredients]: ingredients.md
[networking]: ../../../networking/payload.md
[recipedatagen]: index.md#data-generation
[registry]: ../../../concepts/registries.md#methods-for-registering
[serializer]: #the-recipe-serializer
[streamcodec]: ../../../networking/streamcodecs.md
