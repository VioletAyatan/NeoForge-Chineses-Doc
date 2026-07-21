---
sidebar_position: 3
---
# Value I/O

Value I/O 系统是一种标准化序列化方式，用于操作某个底层对象中的数据，例如[用于 NBT 的 `CompoundTag`][nbt]。

## Input 与 Output

Value I/O 系统由两部分组成：序列化期间向对象写入数据的 `ValueOutput`，以及反序列化期间从对象读取数据的 `ValueInput`。实现方法通常只接收 `ValueOutput` 或 `ValueInput` 作为参数，并且没有返回值。Value I/O 要求底层对象是由 string 键映射到 object 值的字典；随后通过系统提供的方法，从底层对象读取信息或向其中写入信息。

```java
// For some BlockEntity subclass
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    // Write data to the output
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);
    // Read data from the input
}

// For some Entity subclass
@Override
protected void addAdditionalSaveData(ValueOutput output) {
    super.addAdditionalSaveData(output);
    // Write data to the output
}

@Override
protected void readAdditionalSaveData(ValueInput input) {
    super.readAdditionalSaveData(input);
    // Read data from the input
}
```

### Primitive

Value I/O 提供了读写某些 primitive 的方法。`ValueOutput` 方法以 `put*` 为前缀，接收键和 primitive 值；`ValueInput` 方法命名为 `get*Or`，接收键以及键不存在时使用的默认值。

| Java 类型 | `ValueOutput` | `ValueInput` |
|:---:|:---:|:---:|
| `boolean` | `putBoolean` | `getBooleanOr` |
| `byte` | `putByte` | `getByteOr` |
| `short` | `putShort` | `getShortOr` |
| `int` | `putInt` | `getInt`\*、`getIntOr` |
| `long` | `putLong` | `getLong`\*、`getLongOr` |
| `float` | `putFloat` | `getFloatOr` |
| `double` | `putDouble` | `getDoubleOr` |
| `String` | `putString` | `getString`\*、`getStringOr` |
| `int[]` | `putIntArray` | `getIntArray`\* |

\* 这些 `ValueInput` 方法不会接收并返回某个 fallback，而是返回 `Optional` 包装的 primitive。

```java
// For some BlockEntity subclass
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // Write data to the output
    output.putBoolean(
        // The string key
        "boolValue",
        // The value associated with this key
        true
    );
    output.putString("stringValue", "Hello world!");
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // Read data from the input

    // Defaults to false if not present
    boolean boolValue = input.getBooleanOr(
        // The string key to retrieve
        "boolValue",
        // The default value to return if the key is not present
        false
    );

    // Defaults to 'Dummy!' if not present
    String stringValue = input.getStringOr("stringValue", "Dummy!");
    // Returns an optional-wrapped value
    Optional<String> stringValueOpt = input.getString("stringValue");
}
```

### Codec

[`Codec`][codec] 也可以通过 Value I/O 存储和读取值。在原版中，所有 `Codec` 都通过 `RegistryOps` 处理，因此可以存储数据包条目。`ValueOutput#store` 和 `storeNullable` 接收键、负责写入对象的 Codec 以及对象本身；如果对象为 `null`，`storeNullable` 不会写入任何内容。`ValueInput#read` 接收键和 Codec 来读取对象，并返回 `Optional` 包装的对象。

```java
// For some BlockEntity subclass
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // Write data to the output
    output.storeNullable("codecValue", Rarity.CODEC, Rarity.EPIC);
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // Read data from the input
    Optional<Rarity> codecValue = input.read("codecValue", Rarity.CODEC);
}
```

`ValueOutput` 和 `ValueInput` 还为 `MapCodec` 提供 `store` / `read` 方法。与 `Codec` 相比，`MapCodec` 形式会把值合并到当前根节点。

```java
// For some BlockEntity subclass
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // Write data to the output
    output.store(
        SingleFile.MAP_CODEC,
        new SingleFile(Identifier.fromNamespaceAndPath("examplemod", "example"))
    );
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // Read data from the input

    // No key is needed as they are stored on the root value access
    Optional<SingleFile> file = input.read(SingleFile.MAP_CODEC);
    // This is present as `SingleFile` writes the `resource` parameter
    String resource = input.getStringOr("resource", "Not present!");
}
```

:::warning
`MapCodec` 会把所有键写入 value access，可能覆盖现有数据。请确保 `MapCodec` 中的所有键都与其他键不同。
:::

### List

可以通过两种方式创建和读取 list：使用子 Value I/O，或使用 [`Codec`][codec]。

调用 `ValueOutput#childrenList` 并传入键可以创建 list。它返回 `ValueOutput.ValueOutputList`，后者相当于只写的 value object list。调用 `ValueOutputList#addChild` 可以向 list 添加新的 value object，并返回一个 `ValueOutput`，用于写入该 value object 的数据。随后可以通过 `ValueInput#childrenList` 读取 list；如果希望在 list 不存在时默认为空 list，则使用 `childrenListOrEmpty`。这些方法返回 `ValueInput.ValueInputList`，它相当于只读的 iterable，也可以通过 `stream` 作为 stream 使用。

```java
// For some BlockEntity subclass
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // Write data to the output

    // Create List
    ValueOutput.ValueOutputList listValue = output.childrenList("listValue");
    // Add elements
    ValueOutput childIdx0 = listValue.addChild();
    childIdx0.putBoolean("boolChild", false);
    ValueOutput childIdx1 = listValue.addChild();
    childIdx1.putInt("boolChild", true);
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // Read data from the input

    // Read values of list
    for (ValueInput childInput : input.childrenListOrEmpty("listValue")) {
        boolean boolChild = childInput.getBooleanOr("boolChild", false);
    }
}
```

