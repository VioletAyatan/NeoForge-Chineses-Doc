# 方块（Block）

方块（Block）是 Minecraft 世界的重要组成部分。它们构成了所有地形、结构和机器。如果你有兴趣制作 Mod，那么你很可能会想添加一些方块。本页面将引导你创建方块，并介绍你可以使用它们完成的一些事情。

## 一个方块统御一切

在开始之前，需要理解一点：游戏中的每种方块始终都只有一个实例。一个世界由位于不同位置、指向同一个方块的数千个引用组成。换句话说，同一个方块只是被显示了很多次。

因此，一个方块只应该被实例化一次，并且应在[注册][registration]期间完成。方块注册后，你就可以根据需要使用已注册的引用。

与大多数其他注册表不同，方块可以使用一种特殊版本的 `DeferredRegister`，称为 `DeferredRegister.Blocks`。`DeferredRegister.Blocks` 的作用基本类似于 `DeferredRegister<Block>`，但有一些细微差别：

- 它通过 `DeferredRegister.createBlocks("yourmodid")` 创建，而不是常规的 `DeferredRegister.create(...)` 方法。
- `#register` 返回一个 `DeferredBlock<T extends Block>`，它继承自 `DeferredHolder<Block, T>`。`T` 是我们正在注册的方块类的类型。
- 它提供了一些用于注册方块的辅助方法。有关更多详细信息，请参见[下文][below]。

现在，让我们注册方块：

```java
//BLOCKS 是一个 DeferredRegister.Blocks
public static final DeferredBlock<Block> MY_BLOCK = BLOCKS.register("my_block", registryName -> new Block(...));
```

注册方块后，对新 `my_block` 的所有引用都应使用这个常量。例如，如果你想检查给定位置的方块是否为 `my_block`，代码大致如下：

```java
level.getBlockState(position) // 返回给定 Level（世界）中给定位置放置的 BlockState
    //highlight-next-line
    .is(MyBlockRegistrationClass.MY_BLOCK);
```

这种方式还有一个方便之处：可以使用 `block1 == block2`，而不必使用 Java 的 `equals` 方法（当然，使用 `equals` 仍然有效，但没有意义，因为它本来就是按引用比较的）。

:::danger
不要在注册之外调用 `new Block()`！一旦这样做，事情就可能并且一定会出问题：

- 方块必须在注册表未冻结时创建。NeoForge 会为你解冻注册表，并在之后将其重新冻结，因此注册阶段就是创建方块的时间窗口。
- 如果你在注册表重新冻结后尝试创建和/或注册 Block，游戏会崩溃并报告一个 `null` Block，这可能非常令人困惑。
- 如果你仍然设法保留了一个悬空的方块实例，游戏在同步和保存时将无法识别它，并会将其替换为空气。

:::

## 创建方块

如前所述，我们首先创建 `DeferredRegister.Blocks`：

```java
public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("yourmodid");
```

### 基础方块

对于不需要特殊功能的简单方块（例如圆石、木板等），可以直接使用 `Block` 类。为此，在注册期间，使用一个 `BlockBehaviour.Properties` 参数实例化 `Block`。可以使用 `BlockBehaviour.Properties#of` 创建这个 `BlockBehaviour.Properties` 参数，并通过调用其方法进行自定义。其中最重要的方法包括：

- `setId` - 设置方块的 ResourceKey。
  - 每个方块都**必须**设置此项，否则将抛出异常。
- `destroyTime` - 决定破坏方块所需的时间。
  - 石头的破坏时间为 1.5，泥土为 0.5，黑曜石为 50，基岩为 -1（不可破坏）。
- `explosionResistance` - 决定方块的爆炸抗性。
  - 石头的爆炸抗性为 6.0，泥土为 0.5，黑曜石为 1,200，基岩为 3,600,000。
- `sound` - 设置敲击、破坏或放置方块时发出的声音。
  - 默认值为 `SoundType.STONE`。有关更多详细信息，请参见[声音页面][sounds]。
