# 容器（Containers）

[BlockEntity][blockentity] 的常见用途之一是存储某种 Item。Minecraft 中一些最重要的 [Block][block]，例如熔炉或箱子，都会为此使用 BlockEntity。要在某个对象上存储 Item，Minecraft 使用 `Container`。

`Container` interface 定义 `#getItem`、`#setItem` 与 `#removeItem` 等方法，可用于查询和更新 Container。由于它是 interface，因此实际上并不包含底层 list 或其他数据结构；这由实现系统决定。

因此，`Container` 不仅可以在 BlockEntity 上实现，也可以由任何其他 class 实现。典型示例包括 Entity 物品栏，以及背包等常见模组 [Item][item]。

:::warning
NeoForge 提供 `ItemStacksResourceHandler` class，用于在许多位置替代 `Container`。只要可能，就应优先使用它而不是 `Container`，因为它能以更简洁的方式与其他 `Container`／`ItemStacksResourceHandler` 交互。

本文存在的主要原因是为 Vanilla 代码提供参考，或供你开发多 loader 模组时使用。在自己的代码中，只要可能，就始终使用 `ItemStacksResourceHandler`！相关文档仍在编写中。
:::

## 基础 Container 实现

只要满足指定的方法（与 Java 中的其他 interface 相同），就可以按任意方式实现 Container。不过，通常会使用固定长度的 `NonNullList<ItemStack>` 作为底层结构。单槽位 Container 也可以只使用一个 `ItemStack` field。

例如，一个有 27 个槽位（一个箱子大小）的基础 `Container` 实现如下：

```java
public class MyContainer implements Container {
    private final NonNullList<ItemStack> items = NonNullList.withSize(
            // The size of the list, i.e. the amount of slots in our container.
            27,
            // The default value to be used in place of where you'd use null in normal lists.
            ItemStack.EMPTY
    );

    // The amount of slots in our container.
    @Override
    public int getContainerSize() {
        return 27;
    }

    // Whether the container is considered empty.
    @Override
    public boolean isEmpty() {
        return this.items.stream().allMatch(ItemStack::isEmpty);
    }

    // Return the item stack in the specified slot.
    @Override
    public ItemStack getItem(int slot) {
        return this.items.get(slot);
    }

    // Remove the specified amount of items from the given slot, returning the stack that was just removed.
    // We defer to ContainerHelper here, which does this as expected for us.
    // However, we must call #setChanged manually.
    @Override
    public ItemStack removeItem(int slot, int amount) {
        ItemStack stack = ContainerHelper.removeItem(this.items, slot, amount);
        this.setChanged();
        return stack;
    }

    // Remove all items from the specified slot, returning the stack that was just removed.
    // We again defer to ContainerHelper here, and we again have to call #setChanged manually.
    @Override
    public ItemStack removeItemNoUpdate(int slot) {
        ItemStack stack = ContainerHelper.takeItem(this.items, slot);
        this.setChanged();
        return stack;
    }

    // Set the given item stack in the given slot. Limit to the max stack size of the container first.
    @Override
    public void setItem(int slot, ItemStack stack) {
        stack.limitSize(this.getMaxStackSize(stack));
        this.items.set(slot, stack);
        this.setChanged();
    }

    // Call this when changes are done to the container, i.e. when item stacks are added, modified, or removed.
    // For example, you could call BlockEntity#setChanged here.
    @Override
    public void setChanged() {

    }

    // Whether the container is considered "still valid" for the given player. For example, chests and
    // similar blocks check if the player is still within a given distance of the block here.
    @Override
    public boolean stillValid(Player player) {
        return true;
    }

    // Clear the internal storage, setting all slots to empty again.
    @Override
    public void clearContent() {
        items.clear();
        this.setChanged();
    }
}
```

### `SimpleContainer`

`SimpleContainer` class 是一个附带少量额外功能的基础 Container 实现。如果需要没有特殊要求的 Container 实现，可以使用它。

### `BaseContainerBlockEntity`

`BaseContainerBlockEntity` class 是 Minecraft 中许多重要 BlockEntity 的基础 class，例如箱子及类似箱子的 Block、各种类型的熔炉、漏斗、发射器、投掷器、酿造台及其他少数对象。

除 `Container` 外，它还实现 `MenuProvider` 与 `Nameable` interface：

- `Nameable` 定义几个与设置（自定义）名称有关的方法。除许多 BlockEntity 外，`Entity` 等 class 也会实现它。它使用 [`Component` 系统][component]。
- 另一方面，`MenuProvider` 定义 `#createMenu` 方法，允许从 Container 构造 [`AbstractContainerMenu`][menu]。这意味着，如果想要一个没有关联 GUI 的 Container（例如唱片机），就不适合使用此 class。

