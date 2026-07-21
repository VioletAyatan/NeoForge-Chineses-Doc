# 方块（Block）

Block 是 Minecraft 世界不可或缺的组成部分。所有地形、结构与机器都由 Block 构成。如果你有兴趣制作模组，很可能也会想添加一些 Block。本页将引导你创建 Block，并介绍可利用它们实现的部分功能。

## 每种 Block 只有一个

在开始前，务必理解：游戏中每种 Block 始终只存在一个实例。一个世界由位于不同位置、指向这一个 Block 的成千上万个引用构成。换言之，同一个 Block 只是被显示了很多次。

因此，Block 只应实例化一次，而且应在[注册][registration]期间实例化。Block 注册后，就可以按需使用已注册引用。

与大多数其他 registry 不同，Block 可以使用 `DeferredRegister` 的专用版本 `DeferredRegister.Blocks`。`DeferredRegister.Blocks` 的作用基本类似 `DeferredRegister<Block>`，但有少许区别：

- 通过 `DeferredRegister.createBlocks("yourmodid")` 创建，而不是常规的 `DeferredRegister.create(...)` 方法。
- `#register` 返回 `DeferredBlock<T extends Block>`，后者扩展 `DeferredHolder<Block, T>`。`T` 是正在注册的 Block 类类型。
- 提供了若干注册 Block 的辅助方法。详情参见[下文][below]。

现在来注册 Block：

```java
//BLOCKS is a DeferredRegister.Blocks
public static final DeferredBlock<Block> MY_BLOCK = BLOCKS.register("my_block", registryName -> new Block(...));
```

注册 Block 后，对新 `my_block` 的所有引用都应使用此常量。例如，如果想检查给定位置的 Block 是否为 `my_block`，代码大致如下：

```java
level.getBlockState(position) // returns the blockstate placed in the given level (world) at the given position
    //highlight-next-line
    .is(MyBlockRegistrationClass.MY_BLOCK);
```

这种做法还有一个便利效果：`block1 == block2` 可以正常工作，并可代替 Java 的 `equals` 方法（当然，使用 `equals` 仍然有效，但没有意义，因为它本来就是按引用比较）。

:::danger
切勿在注册之外调用 `new Block()`！一旦这样做，各种问题就可能而且必然会发生：

- 必须在 registry 未冻结时创建 Block。NeoForge 会代你解冻 registry，之后再将其冻结，因此注册阶段就是创建 Block 的时间窗口。
- 如果在 registry 再次冻结后尝试创建和／或注册 Block，游戏会崩溃并报告 `null` Block，这可能非常令人困惑。
- 即使设法保留了一个悬空 Block 实例，游戏也无法在同步与保存时识别它，并会用空气替换它。
:::

## 创建 Block

如前所述，首先创建 `DeferredRegister.Blocks`：

```java
public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("yourmodid");
```

### 基础 Block

对于不需要特殊功能的简单 Block（例如圆石、木板等），可以直接使用 `Block` 类。为此，在注册期间使用 `BlockBehaviour.Properties` 参数实例化 `Block`。该 `BlockBehaviour.Properties` 参数可通过 `BlockBehaviour.Properties#of` 创建，并可通过调用其方法自定义。最重要的方法包括：

- `setId`——设置 Block 的 resource key。
    - 每个 Block 都**必须**设置此项，否则会抛出 exception。
- `destroyTime`——决定摧毁 Block 所需时间。
    - 石头的 destroy time 为 1.5，泥土为 0.5，黑曜石为 50，基岩为 -1（不可破坏）。
- `explosionResistance`——决定 Block 的爆炸抗性。
    - 石头的爆炸抗性为 6.0，泥土为 0.5，黑曜石为 1,200，基岩为 3,600,000。
- `sound`——设置敲击、破坏或放置 Block 时发出的声音。
    - 默认值为 `SoundType.STONE`。详情参见[声音页面][sounds]。
- `lightLevel`——设置 Block 的发光等级。接受以 `BlockState` 为参数、返回 0 到 15 之间值的函数。
    - 例如，萤石使用 `state -> 15`，火把使用 `state -> 14`。
- `friction`——设置 Block 的摩擦力（光滑程度）。
    - 默认值为 0.6。冰使用 0.98。

例如，一个简单实现大致如下：

