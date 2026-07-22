# 方块（Block）

方块是 Minecraft 世界不可或缺的组成部分。所有地形、结构与机器都由方块构成。如果你有兴趣制作模组，很可能也会想添加一些方块。本页将引导你创建方块，并介绍可利用它们实现的部分功能。

## 每种方块只有一个

在开始前，务必理解：游戏中每种方块始终只存在一个实例。一个世界由位于不同位置、指向这一个方块的成千上万个引用构成。换言之，同一个方块只是被显示了很多次。

因此，方块只应实例化一次，而且应在[注册][registration]期间实例化。方块注册后，就可以按需使用已注册引用。

与大多数其他注册表不同，方块可以使用 `DeferredRegister` 的专用版本 `DeferredRegister.Blocks`。`DeferredRegister.Blocks` 的作用基本类似 `DeferredRegister<Block>`，但有少许区别：

- 通过 `DeferredRegister.createBlocks("yourmodid")` 创建，而不是常规的 `DeferredRegister.create(...)` 方法。
- `#register` 返回 `DeferredBlock<T extends Block>`，后者继承自 `DeferredHolder<Block, T>`。`T` 表示所注册方块的具体类型。
- 提供了若干注册方块的辅助方法。详情参见[下文][below]。

现在来注册方块：

```java
//BLOCKS 使用 DeferredRegister.Blocks
public static final DeferredBlock<Block> MY_BLOCK = BLOCKS.register("my_block", registryName -> new Block(...));
```

注册方块后，对新方块 `my_block` 的所有引用都应使用此常量。例如，如果想检查给定位置的方块是否为 `my_block`，代码大致如下：

```java
level.getBlockState(position) // 返回在给定位置放置在给定 level（世界）中的blockstate
    //highlight-next-line
    .is(MyBlockRegistrationClass.MY_BLOCK);
```

这种做法还有一个便利效果：`block1 == block2` 可以正常工作，并可代替 Java 的 `equals` 方法（当然，使用 `equals` 仍然有效，但没有意义，因为它本来就是按引用比较）。

:::danger
切勿在注册之外调用 `new Block()`！一旦这样做，各种问题就可能而且必然会发生：

- 必须在注册表未冻结时创建方块。NeoForge 会代你解冻注册表，之后再将其冻结，因此注册阶段就是创建方块的时间窗口。
- 如果在注册表再次冻结后尝试创建或注册方块，游戏会崩溃并报告一个为 `null` 的方块，这可能非常令人困惑。
- 即使设法保留了一个悬空方块实例，游戏也无法在同步与保存时识别它，并会用空气替换它。

:::

## 创建方块

如前所述，首先创建 `DeferredRegister.Blocks`：

```java
public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("yourmodid");
```

### 基础方块

对于不需要特殊功能的简单方块（例如圆石、木板等），可以直接使用 `Block` 类。为此，在注册期间使用 `BlockBehaviour.Properties` 参数实例化 `Block`。该 `BlockBehaviour.Properties` 参数可通过 `BlockBehaviour.Properties#of` 创建，并可通过调用其方法自定义。最重要的方法包括：

- `setId`——设置方块的资源键。
  - 每个方块都**必须**设置此项，否则会抛出异常。
- `destroyTime`——决定破坏方块所需的时间。
  - 石头的破坏时间为 1.5，泥土为 0.5，黑曜石为 50，基岩为 -1（不可破坏）。
- `explosionResistance`——决定方块的爆炸抗性。
  - 石头的爆炸抗性为 6.0，泥土为 0.5，黑曜石为 1,200，基岩为 3,600,000。
- `sound`——设置敲击、破坏或放置方块时发出的声音。
  - 默认值为 `SoundType.STONE`。详情参见[声音页面][sounds]。
- `lightLevel`——设置方块的发光等级。它接受一个以 `BlockState` 为参数、返回 0 到 15 之间数值的函数。
  - 例如，萤石使用 `state -> 15`，火把使用 `state -> 14`。
- `friction`——设置方块的摩擦力（滑溜程度）。
  - 默认值为 0.6。冰使用 0.98。

例如，一个简单实现大致如下：

