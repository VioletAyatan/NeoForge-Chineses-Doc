# Data Component

Data component 是 map 中用于在 registry 对象的 `Holder` 上存储数据的键值对。烟花爆炸、工具等每一项数据都以实际对象形式存储在 Holder 上，因此无需动态转换通用编码实例（例如 `CompoundTag`、`JsonElement`），这些值也能直接可见并可操作。

## `DataComponentType`

每个 data component 都有关联的 `DataComponentType<T>`，其中 `T` 是 component 值类型。`DataComponentType` 表示引用所存 component 值的 key，并可按需要包含处理磁盘和网络读写的 Codec。

现有 component 列表可在 `DataComponents` 中找到。

### 创建自定义 Data Component

与 `DataComponentType` 关联的 component 值必须实现 `hashCode` 与 `equals`，存储后应视为 **immutable**。

:::note
使用 record 可以很容易地实现 component 值。Record field 是 immutable 的，并且会实现 `hashCode` 与 `equals`。
:::

```java
// A record example
public record ExampleRecord(int value1, boolean value2) {}

// A class example
public class ExampleClass {

    private final int value1;
    // Can be mutable, but care needs to be taken when using
    private boolean value2;

    public ExampleClass(int value1, boolean value2) {
        this.value1 = value1;
        this.value2 = value2;
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.value1, this.value2);
    }

    @Override
    public boolean equals(Object obj) {
        if (obj == this) {
            return true;
        } else {
            return obj instanceof ExampleClass ex
                && this.value1 == ex.value1
                && this.value2 == ex.value2;
        }
    }
}
```

可通过 `DataComponentType#builder` 创建标准 `DataComponentType`，并使用 `DataComponentType.Builder#build` 构建。Builder 包含四项设置：`persistent`、`networkSynchronized`、`cacheEncoding` 与 `ignoreSwapAnimation`。

`persistent` 指定用于从磁盘读取及向磁盘写入 component 值的 [`Codec`][codec]。`networkSynchronized` 指定通过网络读写 component 的 `StreamCodec`。如果未指定 `networkSynchronized`，则会封装 `persistent` 中提供的 `Codec`，并将其用作 [`StreamCodec`][streamcodec]。

:::warning
Builder 中必须提供 `persistent` 或 `networkSynchronized`，否则会抛出 `NullPointerException`。如果不应通过网络发送数据，请将 `networkSynchronized` 设置为 `StreamCodec#unit`，并提供默认 component 值。
:::

`cacheEncoding` 会缓存 `Codec` 的编码结果；只要 component 值未变化，之后的编码就使用缓存值。只有当 component 值预计很少变化或永不变化时，才应使用它。

如果 Item 带有此 component，`ignoreSwapAnimation` 会取消切换动画。如果未设置它，动画仍可能根据客户端 Item property 被取消。

`DataComponentType` 是 registry 对象，必须[注册][registered]。

```java
// Using ExampleRecord(int, boolean)
// Only one Codec and/or StreamCodec should be used below
// Multiple are provided for an example

// Basic codec
public static final Codec<ExampleRecord> BASIC_CODEC = RecordCodecBuilder.create(instance ->
    instance.group(
        Codec.INT.fieldOf("value1").forGetter(ExampleRecord::value1),
        Codec.BOOL.fieldOf("value2").forGetter(ExampleRecord::value2)
    ).apply(instance, ExampleRecord::new)
);
public static final StreamCodec<ByteBuf, ExampleRecord> BASIC_STREAM_CODEC = StreamCodec.composite(
    ByteBufCodecs.INT, ExampleRecord::value1,
    ByteBufCodecs.BOOL, ExampleRecord::value2,
    ExampleRecord::new
);

// Unit stream codec if nothing should be sent across the network
public static final StreamCodec<ByteBuf, ExampleRecord> UNIT_STREAM_CODEC = StreamCodec.unit(new ExampleRecord(0, false));


// In another class
// The specialized DeferredRegister.DataComponents simplifies data component registration and avoids some generic inference issues with the `DataComponentType.Builder` within a `Supplier`
public static final DeferredRegister.DataComponents REGISTRAR = DeferredRegister.createDataComponents(Registries.DATA_COMPONENT_TYPE, "examplemod");

public static final Supplier<DataComponentType<ExampleRecord>> BASIC_EXAMPLE = REGISTRAR.registerComponentType(
    "basic",
    builder -> builder
        // The codec to read/write the data to disk
        .persistent(BASIC_CODEC)
        // The codec to read/write the data across the network
        .networkSynchronized(BASIC_STREAM_CODEC)
);

/// Component will not be saved to disk
public static final Supplier<DataComponentType<ExampleRecord>> TRANSIENT_EXAMPLE = REGISTRAR.registerComponentType(
    "transient",
    builder -> builder.networkSynchronized(BASIC_STREAM_CODEC)
);

// No data will be synced across the network
public static final Supplier<DataComponentType<ExampleRecord>> NO_NETWORK_EXAMPLE = REGISTRAR.registerComponentType(
   "no_network",
   builder -> builder
        .persistent(BASIC_CODEC)
        // Note we use a unit stream codec here
        .networkSynchronized(UNIT_STREAM_CODEC)
);
```