- `lightLevel` - 设置方块发出的亮度。接收一个带有 `BlockState` 参数的函数，该函数返回 0 到 15 之间的值。
  - 例如，萤石使用 `state -> 15`，火把使用 `state -> 14`。
- `friction` - 设置方块的摩擦力（光滑程度）。
  - 默认值为 0.6。冰使用 0.98。

例如，一个简单的实现大致如下：

```java
//BLOCKS 是一个 DeferredRegister.Blocks
public static final DeferredBlock<Block> MY_BETTER_BLOCK = BLOCKS.register(
    "my_better_block", 
    registryName -> new Block(BlockBehaviour.Properties.of()
        //highlight-start
        .setId(ResourceKey.create(Registries.BLOCK, registryName))
        .destroyTime(2.0f)
        .explosionResistance(10.0f)
        .sound(SoundType.GRAVEL)
        .lightLevel(state -> 7)
        //highlight-end
    ));
```

有关进一步说明，请查看 `BlockBehaviour.Properties` 的源代码。有关更多示例，或要查看 Minecraft 使用的值，请查看 `Blocks` 类。

:::info
需要理解，世界中的 `Block` 与物品栏中的 `Block` 并不是同一种东西。物品栏中看起来像 `Block` 的东西实际上是一个 `BlockItem`，它是一种特殊的 [`Item`][item]，使用时会放置一个方块。这也意味着创造模式菜单或最大堆叠数量等内容由相应的 `BlockItem` 处理。

`BlockItem` 必须与 `Block` 分开注册。这是因为 `Block` 不一定需要对应的 `Item`，例如它本来就不应该被收集（火就是一个例子）。
:::

### 更多功能

直接使用 `Block` 只能创建非常基础的方块。如果你想添加玩家交互或不同的碰撞箱等功能，则需要创建一个继承 `Block` 的自定义类。`Block` 类有许多可以被重写以实现不同功能的方法；有关更多信息，请参见 `Block`、`BlockBehaviour` 和 `IBlockExtension` 类。另请参见下方的[使用方块][usingblocks]一节，了解方块的一些最常见的使用场景。

如果你想创建具有不同变体的方块（例如具有下半、上半和双层变体的台阶），应使用[方块状态][blockstates]。最后，如果你想让方块存储额外数据（例如箱子存储其物品栏），应使用[方块实体][blockentities]。

经验法则是：如果状态数量有限且相对较少（最多几百种状态），使用 `BlockState`；如果状态数量无限或接近无限，则使用 `BlockEntity`。

#### `Block Type`

**方块类型（Block Type）**是用于序列化和反序列化方块对象的 [`MapCodec`][codec]。这个 `MapCodec` 通过 `BlockBehaviour#codec` 进行设置，并[注册][registration]到 `Block Type` 注册表中。

目前，它只在生成方块列表报告时使用。每个 `Block` 子类都应创建一个 `Block Type`。例如，`FlowerBlock#CODEC` 表示大多数花朵方块使用的 `Block Type`，而其子类 `WitherRoseBlock` 则拥有单独的 `Block Type`。

如果 `Block` 子类只接收 `BlockBehaviour.Properties`，则可以使用 `BlockBehaviour#simpleCodec` 创建 `MapCodec`。

```java
// 对于某个 Block 子类
public class SimpleBlock extends Block {
    public SimpleBlock(BlockBehavior.Properties properties) {
        // ...
    }

    @Override
    public MapCodec<SimpleBlock> codec() {
        return SIMPLE_CODEC.get();
    }
}

// 在某个注册类中
public static final DeferredRegister<MapCodec<? extends Block>> REGISTRAR = DeferredRegister.create(BuiltInRegistries.BLOCK_TYPE, "yourmodid");

public static final Supplier<MapCodec<SimpleBlock>> SIMPLE_CODEC = REGISTRAR.register(
    "simple",
    () -> BlockBehaviour.simpleCodec(SimpleBlock::new)
);
```

如果 `Block` 子类包含更多参数，则应使用 [`RecordCodecBuilder#mapCodec`][codec] 创建 `MapCodec`，并为 `BlockBehaviour.Properties` 参数传入 `BlockBehaviour#propertiesCodec`。

