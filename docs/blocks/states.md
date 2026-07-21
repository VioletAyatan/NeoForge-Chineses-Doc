# 方块状态（BlockState）

你经常会遇到需要一个 Block 具有不同状态的情况。例如，小麦作物有八个生长阶段，为每个阶段创建单独的 Block 显得不合理。又或者你有一个台阶或类似台阶的 Block——一个下半状态、一个上半状态，以及一个同时包含上下两半的状态。

这正是 BlockState 发挥作用的地方。BlockState 是表示 Block 可具有的不同状态（例如生长阶段或台阶放置类型）的一种简便方式。

## BlockState Property

BlockState 使用 property 系统。一个 Block 可以拥有多个不同类型的 property。例如，末地传送门框架有两个 property：是否装有末影之眼（`eye`，2 个选项），以及放置朝向（`facing`，4 个选项）。因此，末地传送门框架共有 8（2 * 4）种不同 BlockState：

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

`blockid[property1=value1,property2=value,...]` 是以文本形式表示 BlockState 的标准写法，原版中的一些位置（例如命令）会使用这种写法。

即使你的 Block 没有定义任何 BlockState property，它仍然恰好有一种 BlockState——因为没有可指定的 property，所以就是不带任何 property 的状态。它可写作 `minecraft:oak_planks[]`，也可以直接写作 `minecraft:oak_planks`。

与 Block 一样，每个 `BlockState` 在内存中只存在一次。这意味着可以且应当使用 `==` 比较 `BlockState`。`BlockState` 还是 `final` 类，因此无法扩展。**任何功能都应放在对应的 [Block][block] 类中！**

## 何时使用 BlockState

### BlockState 与独立 Block

一个很实用的经验法则是：**如果名称不同，就应当是独立 Block**。以制作椅子 Block 为例：椅子的方向应当是 property，而不同木材类型则应拆分为不同 Block。因此，每种木材类型各有一个椅子 Block，每个椅子 Block 又有四种 BlockState（每个方向一种）。

### BlockState 与 [BlockEntity][blockentity]

这里的经验法则是：**如果状态数量有限，使用 BlockState；如果状态数量无限或近乎无限，使用 BlockEntity。** BlockEntity 可以存储任意数量的数据，但速度比 BlockState 慢。

BlockState 与 BlockEntity 可以结合使用。例如，箱子使用 BlockState property 表示方向、是否含水、是否组成大箱子等，而物品栏、当前是否打开、与漏斗交互等则由 BlockEntity 处理。

“多少种状态对 BlockState 来说才算太多？”并没有明确答案，但我们建议：如果需要超过 8–9 bit 的数据（即几百种以上状态），应改用 BlockEntity。

## 实现 BlockState

要实现 BlockState property，请在 Block 类中创建或引用 `public static final Property<?>` 常量。虽然你可以自由编写自己的 `Property<?>` 实现，但原版代码提供了几种便利实现，足以覆盖大多数用例：

- `IntegerProperty`
    - 实现 `Property<Integer>`。定义保存整数值的 property。请注意，不支持负值。
    - 通过调用 `IntegerProperty#create(String name, int min, int max)` 创建。
- `BooleanProperty`
    - 实现 `Property<Boolean>`。定义保存 `true` 或 `false` 值的 property。
    - 通过调用 `BooleanProperty#create(String name)` 创建。
- `EnumProperty<E extends Enum<E>>`
    - 实现 `Property<E>`。定义可以采用某个枚举类的值的 property。
    - 通过调用 `EnumProperty#create(String name, Class<E> enumClass)` 创建。
    - 也可以只使用枚举值的一个子集（例如 16 种 `DyeColor` 中的 4 种），请参阅 `EnumProperty#create` 的重载。

`BlockStateProperties` 类包含原版共用 property。只要可行，就应使用或引用这些 property，而不是自行创建。

有了 property 常量后，在 Block 类中覆盖 `Block#createBlockStateDefinition(StateDefinition.Builder)`。在该方法中调用 `StateDefinition.Builder#add(YOUR_PROPERTY);`。`StateDefinition.Builder#add` 有 vararg 参数，因此如果有多个 property，可以一次全部添加。

每个 Block 也都有默认状态。如果没有另行指定，默认状态会使用每个 property 的默认值。可以从构造器调用 `Block#registerDefaultState(BlockState)` 方法来更改默认状态。

如果希望更改放置 Block 时使用的 `BlockState`，请覆盖 `Block#getStateForPlacement(BlockPlaceContext)`。例如，可以根据玩家放置时所站位置或注视方向来设置 Block 的方向。

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

