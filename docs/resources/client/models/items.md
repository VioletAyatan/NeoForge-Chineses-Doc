# 客户端物品（Client Item）

客户端 Item 是代码中表示 `ItemStack` 应如何提交给游戏进行渲染的对象，用于指定在给定 State 下使用哪些 Model。客户端 Item 位于 [`assets` 文件夹][assets]中的 `items` 子目录，其相对位置由 `DataComponents#ITEM_MODEL` 指定。默认情况下，它就是对象的 Registry Name（例如 `minecraft:apple` 默认位于 `assets/minecraft/items/apple.json`）。

客户端 Item 存储在 `ModelManager` 中，可通过 `Minecraft.getInstance().modelManager` 访问。随后，可以使用 [`Identifier`][rl] 调用 `ModelManager#getItemModel` 或 `getItemProperties`，取得客户端 Item 信息。

:::warning
不要把它与游戏中[经过 Bake 并实际渲染的 Model][models] 混淆。
:::

## 概览

客户端 Item JSON 可分成两部分：由 `model` 定义的 Model，以及由 `properties` 定义的 Property。`model` 负责定义在给定上下文中提交 `ItemStack` 进行渲染时使用哪些 Model JSON。另一方面，`properties` 负责 Renderer 所使用的设置。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    // 定义要提交渲染的模型
    "model": {
        "type": "minecraft:model",
        // 指向相对于 'models' 目录的模型 JSON
        // 位于 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item"
    },
    // 定义渲染过程中使用的一些设置
    "properties": {
        // 当 false 时，禁用物品抬起的动画
        // 上升到物品交换的正常位置
        "hand_animation_on_swap": false,
        // 当 true 时，允许模型在其定义之外渲染
        // 槽位 bounds（在 GuiItemRenderState#bounds 中定义）位于 GUI 中
        // 而不是被剪
        "oversized_in_gui": false,
        // 交换时将标量应用于手的高度
        "swap_animation_scale": 1.0
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.register(
        EXAMPLE_ITEM.get(),
        // 定义要提交渲染的模型
        new CuboidItemModelWrapper.Unbaked(
            // 指向相对于 'models' 目录的模型 JSON
            // 位于 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            Collections.emptyList()
        ),
        // 定义渲染过程中使用的一些设置
        new ClientItem.Properties(
            // 当 false 时，禁用物品抬起的动画
            // 上升到物品交换的正常位置
            false,
            // 当 true 时，允许模型在其定义之外渲染
            // 槽位 bounds（在 GuiItemRenderState#bounds 中定义）位于 GUI 中
            // 而不是被剪
            false,
            // 交换时将标量应用于手的高度
            1.0F
        )
    );
}
```

</TabItem>
</Tabs>

## 基础 Model

`model` 中的 `type` 字段决定如何选择为 Item 提交渲染的 Model。最简单的类型由 `minecraft:model`（或 `CuboidItemModelWrapper`）处理，它实际定义相对于 `models` 目录（例如 `assets/<namespace>/models/<path>.json`）提交渲染的 Model JSON。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // 指向相对于 'models' 目录的模型 JSON
        // 位于 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item"
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // 指向相对于 'models' 目录的模型 JSON
            // 位于 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            Collections.emptyList()
        )
    );
}
```

</TabItem>
</Tabs>

### 本地 Transform