```java
// 对于某个 Block 子类
public class ComplexBlock extends Block {
    public ComplexBlock(int value, BlockBehavior.Properties properties) {
        // ...
    }

    @Override
    public MapCodec<ComplexBlock> codec() {
        return COMPLEX_CODEC.get();
    }

    public int getValue() {
        return this.value;
    }
}

// 在某个注册类中
public static final DeferredRegister<MapCodec<? extends Block>> REGISTRAR = DeferredRegister.create(BuiltInRegistries.BLOCK_TYPE, "yourmodid");

public static final Supplier<MapCodec<ComplexBlock>> COMPLEX_CODEC = REGISTRAR.register(
    "simple",
    () -> RecordCodecBuilder.mapCodec(instance ->
        instance.group(
            Codec.INT.fieldOf("value").forGetter(ComplexBlock::getValue),
            BlockBehaviour.propertiesCodec() // 表示 BlockBehavior.Properties 参数
        ).apply(instance, ComplexBlock::new)
    )
);
```

:::info
尽管 Block Type 目前基本没有被使用，但随着 Mojang 继续转向以 Codec 为中心的结构，预计它在未来会变得更加重要。
:::

### `DeferredRegister.Blocks` 辅助方法

我们已经在[上文][above]讨论了如何创建 `DeferredRegister.Blocks`，以及它会返回 `DeferredBlock`。现在，让我们看看这个专用的 `DeferredRegister` 还提供了哪些其他实用方法。先从 `#registerBlock` 开始：

```java
public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("yourmodid");

public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.register(
    "example_block", registryName -> new Block(
        BlockBehaviour.Properties.of()
            // 必须为方块设置 ID
            .setId(ResourceKey.create(Registries.BLOCK, registryName))
    )
);

// 与上面的写法相同，只是方块属性被单独提供。
// 内部也会在 properties 对象上调用 setId。
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerBlock(
    "example_block",
    Block::new, // properties 将被传入的工厂。
    () -> BlockBehaviour.Properties.of() // 要使用的 properties。
);

// 与上面的写法相同，只是传入并操作的是 `Properties#of`。
// 内部也会在 properties 对象上调用 setId。
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerBlock(
    "example_block",
    Block::new, // properties 将被传入的工厂。
    props -> props // 用于处理 properties 的一元运算符。
);
```

如果你想使用 `Block::new`，则可以完全省略工厂参数：

```java
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerSimpleBlock(
    "example_block",
    () -> BlockBehaviour.Properties.of() // 要使用的 properties。
);

public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerSimpleBlock(
    "example_block",
    props -> props // 用于处理 properties 的一元运算符。
);
```

这与前一个示例完全相同，只是稍短一些。当然，如果你想使用 `Block` 的子类而不是 `Block` 本身，则必须使用前一种方法。

### 资源

如果你注册了方块并将其放置在世界中，会发现它缺少纹理等内容。这是因为包括[纹理][textures]在内的内容由 Minecraft 的资源系统处理。在 Minecraft 中添加新方块时，应编写或[生成][datagen]以下文件：

- [BlockState 文件][bsfile]
- [方块模型][model]
- [翻译][i18n]
- [掉落表][loottable]
- 方块[Tag][tags]，例如用于挖掘的 Tag

对于以上所有内容，也可以参考类似原版方块的文件和数据生成器。

## 使用方块

方块很少被直接用于执行操作。事实上，在整个 Minecraft 中，可能最常见的两个操作——获取某个位置的方块，以及在某个位置放置方块 —— 使用的都是**方块状态（BlockState）**，而不是**方块（Block）**。通常的设计方式是让方块定义行为，但让行为实际通过方块状态执行。

因此，`BlockState` 经常作为参数传递给 `Block` 的方法。有关方块状态的使用方式，以及如何从方块获取方块状态，请参见[使用方块状态][usingblockstates]。

在一些情况下，`Block` 的多个方法会在不同时间使用。以下小节列出了最常见的方块相关调用流程。除非另有说明，否则所有方法都会在两个逻辑端调用，并且应在两端返回相同的结果。

### 放置方块

方块放置逻辑从 `BlockItem#useOn` 调用（或者从某个子类对该方法的实现调用，例如睡莲使用的 `PlaceOnWaterBlockItem`）。有关游戏如何进入此流程的更多信息，请参见[右键点击物品][rightclick]。实际上，这意味着一旦右键点击一个 `BlockItem`（例如圆石Item），就会调用此行为。

