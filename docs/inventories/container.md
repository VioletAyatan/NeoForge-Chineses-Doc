# 容器（Containers）

[方块实体][blockentity] 的常见用途之一是存储某种物品。Minecraft 中一些最重要的 [方块][block]，例如熔炉或箱子，都会为此使用方块实体。要在某个对象上存储物品，Minecraft 使用 `Container`。

`Container` 接口定义 `#getItem`、`#setItem` 与 `#removeItem` 等方法，可用于查询和更新容器。由于它是接口，因此实际上并不包含底层 list 或其他数据结构；这由实现系统决定。

因此，`Container` 不仅可以在方块实体上实现，也可以由任何其他类实现。典型示例包括实体物品栏，以及背包等常见模组 [物品][item]。

:::warning
NeoForge 提供 `ItemStacksResourceHandler` 类，用于在许多位置替代 `Container`。只要可能，就应优先使用它而不是 `Container`，因为它能以更简洁的方式与其他 `Container`／`ItemStacksResourceHandler` 交互。

本文存在的主要原因是为原版代码提供参考，或供你开发多加载器模组时使用。在自己的代码中，只要可能，就始终使用 `ItemStacksResourceHandler`！相关文档仍在编写中。
:::

## 基础容器实现

只要满足指定的方法（与 Java 中的其他接口相同），就可以按任意方式实现容器。不过，通常会使用固定长度的 `NonNullList<ItemStack>` 作为底层结构。单槽位容器也可以只使用一个 `ItemStack` 字段。

例如，一个有 27 个槽位（一个箱子大小）的基础 `Container` 实现如下：

```java
public class MyContainer implements Container {
    private final NonNullList<ItemStack> items = NonNullList.withSize(
            // 列表的大小，即我们容器中的槽位数量。
            27,
            // 用于代替普通列表中 null 的默认值。
            ItemStack.EMPTY
    );

    // 容器中的槽位数量。
    @Override
    public int getContainerSize() {
        return 27;
    }

    // 容器是否被视为空。
    @Override
    public boolean isEmpty() {
        return this.items.stream().allMatch(ItemStack::isEmpty);
    }

    // 返回指定槽位中的 ItemStack。
    @Override
    public ItemStack getItem(int slot) {
        return this.items.get(slot);
    }

    // 从给定槽位中移除指定数量的物品，并返回刚移除的 ItemStack。
    // 这里我们遵循 ContainerHelper，它按照我们的预期执行此。
    // 但是，我们必须手动调用 #setChanged。
    @Override
    public ItemStack removeItem(int slot, int amount) {
        ItemStack stack = ContainerHelper.removeItem(this.items, slot, amount);
        this.setChanged();
        return stack;
    }

    // 从指定槽位中移除所有物品，并返回刚移除的 ItemStack。
    // 这里我们再次遵循ContainerHelper，并且我们再次必须手动调用 #setChanged。
    @Override
    public ItemStack removeItemNoUpdate(int slot) {
        ItemStack stack = ContainerHelper.takeItem(this.items, slot);
        this.setChanged();
        return stack;
    }

    // 设置指定槽位中的 ItemStack。首先根据容器的最大堆叠数量进行限制。
    @Override
    public void setItem(int slot, ItemStack stack) {
        stack.limitSize(this.getMaxStackSize(stack));
        this.items.set(slot, stack);
        this.setChanged();
    }

    // Container 内容发生变化（例如添加、修改或移除 ItemStack）时调用此方法。
    // 例如，你可以在此处调用 BlockEntity#setChanged。
    @Override
    public void setChanged() {

    }

    // 对于给定的玩家，容器是否被视为 "still valid"。例如，箱子和
    // 类似方块会在此检查玩家是否仍处于方块的指定距离内。
    @Override
    public boolean stillValid(Player player) {
        return true;
    }

    // 清除内部存储，将所有槽位再次设置为空。
    @Override
    public void clearContent() {
        items.clear();
        this.setChanged();
    }
}
```

