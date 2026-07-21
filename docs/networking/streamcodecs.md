# 流编解码器（Stream Codecs）

Stream Codec 是一种序列化工具，用于描述如何将对象存入流（例如缓冲区）以及如何从流中读取对象。Stream Codec 主要由原版的[网络系统][networking]用于同步数据。

:::info
由于 Stream Codec 与 [Codec][codecs] 大致相似，本页采用了相同的编排方式，以展示二者的相似之处。
:::

## 使用 Stream Codec

Stream Codec 分别使用 `StreamCodec#encode` 与 `StreamCodec#decode`，将对象编码到某个流中或从中解码。`encode` 接收流与要编码进流的对象；`decode` 接收流并返回解码后的对象。通常，该流是 `ByteBuf`、`FriendlyByteBuf` 或 `RegistryFriendlyByteBuf`。

```java
// Let exampleStreamCodec represent a StreamCodec<ExampleJavaObject>
// Let exampleObject be a ExampleJavaObject
// Let buffer be a RegistryFriendlyByteBuf

// Encode Java object into the buffer stream
exampleStreamCodec.encode(buffer, exampleObject);

// Read Java object from buffer stream
ExampleJavaObject obj = exampleStreamCodec.decode(buffer);
```

:::note
除非手动处理缓冲区对象，否则通常不会直接调用 `encode` 和 `decode`。
:::

## 现有 Stream Codec

### `ByteBufCodecs`

`ByteBufCodecs` 包含针对特定基本类型与对象的 Codec 静态实例。

| Stream Codec   | Java 类型     |
|----------------|---------------|
| `BOOL`         | `Boolean`     |
| `BYTE`         | `Byte`        |
| `SHORT`        | `Short`       |
| `INT`          | `Integer`     |
| `LONG`         | `Long`        |
| `FLOAT`        | `Float`       |
| `DOUBLE`       | `Double`      |
| `BYTE_ARRAY`   | `byte[]`\*    |
| `LONG_ARRAY`   | `long[]`      |
| `STRING_UTF8`  | `String`\*\*  |
| `TAG`          | `Tag`         |
| `COMPOUND_TAG` | `CompoundTag` |
| `VECTOR3F`     | `Vector3fc`   |
| `QUATERNIONF`  | `Quaternionfc`|
| `GAME_PROFILE` | `GameProfile` |

\* 可以通过 `ByteBufCodecs#byteArray` 将 `byte[]` 限制为特定数量的值。

\*\* 可以通过 `ByteBufCodecs#stringUtf8` 将 `String` 限制为特定字符数。

此外，还有一些使用不同方式编码和解码基本类型与对象的静态实例。

#### 无符号 Short

`UNSIGNED_SHORT` 是 `SHORT` 的替代方案，按无符号数处理。由于 Java 中的数值有符号，无符号 short 会以屏蔽高两个字节的 `Integer` 形式发送与接收。

#### 可变大小数值

`VAR_INT` 与 `VAR_LONG` 是尽可能以最小大小编码数值的 Stream Codec。其做法是每次编码七位，并用最高位标记该数值是否还有更多数据。对于 int，0 到 2^28-1 之间的数值所需字节数小于或等于普通 int；对于 long，0 到 2^56-1 之间的数值所需字节数小于或等于普通 long。如果数值通常位于这些范围内，且大多接近范围下端，就应使用这些可变 Stream Codec。

:::note
`VAR_INT` 与 `VAR_LONG` 分别是 `INT` 与 `LONG` 的替代方案。
:::

#### 可信 Tag

`TRUSTED_TAG` 与 `TRUSTED_COMPOUND_TAG` 分别是 `TAG` 与 `COMPOUND_TAG` 的变体；与 `TAG` 和 `COMPOUND_TAG` 的 2 MiB 限制不同，它们在解码 Tag 时不限制堆大小。可信 Tag Stream Codec 最好只用于发往客户端的数据包，例如原版对 [BlockEntity 数据包][blockentity]与 [Entity 数据序列化器][entity]的使用方式。

