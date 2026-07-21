# 物品（Item）

Item 与 Block 一样，是 Minecraft 的核心组成部分。Block 构成你周围的世界，而 Item 存在于物品栏中。

## Item 究竟是什么？

在进一步创建 Item 前，务必理解 Item 实际是什么，以及它与 [Block][block] 等对象有何区别。以下用一个示例说明：

- 在世界中，你遇到一个泥土 Block 并想挖掘它。它是 **Block**，因为它被放置在世界中。（实际上，它不是 Block，而是 BlockState。更详细的信息请参阅 [BlockState 文章][blockstates]。）
    - 并非所有 Block 被破坏时都会掉落自身（例如树叶），更多信息请参阅 [战利品表][loottables] 文章。
- [挖掘 Block][breaking] 后，它会被移除（即替换为空气 Block），并掉落泥土。掉落的泥土是 Item **[Entity][entity]**。这意味着它与其他 Entity（猪、僵尸、箭等）一样，本身可被水流推动，也会被火与熔岩烧毁。
- 捡起泥土 ItemEntity 后，它会成为物品栏中的 **ItemStack**。简单来说，ItemStack 是 Item 的实例，同时带有堆叠数量等额外信息。
- ItemStack 由其对应的 **Item**（也就是我们要创建的对象）提供底层支持。Item 持有 [数据组件][datacomponents]，其中包含所有 ItemStack 初始化时使用的默认信息（例如每把铁剑的最大耐久度都是 250）；ItemStack 可以修改这些数据组件，因此同一 Item 的两个不同 ItemStack 可拥有不同信息（例如一把铁剑剩余 100 次使用次数，另一把剩余 200 次）。有关哪些内容由 Item 处理、哪些由 ItemStack 处理，参见下文。
    - Item 与 ItemStack 的关系，大致类似 [Block][block] 与 [BlockState][blockstates] 的关系，因为 BlockState 始终由 Block 提供底层支持。这并不是十分准确的类比（例如 ItemStack 不是单例），但有助于建立对此概念的基本认识。

## 创建 Item

理解 Item 是什么后，下面来创建一个。

与基础 Block 一样，对于不需要特殊功能的基础 Item（例如木棍、糖等），可以直接使用 `Item` 类。为此，在注册期间使用 `Item.Properties` 参数实例化 `Item`。该 `Item.Properties` 参数可通过 `Item.Properties#of` 创建，并可通过调用其方法自定义：

- `setId`——设置 Item 的 resource key。
    - 每个 Item 都**必须**设置此项，否则会抛出 exception。
- `overrideDescription`——设置 Item 的 translation key。创建的 `Component` 存储在 `DataComponents#ITEM_NAME` 中。
- `useBlockDescriptionPrefix`——一个便利辅助方法，它使用 translation key `block.<modid>.<registry_name>` 调用 `overrideDescription`。所有 `BlockItem` 都应调用此方法。
- `requiredFeatures`——设置此 Item 所需的 feature flag。它主要用于原版在小版本中的 feature locking 系统。除非要集成原版中受 feature flag 限制的系统，否则不建议使用。
- `stacksTo`——设置此 Item 的最大堆叠数量（通过 `DataComponents#MAX_STACK_SIZE`）。默认为 64。例如末影珍珠或其他只能堆叠到 16 个的 Item 会使用它。
- `durability`——设置 Item 的耐久度（通过 `DataComponents#MAX_DAMAGE`），并将初始损伤设为 0（通过 `DataComponents#DAMAGE`）。默认为 0，表示“没有耐久度”。例如铁制工具在这里使用 250。请注意，设置耐久度会自动将最大堆叠数量锁定为 1。
- `fireResistant`——使使用此 Item 的 ItemEntity 免疫火与熔岩（通过 `DataComponents#FIRE_RESISTANT`）。多种下界合金 Item 使用它。
- `rarity`——设置 Item 的稀有度（通过 `DataComponents#RARITY`）。目前它只会更改 Item 颜色。`Rarity` 是由四个值组成的枚举：`COMMON`（白色，默认）、`UNCOMMON`（黄色）、`RARE`（青色）和 `EPIC`（浅紫色）。请注意，模组可能添加更多稀有度类型。
- `setNoCombineRepair`——禁用此 Item 的砂轮与合成网格修复。原版中未使用。
- `jukeboxPlayable`——设置插入唱片机时播放的 datapack `JukeboxSong` 的 resource key。
- `food`——设置 Item 的 [`FoodProperties`][food]（通过 `DataComponents#FOOD`）。

如需示例或查看 Minecraft 使用的不同值，请查看 `Items` 类。

### 剩余物与冷却

