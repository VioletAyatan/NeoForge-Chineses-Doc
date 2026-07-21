# 菜单

菜单是图形用户界面（GUI）的一种后端；它处理与所表示的数据 holder 交互有关的逻辑。菜单本身不是数据 holder，而是允许用户间接修改内部数据 holder 状态的 view。因此，数据 holder 不应与任何菜单直接耦合，而应传入要调用和修改的数据引用。

## `MenuType`

菜单会动态创建和移除，因此不是 registry 对象。取而代之的是注册另一个 factory 对象，以便轻松创建并引用菜单的*类型*。对于菜单，这种对象就是 `MenuType`。

`MenuType` 必须[注册][registered]。

### `MenuSupplier`

将 `MenuSupplier` 与 `FeatureFlagSet` 传入 `MenuType` constructor，即可创建 `MenuType`。`MenuSupplier` 表示一个 function：接受 Container id 与查看菜单的玩家物品栏，返回新创建的 [`AbstractContainerMenu`][acm]。

```java
// For some DeferredRegister<MenuType<?>> REGISTER
public static final Supplier<MenuType<MyMenu>> MY_MENU = REGISTER.register("my_menu", () -> new MenuType<>(MyMenu::new, FeatureFlags.DEFAULT_FLAGS));

// In MyMenu, an AbstractContainerMenu subclass
public MyMenu(int containerId, Inventory playerInv) {
    super(MY_MENU.get(), containerId);
    // ...
}
```

:::note
Container identifier 对单个玩家而言是唯一的。这意味着两个不同玩家上的相同 Container id 表示两个不同菜单，即使他们查看的是同一个数据 holder。
:::

`MenuSupplier` 通常负责在客户端创建菜单，并使用虚拟数据引用来存储服务端数据 holder 同步而来的信息并与之交互。

### `IContainerFactory`

如果客户端需要额外信息（例如数据 holder 在世界中的位置），可以改用 subclass `IContainerFactory`。除 Container id 与玩家物品栏外，它还提供 `RegistryFriendlyByteBuf`，可存储服务端发送的额外信息。可以通过 `IMenuTypeExtension#create` 使用 `IContainerFactory` 创建 `MenuType`。

```java
// For some DeferredRegister<MenuType<?>> REGISTER
public static final Supplier<MenuType<MyMenuExtra>> MY_MENU_EXTRA = REGISTER.register("my_menu_extra", () -> IMenuTypeExtension.create(MyMenu::new));

// In MyMenuExtra, an AbstractContainerMenu subclass
public MyMenuExtra(int containerId, Inventory playerInv, FriendlyByteBuf extraData) {
    super(MY_MENU_EXTRA.get(), containerId);
    // Store extra data from buffer
    // ...
}
```

## `AbstractContainerMenu`

所有菜单都扩展自 `AbstractContainerMenu`。菜单接受两个参数：表示菜单自身类型的 [`MenuType`][mt]，以及表示当前访问者所用菜单唯一 identifier 的 Container id。

:::note
菜单 identifier 在 0–99 之间循环，每当玩家打开菜单时递增。
:::

每个菜单应包含两个 constructor：一个用于在服务端初始化菜单，另一个用于在客户端初始化菜单。用于在客户端初始化菜单的 constructor 就是提供给 `MenuType` 的 constructor。服务端菜单 constructor 包含的任何 field，都应在客户端菜单 constructor 中有某个默认值。

```java
// Client menu constructor
public MyMenu(int containerId, Inventory playerInventory) { // optional FriendlyByteBuf parameter if reading data from server
    this(containerId, playerInventory, /* Any default parameters here */);
}

// Server menu constructor
public MyMenu(int containerId, Inventory playerInventory, /* Any additional parameters here. */) {
    // ...
}
```

:::note
如果菜单中不需要显示额外数据，只需一个 constructor。
:::

每个菜单实现都必须实现两个方法：`#stillValid` 与 [`#quickMoveStack`][qms]。

### `#stillValid` 与 `ContainerLevelAccess`

`#stillValid` 判断给定玩家是否应继续打开菜单。它通常会转发到 static `#stillValid`，后者接受 `ContainerLevelAccess`、玩家，以及此菜单附加到的 `Block`。客户端菜单必须始终为此方法返回 `true`，static `#stillValid` 默认就是如此。此实现会检查玩家是否位于数据存储对象所在位置的八个 Block 范围内。

`ContainerLevelAccess` 在封闭 scope 内提供当前 Level 与 Block 位置。在服务端构造菜单时，可调用 `ContainerLevelAccess#create` 创建新的 access。客户端菜单 constructor 可以传入不会执行任何操作的 `ContainerLevelAccess#NULL`。

