# 数据组件（Data Components）

数据组件是映射中用于在注册表对象的 `Holder` 上存储数据的键值对。烟花爆炸、工具等每一项数据都以实际对象形式存储在 `Holder` 上，因此无需动态转换通用编码实例（例如 `CompoundTag`、`JsonElement`），这些值也能直接可见并可操作。

## `DataComponentType`

每个数据组件都有关联的 `DataComponentType<T>`，其中 `T` 是组件值类型。`DataComponentType` 表示引用所存组件值的键，并可按需要包含用于处理磁盘和网络读写的 Codec。

现有组件列表可在 `DataComponents` 中找到。

### 创建自定义数据组件

与 `DataComponentType` 关联的组件值必须实现 `hashCode` 与 `equals`，存储后应视为**不可变**。

:::info
使用 record 可以很容易地实现组件值。record 字段是不可变的，并且会实现 `hashCode` 与 `equals`。
:::

```java
// record 示例
public record ExampleRecord(int value1, boolean value2) {}

// 类示例
public class ExampleClass {

    private final int value1;
    // 可以可变，但使用时需要注意
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

`persistent` 指定用于从磁盘读取及向磁盘写入组件值的 [`Codec`][codec]。`networkSynchronized` 指定通过网络读写组件的 `StreamCodec`。如果未指定 `networkSynchronized`，则会封装 `persistent` 中提供的 `Codec`，并将其用作 [`StreamCodec`][streamcodec]。

:::warning
Builder 中必须提供 `persistent` 或 `networkSynchronized`，否则会抛出 `NullPointerException`。如果不应通过网络发送数据，请将 `networkSynchronized` 设置为 `StreamCodec#unit`，并提供默认组件值。
:::

`cacheEncoding` 会缓存 `Codec` 的编码结果；只要组件值未变化，之后的编码就使用缓存值。只有当组件值预计很少变化或永不变化时，才应使用它。

如果 Item 带有此组件，`ignoreSwapAnimation` 会取消切换动画。如果未设置它，动画仍可能根据客户端 Item property 被取消。

`DataComponentType` 是注册表对象，必须[注册][registered]。

```java
// 使用 ExampleRecord(int、boolean)
// 实际使用时只应选择一个 Codec 或 StreamCodec
// 这里提供多个只是为了示例

// 基础 Codec
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

// 如果不应该通过网络发送任何内容，则使用单位 StreamCodec
public static final StreamCodec<ByteBuf, ExampleRecord> UNIT_STREAM_CODEC = StreamCodec.unit(new ExampleRecord(0, false));


// 在另一个类中
// 专用的 DeferredRegister.DataComponents 简化了数据组件注册，并避免了 `Supplier` 中 `DataComponentType.Builder` 的一些泛型推断问题
public static final DeferredRegister.DataComponents REGISTRAR = DeferredRegister.createDataComponents(Registries.DATA_COMPONENT_TYPE, "examplemod");

public static final Supplier<DataComponentType<ExampleRecord>> BASIC_EXAMPLE = REGISTRAR.registerComponentType(
    "basic",
    builder -> builder
        // 用于将数据读写到磁盘的 Codec
        .persistent(BASIC_CODEC)
        // 用于通过网络读写数据的 StreamCodec
        .networkSynchronized(BASIC_STREAM_CODEC)
);

/// 组件不会保存到磁盘
public static final Supplier<DataComponentType<ExampleRecord>> TRANSIENT_EXAMPLE = REGISTRAR.registerComponentType(
    "transient",
    builder -> builder.networkSynchronized(BASIC_STREAM_CODEC)
);

// 没有数据将通过网络同步
public static final Supplier<DataComponentType<ExampleRecord>> NO_NETWORK_EXAMPLE = REGISTRAR.registerComponentType(
   "no_network",
   builder -> builder
        .persistent(BASIC_CODEC)
        // 注意这里使用的是UNIT_STREAM_CODEC
        .networkSynchronized(UNIT_STREAM_CODEC)
);
```

## 组件映射