Item 可具有在使用时应用，或在固定时间内阻止 Item 再次使用的额外 property：

- `craftRemainder`——设置 Item 的合成剩余物。原版将其用于装有内容的桶，使其在合成后留下空桶。
- `usingConvertsTo`——设置 Item 通过 `Item#use`、`IItemExtension#finishUsingItem` 或 `Item#releaseUsing` 使用完毕后返回的 Item。该 `ItemStack` 存储在 `DataComponents#USE_REMAINDER` 上。
- `useCooldown`——设置 Item 再次可用前需要等待的秒数（通过 `DataComponents#USE_COOLDOWN`）。

### 工具与盔甲

有些 Item 作为[工具][tools]与[盔甲][armor]使用。它们通过一系列 Item property 构造，只有部分用途会委托给关联类：

- `enchantable`——设置 ItemStack 的最大[附魔][enchantment]值，使 Item 可被附魔（通过 `DataComponents#ENCHANTABLE`）。
- `repairable`——设置可用于修复此 Item 耐久度的 Item 或 tag（通过 `DataComponents#REPAIRABLE`）。必须具有耐久度组件，且不能有 `DataComponents#UNBREAKABLE`。
- `equippable`——设置 Item 可装备到的槽位（通过 `DataComponents#EQUIPPABLE`）。
- `equippableUnswappable`——与 `equippable` 相同，但禁用通过使用 Item 按键（默认右键）快速换装。

更多信息可在各自相关页面找到。

### 更多功能

直接使用 `Item` 只能实现非常基础的 Item。如果想添加右键交互等功能，就需要扩展 `Item` 的自定义类。`Item` 类有许多可覆盖的方法，可用于实现不同功能；更多信息请参阅 `Item` 与 `IItemExtension` 类。

Item 最常见的两个用例是左键点击与右键点击。由于流程复杂且会涉及其他系统，它们在单独的[交互文章][interactions]中说明。

### `DeferredRegister.Items`

所有 registry 都使用 `DeferredRegister` 注册内容，Item 也不例外。不过，由于添加新 Item 是绝大多数模组都需要的核心功能，NeoForge 提供了辅助类 `DeferredRegister.Items`；它扩展 `DeferredRegister<Item>`，并提供若干 Item 特定的辅助方法：

```java
public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(ExampleMod.MOD_ID);

public static final DeferredItem<Item> EXAMPLE_ITEM = ITEMS.registerItem(
    "example_item",
    Item::new, // The factory that the properties will be passed into.
    props -> props // A unary operator of the properties to use.
);
```

在内部，它会把 properties 参数应用到所提供的 Item factory（通常是构造器），从而直接调用 `ITEMS.register("example_item", registryName -> new Item(new Item.Properties().setId(ResourceKey.create(Registries.ITEM, registryName))))`。Id 会设置到 properties 上。

如果想使用 `Item::new`，可以完全省略 factory，改用 `simple` 方法变体：

```java
public static final DeferredItem<Item> EXAMPLE_ITEM = ITEMS.registerSimpleItem(
    "example_item",
    props -> props // A unary operator of the properties to use.
);
```

它与前一个示例的作用完全相同，只是略短。当然，如果想使用 `Item` 的子类而不是 `Item` 本身，就必须改用前一种方法。

这两个方法还有省略 `new Item.Properties()` 参数的重载：

```java
public static final DeferredItem<Item> EXAMPLE_ITEM = ITEMS.registerItem("example_item", Item::new);

// Variant that also omits the Item::new parameter
public static final DeferredItem<Item> EXAMPLE_ITEM = ITEMS.registerSimpleItem("example_item");
```

最后，还提供 BlockItem 的快捷方法。除 `setId` 外，它们还会调用 `useBlockDescriptionPrefix`，把 translation key 设置为 Block 使用的 key：

```java
public static final DeferredItem<BlockItem> EXAMPLE_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(
    "example_block",
    ExampleBlocksClass.EXAMPLE_BLOCK,
    props -> props
);

// Variant that omits the properties parameter:
public static final DeferredItem<BlockItem> EXAMPLE_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(
    "example_block",
    ExampleBlocksClass.EXAMPLE_BLOCK
);

// Variant that omits the name parameter, instead using the block's registry name:
public static final DeferredItem<BlockItem> EXAMPLE_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(
    // Must be an instance of `Holder<Block>`
    // DeferredBlock<T> also works
    ExampleBlocksClass.EXAMPLE_BLOCK,
    props -> props
);

// Variant that omits both the name and the properties:
public static final DeferredItem<BlockItem> EXAMPLE_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(
    // Must be an instance of `Holder<Block>`
    // DeferredBlock<T> also works
    ExampleBlocksClass.EXAMPLE_BLOCK
);
```