```java
// Client menu constructor
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(containerId, playerInventory, ContainerLevelAccess.NULL);
}

// Server menu constructor
public MyMenuAccess(int containerId, Inventory playerInventory, ContainerLevelAccess access) {
    // ...
}

// Assume this menu is attached to Supplier<Block> MY_BLOCK
@Override
public boolean stillValid(Player player) {
    return AbstractContainerMenu.stillValid(this.access, player, MY_BLOCK.get());
}
```

### 数据同步

有些数据需要同时存在于服务端和客户端，才能向玩家显示。为此，菜单实现了基础数据同步层：只要当前数据与上次同步到客户端的数据不匹配，就进行同步。对于玩家，每个 tick 都会检查。

Minecraft 默认支持两种数据同步形式：通过 `Slot` 同步 [`ItemStack`][itemstack]，以及通过 `DataSlot` 同步整数。`Slot` 与 `DataSlot` 是持有数据存储引用的 view；只要操作有效，玩家就可以在 screen 中修改这些数据。每种数据同步方法都会向服务端菜单 constructor 添加一个参数，而客户端则会创建一个虚拟实例，用于写入服务端发送的数据。

#### `DataSlot`

`DataSlot` 是 abstract class，应实现 getter 与 setter 以引用数据存储对象中保存的数据。客户端菜单 constructor 应始终通过 `DataSlot#standalone` 提供新实例。随后可使用 `#addDataSlot` 将 DataSlot 添加到菜单。

与 Slot 一样，每次初始化新菜单时都应重新创建它们。

:::note
尽管 `DataSlot` 存储整数，但由于通过网络发送值的方式，它实际上被限制为 **short**（-32768 到 32767）。整数的高 16 bit 会被忽略。

NeoForge 对 packet 进行了 patch，以向客户端提供完整整数。
:::

```java
// Assume we have a DataSlot constructed on each initialization of the server menu

// Client menu constructor
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(
        containerId, playerInventory,
        // Pass in a dummy slot to hold the server-synced values
        DataSlot.standalone()
    );
}

// Server menu constructor
public MyMenuAccess(int containerId, Inventory playerInventory, DataSlot dataSingle) {
    // Add data slots for handled integers
    this.addDataSlot(dataSingle);

    // ...
}
```

#### `ContainerData`

如果需要向客户端同步多个整数，可以改用 `ContainerData` 引用这些整数。此 interface 的作用类似索引查找，每个索引表示不同的整数。如果通过 `#addDataSlots` 将 `ContainerData` 添加到菜单，也可以在数据对象本身中构造 `ContainerData`。该方法会按 interface 指定的数据数量创建新的 `DataSlot`。客户端菜单 constructor 应始终通过 `SimpleContainerData` 提供新实例。

```java
// Assume we have a ContainerData of size 3

// Client menu constructor
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(containerId, playerInventory, new SimpleContainerData(3));
}

// Server menu constructor
public MyMenuAccess(int containerId, Inventory playerInventory, ContainerData dataMultiple) {
    // Check if the ContainerData size is some fixed value
    checkContainerDataCount(dataMultiple, 3);

    // Add data slots for handled integers
    this.addDataSlots(dataMultiple);

    // ...
}
```

#### `Slot`

`Slot` 表示对物品栏中某个 [`ItemStack`][itemstack] 的引用。每个 `Slot` 至少有四个参数：ItemStack 所在的物品栏、此 Slot 具体表示的 ItemStack 索引，以及 Slot 左上角在 screen 上相对于 `AbstractContainerScreen#leftPos` 与 `#topPos` 的渲染 x、y 位置。任何额外参数通常都会为 Slot 处理独特行为提供 context，例如只接受视为燃料的 Item，或阻止取出 Item。

服务端菜单 constructor 应接受物品栏实例或 view。客户端菜单 constructor 则应始终提供同样大小的空物品栏实例，以便写入服务端数据。随后可以使用 `#addSlot` 将所需 Slot 或其某个 subtype 添加到菜单。

对于 [`Container`][container]，客户端菜单通常传入 `SimpleContainer`，并使用常规 `Slot` 添加。对于 [`ResourceHandler<ItemResource>` capability][cap]，客户端菜单通常传入 `ItemStacksResourceHandler`，并使用 `ResourceHandlerSlot` 添加。

大多数情况下，先添加菜单包含的所有 Slot，再添加玩家物品栏，最后添加玩家快捷栏。要从菜单访问任何单独的 `Slot`，必须根据添加 Slot 的顺序计算索引。