```java
//BLOCKS 使用 DeferredRegister.Blocks
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
务必理解：世界中的方块与物品栏中的方块并不是同一种对象。物品栏中看似方块的对象实际上是 `BlockItem`，它是一种特殊的[物品][item]，使用时会放置方块。这也意味着创造模式物品栏标签页、最大堆叠数量等内容由相应的 `BlockItem` 处理。

`BlockItem` 必须与方块分开注册。这是因为方块不一定需要对应的物品，例如本就不应被收集的方块（火就是一例）。
:::

### 更多功能

直接使用 `Block` 只能实现非常基础的方块。如果想添加玩家交互或不同的碰撞箱（hitbox）等功能，就需要创建一个继承 `Block` 的自定义类。`Block` 类提供了许多可以重写的方法，用于实现不同功能；更多信息请参阅 `Block`、`BlockBehaviour` 与 `IBlockExtension` 类。另请参阅下方[使用方块][usingblocks]一节，了解方块最常见的部分用例。

如果想创建具有不同变体的方块（例如有下半、上半和双层变体的台阶），应使用[方块状态][blockstates]。最后，如果想创建存储额外数据的方块（例如存储物品栏的箱子），应使用[方块实体][blockentities]。经验法则是：状态数量有限且相对较少（最多几百种）时使用方块状态；状态数量无限或近乎无限时使用方块实体。

#### 方块类型（Block Type）

方块类型是用于序列化和反序列化方块对象的 [`MapCodec`][codec]。该 `MapCodec` 通过 `BlockBehaviour#codec` 提供，并注册到方块类型注册表中。目前，它仅在生成方块列表报告时使用。每个 `Block` 子类都应创建一次对应的方块类型；例如，`FlowerBlock#CODEC` 表示大多数花类方块的方块类型，而其子类 `WitherRoseBlock` 则拥有独立的方块类型。

如果 `Block` 子类只接受 `BlockBehaviour.Properties` 参数，可以使用 `BlockBehaviour#simpleCodec` 创建 `MapCodec`。

```java
// 对于某些方块子类
public class SimpleBlock extends Block {
    public SimpleBlock(BlockBehavior.Properties properties) {
        // ...
    }

    @Override
    public MapCodec<SimpleBlock> codec() {
        return SIMPLE_CODEC.get();
    }
}

// 在某些注册类中
public static final DeferredRegister<MapCodec<? extends Block>> REGISTRAR = DeferredRegister.create(BuiltInRegistries.BLOCK_TYPE, "yourmodid");

public static final Supplier<MapCodec<SimpleBlock>> SIMPLE_CODEC = REGISTRAR.register(
    "simple",
    () -> BlockBehaviour.simpleCodec(SimpleBlock::new)
);
```

如果 `Block` 子类还包含更多参数，则应使用 [`RecordCodecBuilder#mapCodec`][codec] 创建 `MapCodec`，并为 `BlockBehaviour.Properties` 参数传入 `BlockBehaviour#propertiesCodec`。

```java
// 对于某些方块子类
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

// 在某些注册类中
public static final DeferredRegister<MapCodec<? extends Block>> REGISTRAR = DeferredRegister.create(BuiltInRegistries.BLOCK_TYPE, "yourmodid");

public static final Supplier<MapCodec<ComplexBlock>> COMPLEX_CODEC = REGISTRAR.register(
    "simple",
    () -> RecordCodecBuilder.mapCodec(instance ->
        instance.group(
            Codec.INT.fieldOf("value").forGetter(ComplexBlock::getValue),
            BlockBehaviour.propertiesCodec() // 表示BlockBehavior.Properties参数
        ).apply(instance, ComplexBlock::new)
    )
);
```

:::info
尽管方块类型目前除生成方块列表报告外基本没有其他用途，但随着 Mojang 继续转向以 `Codec` 为中心的结构，预计它将变得更加重要。
:::

### `DeferredRegister.Blocks` 辅助方法

上文已经介绍了如何创建 `DeferredRegister.Blocks`，以及它会返回 `DeferredBlock`。现在看看这个专用 `DeferredRegister` 还提供哪些工具。先从 `#registerBlock` 开始：