### `SimpleContainer`

`SimpleContainer` 类是一个附带少量额外功能的基础容器实现。如果需要没有特殊要求的容器实现，可以使用它。

### `BaseContainerBlockEntity`

`BaseContainerBlockEntity` 类是 Minecraft 中许多重要方块实体的基础类，例如箱子及类似箱子的方块、各种类型的熔炉、漏斗、发射器、投掷器、酿造台及其他少数对象。

除 `Container` 外，它还实现 `MenuProvider` 与 `Nameable` 接口：

- `Nameable` 定义几个与设置（自定义）名称有关的方法。除许多方块实体外，`Entity` 等类也会实现它。它使用 [`Component` 系统][component]。
- 另一方面，`MenuProvider` 定义 `#createMenu` 方法，允许从容器构造 [`AbstractContainerMenu`][menu]。这意味着，如果想要一个没有关联 GUI 的容器（例如唱片机），就不适合使用此类。

`BaseContainerBlockEntity` 通过 `#getItems` 与 `#setItems` 两个方法，封装通常会对 `NonNullList<ItemStack>` 执行的所有调用，从而大幅减少必须编写的样板代码。`BaseContainerBlockEntity` 的示例实现如下：

```java
public class MyBlockEntity extends BaseContainerBlockEntity {
    // 容器尺寸。这当然可以是你想要的任何值。
    public static final int SIZE = 9;
    // 我们的 ItemStack 列表。这不是 final，因为 #setItems 已存在。
    private NonNullList<ItemStack> items = NonNullList.withSize(SIZE, ItemStack.EMPTY);

    // 构造器，与之前一样。
    public MyBlockEntity(BlockPos pos, BlockState blockState) {
        super(MY_BLOCK_ENTITY.get(), pos, blockState);
    }

    // 容器尺寸，与之前一样。
    @Override
    public int getContainerSize() {
        return SIZE;
    }

    // 我们的 ItemStack 列表的 getter。
    @Override
    protected NonNullList<ItemStack> getItems() {
        return items;
    }

    // 我们的 ItemStack 列表的 setter。
    @Override
    protected void setItems(NonNullList<ItemStack> items) {
        this.items = items;
    }

    // 菜单的显示名称。不要忘记添加翻译！
    @Override
    protected Component getDefaultName() {
        return Component.translatable("container.examplemod.myblockentity");
    }

    // 从此容器创建的菜单。请参阅下文了解返回的内容。
    @Override
    protected AbstractContainerMenu createMenu(int containerId, Inventory inventory) {
        return null;
    }
}
```

请记住，此类同时是 `BlockEntity` 与 `Container`。这意味着可以将其用作方块实体的超类，从而得到带有预实现容器的可用方块实体。

:::info
实现 `Container` 的 `BlockEntity` 默认会处理其内容的掉落。如果选择不实现 `Container`，则需要自行处理[移除逻辑][beremove]。
:::

### `WorldlyContainer`

`WorldlyContainer` 是 `Container` 的子接口，允许按 `Direction` 访问给定 `Container` 的槽位。它主要用于只向特定一侧暴露容器一部分的方块实体。例如，可用于一侧输出、其他所有侧输入的机器，反之亦然。该接口的简单实现如下：

