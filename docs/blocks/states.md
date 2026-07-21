# 方块状态（BlockState）

你经常会遇到需要让一个方块具有不同状态的情况。例如，小麦作物有八个生长阶段，为每个阶段创建独立方块显然不合理。又或者，你有一个台阶或类似台阶的方块——它可以处于下半、上半或上下两半同时存在的状态。

这正是方块状态（BlockState）发挥作用的地方。方块状态是一种用于表示方块不同状态的简便机制，例如作物的生长阶段或台阶的放置类型。

## 方块状态属性（Property）

方块状态使用属性系统。一个方块可以拥有多个不同类型的属性。

例如，末地传送门框架有两个属性：是否装有末影之眼（`eye`，2 种取值）以及朝向（`facing`，4 种取值），因此共有 8（2 × 4）种方块状态：

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

`blockid[property1=value1,property2=value,...]` 是以文本形式表示方块状态的标准写法，原版中的一些位置（例如命令）会使用这种写法。

即使方块没有定义任何方块状态属性，它仍然恰好有一种方块状态——因为没有可指定的属性，所以它就是不带任何属性的状态。该状态可写作 `minecraft:oak_planks[]`，也可以直接写作 `minecraft:oak_planks`。

与方块一样，每个 `BlockState` 在内存中只存在一个实例。这意味着可以且应当使用 `==` 比较 `BlockState`。`BlockState` 还是一个 `final` 类，因此无法被继承。**任何功能都应放在对应的[方块][block]类中！**

## 何时使用方块状态

### 方块状态 vs 独立方块

一个很实用的经验法则是：**如果名称不同，就应当是独立方块**。以制作椅子方块为例：椅子的方向应当作为属性，而不同木材类型则应拆分为不同方块。因此，每种木材类型各有一个椅子方块，每个椅子方块又有四种方块状态（每个方向一种）。

### 方块状态 vs [方块实体][blockentity]

这里的经验法则是：**如果状态数量有限，使用方块状态；如果状态数量无限或近乎无限，使用方块实体。** 方块实体可以存储任意数量的数据，但速度比方块状态慢。

方块状态与方块实体可以结合使用。例如，箱子使用方块状态属性表示方向、是否含水、是否组成大箱子等，而物品栏内容、当前是否打开以及与漏斗的交互等信息则由方块实体处理。

“多少种状态对方块状态来说才算太多？”并没有明确答案，但 NeoForge 建议：如果需要超过 8～9 位（bit）的数据，即超过几百种状态，就应改用 `BlockEntity`。

## 实现方块状态

要实现方块状态属性，请在方块类中创建或引用 `public static final Property<?>` 常量。虽然可以自行编写 `Property<?>` 实现，但原版代码提供了几种便捷实现，足以覆盖大多数用例：

- `IntegerProperty`
  - 实现 `Property<Integer>`，用于定义保存整数值的属性。请注意，它不支持负值。
  - 通过调用 `IntegerProperty#create(String name, int min, int max)` 创建。
- `BooleanProperty`
  - 实现 `Property<Boolean>`，用于定义保存 `true` 或 `false` 值的属性。
  - 通过调用 `BooleanProperty#create(String name)` 创建。
- `EnumProperty<E extends Enum<E>>`
  - 实现 `Property<E>`，用于定义可采用某个枚举类取值的属性。
  - 通过调用 `EnumProperty#create(String name, Class<E> enumClass)` 创建。
  - 也可以只使用枚举值的一个子集（例如 16 种 `DyeColor` 中的 4 种），请参阅 `EnumProperty#create` 的重载。

`BlockStateProperties` 类包含原版共用的属性。只要可行，就应使用或引用这些属性，而不是自行创建。

有了属性常量后，在方块类中重写 `Block#createBlockStateDefinition(StateDefinition.Builder)`。在该方法中调用 `StateDefinition.Builder#add(YOUR_PROPERTY);`。`StateDefinition.Builder#add` 接受可变参数，因此如果有多个属性，可以一次全部添加。

每个方块也都有默认状态。如果没有另行指定，默认状态会使用每个属性的默认值。可以在构造器中调用 `Block#registerDefaultState(BlockState)` 方法来更改默认状态。

如果希望更改放置方块时使用的 `BlockState`，请重写 `Block#getStateForPlacement(BlockPlaceContext)`。例如，可以根据玩家放置时所站位置或注视方向来设置方块的方向。

为了进一步说明，下面是 `EndPortalFrameBlock` 类的相关部分：