大多数客户端 Item Model 都能为 Item Model 指定 `Transformation`，类似于 Model JSON。这些 `Transformation` 会在关联 Display Context 的 Model JSON Transform 之后应用。它通过 `minecraft:model` 类型的 `transformation` 字段设置。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // 指向 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // 模型 JSON 变换后要应用的变换。
        "transformation": {
            // 客户端物品的平移，指定为 `[x, y, z]`。
            "translation": [
                0.5,
                0.0,
                0.5
            ],
            // 客户端物品的初始旋转，指定为：
            // - `[x, y, z, w]`
            // - {角度,[x,y,z]旋转轴}
            "left_rotation": [
                1.0,
                0.0,
                0.0,
                0.0
            ],
            // 客户端物品的比例，指定为 `[x, y, z]`。
            "scale": [
                1.0,
                1.0,
                1.0
            ],
            // 缩放后客户端项的旋转，指定为：
            // - `[x, y, z, w]`
            // - {角度,[x,y,z]旋转轴}
            "right_rotation": {
                "angle": 0,
                "axis": [
                    0.0,
                    0.0,
                    0.0
                ]
            }
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // 指向 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            // 模型 JSON 变换后要应用的变换。
            Optional.of(new Transformation(
                // 客户端物品的平移。
                new Vector3f(0.5f, 0f, 0.5f),
                // 客户端物品的初始旋转。
                new Quaternionf(1f, 0f, 0f, 0f),
                // 客户端物品的缩放。
                new Vector3f(1f, 1f, 1f),
                // 缩放后客户端物品的旋转。
                new Quaternionf(new AxisAngle4f(0f, 0f, 0f, 0f))
            )),
            Collections.emptyList()
        )
    );
}
```

</TabItem>
</Tabs>

### 着色

与大多数 Model 一样，客户端 Item 可以根据 Stack Property 更改指定纹理的颜色。因此，`minecraft:model` 类型提供 `tints` 字段，用于定义要应用的不透明颜色。这些对象称为 `ItemTintSource`，定义在 `ItemTintSources` 中。它们也有 `type` 字段，用于定义使用哪个 Source。应用到的 `tintindex` 由它们在列表中的索引指定。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // 指向 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // 要应用的色调列表
        "tints": [
            {
                // 当着色索引为 0 时
                "type": "minecraft:constant",
                // 0x00FF00（或纯绿色）
                "value": 65280
            },
            {
                // 当着色索引为 1 时
                "type": "minecraft:dye",
                // 0x0000FF（或纯蓝色）
                // 仅在未设置 `DataComponents#DYED_COLOR` 时调用
                "default": 255
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // 指向 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            // 要应用的色调列表
            List.of(
                // 当着色索引为 0 时
                new Constant(
                    // 纯绿色
                    0x00FF00
                ),
                // 当着色索引为 1 时
                new Dye(
                    // 纯蓝色
                    // 仅在未设置 `DataComponents#DYED_COLOR` 时调用
                    0x0000FF
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自己的 `ItemTintSource` 与其他基于 Codec 的 Registry Object 类似。创建一个实现 `ItemTintSource` 的类，创建用于 Encode 和 Decode 对象的 `MapCodec`，再通过[模组事件总线][modbus] 上的 `RegisterColorHandlersEvent.ItemTintSources` 将 Codec 注册到其 Registry。`ItemTintSource` 只包含一个 `calculate` 方法，它接收当前 `ItemStack`、Stack 所在 Level 和持有 Stack 的 Entity，返回 ARGB 格式的不透明颜色，其中最高 8 Bit 为 0xFF。

```java
public record DamageBar(int defaultColor) implements ItemTintSource {

    // 要注册的映射编解码器
    public static final MapCodec<DamageBar> MAP_CODEC = ExtraCodecs.RGB_COLOR_CODEC.fieldOf("default")
        .xmap(DamageBar::new, DamageBar::defaultColor);

    public DamageBar(int defaultColor) {
        // 确保传入的颜色是不透明的
        this.defaultColor = ARGB.opaque(defaultColor);
    }

    @Override
    public int calculate(ItemStack stack, @Nullable ClientLevel level, @Nullable LivingEntity entity) {
        return stack.isDamaged() ? ARGB.opaque(stack.getBarColor()) : defaultColor;
    }

    @Override
    public MapCodec<DamageBar> type() {
        return MAP_CODEC;
    }
}

// 在某些事件处理器类中
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerItemTintSources(RegisterColorHandlersEvent.ItemTintSources event) {
    event.register(
        // 作为类型引用的名称
        Identifier.fromNamespaceAndPath("examplemod", "damage_bar"),
        // 映射编解码器
        DamageBar.MAP_CODEC
    )
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // 指向 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // 要应用的色调列表
        "tints": [
            {
                // 当着色索引为 0 时
                "type": "examplemod:damage_bar",
                // 0x00FF00（或纯绿色）
                "default": 65280
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // 指向 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            // 要应用的色调列表
            List.of(
                // 当着色索引为 0 时
                new DamageBar(
                    // 纯绿色
                    0x00FF00
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

## Composite Model

有时可能需要为单个 Item 注册多个 Model。虽然可以直接使用 [Composite Model Loader][composite] 完成，但对于 Item Model，还有自定义 `minecraft:composite` 类型，它接收要提交渲染的 Model 列表。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:composite",

        // 提交渲染的模型
        // 将按照它们在列表中出现的顺序进行绘制
        "models": [
            {
                "type": "minecraft:model",
                // 指向 'assets/examplemod/models/item/example_item_1.json'
                "model": "examplemod:item/example_item_1"
            },
            {
                "type": "minecraft:model",
                // 指向 'assets/examplemod/models/item/example_item_2.json'
                "model": "examplemod:item/example_item_2"
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CompositeModel.Unbaked(
            // 提交渲染的模型
            // 将按照它们在列表中出现的顺序进行绘制
            List.of(
                new CuboidItemModelWrapper.Unbaked(
                    // 指向 'assets/examplemod/models/item/example_item_1.json'
                    Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                    Optional.empty(),
                    Collections.emptyList()
                ),
                new CuboidItemModelWrapper.Unbaked(
                    // 指向 'assets/examplemod/models/item/example_item_2.json'
                    Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                    Optional.empty(),
                    Collections.emptyList()
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

## Property Model

有些 Item 会根据 Stack 中保存的数据改变 State（例如拉弓、Elytra 损坏、Clock 处于给定 Dimension 等）。为了让 Model 根据 State 改变，Item Model 可以指定要跟踪的 Property，并根据相应条件选择 Model。Property Model 有三种类型：Range Dispatch、Select 和 Conditional，分别相当于针对 Float、Switch Case 和 Boolean 的表达式。

### Range Dispatch Model

Range Dispatch Model 通过类型定义某个 `RangeSelectItemModelProperty`，取得用于切换 Model 的 Float。每个 Entry 都有某个 Threshold 值；Float 必须大于它，才会提交相应 Model 进行渲染。所选 Model 是不超过 Property 值、且 Threshold 最接近的 Model（例如，Property 值为 `4`，Threshold 为 `3` 和 `5` 时，会绘制与 `3` 关联的 Model；值为 `6` 时，会绘制与 `5` 关联的 Model）。可用的 `RangeSelectItemModelProperty` 位于 `RangeSelectItemModelProperties`。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:range_dispatch",

        // 使用的`RangeSelectItemModelProperty`
        "property": "minecraft:count",
        // 与计算的 property 值相乘的标量
        // 如果 count 为 0.3，scale 为 0.2，则检查的阈值将为 0.3*0.2=0.06
        "scale": 1,
        "fallback": {
            // 没有阈值匹配时使用的后备模型
            // 可以是任何未烘焙的模型类型
            "type": "minecraft:model",
            // 指向 'assets/examplemod/models/item/example_item.json'
            "model": "examplemod:item/example_item"
        },

        // `Count` 定义的 property
        // 当 true 时，使用其最大堆栈大小标准化计数
        "normalize": true,

        // 具有阈值信息的条目
        "entries": [
            {
                // 当计数为其当前最大堆栈大小的三分之一时
                "threshold": 0.33,
                "model": {
                    // 可以是任何未烘焙的模型类型
                    "type": "minecraft:model",
                    // 指向 'assets/examplemod/models/item/example_item_1.json'
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                // 当计数为其当前最大堆栈大小的三分之二时
                "threshold": 0.66,
                "model": {
                    // 可以是任何未烘焙的模型类型
                    "type": "minecraft:model",
                    // 指向 'assets/examplemod/models/item/example_item_2.json'
                    "model": "examplemod:item/example_item_2"
                }
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new RangeSelectItemModel.Unbaked(
            new Count(
                // 当 true 时，使用其最大堆栈大小标准化计数
                true
            ),
            // 与计算的 property 值相乘的标量
            // 如果 count 为 0.3，scale 为 0.2，则检查的阈值将为 0.3*0.2=0.06
            1,
            // 具有阈值信息的条目
            List.of(
                new RangeSelectItemModel.Entry(
                    // 当计数为其当前最大堆栈大小的三分之一时
                    0.33,
                    // 可以是任何未烘焙的模型类型
                    new CuboidItemModelWrapper.Unbaked(
                        // 指向 'assets/examplemod/models/item/example_item_1.json'
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                ),
                new RangeSelectItemModel.Entry(
                    // 当计数为其当前最大堆栈大小的三分之二时
                    0.66,
                    // 可以是任何未烘焙的模型类型
                    new CuboidItemModelWrapper.Unbaked(
                        // 指向 'assets/examplemod/models/item/example_item_2.json'
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                )
            ),
            // 没有阈值匹配时使用的后备模型
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    // 指向 'assets/examplemod/models/item/example_item.json'
                    ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
                    Optional.empty(),
                    Collections.emptyList()
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自己的 `RangeSelectItemModelProperty` 与其他基于 Codec 的 Registry Object 类似。创建实现 `RangeSelectItemModelProperty` 的类，创建用于 Encode 和 Decode 对象的 `MapCodec`，再通过[模组事件总线][modbus] 上的 `RegisterRangeSelectItemModelPropertyEvent` 将 Codec 注册到其 Registry。`RangeSelectItemModelProperty` 只包含一个 `get` 方法，它接收当前 `ItemStack`、Stack 所在 Level、持有 Stack 的 Entity 以及某个带 Seed 的值，返回由 Range Dispatch Model 解释的任意 Float。

```java
public record AppliedEnchantments() implements RangeSelectItemModelProperty {

    public static final MapCodec<AppliedEnchantments> MAP_CODEC = MapCodec.unit(new AppliedEnchantments());

    @Override
    public float get(ItemStack stack, @Nullable ClientLevel level, @Nullable ItemOwner owner, int seed) {
        return (float) stack.getTagEnchantments().size();
    }

    @Override
    public MapCodec<AppliedEnchantments> type() {
        return MAP_CODEC;
    }
}

// 在某些事件处理器类中
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerRangeProperties(RegisterRangeSelectItemModelPropertyEvent event) {
    event.register(
        // 作为类型引用的名称
        Identifier.fromNamespaceAndPath("examplemod", "applied_enchantments"),
        // 映射编解码器
        AppliedEnchantments.MAP_CODEC
    )
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:range_dispatch",

        // 使用的`RangeSelectItemModelProperty`
        "property": "examplemod:applied_enchantments",
        // 与计算的 property 值相乘的标量
        // 如果 count 为 0.3，scale 为 0.2，则检查的阈值将为 0.3*0.2=0.06
        "scale": 0.5,
        "fallback": {
            // 没有阈值匹配时使用的后备模型
            // 可以是任何未烘焙的模型类型
            "type": "minecraft:model",
            // 指向 'assets/examplemod/models/item/example_item.json'
            "model": "examplemod:item/example_item"
        },

        // 具有阈值信息的条目
        "entries": [
            {
                // 当至少存在一个附魔时
                // 由于 1 * 比例 0.5 = 0.5
                "threshold": 0.5,
                "model": {
                    // 可以是任何未烘焙的模型类型
                    "type": "minecraft:model",
                    // 指向 'assets/examplemod/models/item/example_item_1.json'
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                // 当至少存在两个附魔时
                // 由于 2 * 比例 0.5 = 1
                "threshold": 1,
                "model": {
                    // 可以是任何未烘焙的模型类型
                    "type": "minecraft:model",
                    // 指向 'assets/examplemod/models/item/example_item_2.json'
                    "model": "examplemod:item/example_item_2"
                }
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new RangeSelectItemModel.Unbaked(
            new AppliedEnchantments(),
            // 与计算的 property 值相乘的标量
            // 如果 count 为 0.3，scale 为 0.2，则检查的阈值将为 0.3*0.2=0.06
            0.5,
            // 具有阈值信息的条目
            List.of(
                new RangeSelectItemModel.Entry(
                    // 当至少存在一个附魔时
                    0.5,
                    // 可以是任何未烘焙的模型类型
                    new CuboidItemModelWrapper.Unbaked(
                        // 指向 'assets/examplemod/models/item/example_item_1.json'
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                ),
                new RangeSelectItemModel.Entry(
                    // 当至少存在两个附魔时
                    1,
                    // 可以是任何未烘焙的模型类型
                    new CuboidItemModelWrapper.Unbaked(
                        // 指向 'assets/examplemod/models/item/example_item_2.json'
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                )
            ),
            // 没有阈值匹配时使用的后备模型
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    // 指向 'assets/examplemod/models/item/example_item.json'
                    ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
                    Optional.empty(),
                    Collections.emptyList()
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>


有关 Item Model 如何提交渲染的更多信息，请参阅[下文][itemmodel]。

### Select Model

Select Model 与 Range Dispatch Model 类似，但它根据 `SelectItemModelProperty` 定义的某个值切换，就像针对枚举的 Switch 语句。所选 Model 是与 Switch Case 中的值完全匹配的 Property。可用的 `SelectItemModelProperty` 位于 `SelectItemModelProperties`。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:select",

        // 使用的`SelectItemModelProperty`
        "property": "minecraft:display_context",
        "fallback": {
            // 没有大小写匹配时使用的后备模型
            // 可以是任何未烘焙的模型类型
            "type": "minecraft:model",
            "model": "examplemod:item/example_item"
        },

        // 基于可选 property 的开关案例
        "cases": [
            {
                // 当显示上下文为 `ItemDisplayContext#GUI` 时
                "when": "gui",
                "model": {
                    // 可以是任何未烘焙的模型类型
                    "type": "minecraft:model",
                    // 指向 'assets/examplemod/models/item/example_item_1.json'
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                // 当显示上下文为 `ItemDisplayContext#FIRST_PERSON_RIGHT_HAND` 时
                "when": "firstperson_righthand",
                "model": {
                     // 可以是任何未烘焙的模型类型
                    "type": "minecraft:model",
                    // 指向 'assets/examplemod/models/item/example_item_2.json'
                    "model": "examplemod:item/example_item_2"
                }
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SelectItemModel.Unbaked(
            new SelectItemModel.UnbakedSwitch(
                // 使用的`SelectItemModelProperty`
                new DisplayContext(),
                // 基于可选 property 切换案例
                List.of(
                    new SelectItemModel.SwitchCase(
                        // 此模型要匹配的分支列表
                        List.of(ItemDisplayContext.GUI),
                        // 可以是任何未烘焙的模型类型
                        new CuboidItemModelWrapper.Unbaked(
                            // 指向 'assets/examplemod/models/item/example_item_1.json'
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    ),
                    new SelectItemModel.SwitchCase(
                        // 此模型要匹配的分支列表
                        List.of(ItemDisplayContext.FIRST_PERSON_RIGHT_HAND),
                        // 可以是任何未烘焙的模型类型
                        new CuboidItemModelWrapper.Unbaked(
                            // 指向 'assets/examplemod/models/item/example_item_2.json'
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    )
                )
            ),
            // 没有大小写匹配时使用的后备模型
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    // 指向 'assets/examplemod/models/item/example_item.json'
                    ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
                    Optional.empty(),
                    Collections.emptyList()
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自己的 `SelectItemModelProperty` 与基于 Codec 的 Registry Object 类似。创建实现 `SelectItemModelProperty<T>` 的类、用于序列化和反序列化 Property 值的 `Codec`、用于 Encode 和 Decode 对象的 `MapCodec`，再通过[模组事件总线][modbus] 上的 `RegisterSelectItemModelPropertyEvent` 将 Codec 注册到其 Registry。`SelectItemModelProperty` 的泛型 `T` 表示进行切换的值。它只包含一个 `get` 方法，接收当前 `ItemStack`、Stack 所在 Level、持有 Stack 的 Entity、某个带 Seed 的值，以及 Item 的 Display Context，返回由 Select Model 解释的任意 `T`。

```java
// 选择 property 类
public record StackRarity() implements SelectItemModelProperty<Rarity> {

    // 包含相关编解码器的要注册的对象
    public static final SelectItemModelProperty.Type<StackRarity, Rarity> TYPE = SelectItemModelProperty.Type.create(
        // 此 property 的映射编解码器
        MapCodec.unit(new StackRarity()),
        // 正在选择的对象的编解码器
        // 用于序列化案例 entries（"when"：<property 值>）
        Rarity.CODEC
    );

    @Nullable
    @Override
    public Rarity get(ItemStack stack, @Nullable ClientLevel level, @Nullable LivingEntity entity, int seed, ItemDisplayContext displayContext) {
        // 当null时，使用后备模型
        return stack.get(DataComponents.RARITY);
    }

    @Override
    public SelectItemModelProperty.Type<StackRarity, Rarity> type() {
        return TYPE;
    }
}

// 在某些事件处理器类中
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerSelectProperties(RegisterSelectItemModelPropertyEvent event) {
    event.register(
        // 作为类型引用的名称
        Identifier.fromNamespaceAndPath("examplemod", "rarity"),
        // property 类型
        StackRarity.TYPE
    )
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:select",

        // 使用的`SelectItemModelProperty`
        "property": "examplemod:rarity",
        "fallback": {
            // 没有大小写匹配时使用的后备模型
            // 可以是任何未烘焙的模型类型
            "type": "minecraft:model",
            "model": "examplemod:item/example_item"
        },

        // 基于可选 property 的开关案例
        "cases": [
            {
                // 当稀有度为 `Rarity#UNCOMMON` 时
                "when": "uncommon",
                "model": {
                    // 可以是任何未烘焙的模型类型
                    "type": "minecraft:model",
                    // 指向 'assets/examplemod/models/item/example_item_1.json'
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                // 当稀有度为 `Rarity#RARE` 时
                "when": "rare",
                "model": {
                     // 可以是任何未烘焙的模型类型
                    "type": "minecraft:model",
                    // 指向 'assets/examplemod/models/item/example_item_2.json'
                    "model": "examplemod:item/example_item_2"
                }
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SelectItemModel.Unbaked(
            new SelectItemModel.UnbakedSwitch(
                // 使用的`SelectItemModelProperty`
                new StackRarity(),
                // 基于可选 property 切换案例
                List.of(
                    new SelectItemModel.SwitchCase(
                        // 此模型要匹配的分支列表
                        List.of(Rarity.UNCOMMON),
                        // 可以是任何未烘焙的模型类型
                        new CuboidItemModelWrapper.Unbaked(
                            // 指向 'assets/examplemod/models/item/example_item_1.json'
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    ),
                    new SelectItemModel.SwitchCase(
                        // 此模型要匹配的分支列表
                        List.of(Rarity.RARE),
                        // 可以是任何未烘焙的模型类型
                        new CuboidItemModelWrapper.Unbaked(
                            // 指向 'assets/examplemod/models/item/example_item_2.json'
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    )
                )
            ),
            // 没有大小写匹配时使用的后备模型
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    // 指向 'assets/examplemod/models/item/example_item.json'
                    ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
                    Optional.empty(),
                    Collections.emptyList()
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

### Conditional Model

Conditional Model 是三者中最简单的一种。类型定义某个 `ConditionalItemModelProperty`，取得用于切换 Model 的 Boolean。根据返回值是 true 还是 false 选择 Model。可用的 `ConditionalItemModelProperty` 位于 `ConditionalItemModelProperties`。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:condition",

        // 使用的`ConditionalItemModelProperty`
        "property": "minecraft:damaged",

        // boolean 结果是什么
        "on_true": {
            // 可以是任何未烘焙的模型类型
            "type": "minecraft:model",
            // 指向 'assets/examplemod/models/item/example_item_1.json'
            "model": "examplemod:item/example_item_1"
            
        },
        "on_false": {
            // 可以是任何未烘焙的模型类型
            "type": "minecraft:model",
            // 指向 'assets/examplemod/models/item/example_item_2.json'
            "model": "examplemod:item/example_item_2"
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new ConditionalItemModel.Unbaked(
            // 要检查的 property
            new Damaged(),
            // 当 boolean 为 true 时
            new CuboidItemModelWrapper.Unbaked(
                // 指向 'assets/examplemod/models/item/example_item_1.json'
                Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                Optional.empty(),
                Collections.emptyList()
            ),
            // 当 boolean 为 false 时
            new CuboidItemModelWrapper.Unbaked(
                // 指向 'assets/examplemod/models/item/example_item_2.json'
                Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                Optional.empty(),
                Collections.emptyList()
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自己的 `ConditionalItemModelProperty` 与其他基于 Codec 的 Registry Object 类似。创建实现 `ConditionalItemModelProperty` 的类、用于 Encode 和 Decode 对象的 `MapCodec`，再通过[模组事件总线][modbus] 上的 `RegisterConditionalItemModelPropertyEvent` 将 Codec 注册到其 Registry。`RangeSelectItemModelProperty` 只包含一个 `get` 方法，接收当前 `ItemStack`、Stack 所在 Level、持有 Stack 的 Entity、某个带 Seed 的值，以及 Item 的 Display Context，返回由 Conditional Model（`on_true` 或 `on_false`）解释的任意 Boolean。

```java
public record BarVisible() implements ConditionalItemModelProperty {

    public static final MapCodec<BarVisible> MAP_CODEC =  MapCodec.unit(new BarVisible());

    @Override
    public boolean get(ItemStack stack, @Nullable ClientLevel level, @Nullable LivingEntity entity, int seed, ItemDisplayContext context) {
        return stack.isBarVisible();
    }

    @Override
    public MapCodec<BarVisible> type() {
        return MAP_CODEC;
    }
}

// 在某些事件处理器类中
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerConditionalProperties(RegisterConditionalItemModelPropertyEvent event) {
    event.register(
        // 作为类型引用的名称
        Identifier.fromNamespaceAndPath("examplemod", "bar_visible"),
        // 映射编解码器
        BarVisible.MAP_CODEC
    )
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:condition",

        // 使用的`ConditionalItemModelProperty`
        "property": "examplemod:bar_visible",

        // boolean 结果是什么
        "on_true": {
            // 可以是任何未烘焙的模型类型
            "type": "minecraft:model",
            // 指向 'assets/examplemod/models/item/example_item_1.json'
            "model": "examplemod:item/example_item_1"
            
        },
        "on_false": {
            // 可以是任何未烘焙的模型类型
            "type": "minecraft:model",
            // 指向 'assets/examplemod/models/item/example_item_2.json'
            "model": "examplemod:item/example_item_2"
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new ConditionalItemModel.Unbaked(
            // 要检查的 property
            new BarVisible(),
            // 当 boolean 为 true 时
            new CuboidItemModelWrapper.Unbaked(
                // 指向 'assets/examplemod/models/item/example_item_1.json'
                Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                Optional.empty(),
                Collections.emptyList()
            ),
            // 当 boolean 为 false 时
            new CuboidItemModelWrapper.Unbaked(
                // 指向 'assets/examplemod/models/item/example_item_2.json'
                Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                Optional.empty(),
                Collections.emptyList()
            )
        )
    );
}
```

</TabItem>
</Tabs>
## Special Model

并非所有 Model 都能用基础 Model JSON 表示。有些 Model 可能具有动态组件，或使用为 [`BlockEntityRenderer`][ber] 创建的现有 `Model`。在这些情况下，可以使用一种特殊 Model 类型，让用户指定要提交哪些[功能][features]进行渲染。它们称为 `SpecialModelRenderer`，定义在 `SpecialModelRenderers` 中。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:special",

        // 读取粒子纹理并显示变换的父模型
        // 指向 'assets/minecraft/models/item/template_skull.json'
        "base": "minecraft:item/template_skull",
        "model": {
            // 使用的特殊模型渲染器
            "type": "minecraft:head",

            // `SkullSpecialRenderer.Unbaked` 定义的 property
            // 头骨方块的类型
            "kind": "wither_skeleton",
            // 渲染头部时使用的纹理
            // 指向 'assets/examplemod/textures/entity/heads/skeleton_override.png'
            "texture": "examplemod:heads/skeleton_override",
            // 用于为头部模型制作动画的动画 float
            "animation": 0.5
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SpecialModelWrapper.Unbaked(
            // 读取粒子纹理并显示变换的父模型
            // 指向 'assets/minecraft/models/item/template_skull.json'
            Identifier.fromNamespaceAndPath("minecraft", "item/template_skull"),
            // 使用的特殊模型渲染器
            new SkullSpecialRenderer.Unbaked(
                // 头骨方块的类型
                SkullBlock.Types.WITHER_SKELETON,
                // 渲染头部时使用的纹理
                // 指向 'assets/examplemod/textures/entity/heads/skeleton_override.png'
                Optional.of(
                    Identifier.fromNamespaceAndPath("examplemod", "heads/skeleton_override")
                ),
                // 用于为头部模型制作动画的动画 float
                0.5f
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自己的 `SpecialModelRenderer` 分为三部分：用于提交 Item 渲染[功能][features]的 `SpecialModelRenderer` 实例、用于读写 JSON 的 `SpecialModelRenderer.Unbaked` 实例，以及在作为 Item（必要时也作为 Block）时使用该 Renderer 的注册。

首先是 `SpecialModelRenderer`。它的工作方式与其他 Renderer 类（例如 BlockEntity Renderer、Entity Renderer）类似，应接收提交过程中使用的静态数据（例如 `Model` 子类、纹理的 `SpriteId` 等）。需要注意两个方法。第一个是 `extractArgument`，它只提供 `ItemStack` 中的必要内容，从而限制 `submit` 方法可用的数据量。

:::info
如果不确定需要哪些数据，可以直接让它返回相应 `ItemStack`。如果完全不需要 Stack 数据，则可使用已经替你实现该方法的 `NoDataSpecialModelRenderer`。
:::

接下来是 `submit` 方法。它接收 `extractArgument` 的返回值、Pose Stack、用于提交所需功能的 Collector、Packed Light、Overlay Texture、Stack 是否具有 Foil（例如已附魔），以及 Outline Color。所有功能都应在此方法中提交。

```java
public record ExampleSpecialRenderer(SpriteGetter spriteGetter, Model.Simple model, SpriteId sprite) implements SpecialModelRenderer<Boolean> {

    @Nullable
    public Boolean extractArgument(ItemStack stack) {
        // 提取要使用的数据
        return stack.isBarVisible();
    }

    // 提交模型的特征
    @Override
    public void submit(Boolean argument, PoseStack poseStack, SubmitNodeCollector collector, int lightCoords, int overlayCoords, boolean hasFoil, int outlineColor) {
        collector.submitModel(
            this.model, Unit.INSTANCE,
            poseStack, this.sprite.renderType(barVisible ? RenderType::entityCutout : RenderType::entitySolid),
            lightCoords, overlayCoords, -1, this.spriteGetter.get(this.sprite), outlineColor, null
        );
    }
}
```

接下来是 `SpecialModelRenderer.Unbaked` 实例。它应包含可从文件读取、用于确定向 Special Renderer 传入什么内容的数据。它也包含两个方法：用于构造 Special Renderer 实例的 `bake`，以及定义文件 Encode/Decode 所用 `MapCodec` 的 `type`。

```java
public record ExampleSpecialRenderer(SpriteGetter spriteGetter, Model.Simple model, SpriteId sprite) implements SpecialModelRenderer<Boolean> {

    // ...

    public record Unbaked(Identifier texture) implements SpecialModelRenderer.Unbaked {

        public static final MapCodec<ExampleSpecialRenderer.Unbaked> MAP_CODEC = Identifier.CODEC.fieldOf("texture")
            .xmap(ExampleSpecialRenderer.Unbaked::new, ExampleSpecialRenderer.Unbaked::texture);

        @Override
        public MapCodec<ExampleSpecialRenderer.Unbaked> type() {
            return MAP_CODEC;
        }

        @Override
        public SpecialModelRenderer<?> bake(SpecialModelRenderer.BakingContext ctx) {
            // 将资源位置解析为绝对路径
            Identifier textureLoc = this.texture.withPath(path -> "textures/entity/" + path + ".png");

            // 获取要渲染的模型和sprite
            return new ExampleSpecialRenderer(ctx.sprites(), ...);
        }
    }
}
```

最后，把对象注册到所需位置。对于客户端 Item，通过[模组事件总线][modbus] 上的 `RegisterSpecialModelRendererEvent` 完成。如果 Special Renderer 还应作为 `BlockEntityRenderer` 的一部分使用，例如在类似 Item 的上下文中渲染（如 Enderman 手持 Block），则应通过[模组事件总线][modbus] 上的 `RegisterBlockModelsEvent` 注册 Block 的 `Unbaked` 版本。

```java
// 在某些事件处理器类中
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerSpecialRenderers(RegisterSpecialModelRendererEvent event) {
    event.register(
        // 作为类型引用的名称
        Identifier.fromNamespaceAndPath("examplemod", "example_special"),
        // 映射编解码器
        ExampleSpecialRenderer.Unbaked.MAP_CODEC
    );
}

// 用于在类似物品的上下文中渲染方块
// 假设存在 DeferredBlock<ExampleBlock> EXAMPLE_BLOCK
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerSpecialBlockRenderers(RegisterBlockModelsEvent event) {
    event.register(
        // 要使用的未烘焙实例
        new SpecialBlockModelWrapper.Unbaked(
            new ExampleSpecialRenderer.Unbaked(Identifier.fromNamespaceAndPath("examplemod", "entity/example_special")),
            Optional.empty()
        ),
        // 要渲染的方块
        EXAMPLE_BLOCK.get()
    );
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:special",

        // 读取粒子纹理并显示变换的父模型
        // 指向 'assets/minecraft/models/item/template_skull.json'
        "base": "minecraft:item/template_skull",
        "model": {
            // 使用的特殊模型渲染器
            "type": "examplemod:example_special",

            // `ExampleSpecialRenderer.Unbaked` 定义的 property
            // 使用的纹理
            // 指向 'assets/examplemod/textures/entity/example/example_texture.png'
            "texture": "examplemod:example/example_texture"
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SpecialModelWrapper.Unbaked(
            // 读取粒子纹理并显示变换的父模型
            // 指向 'assets/minecraft/models/item/template_skull.json'
            Identifier.fromNamespaceAndPath("minecraft", "item/template_skull"),
            // 使用的特殊模型渲染器
            new ExampleSpecialRenderer.Unbaked(
                // 使用的纹理
                // 指向 'assets/examplemod/textures/entity/example/example_texture.png'
                Identifier.fromNamespaceAndPath("examplemod", "example/example_texture")
            )
        )
    );
}
```

</TabItem>
</Tabs>

## Dynamic Fluid Container

NeoForge 添加了一种用于构造动态流体容器的 Item Model，它可以在运行时重新设置自身纹理，以匹配所装流体。

:::info
要把 Fluid Tint 应用于流体纹理，相应 Item 必须附加 `Capabilities.FluidHandler.ITEM`。如果 Item 没有直接使用 `BucketItem`（也不是其子类型），就需要[为 Item 注册 Capability][capability]。
:::

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "neoforge:fluid_container",

        // 用于构造容器的纹理
        // 这些是参考方块图集的，因此它们是相对于 `textures` 目录的
        "textures": {
            // 设置模型粒子sprite
            // 如果未设置，则使用不是 null 的第一个纹理：
            // - 流体静止纹理
            // - 容器基础纹理
            // - 容器盖纹理，如果不用作遮罩
            // 指向 'assets/minecraft/textures/item/bucket.png'
            "particle": "minecraft:item/bucket",
            // 设置第一层使用的纹理，通常是流体的容器
            // 如果不设置，则不会添加图层
            // 指向 'assets/minecraft/textures/item/bucket.png'
            "base": "minecraft:item/bucket",
            // 设置用作静止流体纹理蒙版的纹理
            // 看到液体的区域应为纯白色
            // 如果不设置或者流体为空，则不绘制图层
            // 指向 'assets/neoforge/textures/item/mask/bucket_fluid.png'
            "fluid": "neoforge:item/mask/bucket_fluid",
            // 设置纹理以用作
            // - 'cover_is_mask' 为 false 时的叠加纹理
            // - 当 'cover_is_mask' 为 true 时，应用于底座纹理的遮罩（应该是纯白色才能看到）
            // 如果'cover_is_mask'为true 时未设置或未设置基础纹理，则不绘制该图层
            // 指向 'assets/neoforge/textures/item/mask/bucket_fluid_cover.png'
            "cover": "neoforge:item/mask/bucket_fluid_cover",
        },

        // 当 true 时，对于密度为负或零的流体，将模型旋转 180 度
        // 默认为 false
        "flip_gas": true,
        // 当 true 时，使用覆盖纹理作为基础纹理的遮罩
        // 默认为 true
        "cover_is_mask": true,
        // 为 true 时，将流体纹理层的光照贴图设置为最大值
        // 适用于光级大于零的流体
        // 默认为 true
        "apply_fluid_luminosity": false
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<ExampleFluidContainerItem> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new DynamicFluidContainerModel.Unbaked(
            // 用于构造容器的纹理
            // 这些是参考方块图集的，因此它们是相对于 `textures` 目录的
            new DynamicFluidContainerModel.Textures(
                // 设置模型粒子sprite
                // 如果未设置，则使用不是 null 的第一个纹理：
                // - 流体静止纹理
                // - 容器基础纹理
                // - 容器盖纹理，如果不用作遮罩
                // 指向 'assets/minecraft/textures/item/bucket.png'
                Optional.of(Identifier.withDefaultNamespace("item/bucket")),
                // 设置第一层使用的纹理，通常是流体的容器
                // 如果不设置，则不会添加图层
                // 指向 'assets/minecraft/textures/item/bucket.png'
                Optional.of(Identifier.withDefaultNamespace("item/bucket")),
                // 设置用作静止流体纹理蒙版的纹理
                // 看到液体的区域应为纯白色
                // 如果未设置或流体为空，则不渲染该图层
                // 指向 'assets/neoforge/textures/item/mask/bucket_fluid.png'
                Optional.of(Identifier.fromNamespaceAndPath("neoforge", "item/mask/bucket_fluid")),
                // 设置纹理以用作
                // - 'cover_is_mask' 为 false 时的叠加纹理
                // - 当 'cover_is_mask' 为 true 时，应用于底座纹理的遮罩（应该是纯白色才能看到）
                // 如果未设置或当 'cover_is_mask' 为 true 时未设置基础纹理，则不渲染该图层
                // 指向 'assets/neoforge/textures/item/mask/bucket_fluid_cover.png'
                Optional.of(Identifier.fromNamespaceAndPath("neoforge", "item/mask/bucket_fluid_cover"))
            ),
            // 为 true 时，将模型旋转 180 度
            // 默认为 false
            true,
            // 当 true 时，使用覆盖纹理作为基础纹理的遮罩
            // 默认为 true
            true,
            // 为 true 时，将流体纹理层的光照贴图设置为最大值
            // 默认为 true
            false
        )
    );
}
```

</TabItem>
</Tabs>

## 手动提交 Item 进行渲染

如果需要提交 Item [功能][features]，例如在某个 `BlockEntityRenderer` 或 `EntityRenderer` 中，可以通过三个步骤完成。首先，Renderer 创建 `ItemStackRenderState` 保存 Stack State。随后，`ItemModelResolver` 使用其某个方法更新 `ItemStackRenderState`，使其对应当前提交的 Item。最后，通过 `ItemStackRenderState#submit` 提交 Item。

`ItemStackRenderState` 跟踪绘制所用数据。每个“Model”都有自己的 `ItemStackRenderState.LayerRenderState`，其中包含待渲染的 `BakedQuad`，以及 Render Type、Foil 状态、Tint 信息、Animated 标记、Extents 和所用 Special Renderer。使用 `newLayer` 创建 Layer，使用 `clear` 清除以便渲染。如果使用预先确定数量的 Layer，则用 `ensureCapacity` 确保存在足够的 `LayerRenderStates` 正确渲染。

:::info
[Screen][screens] 使用子类 `TrackingItemStackRenderState` 保存 Model Identity Element，以便跨 Frame 缓存 Render State。
:::

`ItemModelResolver` 负责更新 `ItemStackRenderState`：Living Entity 持有的 Item 使用 `updateForLiving`，其他类型 Entity 持有的 Item 使用 `updateForNonLiving`，其余情况使用 `updateForTopItem`。这些方法接收 Render State、待渲染 Stack 和当前 Display Context；其他参数更新持有的手、Level、Item Owner 和 Seed 值等信息。每个方法都会先调用 `ItemStackRenderState#clear`，再对从 `DataComponents#ITEM_MODEL` 取得的 `ItemModel` 调用 `update`。若不在某个 Renderer 上下文中（如 `BlockEntityRenderer`、`EntityRenderer`），始终可以通过 `Minecraft#getItemModelResolver` 取得 `ItemModelResolver`。

## 自定义 Item Model Definition

创建自己的 `ItemModel` 分为三部分：用于更新 Render State 的 `ItemModel` 实例、用于读写 JSON 的 `ItemModel.Unbaked` 实例，以及使用该 `ItemModel` 的注册。

:::warning
请务必先确认所需 Item Model 无法通过上述现有系统创建。多数情况下，没有必要创建自定义 `ItemModel`。
:::

首先是 `ItemModel`。它负责更新 `ItemStackRenderState`，以正确绘制 Item。它应接收提交过程中使用的静态数据（例如 `BakedQuad` 列表、Property 信息等）。唯一的方法是 `update`，它接收 Render State、Stack、Model Resolver、Display Context、Level、Item Owner 和某个 Seed 值，用于更新 `ItemStackRenderState`。只有 `ItemStackRenderState` 参数应被修改，其余参数应视为只读数据。

```java
public record ExampleModelWrapper(QuadCollection quads, List<ItemTintSource> tints, ModelRenderProperties properties, Matrix4fc transformation) implements ItemModel {

    // 更新渲染状态
    @Override
    public void update(ItemStackRenderState state, ItemStack stack, ItemModelResolver resolver, ItemDisplayContext displayContext, @Nullable ClientLevel level, @Nullable ItemOwner owner, int seed) {
        // 设置模型使用的标识
        state.appendModelIdentityElement(this);

        // 创建新图层
        ItemStackRenderState.LayerRenderState layerState = state.newLayer();

        // 设置要使用的箔片
        if (stack.hasFoil()) {
            layerState.setFoilType(ItemStackRenderState.FoilType.STANDARD);
            state.appendModelIdentityElement(ItemStackRenderState.FoilType.STANDARD);
        }


        // 应用色调源
        int tintSize = this.tints.size();
        int[] tintLayers = layerState.prepareTintLayers(tintSize);

        for (int idx = 0; idx < tintSize; idx++) {
            int tintColor = this.tints.get(idx).calculate(stack, level, owner.asLivingEntity());
            tintLayers[idx] = tintColor;
            state.appendModelIdentityElement(tintColor);
        }

        // 计算模型的边界
        // 用于 GUI 渲染 bounds（超大时）和物品实体摆动
        layerState.setExtents(CuboidItemModelWrapper.computeExtents(this.quads.getAll()));

        // 设置本地转换申请客户项
        layerState.setLocalTransform(this.transformation);

        // 设置其他常见模型 property
        this.properties.applyToLayer(layerState, displayContext);

        // 添加要提交的四边形
        layerState.prepareQuadList().addAll(this.quads.getAll());

        // 设置如果具有关联的材质标志，则进行动画处理
        if (this.quads.hasMaterialFlag(BakedQuad.FLAG_ANIMATED)) {
            layerState.setAnimated();
        }
    }
}
```

接下来是 `ItemModel.Unbaked` 实例。它应包含可从文件读取、用于确定向 Item Model 传入什么内容的数据。它也包含两个方法：用于构造 `ItemModel` 实例的 `bake`，以及定义文件 Encode/Decode 所用 `MapCodec` 的 `type`。

```java
public record ExampleModelWrapper(QuadCollection quads, List<ItemTintSource> tints, ModelRenderProperties properties, Matrix4fc transformation) implements ItemModel {

    // ...

     public record Unbaked(Identifier model, List<ItemTintSource> tints, Optional<Transformation> transformation) implements ItemModel.Unbaked {
        // 要注册的映射编解码器
        public static final MapCodec<ExampleModelWrapper.Unbaked> MAP_CODEC = RecordCodecBuilder.mapCodec(instance ->
            instance.group(
                Identifier.CODEC.fieldOf("model").forGetter(ExampleModelWrapper.Unbaked::model),
                ItemTintSources.CODEC.listOf().optionalFieldOf("tints", List.of()).forGetter(ExampleModelWrapper.Unbaked::tints)
                Transformation.EXTENDED_CODEC.optionalFieldOf("transformation").forGetter(ExampleModelWrapper.Unbaked::transformation)
            )
            .apply(instance, ExampleModelWrapper.Unbaked::new)
        );

        @Override
        public void resolveDependencies(ResolvableModel.Resolver resolver) {
            // 标记此物品模型的所有依赖项
            resolver.markDependency(this.model);
        }

        @Override
        public ItemModel bake(ItemModel.BakingContext context, Matrix4fc parentTransform) {
            // 获取烘焙的四边形和返回
            ModelBaker baker = context.blockModelBaker();
            ResolvedModel resolvedModel = baker.getModel(this.model);
            TextureSlots slots = resolvedModel.getTopTextureSlots();

            return new ExampleModelWrapper(
                resolvedModel.bakeTopGeometry(slots, baker, BlockModelRotation.IDENTITY),
                this.tints,
                ModelRenderProperties.fromResolvedModel(baker, resolvedModel, slots),
                Transformation.compose(parentTransform, this.transformation)
            );
        }

        @Override
        public MapCodec<ExampleModelWrapper.Unbaked> type() {
            return MAP_CODEC;
        }
    }
}
```

随后，通过[模组事件总线][modbus] 上的 `RegisterItemModelsEvent` 注册 Map Codec。

```java
// 在某些事件处理器类中
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerItemModels(RegisterItemModelsEvent event) {
    event.register(
        // 作为类型引用的名称
        Identifier.fromNamespaceAndPath("examplemod", "render_type"),
        // 映射编解码器
        ExampleModelWrapper.Unbaked.MAP_CODEC
    )
}
```

最后，可以在 JSON 中使用 `ItemModel`，或将其作为 Datagen 流程的一部分。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "examplemod:render_type",
        // 指向 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // 应用于模型纹理的任何色调
        "tints": []
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展 ModelProvider 内
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new ExampleModelWrapper.Unbaked(
            // 指向 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            // 应用于模型纹理的任何色调
            List.of(),
            // 模型 JSON 变换后要应用的变换
            Optional.empty()
        )
    );
}
```

</TabItem>
</Tabs>

[assets]: ../../index.md#assets
[ber]: ../../../blockentities/ber.md
[capability]: ../../../inventories/capabilities.md#registering-capabilities
[composite]: modelloaders.md#composite-model
[features]: ../../../rendering/feature.md
[itemmodel]: #manually-rendering-an-item
[modbus]: ../../../concepts/events.md#事件总线
[models]: modelsystem.md
[rl]: ../../../misc/identifier.md
[screens]: ../../../rendering/screens.md#items