`BaseContainerBlockEntity` 通过 `#getItems` 与 `#setItems` 两个方法，封装通常会对 `NonNullList<ItemStack>` 执行的所有调用，从而大幅减少必须编写的样板代码。`BaseContainerBlockEntity` 的示例实现如下：

```java
public class MyBlockEntity extends BaseContainerBlockEntity {
    // The container size. This can of course be any value you want.
    public static final int SIZE = 9;
    // Our item stack list. This is not final due to #setItems existing.
    private NonNullList<ItemStack> items = NonNullList.withSize(SIZE, ItemStack.EMPTY);

    // The constructor, like before.
    public MyBlockEntity(BlockPos pos, BlockState blockState) {
        super(MY_BLOCK_ENTITY.get(), pos, blockState);
    }

    // The container size, like before.
    @Override
    public int getContainerSize() {
        return SIZE;
    }

    // The getter for our item stack list.
    @Override
    protected NonNullList<ItemStack> getItems() {
        return items;
    }

    // The setter for our item stack list.
    @Override
    protected void setItems(NonNullList<ItemStack> items) {
        this.items = items;
    }

    // The display name of the menu. Don't forget to add a translation!
    @Override
    protected Component getDefaultName() {
        return Component.translatable("container.examplemod.myblockentity");
    }

    // The menu to create from this container. See below for what to return here.
    @Override
    protected AbstractContainerMenu createMenu(int containerId, Inventory inventory) {
        return null;
    }
}
```

请记住，此 class 同时是 `BlockEntity` 与 `Container`。这意味着可以将其用作 BlockEntity 的 supertype，从而得到带有预实现 Container 的可用 BlockEntity。

:::note
实现 `Container` 的 `BlockEntity` 默认会处理其内容的掉落。如果选择不实现 `Container`，则需要自行处理[移除逻辑][beremove]。
:::

### `WorldlyContainer`

`WorldlyContainer` 是 `Container` 的 sub-interface，允许按 `Direction` 访问给定 `Container` 的槽位。它主要用于只向特定一侧暴露 Container 一部分的 BlockEntity。例如，可用于一侧输出、其他所有侧输入的机器，反之亦然。该 interface 的简单实现如下：

```java
// See BaseContainerBlockEntity methods above. You can of course extend BlockEntity directly
// and implement Container yourself if needed.
public class MyBlockEntity extends BaseContainerBlockEntity implements WorldlyContainer {
    // other stuff here
    
    // Assume that slot 0 is our output and slots 1-8 are our inputs.
    // Further assume that we output to the top and take inputs from all other sides.
    private static final int[] OUTPUTS = new int[]{0};
    private static final int[] INPUTS = new int[]{1, 2, 3, 4, 5, 6, 7, 8};

    // Return an array of exposed slot indices based on the passed Direction.
    @Override
    public int[] getSlotsForFace(Direction side) {
        return side == Direction.UP ? OUTPUTS : INPUTS;
    }

    // Whether items can be placed through the given side at the given slot.
    // For our example, we return true only if we're not inputing from above and are in the index range [1, 8].
    @Override
    public boolean canPlaceItemThroughFace(int index, ItemStack itemStack, @Nullable Direction direction) {
        return direction != Direction.UP && index > 0 && index < 9;
    }

    // Whether items can be taken from the given side and the given slot.
    // For our example, we return true only if we're pulling from above and from slot index 0.
    @Override
    public boolean canTakeItemThroughFace(int index, ItemStack stack, Direction direction) {
        return direction == Direction.UP && index == 0;
    }
}
```

## 使用 Container

创建 Container 后，下面来使用它们。

由于 `Container` 与 `BlockEntity` 有大量重叠，只要可能，最好通过把 BlockEntity cast 为 `Container` 来获取 Container：

```java
if (blockEntity instanceof Container container) {
    // do something with the container
}
```

随后即可使用之前提到的方法，例如：

```java
// Get the first item in the container.
ItemStack stack = container.getItem(0);

// Set the first item in the container to dirt.
container.setItem(0, new ItemStack(Items.DIRT));

// Removes a quantity of (up to) 16 from the third slot.
container.removeItem(2, 16);
```

:::warning
如果尝试访问超过 Container 大小的槽位，Container 可能抛出 exception。也可能返回 `ItemStack.EMPTY`，例如 `SimpleContainer` 就是这样。
:::

### `ContainerUser`

能够访问 Container 的 LivingEntity 会实现 `ContainerUser`。每个 user 都会定义自己是否打开了 Container，以及该 Entity 能与 Container 交互的最大 Block 距离。与 Container 对象交互时（例如右键点击箱子），`Container` 会使用 `ContainerUser` 调用 `startOpen`；Container 对象关闭后（例如退出箱子菜单），调用 `stopOpen`。

这些方法通常用于通过 `ContainerOpenersCounter` 追踪打开 Container 的 LivingEntity 数量；该计数器用于部分 Entity AI 与渲染。

