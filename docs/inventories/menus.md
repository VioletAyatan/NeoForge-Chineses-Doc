# 菜单（Menus）

菜单是图形用户界面（GUI）的一种后端；它处理与所表示的数据 holder 交互有关的逻辑。菜单本身不是数据 holder，而是允许用户间接修改内部数据 holder 状态的 view。因此，数据 holder 不应与任何菜单直接耦合，而应传入要调用和修改的数据引用。

## `MenuType`

菜单会动态创建和移除，因此不是注册表对象。取而代之的是注册另一个工厂对象，以便轻松创建并引用菜单的*类型*。对于菜单，这种对象就是 `MenuType`。

`MenuType` 必须[注册][registered]。

### `MenuSupplier`

将 `MenuSupplier` 与 `FeatureFlagSet` 传入 `MenuType` 构造器，即可创建 `MenuType`。`MenuSupplier` 表示一个函数：接受容器 id 与查看菜单的玩家物品栏，返回新创建的 [`AbstractContainerMenu`][acm]。

```java
// 对于某些 DeferredRegister<MenuType<?>> REGISTER
public static final Supplier<MenuType<MyMenu>> MY_MENU = REGISTER.register("my_menu", () -> new MenuType<>(MyMenu::new, FeatureFlags.DEFAULT_FLAGS));

// 在 MyMenu 中，AbstractContainerMenu 子类
public MyMenu(int containerId, Inventory playerInv) {
    super(MY_MENU.get(), containerId);
    // ...
}
```

:::info
容器标识符对单个玩家而言是唯一的。这意味着两个不同玩家上的相同容器 ID 表示两个不同菜单，即使他们查看的是同一个数据持有者。
:::

`MenuSupplier` 通常负责在客户端创建菜单，并使用虚拟数据引用来存储服务端数据持有者同步而来的信息并与之交互。

### `IContainerFactory`

如果客户端需要额外信息（例如数据 holder 在世界中的位置），可以改用子类 `IContainerFactory`。除容器 ID 与玩家物品栏外，它还提供 `RegistryFriendlyByteBuf`，可存储服务端发送的额外信息。可以通过 `IMenuTypeExtension#create` 使用 `IContainerFactory` 创建 `MenuType`。

```java
// 对于某些 DeferredRegister<MenuType<?>> REGISTER
public static final Supplier<MenuType<MyMenuExtra>> MY_MENU_EXTRA = REGISTER.register("my_menu_extra", () -> IMenuTypeExtension.create(MyMenu::new));

// 在 MyMenuExtra 中，AbstractContainerMenu 子类
public MyMenuExtra(int containerId, Inventory playerInv, FriendlyByteBuf extraData) {
    super(MY_MENU_EXTRA.get(), containerId);
    // 存储缓冲区中的额外数据
    // ...
}
```

## `AbstractContainerMenu`

所有菜单都扩展自 `AbstractContainerMenu`。菜单接受两个参数：表示菜单自身类型的 [`MenuType`][mt]，以及表示当前访问者所用菜单唯一 identifier 的 Container id。

:::info
菜单 identifier 在 0–99 之间循环，每当玩家打开菜单时递增。
:::

每个菜单应包含两个构造器：一个用于在服务端初始化菜单，另一个用于在客户端初始化菜单。用于在客户端初始化菜单的构造器就是提供给 `MenuType` 的构造器。服务端菜单构造器包含的任何字段，都应在客户端菜单构造器中有某个默认值。

```java
// 客户端菜单构造器
public MyMenu(int containerId, Inventory playerInventory) { // 如果从服务器读取数据则可选 FriendlyByteBuf 参数
    this(containerId, playerInventory, /* 此处任何默认参数*/);
}

// 服务器菜单构造器
public MyMenu(int containerId, Inventory playerInventory, /* 此处有任何其他参数。*/) {
    // ...
}
```

:::info
如果菜单中不需要显示额外数据，只需一个构造器。
:::

每个菜单实现都必须实现两个方法：`#stillValid` 与 [`#quickMoveStack`][qms]。

### `#stillValid` 与 `ContainerLevelAccess`

`#stillValid` 判断给定玩家是否应继续打开菜单。它通常会转发到静态 `#stillValid`，后者接受 `ContainerLevelAccess`、玩家，以及此菜单附加到的 `Block`。客户端菜单必须始终为此方法返回 `true`，静态 `#stillValid` 默认就是如此。此实现会检查玩家是否位于数据存储对象所在位置的八个方块范围内。