## 使用 BlockState

要从 `Block` 获得 `BlockState`，调用 `Block#defaultBlockState()`。如上所述，可以通过 `Block#registerDefaultState` 更改默认 BlockState。

要获取 property 的值，调用 `BlockState#getValue(Property<?>)`，并传入想要获取值的 property。继续使用末地传送门框架示例，代码大致如下：

```java
// EndPortalFrameBlock.FACING is an EnumPropery<Direction> and thus can be used to obtain a Direction from the BlockState
Direction direction = endPortalFrameBlockState.getValue(EndPortalFrameBlock.FACING);
```

如果想获得一组值不同的 `BlockState`，只需在现有 BlockState 上调用 `BlockState#setValue(Property<T>, T)`，并传入 property 及其值。对示例中的末地传送门框架而言，大致如下：

```java
endPortalFrameBlockState = endPortalFrameBlockState.setValue(EndPortalFrameBlock.FACING, Direction.SOUTH);
```

:::info
`BlockState` 是 immutable 的。这意味着调用 `#setValue(Property<T>, T)` 时，实际上并未修改 BlockState；内部会执行查找，并返回你所请求的 BlockState 对象，即具有这些确切 property 值、唯一存在的对象。这也意味着，仅调用 `state#setValue` 而不将结果保存到变量中（例如重新赋给 `state`）不会产生任何效果。
:::

要从 Level 获取 `BlockState`，使用 `Level#getBlockState(BlockPos)`。

### `Level#setBlock`

要在 Level 中设置 `BlockState`，使用 `Level#setBlock(BlockPos, BlockState, int)`。

`int` 参数值得额外说明，因为它的含义并不直观。它表示所谓的 update flag。

为了帮助正确设置 update flag，`Block` 中提供了多个以 `UPDATE_` 开头的 `int` 常量。如果希望组合它们，可以按位 OR（例如 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS`）。

- `Block.UPDATE_NEIGHBORS` 向相邻 Block 发送更新。更具体地说，它会调用 `Block#neighborChanged`，后者又会调用多个方法，其中大多数以某种方式与红石相关。
- `Block.UPDATE_CLIENTS` 将 Block update 同步到客户端。
- `Block.UPDATE_INVISIBLE` 明确不在客户端更新。它也会覆盖 `Block.UPDATE_CLIENTS`，使更新不被同步。Block 始终会在服务端更新。
- `Block.UPDATE_IMMEDIATE` 强制在客户端主线程重新渲染。
- `Block.UPDATE_KNOWN_SHAPE` 停止相邻更新递归。
- `Block.UPDATE_SUPPRESS_DROPS` 禁用该位置旧 Block 的掉落物。
- `Block.UPDATE_MOVE_BY_PISTON` 仅供活塞代码使用，表示 Block 被活塞移动。它主要负责延迟光照引擎更新。
- `Block.UPDATE_SKIP_SHAPE_UPDATE_ON_WIRE` 由 `ExperimentalRedstoneWireEvaluator` 用于表示是否应跳过 shape。只有当能量强度变化并非由放置导致，或信号的原始来源并非当前红石线时才会设置它。
- `Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` 阻止调用 `BlockEntity#preRemoveSideEffects`。这通常会阻止 BlockEntity 清空其内容。
- `Block.UPDATE_SKIP_ON_PLACE` 阻止调用 `Block#onPlace`。这通常会阻止所有 Block 处理其初始行为（例如更新铁轨以连接其他 Block、生成傀儡）。
- `Block.UPDATE_NONE` 是 `Block.UPDATE_INVISIBLE | Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` 的别名。
- `Block.UPDATE_ALL` 是 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS` 的别名。
- `Block.UPDATE_ALL_IMMEDIATE` 是 `Block.UPDATE_NEIGHBORS | Block.UPDATE_CLIENTS | Block.UPDATE_IMMEDIATE` 的别名。
- `Block.UPDATE_SKIP_ALL_SIDEEFFECTS` 是 `Block.UPDATE_SKIP_ON_PLACE | Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS | Block.UPDATE_SUPPRESS_DROPS | Block.UPDATE_KNOWN_SHAPE` 的别名。

此外还有一个便利方法 `Level#setBlockAndUpdate(BlockPos pos, BlockState state)`，它会在内部调用 `setBlock(pos, state, Block.UPDATE_ALL)`。

[block]: index.md
[blockentity]: ../blockentities/index.md
