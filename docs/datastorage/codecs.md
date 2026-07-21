# 编解码器（Codecs）

Codecs 是 Mojang 的 [DataFixerUpper] 提供的序列化工具，用于描述如何在不同格式之间转换对象，例如 JSON 使用的 `JsonElement` 与 NBT 使用的 `Tag`。

## 使用 Codecs

Codecs 主要用于将 Java 对象编码（或序列化）为某种数据格式，以及将格式化的数据对象解码（或反序列化）回其对应的 Java 类型。这通常分别通过 `Codec#encodeStart` 和 `Codec#parse` 完成。

### DynamicOps

为了确定编码和解码所使用的中间文件格式，`#encodeStart` 与 `#parse` 都需要一个 `DynamicOps` 实例来定义该格式中的数据。

[DataFixerUpper] 库提供了 `JsonOps`，用于处理存储在 [`Gson`][gson] `JsonElement` 实例中的 JSON 数据。`JsonOps` 支持两种 `JsonElement` 序列化方式：`JsonOps#INSTANCE` 定义标准 JSON 文件，`JsonOps#COMPRESSED` 则允许将数据压缩到单个字符串中。

```java
// Let exampleCodec represent a Codec<ExampleJavaObject>
// Let exampleObject be a ExampleJavaObject
// Let exampleJson be a JsonElement

// Encode Java object to regular JsonElement
exampleCodec.encodeStart(JsonOps.INSTANCE, exampleObject);

// Encode Java object to compressed JsonElement
exampleCodec.encodeStart(JsonOps.COMPRESSED, exampleObject);

// Decode JsonElement into Java object
// Assume JsonElement was parsed normally
exampleCodec.parse(JsonOps.INSTANCE, exampleJson);
```

Minecraft 还提供了 `NbtOps`，用于处理存储在 `Tag` 实例中的 NBT 数据。可通过 `NbtOps#INSTANCE` 引用它。

```java
// Let exampleCodec represent a Codec<ExampleJavaObject>
// Let exampleObject be a ExampleJavaObject
// Let exampleNbt be a Tag

// Encode Java object to Tag
exampleCodec.encodeStart(NbtOps.INSTANCE, exampleObject);

// Decode Tag into Java object
exampleCodec.parse(NbtOps.INSTANCE, exampleNbt);
```

为了处理 registry 条目，Minecraft 提供了 `RegistryOps`，其中包含一个用于取得可用 registry 元素的查找 provider。可通过 `RegistryOps#create` 创建它：该方法接收用于指定数据存储类型的 `DynamicOps`，以及能够访问可用 registries 的查找 provider。NeoForge 扩展了 `RegistryOps` 并创建了 `ConditionalOps`，这是一种能够处理[条目加载条件][conditions]的 registry codec 查找机制。

```java
// Let lookupProvider be a HolderLookup.Provider
// Let exampleCodec represent a Codec<ExampleJavaObject>
// Let exampleObject be a ExampleJavaObject
// Let exampleJson be a JsonElement

// Get the registry ops for JsonElement
RegistryOps<JsonElement> ops = RegistryOps.create(JsonOps.INSTANCE, lookupProvider);

// Encode Java object to JsonElement
exampleCodec.encodeStart(ops, exampleObject);

// Decode JsonElement into Java object
exampleCodec.parse(ops, exampleJson);
```

#### 格式转换

`DynamicOps` 也可以单独用于在两种已编码格式之间转换。调用 `#convertTo`，并提供目标 `DynamicOps` 格式及待转换的已编码对象即可完成转换。

```java
// Convert Tag to JsonElement
// Let exampleTag be a Tag
JsonElement convertedJson = NbtOps.INSTANCE.convertTo(JsonOps.INSTANCE, exampleTag);
```

### DataResult

