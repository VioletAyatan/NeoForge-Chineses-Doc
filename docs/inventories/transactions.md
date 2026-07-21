# 事务（Transaction）

事务是 NeoForge 添加的系统，用于管理不同物品栏之间传输内容时的通信。每次传输通过三个基本概念进行管理：被传输的 `Resource`、表示物品栏的 `ResourceHandler`，以及促成通信的 `Transaction`。

## Resource

`Resource` 表示执行事务的底层对象。每个 `Resource` 都应当是 immutable 的，只包含所使用的对象类型，而不包含传输对象的数量。例如，事务“五个苹果换一个绿宝石”包含 `Resource`“苹果”与“绿宝石”，而不是“五个苹果”与“一个绿宝石”。

因此，每个 `Resource` 都具有以下三项 property：

* **Immutable**：`Resource` 对象中存储的任何内容都不应发生变化。
* **与数量无关**：`Resource` 不包含对象数量的任何信息。
* **相等性**：无论 `Resource` 如何构造，只要它们表示同一个对象，就必须相等。

NeoForge 通过表示对象及其唯一 [data component][datacomponent]，为 [Item][items]（通过 `ItemResource`）与 Fluid（通过 `FluidResource`）提供 Resource。

```java
// Create the resource from its backing object
ItemResource item = ItemResource.of(Items.EMERALD);

ItemStack stack = new ItemStack(Items.APPLE);
stack.set(DataComponents.CUSTOM_NAME, Component.literal("Apple?"));
ItemResource itemWithComponents = ItemResource.of(stack);

FluidResource fluid = FluidResource.of(Fluids.WATER);
```

也可以创建自己的 `Resource`：

```java
// Let's assume we are trying to represent the following object:
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

// Create our resource.
public final class ExampleResource implements Resource {

    private final ExampleObject object;

    public ExampleResource(ExampleObject object) {
        // Enforce immutability and ignore count.
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

    // Defines when the backing object is considered empty.
    // This is the only method that `Resource` defines.
    @Override
    public boolean isEmpty() {
        return this.object.id() == -1;
    }

    // Equality for classes is defined by implementing `hashCode`
    // and `equals`. Records already do this for you.
    @Override
    public int hashCode() {
        // Since our backing object is not unique by itself, we
        // extract the components that make it unique and construct
        // the hash.
        return Objects.hash(this.object.id(), this.object.flags());
    }

    @Override
    public boolean equals(Object obj) {
        // Check identity equality.
        if (this == obj) return true;
        // Check if same class.
        if (obj == null || this.getClass() != obj.getClass()) return false;
        // Check the individual components of the resource.
        ExampleResource other = (ExampleResource) obj;
        return this.object.id() == other.object.id()
            && this.object.flags().equals(other.object.flags());
    }

    // Just an ease of convenience to more easily understand what
    // the resource is representing.
    @Override
    public String toString() {
        return Integer.toString(this.object.id()) + "[" 
            + this.object.flags().size() + "]";
    }
}
```

:::note
尽管 `Resource` 可用于 primitive，但并非严格必需（例如 energy 没有 `Resource`，因为它由 `long` 提供底层支持）。不过，这确实需要自行重新实现部分 Resource 行为，因为[下文所述的 handler 系统][handler]要求使用 `Resource`。
:::

## ResourceHandler

`ResourceHandler<T>` 表示事务中的底层物品栏，其中 `T` 是为对象提供底层支持的 `Resource` 类型。每个 handler 使用索引映射到关联内容（例如索引 `0` 映射到第一个槽位，索引 `1` 映射到第二个槽位，依此类推）。对于每个索引，可以检查该位置能否容纳某个 `Resource`（`isValid`），或已存储了什么 `Resource`（`getResource`）。还可以检查该位置最多可存储多少个 `Resource`（`getCapacityAsLong`／`getCapacityAsInt`），以及其中已存储多少个 `Resource`（`getAmountAsLong`／`getAmountAsInt`）。Handler 可访问的索引数量表示其 `size`。

