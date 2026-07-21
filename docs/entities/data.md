---
sidebar_position: 2
---
# 数据与网络

没有数据的 Entity 用处不大，因此在 Entity 上存储数据至关重要。所有 Entity 都存储一些默认数据，例如其类型与位置。本文将说明如何添加自己的数据，以及如何同步这些数据。

添加数据最简单的方式，是在 `Entity` class 中添加 field。之后可以按任意方式与这些数据交互。然而，一旦必须同步数据，这种方式很快就会变得麻烦。原因在于，大多数 Entity 逻辑只在服务端运行，而更新只会偶尔（取决于 [`EntityType`][entitytype] 的 `clientUpdateInterval` 值）发送到客户端；当服务端 tick 速度过慢时，容易观察到 Entity “卡顿”，这也是原因所在。

因此，Vanilla 引入了几个辅助系统，每个系统都有特定用途。必要时，也始终可以选择[发送自定义数据][custom]。

## `SynchedEntityData`

`SynchedEntityData` 是用于在运行时存储值并通过网络同步这些值的系统。它分为三个 class：

- `EntityDataSerializer` 基本上是对 [`StreamCodec`][streamcodec] 的封装。
    - Minecraft 使用硬编码的 serializer map。NeoForge 将这个 map 转换为 registry，这意味着如果想添加新的 `EntityDataSerializer`，就必须通过[注册][registration]添加。
    - Minecraft 在 `EntityDataSerializers` class 中定义了多种默认 `EntityDataSerializer`。
- `EntityDataAccessor` 由 Entity 持有，用于获取与设置数据值。
- `SynchedEntityData` 本身持有某个 Entity 的所有 `EntityDataAccessor`，并根据需要自动调用 `EntityDataSerializer` 来同步值。

首先在 Entity class 中创建 `EntityDataAccessor`：

```java
public class MyEntity extends Entity {
    // The generic type must match the one of the second parameter below.
    public static final EntityDataAccessor<Integer> MY_DATA =
        SynchedEntityData.defineId(
            // The class of the entity.
            MyEntity.class,
            // The entity data accessor type.
            EntityDataSerializers.INT
        );
}
```

:::danger
尽管 compiler 允许你在 `SynchedEntityData#defineId()` 的第一个参数中使用所属 class 以外的 class，但这样做可能而且必然会引发难以调试的问题，因此必须不惜一切代价避免。（这也包括通过 mixin 或类似方法添加 field。）
:::

随后必须在 `defineSynchedData` 方法中定义默认值，如下所示：

```java
public class MyEntity extends Entity {
    public static final EntityDataAccessor<Integer> MY_DATA = SynchedEntityData.defineId(MyEntity.class, EntityDataSerializers.INT);

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        // Our default value is zero.
        builder.define(MY_DATA, 0);
    }
}
```

最后，可以按如下方式获取与设置 Entity 数据（假设代码位于 `MyEntity` 内的方法中）：

```java
int data = this.getEntityData().get(MY_DATA);
this.getEntityData().set(MY_DATA, 1);
```

## `readAdditionalSaveData` 与 `addAdditionalSaveData`

这两个方法用于从磁盘读取数据及向磁盘写入数据。它们通过从 [value I/O][valueio] 加载值或向其中保存值来工作，如下所示：

```java
// Assume that an `int data` exists in the class.
@Override
protected void readAdditionalSaveData(ValueInput input) {
    this.data = input.getIntOr("my_data", 0);
}

@Override
protected void addAdditionalSaveData(ValueOutput output) {
    output.putInt("my_data", this.data);
}
```

## 自定义生成数据

有时，Entity 在客户端生成时需要一些自定义数据，但这些数据之后不会随时间变化。遇到这种情况，可以让 Entity 实现 `IEntityWithComplexSpawn` interface，并使用其 `#writeSpawnData` 与 `#readSpawnData` 两个方法向网络 buffer 写入数据及从中读取数据：

```java
@Override
public void writeSpawnData(RegistryFriendlyByteBuf buf) {
    buf.writeInt(1234);
}

@Override
public void readSpawnData(RegistryFriendlyByteBuf buf) {
    int i = buf.readInt();
}
```

此外，还可以在生成时发送自己的 packet。为此，请覆盖 `IEntityExtension#sendPairingData`，并像发送其他 packet 一样在其中发送你的 packet：

```java
@Override
public void sendPairingData(ServerPlayer player, Consumer<CustomPacketPayload> packetConsumer) {
    // Call super for some base functionality.
    super.sendPairingData(player, packetConsumer);
    // Add your own packets.
    packetConsumer.accept(new MyPacket(...));
}
```

有关自定义网络 packet 的更多信息，请参阅[网络文章][networking]。

## Data Attachment

Entity 已经过 patch，会扩展 `AttachmentHolder`，因此支持通过 [data attachment][attachment] 存储数据。它的主要用途是在不属于你的 Entity（即 Minecraft 或其他模组添加的 Entity）上定义自定义数据。更多信息请参阅所链接的文章。

## 自定义网络消息

进行同步时，也始终可以选择使用自定义 packet，在需要时发送额外信息。更多信息请参阅[网络文章][networking]。

[attachment]: ../datastorage/attachments.md
[custom]: #custom-network-messages
[entitytype]: index.md#entitytype
[networking]: ../networking/index.md
[registration]: ../concepts/registries.md#methods-for-registering
[streamcodec]: ../networking/streamcodecs.md
[valueio]: ../datastorage/valueio.md