使用 codecs 编码或解码数据会返回 `DataResult`。根据转换是否成功，它会保存转换后的实例或错误数据。转换成功时，`#result` 返回的 `Optional` 中会包含成功转换的对象。转换失败时，`#error` 返回的 `Optional` 中会包含 `PartialResult`；它保存错误消息，并可能根据 codec 保存一个部分转换的对象。

此外，`DataResult` 还提供许多方法，可将结果或错误转换为所需格式。例如，`#resultOrPartial` 会在成功时返回包含结果的 `Optional`，失败时则返回包含部分转换对象的 `Optional`。该方法接收一个字符串 consumer，用来决定在错误消息存在时如何报告它。

```java
// Let exampleCodec represent a Codec<ExampleJavaObject>
// Let exampleJson be a JsonElement

// Decode JsonElement into Java object
DataResult<ExampleJavaObject> result = exampleCodec.parse(JsonOps.INSTANCE, exampleJson);

result
    // Get result or partial on error, report error message
    .resultOrPartial(errorMessage -> /* Do something with error message */)
    // If result or partial is present, do something
    .ifPresent(decodedObject -> /* Do something with decoded object */);
```

## 现有 Codecs

### 基本类型

`Codec` 类为若干已定义的基本类型提供了静态 codec 实例。

Codec         | Java 类型
:---:         | :---
`BOOL`        | `Boolean`
`BYTE`        | `Byte`
`SHORT`       | `Short`
`INT`         | `Integer`
`LONG`        | `Long`
`FLOAT`       | `Float`
`DOUBLE`      | `Double`
`STRING`      | `String`\*
`BYTE_BUFFER` | `ByteBuffer`
`INT_STREAM`  | `IntStream`
`LONG_STREAM` | `LongStream`
`PASSTHROUGH` | `Dynamic<?>`\*\*
`EMPTY`       | `Unit`\*\*\*

\* 可通过 `Codec#string` 或 `Codec#sizeLimitedString` 限制 `String` 的字符数。

\*\* `Dynamic` 是保存以受支持的 `DynamicOps` 格式编码的值的对象。它通常用于把一种已编码对象格式转换为另一种已编码对象格式。

\*\*\* `Unit` 是用于表示 `null` 对象的对象。

### Vanilla 与 NeoForge

Minecraft 和 NeoForge 为经常需要编码与解码的对象定义了许多 codecs。例如：`Identifier` 使用 `Identifier#CODEC`，`DateTimeFormatter#ISO_INSTANT` 格式的 `Instant` 使用 `ExtraCodecs#INSTANT_ISO8601`，`CompoundTag` 使用 `CompoundTag#CODEC`。

:::caution
`CompoundTag` 无法通过 `JsonOps` 解码 JSON 中的数字列表。`JsonOps` 在转换时会把数字设为能够容纳它的最窄类型，而 `ListTag` 会强制其数据使用某一种特定类型，因此类型不同的数字（例如 `64` 会是 `byte`，`384` 会是 `short`）将在转换时抛出错误。
:::

Vanilla 与 NeoForge registries 也为 registry 所包含的对象类型提供 codecs（例如 `BuiltInRegistries#BLOCK` 拥有一个 `Codec<Block>`）。`Registry#byNameCodec` 会把 registry 对象编码为其 registry 名称。Vanilla registries 还提供 `Registry#holderByNameCodec`，它编码为 registry 名称，并把该名称解码为包装在 `Holder` 中的 registry 对象。

## 创建 Codecs

你可以为任意对象创建用于编码和解码的 codecs。为便于理解，下面会同时展示等价的已编码 JSON。

### Records

Codecs 可以借助 records 定义对象。每个 record codec 都通过具有明确名称的字段来定义对象。创建 record codec 的方式有很多，最简单的是使用 `RecordCodecBuilder#create`。

`RecordCodecBuilder#create` 接收一个函数：该函数定义一个 `Instance`，并返回对象的 application（`App`）。可以把它类比为创建类的 *instance*，以及用构造器把该类 *apply* 到构造出的对象上。

