# 方块状态（BlockState）

你经常会遇到希望一个方块具有不同状态的情况。例如，小麦作物有八个生长阶段，为每个阶段分别创建一个方块显然不太合适。又或者，你有一个台阶或类似台阶的 Block，一种下半状态、一种上半状态，以及一种同时包含上下两部分的状态。

这正是**方块状态（BlockState）**发挥作用的地方。**方块状态**是表达一个方块所能拥有的不同状态的一种简单方式，例如生长阶段或台阶的放置类型。

## 方块状态属性（BlockState Property）

**方块状态**使用一套 Property 系统。一个方块可以拥有多个不同类型的 Property。例如，末地传送门框架有两个 Property：是否放置了末影之眼（`eye`，2 种取值），以及它所朝向的方向（`facing`，4 种取值）。因此，末地传送门框架总共有 8（2 * 4）种不同的方块状态：

```
minecraft:end_portal_frame[facing=north,eye=false]
minecraft:end_portal_frame[facing=east,eye=false]
minecraft:end_portal_frame[facing=south,eye=false]
minecraft:end_portal_frame[facing=west,eye=false]
minecraft:end_portal_frame[facing=north,eye=true]
minecraft:end_portal_frame[facing=east,eye=true]
minecraft:end_portal_frame[facing=south,eye=true]
minecraft:end_portal_frame[facing=west,eye=true]
```

`blockid[property1=value1,property2=value,...]` 这种写法是在文本中表示方块状态的标准格式，并被原版游戏用于某些位置，例如命令中。

如果你的方块没有定义任何 `BlockState Property`，它仍然恰好拥有一个**方块状态** — 也就是不包含任何 `Property` 的状态，因为没有 `Property` 需要指定。

它可以表示为 `minecraft:oak_planks[]`，也可以直接表示为 `minecraft:oak_planks`。

与方块一样，每个 `BlockState` 在内存中也只存在一个实例。这意味着可以并且应该使用 `==` 比较 `BlockState`。`BlockState` 还是一个 final 类，这意味着它不能被继承。**所有功能都应放在对应的 [Block][block] 类中！**

## 何时使用方块状态

### 方块状态 vs 独立方块

优秀经验法则是：**如果名称不同，就应该是不同的方块**。例如，在制作椅子方块时，椅子的方向应该是一个 Property，而不同的木材类型应该分别使用不同的方块。因此，每种木材类型都应有一个对应的椅子方块，而每个椅子方块都有四种方块状态（每个方向一种）。

### 方块状态 vs [方块实体][blockentity]

这里的经验法则是：**如果状态数量有限，则使用方块状态；如果状态数量无限或接近无限，则使用方块实体。**方块实体可以存储任意数量的数据，但速度比方块状态慢。

**方块状态**和**方块实体**可以结合使用。例如，箱子使用 BlockState Property 表示方向、是否含水或是否组成大箱子等状态，而物品栏的存储、当前是否打开以及与漏斗的交互，则由方块实体处理。

对于“一个方块拥有多少种状态才算过多？”这个问题，并没有标准答案，但我们建议，如果需要超过 8 到 9 bit 的数据（即超过几百种状态），则应该改用 Block Entity。

## 实现方块状态

要实现一个 BlockState Property，请在你的 Block 类中创建或引用一个 `public static final Property<?>` 常量。虽然你可以自由创建自己的 `Property<?>` 实现，但原版代码提供了几种便捷实现，应该能够覆盖大多数使用场景：

- `IntegerProperty`
  - 实现了 `Property<Integer>`。定义一个保存整数值的 Property。请注意，不支持负数。
  - 通过调用 `IntegerProperty#create(String name, int min, int max)` 创建。
- `BooleanProperty`
  - 实现了 `Property<Boolean>`。定义一个保存 `true` 或 `false` 值的 Property。
  - 通过调用 `BooleanProperty#create(String name)` 创建。
- `EnumProperty<E extends Enum<E>>`
  - 实现了 `Property<E>`。定义一个可以使用某个 Enum 类中值的 Property。
  - 通过调用 `EnumProperty#create(String name, Class<E> enumClass)` 创建。
  - 也可以只使用 Enum 值的一部分（例如 16 种 `DyeColor` 中的 4 种），请参阅 `EnumProperty#create` 的重载方法。

`BlockStateProperties` 类包含原版共享的 Property。应尽可能使用或引用这些 Property，而不是创建自己的 Property。

获得 Property 常量后，在你的 Block 类中重写 `Block#createBlockStateDefinition(StateDefinition.Builder)`。在该方法中，调用 `StateDefinition.Builder#add(YOUR_PROPERTY);`。`StateDefinition.Builder#add` 使用可变参数，因此，如果你有多个 Property，可以一次性将它们全部添加。

每个方块还会拥有一个默认状态。如果没有另行指定，默认状态会使用每个 Property 的默认值。你可以在构造方法中调用 `Block#registerDefaultState(BlockState)` 来修改默认状态。

如果希望修改放置方块时所使用的 `BlockState`，请重写 `Block#getStateForPlacement(BlockPlaceContext)`。例如，可以通过该方法根据玩家放置方块时所站的位置或视线方向设置方块的朝向。

为了进一步说明，下面是 `EndPortalFrameBlock` 类中相关部分的代码：