```java
public class EndPortalFrameBlock extends Block {
    // Note: It is possible to directly use the values in BlockStateProperties instead of referencing them here again.
    // However, for the sake of simplicity and readability, it is recommended to add constants like this.
    public static final EnumProperty<Direction> FACING = BlockStateProperties.FACING;
    public static final BooleanProperty EYE = BlockStateProperties.EYE;

    public EndPortalFrameBlock(BlockBehaviour.Properties properties) {
        super(properties);
        // stateDefinition.any() returns a random BlockState from an internal set,
        // we don't care because we're setting all values ourselves anyway
        this.registerDefaultState(stateDefinition.any()
                .setValue(FACING, Direction.NORTH)
                .setValue(EYE, false)
        );
    }

    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
        // this is where the properties are actually added to the state
        builder.add(FACING, EYE);
    }

    @Override
    @Nullable
    public BlockState getStateForPlacement(BlockPlaceContext ctx) {
        // code that determines which state will be used when
        // placing down this block, depending on the BlockPlaceContext
    }
}
```

## 使用方块状态

要从 `Block` 对象获取 `BlockState`，请调用 `Block#defaultBlockState()`。如上所述，可以通过 `Block#registerDefaultState` 更改默认方块状态。

要获取属性值，请调用 `BlockState#getValue(Property<?>)`，并传入要读取的属性。继续使用末地传送门框架示例，代码大致如下：

```java
// EndPortalFrameBlock.FACING is an EnumPropery<Direction> and thus can be used to obtain a Direction from the BlockState
Direction direction = endPortalFrameBlockState.getValue(EndPortalFrameBlock.FACING);
```

如果想获得属性值不同的 `BlockState`，只需在现有的 `BlockState` 上调用 `BlockState#setValue(Property<T>, T)`，并传入属性及其值。对示例中的末地传送门框架而言，大致如下：

```java
endPortalFrameBlockState = endPortalFrameBlockState.setValue(EndPortalFrameBlock.FACING, Direction.SOUTH);
```

:::info
`BlockState` 是不可变的。这意味着调用 `#setValue(Property<T>, T)` 时，实际上并不会修改原有方块状态；内部会执行查找，并返回具有这些确切属性值的唯一 `BlockState` 对象。这也意味着，仅调用 `state#setValue` 而不保存其返回结果（例如重新赋值给 `state`）不会产生任何效果。
:::

要从 `Level` 获取 `BlockState`，请使用 `Level#getBlockState(BlockPos)`。

### `Level#setBlock`

要在 `Level` 中设置 `BlockState`，请使用 `Level#setBlock(BlockPos, BlockState, int)`。

`int` 参数值得额外说明，因为它的含义并不直观。该参数表示所谓的更新标志（update flag）。

为了帮助正确设置更新标志，`Block` 中提供了多个以 `UPDATE_` 开头的 `int` 常量。如果需要组合多个标志，可以进行按位或运算（OR），例如 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS`。

- `Block.UPDATE_NEIGHBORS` 向相邻方块发送更新。更具体地说，它会调用 `Block#neighborChanged`，后者又会调用多个方法，其中大多数以某种方式与红石相关。
- `Block.UPDATE_CLIENTS` 将方块更新同步到客户端。
- `Block.UPDATE_INVISIBLE` 明确禁止更新客户端。它还会覆盖 `Block.UPDATE_CLIENTS`，使更新不被同步；方块仍会在服务端更新。
- `Block.UPDATE_IMMEDIATE` 强制在客户端主线程重新渲染。
- `Block.UPDATE_KNOWN_SHAPE` 阻止相邻方块更新继续递归。
- `Block.UPDATE_SUPPRESS_DROPS` 禁止该位置原有方块产生掉落物。
- `Block.UPDATE_MOVE_BY_PISTON` 仅供活塞代码使用，表示方块被活塞移动。它主要负责延迟光照引擎更新。
- `Block.UPDATE_SKIP_SHAPE_UPDATE_ON_WIRE` 由 `ExperimentalRedstoneWireEvaluator` 用于表示是否应跳过形状更新。只有当能量强度变化并非由放置导致，或信号的原始来源并非当前红石线时，才会设置该标志。
- `Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` 阻止调用 `BlockEntity#preRemoveSideEffects`。这通常会阻止 `BlockEntity` 清空其内容。
- `Block.UPDATE_SKIP_ON_PLACE` 阻止调用 `Block#onPlace`。这通常会阻止所有方块处理其初始行为，例如更新铁轨以连接其他方块或生成傀儡。
- `Block.UPDATE_NONE` 是 `Block.UPDATE_INVISIBLE | Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` 的别名。
- `Block.UPDATE_ALL` 是 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS` 的别名。
- `Block.UPDATE_ALL_IMMEDIATE` 是 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS | Block.UPDATE_IMMEDIATE` 的别名。
- `Block.UPDATE_SKIP_ALL_SIDEEFFECTS` 是 `Block.UPDATE_SKIP_ON_PLACE | Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS | Block.UPDATE_SUPPRESS_DROPS | Block.UPDATE_KNOWN_SHAPE` 的别名。

此外还有一个便利方法 `Level#setBlockAndUpdate(BlockPos pos, BlockState state)`，它会在内部调用 `setBlock(pos, state, Block.UPDATE_ALL)`。

[block]: index.md
[blockentity]: ../blockentities/index.md