为了修改底层物品栏的内容，`ResourceHandler` 提供两个方法：`insert` 用于放入 `Resource`，`extract` 用于取出 `Resource`。`insert` 与 `extract` 接受三个参数：要操作的 `Resource`、要放入／取出的 `int` 数量，以及表示执行操作的[事务][transaction]的 `TransactionContext`；返回实际放入／取出的数量。两个方法都会寻找第一个可用索引，以放入内容或从中取出内容。如果 handler 应当只在某个特定索引执行事务，`insert` 与 `extract` 还提供接受 `int` 索引的 overload，以在该索引放入／取出 `Resource`。

```java
// For some ResourceHandler<ItemResource> handler

// Get the resource stored in the handler.
ItemResource item = handler.getResource(0);
int count = handler.getAmountAsInt(0);

// Get information about the handler itself.
int handlerSize = handler.size();
int indexCapacity = handler.getCapacityAsInt(0);
boolean canAcceptApples = handler.isValid(0, ItemResource.of(Items.APPLE));
```

根据底层物品栏的不同，有许多不同类型的 `ResourceHandler`。有些 handler 会封装现有 Vanilla 物品栏（例如用于 [`Container`][container] 的 `VanillaContainerWrapper`、用于[玩家 `Inventory`][playerinv] 的 `PlayerInventoryWrapper`、用于 [LivingEntity][livingentity] 装备槽位的 `LivingEntityEquipmentWrapper`）。

```java
// Wrapping around an existing container.
Container container = new SimpleContainer(5);
ResourceHandler<ItemResource> containerWrapper = VanillaContainerWrapper.of(container);

// Wrapping around a `Player` player inventory.
ResourceHandler<ItemResource> playerInv = PlayerInventoryWrapper.of(player);

// Wrapping around a specific equipment slot for some LivingEntity entity.
ResourceHandler<ItemResource> head = LivingEntityEquipmentWrapper.of(entity, EquipmentSlot.HEAD);
```

另一些 handler 本身就是物品栏，为希望直接使用该系统而不想进行大量实现的人提供便利（例如由 [`ItemStack`][itemstack] list 构成的 `ItemStacksResourceHandler`，以及由 `FluidStack` list 构成的 `FluidStacksResourceHandler`）。

```java
// Creating an `ItemStack` storage.
ItemStacksResourceHandler itemStorage = new ItemStacksResourceHandler(5);

// Creating a `FluidStack` storage.
FluidStacksResourceHandler fluidStorage = new FluidStacksResourceHandler(
    // The size of the handler
    5,
    // The maximum capacity of every index
    1000
);
```

:::note
如果计划将某个 `StacksResourceHandler` 用作物品栏，强烈建议覆盖 `onContentsChanged`，以处理磁盘写入或网络同步。

