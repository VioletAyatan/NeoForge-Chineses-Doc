---
sidebar_position: 1
---
# Capability

Capability 允许以动态而灵活的方式暴露功能，而无需直接实现大量 interface。

一般来说，每个 capability 都以 interface 形式提供一项功能。

NeoForge 为 Block、Entity 与 ItemStack 添加 capability 支持。以下各节将进行更详细的说明。

## 为什么使用 Capability？

Capability 旨在将 Block、Entity 或 ItemStack **能做什么**与它**如何做到**分离。如果不确定 capability 是否适合某项工作，请问自己以下问题：

1. 我是否只关心 Block、Entity 或 ItemStack **能做什么**，而不关心它**如何做到**？
1. 这种“能做什么”——即行为——是否只对部分 Block、Entity 或 ItemStack 可用，而非全部可用？
1. 这种“如何做到”——即行为实现——是否依赖具体 Block、Entity 或 ItemStack？

以下是适合使用 capability 的几个示例：

- *“我想让自己的 Fluid Container 与其他模组的 Fluid Container 兼容，但我不知道每种 Fluid Container 的具体实现。”*——是，使用 `ResourceHandler<FluidResource>` capability。
- *“我想统计某个 Entity 中有多少 Item，但不知道该 Entity 会如何存储它们。”*——是，使用 `ResourceHandler<ItemResource>` capability。
- *“我想为某个 ItemStack 充入能量，但不知道 ItemStack 会如何存储能量。”*——是，使用 `EnergyHandler` capability。
- *“我想给玩家当前瞄准的任意 Block 应用某种颜色，但不知道该 Block 会如何转换。”*——是。NeoForge 没有提供给 Block 着色的 capability，但可以自行实现。

以下是不建议使用 capability 的示例：

- *“我想检查某个 Entity 是否位于机器范围内。”*——否，请改用辅助方法。

## NeoForge 提供的 Capability

NeoForge 为以下三种 [ResourceHandler][resourcehandler] 提供 capability：`ResourceHandler<ItemResource>`、`ResourceHandler<FluidResource>` 与 `EnergyHandler`。

`ResourceHandler<ItemResource>` 暴露管理物品栏槽位的 interface。`ResourceHandler<ItemResource>` 类型的 capability 包括：

- `Capabilities.Item.BLOCK`：自动化系统可访问的 Block 物品栏（用于箱子、机器等）。
- `Capabilities.Item.ENTITY`：Entity 的物品栏内容（额外玩家槽位、Mob／Creature 物品栏／背包）。
- `Capabilities.Item.ENTITY_AUTOMATION`：自动化系统可访问的 Entity 物品栏（船、矿车等）。
- `Capabilities.Item.ITEM`：ItemStack 的内容（便携背包等）。

`ResourceHandler<FluidResource>` 暴露管理 Fluid 物品栏的 interface。`ResourceHandler<FluidResource>` 类型的 capability 包括：

- `Capabilities.Fluid.BLOCK`：自动化系统可访问的 Block Fluid 物品栏。
- `Capabilities.Fluid.ENTITY`：Entity 的 Fluid 物品栏。
- `Capabilities.Fluid.ITEM`：ItemStack 的 Fluid 物品栏。

`EnergyHandler` 暴露处理能量 Container 的 interface。它基于 TeamCoFH 的 RedstoneFlux API。[`EnergyHandler`][energyhandler] 类型的 capability 包括：

- `Capabilities.Energy.BLOCK`：Block 内包含的能量。
- `Capabilities.Energy.ENTITY`：Entity 内包含的能量。
- `Capabilities.Energy.ITEM`：ItemStack 内包含的能量。

## 创建 Capability

NeoForge 支持 Block、Entity 与 ItemStack 的 capability。

Capability 允许使用某种分派逻辑查找某些 API 的实现。NeoForge 实现了以下几类 capability：

- `BlockCapability`：用于 Block 与 BlockEntity 的 capability；行为取决于具体 `Block`。
    - Capability 通常指定 `Direction` context，以便根据不同侧面使用不同 Resource。