如果需要使用其他限制，可以通过 `ByteBufCodecs#tagCodec` 或 `#compoundTagCodec` 提供具有给定大小的 `NbtAccounter`。也可以使用 `#optionalTagCodec` 获得由 Optional 包装的 `Tag`。

#### 宽松 JSON

`ByteBufCodecs#lenientJson` 处理任意 `JsonElement`，允许 `nan`、`infinite` 等多种浮点描述符，或多个顶层对象。它接收 JSON 允许的最大大小。

### 原版与 NeoForge

Minecraft 与 NeoForge 为经常编码和解码的对象定义了许多 Stream Codec。例如，用于 `Identifier` 的 `Identifier#STREAM_CODEC`，以及用于 `ChunkPos` 的 `NeoForgeStreamCodecs#CHUNK_POS`。

大多数 Stream Codec 可在对象类自身，或 `StreamCodec`、`ByteBufCodecs`、`NeoForgeStreamCodecs` 中找到。

## 创建 Stream Codec

可以创建 Stream Codec，用于从流读取任意对象或将其写入流。由于流的主要用途是缓冲区，本文将重点介绍这种情况。

Stream Codec 有两个泛型：`B` 表示缓冲区，`V` 表示对象值。`B` 通常是三种类型之一：`ByteBuf`、`FriendlyByteBuf`、`RegistryFriendlyByteBuf`，它们依次相互扩展。`FriendlyByteBuf` 添加 Minecraft 特有的读写方法，而 `RegistryFriendlyByteBuf` 提供对 Registry 列表及其对象的访问。

构造 Stream Codec 时，`B` 应使用最不具体的缓冲区类型。例如，`Identifier` 以字符串形式发送；普通 `ByteBuf` 支持字符串，因此其类型应为 `StreamCodec<ByteBuf, Identifier>`。`FriendlyByteBuf` 包含写入 `ChunkPos` 的方法，因此其类型应为 `StreamCodec<FriendlyByteBuf, ChunkPos>`。`Item` 需要访问 Registry，因此其类型应为 `StreamCodec<RegistryFriendlyByteBuf, Item>`。

大多数接收 Stream Codec 的方法会将缓冲区类型声明为 `? super B`，这意味着当缓冲区类型为 `RegistryFriendlyByteBuf` 时，上述三个示例都可以使用。

### 成员编码器

`StreamMemberEncoder` 是 `StreamEncoder` 的替代方案，其编码对象位于第一个参数，缓冲区位于第二个参数。通常在编码对象包含将自身写入缓冲区的实例方法时使用。可以调用 `StreamCodec#ofMember`，使用 `StreamMemberEncoder` 创建 `StreamCodec`。

```java
// Some object to create a stream codec for
public class ExampleObject {
    
    // The normal constructor
    public ExampleObject(String arg1, int arg2, boolean arg3) { /* ... */ }

    // The stream decoder reference
    public ExampleObject(ByteBuf buffer) { /* ... */ }

    // The stream encoder reference
    public void encode(ByteBuf buffer) { /* ... */ }
}

// What the stream codec would look like
public static StreamCodec<ByteBuf, ExampleObject> STREAM_CODEC =
    StreamCodec.ofMember(ExampleObject::encode, ExampleObject::new);
```

### 组合

Stream Codec 可以通过 `StreamCodec#composite` 读写对象。每个组合 Stream Codec 定义一组 Stream Codec 与 getter，并按提供顺序进行读写。`composite` 最多具有十二个参数的重载。

`composite` 中每两个参数分别表示用于读写字段的 Stream Codec，以及从对象获取待编码字段的 getter。最后一个参数是在解码时创建对象新实例的函数。