```java
public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("yourmodid");

public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.register(
    "example_block", registryName -> new Block(
        BlockBehaviour.Properties.of()
            // 必须在方块上设置 ID
            .setId(ResourceKey.create(Registries.BLOCK, registryName))
    )
);

// 与上面相同，只是方块 property 是单独提供的。
// setId 也在 property 对象上内部调用。
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerBlock(
    "example_block",
    Block::new, // property 将传递到的工厂。
    () -> BlockBehaviour.Properties.of() // 提供的要使用的 property。
);

// 与上面相同，但提供和操作的是 `Properties#of`。
// setId 也在 property 对象上内部调用。
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerBlock(
    "example_block",
    Block::new, // property 将传递到的工厂。
    props -> props // 要使用的 property 的一元运算符。
);
```

如果想使用 `Block::new`，可以完全省略工厂函数：

```java
public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerSimpleBlock(
    "example_block",
    () -> BlockBehaviour.Properties.of() // 提供的要使用的 property。
);

public static final DeferredBlock<Block> EXAMPLE_BLOCK = BLOCKS.registerSimpleBlock(
    "example_block",
    props -> props // 要使用的 property 的一元运算符。
);
```

它与前一个示例的作用完全相同，只是略短。当然，如果想使用 `Block` 的子类，而不是直接使用 `Block` 本身，就必须改用前一种方法。

### 资源

如果注册方块并将其放入世界，会发现它缺少纹理等内容。这是因为[纹理][textures]以及其他内容由 Minecraft 的资源系统处理。在 Minecraft 中添加新方块时，应编写或[生成][datagen]以下文件：

- [方块状态文件][bsfile]
- [方块模型][model]
- [翻译][i18n]
- [战利品表][loottable]
- 一些方块[标签][tags]，例如用于挖掘的标签

对于以上所有内容，还应参考类似原版方块的模型文件与数据生成器。

## 使用方块

很少会直接使用方块对象来执行操作。事实上，Minecraft 中可能最常见的两种操作——获取某个位置的方块，以及在某个位置设置方块——使用的都是方块状态，而不是方块对象。通常由方块定义行为，再通过方块状态执行这些行为。因此，`BlockState` 经常作为参数传给 `Block` 的方法。有关方块状态的使用方式，以及如何从方块获取方块状态，请参阅[使用方块状态][usingblockstates]。

在若干场景中，`Block` 的多个方法会在不同时间使用。下面各小节列出了最常见的方块相关流程。除非另有说明，所有方法都会在两个逻辑端调用，并且在两个端上应返回相同结果。

### 放置方块

方块放置逻辑由 `BlockItem#useOn`（或其子类对该方法的实现，例如睡莲使用的 `PlaceOnWaterBlockItem`）发起。有关游戏如何执行到这里，请参阅[右键点击物品][rightclick]。实际而言，只要右键使用 `BlockItem`（例如圆石物品），就会调用此行为。

- 检查若干前置条件，例如玩家不能处于旁观者模式、方块所需的全部功能标志均已启用，并且目标位置没有超出世界边界。如果任一检查失败，流程结束。
- 对当前位于尝试放置位置的方块调用 `BlockBehaviour#canBeReplaced`。如果返回 `false`，流程结束。在这里返回 `true` 的典型对象包括高草或雪层。
- 调用 `Block#getStateForPlacement`。此处可根据上下文（其中包含位置、旋转、放置方块的面等信息）返回不同的 `BlockState`。这对于能够朝不同方向放置的方块等场景很有用。
- 使用上一步获得的 `BlockState` 调用 `BlockBehaviour#canSurvive`。如果返回 `false`，流程结束。
- 通过调用 `Level#setBlock` 将 `BlockState` 设置到 `Level` 中。
  - 在该 `Level#setBlock` 调用中，会调用 `BlockBehaviour#onPlace`。
- 调用 `Block#setPlacedBy`。

### 破坏方块

破坏方块稍微复杂一些，因为它需要时间。整个过程大致可分为三个阶段："开始"、"挖掘"和"实际破坏"。

- 点击鼠标左键时，进入"开始"阶段。
- 随后必须按住鼠标左键，进入“挖掘”阶段。**该阶段的方法会在每个游戏刻调用。**
- 如果“挖掘”阶段未因松开鼠标左键而中断，并且方块被破坏，就进入“实际破坏”阶段。

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

下面各小节会进一步把这些阶段分解为实际方法调用。有关游戏如何从左键点击进入此流程，请参阅[左键点击物品][leftclick]。

#### “开始”阶段