- 会检查多个前置条件，例如你不能处于旁观者模式、方块所需的所有 Feature Flag 都已启用，或者目标位置不在世界边界之外。如果其中至少一项检查失败，流程结束。
- 对尝试放置方块的位置当前存在的方块调用 `BlockBehaviour#canBeReplaced`。如果返回 `false`，流程结束。这里返回 `true` 的常见情况包括高草或雪层。
- 调用 `Block#getStateForPlacement`。这里可以根据上下文（其中包括位置、旋转方向以及方块被放置的面等信息）返回不同的方块状态。举个例子，这对于可以朝不同方向放置的方块很有用。
- 使用上一步得到的 `BlockState` 调用 `BlockBehaviour#canSurvive`。如果返回 `false`，流程结束。
- 通过调用 `Level#setBlock` 将 `BlockState` 设置到 `Level` 中。
  - 在该 `Level#setBlock` 调用中，会调用 `BlockBehaviour#onPlace`。
- 调用 `Block#setPlacedBy`。

### 破坏方块

破坏方块稍微复杂一些，因为它需要时间。该过程大致可分为三个阶段：“开始”、“挖掘”和“实际破坏”。

- 点击鼠标左键时，进入“开始”阶段。
- 现在需要按住鼠标左键，进入“挖掘”阶段。**此阶段的方法每 tick 都会被调用。**
- 如果“继续”阶段没有被中断（松开鼠标左键），并且方块被破坏，则进入“实际破坏”阶段。

对于喜欢伪代码的人来说，大概类似如下流程：

```java
leftClick();
initiatingStage();
while (leftClickIsBeingHeld()) {
    miningStage();
    if (blockIsBroken()) {
        actuallyBreakingStage();
        break;
    }
}
```

以下小节会进一步将这些阶段拆分为实际的方法调用。有关游戏如何从左键点击进入此流程的信息，请参见[左键点击 Item][leftclick]。

#### “开始”阶段

- 会检查多个前置条件，例如你不能处于旁观者模式、主手中 `ItemStack` 所需的所有 Feature Flag 都已启用，或者相关方块不在世界边界之外。如果其中至少一项检查失败，流程结束。
- 触发 `PlayerInteractEvent.LeftClickBlock`。如果事件被取消，流程结束。
  - 请注意，当事件在客户端被取消时，不会向服务端发送数据包，因此服务端不会运行任何逻辑。
  - 但是，在服务端取消此事件仍会导致客户端代码运行，这可能导致不同步！
- 调用 `BlockBehaviour#attack`。

#### “挖掘”阶段

- 触发 `PlayerInteractEvent.LeftClickBlock`。如果事件被取消，流程进入“结束”阶段。
  - 请注意，当事件在客户端被取消时，不会向服务端发送数据包，因此服务端不会运行任何逻辑。
  - 但是，在服务端取消此事件仍会导致客户端代码运行，这可能导致不同步！
- 调用 `BlockBehaviour#getDestroyProgress`，并将其结果添加到内部破坏进度计数器中。
  - `BlockBehaviour#getDestroyProgress` 返回一个 0 到 1 之间的 float 值，表示每个 tick 应将破坏进度计数器增加多少。
- 相应地更新进度覆盖层（裂纹纹理）。
- 如果破坏进度大于 1.0（即已完成，也就是应该破坏该 Block），则退出“挖掘”阶段并进入“实际破坏”阶段。

#### “实际破坏”阶段