`ContainerLevelAccess` 在封闭作用域内提供当前 Level 与方块位置。在服务端构造菜单时，可调用 `ContainerLevelAccess#create` 创建新的访问对象。客户端菜单构造器可以传入不会执行任何操作的 `ContainerLevelAccess#NULL`。

```java
// 客户端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(containerId, playerInventory, ContainerLevelAccess.NULL);
}

// 服务器菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory, ContainerLevelAccess access) {
    // ...
}

// 假设此菜单附加到 Supplier<Block> MY_BLOCK
@Override
public boolean stillValid(Player player) {
    return AbstractContainerMenu.stillValid(this.access, player, MY_BLOCK.get());
}
```

### 数据同步

有些数据需要同时存在于服务端和客户端，才能向玩家显示。为此，菜单实现了基础数据同步层：只要当前数据与上次同步到客户端的数据不匹配，就进行同步。对于玩家，每个 tick 都会检查。

Minecraft 默认支持两种数据同步形式：通过 `Slot` 同步 [`ItemStack`][itemstack]，以及通过 `DataSlot` 同步整数。`Slot` 与 `DataSlot` 是持有数据存储引用的 view；只要操作有效，玩家就可以在 screen 中修改这些数据。每种数据同步方法都会向服务端菜单构造器添加一个参数，而客户端则会创建一个虚拟实例，用于写入服务端发送的数据。

#### `DataSlot`

`DataSlot` 是抽象类，应实现 getter 与 setter 以引用数据存储对象中保存的数据。客户端菜单构造器应始终通过 `DataSlot#standalone` 提供新实例。随后可使用 `#addDataSlot` 将 DataSlot 添加到菜单。

与 Slot 一样，每次初始化新菜单时都应重新创建它们。

:::info
尽管 `DataSlot` 存储整数，但由于通过网络发送值的方式，它实际上被限制为 **short**（-32768 到 32767）。整数的高 16 bit 会被忽略。

NeoForge 对数据包进行了 patch，以向客户端提供完整整数。
:::

```java
// 假设我们在服务器菜单的每次初始化时构造了一个 DataSlot

// 客户端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(
        containerId, playerInventory,
        // 传入一个虚拟槽位来保存服务器同步的值
        DataSlot.standalone()
    );
}

// 服务器菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory, DataSlot dataSingle) {
    // 为处理的整数添加数据槽
    this.addDataSlot(dataSingle);

    // ...
}
```

#### `ContainerData`

如果需要向客户端同步多个整数，可以改用 `ContainerData` 引用这些整数。此接口的作用类似索引查找，每个索引表示不同的整数。如果通过 `#addDataSlots` 将 `ContainerData` 添加到菜单，也可以在数据对象本身中构造 `ContainerData`。该方法会按接口指定的数据数量创建新的 `DataSlot`。客户端菜单构造器应始终通过 `SimpleContainerData` 提供新实例。

```java
// 假设我们有一个大小为 3 的 ContainerData

// 客户端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(containerId, playerInventory, new SimpleContainerData(3));
}

// 服务器菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory, ContainerData dataMultiple) {
    // 检查 ContainerData 大小是否为某个固定值
    checkContainerDataCount(dataMultiple, 3);

    // 为处理的整数添加数据槽
    this.addDataSlots(dataMultiple);

    // ...
}
```

#### `Slot`

`Slot` 表示对物品栏中某个 [`ItemStack`][itemstack] 的引用。每个 `Slot` 至少有四个参数：ItemStack 所在的物品栏、此 Slot 具体表示的 ItemStack 索引，以及 Slot 左上角在 screen 上相对于 `AbstractContainerScreen#leftPos` 与 `#topPos` 的渲染 x、y 位置。任何额外参数通常都会为 Slot 处理独特行为提供 context，例如只接受视为燃料的 Item，或阻止取出 Item。

服务端菜单构造器应接受物品栏实例或 view。客户端菜单构造器则应始终提供同样大小的空物品栏实例，以便写入服务端数据。随后可以使用 `#addSlot` 将所需 Slot 或其某个 subtype 添加到菜单。

对于 [`Container`][container]，客户端菜单通常传入 `SimpleContainer`，并使用常规 `Slot` 添加。对于 [`ResourceHandler<ItemResource>` capability][cap]，客户端菜单通常传入 `ItemStacksResourceHandler`，并使用 `ResourceHandlerSlot` 添加。