`Codec` 通过 `ValueOutput#list` 为数据对象提供 list 形式。该方法接收键和某个 `Codec`，并返回 `ValueOutput.TypedOutputList`。`TypedOutputList` 与 `ValueOutputList` 类似，但它直接操作数据对象，而不是再使用一个 Value I/O。可以通过 `TypedOutputList#add` 向 list 添加元素。类似地，可以使用 `ValueInput#list` 或 `listOrEmpty` 读取 list，并得到 `TypedValueInput`。

:::note
`TypedValueOutput` / `TypedValueInput` 与 `Codec#listOf` 的主要区别在于错误处理方式。对于 `Codec#listOf`，只要一个条目失败，整个对象都会被标记为错误的 `DataResult`；Typed Value I/O 通常通过 `ProblemReporter` 处理错误。在原版中，由于 `ProblemReporter` 是在创建 Value I/O 时指定的，`Codec#listOf` 提供了更高的灵活性。不过，自定义 Value I/O 可以根据使用场景选择任一方式。
:::

```java
// For some BlockEntity subclass
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // Write data to the output

    // Create List
    ValueOutput.TypedInputList<Rarity> listValue = output.list("listValue", Rarity.CODEC);
    // Add elements
    listValue.add(Rarity.COMMON);
    listValue.add(Rarity.EPIC);
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // Read data from the input

    // Read values of list
    for (Rarity rarity : input.listOrEmpty("listValue", Rarity.CODEC)) {
        // ...
    }
}
```

:::warning
即使 list 为空，它仍会写入 `ValueOutput`。如果不希望写入该 list，`TypedOutputList` 或 `ValueOutputList` 应先通过 `isEmpty` 检查，再使用 list 的键调用 `discard`。

```java
// For some BlockEntity subclass
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // Write data to the output

    // Create List
    ValueOutput.TypedInputList<Rarity> listValue = output.list("listValue", Rarity.CODEC);
    
    // Check if list is empty
    if (listValue.isEmpty()) {
        // Discard from output
        output.discard("listValue");
    }
}
```
:::

### Object

可以通过 child 创建和读取 object。`ValueOutput#child` 接收一个键并创建新的 `ValueObject`。随后可以使用 `ValueInput#child` 读取该 object；如果希望默认得到一个底层值为空的 `ValueInput`，则使用 `childOrEmpty`。

```java
// For some BlockEntity subclass
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // Write data to the output

    // Create object
    ValueOutput objectValue = output.child("objectValue");
    // Add data to object
    objectValue.putBoolean("boolChild", true);
    objectValue.putInt("intChild", 20);
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // Read data from the input

    // Read object
    ValueInput objectValue = input.childOrEmpty("objectValue");
    // Get data from object
    boolean boolChild = objectValue.getBooleanOr("boolChild", false);
    int intChild = objectValue.getIntOr("intChild", 0);
}
```

## ValueIOSerializable

`ValueIOSerializable` 是 NeoForge 添加的接口，用于表示可以通过 Value I/O 序列化和反序列化的对象。NeoForge 使用该 API 处理[数据附件][attachments]。接口提供两个方法：`serialize` 把对象写入 `ValueOutput`；`deserialize` 从 `ValueInput` 读取对象。

```java
public class ExampleObject implements ValueIOSerializable {
    
    @Override
    public void serialize(ValueOutput output) {
        // Write the object data here
    }

    @Override
    public void deserialize(ValueInput input) {
        // Read the object data here
    }
}
```

还可以通过 NeoForge 添加的 `ValueOutputExtension#putChild` 和 `ValueInputExtension#readChild` 方法写入和读取 `ValueIOSerializable`。

## 实现

### NBT

[NBT][nbt] 的 Value I/O 由 `TagValueOutput` 和 `TagValueInput` 处理。

可以通过 `createWithContext` 或 `createWithoutContext` 创建 `TagValueOutput`。`createWithContext` 表示 output 可以访问 `HolderLookup.Provider`，从而获得所有注册表条目（静态条目和数据包条目）；`createWithoutContext` 则不提供任何数据包访问能力。原版只使用 `createWithContext`。使用完 `ValueOutput` 后，可以通过 `TagValueOutput#buildResult` 取得 `CompoundTag`。另一方面，可以调用 `create` 并传入 `HolderLookup.Provider` 以及 input 所访问的 `CompoundTag`，创建 `TagValueInput`。

两个 Value I/O 还都接收 `ProblemReporter`。`ProblemReporter` 用于收集读写过程中的所有内部错误；目前只跟踪 `Codec` 错误。错误如何处理由模组开发者决定。原版实现在 `ProblemReporter` 不为空时会抛出异常。

```java
// Assume we have access to a HolderLookup.Provider lookupProvider

TagValueOutput output = TagValueOutput.createWithContext(
    ProblemReporter.DISCARDING, // Choose to discard all errors
    lookupProvider
);

// Write to the output...

CompoundTag tag = output.buildResult();

// Collect the errors
ProblemReporter.Collector reporter = new ProblemReporter.Collector(
    // Optionally takes in the root path element
    // Some objects (e.g., block entities, entities) have a #problemPath() method that can be supplied
    new RootFieldPathElement("example_object")
);

TagValueInput input = TagValueInput.create(
    reporter,
    lookupProvider,
    tag
);

// Read from the input...
```

[attachments]: attachments.md
[codec]: codecs.md
[nbt]: nbt.md