所有数据组件都存储在 `DataComponentMap` 中，以 `DataComponentType` 为键、对象为值。`DataComponentMap` 的作用类似只读 `Map`。因此，它提供了按给定 `DataComponentType` 通过 `#get` 获取条目的方法，也可在条目不存在时通过 `#getOrDefault` 提供默认值。

对于注册表对象，可以通过 `Holder#components` 获取 `DataComponentMap`。

```java
// 对于某个 Item item

// 如果存在组件，将获得染料颜色
// 否则 null
@Nullable
DyeColor color = item.builtInRegistryHolder().components().get(DataComponents.BASE_COLOR);
```

### `PatchedDataComponentMap`

默认 `DataComponentMap` 只提供读取操作的方法，写入操作则由子类 `PatchedDataComponentMap` 支持，包括 `#set` 组件值或通过 `#remove` 将其完全移除。

`PatchedDataComponentMap` 使用原型与补丁映射存储更改。原型是 `DataComponentMap`，包含该映射应具有的默认组件及其值。补丁映射则是从 `DataComponentType` 到 `Optional` 值的映射，记录对默认组件所做的更改。

```java
// 对于某个 PatchedDataComponentMap map

// 将基色设置为白色
map.set(DataComponents.BASE_COLOR, DyeColor.WHITE);

// 删除基色
// - 如果未提供默认值，则删除补丁
// - 如果有默认值，则设置空选项
map.remove(DataComponents.BASE_COLOR);
```

:::danger
原型与补丁映射都是 `PatchedDataComponentMap` 哈希码的一部分。因此，映射中的所有组件值都应视为**不可变**。修改数据组件的值后，始终调用 `#set` 或下文所述的相关方法之一。
:::

## 组件 Getter

所有能够提供数据组件的实例通常都实现 `DataComponentGetter`。`DataComponentGetter` 实际上会从底层映射获取某个数据类型的组件值，或按需创建该值。

## 组件持有者

所有引用底层数据组件映射的实例都实现 `DataComponentHolder`，后者扩展 `DataComponentGetter`。`DataComponentHolder` 实质上会把读取操作委托给 `DataComponentMap` 中的只读方法。

```java
// 对于某个 DataComponentHolder holder

// 委托给 DataComponentMap#get
@Nullable
DyeColor color = holder.get(DataComponents.BASE_COLOR);
```

### `MutableDataComponentHolder`

`MutableDataComponentHolder` 是 NeoForge 提供的接口，用于支持对组件映射进行写入操作。原版与 NeoForge 中的所有实现都使用 `PatchedDataComponentMap` 存储数据组件，因此也提供了同名委托方法 `#set` 与 `#remove`。

此外，`MutableDataComponentHolder` 还提供 `#update` 方法：它会获取组件值；如果未设置则使用所提供的默认值；随后对值执行操作，并将其重新设置到映射。操作函数可以是 `UnaryOperator`（接受组件值并返回组件值），也可以是 `BiFunction`（接受组件值与另一个对象，并返回组件值）。

```java
// 对于某个 ItemStack stack

FireworkExplosion explosion = stack.get(DataComponents.FIREWORK_EXPLOSION);

// 修改组件值
explosion = explosion.withFadeColors(new IntArrayList(new int[] {1, 2, 3}));

// 由于修改了组件值，因此之后应调用 set
stack.set(DataComponents.FIREWORK_EXPLOSION, explosion);

// 更新组件值（内部调用 set）
stack.update(
    DataComponents.FIREWORK_EXPLOSION,
    // 如果不存在任何组件值，则使用默认值
    FireworkExplosion.DEFAULT,
    // 返回一个新 FireworkExplosion 来设置
    explosion -> explosion.withFadeColors(new IntArrayList(new int[] {4, 5, 6}))
);

stack.update(
    DataComponents.FIREWORK_EXPLOSION,
    // 如果不存在任何组件值，则使用默认值
    FireworkExplosion.DEFAULT,
    // 提供给函数的对象
    new IntArrayList(new int[] {7, 8, 9}),
    // 返回一个新 FireworkExplosion 来设置
    FireworkExplosion::withFadeColors
);
```