```java
// Example for block entities
public class ExampleBlockEntity extends BlockEntity {

    private final ItemStacksResourceHandler storage = new ItemStacksResourceHandler(5) {
        @Override
        protected void onContentsChanged(int index, ItemStack previousContents) {
            // Schedule the block entity for saving
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
        // The size of the handler.
        return 1;
    }

    @Override
    public ExampleResource getResource(int index) {
        // Gets the resource at the desired index.

        // Check the bounds.
        Objects.checkIndex(index, this.size());
        // Then get the resource.
        return new ExampleResource(this.object);
    }

    @Override
    public long getAmountAsLong(int index) {
        // Gets the amount from the content.
        Objects.checkIndex(index, this.size());
        return this.object.count();
    }

    @Override
    public long getCapacityAsLong(int index, ExampleResource resource) {
        // The capacity at a given index for the stored resource.
        Objects.checkIndex(index, this.size());
        return Integer.MAX_VALUE;
    }

    @Override
    public boolean isValid(int index, ExampleResource resource) {
        // Whether the resource can be set at the index, regardless of its
        // current contents.
        Objects.checkIndex(index, this.size());
        // Make sure the resource isn't empty.
        TransferPreconditions.checkNonEmpty(resource);
        return true;
    }

    @Override
    public int insert(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // Inserts the resource into the given index, returning the amount put in.

        // Validate arguments.
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // Check whether the resource can be inserted from this location.
        ExampleObject current = this.object;
        if (current.count() == 0 || (current.id() == resource.id() && current.flags().equals(resource.flags()) && this.isValid(index, resource))) {
            // Compute the amount to insert.
            int insertedAmount = Math.min(amount, this.getCapacityAsInt(index, resource) - current.count());

            if (insertedAmount > 0) {
                // Update the content.
                if (current.count() == 0) {
                    this.object = new ExampleObject(
                        resource.id(), insertedAmount, new HashMap<>(resource.flags())
                    );
                } else {
                    this.object.setCount(current.count() + insertedAmount);
                }

                // Return the amount inserted.
                return insertedAmount;
            }
        }

        // If not matching, insert nothing.
        return 0;
    }

    @Override
    public int extract(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // Extracts the contents from the given index, returning the amount taken out.

        // Validate arguments.
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // Check whether the resource can be extracted from this location.
        ExampleObject current = this.object;
        if (current.id() == resource.id() && current.flags().equals(resource.flags())) {
            // Compute the amount to extract.
            int extracted = Math.min(current.count(), amount);

            if (extracted > 0) {
                // Update the content.
                this.object.setCount(current.count() - extracted);

                // Return the amount extracted.
                return extracted;
            }
        }

        // If not matching, extract nothing.
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
        // Constructs the resource from the content.
        return new ExampleResource(object);
    }

    @Override
    public int getAmountFrom(ExampleObject object) {
        // Gets the amount from the content.
        return object.count();
    }

    @Override
    protected ExampleObject getStackFrom(ExampleResource resource, int amount) {
        // Create the content from its resource.
        return new ExampleObject(resource.id(), amount, new HashMap<>(resource.flags()));
    }

    @Override
    protected int getCapacity(int index, ExampleResource resource) {
        // The capacity at a given index for the stored resource.
        return Integer.MAX_VALUE;
    }

    @Override
    protected ExampleObject copyOf(ExampleObject object) {
        // Constructs a copy of the content.
        return new ExampleObject(object.id(), object.count(), new HashMap<>(object.flags()));
    }

    @Override
    public boolean matches(ExampleObject object, ExampleResource resource) {
        // Check if an object matches the stored resource.
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
// Create an energy handler.
EnergyHandler energy = new SimpleEnergyHandler(1000);
```

### ItemAccess

`ItemAccess` 也是 `ResourceHandler` 的精简版本，用于访问特定存储位置中的单个 Item。通常在 [Item capability][capabilities] 中使用它，以修改 capability 附加到的 Item。因此，它只提供 Resource（`getResource`）与当前存在的 Item 数量（`getAmount`）。此外，由于只有一个索引，`insert` 与 `extract` 不再接受索引。不过，由于 Item 还可以存储数据，`ItemAccess` 提供了通过 [capability][capabilities] 内的 `getCapability` 访问所存数据的方法，前提是它是以 `ItemAccess` 为 context 的 `ItemCapability`。

与 `ResourceHandler` 一样，根据用例不同，也有不同类型的 `ItemAccess`。最常见的两个是：封装玩家物品栏中特定槽位的 `PlayerItemAccess`，以及封装 `ResourceHandler` 中特定索引的 `HandlerItemAccess`。

```java
// Create an item access for some location.
// Assume we have some `Player` player.
ItemAccess access = ItemAccess.forPlayerInteraction(player, InteractionHand.MAIN_HAND);

// Get the data about the referenced item
ItemResource item = access.getResource();
int count = access.getAmount();

// Gets the item capability on the stack.
// For example, if the item is a fluid container:
ResourceHandler<FluidResource> fluidContainer = access.getCapability(Capabilities.Fluid.ITEM);
```