:::info
如果把已注册 Block 保存在独立类中，应先加载 Block 类，再加载 Item 类。
:::

### 资源

如果注册并获得 Item（通过 `/give` 或[创造模式标签页][creativetabs]），会发现它缺少正确的 model 与纹理。这是因为纹理与 model 由 Minecraft 的资源系统处理。

对于每个 Item，都需要添加或[生成][datagen]以下内容的 JSON 文件：

- 带有关联[纹理][texture]的[客户端 Item][citems]
- [翻译][i18n]
- [配方][recipes]（可选）
- 一些 Item [tag][tags]（可选）

对于以上所有内容，还应参考类似原版 Block 的文件与数据 generator。

## `ItemStack`

与 Block 和 BlockState 类似，大多数你以为会使用 `Item` 的位置实际上使用 `ItemStack`。`ItemStack` 表示容器（例如物品栏）中一件或多件 Item 的堆叠。仍然与 Block 和 BlockState 类似，应由 `Item` 覆盖方法、在 `ItemStack` 上调用方法；`Item` 中许多方法也会传入 `ItemStack` 实例。

`ItemStack` 由三个主要部分构成：

- 它所表示的 `Item`，可通过 `ItemStack#getItem` 获取；如需 `Holder<Item>`，则通过 `getItemHolder` 获取。
- 堆叠数量，通常在 1 到 64 之间，可通过 `getCount` 获取，并通过 `setCount` 或 `shrink` 更改。
- [数据组件][datacomponents] map，用于存储 ItemStack 特定数据，可通过 `getComponents` 获取。组件值通常通过 `has`、`get`、`set`、`update` 与 `remove` 访问和修改。

要创建新的 `ItemStack`，调用 `new ItemStack(Item)` 并传入底层 Item。默认使用数量 1 且无 NBT 数据；如有需要，也有接受数量与 NBT 数据的构造器重载。请注意，在组件绑定／Level 存在之前，`ItemStack` 无法存在。在此之前，应使用下文详述的 `ItemStackTemplate`。

`ItemStack` 是 mutable 对象（见下文），但有时必须将其视为 immutable。如果需要修改应被视为 immutable 的 `ItemStack`，可以使用 `#copy` 克隆 ItemStack；如果要使用特定堆叠数量，则使用 `#copyWithCount`。

如果想表示 ItemStack 中没有 Item，请使用 `ItemStack.EMPTY`。要检查 `ItemStack` 是否为空，调用 `#isEmpty`。

### `ItemStack` 的可变性

`ItemStack` 是 mutable 对象。这意味着调用 `#setCount` 或任何数据组件 map 方法时，会修改 `ItemStack` 本身。原版广泛利用 `ItemStack` 的可变性，有几个方法依赖于此。例如，`#split` 会从调用它的 ItemStack 中分出给定数量，在此过程中既修改调用方，又返回新的 `ItemStack`。

不过，同时处理多个 `ItemStack` 时，这有时会引发问题。最常出现这种情况的是处理物品栏槽位，因为必须同时考虑光标当前选中的 `ItemStack`，以及尝试插入或提取的 `ItemStack`。

:::tip
如果不确定，谨慎行事，使用 `#copy` 复制 ItemStack。
:::

## `ItemStackTemplate`

`ItemStackTemplate` 是 `ItemStack` 的 immutable 形式，通常表示 immutable context（例如配方）中的 ItemStack。Template 包含组成 `ItemStack` 的基本元素：所持 `Holder<Item>`、堆叠数量，以及 `Item` 拥有并以 patch 形式存储的 [数据组件][datacomponents]。

要创建新的 `ItemStackTemplate`，调用某个 `new ItemStackTemplate(...)` 方法，并传入 `Item` 以及其他所需元素。之后需要 `ItemStack` 时，可以通过 `ItemStackTemplate#create` 创建。

### JSON 表示

在许多场景中（例如[配方][recipes]），`ItemStackTemplate` 需要表示为 JSON 对象。Item stack template 的 JSON 表示如下：

```json5
{
    // The item ID. Required.
    "id": "minecraft:dirt",
    // The item stack count [1, 99]. Optional, defaults to 1.
    "count": 4,
    // A map of data components. Optional, defaults to an empty map.
    "components": {
        "minecraft:enchantment_glint_override": true
    }
}
```

## `ItemInstance`

`ItemInstance` 是 `ItemStack` 与 `ItemStackTemplate` 实现的 superinterface。通常，`ItemStack` 与 `ItemStackTemplate` 在彼此隔离的 context 中使用。不过，当 ItemStack 与 template 可以互换使用时（例如获取 ItemStack／template 中的 Item 数量），会提供 `ItemInstance` superinterface，而不是特定类型。

