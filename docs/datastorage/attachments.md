# 数据附件（Data Attachments）

数据附件系统允许模组把额外数据附加并存储到 BlockEntity、区块、Entity 和 Level 上。

_若要存储额外的 Level 数据，也可以使用[数据存档][saveddata]。_

:::info
用于 ItemStack 的数据附件已由原版[数据组件][datacomponents]取代。
:::

## 创建附件类型

要使用该系统，需要注册一个 `AttachmentType`。附件类型包含以下配置：

- 默认值 supplier，在首次访问数据时创建实例。
- 如果附件需要持久化，则提供可选的 serializer。
- 如果配置了 serializer，则可使用 `copyOnDeath` 标志，在 Entity 死亡时自动复制数据（见下文）。

:::tip
如果不希望附件持久化，请不要提供 serializer。
:::

提供附件 serializer 有多种方式：直接实现 `IAttachmentSerializer`；实现 [`ValueIOSerializable`][valueio] 并使用静态方法 `AttachmentType#serializable` 创建 builder；或者向 builder 提供 MapCodec。

无论使用哪种方式，附件都**必须注册**到 `NeoForgeRegistries.ATTACHMENT_TYPES` 注册表。示例如下：

```java
// 为附件类型创建 DeferredRegister
private static final DeferredRegister<AttachmentType<?>> ATTACHMENT_TYPES = DeferredRegister.create(NeoForgeRegistries.ATTACHMENT_TYPES, MOD_ID);

// 通过 ValueIOSerializable 进行序列化
private static final Supplier<AttachmentType<ItemStacksResourceHandler>> HANDLER = ATTACHMENT_TYPES.register(
    "handler", () -> AttachmentType.serializable(() -> new ItemStacksResourceHandler(1)).build()
);
// 通过映射编解码器序列化
private static final Supplier<AttachmentType<Integer>> MANA = ATTACHMENT_TYPES.register(
    "mana", () -> AttachmentType.builder(() -> 0).serialize(Codec.INT.fieldOf("mana")).build()
);
// 无序列化
private static final Supplier<AttachmentType<SomeCache>> SOME_CACHE = ATTACHMENT_TYPES.register(
    "some_cache", () -> AttachmentType.builder(() -> new SomeCache()).build()
);

// 在你的模组构造器中，不要忘记将 DeferredRegister 注册到你的模组总线：
ATTACHMENT_TYPES.register(modBus);
```

## 使用附件类型

附件类型注册后，可以用于任何 holder 对象。如果当前没有数据，调用 `getData` 会附加一个新的默认实例。

```java
// 获取 ItemStacksResourceHandler（如果已存在），否则附加一个新：
ItemStacksResourceHandler handler = chunk.getData(HANDLER);
// 获取当前玩家的法力值（如果可用），否则附加 0：
int playerMana = player.getData(MANA);
// 等等...
```

如果不希望自动附加默认实例，可以先用 `hasData` 检查：

```java
// 执行任何操作前，检查该区块是否具有 HANDLER 附件。
if (chunk.hasData(HANDLER)) {
    ItemStacksResourceHandler handler = chunk.getData(HANDLER);
    // 用 chunk.getData(HANDLER) 做一些事情。
}
```

也可以使用 `setData` 更新数据：

```java
// 法力增加 10。
player.setData(MANA, player.getData(MANA) + 10);
```

:::important
通常，修改 BlockEntity 和区块后，需要通过 `setChanged` 和 `setUnsaved(true)` 将其标记为 dirty。调用 `setData` 时会自动完成这一步：

```java
chunk.setData(MANA, chunk.getData(MANA) + 10); // 会自动调用setUnsaved
```

但是，如果修改的是通过 `getData` 取得的数据（包括新创建的默认实例），则必须显式把 BlockEntity 和区块标记为 dirty：

```java
var mana = chunk.getData(MUTABLE_MANA);
mana.set(10);
chunk.setUnsaved(true); // 必须手动完成，因为我们没有使用setData
```
:::

## 与客户端共享数据

若要把 BlockEntity、区块、Level 或 Entity 的附件同步到客户端，可以在 builder 中实现 `sync`。当附件通过 `AttachmentHolder#getData` 默认创建、通过 `AttachmentHolder#setData` 更新，或通过 `AttachmentHolder#removeData` 移除时，都会发送给客户端。如果还要在其他时机发送数据，可以调用 `AttachmentHolder#syncData` 并传入 `AttachmentType` 进行同步。

