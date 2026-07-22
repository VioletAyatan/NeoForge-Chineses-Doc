# 方块实体（Block Entity）

当 [BlockState][blockstate] 不适合时，BlockEntity 可在 [Block][block] 上存储数据。尤其是对于物品栏这种具有非有限数量选项的数据。BlockEntity 固定不动并绑定到 Block，但除此之外与 [Entity][entities] 有许多相似之处，名称也由此而来。

:::info
如果你的 Block 只有数量有限且相对较少（最多几百种）的可能状态，可以考虑改用 [BlockState][blockstate]。
:::

## 创建并注册 BlockEntity

与 Entity 相同、但与 Block 不同，`BlockEntity` 类表示 BlockEntity 实例，而不是[已注册][registration]的单例对象。单例改由 `BlockEntityType<?>` 类表示。创建新的 BlockEntity 时，两者都需要。

先创建 BlockEntity 类：

```java
public class MyBlockEntity extends BlockEntity {
    public MyBlockEntity(BlockPos pos, BlockState state) {
        super(type, pos, state);
    }
}
```

你可能已经注意到，我们向超类构造器传入了未定义变量 `type`。暂时保留这个未定义变量，先进行注册。

[注册][registration]方式与 Entity 类似。创建关联单例类 `BlockEntityType<?>` 的实例，并将其注册到 BlockEntity type registry，如下所示：

```java
public static final DeferredRegister<BlockEntityType<?>> BLOCK_ENTITY_TYPES =
        DeferredRegister.create(Registries.BLOCK_ENTITY_TYPE, ExampleMod.MOD_ID);

public static final Supplier<BlockEntityType<MyBlockEntity>> MY_BLOCK_ENTITY = BLOCK_ENTITY_TYPES.register(
        "my_block_entity",
        // 方块实体类型。
        () -> new BlockEntityType<>(
                // 用于构造方块实体实例的 Supplier。
                MyBlockEntity::new,
                // 一个可选值；为 true 时，仅允许具有 OP 权限的玩家
                // 加载 NBT 数据（例如放置方块物品）
                false,
                // 可拥有此方块实体的方块 varargs。
                // 这里假定所引用的方块均以 DeferredBlock<Block> 形式存在。
                MyBlocks.MY_BLOCK_1.get(), MyBlocks.MY_BLOCK_2.get()
        )
);
```

:::info
请记住，必须把 `DeferredRegister` 注册到 [模组事件总线][modbus]！
:::

现在有了 BlockEntity type，就可以用它替换之前保留的 `type` 变量：

```java
public class MyBlockEntity extends BlockEntity {
    public MyBlockEntity(BlockPos pos, BlockState state) {
        super(MY_BLOCK_ENTITY.get(), pos, state);
    }
}
```

:::info
之所以采用这种看似令人困惑的设置流程，是因为 `BlockEntityType` 需要 `BlockEntityType.BlockEntitySupplier<T extends BlockEntity>`，它基本等同于 `BiFunction<BlockPos, BlockState, T extends BlockEntity>`。因此，拥有一个可通过 `::new` 直接引用的构造器非常有利。然而，我们还需要将构造出的 BlockEntity type 提供给 `BlockEntity` 唯一的默认构造器，所以必须在几处传递引用。
:::

最后，需要修改与 BlockEntity 关联的 Block 类。这意味着不能把 BlockEntity 附加到普通 `Block` 实例，而需要一个子类：

```java
// 重要部分是实现 EntityBlock 接口并重写 #newBlockEntity 方法。
public class MyEntityBlock extends Block implements EntityBlock {
    // 委托给 super 的构造器。
    public MyEntityBlock(BlockBehaviour.Properties properties) {
        super(properties);
    }

    // 在此返回方块实体的新实例。
    @Override
    public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
        return new MyBlockEntity(pos, state);
    }
}
```

然后当然需要在 [Block 注册][blockreg]时使用该类作为类型：

```java
public static final DeferredBlock<MyEntityBlock> MY_BLOCK_1 =
        BLOCKS.register("my_block_1", () -> new MyEntityBlock( /* ...*/ ));
public static final DeferredBlock<MyEntityBlock> MY_BLOCK_2 =
        BLOCKS.register("my_block_2", () -> new MyEntityBlock( /* ...*/ ));
```

## 存储数据

`BlockEntity` 的主要用途之一是存储数据。BlockEntity 上的数据存储可通过两种方式完成：读取和写入 [value I/O][valueio]，或使用[数据附件][dataattachments]。本节介绍 value I/O 的读写；数据附件请参阅所链接的文章。