```java
// Objects to create a stream codec for
public record SimpleExample(String arg1, int arg2, boolean arg3) {}
public record RegistryExample(double arg1, Holder<Item> arg2) {}

// The stream codecs
public static final StreamCodec<ByteBuf, SimpleExample> SIMPLE_STREAM_CODEC =
    StreamCodec.composite(
        // Stream codec and getter pair
        ByteBufCodecs.STRING_UTF8, SimpleExample::arg1,
        ByteBufCodecs.VAR_INT, SimpleExample::arg2,
        ByteBufCodecs.BOOL, SimpleExample::arg3,
        SimpleExample::new
    );

// Since this has a holder, a RegistryFriendlyByteBuf is used
public static final StreamCodec<RegistryFriendlyByteBuf, RegistryExample> REGISTRY_STREAM_CODEC =
    StreamCodec.composite(
        // Note that ByteBuf stream codecs can be used here
        ByteBufCodecs.DOUBLE, RegistryExample::arg1,
        ByteBufCodecs.holderRegistry(Registries.ITEM), RegistryExample::arg2,
        RegistryExample::new
    );
```

### 转换器

可以使用映射方法，将 Stream Codec 转换为等价或部分等价的表示形式。其中两个映射方法作用于值，一个映射方法作用于缓冲区。

`map` 方法使用两个函数转换值：一个将当前类型转换为新类型，另一个将新类型转换回当前类型。这与 [Codec 转换器][transformers]类似。

```java
public static final StreamCodec<ByteBuf, Identifier> STREAM_CODEC = 
    ByteBufCodecs.STRING_UTF8.map(
        // String -> Identifier
        Identifier::new,
        // Identifier -> String
        Identifier::toString
    );
```

`apply` 方法使用 `StreamCodec.CodecOperation` 转换值。`StreamCodec.CodecOperation` 接收当前类型的 Stream Codec，并返回新类型的 Stream Codec。它们通常包装 `map` 或接收辅助方法。

```java
public static final StreamCodec<ByteBuf, List<Identifier>> STREAM_CODEC =
    Identifier.STREAM_CODEC.apply(ByteBufCodecs.list());
```

`mapStream` 方法使用一个接收新缓冲区类型并返回当前缓冲区类型的函数来转换缓冲区。该方法应很少使用，因为大多数使用 Stream Codec 的方法都不需要更改缓冲区类型。

```java
public static final StreamCodec<RegistryFriendlyByteBuf, Integer> STREAM_CODEC =
    ByteBufCodecs.VAR_INT.mapStream(buffer -> (ByteBuf) buffer);
```

### Unit

对于提供代码内值但编码为空的 Stream Codec，可以使用 `StreamCodec#unit` 表示。如果不应通过网络同步任何信息，这会很有用。

:::warning
Unit Stream Codec 要求所有编码对象都必须与指定 unit 匹配，否则会抛出错误。因此，所有对象都必须具有某种对 unit 对象返回 true 的 `equals` 实现，或者编码时始终提供传给 Stream Codec 的那个实例。
:::

```java
public static final StreamCodec<ByteBuf, Item> UNIT_STREAM_CODEC =
    StreamCodec.unit(Items.AIR);
```
### 延迟初始化

有时，Stream Codec 可能依赖构造时尚不存在的数据。在这种情况下，可以使用 `NeoForgeStreamCodecs#lazy`，让 Stream Codec 在首次读写时构造自身。该方法接收一个提供 Stream Codec 的 Supplier。

```java
public static final StreamCodec<ByteBuf, Item> LAZY_STREAM_CODEC = 
    NeoForgeStreamCodecs.lazy(
        () -> StreamCodec.unit(Items.AIR)
    );
```

### Collection

可以通过 `collection`，根据对象的 Stream Codec 生成 Collection 的 Stream Codec。`collection` 接收用于构造空 Collection 的 `IntFunction`、对象的 Stream Codec，以及可选最大大小。

```java
public static final StreamCodec<ByteBuf, Set<BlockPos>> COLLECTION_STREAM_CODEC =
    ByteBufCodecs.collection(
        HashSet::new, // Constructs a set with the specified capacity
        BlockPos.STREAM_CODEC,
        256 // The set can only have up to 256 elements
    );
```