`AttachmentType.Builder#sync` 有三个重载，但它们最终都会创建一个 `AttachmentSyncHandler<T>`，其中 `T` 是数据附件的类型。处理器包含三个方法：两个方法负责从网络 `read` 和向网络 `write`；另一个方法 `sendToPlayer` 判断指定玩家是否可以看到 holder 广播的数据。移除数据附件时会忽略 sync 处理器。

```java
public class ExampleSyncHandler implements AttachmentSyncHandler<ExampleData> {

    @Override
    public void write(RegistryFriendlyByteBuf buf, ExampleData attachment, boolean initialSync) {
        // 将附件数据写入缓冲区
        // 如果`initialSync`是true，你应该写完整的附件，因为客户没有任何先前的数据
        // 如果`initialSync`是false，你可以选择只写入你想要更新的数据
        
        // 示例：
        if (initialSync) {
            // 写入整个附件
            ExampleData.STREAM_CODEC.encode(buf, attachment);
        } else {
            // 写入更新数据
        }
    }

    @Override
    @Nullable
    public ExampleData read(IAttachmentHolder holder, RegistryFriendlyByteBuf buf, @Nullable ExampleData previousValue) {
        // 从缓冲区读取数据和返回新数据附件如果客户端上没有先前数据，则
        // `previousValue` 为 `null`
        // 如果应删除数据附件，结果应为返回 `null`

        // 示例：
        if (previousValue == null) {
            // 阅读整个附件
            return ExampleData.STREAM_CODEC.decode(buf);
        } else {
            // 读取更新数据并合并到之前的值
            return previousValue;
        }
    }

    @Override
    public boolean sendToPlayer(IAttachmentHolder holder, ServerPlayer to) {
        // 返回持有者数据是否同步到给定的玩家客户端
        // 根据附件 Holder 的不同，检查的玩家也不同：
        // - 方块实体：所有正在追踪该方块实体所在区块的玩家
        // - 区块：所有正在追踪该区块的玩家
        // - 实体：所有正在追踪当前实体的玩家；如果当前玩家是附件持有者，也包括该玩家
        // - 世界：当前维度／世界中的所有玩家

        // 示例：
        // 仅当附件持有者时才发送附件
        return holder == to;
    }
}
```

另两个委托给 `AttachmentSyncHandler` 的重载，会接收用于 `read` 和 `write` 的 [`StreamCodec`][streamcodec]，以及用于 `sendToPlayer` 的可选 predicate。

```java
// 假设 ExampleData 有一些流编解码器 STREAM_CODEC

// 同步处理器
public static final Supplier<AttachmentType<ExampleData>> WITH_SYNC_HANDLER = ATTACHMENT_TYPES.register(
    "with_sync_handler", () -> AttachmentType.builder(() -> new ExampleData())
        .sync(new ExampleSyncHandler())
        .build()
);


// 流编解码器
public static final Supplier<AttachmentType<ExampleData>> WITH_STREAM_CODEC = ATTACHMENT_TYPES.register(
    "with_stream_codec", () -> AttachmentType.builder(() -> new ExampleData())
        .sync(ExampleData.STREAM_CODEC)
        .build()
);

// 带谓词的流编解码器
public static final Supplier<AttachmentType<ExampleData>> WITH_PREDICATE = ATTACHMENT_TYPES.register(
    "with_predicate", () -> AttachmentType.builder(() -> new ExampleData())
        .sync((holder, to) -> holder == to, ExampleData.STREAM_CODEC)
        .build()
);
```

:::info
使用 `StreamCodec` 重载意味着每次都会同步整个数据附件，并忽略客户端上已有的任何数据。
:::

## 玩家死亡时复制数据

默认情况下，玩家死亡时不会复制 [Entity][entity] 数据附件。若要在死亡时自动复制附件，请在附件 builder 中设置 `copyOnDeath`。

更复杂的处理可以通过 `PlayerEvent.Clone` 实现：从原 Entity 读取数据，再将其赋给新 Entity。在该事件中，可以使用 `#isWasDeath` 区分死亡后重生与从末地返回。这一点很重要，因为从末地返回时数据已经存在，必须小心避免重复写入值。

例如：

```java
@SubscribeEvent // 位于游戏事件总线上
public static void onClone(PlayerEvent.Clone event) {
    if (event.isWasDeath() && event.getOriginal().hasData(MY_DATA)) {
        event.getEntity().getData(MY_DATA).fieldToCopy = event.getOriginal().getData(MY_DATA).fieldToCopy;
    }
}
```

[datacomponents]: ../items/datacomponents.md
[entity]: ../entities/index.md
[saveddata]: saveddata.md
[streamcodec]: ../networking/streamcodecs.md
[valueio]: valueio.md#valueioserializable