:::info
顾名思义，数据附件的主要用途是将数据附加到现有 BlockEntity，例如原版或其他模组提供的 BlockEntity。对于你自己模组中的 BlockEntity，建议直接向 value I/O 保存数据、并直接从中加载数据。
:::

可以分别使用 `#loadAdditional` 和 `#saveAdditional` 方法从 [value I/O][valueio] 读取数据及向其写入数据。BlockEntity 同步到磁盘或通过网络同步时会调用这些方法。

```java
public class MyBlockEntity extends BlockEntity {
    // 只要能够通过 value I/O 序列化，就可以使用任意类型的任意值。
    // 作为示例，我们将使用 int。
    private int value;

    public MyBlockEntity(BlockPos pos, BlockState state) {
        super(MY_BLOCK_ENTITY.get(), pos, state);
    }

    // 从此处读取传递的 ValueInput 中的值。
    @Override
    public void loadAdditional(ValueInput input) {
        super.loadAdditional(input);
        // 如果不存在则默认为 0。有关详细信息，请参阅 ValueIO 文章。
        this.value = input.getIntOr("value", 0);
    }

    // 将值保存到此处传递的 ValueOutput 中。
    @Override
    public void saveAdditional(ValueOutput output) {
        super.saveAdditional(output);
        output.putInt("value", this.value);
    }
}
```

在这两个方法中，调用 super 十分重要，因为它会添加位置等基本信息。Tag 名称 `id`、`x`、`y`、`z`、`NeoForgeData` 和 `neoforge:attachments` 由 super 方法保留，因此不应自行使用。

当然，你会希望设置其他值，而不是只使用默认值。可以像处理其他字段一样自由设置。不过，如果希望游戏保存这些更改，之后必须调用 `#setChanged()`，该方法会将 BlockEntity 所在 chunk 标记为 dirty（即需要保存）。如果不调用此方法，保存时可能会跳过该 BlockEntity，因为 Minecraft 的保存系统只保存标记为 dirty 的 chunk。

### 移除 BlockEntity

有时你可能希望 BlockEntity 在移除时导出所存储的数据（例如被玩家破坏时掉落其物品栏内容）。在这些情况下，应在 `BlockEntity#preRemoveSideEffects` 中处理逻辑。默认情况下，如果你的 BlockEntity 实现了 [`Container`][container]，它就会掉落所存储的内容。

```java
public class MyBlockEntity extends BlockEntity {

    @Override
    public void preRemoveSideEffects(BlockPos pos, BlockState state) {
        super.preRemoveSideEffects(pos, state);
        // 在此处执行删除时的任何剩余导出逻辑。
    }
}
```

:::warning
使用 `Block.UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS` flag 移除的 Block 不会调用此方法。使用 clone 命令，或以 strict mode 放置 structure 时，通常就是这种情况。
:::

如果相邻 Block 需要知道 BlockEntity 被破坏（例如物品栏通过 comparator 输出红石信号），则你的 Block 应覆盖 `BlockBehaviour#affectNeighborsAfterRemoval`。输出红石信号的 BlockEntity 通常会在这里调用 `Containers#updateNeighboursAfterDestroy`。

```java
public class MyEntityBlock extends Block implements EntityBlock {

    @Override
    protected void affectNeighborsAfterRemoval(BlockState state, ServerLevel level, BlockPos pos, boolean movedByPiston) {
        // 处理要对周围方块执行的任意逻辑
        Containers.updateNeighboursAfterDestroy(state, level, pos);
    }
}
```

## Ticker

BlockEntity 的另一个常见用途是 tick，通常会与所存储的数据配合使用。Tick 表示每个 game tick 都执行一些代码。具体方法是覆盖 `EntityBlock#getTicker` 并返回 `BlockEntityTicker`；后者基本上是一个带四个参数（Level、位置、BlockState 和 BlockEntity）的 consumer，如下所示：

```java
// 注意：ticker 定义在方块中，而不是方块实体中。不过，通常最好
// 以某种方式把 tick 逻辑保留在方块实体中，例如定义 static #tick 方法。
public class MyEntityBlock extends Block implements EntityBlock {
    // 在此处理其他内容

    // 由于泛型转换，我们在这里使用第二种方法
    // 如果继承 `BaseEntityBlock`，该方法也可作为 protected static 方法使用
    private static <E extends BlockEntity, A extends BlockEntity> @Nullable BlockEntityTicker<A> createTickerHelper(
        BlockEntityType<A> type, BlockEntityType<E> checkedType, BlockEntityTicker<? super E> ticker
    ) {
        return checkedType == type ? (BlockEntityTicker<A>) ticker : null;
    }

    @Override
    public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState state, BlockEntityType<T> type) {
        // 可以根据任意条件返回不同的 ticker。常见用法包括
        // 在客户端和服务端返回不同的 ticker、从一开始就只在一端执行 tick，
        // 或仅为某些方块状态返回 ticker（例如使用 "机器正在工作" 的方块状态 property 时）。
        return createTickerHelper(type, MY_BLOCK_ENTITY.get(), MyBlockEntity::tick);
    }
}

public class MyBlockEntity extends BlockEntity {
    // 在此处理其他内容

    // 此方法的签名与 BlockEntityTicker 函数式接口的签名一致。
    public static void tick(Level level, BlockPos pos, BlockState state, MyBlockEntity blockEntity) {
        // 在此执行 tick 期间所需的任意逻辑。
        // 例如，可以在此更改合成进度值或消耗能量。
    }
}
```