## 在 Handler 之间传输

`Transaction` 促成 `Resource` 在 `ResourceHandler` 之间传输。Resource 会从其 `ResourceHandler` 中被 `insert` 与 `extract`。执行插入与提取后，一旦调用 `Transaction#commit`，传输即视为有效或完成。

`Transaction` 是 `AutoCloseable`，因此启动事务的标准方式是使用 `Transaction#openRoot` 的 try-with-resources block：

```java
// Let's assume we have two `ResourceHandler<ItemResource>`s apples, emeralds.

// Open the transaction.
try (Transaction tx = Transaction.openRoot()) {
    // Insert and extract from resource handlers.
    ItemResource appleResource = ItemResource.of(Items.APPLE);
    ItemResource emeraldResource = ItemResource.of(Items.EMERALD);

    int numOfApples = apples.extract(appleResource, 5, tx);
    int numOfEmeralds = emeralds.extract(emeraldResource, 1, tx);

    // Perform any validation necessary.
    if (numOfApples == 5 && numOfEmeralds == 1) {
        numOfEmeralds = apples.insert(emeraldResource, numOfEmeralds, tx);
        numOfApples = emeralds.insert(appleResource, numOfApples, tx);

        if (numOfApples == 5 && numOfEmeralds == 1) {
            // Mark the transaction as complete.
            tx.commit();
        }
    }
}
```

:::tip

`ResourceHandlerUtil` 提供了多种有用方法，用于检查 `ResourceHandler` 当前状态，或在 handler 之间进行一般性事务。例如，上面的绿宝石换苹果交易可以简化为：

```java
// Let's assume we have two `ResourceHandler<ItemResource>`s apples, emeralds.

// Open the transaction.
try (Transaction tx = Transaction.openRoot()) {
    // Insert and extract from resource handlers.
    ItemResource appleResource = ItemResource.of(Items.APPLE);
    ItemResource emeraldResource = ItemResource.of(Items.EMERALD);

    int applesMoved = ResourceHandlerUtil.moveStacking(
        // Moving from apples -> emeralds.
        apples, emeralds,
        // Checks what resource(s) to move.
        appleResource::equals,
        // The number of the resource to move.
        5,
        // The transaction context.
        tx
    );
    int emeraldsMoved = ResourceHandlerUtil.moveStacking(
        emeralds, apples, emeraldResource::equals, 1, tx
    );;

    // Perform any validation necessary.
    if (applesMoved == 5 && emeraldsMoved == 1) {
        // Mark the transaction as complete.
        tx.commit();
    }
}
```

:::

如果同时发生多个事务，`Transaction` 还可以通过 `Transation#open` 在自身内部包含 `Transaction`。

```java
// Open the transaction.
try (Transaction tx = Transaction.openRoot()) {
    // Transaction A
    try (Transaction atx = Transaction.open(tx)) {
        // Insert and extract from resource handlers.

        // ...

        // Mark as complete.
        atx.commit();
    }

    // Transaction B
    try (Transaction btx = Transaction.open(tx)) {
        // Insert and extract from resource handlers.

        // ...

        // Maybe this one was invalid, so don't mark as complete.
    }

    // Mark the root transaction as successful such that the successful
    // inner transactions are completed.
    tx.commit();
}
```

### 获取 Snapshot

`Transaction#commit` 本身不会执行任何操作。因此，无论传输是否成功，所执行的插入与提取都是永久性的。我们希望的是：对于任意 `Transaction`，只有在 `commit` 后才发生传输，否则应回滚传输。

这正是 `SnapshotJournal<T>` 发挥作用的地方。顾名思义，它可以在修改内容前为 handler 当前状态获取一个 `T` “snapshot”。随后，如果事务成功，可以释放 snapshot；如果失败，则可把 handler 恢复到先前状态。每个 `SnapshotJournal` 至少必须实现两个方法：`createSnapshot` 用于实际创建保存状态，`revertToSnapshot` 用于把 handler 恢复到指定状态。如果由于 handler 中的变化而需要通知或更新某些底层对象，journal 还可以覆盖 `onRootCommit` 来处理这些变化。