- 检查若干前置条件，例如玩家不能处于旁观者模式、主手 `ItemStack` 所需的全部功能标志均已启用，并且相关方块没有超出世界边界。如果任一检查失败，流程结束。
- 触发 `PlayerInteractEvent.LeftClickBlock`。如果事件被取消，流程结束。
  - 请注意，在客户端取消事件时，不会向服务端发送网络数据包，因此服务端不会运行相关逻辑。
  - 但是，在服务端取消此事件仍会导致客户端代码运行，可能造成不同步！
- 调用 `BlockBehaviour#attack`。

#### “挖掘”阶段

- 触发 `PlayerInteractEvent.LeftClickBlock`。如果事件被取消，流程进入“结束”阶段。
  - 请注意，在客户端取消事件时，不会向服务端发送网络数据包，因此服务端不会运行相关逻辑。
  - 但是，在服务端取消此事件仍会导致客户端代码运行，可能造成不同步！
- 调用 `BlockBehaviour#getDestroyProgress`，并将结果加到内部破坏进度计数器中。
  - `BlockBehaviour#getDestroyProgress` 返回一个介于 0 和 1 之间的 `float` 值，表示每个游戏刻应将破坏进度计数器增加多少。
- 相应更新进度叠加层（裂纹纹理）。
- 如果破坏进度大于 1.0（即已完成，方块应被破坏），退出“挖掘”阶段并进入“实际破坏”阶段。

#### “实际破坏”阶段

- 调用 `Item#canDestroyBlock`。如果返回 `false`（判定不应破坏该方块），流程进入“结束”阶段。
- 如果该方块是 `GameMasterBlock` 的实例，则调用 `Player#canUseGameMasterBlocks`。该方法会判断玩家是否有权破坏仅限创造模式使用的方块。如果返回 `false`，流程进入“结束”阶段。
- 仅服务端：调用 `Player#blockActionRestricted`。该方法判断当前玩家是否被禁止破坏该方块。如果返回 `true`，流程进入“结束”阶段。
- 仅服务端：触发 `BlockEvent.BreakEvent`。如果取消，流程进入“结束”阶段。其初始取消状态由上述三个方法决定。
- 调用 `Block#playerWillDestroy`。
- 仅服务端：调用 `IBlockExtension#canHarvestBlock`。该方法判断方块是否可以被采集，即破坏后是否产生掉落物。如果 `Player#preventsBlockDrops` 返回 `true`，则会忽略此结果。
  - 仅服务端：如果重写 `IBlockExtension#canHarvestBlock` 时保留了其 `super` 调用，就会触发 `PlayerEvent.HarvestCheck`。如果 `HarvestCheck#canHarvest` 返回 `false`，则不会调用 `Block#playerDestroy`，从而阻止任何资源或经验掉落。
- 仅服务端：调用 `Item#mineBlock`。
- 调用 `IBlockExtension#onDestroyedByPlayer`。如果返回 `false`，流程进入“结束”阶段。
  - 通过调用 `Level#setBlock` 从 `Level` 中移除原有的 `BlockState`，并将 `Blocks.AIR.defaultBlockState()` 或当前位置流体对应的方块状态作为新的 `BlockState` 参数。
    - 在该 `Level#setBlock` 调用中，会调用 `Block#onRemove`。
  - 如果 `IBlockExtension#onDestroyedByPlayer` 返回 `true`，调用 `Block#destroy`。
- 仅服务端：如果之前调用的 `IBlockExtension#canHarvestBlock` 与 `IBlockExtension#onDestroyedByPlayer` 都返回 `true`，则调用 `Block#playerDestroy`。
  - 仅服务端：调用 `Block#dropResources`。该方法决定挖掘方块时的掉落内容，包括经验。
    - 仅服务端：触发 `BlockDropsEvent`。如果事件被取消，方块被破坏时不会掉落任何物品。否则，将 `BlockDropsEvent#getDrops` 中的每个 `ItemEntity` 添加到当前 `Level`。此外，如果 `getDroppedExperience` 大于 0，还会调用 `Block#popExperience`。
      - 仅服务端：调用 `IBlockExtension#getExpDrop`，并由 `EnchantmentHelper#processBlockExperience` 进行增强。这是 `BlockDropsEvent#getDroppedExperience` 在之后可能被修改之前所设置的初始值。
- 仅服务端：如果用于挖掘方块的物品在上述流程中的任意时刻损坏，就会触发 `PlayerDestroyItemEvent`。

#### 挖掘速度