- `EntityCapability`：用于 Entity 的 capability；行为取决于具体 `EntityType`。
    - Capability 通常指定 `Direction` context，以便根据不同侧面使用不同 Resource。
- `ItemCapability`：用于 ItemStack 的 capability；行为取决于具体 `Item`。
    - Capability 通常为持有 Item Resource 指定 [`ItemAccess`][itemaccess] context。

:::tip
为了与其他模组兼容，建议尽可能使用 NeoForge 在 `Capabilities` class 中提供的 capability。否则，可以按本节所述创建自己的 capability。
:::

只需调用一个 function 即可创建 capability，结果对象应存储在 `static final` field 中。必须提供以下参数：

- Capability 名称。
    - 多次创建同名 capability 始终返回同一对象。
    - 不同名称的 capability **完全独立**，可用于不同用途。
- 要查询的行为类型，即 `T` 类型参数。
- 查询中额外 context 的类型，即 `C` 类型参数。

例如，以下是具有侧面感知能力的 Block `ResourceHandler<ItemResource>` capability 的声明方式：

```java
public static final BlockCapability<ResourceHandler<ItemResource>, @Nullable Direction> ITEM_HANDLER_BLOCK =
    BlockCapability.create(
        // Provide a name to uniquely identify the capability.
        Identifier.fromNamespaceAndPath("mymod", "item_handler"),
        // Provide the queried type. Here, we want to look up `ResourceHandler<ItemResource>` instances.
        ResourceHandler.asClass(),
        // Provide the context type. We will allow the query to receive an extra `Direction side` parameter.
        Direction.class
    );
```

`@Nullable Direction` 对 Block 来说十分常见，因此提供了专用辅助方法：

```java
public static final BlockCapability<ResourceHandler<ItemResource>, @Nullable Direction> ITEM_HANDLER_BLOCK =
    BlockCapability.createSided(
        // Provide a name to uniquely identify the capability.
        Identifier.fromNamespaceAndPath("mymod", "item_handler"),
        // Provide the queried type. Here, we want to look up `ResourceHandler<ItemResource>` instances.
        ResourceHandler.asClass()
    );
```

如果不需要 context，应使用 `Void`。此外还有一个用于无 context capability 的专用辅助方法：

```java
public static final BlockCapability<ResourceHandler<ItemResource>, Void> ITEM_HANDLER_NO_CONTEXT =
    BlockCapability.createVoid(
        // Provide a name to uniquely identify the capability.
        Identifier.fromNamespaceAndPath("mymod", "item_handler_no_context"),
        // Provide the queried type. Here, we want to look up `ResourceHandler<ItemResource>` instances.
        ResourceHandler.asClass()
    );
```

对于 Entity 与 ItemStack，`EntityCapability` 与 `ItemCapability` 中分别存在类似方法。

## 查询 Capability

将 `BlockCapability`、`EntityCapability` 或 `ItemCapability` 对象存储在 static field 后，即可查询 capability。

对于 Entity 与 ItemStack，可以使用 `getCapability` 尝试查找 capability 实现。如果结果为 `null`，表示没有可用实现。

例如：

```java
var object = entity.getCapability(CAP, context);
if (object != null) {
    // Use object
}
```

```java
var object = stack.getCapability(CAP, context);
if (object != null) {
    // Use object
}
```

Block capability 的用法略有不同，因为即使 Block 没有 BlockEntity，也可以具有 capability。查询在 `Level` 上执行，并将要查找的 `pos`ition 作为额外参数：

```java
var object = level.getCapability(CAP, pos, context);
if (object != null) {
    // Use object
}
```

如果已知 BlockEntity 和／或 BlockState，可以将其传入以节省查询时间：

```java
var object = level.getCapability(CAP, pos, blockState, blockEntity, context);
if (object != null) {
    // Use object
}
```

举一个更具体的例子，以下从 `Direction.NORTH` 侧查询 Block 的 `ResourceHandler<ItemResource>` capability：