所有 NeoForge `ResourceHandler` 实现都以某种方式使用 `SnapshotJournal`，要么由 handler 本身直接使用，要么作为内部 field。只有创建新的 `ResourceHandler` 时，才需要实现 `SnapshotJournal`。

```java
// We can use the stored object as the snapshot value since we only ever
// need to keep track of one index.
public class ExampleResourceHandler extends SnapshotJournal<ExampleObject> implements ResourceHandler<ExampleResource> {

    private ExampleObject object;

    public ExampleResourceHandler(ExampleObject object) {
        // ...
    }
    
    // ...

    @Override
    protected ExampleObject createSnapshot() {
        // Create a snapshot of the object.
        // This should be immutable.
        ExampleObject original = this.object;
        this.object = new ExampleObject(
            original.id(), original.count(), ImmutableMap.copyOf(original.flags())
        );
        return original;
    }

    @Override
    protected void revertToSnapshot(ExampleObject snapshot) {
        // Reverts the state of the handler to the snapshot.
        this.object = snapshot;
    }

    // We need to update the insert and extract methods to make snapshots before
    // every modification.

    @Override
    public int insert(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // Inserts the resource into the given index, returning the amount put in.

        // Validate arguments.
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // Check whether the resource can be inserted from this location.
        ExampleObject current = this.object;
        if (current.count() == 0 || (current.id() == resource.id() && current.flags().equals(resource.flags()) && this.isValid(index, resource))) {
            // Compute the amount to insert.
            int insertedAmount = Math.min(amount, this.getCapacityAsInt(index, resource) - current.count());

            if (insertedAmount > 0) {
                // Snapshot the handler before modifying the contents.
                this.updateSnapshots(transaction);

                // Update the content.
                if (current.count() == 0) {
                    this.object = new ExampleObject(
                        resource.id(), insertedAmount, new HashMap<>(resource.flags())
                    );
                } else {
                    this.object.setCount(current.count() + insertedAmount);
                }

                // Return the amount inserted.
                return insertedAmount;
            }
        }

        // If not matching, insert nothing.
        return 0;
    }

    @Override
    public int extract(int index, ExampleResource resource, int amount, TransactionContext transaction) {
        // Extracts the contents from the given index, returning the amount taken out.

        // Validate arguments.
        Objects.checkIndex(index, size());
        TransferPreconditions.checkNonEmptyNonNegative(resource, amount);

        // Check whether the resource can be extracted from this location.
        ExampleObject current = this.object;
        if (current.id() == resource.id() && current.flags().equals(resource.flags())) {
            // Compute the amount to extract.
            int extracted = Math.min(current.count(), amount);

            if (extracted > 0) {
                // Snapshot the handler before modifying the contents.
                this.updateSnapshots(transaction);

                // Update the content.
                this.object.setCount(current.count() - extracted);

                // Return the amount extracted.
                return extracted;
            }
        }

        // If not matching, extract nothing.
        return 0;
    }
}
```

至此，事务现在也能正确处理物品栏状态：

```java
// Let's assume we have two `ResourceHandler<ExampleResource>`s exampleA, exampleB.

// Open the transaction.
try (Transaction tx = Transaction.openRoot()) {
    // Insert and extract from resource handlers
    ExampleResource resource = new ExampleResource(new ExampleObject(0, 1, Map.of()));

    // Try to extract and insert the desired resource
    if (exampleA.extract(resource, 1, tx) == 1 && exampleB.insert(resource, 1, tx) == 1) {
        // If successful, commit the transaction to make the change permanent.
        tx.commit();
    }

    // Otherwise, the transaction is aborted and the two handlers will revert their
    // contents to before the transaction occurred.
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
[transaction]: #transferring-between-handlers
