# 事务（Transaction）

事务是 NeoForge 添加的系统，用于管理不同物品栏之间传输内容时的通信。每次传输通过三个基本概念进行管理：被传输的 `Resource`、表示物品栏的 `ResourceHandler`，以及促成通信的 `Transaction`。

## Resource

`Resource` 表示执行事务的底层对象。每个 `Resource` 都应当是 immutable 的，只包含所使用的对象类型，而不包含传输对象的数量。例如，事务“五个苹果换一个绿宝石”包含 `Resource`“苹果”与“绿宝石”，而不是“五个苹果”与“一个绿宝石”。

因此，每个 `Resource` 都具有以下三项 property：

* **Immutable**：`Resource` 对象中存储的任何内容都不应发生变化。
* **与数量无关**：`Resource` 不包含对象数量的任何信息。
* **相等性**：无论 `Resource` 如何构造，只要它们表示同一个对象，就必须相等。

NeoForge 通过表示对象及其唯一 [数据组件][datacomponent]，为 [Item][items]（通过 `ItemResource`）与 Fluid（通过 `FluidResource`）提供 Resource。

```java
// 从其支持对象创建资源
ItemResource item = ItemResource.of(Items.EMERALD);

ItemStack stack = new ItemStack(Items.APPLE);
stack.set(DataComponents.CUSTOM_NAME, Component.literal("Apple?"));
ItemResource itemWithComponents = ItemResource.of(stack);

FluidResource fluid = FluidResource.of(Fluids.WATER);
```

也可以创建自己的 `Resource`：

```java
// 假设我们正在尝试表示以下对象：
public class ExampleObject {
    public static final ExampleObject EMPTY = new ExampleObject(-1, 0, Map.of());

    public static final Codec<ExampleObject> CODEC = RecordCodecBuilder.of(instance ->
        instance.group(
            ExtraCodecs.NON_NEGATIVE_INT.fieldOf("id").forGetter(ExampleObject::id),
            ExtraCodecs.NON_NEGATIVE_INT.optionalFieldOf("count", 1).forGetter(ExampleObject::count),
            Codec.unboundedMap(Codec.STRING, Codec.BOOL).optionalFieldOf("flags", Map::of).forGetter(ExampleObject::flags)
        ).apply(instance, ExampleObject::new)
    );

    private final int id;
    private final Map<String, Boolean> flags;
    private int count;

    public ExampleObject(int id, int count, Map<String, Boolean> flags) {
        // ...
    }

    public int id() {
        return this.id;
    }

    public int count() {
        return this.count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public Map<String, Boolean> flags() {
        return this.flags;
    }
}

// 创建我们的资源。
public final class ExampleResource implements Resource {

    private final ExampleObject object;

    public ExampleResource(ExampleObject object) {
        // 强制不变性并忽略计数。
        this.object = new ExampleObject(
            object.id(), 1, ImmutableMap.copyOf(object.flags())
        );
    }

    public int id() {
        return this.object.id();
    }

    public Map<String, Boolean> flags() {
        return this.object.flags();
    }

    // 定义何时将支持对象视为空。
    // 这是`Resource` 定义的唯一方法。
    @Override
    public boolean isEmpty() {
        return this.object.id() == -1;
    }

    // 类的平等是通过实现 `hashCode` 来定义的
    // 和 `equals`。record 已经为你做了此。
    @Override
    public int hashCode() {
        // 由于我们的支持对象本身并不唯一，因此我们
        // 提取使其独特的成分并构建
        // 哈希值。
        return Objects.hash(this.object.id(), this.object.flags());
    }

    @Override
    public boolean equals(Object obj) {
        // 检查身份相等性。
        if (this == obj) return true;
        // 检查是否同一类。
        if (obj == null || this.getClass() != obj.getClass()) return false;
        // 检查资源的各个组件。
        ExampleResource other = (ExampleResource) obj;
        return this.object.id() == other.object.id()
            && this.object.flags().equals(other.object.flags());
    }

    // 只是为了方便更容易了解什么
    // 所代表的资源。
    @Override
    public String toString() {
        return Integer.toString(this.object.id()) + "[" 
            + this.object.flags().size() + "]";
    }
}
```

:::info
尽管 `Resource` 可用于 primitive，但并非严格必需（例如 energy 没有 `Resource`，因为它由 `long` 提供底层支持）。不过，这确实需要自行重新实现部分 Resource 行为，因为[下文所述的处理器系统][handler]要求使用 `Resource`。
:::

## ResourceHandler