```java
//BLOCKS is a DeferredRegister.Blocks
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

更多文档请参阅 `BlockBehaviour.Properties` 源码。如需更多示例或查看 Minecraft 使用的值，请查看 `Blocks` 类。

:::info
务必理解：世界中的 Block 与物品栏中的内容并不是同一种东西。物品栏中看似 Block 的对象实际上是 `BlockItem`，它是一种特殊 [Item][item]，使用时会放置 Block。这也意味着创造模式物品栏标签页、最大堆叠数量等内容由相应 `BlockItem` 处理。

`BlockItem` 必须与 Block 分开注册。这是因为 Block 不一定需要 Item，例如本就不应被收集的 Block（火就是一例）。
:::

### 更多功能

直接使用 `Block` 只能实现非常基础的 Block。如果想添加玩家交互或不同 hitbox 等功能，就需要一个扩展 `Block` 的自定义类。`Block` 类有许多可覆盖的方法，用于实现不同功能；更多信息请参阅 `Block`、`BlockBehaviour` 与 `IBlockExtension` 类。另请参阅下方[使用 Block][usingblocks] 一节，了解 Block 最常见的部分用例。

如果想创建具有不同变体的 Block（例如有下半、上半和双层变体的台阶），应使用 [BlockState][blockstates]。最后，如果想创建存储额外数据的 Block（例如存储物品栏的箱子），应使用 [BlockEntity][blockentities]。经验法则是：状态数量有限且相对较少（最多几百种）时使用 BlockState；状态数量无限或近乎无限时使用 BlockEntity。

#### Block Type

Block type 是用于序列化和反序列化 Block 对象的 [`MapCodec`][codec]。这个 `MapCodec` 通过 `BlockBehaviour#codec` 设置，并[注册][registration]到 Block type registry。目前它只在生成 Block list report 时使用。`Block` 的每个子类都应创建一次 Block type。例如，`FlowerBlock#CODEC` 表示大多数花的 Block type，而它的子类 `WitherRoseBlock` 则有单独的 Block type。

如果 Block 子类只接受 `BlockBehaviour.Properties`，可以使用 `BlockBehaviour#simpleCodec` 创建 `MapCodec`。

```java
// For some block subclass
public class SimpleBlock extends Block {
    public SimpleBlock(BlockBehavior.Properties properties) {
        // ...
    }

    @Override
    public MapCodec<SimpleBlock> codec() {
        return SIMPLE_CODEC.get();
    }
}

// In some registration class
public static final DeferredRegister<MapCodec<? extends Block>> REGISTRAR = DeferredRegister.create(BuiltInRegistries.BLOCK_TYPE, "yourmodid");

public static final Supplier<MapCodec<SimpleBlock>> SIMPLE_CODEC = REGISTRAR.register(
    "simple",
    () -> BlockBehaviour.simpleCodec(SimpleBlock::new)
);
```

如果 Block 子类还包含更多参数，则应使用 [`RecordCodecBuilder#mapCodec`][codec] 创建 `MapCodec`，并为 `BlockBehaviour.Properties` 参数传入 `BlockBehaviour#propertiesCodec`。

```java
// For some block subclass
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

// In some registration class
public static final DeferredRegister<MapCodec<? extends Block>> REGISTRAR = DeferredRegister.create(BuiltInRegistries.BLOCK_TYPE, "yourmodid");

public static final Supplier<MapCodec<ComplexBlock>> COMPLEX_CODEC = REGISTRAR.register(
    "simple",
    () -> RecordCodecBuilder.mapCodec(instance ->
        instance.group(
            Codec.INT.fieldOf("value").forGetter(ComplexBlock::getValue),
            BlockBehaviour.propertiesCodec() // represents the BlockBehavior.Properties parameter
        ).apply(instance, ComplexBlock::new)
    )
);
```

:::info
尽管 Block type 目前基本没有使用，但随着 Mojang 继续转向以 Codec 为中心的结构，预计它将变得更加重要。
:::

### `DeferredRegister.Blocks` 辅助方法

上文已经介绍了如何创建 `DeferredRegister.Blocks`，以及它会返回 `DeferredBlock`。现在看看这个专用 `DeferredRegister` 还提供哪些工具。先从 `#registerBlock` 开始：