## 向 Item 添加默认数据组件

尽管可变数据组件存储在 `ItemStack` 上，但可以通过 `Item` 设置默认组件映射；该映射会存储到 `Holder<Item>` 上，最后在构造 `ItemStack` 时作为原型传给它。可通过 `Item.Properties#component` 向 `Item` 添加组件。对于依赖动态生成数据的组件（例如[数据包注册表对象][datapackregistry]），应改用 `Item.Properties#delayedComponent`，根据注册表的 `HolderLookup.Provider` 构造值。

```java
// 对于某些 DeferredRegister.Items REGISTRAR
public static final Item COMPONENT_EXAMPLE = REGISTRAR.register("component",
    // 这里使用 registryName 重载，因为 DataComponentType 尚未注册
    registryName -> new Item(
        new Item.Properties()
        .setId(ResourceKey.create(Registries.ITEM, registryName))
        // 直接传入组件值。
        .component(BASIC_EXAMPLE.get(), new ExampleRecord(24, true))
        // 传入组件工厂，获取注册表上下文并返回值。
        .delayedComponent(DataComponents.DAMAGE_RESISTANT, context -> new DamageResistant(context.getOrThrow(DamageTypeTags.IS_EXPLOSION)))
    )
);
```

如果应将数据组件添加到属于原版或其他模组的现有 Item，就应在 [**模组事件总线**][modbus] 上监听 `ModifyDefaultComponentsEvent`。该事件提供 `modify` 与 `modifyMatching` 方法，允许修改关联 Item 的 `DataComponentPatch.Builder`。Builder 可以 `#set` 现有组件，也可以将其 `#set` 为 null，从而有效移除它们。

```java
@SubscribeEvent // 位于模组事件总线上
public static void modifyComponents(ModifyDefaultComponentsEvent event) {
    // 为西瓜种子设置组件
    event.modify(Items.MELON_SEEDS, builder ->
        builder.set(BASIC_EXAMPLE.get(), new ExampleRecord(10, false))
    );

    // 移除所有具有合成剩余物的物品上的组件
    event.modifyMatching(
        (item, components) -> item.getCraftingRemainder() != null,
        builder -> builder.set(DataComponents.BUCKET_ENTITY_DATA, null)
    );
}
```

## 使用自定义组件持有者

要创建自定义数据组件持有者，持有者对象只需实现 `MutableDataComponentHolder`，并实现缺失的方法。持有者对象必须包含表示 `PatchedDataComponentMap` 的字段，以便实现关联方法。

```java
public class ExampleHolder implements MutableDataComponentHolder {

    private int data;
    private final PatchedDataComponentMap components;

    // 可以提供重载来提供映射本身
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

    // 其他方法
}
```

### `DataComponentPatch` 与 Codec

要将组件持久化到磁盘，或通过网络发送信息，持有者可以发送整个 `DataComponentMap`。但这通常会浪费信息，因为无论数据发送到哪里，默认值都已存在。因此，应改用 `DataComponentPatch` 发送关联数据。`DataComponentPatch` 只包含组件映射的补丁信息，不包含任何默认值。随后，接收端会将补丁应用到原型上。

可以通过 `#patch` 从 `PatchedDataComponentMap` 创建 `DataComponentPatch`。同样，给定原型 `DataComponentMap` 与 `DataComponentPatch` 后，`PatchedDataComponentMap#fromPatch` 可构造 `PatchedDataComponentMap`。

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
            // 要应用到的原型映射
            DataComponentMap.EMPTY,
            // 相关补丁
            patch
        );
    }

    // ...
}
```

[通过网络同步持有者数据][network]以及从磁盘读写数据必须手动完成。

[datapackregistry]: ../concepts/registries.md#datapack-registries
[registered]: ../concepts/registries.md
[codec]: ../datastorage/codecs.md
[modbus]: ../concepts/events.md#事件总线
[network]: ../networking/payload.md
[streamcodec]: ../networking/streamcodecs.md