大多数情况下，先添加菜单包含的所有 Slot，再添加玩家物品栏，最后添加玩家快捷栏。要从菜单访问任何单独的 `Slot`，必须根据添加 Slot 的顺序计算索引。

```java
// 假设我们有一个大小为 10 的数据对象的物品栏

// 客户端菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory) {
    this(containerId, playerInventory, new ItemStacksResourceHandler(10));
}

// 服务器菜单构造器
public MyMenuAccess(int containerId, Inventory playerInventory, StacksResourceHandler<ItemStack, ItemResource> dataInventory) {
    // 检查数据物品栏大小是否为某个固定值
    int dataSize = dataInventory.getSlots();
    if (dataSize < 10) {
        throw new IllegalArgumentException("Container size " + dataSize + " is smaller than expected " + 5);
    }

    // 然后，添加数据物品栏的槽位
    // 如果使用 Slot 的子类型，请确保服务端使用的所有数据
    // 在客户端也同样可用。

    // 通过遍历各个位置并
    // 添加槽位来创建物品栏。

    // 两排
    for (int j = 0; j < 2; j++) {
        // 五列
        for (int i = 0; i < 5; i++) {
            // 为数据物品栏中的每个槽添加
            this.addSlot(new ResourceHandlerSlot(
                // 物品栏
                dataInventory,
                // 改变存储资源的索引修饰符
                dataInventory::set,
                // 此槽位所表示的数据物品栏索引：
                // rowIndex * columnCount + columnIndex
                j * 5 + i,
                // 相对于 leftPos 的 X 坐标
                // 原版槽位默认为 18 个单位
                // startX + columnIndex * slotRenderWidth
                44 + i * 18,
                // 相对于 topPos 的 Y 坐标
                // 原版槽位默认为 18 个单位
                // startY + rowIndex * slotRenderHeight
                20 + j * 18
            ))
        }
    }

    // 为玩家物品栏添加槽位（所有 27 + 9 个热栏槽位）
    // 如果你想将 9x3 + 9 网格自定义为其他内容，
    // 像上面一样循环
    this.addStandardInventorySlots(
        playerInventory,
        // 相对于 leftPos 的起始 X 坐标
        8,
        // 相对于 topPos 的起始 Y 坐标
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
// 假设我们有大小为 5 的数据物品栏
// 物品栏有 4 个输入槽位（索引 1–4），并输出到结果槽位（索引 0）
// 我们还有 27 个玩家物品栏槽位和 9 个热栏槽位
// 因此，实际槽位的索引如下：
//   - 数据物品栏：结果（0），输入（1–4）
//   - Player Inventory (5 - 31)
//   - Player Hotbar (32 - 40)
@Override
public ItemStack quickMoveStack(Player player, int quickMovedSlotIndex) {
    // 被快速移动的槽位 ItemStack
    ItemStack quickMovedStack = ItemStack.EMPTY;
    // 被快速移动的槽位
    Slot quickMovedSlot = this.slots.get(quickMovedSlotIndex);
  
    // 如果槽位在有效范围内且槽位不为空
    if (quickMovedSlot != null && quickMovedSlot.hasItem()) {
        // 获取要移动的原始 ItemStack
        ItemStack rawStack = quickMovedSlot.getItem(); 
        // 将槽位 ItemStack 设为原始 ItemStack 的副本
        quickMovedStack = rawStack.copy();

        /*
        对于无法转换数据的 Container（例如箱子），以下快速移动逻辑可以简化为：如果位于数据物品栏，
        则尝试移动到玩家物品栏／快捷栏；反之亦然
        （例如箱子）。
        */

        // 如果快速移动发生在数据物品栏的结果槽位
        if (quickMovedSlotIndex == 0) {
            // 尝试把结果槽位内容移动到玩家物品栏／快捷栏
            if (!this.moveItemStackTo(rawStack, 5, 41, true)) {
                // 如果无法移动，则停止快速移动
                return ItemStack.EMPTY;
            }

            // 执行结果槽位快速移动的相关逻辑
            quickMovedSlot.onQuickCraft(rawStack, quickMovedStack);
        }
        // 否则，如果快速移动发生在玩家物品栏或快捷栏槽位
        else if (quickMovedSlotIndex >= 5 && quickMovedSlotIndex < 41) {
            // 尝试把物品栏／快捷栏槽位内容移动到数据物品栏的输入槽位
            if (!this.moveItemStackTo(rawStack, 1, 5, false)) {
                // 如果无法移动且当前位于玩家物品栏槽位，则尝试移动到快捷栏
                if (quickMovedSlotIndex < 32) {
                    if (!this.moveItemStackTo(rawStack, 32, 41, false)) {
                        // 如果无法移动，则停止快速移动
                        return ItemStack.EMPTY;
                    }
                }
                // 否则，尝试把快捷栏内容移动到玩家物品栏槽位
                else if (!this.moveItemStackTo(rawStack, 5, 32, false)) {
                    // 如果无法移动，则停止快速移动
                    return ItemStack.EMPTY;
                }
            }
        }
        // 否则，如果快速移动发生在数据物品栏的输入槽位，则尝试移动到玩家物品栏／快捷栏
        else if (!this.moveItemStackTo(rawStack, 5, 41, false)) {
            // 如果无法移动，则停止快速移动
            return ItemStack.EMPTY;
        }

        if (rawStack.isEmpty()) {
            // 如果原始 ItemStack 已完全移出槽位，则把该槽位设为空 ItemStack
            quickMovedSlot.setByPlayer(ItemStack.EMPTY);
        } else {
            // 否则，通知槽位 ItemStack 数量已经改变
            quickMovedSlot.setChanged();
        }

        // 对移动后剩余的 ItemStack 执行相应逻辑
        // 如果没有覆盖 `onTake` 的 `Slot` 子类型，则可以将其删除
        quickMovedSlot.onTake(player, rawStack);
    }

    return quickMovedStack; // 返回槽栈
}
```