```java
// Some object to create a codec for
public class SomeObject {

    public SomeObject(String s, int i, boolean b) { /* ... */ }

    public String s() { /* ... */ }

    public int i() { /* ... */ }

    public boolean b() { /* ... */ }
}
```

#### 字段

一个 `Instance` 最多可以通过 `#group` 定义 16 个字段。每个字段必须是一个 application，并定义正在为哪个实例创建对象以及对象的类型。满足这一要求的最简单方式，是从一个 `Codec` 出发，设置要解码的字段名称，再设置编码该字段时使用的 getter。

如果字段为必需项，可从 `Codec` 通过 `#fieldOf` 创建；如果字段包装在 `Optional` 中或具有默认值，则可通过 `#optionalFieldOf` 创建。这两个方法都需要一个字符串，用于表示已编码对象中的字段名称。随后可使用 `#forGetter` 设置编码字段时使用的 getter；它接收一个函数，该函数根据对象返回字段数据。

:::warning
如果某个元素在解析时抛出错误，`#optionalFieldOf` 仍会抛出错误。若希望消化该错误，请改用 `#lenientOptionalFieldOf`。
:::

然后，可通过 `#apply` 应用得到的 product，从而定义实例应如何为 application 构造对象。为方便起见，分组字段应按照它们在构造器中出现的顺序排列，这样该函数就可以直接使用构造器的方法引用。

```java
public static final Codec<SomeObject> RECORD_CODEC = RecordCodecBuilder.create(instance -> // Given an instance
    instance.group( // Define the fields within the instance
        Codec.STRING.fieldOf("s").forGetter(SomeObject::s), // String
        Codec.INT.optionalFieldOf("i", 0).forGetter(SomeObject::i), // Integer, defaults to 0 if field not present
        Codec.BOOL.fieldOf("b").forGetter(SomeObject::b) // Boolean
    ).apply(instance, SomeObject::new) // Define how to create the object
);
```

```json5
// Encoded SomeObject
{
    "s": "value",
    "i": 5,
    "b": false
}

// Another encoded SomeObject
{
    "s": "value2",
    // i is omitted, defaults to 0
    "b": true
}

// Another encoded SomeObject
{
    "s": "value2",
    // Will throw an error as lenientOptionalFieldOf is not used
    "i": "bad_value",
    "b": true
}
```

### 转换器

Codecs 可以通过映射方法转换为等价或部分等价的表示形式。每个映射方法都接收两个函数：一个把当前类型转换为新类型，另一个把新类型转换回当前类型。完全等价的转换通过 `#xmap` 函数完成。

```java
// A class
public class ClassA {

    public ClassB toB() { /* ... */ }
}

// Another equivalent class
public class ClassB {

    public ClassA toA() { /* ... */ }
}

// Assume there is some codec A_CODEC
public static final Codec<ClassB> B_CODEC = A_CODEC.xmap(ClassA::toB, ClassB::toA);
```

如果一种类型只是部分等价，即转换过程中存在某些限制，则可使用返回 `DataResult` 的映射函数，以便在遇到异常或无效状态时返回错误状态。

A 是否完全等价于 B | B 是否完全等价于 A | 转换方法
:---:                      | :---:                      | :---
是                        | 是                         | `#xmap`
是                        | 否                         | `#flatComapMap`
否                        | 是                         | `#comapFlatMap`
否                        | 否                         | `#flatXMap`

```java
// Given an string codec to convert to a integer
// Not all strings can become integers (A is not fully equivalent to B)
// All integers can become strings (B is fully equivalent to A)
public static final Codec<Integer> INT_CODEC = Codec.STRING.comapFlatMap(
    s -> { // Return data result containing error on failure
        try {
            return DataResult.success(Integer.valueOf(s));
        } catch (NumberFormatException e) {
            return DataResult.error(s + " is not an integer.");
        }
    },
    Integer::toString // Regular function
);
```