```java
ResourceHandler<ItemResource> handler = level.getCapability(Capabilities.Item.BLOCK, pos, Direction.NORTH);
if (handler != null) {
    // Use the handler for some item-related operation.
}
```

## Block Capability 缓存

查询 capability 时，系统会在底层执行以下步骤：

1. 如果未提供 BlockEntity 与 BlockState，则获取它们。
1. 获取已注册的 capability provider。（更多信息见下文。）
1. 迭代 provider，询问它们能否提供 capability。
1. 某个 provider 返回 capability 实例，可能会分配新对象。

该实现相当高效，但对于每个 game tick 等频繁执行的查询，这些步骤可能占用大量服务端时间。对于频繁查询给定位置 capability 的场景，`BlockCapabilityCache` 系统可以显著提速。

:::tip
通常只创建一次 `BlockCapabilityCache`，然后将其存储在执行频繁 capability 查询的对象 field 中。具体何时以及在哪里存储 cache 由你决定。
:::

要创建 cache，调用 `BlockCapabilityCache.create`，传入要查询的 capability、Level、位置与查询 context。

```java
// Declare the field:
private BlockCapabilityCache<ResourceHandler<ItemResource>, @Nullable Direction> capCache;

// Later, for example in `onLoad` for a block entity:
this.capCache = BlockCapabilityCache.create(
    Capabilities.Item.BLOCK, // capability to cache
    level, // level
    pos, // target position
    Direction.NORTH // context
);
```

随后使用 `getCapability()` 查询 cache：

```java
ResourceHandler<ItemResource> handler = this.capCache.getCapability();
if (handler != null) {
    // Use the handler for some item-related operation.
}
```

**Cache 会由 garbage collector 自动清理，无需取消注册。**

Capability 对象发生变化时，还可以接收通知！这包括 capability 发生变化（`oldHandler != newHandler`）、变得不可用（`null`），或再次可用（不再是 `null`）。

此时创建 cache 需要两个额外参数：

- Validity check，用于判断 cache 是否仍然有效。
    - 在最简单的 BlockEntity field 用法中，`() -> !this.isRemoved()` 即可。
- Invalidation listener，在 capability 变化时调用。
    - 可以在这里对 capability 的变化、移除或出现作出反应。

```java
// In `onLoad` for a block entity:
// With optional invalidation listener:
this.capCache = BlockCapabilityCache.create(
    Capabilities.Item.BLOCK, // capability to cache
    level, // level
    pos, // target position
    Direction.NORTH, // context
    () -> !this.isRemoved(), // validity check (because the cache might outlive the object it belongs to)
    () -> onCapInvalidate() // invalidation listener
);
```

## Block Capability 失效

:::info
失效机制仅用于 Block capability。Entity 与 ItemStack capability 无法缓存，因此无需使其失效。
:::

为确保 cache 能正确更新其存储的 capability，**每当 capability 发生变化、出现或消失时，模组开发者都必须调用 `level.invalidateCapabilities(pos)`**。

```java
// whenever a capability changes, appears, or disappears:
level.invalidateCapabilities(pos);
```

NeoForge 已处理 chunk 加载／卸载与 BlockEntity 创建／移除等常见情况，但其他情况需要模组开发者明确处理。例如，以下情况必须使 capability 失效：

- 先前返回的 capability 不再有效。
- 提供 capability 的 Block（不带 BlockEntity）被放置或改变状态：通过覆盖 `onPlace` 处理。
- 提供 capability 的 Block（不带 BlockEntity）被移除：通过覆盖 `onRemove` 处理。

有关普通 Block 的示例，请参阅 `ComposterBlock.java` 文件。

更多信息请参阅 [`IBlockCapabilityProvider`][block-cap-provider] 的 Javadoc。

## 注册 Capability

Capability *provider* 是最终提供 capability 的对象。Capability provider 是一个 function，可以返回 capability 实例；如果无法提供 capability，则返回 `null`。Provider 特定于：