`ItemInstance` 提供检查 `Item`（`#is`）、堆叠数量（`count`）以及通过 `DataComponentGetter` 读取数据组件的通用方法。

## 创造模式标签页

默认情况下，Item 只能通过 `/give` 获得，不会出现在创造模式物品栏中。下面来改变这一点。

将 Item 放入创造模式菜单的方式取决于要添加到哪个标签页。

### 现有创造模式标签页

:::info
此方法用于把 Item 添加到 Minecraft 或其他模组的标签页。要把 Item 添加到自己的标签页，请参见下文。
:::

可以通过 `BuildCreativeModeTabContentsEvent` 将 Item 添加到现有 `CreativeModeTab`；该事件仅在[逻辑客户端][sides]上的 [模组事件总线][modbus] 触发。通过调用 `event#accept` 添加 Item。

```java
//MyItemsClass.MY_ITEM is a Supplier<? extends Item>, MyBlocksClass.MY_BLOCK is a Supplier<? extends Block>
@SubscribeEvent // on the mod event bus
public static void buildContents(BuildCreativeModeTabContentsEvent event) {
    // Is this the tab we want to add to?
    if (event.getTabKey() == CreativeModeTabs.INGREDIENTS) {
        event.accept(MyItemsClass.MY_ITEM.get());
        // Accepts an ItemLike. This assumes that MY_BLOCK has a corresponding item.
        event.accept(MyBlocksClass.MY_BLOCK.get());
    }
}
```

该事件还提供一些额外信息，例如通过 `getFlags` 获取已启用 feature flag 列表，或通过 `hasPermissions` 检查玩家是否有权查看管理员物品标签页。

### 自定义创造模式标签页

`CreativeModeTab` 是 registry，因此自定义 `CreativeModeTab` 必须[注册][registering]。创建创造模式标签页使用 builder 系统，可通过 `CreativeModeTab#builder` 获取 builder。Builder 提供设置标题、图标、默认 Item 及其他多种 property 的选项。此外，NeoForge 还提供额外方法，用于自定义标签页的图像、label 与槽位颜色、标签页排序位置等。

```java
//CREATIVE_MODE_TABS is a DeferredRegister<CreativeModeTab>
public static final Supplier<CreativeModeTab> EXAMPLE_TAB = CREATIVE_MODE_TABS.register("example", () -> CreativeModeTab.builder()
    //Set the title of the tab. Don't forget to add a translation!
    .title(Component.translatable("itemGroup." + MOD_ID + ".example"))
    //Set the icon of the tab.
    .icon(() -> new ItemStack(MyItemsClass.EXAMPLE_ITEM.get()))
    //Add your items to the tab.
    .displayItems((params, output) -> {
        output.accept(MyItemsClass.MY_ITEM.get());
        // Accepts an ItemLike. This assumes that MY_BLOCK has a corresponding item.
        output.accept(MyBlocksClass.MY_BLOCK.get());
    })
    .build()
);
```

## `ItemLike`

`ItemLike` 是原版中由 `Item` 与 [`Block`][block] 实现的接口。它定义 `#asItem` 方法，返回对象实际内容的 Item 表示：`Item` 直接返回自身，`Block` 在可用时返回关联的 `BlockItem`，否则返回 `Blocks.AIR`。`ItemLike` 用在 Item 的“来源”并不重要的各种 context 中，例如许多[数据 generator][datagen]。

也可以让自定义对象实现 `ItemLike`。只需覆盖 `#asItem` 即可。

[armor]: armor.md
[block]: ../blocks/index.md
[blockstates]: ../blocks/states.md
[breaking]: ../blocks/index.md#breaking-a-block
[citems]: ../resources/client/models/items.md
[creativetabs]: #creative-tabs
[datacomponents]: datacomponents.md
[datagen]: ../resources/index.md#data-generation
[enchantment]: ../resources/server/enchantments/index.md#enchantment-costs-and-levels
[entity]: ../entities/index.md
[food]: consumables.md#food
[hunger]: https://minecraft.wiki/w/Hunger#Mechanics
[interactions]: interactions.md
[loottables]: ../resources/server/loottables/index.md
[modbus]: ../concepts/events.md#事件总线
[recipes]: ../resources/server/recipes/index.md
[registering]: ../concepts/registries.md#methods-for-registering
[sides]: ../concepts/sides.md
[tools]: tools.md
[datagen]: ../resources/index.md#data-generation
[i18n]: ../resources/client/i18n.md
[texture]: ../resources/client/textures.md
[tags]: ../resources/server/tags.md