```java
public class EndPortalFrameBlock extends Block {
    // 注意：可以直接使用 BlockStateProperties 中的值，而不必在这里再次引用它们。
    // 但是，为了简单性和可读性，建议像这样添加常量。
    public static final EnumProperty<Direction> FACING = BlockStateProperties.FACING;
    public static final BooleanProperty EYE = BlockStateProperties.EYE;

    public EndPortalFrameBlock(BlockBehaviour.Properties properties) {
        super(properties);
        // stateDefinition.any() 会从内部集合中返回一个随机的 BlockState，
        // 但这并不重要，因为我们无论如何都会自行设置所有值
        this.registerDefaultState(stateDefinition.any()
                .setValue(FACING, Direction.NORTH)
                .setValue(EYE, false)
        );
    }

    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
        // Property 实际上是在这里添加到状态中的
        builder.add(FACING, EYE);
    }

    @Override
    @Nullable
    public BlockState getStateForPlacement(BlockPlaceContext ctx) {
        // 根据 BlockPlaceContext，确定放置该方块时
        // 将使用哪个状态的代码
    }
}
```

## 使用方块状态

要从 `Block` 获取 `BlockState`，请调用 `Block#defaultBlockState()`。如上文所述，可以通过 `Block#registerDefaultState` 修改默认 BlockState。

你可以调用 `BlockState#getValue(Property<?>)` 获取一个 Property 的值，并将需要获取值的 Property 传入该方法。继续使用末地传送门框架的示例，代码大致如下：

```java
// EndPortalFrameBlock.FACING 是 EnumPropery<Direction>，因此可以使用它从 BlockState 中获取 Direction
Direction direction = endPortalFrameBlockState.getValue(EndPortalFrameBlock.FACING);
```

如果希望获得一组值不同的 `BlockState`，只需在现有 BlockState 上调用 `BlockState#setValue(Property<T>, T)`，并传入 Property 及其值。以我们的拉杆为例，代码大致如下：

```java
endPortalFrameBlockState = endPortalFrameBlockState.setValue(EndPortalFrameBlock.FACING, Direction.SOUTH);
```

:::info
`BlockState` 是不可变的。这意味着，当你调用 `#setValue(Property<T>, T)` 时，实际上并没有修改该 BlockState。内部会执行一次查找，并返回你所请求的 BlockState 对象，而它是拥有这些确切 Property 值的唯一对象。这也意味着，如果只是调用 `state#setValue`，却不将其保存到变量中（例如重新保存到 `state`），那么该调用不会产生任何效果。
:::

要从 Level 中获取 `BlockState`，请使用 `Level#getBlockState(BlockPos)`。

### `Level#setBlock`

要在 Level 中设置一个 `BlockState`，请使用 `Level#setBlock(BlockPos, BlockState, int)`。

`int` 参数需要额外说明，因为它的含义并不直观。它表示所谓的更新标志。

为了帮助正确设置更新标志，`Block` 中提供了多个以 `UPDATE_` 开头的 `int` 常量。如果希望将它们组合起来，可以对这些常量执行按位或运算（例如 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS`）。

- `Block.UPDATE_NEIGHBORS` 向相邻方块发送更新。更准确地说，它会调用 `Block#neighborChanged`，而该方法会调用多个其他方法，其中大多数都以某种方式与红石相关。
- `Block.UPDATE_CLIENTS` 将方块更新同步到客户端。
- `Block.UPDATE_INVISIBLE` 明确表示不在客户端更新。它还会覆盖 `Block.UPDATE_CLIENTS`，使该更新不同步。Block 始终会在服务端更新。
- `Block.UPDATE_IMMEDIATE` 强制在客户端主线程中重新渲染。
- `Block.UPDATE_KNOWN_SHAPE` 停止相邻方块更新递归。
- `Block.UPDATE_SUPPRESS_DROPS` 禁用该位置原有方块的掉落物。
- `Block.UPDATE_MOVE_BY_PISTON` 仅由活塞代码使用，用于表示该方块是由活塞移动的。它主要负责延迟光照引擎更新。
- `Block.UPDATE_SKIP_SHAPE_UPDATE_ON_WIRE` 由 `ExperimentalRedstoneWireEvaluator` 使用，用于表示是否应该跳过形状更新。仅当能量强度的改变不是由放置引起，或者信号的原始来源不是当前红石线时，才会设置该标志。
- `Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` 阻止调用 `BlockEntity#preRemoveSideEffects`。这通常会阻止 Block Entity 清空其内容。
- `Block.UPDATE_SKIP_ON_PLACE` 阻止调用 `Block#onPlace`。这通常会阻止任何方块处理其初始行为（例如更新铁轨以连接其他 Block，或生成铁傀儡）。
- `Block.UPDATE_NONE` 是 `Block.UPDATE_INVISIBLE | Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` 的别名。
- `Block.UPDATE_ALL` 是 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS` 的别名。
- `Block.UPDATE_ALL_IMMEDIATE` 是 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS | Block.UPDATE_IMMEDIATE` 的别名。
- `Block.UPDATE_SKIP_ALL_SIDEEFFECTS` 是 `Block.UPDATE_SKIP_ON_PLACE | Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS | Block.UPDATE_SUPPRESS_DROPS | Block.UPDATE_KNOWN_SHAPE` 的别名。

此外还有一个便捷方法 `Level#setBlockAndUpdate(BlockPos pos, BlockState state)`，它会在内部调用 `setBlock(pos, state, Block.UPDATE_ALL)`。

[block]: index.md
[blockentity]: ../blockentities/index.md