`ResourceHandler<T>` 表示事务中的底层物品栏，其中 `T` 是为对象提供底层支持的 `Resource` 类型。每个处理器使用索引映射到关联内容（例如索引 `0` 映射到第一个槽位，索引 `1` 映射到第二个槽位，依此类推）。对于每个索引，可以检查该位置能否容纳某个 `Resource`（`isValid`），或已存储了什么 `Resource`（`getResource`）。还可以检查该位置最多可存储多少个 `Resource`（`getCapacityAsLong`／`getCapacityAsInt`），以及其中已存储多少个 `Resource`（`getAmountAsLong`／`getAmountAsInt`）。处理器可访问的索引数量表示其 `size`。

为了修改底层物品栏的内容，`ResourceHandler` 提供两个方法：`insert` 用于放入 `Resource`，`extract` 用于取出 `Resource`。`insert` 与 `extract` 接受三个参数：要操作的 `Resource`、要放入／取出的 `int` 数量，以及表示执行操作的[事务][transaction]的 `TransactionContext`；返回实际放入／取出的数量。两个方法都会寻找第一个可用索引，以放入内容或从中取出内容。如果处理器应当只在某个特定索引执行事务，`insert` 与 `extract` 还提供接受 `int` 索引的重载，以在该索引放入／取出 `Resource`。

```java
// 对于某个 ResourceHandler<ItemResource> handler

// 获取处理器中存储的资源。
ItemResource item = handler.getResource(0);
int count = handler.getAmountAsInt(0);

// 获取有关处理器本身的信息。
int handlerSize = handler.size();
int indexCapacity = handler.getCapacityAsInt(0);
boolean canAcceptApples = handler.isValid(0, ItemResource.of(Items.APPLE));
```

根据底层物品栏的不同，有许多不同类型的 `ResourceHandler`。有些处理器会封装现有原版物品栏（例如用于 [`Container`][container] 的 `VanillaContainerWrapper`、用于[玩家 `Inventory`][playerinv] 的 `PlayerInventoryWrapper`、用于 [LivingEntity][livingentity] 装备槽位的 `LivingEntityEquipmentWrapper`）。

```java
// 环绕现有容器。
Container container = new SimpleContainer(5);
ResourceHandler<ItemResource> containerWrapper = VanillaContainerWrapper.of(container);

// 包裹 `Player` 玩家物品栏。
ResourceHandler<ItemResource> playerInv = PlayerInventoryWrapper.of(player);

// 包装某个 LivingEntity 的特定装备槽位。
ResourceHandler<ItemResource> head = LivingEntityEquipmentWrapper.of(entity, EquipmentSlot.HEAD);
```

另一些处理器本身就是物品栏，为希望直接使用该系统而不想进行大量实现的人提供便利（例如由 [`ItemStack`][itemstack] list 构成的 `ItemStacksResourceHandler`，以及由 `FluidStack` list 构成的 `FluidStacksResourceHandler`）。

```java
// 创建 `ItemStack` 存储。
ItemStacksResourceHandler itemStorage = new ItemStacksResourceHandler(5);

// 创建 `FluidStack` 存储。
FluidStacksResourceHandler fluidStorage = new FluidStacksResourceHandler(
    // 处理器的大小
    5,
    // 各索引最大容量
    1000
);
```

:::info
如果计划将某个 `StacksResourceHandler` 用作物品栏，强烈建议覆盖 `onContentsChanged`，以处理磁盘写入或网络同步。

```java
// 方块实体示例
public class ExampleBlockEntity extends BlockEntity {

    private final ItemStacksResourceHandler storage = new ItemStacksResourceHandler(5) {
        @Override
        protected void onContentsChanged(int index, ItemStack previousContents) {
            // 调度方块实体保存
            BlockEntity.this.setChanged();
        }
    };

    // ...
}
```

:::

也可以创建自己的 `ResourceHandler`：

