# 数据与网络（Data and Networking）

没有数据的实体用处不大，因此在实体上存储数据至关重要。所有实体都存储一些默认数据，例如其类型与位置。本文将说明如何添加自己的数据，以及如何同步这些数据。

添加数据最简单的方式，是在 `Entity` 类中添加字段。之后可以按任意方式与这些数据交互。然而，一旦必须同步数据，这种方式很快就会变得麻烦。原因在于，大多数实体逻辑只在服务端运行，而更新只会偶尔（取决于 [`EntityType`][entitytype] 的 `clientUpdateInterval` 值）发送到客户端；当服务端 tick 速度过慢时，容易观察到实体 “卡顿”，这也是原因所在。

因此，原版引入了几个辅助系统，每个系统都有特定用途。必要时，也始终可以选择[发送自定义数据][custom]。

## `SynchedEntityData`

`SynchedEntityData` 是用于在运行时存储值并通过网络同步这些值的系统。它分为三个类：

- `EntityDataSerializer` 基本上是对 [`StreamCodec`][streamcodec] 的封装。
  - Minecraft 使用硬编码的 serializer map。NeoForge 将这个 map 转换为 registry，这意味着如果想添加新的 `EntityDataSerializer`，就必须通过[注册][registration]添加。
  - Minecraft 在 `EntityDataSerializers` 类中定义了多种默认 `EntityDataSerializer`。
- `EntityDataAccessor` 由实体持有，用于获取与设置数据值。
- `SynchedEntityData` 本身持有某个实体的所有 `EntityDataAccessor`，并根据需要自动调用 `EntityDataSerializer` 来同步值。

首先在实体类中创建 `EntityDataAccessor`：

```java
public class MyEntity extends Entity {
    // 泛型类型必须与下面第二个参数之一匹配。
    public static final EntityDataAccessor<Integer> MY_DATA =
        SynchedEntityData.defineId(
            // 实体的类。
            MyEntity.class,
            // 实体数据访问器类型。
            EntityDataSerializers.INT
        );
}
```

:::danger
尽管编译器允许你在 `SynchedEntityData#defineId()` 的第一个参数中使用所属类以外的类，但这样做可能而且必然会引发难以调试的问题，因此必须不惜一切代价避免。（这也包括通过 mixin 或类似方法添加字段。）
:::

随后必须在 `defineSynchedData` 方法中定义默认值，如下所示：

```java
public class MyEntity extends Entity {
    public static final EntityDataAccessor<Integer> MY_DATA = SynchedEntityData.defineId(MyEntity.class, EntityDataSerializers.INT);

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        // 我们的默认值为零。
        builder.define(MY_DATA, 0);
    }
}
```

最后，可以按如下方式获取与设置实体数据（假设代码位于 `MyEntity` 内的方法中）：

```java
int data = this.getEntityData().get(MY_DATA);
this.getEntityData().set(MY_DATA, 1);
```

## `readAdditionalSaveData` 与 `addAdditionalSaveData`

这两个方法用于从磁盘读取数据及向磁盘写入数据。它们通过从 [value I/O][valueio] 加载值或向其中保存值来工作，如下所示：

```java
// 假设类中存在 `int data`。
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

有时，实体在客户端生成时需要一些自定义数据，但这些数据之后不会随时间变化。遇到这种情况，可以让实体实现 `IEntityWithComplexSpawn` 接口，并使用其 `#writeSpawnData` 与 `#readSpawnData` 两个方法向网络缓冲区写入数据及从中读取数据：

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

此外，还可以在生成时发送自己的数据包。为此，请覆盖 `IEntityExtension#sendPairingData`，并像发送其他数据包一样在其中发送你的数据包：

```java
@Override
public void sendPairingData(ServerPlayer player, Consumer<CustomPacketPayload> packetConsumer) {
    // 调用 super 来获取某些基本功能。
    super.sendPairingData(player, packetConsumer);
    // 添加你自己的数据包。
    packetConsumer.accept(new MyPacket(...));
}
```

有关自定义网络数据包的更多信息，请参阅[网络文章][networking]。

## 数据附件

实体已经过 patch，会扩展 `AttachmentHolder`，因此支持通过[数据附件][attachment]存储数据。它的主要用途是在不属于你的实体（即 Minecraft 或其他模组添加的实体）上定义自定义数据。更多信息请参阅所链接的文章。

## 自定义网络消息

进行同步时，也始终可以选择使用自定义数据包，在需要时发送额外信息。更多信息请参阅[网络文章][networking]。

[attachment]: ../datastorage/attachments.md
[custom]: #自定义网络消息
[entitytype]: index.md#entitytype
[networking]: ../networking/index.md
[registration]: ../concepts/registries.md#methods-for-registering
[streamcodec]: ../networking/streamcodecs.md
[valueio]: ../datastorage/valueio.md