```java
// 请参阅上面的 BaseContainerBlockEntity 方法。你当然可以直接扩展 BlockEntity
// 并根据需要自行实现容器。
public class MyBlockEntity extends BaseContainerBlockEntity implements WorldlyContainer {
    // 在此处理其他内容
    
    // 假设槽位 0 是我们的输出，槽位 1-8 是我们的输入。
    // 进一步假设我们输出到顶部并从所有其他方面获取输入。
    private static final int[] OUTPUTS = new int[]{0};
    private static final int[] INPUTS = new int[]{1, 2, 3, 4, 5, 6, 7, 8};

    // 根据传递的 Direction 返回公开槽索引的数组。
    @Override
    public int[] getSlotsForFace(Direction side) {
        return side == Direction.UP ? OUTPUTS : INPUTS;
    }

    // 物品是否可以通过给定槽位的给定侧放置。
    // 对于我们的示例，仅当我们不是从上面输入并且在索引范围 [1, 8] 内时，我们才使用返回 true。
    @Override
    public boolean canPlaceItemThroughFace(int index, ItemStack itemStack, @Nullable Direction direction) {
        return direction != Direction.UP && index > 0 && index < 9;
    }

    // 是否可以从给定的边和给定的槽中获取物品。
    // 对于我们的示例，仅当我们从上方和槽索引 0 中拉取时，我们才使用返回 true。
    @Override
    public boolean canTakeItemThroughFace(int index, ItemStack stack, Direction direction) {
        return direction == Direction.UP && index == 0;
    }
}
```

## 使用容器

创建容器后，下面来使用它们。

由于 `Container` 与 `BlockEntity` 有大量重叠。只要可能，最好通过把 `BlockEntity` 转换为 `Container` 来获取容器：

```java
if (blockEntity instanceof Container container) {
    // 对容器做一些事情
}
```

随后即可使用之前提到的方法，例如：

```java
// 获取容器中的第一个物品。
ItemStack stack = container.getItem(0);

// 将 Container 中的第一个物品设为泥土。
container.setItem(0, new ItemStack(Items.DIRT));

// 从第三个槽位移除一定数量的物品（最多 16 个）。
container.removeItem(2, 16);
```

:::warning
如果尝试访问超过容器大小的槽位，容器可能抛出异常。也可能返回 `ItemStack.EMPTY`，例如 `SimpleContainer` 就是这样。
:::

### `ContainerUser`

能够访问容器的生命实体会实现 `ContainerUser`。每个 user 都会定义自己是否打开了容器，以及该实体能与容器互动的最大方块距离。与容器对象互动时（例如右键点击箱子），`Container` 会使用 `ContainerUser` 调用 `startOpen`；容器对象关闭后（例如退出箱子菜单），调用 `stopOpen`。

这些方法通常用于通过 `ContainerOpenersCounter` 追踪打开容器的生命实体数量；该计数器用于部分实体 AI 与渲染。

## `ItemStack` 上的 `Container`

到目前为止，主要讨论的是 `BlockEntity` 上的 `Container`。不过，也可以使用 `minecraft:container` [数据组件][datacomponent] 将其应用到 [`ItemStack`][itemstack]：

```java
// 我们在这里使用 SimpleContainer 作为超类，因此我们不必自己重新实现物品处理逻辑。
// 由于 SimpleContainer 的实现细节，如果多方参与，此可能会导致竞争条件
// 可以同时访问 Container，因此这里直接假定模组不允许这种情况。
// 如果需要，你当然可以使用 Container 的不同实现（或自己实现容器）。
public class MyBackpackContainer extends SimpleContainer {
    // 此 Container 对应的 ItemStack；由构造器传入并设置。
    private final ItemStack stack;
    
    public MyBackpackContainer(ItemStack stack) {
        // 我们将所需的容器尺寸称为 super。
        super(27);
        // 设置 ItemStack 字段。
        this.stack = stack;
        // 我们从数据组件（如果存在）加载容器内容，该数据表示
        // 由 ItemContainerContents 类组成。如果不存在，我们使用 ItemContainerContents.EMPTY。
        ItemContainerContents contents = stack.getOrDefault(DataComponents.CONTAINER, ItemContainerContents.EMPTY);
        // 将数据组件内容复制到我们的 ItemStack 列表中。
        contents.copyInto(this.getItems());
    }

    // 当内容发生变化时，将数据组件保存到 ItemStack 上。
    @Override
    public void setChanged() {
        super.setChanged();
        this.stack.set(DataComponents.CONTAINER, ItemContainerContents.fromItems(this.getItems()));
    }
}
```