```java
public class ExampleResourceHandler implements ResourceHandler<ExampleResource> {

    private ExampleObject object;

    public ExampleResourceHandler(ExampleObject object) {
        this.object = object;
    }
    
    @Override
    public int size() {
        // 处理器的大小。
        return 1;
    }

    @Override
    public ExampleResource getResource(int index) {
        // 获取所需索引处的资源。

        // 检查边界。
        Objects.checkIndex(index, this.size());
        // 然后获取资源。
        return new ExampleResource(this.object);
    }

    @Override
    public long getAmountAsLong(int index) {
        // 从内容中获取金额。
        Objects.checkIndex(index, this.size());
        return this.object.count();
    }

    @Override
    public long getCapacityAsLong(int index, ExampleResource resource) {
        // 存储资源的给定索引处的容量。
        Objects.checkIndex(index, this.size());
        return Integer.MAX_VALUE;
    }

    @Override
    public boolean isValid(int index, ExampleResource resource) {
        // 是否可以在索引处设置资源，无论其资源如何
        // 当前内容。
        Objects.checkIndex(index, this.size());
        // 确保资源不为空。
        TransferPreconditions.checkNonEmpty(resource);
        return true;
    }

    @Override
    public int insert(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // 将资源插入给定索引，返回放入的数量。

        // 验证参数。
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // 检查是否可以从此位置插入资源。
        ExampleObject current = this.object;
        if (current.count() == 0 || (current.id() == resource.id() && current.flags().equals(resource.flags()) && this.isValid(index, resource))) {
            // 计算要插入的数量。
            int insertedAmount = Math.min(amount, this.getCapacityAsInt(index, resource) - current.count());

            if (insertedAmount > 0) {
                // 更新内容。
                if (current.count() == 0) {
                    this.object = new ExampleObject(
                        resource.id(), insertedAmount, new HashMap<>(resource.flags())
                    );
                } else {
                    this.object.setCount(current.count() + insertedAmount);
                }

                // 返回插入的金额。
                return insertedAmount;
            }
        }

        // 如果不匹配，则不插入任何内容。
        return 0;
    }

    @Override
    public int extract(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // 从给定索引中提取内容，返回提取的数量。

        // 验证参数。
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // 检查是否可以从此位置提取资源。
        ExampleObject current = this.object;
        if (current.id() == resource.id() && current.flags().equals(resource.flags())) {
            // 计算提取量。
            int extracted = Math.min(current.count(), amount);

            if (extracted > 0) {
                // 更新内容。
                this.object.setCount(current.count() - extracted);

                // 返回提取的金额。
                return extracted;
            }
        }

        // 如果不匹配，则不提取任何内容。
        return 0;
    }
}
```

或者，对于 `StacksResourceHandler`：

```java
public class ExampleStacksResourceHandler extends StacksResourceHandler<ExampleObject, ExampleResource> {

    public ExampleStacksResourceHandler(int size) {
        super(size, ExampleObject.EMPTY, ExampleObject.CODEC);
    }

    public ExampleStacksResourceHandler(NonNullList<ExampleObject> objects) {
        super(objects, ExampleObject.EMPTY, ExampleObject.CODEC);
    }

    @Override
    public ExampleResource getResourceFrom(ExampleObject object) {
        // 从内容构造资源。
        return new ExampleResource(object);
    }

    @Override
    public int getAmountFrom(ExampleObject object) {
        // 从内容中获取金额。
        return object.count();
    }

    @Override
    protected ExampleObject getStackFrom(ExampleResource resource, int amount) {
        // 从其资源创建内容。
        return new ExampleObject(resource.id(), amount, new HashMap<>(resource.flags()));
    }

    @Override
    protected int getCapacity(int index, ExampleResource resource) {
        // 存储资源的给定索引处的容量。
        return Integer.MAX_VALUE;
    }

    @Override
    protected ExampleObject copyOf(ExampleObject object) {
        // 构造内容的副本。
        return new ExampleObject(object.id(), object.count(), new HashMap<>(object.flags()));
    }

    @Override
    public boolean matches(ExampleObject object, ExampleResource resource) {
        // 检查对象是否与存储的资源匹配。
        return object.id() == resource.id() && object.flags().equals(resource.flags());
    }
}
```

:::tip
NeoForge 还提供 `ResourceStacksResourceHandler`。对于本身就是物品栏中实际对象的 `Resource` 实现，它使用 `ResourceStack` 作为存储内容。
:::

### EnergyHandler

`EnergyHandler` 是 `ResourceHandler` 的精简版本，只包含一个存储 `long` 的索引。因此，它只检查可存储多少单位（`getCapacityAsLong`／`getCapacityAsInt`），以及已经存储多少单位（`getAmountAsLong`／`getAmountAsInt`）。此外，由于只有一个索引，`insert` 与 `extract` 不再接受索引；它们也不再需要 `Resource`，因为底层对象是 primitive。

与 `ResourceHandler` 一样，根据用例不同，也有不同类型的 `EnergyHandler`。最常见的是 `SimpleEnergyHandler`，它提供基础实现，以及 insert／extract 限制。

```java
// 创建能量处理器。
EnergyHandler energy = new SimpleEnergyHandler(1000);
```

### ItemAccess