```json5
// Will return 5
"5"

// Will error, not an integer
"value"
```

#### 范围 Codecs

范围 codecs 是 `#flatXMap` 的一种实现。当值不在指定最小值与最大值之间（含边界）时，它会返回错误 `DataResult`。即使值超出边界，该值仍会作为部分结果提供。整数、浮点数和双精度浮点数分别可使用 `#intRange`、`#floatRange` 和 `#doubleRange`。

```java
public static final Codec<Integer> RANGE_CODEC = Codec.intRange(0, 4); 
```

```json5
// Will be valid, inside [0, 4]
4

// Will error, outside [0, 4]
5
```

#### String Resolver

`Codec#stringResolver` 是 `flatXmap` 的一种实现，可将字符串映射为某种对象。

```java
public record StringResolverObject(String name) { /* ... */ }

// Assume there is some Map<String, StringResolverObject> OBJECT_MAP
public static final Codec<StringResolverObject> STRING_RESOLVER_CODEC = Codec.stringResolver(StringResolverObject::name, OBJECT_MAP::get);
```

```json5
// Will map this string to its associated object
"example_name"
```

### 默认值

如果编码或解码失败，可通过 `Codec#orElse` 或 `Codec#orElseGet` 提供一个替代使用的默认值。

```java
public static final Codec<Integer> DEFAULT_CODEC = Codec.INT.orElse(
    errorMessage -> /* Do something with the error message */,
    0 // Can also be a supplied value via #orElseGet
); 
```

```json5
// Not an integer, defaults to 0
"value"
```

### Unit

如果一个 codec 在代码中提供某个值、同时不编码任何内容，可使用 `MapCodec#unitCodec` 表示。当某个 codec 的数据对象中包含不可编码的条目时，这很有用。

```java
public static final Codec<IEventBus> UNIT_CODEC = MapCodec.unitCodec(
    () -> NeoForge.EVENT_BUS // Can also be a raw value
);
```

```json5
// Nothing here, will return the NeoForge event bus
```

### 延迟初始化

有时，codec 会依赖构造它时尚不存在的数据。在这种情况下，可以使用 `Codec#lazyInitialized`，让 codec 在首次编码或解码时构造自身。该方法接收一个由 supplier 提供的 codec。

```java
public static final Codec<IEventBus> LAZY_CODEC = Codec.lazyInitialized(
    () -> MapCodec.unitCodec(NeoForge.EVENT_BUS)
);
```

```json5
// Nothing here, will return the NeoForge event bus
// Encodes/decodes the same way as the normal codec
```

### List

可通过 `Codec#listOf` 从对象 codec 生成对象列表的 codec。`listOf` 还可以接收表示列表最小和最大长度的整数。`sizeLimitedListOf` 的作用相同，但只指定最大边界。

```java
// BlockPos#CODEC is a Codec<BlockPos>
public static final Codec<List<BlockPos>> LIST_CODEC = BlockPos.CODEC.listOf();
```

```json5
// Encoded List<BlockPos>
[
    [1, 2, 3], // BlockPos(1, 2, 3)
    [4, 5, 6], // BlockPos(4, 5, 6)
    [7, 8, 9]  // BlockPos(7, 8, 9)
]
```

使用 list codec 解码得到的 List 对象会存储在**不可变**列表中。如果需要可变列表，应对 list codec 应用[转换器][transformer]。

### Map

可通过 `Codec#unboundedMap` 从两个 codecs 生成由键与值对象组成的 map codec。无界 maps 可把任何基于字符串或由字符串转换而来的值指定为键。

```java
// BlockPos#CODEC is a Codec<BlockPos>
public static final Codec<Map<String, BlockPos>> MAP_CODEC = Codec.unboundedMap(Codec.STRING, BlockPos.CODEC);
```