```java
public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("yourmodid");

public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.register(
    "example_block", registryName -> new Block(
        BlockBehaviour.Properties.of()
            // The ID must be set on the block
            .setId(ResourceKey.create(Registries.BLOCK, registryName))
    )
);

// Same as above, except that the block properties are supplied separately.
// setId is also called internally on the properties object.
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerBlock(
    "example_block",
    Block::new, // The factory that the properties will be passed into.
    () -> BlockBehaviour.Properties.of() // The supplied properties to use.
);

// Same as above, except that the `Properties#of` is supplied and operated upon.
// setId is also called internally on the properties object.
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerBlock(
    "example_block",
    Block::new, // The factory that the properties will be passed into.
    props -> props // A unary operator of the properties to use.
);
```

如果想使用 `Block::new`，可以完全省略 factory：

```java
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerSimpleBlock(
    "example_block",
    () -> BlockBehaviour.Properties.of() // The supplied properties to use.
);

public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerSimpleBlock(
    "example_block",
    props -> props // A unary operator of the properties to use.
);
```

它与前一个示例的作用完全相同，只是略短。当然，如果想使用 `Block` 的子类而不是 `Block` 本身，就必须改用前一种方法。

### 资源

如果注册 Block 并将其放入世界，会发现它缺少纹理等内容。这是因为[纹理][textures]以及其他内容由 Minecraft 的资源系统处理。在 Minecraft 中添加新 Block 时，应编写或[生成][datagen]以下文件：

- [BlockState 文件][bsfile]
- [Block model][model]
- [翻译][i18n]
- [战利品表][loottable]
- 一些 Block [tag][tags]，例如用于挖掘的 tag

对于以上所有内容，还应参考类似原版 Block 的文件与数据 generator。

## 使用 Block

很少会直接使用 Block 来执行操作。事实上，Minecraft 中可能最常见的两种操作——获取某位置的 Block 与在某位置设置 Block——使用的都是 BlockState，而不是 Block。一般设计方式是由 Block 定义行为，但行为实际通过 BlockState 运行。因此，`BlockState` 经常作为参数传给 `Block` 的方法。有关 BlockState 的使用方式，以及如何从 Block 获得 BlockState，参见[使用 BlockState][usingblockstates]。

在若干场景中，`Block` 的多个方法会在不同时间使用。下面各小节列出了最常见的 Block 相关流程。除非另有说明，所有方法都会在两个逻辑端调用，并且在两个端上应返回相同结果。

### 放置 Block

Block 放置逻辑从 `BlockItem#useOn`（或某个子类对该方法的实现，例如睡莲使用的 `PlaceOnWaterBlockItem`）中调用。有关游戏如何执行到这里，参见[右键点击 Item][rightclick]。实际而言，只要右键点击 `BlockItem`（例如圆石 Item），就会调用此行为。

- 检查若干前置条件，例如你不能处于旁观者模式、Block 所需的全部 feature flag 都已启用、目标位置没有超出世界边界。如果任一检查失败，流程结束。
- 对当前位于尝试放置位置的 Block 调用 `BlockBehaviour#canBeReplaced`。如果返回 `false`，流程结束。在这里返回 `true` 的典型对象包括高草或雪层。
- 调用 `Block#getStateForPlacement`。此处可根据 context（其中包含位置、旋转、放置 Block 的面等信息）返回不同 BlockState。这对可朝不同方向放置的 Block 等场景很有用。
- 使用上一步获得的 BlockState 调用 `BlockBehaviour#canSurvive`。如果返回 `false`，流程结束。
- 通过调用 `Level#setBlock` 将 BlockState 设置到 Level 中。
    - 在该 `Level#setBlock` 调用中，会调用 `BlockBehaviour#onPlace`。
- 调用 `Block#setPlacedBy`。

### 破坏 Block

破坏 Block 稍微复杂一些，因为它需要时间。整个过程大致可分为三个阶段：“开始”、“挖掘”和“实际破坏”。

- 点击鼠标左键时，进入“开始”阶段。
- 随后必须按住鼠标左键，进入“挖掘”阶段。**该阶段的方法每个 tick 都会调用。**
- 如果“继续”阶段未因松开鼠标左键而中断，并且 Block 被破坏，就进入“实际破坏”阶段。

对于偏爱伪代码的读者：

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

下面各小节会进一步把这些阶段分解为实际方法调用。有关游戏如何从左键点击进入此流程，参见[左键点击 Item][leftclick]。

#### “开始”阶段