这样就创建了由物品提供底层支持的容器！调用 `new MyBackpackContainer(stack)` 即可为菜单或其他用例创建容器。

:::warning
请注意，直接与 `Container` 交互的菜单在修改 `ItemStack` 时必须对其调用 `#copy()`，否则会破坏数据组件的不可变约定。NeoForge 为此提供了 `StackCopySlot` 类。
:::

## `Entity` 上的 `Container`

[`Entity`][entity] 上的 `Container` 处理起来很棘手：无法以通用方式判断实体是否有容器。这完全取决于正在处理的实体，因此可能需要大量特殊处理。

如果自行创建实体，可以直接让它实现 `Container`；但请注意，无法使用 `SimpleContainer` 等超类（因为 `Entity` 已经是超类）。

### `Mob` 上的 `Container`

`Mob` 不实现 `Container`，但会实现 `EquipmentUser` 接口（以及其他接口）。该接口定义 `#setItemSlot(EquipmentSlot, ItemStack)`、`#getItemBySlot(EquipmentSlot)` 与 `#setDropChance(EquipmentSlot, float)` 方法。尽管代码层面与 `Container` 无关，但功能十分相似：都是把槽位与 `ItemStack` 关联起来；这里关联的是装备槽位。

与 `Container` 最显著的区别是，它没有类似 list 的顺序（尽管 `Mob` 在后台使用 `NonNullList<ItemStack>`）。访问不是通过槽位索引进行，而是通过七个 `EquipmentSlot` 枚举值：`MAINHAND`、`OFFHAND`、`FEET`、`LEGS`、`CHEST`、`HEAD` 和 `BODY`（其中 `BODY` 用于马和狗的盔甲）。

与生物 “槽位”交互的示例如下：

```java
// 获取HEAD（头盔）槽中的ItemStack。
ItemStack helmet = mob.getItemBySlot(EquipmentSlot.HEAD);

// 将基岩放入生物的 FEET（靴子）槽中。
mob.setItemSlot(EquipmentSlot.FEET, new ItemStack(Items.BEDROCK));

// 使该基岩在生物被杀死时始终掉落。
mob.setDropChance(EquipmentSlot.FEET, 1f);
```

### `InventoryCarrier`

`InventoryCarrier` 是村民等部分生命实体实现的接口。它声明 `#getInventory` 方法，返回 `SimpleContainer`。需要实际物品栏、而不只是 `EquipmentUser` 提供的装备槽位的非玩家实体会使用此接口。

### `Player` 上的 `Container`（玩家物品栏）

玩家物品栏通过 `Inventory` 类实现；该类同时实现 `Container` 与之前提到的 `Nameable` 接口。随后，`Inventory` 实例作为名为 `inventory` 的字段存储在 `Player` 上，可通过 `Player#getInventory` 访问。可以像与其他容器一样与物品栏交互。

物品栏内容存储在两个位置：

- `NonNullList<ItemStack> items` list 包含 36 个主物品栏槽位，其中包括 9 个快捷栏槽位（索引 0–8）。
- `EntityEquipment equipment` map 负责按顺序存储 `EquipmentSlot` 对应的物品栈：包括护甲槽（`FEET`, `LEGS`, `CHEST`, `HEAD`）, `OFFHAND`, `BODY` 以及 `SADDLE`。

迭代物品栏内容时，建议先迭代 `items`，再使用 `Inventory#EQUIPMENT_SLOT_MAPPING` 作为索引迭代 `equipment`。

[beremove]: ../blockentities/index.md#removing-block-entities
[block]: ../blocks/index.md
[blockentity]: ../blockentities/index.md
[component]: ../resources/client/i18n.md#components
[datacomponent]: ../items/datacomponents.md
[entity]: ../entities/index.md
[item]: ../items/index.md
[itemstack]: ../items/index.md#itemstacks
[menu]: menus.md