可以使用 `StreamCodec#apply` 指定 `collection` 的另一个重载。

```java
public static final StreamCodec<ByteBuf, Set<BlockPos>> COLLECTION_STREAM_CODEC =
    BlockPos.STREAM_CODEC.apply(
        ByteBufCodecs.collection(HashSet::new)
    );
```

基于 List 的 Collection 也可以通过 `StreamCodec#apply` 指定：调用 `ByteBufCodecs#list`，并提供可选最大大小。

```java
public static final StreamCodec<ByteBuf, List<BlockPos>> LIST_STREAM_CODEC =
    BlockPos.STREAM_CODEC.apply(
        // The list can only have up to 256 elements
        ByteBufCodecs.list(256)
    );
```

### Map

可以通过 `ByteBufCodecs#map`，使用两个 Stream Codec 为键值对象 Map 生成 Stream Codec。该函数还接收用于构造空 Map 的 `IntFunction` 与可选最大大小。

```java
public static final StreamCodec<ByteBuf, Map<String, BlockPos>> MAP_STREAM_CODEC =
    ByteBufCodecs.map(
        HashMap::new, // Constructs a map with the specified capacity
        ByteBufCodecs.STRING_UTF8,
        BlockPos.STREAM_CODEC,
        256 // The map can only have up to 256 elements
    );
```

### Either

可以通过 `ByteBufCodecs#either`，根据两个 Stream Codec 生成以两种不同方式读写某种对象数据的 Stream Codec。该方法首先读写一个布尔值，指示随后分别使用第一个还是第二个 Stream Codec 进行读写。

```java
public static final StreamCodec<ByteBuf, Either<Integer, String>> EITHER_STREAM_CODEC = 
    ByteBufCodecs.either(
        ByteBufCodecs.VAR_INT,
        ByteBufCodecs.STRING_UTF8
    );
```

### ID 映射器

多数情况下，如果某个对象在网络两端都存在，发送其信息时会发送一个表示 id 的整数。用 id 表示对象可以减少需要通过网络同步的信息量。枚举与 Registry 都使用这种方式。

`ByteBufCodecs#idMapper` 提供了一种便捷的对象 id 发送方式。它接收两个用于在对象与 int 之间互相转换的函数，或一个 `IdMap`。

```java
// For some enum
public enum ExampleIdObject {
    ;

    // Gets Id -> Enum
    public static final IntFunction<ExampleIdObject> BY_ID = 
        ByIdMap.continuous(
            ExampleIdObject::getId,
            ExampleIdObject.values(),
            ByIdMap.OutOfBoundsStrategy.ZERO
    );
    
    ExampleIdObject(int id) { /* ... */ }
}

// The stream codec would look like
public static final StreamCodec<ByteBuf, ExampleIdObject> ID_STREAM_CODEC =
    ByteBufCodecs.idMapper(ExampleIdObject.BY_ID, ExampleIdObject::getId);
```

### Optional

向 `ByteBufCodecs#optional` 提供 Stream Codec，即可生成用于发送由 `Optional` 包装值的 Stream Codec。该方法首先读写一个布尔值，指示是否要读写对象。

```java
public static final StreamCodec<RegistryFriendlyByteBuf, Optional<DataComponentType<?>>> OPTIONAL_STREAM_CODEC =
    DataComponentType.STREAM_CODEC.apply(ByteBufCodecs::optional);
```

### Registry 对象

Registry 对象可以使用三种方法之一通过网络发送：`registry`、`holderRegistry` 或 `holder`。每种方法都接收一个 `ResourceKey`，表示该 Registry 对象所属的 Registry。

:::warning
自定义 Registry 必须可同步：调用 `RegistryBuilder#sync` 并将值设为 `true`。否则，编码器会抛出异常。
:::