请注意，`#tick` 方法确实会在每个 tick 调用。因此应尽量避免在这里进行大量复杂计算，例如可以只每隔 X 个 tick 计算一次，或缓存结果。

## 同步

BlockEntity 逻辑通常在服务端运行。因此，我们需要把正在进行的操作告知客户端。共有三种方式：加载 chunk 时同步、更新 Block 时同步，或使用自定义 packet。通常只应在必要时同步信息，以免不必要地阻塞网络。

### 加载 Chunk 时同步

每当从网络或磁盘读取 chunk 时，chunk 都会加载（因此会使用此方法）。要在此发送数据，需要覆盖以下方法：

```java
public class MyBlockEntity extends BlockEntity {
    // ...

    // 在此创建更新标签。对于只有少量字段的方块实体，可以直接调用 #saveWithoutMetadata。
    @Override
    public CompoundTag getUpdateTag(HolderLookup.Provider registries) {
        return this.saveWithoutMetadata(registries);
    }

    // 在此处理收到的更新标签。默认实现在此调用 #loadWithComponents；
    // 如果不需要执行其他操作，就无需重写此方法。
    @Override
    public void handleUpdateTag(ValueInput input) {
        super.handleUpdateTag(input);
    }
}
```

### 更新 Block 时同步

每次发生 Block update 时都会使用此方法。Block update 必须手动触发，但通常比 chunk 同步处理得更快。

```java
public class MyBlockEntity extends BlockEntity {
    // ...

    // 在这里创建一个更新标签，如上所示。
    @Override
    public CompoundTag getUpdateTag(HolderLookup.Provider registries) {
        return this.saveWithoutMetadata(registries);
    }

    // 在此返回更新数据包。返回非 null 结果会让游戏使用该数据包进行同步。
    @Override
    public Packet<ClientGamePacketListener> getUpdatePacket() {
        // 该数据包使用 #getUpdateTag 返回的 CompoundTag。#create 还提供另一个重载，
        // 可指定自定义更新标签，并省略客户端不需要的数据。
        return ClientboundBlockEntityDataPacket.create(this);
    }

    // 可选：收到数据包时运行一些自定义逻辑。
    // super/default 实现转发到 #loadWithComponents。
    @Override
    public void onDataPacket(Connection connection, ValueInput input) {
        super.onDataPacket(connection, input);
        // 在此执行所需的任意逻辑。
    }
}
```

要实际发送 packet，必须在服务端调用 `Level#sendBlockUpdated(BlockPos pos, BlockState oldState, BlockState newState, int flags)` 来触发更新通知。位置应是 BlockEntity 的位置，可通过 `BlockEntity#getBlockPos` 获取。两个 BlockState 参数都可以是 BlockEntity 所在位置的 BlockState，可通过 `BlockEntity#getBlockState` 获取。最后，`flags` 参数是更新 mask，与 [`Level#setBlock`][setblock] 中使用的相同。

### 使用自定义 Packet

使用专用更新 packet 后，可以在任何需要的时候自行发送 packet。这是用途最广泛、但也最复杂的变体，因为它需要设置网络处理器。可以使用 `PacketDistrubtor#sendToPlayersTrackingChunk` 向所有正在追踪该 BlockEntity 的玩家发送 packet。更多信息请参阅[网络][networking]章节。

:::warning
执行安全检查十分重要，因为消息到达玩家时，`BlockEntity` 可能已被销毁或替换。还应通过 `Level#hasChunkAt` 检查 chunk 是否已加载。
:::

[block]: ../blocks/index.md
[blockreg]: ../blocks/index.md#basic-blocks
[blockstate]: ../blocks/states.md
[container]: ../inventories/container.md
[dataattachments]: ../datastorage/attachments.md
[entities]: ../entities/index.md
[modbus]: ../concepts/events.md#事件总线
[networking]: ../networking/index.md
[registration]: ../concepts/registries.md#methods-for-registering
[setblock]: ../blocks/states.md#levelsetblock
[valueio]: ../datastorage/valueio.md