```java
// Assume we have an inventory from a data object of size 10

// Client menu constructor
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(containerId, playerInventory, new ItemStacksResourceHandler(10));
}

// Server menu constructor
public MyMenuAccess(int containerId, Inventory playerInventory, StacksResourceHandler<ItemStack, ItemResource> dataInventory) {
    // Check if the data inventory size is some fixed value
    int dataSize = dataInventory.getSlots();
    if (dataSize < 10) {
        throw new IllegalArgumentException("Container size " + dataSize + " is smaller than expected " + 5);
    }

    // Then, add slots for data inventory
    // If you are using a subtype of slot, make sure any data
    // used on the server is also available on the client.

    // Create the inventory by looping through the positions and
    // adding the slots.

    // Two rows
    for (int j = 0; j < 2; j++) {
        // Five columns
        for (int i = 0; i < 5; i++) {
            // Add for each slot in the data inventory
            this.addSlot(new ResourceHandlerSlot(
                // The inventory
                dataInventory,
                // The index modifier to mutate the stored resources
                dataInventory::set,
                // The index of the data inventory this slot represents:
                // rowIndex * columnCount + columnIndex
                j * 5 + i,
                // The x position relative to leftPos
                // Vanilla slots are 18 units by default
                // startX + columnIndex * slotRenderWidth
                44 + i * 18,
                // The y position relative to topPos
                // Vanilla slots are 18 units by default
                // startY + rowIndex * slotRenderHeight
                20 + j * 18
            ))
        }
    }

    // Add slots for player inventory (all 27 + 9 hotbar slots)
    // If you want to customize the 9x3 + 9 grid to something else,
    // loop through like above
    this.addStandardInventorySlots(
        playerInventory,
        // The starting x position relative to leftPos
        8,
        // The starting y position relative to topPos
        84
    );

    // ...
}
```

#### `#quickMoveStack`

`#quickMoveStack` 是任何菜单都必须实现的第二个方法。每当 Shift 点击某个 ItemStack，即快速移出当前 Slot 时，都会调用此方法，直到 ItemStack 已完全移出原 Slot，或无处可放。该方法返回正在快速移动的 Slot 中 ItemStack 的副本。

ItemStack 通常通过 `#moveItemStackTo` 在 Slot 之间移动，它会把 ItemStack 移到第一个可用 Slot。该方法接受待移动 ItemStack、尝试移入的第一个 Slot 索引（含）、最后一个 Slot 索引（不含），以及是从第一个到最后一个检查 Slot（`false`），还是从最后一个到第一个检查（`true`）。

在 Minecraft 各种实现中，此方法的逻辑相当一致：

```java
// Assume we have a data inventory of size 5
// The inventory has 4 inputs (index 1 - 4) which outputs to a result slot (index 0)
// We also have the 27 player inventory slots and the 9 hotbar slots
// As such, the actual slots are indexed like so:
//   - Data Inventory: Result (0), Inputs (1 - 4)
//   - Player Inventory (5 - 31)
//   - Player Hotbar (32 - 40)
@Override
public ItemStack quickMoveStack(Player player, int quickMovedSlotIndex) {
    // The quick moved slot stack
    ItemStack quickMovedStack = ItemStack.EMPTY;
    // The quick moved slot
    Slot quickMovedSlot = this.slots.get(quickMovedSlotIndex);
  
    // If the slot is in the valid range and the slot is not empty
    if (quickMovedSlot != null && quickMovedSlot.hasItem()) {
        // Get the raw stack to move
        ItemStack rawStack = quickMovedSlot.getItem(); 
        // Set the slot stack to a copy of the raw stack
        quickMovedStack = rawStack.copy();

        /*
        The following quick move logic can be simplified to if in data inventory,
        try to move to player inventory/hotbar and vice versa for containers
        that cannot transform data (e.g. chests).
        */

        // If the quick move was performed on the data inventory result slot
        if (quickMovedSlotIndex == 0) {
            // Try to move the result slot into the player inventory/hotbar
            if (!this.moveItemStackTo(rawStack, 5, 41, true)) {
                // If cannot move, no longer quick move
                return ItemStack.EMPTY;
            }

            // Perform logic on result slot quick move
            quickMovedSlot.onQuickCraft(rawStack, quickMovedStack);
        }
        // Else if the quick move was performed on the player inventory or hotbar slot
        else if (quickMovedSlotIndex >= 5 && quickMovedSlotIndex < 41) {
            // Try to move the inventory/hotbar slot into the data inventory input slots
            if (!this.moveItemStackTo(rawStack, 1, 5, false)) {
                // If cannot move and in player inventory slot, try to move to hotbar
                if (quickMovedSlotIndex < 32) {
                    if (!this.moveItemStackTo(rawStack, 32, 41, false)) {
                        // If cannot move, no longer quick move
                        return ItemStack.EMPTY;
                    }
                }
                // Else try to move hotbar into player inventory slot
                else if (!this.moveItemStackTo(rawStack, 5, 32, false)) {
                    // If cannot move, no longer quick move
                    return ItemStack.EMPTY;
                }
            }
        }
        // Else if the quick move was performed on the data inventory input slots, try to move to player inventory/hotbar
        else if (!this.moveItemStackTo(rawStack, 5, 41, false)) {
            // If cannot move, no longer quick move
            return ItemStack.EMPTY;
        }

        if (rawStack.isEmpty()) {
            // If the raw stack has completely moved out of the slot, set the slot to the empty stack
            quickMovedSlot.setByPlayer(ItemStack.EMPTY);
        } else {
            // Otherwise, notify the slot that that the stack count has changed
            quickMovedSlot.setChanged();
        }

        // Execute logic on what to do post move with the remaining stack
        // This can be removed if there are no `Slot` subtypes that override `onTake`
        quickMovedSlot.onTake(player, rawStack);
    }

    return quickMovedStack; // Return the slot stack
}
```