## Component Map

所有 data component 都存储在 `DataComponentMap` 中，以 `DataComponentType` 为 key、对象为值。`DataComponentMap` 的作用类似只读 `Map`。因此，它提供了按给定 `DataComponentType` `#get` entry 的方法，也可在 entry 不存在时通过 `#getOrDefault` 提供默认值。

对于 registry 对象，可以通过 `Holder#components` 获取 `DataComponentMap`。

```java
// For some Item item

// Will get dye color if component is present
// Otherwise null
@Nullable
DyeColor color = item.builtInRegistryHolder().components().get(DataComponents.BASE_COLOR);
```

### `PatchedDataComponentMap`

默认 `DataComponentMap` 只提供读取操作的方法，写入操作则由 subclass `PatchedDataComponentMap` 支持，包括 `#set` component 值或通过 `#remove` 将其完全移除。

`PatchedDataComponentMap` 使用 prototype 与 patch map 存储更改。Prototype 是 `DataComponentMap`，包含该 map 应具有的默认 component 及其值。Patch map 是从 `DataComponentType` 到 `Optional` 值的 map，包含对默认 component 所做的更改。

```java
// For some PatchedDataComponentMap map

// Sets the base color to white
map.set(DataComponents.BASE_COLOR, DyeColor.WHITE);

// Removes the base color by
// - Removing the patch if no default is provided
// - Setting an empty optional if there is a default
map.remove(DataComponents.BASE_COLOR);
```

:::danger
Prototype 与 patch map 都是 `PatchedDataComponentMap` hash code 的一部分。因此，map 中的所有 component 值都应视为 **immutable**。修改 data component 的值后，始终调用 `#set` 或下文所述引用它的方法之一。
:::

## Component Getter

所有能够提供 data component 的实例通常都实现 `DataComponentGetter`。`DataComponentGetter` 实际上会从底层 map 获取某个数据类型的 component 值，或即时创建该值。

## Component Holder

所有引用底层 data component map 的实例都实现 `DataComponentHolder`，后者扩展 `DataComponentGetter`。`DataComponentHolder` 实质上会委托给 `DataComponentMap` 中的只读方法。

```java
// For some DataComponentHolder holder

// Delegates to 'DataComponentMap#get'
@Nullable
DyeColor color = holder.get(DataComponents.BASE_COLOR);
```

### `MutableDataComponentHolder`

`MutableDataComponentHolder` 是 NeoForge 提供的 interface，用于支持对 component map 进行写入操作的方法。Vanilla 与 NeoForge 中的所有实现都使用 `PatchedDataComponentMap` 存储 data component，因此也提供了同名 delegate 方法 `#set` 与 `#remove`。

此外，`MutableDataComponentHolder` 还提供 `#update` 方法：它会获取 component 值；如果未设置则使用所提供的默认值；随后对值执行操作，并将其重新设置到 map。Operator 可以是 `UnaryOperator`（接受 component 值并返回 component 值），也可以是 `BiFunction`（接受 component 值与另一个对象，并返回 component 值）。

```java
// For some ItemStack stack

FireworkExplosion explosion = stack.get(DataComponents.FIREWORK_EXPLOSION);

// Modifying the component value
explosion = explosion.withFadeColors(new IntArrayList(new int[] {1, 2, 3}));

// Since we modified the component value, 'set' should be called afterward
stack.set(DataComponents.FIREWORK_EXPLOSION, explosion);

// Update the component value (calls 'set' internally)
stack.update(
    DataComponents.FIREWORK_EXPLOSION,
    // Default value if no component value is present
    FireworkExplosion.DEFAULT,
    // Return a new FireworkExplosion to set
    explosion -> explosion.withFadeColors(new IntArrayList(new int[] {4, 5, 6}))
);

stack.update(
    DataComponents.FIREWORK_EXPLOSION,
    // Default value if no component value is present
    FireworkExplosion.DEFAULT,
    // An object that is supplied to the function
    new IntArrayList(new int[] {7, 8, 9}),
    // Return a new FireworkExplosion to set
    FireworkExplosion::withFadeColors
);
```

## 向 Item 添加默认 Data Component

尽管 mutable data component 存储在 `ItemStack` 上，但可以通过 `Item` 设置默认 component map；该 map 会存储到 `Holder<Item>` 上，最后在构造 `ItemStack` 时作为 prototype 传给它。可通过 `Item.Properties#component` 向 `Item` 添加 component。对于依赖动态生成数据的 component（例如 [datapack registry 对象][datapackregistry]），应改用 `Item.Properties#delayedComponent`，根据 registry 的 `HolderLookup.Provider` 构造值。