- 调用 `Item#canDestroyBlock`。如果返回 `false`（表示不应破坏该方块），流程进入“结束”阶段。
- 如果方块是 `GameMasterBlock` 的实例，则调用 `Player#canUseGameMasterBlocks`。这决定玩家是否有能力破坏仅限创造模式的方块。如果为 `false`，流程进入“结束”阶段。
- 仅服务端：调用 `Player#blockActionRestricted`。这决定当前玩家是否不能破坏该方块。如果为 `true`，流程进入“结束”阶段。
- 仅服务端：触发 `BlockEvent.BreakEvent`。如果被取消，流程进入“结束”阶段。初始取消状态由上述三个方法决定。
- 调用 `Block#playerWillDestroy`。
- 仅服务端：调用 `IBlockExtension#canHarvestBlock`。这决定方块是否可以被采集，即破坏时是否产生掉落物。如果 `Player#preventsBlockDrops` 返回 true，则会忽略该结果。
  - 仅服务端：如果 `IBlockExtension#canHarvestBlock` 没有在不调用其 super 方法的情况下被重写，则触发 `PlayerEvent.HarvestCheck`。如果 `HarvestCheck#canHarvest` 返回 `false`，则不会调用 `Block#playerDestroy`，从而阻止任何资源或经验掉落。
- 仅服务端：调用 `Item#mineBlock`。
- 调用 `IBlockExtension#onDestroyedByPlayer`。如果返回 `false`，流程进入“结束”阶段。
  - 通过调用 `Level#setBlock`，并将 `Blocks.AIR.defaultBlockState()` 或当前记录的 Fluid 作为 `BlockState` 参数，从 `Level` 中移除 `BlockState`。
    - 在该 `Level#setBlock` 调用中，会调用 `Block#onRemove`。
  - 如果 `IBlockExtension#onDestroyedByPlayer` 返回 `true`，则调用 `Block#destroy`。
- 仅服务端：如果之前调用的 `IBlockExtension#canHarvestBlock` 和 `IBlockExtension#onDestroyedByPlayer` 都返回 `true`，则调用 `Block#playerDestroy`。
  - 仅服务端：调用 `Block#dropResources`。这决定挖掘方块时会掉落什么，包括经验。
    - 仅服务端：触发 `BlockDropsEvent`。如果事件被取消，则方块被破坏时不会掉落任何内容。否则，`BlockDropsEvent#getDrops` 中的每个 `ItemEntity` 都会被添加到当前 Level。此外，如果 `getDroppedExperience` 大于 0，则调用 `Block#popExperience`。
      - 仅服务端：调用 `IBlockExtension#getExpDrop`，并由 `EnchantmentHelper#processBlockExperience` 增强。这是 `BlockDropsEvent#getDroppedExperience` 在可能被修改之前设置的初始值。
- 仅服务端：如果用于挖掘方块的物品在上述过程中的任意时刻损坏，则触发 `PlayerDestroyItemEvent`。

#### 挖掘速度

挖掘速度根据方块的硬度、所用[工具][tool]的速度以及实体的多个[属性][attributes]，按照以下规则计算：