- 检查若干前置条件，例如你不能处于旁观者模式、主手 `ItemStack` 所需的全部 feature flag 都已启用、相关 Block 未超出世界边界。如果任一检查失败，流程结束。
- 触发 `PlayerInteractEvent.LeftClickBlock`。如果事件被取消，流程结束。
    - 请注意，在客户端取消事件时，不会向服务端发送 packet，因此服务端不会运行逻辑。
    - 但是，在服务端取消此事件仍会导致客户端代码运行，可能造成不同步！
- 调用 `BlockBehaviour#attack`。

#### “挖掘”阶段

- 触发 `PlayerInteractEvent.LeftClickBlock`。如果事件被取消，流程进入“结束”阶段。
    - 请注意，在客户端取消事件时，不会向服务端发送 packet，因此服务端不会运行逻辑。
    - 但是，在服务端取消此事件仍会导致客户端代码运行，可能造成不同步！
- 调用 `BlockBehaviour#getDestroyProgress`，并将结果加到内部破坏进度计数器中。
    - `BlockBehaviour#getDestroyProgress` 返回 0 到 1 之间的 float 值，表示每个 tick 应将破坏进度计数器增加多少。
- 相应更新进度叠加层（裂纹纹理）。
- 如果破坏进度大于 1.0（即已完成，Block 应被破坏），退出“挖掘”阶段并进入“实际破坏”阶段。

#### “实际破坏”阶段

- 调用 `Item#canDestroyBlock`。如果返回 `false`（判定不应破坏 Block），流程进入“结束”阶段。
- 如果 Block 是 `GameMasterBlock` 的实例，则调用 `Player#canUseGameMasterBlocks`。这会判断玩家是否有能力破坏仅创造模式可用的 Block。如果为 `false`，流程进入“结束”阶段。
- 仅服务端：调用 `Player#blockActionRestricted`。它判断当前玩家是否不能破坏该 Block。如果为 `true`，流程进入“结束”阶段。
- 仅服务端：触发 `BlockEvent.BreakEvent`。如果取消，流程进入“结束”阶段。其初始取消状态由上述三个方法决定。
- 调用 `Block#playerWillDestroy`。
- 仅服务端：调用 `IBlockExtension#canHarvestBlock`。它判断 Block 是否能够采集，即破坏后产生掉落物。如果 `Player#preventsBlockDrops` 返回 true，则会忽略此结果。
    - 仅服务端：如果覆盖 `IBlockExtension#canHarvestBlock` 时没有省略其 super 调用，就会触发 `PlayerEvent.HarvestCheck`。如果 `HarvestCheck#canHarvest` 返回 `false`，则不会调用 `Block#playerDestroy`，从而阻止任何资源或经验掉落。
- 仅服务端：调用 `Item#mineBlock`。
- 调用 `IBlockExtension#onDestroyedByPlayer`。如果返回 `false`，流程进入“结束”阶段。
    - 通过调用 `Level#setBlock` 从 Level 移除 BlockState，并以 `Blocks.AIR.defaultBlockState()` 或当前记录的 Fluid 作为 BlockState 参数。
        - 在该 `Level#setBlock` 调用中，会调用 `Block#onRemove`。
    - 如果 `IBlockExtension#onDestroyedByPlayer` 返回 `true`，调用 `Block#destroy`。
- 仅服务端：如果之前调用的 `IBlockExtension#canHarvestBlock` 与 `IBlockExtension#onDestroyedByPlayer` 都返回 `true`，则调用 `Block#playerDestroy`。
    - 仅服务端：调用 `Block#dropResources`。它决定挖掘 Block 时的掉落内容，包括经验。
        - 仅服务端：触发 `BlockDropsEvent`。如果事件被取消，Block 被破坏时不会掉落任何物品。否则，将 `BlockDropsEvent#getDrops` 中的每个 `ItemEntity` 添加到当前 Level。此外，如果 `getDroppedExperience` 大于 0，还会调用 `Block#popExperience`。
            - 仅服务端：调用 `IBlockExtension#getExpDrop`，并由 `EnchantmentHelper#processBlockExperience` 进行增强。这是 `BlockDropsEvent#getDroppedExperience` 在之后可能被修改之前所设置的初始值。
- 仅服务端：如果用于挖掘 Block 的 Item 在上述流程中的任意时刻损坏，就会触发 `PlayerDestroyItemEvent`。

#### 挖掘速度

挖掘速度根据 Block 硬度、所用[工具][tool]的速度以及若干 Entity [attribute][attributes]，按以下规则计算：