## `ItemStack` 上的 `Container`

到目前为止，主要讨论的是 `BlockEntity` 上的 `Container`。不过，也可以使用 `minecraft:container` [数据组件][datacomponent] 将其应用到 [`ItemStack`][itemstack]：

```java
// We use SimpleContainer as the superclass here so we don't have to reimplement the item handling logic ourselves.
// Due to implementation details of SimpleContainer, this may lead to race conditions if multiple parties
// can access the container at the same time, so we're just going to assume our mod doesn't allow that.
// You may of course use a different implementation of Container (or implement Container yourself) if needed.
public class MyBackpackContainer extends SimpleContainer {
    // The item stack this container is for. Passed into and set in the constructor.
    private final ItemStack stack;
    
    public MyBackpackContainer(ItemStack stack) {
        // We call super with our desired container size.
        super(27);
        // Setting the stack field.
        this.stack = stack;
        // We load the container contents from the data component (if present), which is represented
        // by the ItemContainerContents class. If absent, we use ItemContainerContents.EMPTY.
        ItemContainerContents contents = stack.getOrDefault(DataComponents.CONTAINER, ItemContainerContents.EMPTY);
        // Copy the data component contents into our item stack list.
        contents.copyInto(this.getItems());
    }

    // When the contents are changed, we save the data component on the stack.
    @Override
    public void setChanged() {
        super.setChanged();
        this.stack.set(DataComponents.CONTAINER, ItemContainerContents.fromItems(this.getItems()));
    }
}
```

这样就创建了由 Item 提供底层支持的 Container！调用 `new MyBackpackContainer(stack)` 即可为菜单或其他用例创建 Container。

:::warning
请注意，直接与 `Container` 交互的菜单在修改 `ItemStack` 时必须对其调用 `#copy()`，否则会破坏数据组件的 immutable 约定。NeoForge 为此提供了 `StackCopySlot` class。
:::

## `Entity` 上的 `Container`

[`Entity`][entity] 上的 `Container` 处理起来很棘手：无法以通用方式判断 Entity 是否有 Container。这完全取决于正在处理的 Entity，因此可能需要大量特殊处理。

如果自行创建 Entity，可以直接让它实现 `Container`；但请注意，无法使用 `SimpleContainer` 等 superclass（因为 `Entity` 已经是 superclass）。

### `Mob` 上的 `Container`

`Mob` 不实现 `Container`，但会实现 `EquipmentUser` interface（以及其他 interface）。该 interface 定义 `#setItemSlot(EquipmentSlot, ItemStack)`、`#getItemBySlot(EquipmentSlot)` 与 `#setDropChance(EquipmentSlot, float)` 方法。尽管代码层面与 `Container` 无关，但功能十分相似：都是把槽位与 `ItemStack` 关联起来；这里关联的是装备槽位。

与 `Container` 最显著的区别是，它没有类似 list 的顺序（尽管 `Mob` 在后台使用 `NonNullList<ItemStack>`）。访问不是通过槽位索引进行，而是通过七个 `EquipmentSlot` enum 值：`MAINHAND`、`OFFHAND`、`FEET`、`LEGS`、`CHEST`、`HEAD` 和 `BODY`（其中 `BODY` 用于马和狗的盔甲）。

与 Mob “槽位”交互的示例如下：

```java
// Get the item stack in the HEAD (helmet) slot.
ItemStack helmet = mob.getItemBySlot(EquipmentSlot.HEAD);

// Put bedrock into the mob's FEET (boots) slot.
mob.setItemSlot(EquipmentSlot.FEET, new ItemStack(Items.BEDROCK));

// Enable that bedrock to always drop if the mob is killed.
mob.setDropChance(EquipmentSlot.FEET, 1f);
```

### `InventoryCarrier`

`InventoryCarrier` 是村民等部分 LivingEntity 实现的 interface。它声明 `#getInventory` 方法，返回 `SimpleContainer`。需要实际物品栏、而不只是 `EquipmentUser` 提供的装备槽位的非玩家 Entity 会使用此 interface。

### `Player` 上的 `Container`（玩家物品栏）

玩家物品栏通过 `Inventory` class 实现；该 class 同时实现 `Container` 与之前提到的 `Nameable` interface。随后，`Inventory` 实例作为名为 `inventory` 的 field 存储在 `Player` 上，可通过 `Player#getInventory` 访问。可以像与其他 Container 一样与物品栏交互。

物品栏内容存储在两个位置：

- `NonNullList<ItemStack> items` list 包含 36 个主物品栏槽位，其中包括 9 个快捷栏槽位（索引 0–8）。
- `EntityEquipment equipment` map 按顺序存储 `EquipmentSlot` ItemStack：盔甲槽位（`FEET`、`LEGS`、`CHEST`、`HEAD`）、`OFFHAND`、`BODY` 与 `SADDLE`。  

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