`registry` 与 `holderRegistry` 分别返回 Registry 对象，或由 Holder 包装的 Registry 对象。这些方法会发送表示 Registry 对象的 id。

```java
// Registry object
public static final StreamCodec<RegistryFriendlyByteBuf, Item> VALUE_STREAM_CODEC =
    ByteBufCodecs.registry(Registries.ITEM);

// Holder of registry object
public static final StreamCodec<RegistryFriendlyByteBuf, Holder<Item>> HOLDER_STREAM_CODEC =
    ByteBufCodecs.holderRegistry(Registries.ITEM);
```

`holder` 返回由 Holder 包装的 Registry 对象。该方法会发送表示 Registry 对象的 id；如果提供的 `Holder` 是直接引用，则发送 Registry 对象本身。为此，`holder` 还会接收 Registry 对象的 Stream Codec。

```java
public static final StreamCodec<RegistryFriendlyByteBuf, Holder<SoundEvent>> STREAM_CODEC =
    ByteBufCodecs.holder(
        Registries.SOUND_EVENT, SoundEvent.DIRECT_STREAM_CODEC
    );
```

:::note
对于未同步的自定义 Registry，只有当 Holder 不是直接引用时，`holder` 才会抛出异常。
:::

### HolderSet

可以使用 `holderSet` 发送标签，或由 Holder 包装的 Registry 对象集合。它接收一个 `ResourceKey`，表示这些 Registry 对象所属的 Registry。

```java
public static final StreamCodec<RegistryFriendlyByteBuf, HolderSet<Item>> HOLDER_SET_STREAM_CODEC =
    ByteBufCodecs.holderSet(Registries.ITEM);
```

### 递归

有时，对象的某个字段可能引用同类型对象。例如，如果存在隐藏效果，`MobEffectInstance` 会接收一个可选 `MobEffectInstance`。这种情况下，可以使用 `StreamCodec#recursive`，将 Stream Codec 作为函数的一部分提供，以创建 Stream Codec。

```java
// Define our recursive object
public record RecursiveObject(Optional<RecursiveObject> inner) { /* ... */ }

public static final StreamCodec<ByteBuf, RecursiveObject> RECURSIVE_CODEC = StreamCodec.recursive(
    recursedStreamCodec -> StreamCodec.composite(
        recursedStreamCodec.apply(ByteBufCodecs::optional),
        RecursiveObject::inner,
        RecursiveObject::new
    )
);
```

### 分派

Stream Codec 可以通过 `StreamCodec#dispatch` 拥有子 Stream Codec，根据某种指定类型解码特定对象。这通常与表示类型的 Registry 对象配合使用，例如 `ParticleOptions` 使用的 `ParticleType`，或 `Stat` 使用的 `StatType`。

分派 Stream Codec 首先尝试读写类型对象。随后使用方法提供的某个函数读写当前对象。第一个 `Function` 接收当前对象，并获取写入该值所需的类型；第二个 `Function` 接收类型对象，并获取用于读取当前对象值的 `StreamCodec`。

```java
// Define our object(s)
public abstract class ExampleObject {

    // Define the method used to specify the object type for encoding
    public abstract StreamCodec<? super RegistryFriendlyByteBuf, ? extends ExampleObject> streamCodec();
}

// Assume there is a ResourceKey<StreamCodec<? super RegistryFriendlyByteBuf, ? extends ExampleObject>> DISPATCH
public static final StreamCodec<RegistryFriendlyByteBuf, ExampleObject> DISPATCH_STREAM_CODEC =
    ByteBufCodecs.registry(DISPATCH).dispatch(
        // Get the stream codec from the specific object
        ExampleObject::streamCodec,
        // Get the stream codec from the registry object
        Function.identity()
    );
```

[networking]: payload.md
[codecs]: ../datastorage/codecs.md
[blockentity]: ../blockentities/index.md#syncing-on-block-update
[entity]: ../entities/data.md
[transformers]: ../datastorage/codecs.md#transformers