```java
// This will return the tool's mining speed, or 1 if the held item is either empty, not a tool,
// or not applicable for the block being broken.
float destroySpeed = item.getDestroySpeed(blockState);
// If we have an applicable tool, add the minecraft:mining_efficiency attribute as an additive modifier.
if (destroySpeed > 1) {
    destroySpeed += player.getAttributeValue(Attributes.MINING_EFFICIENCY);
}
// Apply effects from haste or conduit power.
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
// Apply slowness effect.
if (player.hasEffect(MobEffects.MINING_FATIGUE)) {
    destroySpeed *= switch (player.getEffect(MobEffects.MINING_FATIGUE).getAmplifier()) {
        case 0 -> 0.3F;
        case 1 -> 0.09F;
        case 2 -> 0.0027F;
        default -> 8.1E-4F;
    };
}
// Add the minecraft:block_break_speed attribute as a multiplicative modifier.
destroySpeed *= player.getAttributeValue(Attributes.BLOCK_BREAK_SPEED);
// If the player is underwater, apply the underwater mining speed penalty multiplicatively.
if (player.isEyeInFluid(FluidTags.WATER)) {
    destroySpeed *= player.getAttributeValue(Attributes.SUBMERGED_MINING_SPEED);
}
// If the player is trying to break a block in mid-air, make the player mine 5 times slower.
if (!player.onGround()) {
    destroySpeed /= 5;
}
destroySpeed = /* The PlayerEvent.BreakSpeed event is fired here, allowing modders to further modify this value. */;
return destroySpeed;
```

确切代码可参考 `Player#getDestroySpeed`。

### Tick

Tick 是一种每 1/20 秒（即 50 毫秒，也就是“一个 tick”）更新游戏各部分的机制。Block 提供了几种以不同方式调用的 tick 方法。

#### 服务端 Tick 与 Tick 调度

`BlockBehaviour#tick` 通过 scheduled tick 调用。Scheduled tick 可通过 `Level#scheduleTick(BlockPos, Block, int)` 创建，其中 `int` 表示延迟。原版在许多地方使用它，例如大型垂滴叶的倾斜机制高度依赖此系统。各种红石组件也是典型使用者。

#### 客户端 Tick

`Block#animateTick` 仅在客户端每帧调用。火把粒子生成等仅客户端行为就在这里发生。

#### 天气 Tick

天气 tick 由 `Block#handlePrecipitation` 处理，并独立于常规 tick 运行。它只在服务端、以某种形式降雨时调用，概率为 1/16。例如，炼药锅在降雨或降雪期间蓄水就使用了它。

#### 随机 Tick

随机 tick 系统独立于常规 tick 运行。必须通过 Block 的 `BlockBehaviour.Properties` 调用 `BlockBehaviour.Properties#randomTicks()` 方法来启用随机 tick。这样会使该 Block 加入随机 tick 机制。

每个 tick 都会对 chunk 中固定数量的 Block 进行随机 tick。该数量由 `randomTickSpeed` gamerule 定义。默认值为 3 时，每个 tick 都会从 chunk 中随机选择 3 个 Block。如果这些 Block 已启用随机 tick，就调用各自的 `BlockBehaviour#randomTick` 方法。

Minecraft 中有许多机制使用随机 tick，例如植物生长、冰雪融化或铜氧化。

[above]: #one-block-to-rule-them-all
[attributes]: ../entities/attributes.md
[below]: #deferredregisterblocks-helpers
[blockentities]: ../blockentities/index.md
[blockstates]: states.md
[bsfile]: ../resources/client/models/index.md#blockstate-files
[codec]: ../datastorage/codecs.md#records
[datagen]: ../resources/index.md#data-generation
[i18n]: ../resources/client/i18n.md
[item]: ../items/index.md
[leftclick]: ../items/interactions.md#left-clicking-an-item
[loottable]: ../resources/server/loottables/index.md
[model]: ../resources/client/models/index.md
[registration]: ../concepts/registries.md#methods-for-registering
[resources]: ../resources/index.md#assets
[rightclick]: ../items/interactions.md#right-clicking-an-item
[sounds]: ../resources/client/sounds.md
[tags]: ../resources/server/tags.md
[textures]: ../resources/client/textures.md
[tool]: ../items/tools.md
[usingblocks]: #using-blocks
[usingblockstates]: states.md#using-blockstates