```java
// 这会返回 Tool 的挖掘速度；如果手持 Item 为空、不是 Tool，
// 或者不适用于正在破坏的 Block，则返回 1。
float destroySpeed = item.getDestroySpeed(blockState);
// 如果有适用的 Tool，则将 minecraft:mining_efficiency Attribute 作为加法修饰符添加。
if (destroySpeed > 1) {
    destroySpeed += player.getAttributeValue(Attributes.MINING_EFFICIENCY);
}
// 应用急迫或潮涌能量的效果。
if (player.hasEffect(MobEffects.HASTE) || player.hasEffect(MobEffects.CONDUIT_POWER)) {
    int haste = player.hasEffect(MobEffects.HASTE)
        ? player.getEffect(MobEffects.HASTE).getAmplifier()
        : 0;
    int conduitPower = player.hasEffect(MobEffects.CONDUIT_POWER)
        ? player.getEffect(MobEffects.CONDUIT_POWER).getAmplifier()
        : 0;
    int amplifier = Math.max(haste, conduitPower);
    destroySpeed *= 1 + (amplifier + 1) * 0.2f;
}
// 应用挖掘疲劳效果。
if (player.hasEffect(MobEffects.MINING_FATIGUE)) {
    destroySpeed *= switch (player.getEffect(MobEffects.MINING_FATIGUE).getAmplifier()) {
        case 0 -> 0.3F;
        case 1 -> 0.09F;
        case 2 -> 0.0027F;
        default -> 8.1E-4F;
    };
}
// 将 minecraft:block_break_speed Attribute 作为乘法修饰符添加。
destroySpeed *= player.getAttributeValue(Attributes.BLOCK_BREAK_SPEED);
// 如果玩家在水下，则以乘法方式应用水下挖掘速度惩罚。
if (player.isEyeInFluid(FluidTags.WATER)) {
    destroySpeed *= player.getAttributeValue(Attributes.SUBMERGED_MINING_SPEED);
}
// 如果玩家尝试在半空中破坏 Block，则让玩家的挖掘速度降低为原来的五分之一。
if (!player.onGround()) {
    destroySpeed /= 5;
}
destroySpeed = /* 此处会触发 PlayerEvent.BreakSpeed 事件，允许 Mod 开发者进一步修改此值。 */;
return destroySpeed;
```

可在 `Player#getDestroySpeed` 中找到确切代码以供参考。

### Ticking

Ticking 是一种每 1 / 20 秒（即 50 毫秒，也就是“一个 tick”）更新游戏各部分的机制。`Block` 提供了不同的 ticking 方法，它们以不同的方式被调用。

#### 服务端 Ticking 和 Tick 调度

`BlockBehaviour#tick` 通过 scheduled tick 调用。可以通过 `Level#scheduleTick(BlockPos, Block, int)` 创建 scheduled tick，其中 `int` 表示延迟。这在原版的许多地方都有使用。例如，大型垂滴叶的倾斜机制高度依赖该系统。其他常见使用者包括各种红石组件。

#### 客户端 Ticking

`Block#animateTick` 仅在客户端每帧调用。仅客户端的行为会在这里发生，例如火把粒子的生成。

#### 天气 Ticking

天气 ticking 由 `Block#handlePrecipitation` 处理，并独立于常规 ticking 运行。它只在服务端调用，只在以某种形式下雨时调用，并且有 1/16 的概率。例如，下雨或下雪时装满的炼药锅会使用这一机制。

#### 随机 Ticking

随机 tick 系统独立于常规 ticking 运行。必须通过方块的 `BlockBehaviour.Properties`，调用 `BlockBehaviour.Properties#randomTicks()` 方法启用随机 tick。这会使该方块参与随机 ticking 机制。

每个 tick，区块中的固定数量方块会发生随机 tick。该数量由 `randomTickSpeed` GameRule 定义。默认值为 3，因此每个 tick 会从区块中随机选择 3 个方块。如果这些方块启用了随机 ticking，则会调用各自的 `BlockBehaviour#randomTick` 方法。

Minecraft 中有许多机制使用随机 ticking，例如植物生长、冰和雪融化以及铜氧化。

[above]: #一个方块统御一切
[attributes]: ../entities/attributes.md
[below]: #deferredregisterblocks-辅助方法
[blockentities]: ../blockentities/index.md
[blockstates]: states.md
[bsfile]: ../resources/client/models/index.md#blockstate-文件
[codec]: ../datastorage/codecs.md#records
[datagen]: ../resources/index.md#data-generation
[i18n]: ../resources/client/i18n.md
[item]: ../items/index.md
[leftclick]: ../items/interactions.md#left-clicking-an-item
[loottable]: ../resources/server/loottables/index.md
[model]: ../resources/client/models/index.md
[registration]: ../concepts/registries.md#methods-for-registering
[rightclick]: ../items/interactions.md#right-clicking-an-item
[sounds]: ../resources/client/sounds.md
[tags]: ../resources/server/tags.md
[textures]: ../resources/client/textures.md
[tool]: ../items/tools.md
[usingblocks]: #使用方块
[usingblockstates]: states.md#using-blockstates