- 它们所提供的给定 capability；以及
- 它们所服务的 Block 实例、BlockEntity type、Entity type 或 Item 实例。

它们需要在 `RegisterCapabilitiesEvent` 中注册。

Block provider 使用 `registerBlock` 注册。例如：

```java
@SubscribeEvent // on the mod event bus
public static void registerCapabilities(RegisterCapabilitiesEvent event) {
    event.registerBlock(
        Capabilities.Item.BLOCK, // capability to register for
        (level, pos, state, be, side) -> <return the ResourceHandler<ItemResource>>,
        // blocks to register for
        MY_ITEM_HANDLER_BLOCK,
        MY_OTHER_ITEM_HANDLER_BLOCK
    );
}
```

一般而言，注册会特定于某些 BlockEntity type，因此还提供了 `registerBlockEntity` 辅助方法：

```java
event.registerBlockEntity(
    Capabilities.Item.BLOCK, // capability to register for
    MY_BLOCK_ENTITY_TYPE, // block entity type to register for
    (myBlockEntity, side) -> myBlockEntity.myResourceHandlerForTheGivenSide
);
```

:::danger
如果 Block 或 BlockEntity provider 先前返回的 capability 不再有效，*必须调用 `level.invalidateCapabilities(pos)` 使 cache 失效**。更多信息请参阅上面的[失效一节][invalidation]。
:::

Entity 注册方式类似，使用 `registerEntity`：

```java
event.registerEntity(
    Capabilities.Item.ENTITY, // capability to register for
    MY_ENTITY_TYPE, // entity type to register for
    (myEntity, v) -> myEntity.myResourceHandlerForTheGivenContext
);
```

Item 注册方式也类似。请注意，provider 会接收 ItemStack：

```java
event.registerItem(
    Capabilities.Item.ITEM, // capability to register for
    (stack, itemAccess) -> <return the ResourceHandler<ItemResource> for the itemStack>,
    // items to register for
    MY_ITEM,
    MY_OTHER_ITEM
);
```

## 为所有对象注册 Capability

如果出于某种原因，需要为所有 Block、Entity 或 Item 注册 provider，就需要迭代相应 registry，并为每个对象注册 provider。

例如，NeoForge 使用此系统为所有 `BucketItem`（不包括 subclass）注册 Fluid resource handler capability：

```java
// For reference, you can find this code in the `CapabilityHooks` class.
for (Item item : BuiltInRegistries.ITEM) {
    if (item.getClass() == BucketItem.class) {
        event.registerItem(Capabilities.Fluid.ITEM, (stack, itemAccess) -> new BucketResourceHandler(itemAccess), item);
    }
}
```

Provider 按注册顺序被询问是否提供 capability。如果希望在 NeoForge 已为你的某个对象注册的 provider 之前运行，请以更高优先级注册 `RegisterCapabilitiesEvent` handler。

例如：

```java
// use HIGH priority to register before NeoForge!
@SubscribeEvent(priority = EventPriority.HIGH) // on the mod event bus
public static void registerCapabilities(RegisterCapabilitiesEvent event) {
    event.registerItem(
        Capabilities.Fluid.ITEM,
        (stack, itemAccess) -> new BucketResourceHandler(itemAccess),
        // Items to register for
        MY_CUSTOM_BUCKET
    );
}
```

有关 NeoForge 自身注册的 provider 列表，请参阅 [`CapabilityHooks`][capability-hooks]。

[block-cap-provider]: https://github.com/neoforged/NeoForge/blob/26.1.x/src/main/java/net/neoforged/neoforge/capabilities/IBlockCapabilityProvider.java
[capability-hooks]: https://github.com/neoforged/NeoForge/blob/26.1.x/src/main/java/net/neoforged/neoforge/capabilities/CapabilityHooks.java
[energyhandler]: transactions.md#energy-handler
[invalidation]: #block-capability-invalidation
[itemaccess]: transactions.md#item-access
[resourcehandler]: transactions.md#resource-handlers