`ItemAccess` 也是 `ResourceHandler` 的精简版本，用于访问特定存储位置中的单个 Item。通常在 [Item capability][capabilities] 中使用它，以修改 capability 附加到的 Item。因此，它只提供 Resource（`getResource`）与当前存在的 Item 数量（`getAmount`）。此外，由于只有一个索引，`insert` 与 `extract` 不再接受索引。不过，由于 Item 还可以存储数据，`ItemAccess` 提供了通过 [capability][capabilities] 内的 `getCapability` 访问所存数据的方法，前提是它是以 `ItemAccess` 为 context 的 `ItemCapability`。

与 `ResourceHandler` 一样，根据用例不同，也有不同类型的 `ItemAccess`。最常见的两个是：封装玩家物品栏中特定槽位的 `PlayerItemAccess`，以及封装 `ResourceHandler` 中特定索引的 `HandlerItemAccess`。

```java
// 创建某个位置的物品访问权限。
// 假设我们有一些 `Player` 玩家。
ItemAccess access = ItemAccess.forPlayerInteraction(player, InteractionHand.MAIN_HAND);

// 获取引用项的数据
ItemResource item = access.getResource();
int count = access.getAmount();

// 获取 ItemStack 上的物品能力。
// 例如，如果该物品是流体容器：
ResourceHandler<FluidResource> fluidContainer = access.getCapability(Capabilities.Fluid.ITEM);
```

## 在处理器之间传输

`Transaction` 促成 `Resource` 在 `ResourceHandler` 之间传输。Resource 会从其 `ResourceHandler` 中被 `insert` 与 `extract`。执行插入与提取后，一旦调用 `Transaction#commit`，传输即视为有效或完成。

`Transaction` 是 `AutoCloseable`，因此启动事务的标准方式是使用 `Transaction#openRoot` 的 try-with-resources block：

```java
// 假设有两个 `ResourceHandler<ItemResource>`：apples 和 emeralds。

// 开启交易。
try (Transaction tx = Transaction.openRoot()) {
    // 从资源处理器中插入和提取。
    ItemResource appleResource = ItemResource.of(Items.APPLE);
    ItemResource emeraldResource = ItemResource.of(Items.EMERALD);

    int numOfApples = apples.extract(appleResource, 5, tx);
    int numOfEmeralds = emeralds.extract(emeraldResource, 1, tx);

    // 执行任何必要的验证。
    if (numOfApples == 5 && numOfEmeralds == 1) {
        numOfEmeralds = apples.insert(emeraldResource, numOfEmeralds, tx);
        numOfApples = emeralds.insert(appleResource, numOfApples, tx);

        if (numOfApples == 5 && numOfEmeralds == 1) {
            // 将事务标记为完成。
            tx.commit();
        }
    }
}
```

:::tip

`ResourceHandlerUtil` 提供了多种有用方法，用于检查 `ResourceHandler` 当前状态，或在处理器之间进行一般性事务。例如，上面的绿宝石换苹果交易可以简化为：

```java
// 假设有两个 `ResourceHandler<ItemResource>`：apples 和 emeralds。

// 开启交易。
try (Transaction tx = Transaction.openRoot()) {
    // 从资源处理器中插入和提取。
    ItemResource appleResource = ItemResource.of(Items.APPLE);
    ItemResource emeraldResource = ItemResource.of(Items.EMERALD);

    int applesMoved = ResourceHandlerUtil.moveStacking(
        // Moving from apples -> emeralds.
        apples, emeralds,
        // 检查要移动的资源。
        appleResource::equals,
        // 要移动的资源的编号。
        5,
        // 事务上下文。
        tx
    );
    int emeraldsMoved = ResourceHandlerUtil.moveStacking(
        emeralds, apples, emeraldResource::equals, 1, tx
    );;

    // 执行任何必要的验证。
    if (applesMoved == 5 && emeraldsMoved == 1) {
        // 将事务标记为完成。
        tx.commit();
    }
}
```

:::

如果同时发生多个事务，`Transaction` 还可以通过 `Transation#open` 在自身内部包含 `Transaction`。

```java
// 开启交易。
try (Transaction tx = Transaction.openRoot()) {
    // Transaction A
    try (Transaction atx = Transaction.open(tx)) {
        // 从资源处理器中插入和提取。

        // ...

        // 标记为完成。
        atx.commit();
    }

    // Transaction B
    try (Transaction btx = Transaction.open(tx)) {
        // 从资源处理器中插入和提取。

        // ...

        // 也许此无效，所以不要标记为完整。
    }

    // 将根事务标记为成功，以便成功
    // 内部交易完成。
    tx.commit();
}
```

### 获取 Snapshot

`Transaction#commit` 本身不会执行任何操作。因此，无论传输是否成功，所执行的插入与提取都是永久性的。我们希望的是：对于任意 `Transaction`，只有在 `commit` 后才发生传输，否则应回滚传输。