```java
// For some DeferredRegister.Items REGISTRAR
public static final Item COMPONENT_EXAMPLE = REGISTRAR.register("component",
    // register is used over other overloads as the DataComponentType has not been registered yet
    registryName -> new Item(
        new Item.Properties()
        .setId(ResourceKey.create(Registries.ITEM, registryName))
        // Passes in the direct component value.
        .component(BASIC_EXAMPLE.get(), new ExampleRecord(24, true))
        // Passes in a component factory, taking in the registry context and returning the value.
        .delayedComponent(DataComponents.DAMAGE_RESISTANT, context -> new DamageResistant(context.getOrThrow(DamageTypeTags.IS_EXPLOSION)))
    )
);
```

如果应将 data component 添加到属于 Vanilla 或其他模组的现有 Item，就应在 [**mod event bus**][modbus] 上监听 `ModifyDefaultComponentsEvent`。该 Event 提供 `modify` 与 `modifyMatching` 方法，允许修改关联 Item 的 `DataComponentPatch.Builder`。Builder 可以 `#set` 现有 component，也可以将其 `#set` 为 null，从而有效移除它们。

```java
@SubscribeEvent // on the mod event bus
public static void modifyComponents(ModifyDefaultComponentsEvent event) {
    // Sets the component on melon seeds
    event.modify(Items.MELON_SEEDS, builder ->
        builder.set(BASIC_EXAMPLE.get(), new ExampleRecord(10, false))
    );

    // Removes the component for any items that have a crafting remainder
    event.modifyMatching(
        (item, components) -> item.getCraftingRemainder() != null,
        builder -> builder.set(DataComponents.BUCKET_ENTITY_DATA, null)
    );
}
```

## 使用自定义 Component Holder

要创建自定义 data component holder，holder 对象只需实现 `MutableDataComponentHolder`，并实现缺失的方法。Holder 对象必须包含表示 `PatchedDataComponentMap` 的 field，以便实现关联方法。

```java
public class ExampleHolder implements MutableDataComponentHolder {

    private int data;
    private final PatchedDataComponentMap components;

    // Overloads can be provided to supply the map itself
    public ExampleHolder() {
        this.data = 0;
        this.components = new PatchedDataComponentMap(DataComponentMap.EMPTY);
    }

    @Override
    public DataComponentMap getComponents() {
        return this.components;
    }

    @Nullable
    @Override
    public <T> T set(DataComponentType<? super T> componentType, @Nullable T value) {
        return this.components.set(componentType, value);
    }

    @Nullable
    @Override
    public <T> T remove(DataComponentType<? extends T> componentType) {
        return this.components.remove(componentType);
    }

    @Override
    public void applyComponents(DataComponentPatch patch) {
        this.components.applyPatch(patch);
    }

    @Override
    public void applyComponents(DataComponentMap components) {
        this.components.setAll(components);
    }

    // Other methods
}
```

### `DataComponentPatch` 与 Codec

要将 component 持久化到磁盘，或通过网络发送信息，holder 可以发送整个 `DataComponentMap`。但这通常会浪费信息，因为无论数据发送到哪里，默认值都已存在。因此改用 `DataComponentPatch` 发送关联数据。`DataComponentPatch` 只包含 component map 的 patch 信息，不包含任何默认值。随后在接收端将 patch 应用到 prototype。

可以通过 `#patch` 从 `PatchedDataComponentMap` 创建 `DataComponentPatch`。同样，给定 prototype `DataComponentMap` 与 `DataComponentPatch` 后，`PatchedDataComponentMap#fromPatch` 可构造 `PatchedDataComponentMap`。

```java
public class ExampleHolder implements MutableDataComponentHolder {

    public static final Codec<ExampleHolder> CODEC = RecordCodecBuilder.create(instance ->
        instance.group(
            Codec.INT.fieldOf("data").forGetter(ExampleHolder::getData),
            DataCopmonentPatch.CODEC.optionalFieldOf("components", DataComponentPatch.EMPTY).forGetter(holder -> holder.components.asPatch())
        ).apply(instance, ExampleHolder::new)
    );

    public static final StreamCodec<RegistryFriendlyByteBuf, ExampleHolder> STREAM_CODEC = StreamCodec.composite(
        ByteBufCodecs.INT, ExampleHolder::getData,
        DataComponentPatch.STREAM_CODEC, holder -> holder.components.asPatch(),
        ExampleHolder::new
    );

    // ...

    public ExampleHolder(int data, DataComponentPatch patch) {
        this.data = data;
        this.components = PatchedDataComponentMap.fromPatch(
            // The prototype map to apply to
            DataComponentMap.EMPTY,
            // The associated patches
            patch
        );
    }

    // ...
}
```

[通过网络同步 holder 数据][network]以及从磁盘读写数据必须手动完成。

[datapackregistry]: ../concepts/registries.md#datapack-registries
[registered]: ../concepts/registries.md
[codec]: ../datastorage/codecs.md
[modbus]: ../concepts/events.md#event-buses
[network]: ../networking/payload.md
[streamcodec]: ../networking/streamcodecs.md
