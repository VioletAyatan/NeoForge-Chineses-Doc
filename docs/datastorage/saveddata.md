# 数据存档（Saved Data）

数据存档（SD）系统可用于在 Level 上保存额外数据。

_如果数据只与某些 BlockEntity、区块或 Entity 有关，请考虑改用[数据附件](attachments)。_

## `SavedData`

每种 SD 实现都必须继承 `SavedData` 类。它可以像其他对象一样实现，拥有自己的字段和方法；但如果希望把数据或变更保存到磁盘，必须调用 `setDirty`。`setDirty` 会通知游戏存在需要写入的变更。如果没有调用它，数据只会在当前 Level（对于 `MinecraftServer` 则是当前世界）保持加载期间持续存在。

```java
// For some saved data implementation
public class ExampleSavedData extends SavedData {

    public void foo() {
        // Change data in saved data
        // Call set dirty if data changes
        this.setDirty();
    }
}
```

## `SavedDataType`

`SavedData` 本身只是一个对象，因此需要某种关联标识符；此外，还需要把数据写入磁盘并从磁盘读取。`SavedDataType` 正是为此而存在。它接收数据存档的标识符、没有现存数据时使用的默认构造器，以及用于编码和解码数据的 [Codec][codec]。该标识符会被当作关联世界文件夹及各 Level 维度中的路径：

- 服务器数据：`./<world_folder>/data/<identifier_namespace>/<identifier_path>.dat`
- 各 Level 数据：`./<world_folder>/dimensions/<level_namespace>/<level_path>/data/<identifier_namespace>/<identifier_path>.dat`

所有缺失目录都会自动创建，包括标识符本身所包含的目录。

:::info
构造器还可接收第四个参数 `DataFixTypes`。不过 NeoForge 不支持数据修复器，因此所有原版用法都已经过修补，允许使用 null 值。
:::

`SavedDataType` 构造器有两种形式。第一种接收作为构造器的普通 `Supplier`，以及负责磁盘处理的常规 `Codec`。如果希望存储当前 `ServerLevel` 或世界种子，则可以使用 NeoForge 添加的重载；它为这两个参数接收 `SavedDataType.Factory`，并提供一个 `ServerLevel`。

```java
// For some saved data implementation
public class NoContextExampleSavedData extends SavedData {

    public static final SavedDataType<NoContextExampleSavedData> ID = new SavedDataType<>(
        // The identifier of the saved data
        // Used as the path within the `data` folder
        Identifier.fromNamespaceAndPath("examplemod", "example"),
        // The initial constructor
        NoContextExampleSavedData::new,
        // The codec used to serialize the data
        RecordCodecBuilder.create(instance -> instance.group(
            Codec.INT.fieldOf("val1").forGetter(sd -> sd.val1),
            BuiltInRegistries.BLOCK.byNameCodec().fieldOf("val2").forGetter(sd -> sd.val2)
        ).apply(instance, NoContextExampleSavedData::new))
    );

    // Initial constructor
    public NoContextExampleSavedData() {
        // ...
    }

    // Data constructor
    public NoContextExampleSavedData(int val1, Block val2) {
        // ...
    }

    public void foo() {
        // Change data in saved data
        // Call set dirty if data changes
        this.setDirty();
    }
}

// For some saved data implementation
public class ContextExampleSavedData extends SavedData {

    public static final SavedDataType<ContextExampleSavedData> ID = new SavedDataType<>(
        // The identifier of the saved data
        // Used as the path within the `data` folder
        Identifier.fromNamespaceAndPath("examplemod", "example"),
        // The initial constructor
        ContextExampleSavedData::new,
        // The codec used to serialize the data
        level -> RecordCodecBuilder.create(instance -> instance.group(
            RecordCodecBuilder.point(level),
            Codec.INT.fieldOf("val1").forGetter(sd -> sd.val1),
            BuiltInRegistries.BLOCK.byNameCodec().fieldOf("val2").forGetter(sd -> sd.val2)
        ).apply(instance, ContextExampleSavedData::new))
    );

    // Initial constructor
    public ContextExampleSavedData(ServerLevel level) {
        // ...
    }

    // Data constructor
    public ContextExampleSavedData(ServerLevel level, int val1, Block val2) {
        // ...
    }

    public void foo() {
        // Change data in saved data
        // Call set dirty if data changes
        this.setDirty();
    }
}
```

## 附加到 Level

所有 `SavedData` 都会动态加载并附加到 Level 或服务器。因此，如果某个 `SavedData` 从未在 Level 或服务器上创建，它就不会存在。

`SavedData` 通过 `SavedDataStorage` 创建并加载；调用 `ServerChunkCache#getDataStorage` 或 `ServerLevel#getDataStorage` 均可访问该 storage。之后，可以调用 `SavedDataStorage#computeIfAbsent` 并传入 `SavedDataType`，取得或创建 SD 实例。该方法会尝试取得现有 SD 实例；如果不存在，则创建新实例并加载所有可用数据。

```java
// In some method with access to the SavedDataStorage
netherDataStorage.computeIfAbsent(ContextExampleSavedData.ID);
```

如果某个 SD 并非特定 Level 独有，应通过 `MinecraftServer#getDataStorage` 将其附加到 `MinecraftServer`。

[codec]: codecs.md