这正是 `SnapshotJournal<T>` 发挥作用的地方。顾名思义，它可以在修改内容前为处理器当前状态获取一个 `T` “snapshot”。随后，如果事务成功，可以释放 snapshot；如果失败，则可把处理器恢复到先前状态。每个 `SnapshotJournal` 至少必须实现两个方法：`createSnapshot` 用于实际创建保存状态，`revertToSnapshot` 用于把处理器恢复到指定状态。如果由于处理器中的变化而需要通知或更新某些底层对象，journal 还可以覆盖 `onRootCommit` 来处理这些变化。

所有 NeoForge `ResourceHandler` 实现都以某种方式使用 `SnapshotJournal`，要么由处理器本身直接使用，要么作为内部字段。只有创建新的 `ResourceHandler` 时，才需要实现 `SnapshotJournal`。

```java
// 我们可以使用存储的对象作为快照值，因为我们只曾经
// 需要跟踪一个索引。
public class ExampleResourceHandler extends SnapshotJournal<ExampleObject> implements ResourceHandler<ExampleResource> {

    private ExampleObject object;

    public ExampleResourceHandler(ExampleObject object) {
        // ...
    }
    
    // ...

    @Override
    protected ExampleObject createSnapshot() {
        // 创建对象的快照。
        // 这应该是不可变的。
        ExampleObject original = this.object;
        this.object = new ExampleObject(
            original.id(), original.count(), ImmutableMap.copyOf(original.flags())
        );
        return original;
    }

    @Override
    protected void revertToSnapshot(ExampleObject snapshot) {
        // 将处理器的状态恢复到快照。
        this.object = snapshot;
    }

    // 我们需要更新之前的插入和提取方法来制作快照
    // 每次修改。

    @Override
    public int insert(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // 将资源插入给定索引，返回放入的数量。

        // 验证参数。
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // 检查是否可以从此位置插入资源。
        ExampleObject current = this.object;
        if (current.count() == 0 || (current.id() == resource.id() && current.flags().equals(resource.flags()) && this.isValid(index, resource))) {
            // 计算要插入的数量。
            int insertedAmount = Math.min(amount, this.getCapacityAsInt(index, resource) - current.count());

            if (insertedAmount > 0) {
                // 在修改内容之前对处理器进行快照。
                this.updateSnapshots(transaction);

                // 更新内容。
                if (current.count() == 0) {
                    this.object = new ExampleObject(
                        resource.id(), insertedAmount, new HashMap<>(resource.flags())
                    );
                } else {
                    this.object.setCount(current.count() + insertedAmount);
                }

                // 返回插入的金额。
                return insertedAmount;
            }
        }

        // 如果不匹配，则不插入任何内容。
        return 0;
    }

    @Override
    public int extract(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // 从给定索引中提取内容，返回提取的数量。

        // 验证参数。
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // 检查是否可以从此位置提取资源。
        ExampleObject current = this.object;
        if (current.id() == resource.id() && current.flags().equals(resource.flags())) {
            // 计算提取量。
            int extracted = Math.min(current.count(), amount);

            if (extracted > 0) {
                // 在修改内容之前对处理器进行快照。
                this.updateSnapshots(transaction);

                // 更新内容。
                this.object.setCount(current.count() - extracted);

                // 返回提取的金额。
                return extracted;
            }
        }

        // 如果不匹配，则不提取任何内容。
        return 0;
    }
}
```

至此，事务现在也能正确处理物品栏状态：

```java
// 假设有两个 `ResourceHandler<ExampleResource>`：exampleA 和 exampleB。

// 开启交易。
try (Transaction tx = Transaction.openRoot()) {
    // 从资源处理器中插入和提取
    ExampleResource resource = new ExampleResource(new ExampleObject(0, 1, Map.of()));

    // 尝试提取并插入所需的资源
    if (exampleA.extract(resource, 1, tx) == 1 && exampleB.insert(resource, 1, tx) == 1) {
        // 如果成功，则提交事务以使更改永久化。
        tx.commit();
    }

    // 否则，事务将中止并且两个处理器将恢复其状态
    // 内容为事务发生之前的内容。
}
```

[capabilities]: capabilities.md
[container]: container.md
[datacomponent]: ../items/datacomponents.md
[handler]: #resource-handlers
[items]: ../items/index.md
[itemstack]: ../items/index.md#itemstacks
[livingentity]: ../entities/livingentity.md
[playerinv]: container.md#containers-on-players-player-inventory
[transaction]: #在处理器之间传输