```json5
// Encoded Map<String, BlockPos>
{
    "key1": [1, 2, 3], // key1 -> BlockPos(1, 2, 3)
    "key2": [4, 5, 6], // key2 -> BlockPos(4, 5, 6)
    "key3": [7, 8, 9]  // key3 -> BlockPos(7, 8, 9)
}
```

使用无界 map codec 解码得到的 Map 对象会存储在**不可变** map 中。如果需要可变 map，应对该 map codec 应用[转换器][transformer]。

:::caution
无界 maps 只支持能够编码为字符串、或从字符串解码得到的键。可以使用键值[对][pair]组成的 list codec 绕过这一限制。
:::

### Pair

可通过 `Codec#pair` 从两个 codecs 生成对象对的 codec。

pair codec 解码对象时，会先解码 pair 左侧的对象，然后取得已编码对象的剩余部分，再从中解码右侧对象。因此，codecs 必须在解码后仍能表达已编码对象的一部分（例如 [records]），或者先扩充为 `MapCodec`，再通过 `#codec` 转换成普通 codec。通常可以把 codec 设为某个对象的[字段][field]来完成此操作。

```java
public static final Codec<Pair<Integer, String>> PAIR_CODEC = Codec.pair(
    Codec.INT.fieldOf("left").codec(),
    Codec.STRING.fieldOf("right").codec()
);
```

```json5
// Encoded Pair<Integer, String>
{
    "left": 5,       // fieldOf looks up 'left' key for left object
    "right": "value" // fieldOf looks up 'right' key for right object
}
```

:::tip
包含非字符串键的 map codec 可以通过由键值对组成的列表进行编码和解码，并对其应用[转换器][transformer]。
:::

### Either

可通过 `Codec#either` 从两个 codecs 生成一种 codec，以两种不同方式编码或解码某些对象数据。

either codec 会先尝试使用第一个 codec 解码对象。如果失败，则尝试使用第二个 codec。如果第二个也失败，`DataResult` 将只包含第二个 codec 失败产生的错误。

```java
public static final Codec<Either<Integer, String>> EITHER_CODEC = Codec.either(
    Codec.INT,
    Codec.STRING
);
```

```json5
// Encoded Either.Left<Integer, String>
5

// Encoded Either.Right<Integer, String>
"value"
```

:::tip
这可以与[转换器][transformer]结合使用，通过两种不同编码方式得到某个特定对象。
:::

#### Xor

`Codec#xor` 是 [either] codec 的一种特殊情况：只有两种方式中恰好一种处理成功，结果才算成功。如果两个 codecs 都能成功处理，反而会抛出错误。

```java
public static final Codec<Either<Integer, String>> XOR_CODEC = Codec.xor(
    Codec.INT.fieldOf("number").codec(),
    Codec.STRING.fieldOf("text").codec()
);
```

```json5
// Encoded Either.Left<Integer, String>
{
    "number": 4
}

// Encoded Either.Right<Integer, String>
{
    "text": "value"
}

// Throws an error as both can be decoded
{
    "number": 4,
    "text": "value"
}
```

#### Alternative

`Codec#withAlternative` 是 [either] codec 的一种特殊情况：两个 codecs 都尝试解码同一个对象，但该对象以不同格式存储。首先由第一个（主）codec 尝试解码；失败时再使用第二个 codec。编码始终使用主 codec。

```java
public static final Codec<BlockPos> ALTERNATIVE_CODEC = Codec.withAlternative(
    BlockPos.CODEC,
    RecordCodecBuilder.create(instance -> instance.group(
        Codec.INT.fieldOf("x").forGetter(BlockPos::getX),
        Codec.INT.fieldOf("y").forGetter(BlockPos::getY),
        Codec.INT.fieldOf("z").forGetter(BlockPos::getZ)
    ), BlockPos::new)
);
```