## 打开菜单

注册 MenuType、完成菜单本身并附加 [screen][screen] 后，玩家即可打开菜单。在逻辑服务端对玩家调用 `IPlayerExtension#openMenu` 可以打开菜单。该方法接受服务端菜单的 `MenuProvider`；如果需要向客户端同步额外数据，还可选择接受 `Consumer<RegistryFriendlyByteBuf>`。

:::note
只有当 MenuType 使用 [`IContainerFactory`][icf] 创建时，才应使用带 `Consumer<RegistryFriendlyByteBuf>` 参数的 `IPlayerExtension#openMenu`。
:::

#### `MenuProvider`

`MenuProvider` 是包含两个方法的 interface：`#createMenu` 创建菜单的服务端实例；`#getDisplayName` 返回包含菜单标题的 component，以传给 [screen][screen]。`#createMenu` 方法包含三个参数：菜单的 Container id、打开菜单的玩家物品栏，以及打开菜单的玩家。

可以使用 `SimpleMenuProvider` 轻松创建 `MenuProvider`；它接受用于创建服务端菜单的方法引用与菜单标题。

```java
// In some implementation with access to the Player on the logical server (e.g. ServerPlayer instance)
// Assume we have ServerPlayer serverPlayer
serverPlayer.openMenu(new SimpleMenuProvider(
    (containerId, playerInventory, player) -> new MyMenu(containerId, playerInventory, /* server parameters */),
    Component.translatable("menu.title.examplemod.mymenu")
));
```

### 常见实现

菜单通常在某种玩家交互时打开（例如右键点击 Block 或 Entity）。

#### Block 实现

Block 通常通过覆盖 `BlockBehaviour#useWithoutItem` 来实现菜单，并为该[交互][interaction]返回 `InteractionResult#SUCCESS`。

应通过覆盖 `BlockBehaviour#getMenuProvider` 来实现 `MenuProvider`。Vanilla 方法使用它在旁观者模式查看菜单。

```java
// In some Block subclass
@Override
public MenuProvider getMenuProvider(BlockState state, Level level, BlockPos pos) {
    return new SimpleMenuProvider(/* ... */);
}

@Override
public InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult result) {
    if (!level.isClientSide() && player instanceof ServerPlayer serverPlayer) {
        serverPlayer.openMenu(state.getMenuProvider(level, pos));
    }

    return InteractionResult.SUCCESS;
}
```

:::note
这是实现逻辑最简单的方式，并不是唯一方式。如果只希望 Block 在特定条件下打开菜单，就需要事先将一些数据同步到客户端，以便条件不满足时返回 `InteractionResult#PASS` 或 `#FAIL`。
:::

#### Mob 实现

Mob 通常通过覆盖 `Mob#mobInteract` 来实现菜单。其做法与 Block 实现类似，唯一区别是 `Mob` 本身应实现 `MenuProvider`，以支持在旁观者模式查看。

```java
public class MyMob extends Mob implements MenuProvider {
    // ...

    @Override
    public InteractionResult mobInteract(Player player, InteractionHand hand) {
        if (!this.level.isClientSide() && player instanceof ServerPlayer serverPlayer) {
            serverPlayer.openMenu(this);
        }

        return InteractionResult.SUCCESS;
    }
}
```

:::note
同样，这是实现逻辑最简单的方式，并不是唯一方式。
:::

[registered]: ../concepts/registries.md#methods-for-registering
[acm]: #abstractcontainermenu
[mt]: #menutype
[qms]: #quickmovestack
[cap]: capabilities.md#neoforge-provided-capabilities
[container]: container.md
[screen]: ../rendering/screens.md
[icf]: #icontainerfactory
[side]: ../concepts/sides.md#the-logical-side
[interaction]: ../items/interactions.md#right-clicking-an-item
[itemstack]: ../items/index.md#itemstacks