## 打开菜单

注册 MenuType、完成菜单本身并附加 [screen][screen] 后，玩家即可打开菜单。在逻辑服务端对玩家调用 `IPlayerExtension#openMenu` 可以打开菜单。该方法接受服务端菜单的 `MenuProvider`；如果需要向客户端同步额外数据，还可选择接受 `Consumer<RegistryFriendlyByteBuf>`。

:::info
只有当 MenuType 使用 [`IContainerFactory`][icf] 创建时，才应使用带 `Consumer<RegistryFriendlyByteBuf>` 参数的 `IPlayerExtension#openMenu`。
:::

#### `MenuProvider`

`MenuProvider` 是包含两个方法的接口：`#createMenu` 创建菜单的服务端实例；`#getDisplayName` 返回包含菜单标题的 component，以传给 [screen][screen]。`#createMenu` 方法包含三个参数：菜单的 Container id、打开菜单的玩家物品栏，以及打开菜单的玩家。

可以使用 `SimpleMenuProvider` 轻松创建 `MenuProvider`；它接受用于创建服务端菜单的方法引用与菜单标题。

```java
// 在某些实现中，可以访问逻辑服务端上的玩家（例如ServerPlayer 实例）
// 假设我们有 ServerPlayer serverPlayer
serverPlayer.openMenu(new SimpleMenuProvider(
    (containerId, playerInventory, player) -> new MyMenu(containerId, playerInventory, /* 服务器参数*/),
    Component.translatable("menu.title.examplemod.mymenu")
));
```

### 常见实现

菜单通常在某种玩家交互时打开（例如右键点击方块或实体）。

#### Block 实现

方块通常通过覆盖 `BlockBehaviour#useWithoutItem` 来实现菜单，并为该[交互][interaction]返回 `InteractionResult#SUCCESS`。

应通过覆盖 `BlockBehaviour#getMenuProvider` 来实现 `MenuProvider`。原版方法使用它在旁观者模式查看菜单。

```java
// 在某些方块子类中
@Override
public MenuProvider getMenuProvider(BlockState state, Level level, BlockPos pos) {
    return new SimpleMenuProvider(/* ...*/);
}

@Override
public InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult result) {
    if (!level.isClientSide() && player instanceof ServerPlayer serverPlayer) {
        serverPlayer.openMenu(state.getMenuProvider(level, pos));
    }

    return InteractionResult.SUCCESS;
}
```

:::info
这是实现逻辑最简单的方式，并不是唯一方式。如果只希望方块在特定条件下打开菜单，就需要事先将一些数据同步到客户端，以便条件不满足时返回 `InteractionResult#PASS` 或 `#FAIL`。
:::

#### 生物实现

生物通常通过覆盖 `Mob#mobInteract` 来实现菜单。其做法与方块实现类似，唯一区别是 `Mob` 本身应实现 `MenuProvider`，以支持在旁观者模式查看。

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

:::info
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
[side]: ../concepts/sides.md#逻辑端
[interaction]: ../items/interactions.md#right-clicking-an-item
[itemstack]: ../items/index.md#itemstacks