挖掘速度根据方块硬度、所用[工具][tool]的速度以及若干[实体属性][attributes]，按以下规则计算：

```java
// 返回工具的挖掘速度；如果手持物品为空、不是工具，或不适用于正在破坏的方块，则返回1。
float destroySpeed = item.getDestroySpeed(blockState);
// 如果我们有适用的工具，请添加 minecraft:mining_efficiency 属性作为附加修饰符。
if (destroySpeed > 1) {
    destroySpeed += player.getAttributeValue(Attributes.MINING_EFFICIENCY);
}
// 应用急速或潮涌能量的效果。
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
// 应用缓慢效果。
if (player.hasEffect(MobEffects.MINING_FATIGUE)) {
    destroySpeed *= switch (player.getEffect(MobEffects.MINING_FATIGUE).getAmplifier()) {
        case 0 -> 0.3F;
        case 1 -> 0.09F;
        case 2 -> 0.0027F;
        default -> 8.1E-4F;
    };
}
// 添加 minecraft:block_break_speed 属性作为乘法修饰符。
destroySpeed *= player.getAttributeValue(Attributes.BLOCK_BREAK_SPEED);
// 如果玩家在水下，则乘以SUBMERGED_MINING_SPEED。
if (player.isEyeInFluid(FluidTags.WATER)) {
    destroySpeed *= player.getAttributeValue(Attributes.SUBMERGED_MINING_SPEED);
}
// 如果玩家试图打破半空中的方块，则让玩家挖矿速度减慢 5 倍。
if (!player.onGround()) {
    destroySpeed /= 5;
}
destroySpeed = /* 此处会触发 PlayerEvent.BreakSpeed 事件，允许模组开发者进一步修改该值。*/;
return destroySpeed;
```

确切代码可参考 `Player#getDestroySpeed`。

### 游戏刻（Tick）

游戏刻是每 1/20 秒（即 50 毫秒）更新一次游戏各部分的机制。方块提供了多种以不同方式调用的刻更新方法。

#### 服务端游戏刻与刻调度

`BlockBehaviour#tick` 通过计划刻（scheduled tick）调用。计划刻可以通过使用 `Level#scheduleTick(BlockPos, Block, int)` 创建，其中 `int` 表示延迟的游戏刻数。原版在许多地方使用这一系统，例如大型垂滴叶的倾斜机制就高度依赖计划刻，各种红石组件也是典型使用者。

#### 客户端游戏刻

`Block#animateTick` 仅在客户端每帧调用。火把粒子生成等仅客户端行为就在这里发生。

#### 天气刻

天气刻由 `Block#handlePrecipitation` 处理，并独立于常规游戏刻运行。它只在服务端以某种形式降水时调用，每次触发的概率为 1/16。例如，炼药锅在降雨或降雪期间蓄水就使用了这一机制。

#### 随机刻

随机刻系统独立于常规游戏刻运行。必须通过调用该方块的 `BlockBehaviour.Properties#randomTicks()` 方法来启用随机刻。这样会使该方块加入随机刻机制。

每个游戏刻都会从区块中选取固定数量的方块进行随机刻。该数量由游戏规则 `randomTickSpeed` 定义。默认值为3，每刻都会从区块中随机选择 3 个方块；如果这些方块已启用随机刻，就会调用各自的 `BlockBehaviour#randomTick` 方法。

Minecraft 中有许多机制使用随机刻，例如植物生长、冰雪融化和铜氧化。

[attributes]: ../entities/attributes.md
[below]: #deferredregisterblocks-辅助方法
[blockentities]: ../blockentities/index.md
[blockstates]: states.md
[bsfile]: ../resources/client/models/index.md#blockstate-文件
[codec]: ../datastorage/codecs.md#records
[datagen]: ../resources/index.md#data-generation
[i18n]: ../resources/client/i18n.md
[item]: ../items/index.md
[leftclick]: ../items/interactions.md#左键点击-item
[loottable]: ../resources/server/loottables/index.md
[model]: ../resources/client/models/index.md
[registration]: ../concepts/registries.md#methods-for-registering
[rightclick]: ../items/interactions.md#右键点击-item
[sounds]: ../resources/client/sounds.md
[tags]: ../resources/server/tags.md
[textures]: ../resources/client/textures.md
[tool]: ../items/tools.md
[usingblocks]: #使用方块
[usingblockstates]: states.md#using-blockstates