```json5
// Normal method to decode BlockPos
[ 1, 2, 3 ]

// Alternative method to decode BlockPos
{
    "x": 1,
    "y": 2,
    "z": 3
}
```

### 递归

有时，一个对象会把同类型对象作为字段引用。例如，`EntityPredicate` 会分别接收用于载具、乘客和目标 entity 的 `EntityPredicate`。在这种情况下，可以使用 `Codec#recursive`，把 codec 作为创建该 codec 的函数的一部分提供。

```java
// Define our recursive object
public record RecursiveObject(Optional<RecursiveObject> inner) { /* ... */ }

public static final Codec<RecursiveObject> RECURSIVE_CODEC = Codec.recursive(
    RecursiveObject.class.getSimpleName(), // This is for the toString method
    recursedCodec -> RecordCodecBuilder.create(instance -> instance.group(
        recursedCodec.optionalFieldOf("inner").forGetter(RecursiveObject::inner)
    ).apply(instance, RecursiveObject::new))
);
```

```json5
// An encoded recursive object
{
    "inner": {
        "inner": {}
    }
}
```

### Dispatch

Codecs 可以包含子 codecs，并通过 `Codec#dispatch` 根据某种指定类型解码特定对象。这通常用于包含 codecs 的 registries，例如 rule tests 或 block placers。

dispatch codec 首先尝试从某个字符串键（通常是 `type`）取得已编码的类型。随后解码该类型，并调用 getter 取得用于解码实际对象的特定 codec。如果用于解码对象的 `DynamicOps` 会压缩 map，或者对象 codec 本身没有扩充为 `MapCodec`（例如 records 或带字段的基本类型），对象就需要存储在 `value` 键中。否则，对象可以和其余数据在同一层级解码。

```java
// Define our object
public abstract class ExampleObject {

    // Define the method used to specify the object type for encoding
    public abstract MapCodec<? extends ExampleObject> type();
}

// Create simple object which stores a string
public class StringObject extends ExampleObject {

    public StringObject(String s) { /* ... */ }

    public String s() { /* ... */ }

    public MapCodec<? extends ExampleObject> type() {
        // A registered registry object
        // "string":
        //   Codec.STRING.xmap(StringObject::new, StringObject::s).fieldOf("string")
        return STRING_OBJECT_CODEC.get();
    }
}

// Create complex object which stores a string and integer
public class ComplexObject extends ExampleObject {

    public ComplexObject(String s, int i) { /* ... */ }

    public String s() { /* ... */ }

    public int i() { /* ... */ }

    public MapCodec<? extends ExampleObject> type() {
        // A registered registry object
        // "complex":
        //   RecordCodecBuilder.mapCodec(instance ->
        //     instance.group(
        //       Codec.STRING.fieldOf("s").forGetter(ComplexObject::s),
        //       Codec.INT.fieldOf("i").forGetter(ComplexObject::i)
        //     ).apply(instance, ComplexObject::new)
        //   )
        return COMPLEX_OBJECT_CODEC.get();
    }
}

// Assume there is an Registry<MapCodec<? extends ExampleObject>> DISPATCH
public static final Codec<ExampleObject> = DISPATCH.byNameCodec() // Gets Codec<MapCodec<? extends ExampleObject>>
    .dispatch(
        ExampleObject::type, // Get the codec from the specific object
        Function.identity() // Get the codec from the registry
    );
```

```json5
// Simple object
{
    "type": "string", // For StringObject
    "value": "value" // Codec type is not augmented from MapCodec, needs field
}

// Complex object
{
    "type": "complex", // For ComplexObject

    // Codec type is augmented from MapCodec, can be inlined
    "s": "value",
    "i": 0
}
```

[DataFixerUpper]: https://github.com/Mojang/DataFixerUpper
[gson]: https://github.com/google/gson
[conditions]: ../resources/server/conditions.md
[transformer]: #transformer-codecs
[pair]: #pair
[records]: #records
[field]: #fields
[either]: #either
