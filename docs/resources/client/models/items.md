# 客户端 Item

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
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    // Defines the model to submit for rendering
    "model": {
        "type": "minecraft:model",
        // Points to a model JSON relative to the 'models' directory
        // Located at 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item"
    },
    // Defines some settings to use during the rendering process
    "properties": {
        // When false, disables the animation where the item is raised
        // up towards its normal position on item swap
        "hand_animation_on_swap": false,
        // When true, allows the model to render outside its defined
        // slot bounds (defined in GuiItemRenderState#bounds) in a GUI
        // instead of being scissored
        "oversized_in_gui": false,
        // Applies the scalar to the height of the hand when swapping
        "swap_animation_scale": 1.0
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.register(
        EXAMPLE_ITEM.get(),
        // Defines the model to submit for rendering
        new CuboidItemModelWrapper.Unbaked(
            // Points to a model JSON relative to the 'models' directory
            // Located at 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            Collections.emptyList()
        ),
        // Defines some settings to use during the rendering process
        new ClientItem.Properties(
            // When false, disables the animation where the item is raised
            // up towards its normal position on item swap
            false,
            // When true, allows the model to render outside its defined
            // slot bounds (defined in GuiItemRenderState#bounds) in a GUI
            // instead of being scissored
            false,
            // Applies the scalar to the height of the hand when swapping
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
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // Points to a model JSON relative to the 'models' directory
        // Located at 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item"
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // Points to a model JSON relative to the 'models' directory
            // Located at 'assets/examplemod/models/item/example_item.json'
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
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // Points to 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // The transformations to apply after the model JSON transforms.
        "transformation": {
            // The translation of the client item, specified as `[x, y, z]`.
            "translation": [
                0.5,
                0.0,
                0.5
            ],
            // The initial rotation of the client item, specified as:
            // - `[x, y, z, w]`
            // - { angle, [x, y, z] rotation axis }
            "left_rotation": [
                1.0,
                0.0,
                0.0,
                0.0
            ],
            // The scale of the client item, specified as `[x, y, z]`.
            "scale": [
                1.0,
                1.0,
                1.0
            ],
            // The rotation of the client item after scaling, specified as:
            // - `[x, y, z, w]`
            // - { angle, [x, y, z] rotation axis }
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
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // Points to 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            // The transformations to apply after the model JSON transforms.
            Optional.of(new Transformation(
                // The translation of the client item.
                new Vector3f(0.5f, 0f, 0.5f),
                // The initial rotation of the client item.
                new Quaternionf(1f, 0f, 0f, 0f),
                // The scale of the client item.
                new Vector3f(1f, 1f, 1f),
                // The rotation of the client item after scaling.
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
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // Points to 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // A list of tints to apply
        "tints": [
            {
                // For when tintindex: 0
                "type": "minecraft:constant",
                // 0x00FF00 (or pure green)
                "value": 65280
            },
            {
                // For when tintindex: 1
                "type": "minecraft:dye",
                // 0x0000FF (or pure blue)
                // Only is called if `DataComponents#DYED_COLOR` is not set
                "default": 255
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // Points to 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            // A list of tints to apply
            List.of(
                // For when tintindex: 0
                new Constant(
                    // Pure green
                    0x00FF00
                ),
                // For when tintindex: 1
                new Dye(
                    // Pure blue
                    // Only is called if `DataComponents#DYED_COLOR` is not set
                    0x0000FF
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自己的 `ItemTintSource` 与其他基于 Codec 的 Registry Object 类似。创建一个实现 `ItemTintSource` 的类，创建用于 Encode 和 Decode 对象的 `MapCodec`，再通过[模组 Event Bus][modbus] 上的 `RegisterColorHandlersEvent.ItemTintSources` 将 Codec 注册到其 Registry。`ItemTintSource` 只包含一个 `calculate` 方法，它接收当前 `ItemStack`、Stack 所在 Level 和持有 Stack 的 Entity，返回 ARGB 格式的不透明颜色，其中最高 8 Bit 为 0xFF。

```java
public record DamageBar(int defaultColor) implements ItemTintSource {

    // The map codec to register
    public static final MapCodec<DamageBar> MAP_CODEC = ExtraCodecs.RGB_COLOR_CODEC.fieldOf("default")
        .xmap(DamageBar::new, DamageBar::defaultColor);

    public DamageBar(int defaultColor) {
        // Make sure the passed in color is opaque
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

// In some event handler class
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerItemTintSources(RegisterColorHandlersEvent.ItemTintSources event) {
    event.register(
        // The name to reference as the type
        Identifier.fromNamespaceAndPath("examplemod", "damage_bar"),
        // The map codec
        DamageBar.MAP_CODEC
    )
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // Points to 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // A list of tints to apply
        "tints": [
            {
                // For when tintindex: 0
                "type": "examplemod:damage_bar",
                // 0x00FF00 (or pure green)
                "default": 65280
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // Points to 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            // A list of tints to apply
            List.of(
                // For when tintindex: 0
                new DamageBar(
                    // Pure green
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
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:composite",

        // The models to submit for rendering
        // Will be drawn in the order they appear in the list
        "models": [
            {
                "type": "minecraft:model",
                // Points to 'assets/examplemod/models/item/example_item_1.json'
                "model": "examplemod:item/example_item_1"
            },
            {
                "type": "minecraft:model",
                // Points to 'assets/examplemod/models/item/example_item_2.json'
                "model": "examplemod:item/example_item_2"
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CompositeModel.Unbaked(
            // The models to submit for rendering
            // Will be drawn in the order they appear in the list
            List.of(
                new CuboidItemModelWrapper.Unbaked(
                    // Points to 'assets/examplemod/models/item/example_item_1.json'
                    Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                    Optional.empty(),
                    Collections.emptyList()
                ),
                new CuboidItemModelWrapper.Unbaked(
                    // Points to 'assets/examplemod/models/item/example_item_2.json'
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
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:range_dispatch",

        // The `RangeSelectItemModelProperty` to use
        "property": "minecraft:count",
        // A scalar to multiply to the computed property value
        // If count was 0.3 and scale was 0.2, then the threshold checked would be 0.3*0.2=0.06
        "scale": 1,
        "fallback": {
            // The fallback model to use if no threshold matches
            // Can be any unbaked model type
            "type": "minecraft:model",
            // Points to 'assets/examplemod/models/item/example_item.json'
            "model": "examplemod:item/example_item"
        },

        // Properties defined by `Count`
        // When true, normalizes the count using its max stack size
        "normalize": true,

        // Entries with threshold information
        "entries": [
            {
                // When the count is a third of its current max stack size
                "threshold": 0.33,
                "model": {
                    // Can be any unbaked model type
                    "type": "minecraft:model",
                    // Points to 'assets/examplemod/models/item/example_item_1.json'
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                // When the count is two thirds of its current max stack size
                "threshold": 0.66,
                "model": {
                    // Can be any unbaked model type
                    "type": "minecraft:model",
                    // Points to 'assets/examplemod/models/item/example_item_2.json'
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
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new RangeSelectItemModel.Unbaked(
            new Count(
                // When true, normalizes the count using its max stack size
                true
            ),
            // A scalar to multiply to the computed property value
            // If count was 0.3 and scale was 0.2, then the threshold checked would be 0.3*0.2=0.06
            1,
            // Entries with threshold information
            List.of(
                new RangeSelectItemModel.Entry(
                    // When the count is a third of its current max stack size
                    0.33,
                    // Can be any unbaked model type
                    new CuboidItemModelWrapper.Unbaked(
                        // Points to 'assets/examplemod/models/item/example_item_1.json'
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                ),
                new RangeSelectItemModel.Entry(
                    // When the count is two thirds of its current max stack size
                    0.66,
                    // Can be any unbaked model type
                    new CuboidItemModelWrapper.Unbaked(
                        // Points to 'assets/examplemod/models/item/example_item_2.json'
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                )
            ),
            // The fallback model to use if no threshold matches
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    // Points to 'assets/examplemod/models/item/example_item.json'
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

创建自己的 `RangeSelectItemModelProperty` 与其他基于 Codec 的 Registry Object 类似。创建实现 `RangeSelectItemModelProperty` 的类，创建用于 Encode 和 Decode 对象的 `MapCodec`，再通过[模组 Event Bus][modbus] 上的 `RegisterRangeSelectItemModelPropertyEvent` 将 Codec 注册到其 Registry。`RangeSelectItemModelProperty` 只包含一个 `get` 方法，它接收当前 `ItemStack`、Stack 所在 Level、持有 Stack 的 Entity 以及某个带 Seed 的值，返回由 Range Dispatch Model 解释的任意 Float。

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

// In some event handler class
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerRangeProperties(RegisterRangeSelectItemModelPropertyEvent event) {
    event.register(
        // The name to reference as the type
        Identifier.fromNamespaceAndPath("examplemod", "applied_enchantments"),
        // The map codec
        AppliedEnchantments.MAP_CODEC
    )
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:range_dispatch",

        // The `RangeSelectItemModelProperty` to use
        "property": "examplemod:applied_enchantments",
        // A scalar to multiply to the computed property value
        // If count was 0.3 and scale was 0.2, then the threshold checked would be 0.3*0.2=0.06
        "scale": 0.5,
        "fallback": {
            // The fallback model to use if no threshold matches
            // Can be any unbaked model type
            "type": "minecraft:model",
            // Points to 'assets/examplemod/models/item/example_item.json'
            "model": "examplemod:item/example_item"
        },

        // Entries with threshold information
        "entries": [
            {
                // When there is at least one enchantment present
                // Since 1 * the scale 0.5 = 0.5
                "threshold": 0.5,
                "model": {
                    // Can be any unbaked model type
                    "type": "minecraft:model",
                    // Points to 'assets/examplemod/models/item/example_item_1.json'
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                // When there are at least two enchantments present
                // Since 2 * the scale 0.5 = 1
                "threshold": 1,
                "model": {
                    // Can be any unbaked model type
                    "type": "minecraft:model",
                    // Points to 'assets/examplemod/models/item/example_item_2.json'
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
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new RangeSelectItemModel.Unbaked(
            new AppliedEnchantments(),
            // A scalar to multiply to the computed property value
            // If count was 0.3 and scale was 0.2, then the threshold checked would be 0.3*0.2=0.06
            0.5,
            // Entries with threshold information
            List.of(
                new RangeSelectItemModel.Entry(
                    // When there is at least one enchantment present
                    0.5,
                    // Can be any unbaked model type
                    new CuboidItemModelWrapper.Unbaked(
                        // Points to 'assets/examplemod/models/item/example_item_1.json'
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                ),
                new RangeSelectItemModel.Entry(
                    // When there are at least two enchantments present
                    1,
                    // Can be any unbaked model type
                    new CuboidItemModelWrapper.Unbaked(
                        // Points to 'assets/examplemod/models/item/example_item_2.json'
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                )
            ),
            // The fallback model to use if no threshold matches
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    // Points to 'assets/examplemod/models/item/example_item.json'
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

Select Model 与 Range Dispatch Model 类似，但它根据 `SelectItemModelProperty` 定义的某个值切换，就像针对 Enum 的 Switch 语句。所选 Model 是与 Switch Case 中的值完全匹配的 Property。可用的 `SelectItemModelProperty` 位于 `SelectItemModelProperties`。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:select",

        // The `SelectItemModelProperty` to use
        "property": "minecraft:display_context",
        "fallback": {
            // The fallback model to use if no case matches
            // Can be any unbaked model type
            "type": "minecraft:model",
            "model": "examplemod:item/example_item"
        },

        // Switch cases based on Selectable Property
        "cases": [
            {
                // When the display context is `ItemDisplayContext#GUI`
                "when": "gui",
                "model": {
                    // Can be any unbaked model type
                    "type": "minecraft:model",
                    // Points to 'assets/examplemod/models/item/example_item_1.json'
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                // When the display context is `ItemDisplayContext#FIRST_PERSON_RIGHT_HAND`
                "when": "firstperson_righthand",
                "model": {
                     // Can be any unbaked model type
                    "type": "minecraft:model",
                    // Points to 'assets/examplemod/models/item/example_item_2.json'
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
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SelectItemModel.Unbaked(
            new SelectItemModel.UnbakedSwitch(
                // The `SelectItemModelProperty` to use
                new DisplayContext(),
                // Switch cases based on selectable property
                List.of(
                    new SelectItemModel.SwitchCase(
                        // The list of cases to match for this model
                        List.of(ItemDisplayContext.GUI),
                        // Can be any unbaked model type
                        new CuboidItemModelWrapper.Unbaked(
                            // Points to 'assets/examplemod/models/item/example_item_1.json'
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    ),
                    new SelectItemModel.SwitchCase(
                        // The list of cases to match for this model
                        List.of(ItemDisplayContext.FIRST_PERSON_RIGHT_HAND),
                        // Can be any unbaked model type
                        new CuboidItemModelWrapper.Unbaked(
                            // Points to 'assets/examplemod/models/item/example_item_2.json'
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    )
                )
            ),
            // The fallback model to use if no case matches
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    // Points to 'assets/examplemod/models/item/example_item.json'
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

创建自己的 `SelectItemModelProperty` 与基于 Codec 的 Registry Object 类似。创建实现 `SelectItemModelProperty<T>` 的类、用于序列化和反序列化 Property 值的 `Codec`、用于 Encode 和 Decode 对象的 `MapCodec`，再通过[模组 Event Bus][modbus] 上的 `RegisterSelectItemModelPropertyEvent` 将 Codec 注册到其 Registry。`SelectItemModelProperty` 的泛型 `T` 表示进行切换的值。它只包含一个 `get` 方法，接收当前 `ItemStack`、Stack 所在 Level、持有 Stack 的 Entity、某个带 Seed 的值，以及 Item 的 Display Context，返回由 Select Model 解释的任意 `T`。

```java
// The select property class
public record StackRarity() implements SelectItemModelProperty<Rarity> {

    // The object to register that contains the relevant codecs
    public static final SelectItemModelProperty.Type<StackRarity, Rarity> TYPE = SelectItemModelProperty.Type.create(
        // The map codec for this property
        MapCodec.unit(new StackRarity()),
        // The codec for the object being selected
        // Used to serialize the case entries ("when": <property value>)
        Rarity.CODEC
    );

    @Nullable
    @Override
    public Rarity get(ItemStack stack, @Nullable ClientLevel level, @Nullable LivingEntity entity, int seed, ItemDisplayContext displayContext) {
        // When null, uses the fallback model
        return stack.get(DataComponents.RARITY);
    }

    @Override
    public SelectItemModelProperty.Type<StackRarity, Rarity> type() {
        return TYPE;
    }
}

// In some event handler class
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerSelectProperties(RegisterSelectItemModelPropertyEvent event) {
    event.register(
        // The name to reference as the type
        Identifier.fromNamespaceAndPath("examplemod", "rarity"),
        // The property type
        StackRarity.TYPE
    )
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:select",

        // The `SelectItemModelProperty` to use
        "property": "examplemod:rarity",
        "fallback": {
            // The fallback model to use if no case matches
            // Can be any unbaked model type
            "type": "minecraft:model",
            "model": "examplemod:item/example_item"
        },

        // Switch cases based on Selectable Property
        "cases": [
            {
                // When the rarity is `Rarity#UNCOMMON`
                "when": "uncommon",
                "model": {
                    // Can be any unbaked model type
                    "type": "minecraft:model",
                    // Points to 'assets/examplemod/models/item/example_item_1.json'
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                // When the rarity is `Rarity#RARE`
                "when": "rare",
                "model": {
                     // Can be any unbaked model type
                    "type": "minecraft:model",
                    // Points to 'assets/examplemod/models/item/example_item_2.json'
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
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SelectItemModel.Unbaked(
            new SelectItemModel.UnbakedSwitch(
                // The `SelectItemModelProperty` to use
                new StackRarity(),
                // Switch cases based on selectable property
                List.of(
                    new SelectItemModel.SwitchCase(
                        // The list of cases to match for this model
                        List.of(Rarity.UNCOMMON),
                        // Can be any unbaked model type
                        new CuboidItemModelWrapper.Unbaked(
                            // Points to 'assets/examplemod/models/item/example_item_1.json'
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    ),
                    new SelectItemModel.SwitchCase(
                        // The list of cases to match for this model
                        List.of(Rarity.RARE),
                        // Can be any unbaked model type
                        new CuboidItemModelWrapper.Unbaked(
                            // Points to 'assets/examplemod/models/item/example_item_2.json'
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    )
                )
            ),
            // The fallback model to use if no case matches
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    // Points to 'assets/examplemod/models/item/example_item.json'
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
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:condition",

        // The `ConditionalItemModelProperty` to use
        "property": "minecraft:damaged",

        // What the boolean outcome is
        "on_true": {
            // Can be any unbaked model type
            "type": "minecraft:model",
            // Points to 'assets/examplemod/models/item/example_item_1.json'
            "model": "examplemod:item/example_item_1"
            
        },
        "on_false": {
            // Can be any unbaked model type
            "type": "minecraft:model",
            // Points to 'assets/examplemod/models/item/example_item_2.json'
            "model": "examplemod:item/example_item_2"
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new ConditionalItemModel.Unbaked(
            // The property to check
            new Damaged(),
            // When the boolean is true
            new CuboidItemModelWrapper.Unbaked(
                // Points to 'assets/examplemod/models/item/example_item_1.json'
                Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                Optional.empty(),
                Collections.emptyList()
            ),
            // When the boolean is false
            new CuboidItemModelWrapper.Unbaked(
                // Points to 'assets/examplemod/models/item/example_item_2.json'
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

创建自己的 `ConditionalItemModelProperty` 与其他基于 Codec 的 Registry Object 类似。创建实现 `ConditionalItemModelProperty` 的类、用于 Encode 和 Decode 对象的 `MapCodec`，再通过[模组 Event Bus][modbus] 上的 `RegisterConditionalItemModelPropertyEvent` 将 Codec 注册到其 Registry。`RangeSelectItemModelProperty` 只包含一个 `get` 方法，接收当前 `ItemStack`、Stack 所在 Level、持有 Stack 的 Entity、某个带 Seed 的值，以及 Item 的 Display Context，返回由 Conditional Model（`on_true` 或 `on_false`）解释的任意 Boolean。

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

// In some event handler class
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerConditionalProperties(RegisterConditionalItemModelPropertyEvent event) {
    event.register(
        // The name to reference as the type
        Identifier.fromNamespaceAndPath("examplemod", "bar_visible"),
        // The map codec
        BarVisible.MAP_CODEC
    )
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:condition",

        // The `ConditionalItemModelProperty` to use
        "property": "examplemod:bar_visible",

        // What the boolean outcome is
        "on_true": {
            // Can be any unbaked model type
            "type": "minecraft:model",
            // Points to 'assets/examplemod/models/item/example_item_1.json'
            "model": "examplemod:item/example_item_1"
            
        },
        "on_false": {
            // Can be any unbaked model type
            "type": "minecraft:model",
            // Points to 'assets/examplemod/models/item/example_item_2.json'
            "model": "examplemod:item/example_item_2"
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new ConditionalItemModel.Unbaked(
            // The property to check
            new BarVisible(),
            // When the boolean is true
            new CuboidItemModelWrapper.Unbaked(
                // Points to 'assets/examplemod/models/item/example_item_1.json'
                Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                Optional.empty(),
                Collections.emptyList()
            ),
            // When the boolean is false
            new CuboidItemModelWrapper.Unbaked(
                // Points to 'assets/examplemod/models/item/example_item_2.json'
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
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:special",

        // The parent model to read the particle texture and display transformation from
        // Points to 'assets/minecraft/models/item/template_skull.json'
        "base": "minecraft:item/template_skull",
        "model": {
            // The special model renderer to use
            "type": "minecraft:head",

            // Properties defined by `SkullSpecialRenderer.Unbaked`
            // The type of the skull block
            "kind": "wither_skeleton",
            // The texture to use when rendering the head
            // Points to 'assets/examplemod/textures/entity/heads/skeleton_override.png'
            "texture": "examplemod:heads/skeleton_override",
            // The animation float used to animate the head model
            "animation": 0.5
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SpecialModelWrapper.Unbaked(
            // The parent model to read the particle texture and display transformation from
            // Points to 'assets/minecraft/models/item/template_skull.json'
            Identifier.fromNamespaceAndPath("minecraft", "item/template_skull"),
            // The special model renderer to use
            new SkullSpecialRenderer.Unbaked(
                // The type of the skull block
                SkullBlock.Types.WITHER_SKELETON,
                // The texture to use when rendering the head
                // Points to 'assets/examplemod/textures/entity/heads/skeleton_override.png'
                Optional.of(
                    Identifier.fromNamespaceAndPath("examplemod", "heads/skeleton_override")
                ),
                // The animation float used to animate the head model
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

:::note
如果不确定需要哪些数据，可以直接让它返回相应 `ItemStack`。如果完全不需要 Stack 数据，则可使用已经替你实现该方法的 `NoDataSpecialModelRenderer`。
:::

接下来是 `submit` 方法。它接收 `extractArgument` 的返回值、Pose Stack、用于提交所需功能的 Collector、Packed Light、Overlay Texture、Stack 是否具有 Foil（例如已附魔），以及 Outline Color。所有功能都应在此方法中提交。

```java
public record ExampleSpecialRenderer(SpriteGetter spriteGetter, Model.Simple model, SpriteId sprite) implements SpecialModelRenderer<Boolean> {

    @Nullable
    public Boolean extractArgument(ItemStack stack) {
        // Extract the data to be used
        return stack.isBarVisible();
    }

    // Submit the features of the model
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
            // Resolve resource location to absolute path
            Identifier textureLoc = this.texture.withPath(path -> "textures/entity/" + path + ".png");

            // Get the model and the sprites to render
            return new ExampleSpecialRenderer(ctx.sprites(), ...);
        }
    }
}
```

最后，把对象注册到所需位置。对于客户端 Item，通过[模组 Event Bus][modbus] 上的 `RegisterSpecialModelRendererEvent` 完成。如果 Special Renderer 还应作为 `BlockEntityRenderer` 的一部分使用，例如在类似 Item 的上下文中渲染（如 Enderman 手持 Block），则应通过[模组 Event Bus][modbus] 上的 `RegisterBlockModelsEvent` 注册 Block 的 `Unbaked` 版本。

```java
// In some event handler class
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerSpecialRenderers(RegisterSpecialModelRendererEvent event) {
    event.register(
        // The name to reference as the type
        Identifier.fromNamespaceAndPath("examplemod", "example_special"),
        // The map codec
        ExampleSpecialRenderer.Unbaked.MAP_CODEC
    );
}

// For rendering a block in an item-like context
// Assume some DeferredBlock<ExampleBlock> EXAMPLE_BLOCK
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerSpecialBlockRenderers(RegisterBlockModelsEvent event) {
    event.register(
        // The unbaked instance to use
        new SpecialBlockModelWrapper.Unbaked(
            new ExampleSpecialRenderer.Unbaked(Identifier.fromNamespaceAndPath("examplemod", "entity/example_special")),
            Optional.empty()
        ),
        // The block to render for
        EXAMPLE_BLOCK.get()
    );
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:special",

        // The parent model to read the particle texture and display transformation from
        // Points to 'assets/minecraft/models/item/template_skull.json'
        "base": "minecraft:item/template_skull",
        "model": {
            // The special model renderer to use
            "type": "examplemod:example_special",

            // Properties defined by `ExampleSpecialRenderer.Unbaked`
            // The texture to use
            // Points to 'assets/examplemod/textures/entity/example/example_texture.png'
            "texture": "examplemod:example/example_texture"
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SpecialModelWrapper.Unbaked(
            // The parent model to read the particle texture and display transformation from
            // Points to 'assets/minecraft/models/item/template_skull.json'
            Identifier.fromNamespaceAndPath("minecraft", "item/template_skull"),
            // The special model renderer to use
            new ExampleSpecialRenderer.Unbaked(
                // The texture to use
                // Points to 'assets/examplemod/textures/entity/example/example_texture.png'
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

:::note
要把 Fluid Tint 应用于流体纹理，相应 Item 必须附加 `Capabilities.FluidHandler.ITEM`。如果 Item 没有直接使用 `BucketItem`（也不是其子类型），就需要[为 Item 注册 Capability][capability]。
:::

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "neoforge:fluid_container",

        // The textures used to construct the container
        // These are in reference to the block atlas, so they are relative to the `textures` directory
        "textures": {
            // Sets the model particle sprite
            // If not set, uses the first texture that is not null:
            // - Fluid still texture
            // - Container base texture
            // - Container cover texture, if not used as a mask
            // Points to 'assets/minecraft/textures/item/bucket.png'
            "particle": "minecraft:item/bucket",
            // Sets the texture to use on the first layer, generally the container of the fluid
            // If not set, the layer will not be added
            // Points to 'assets/minecraft/textures/item/bucket.png'
            "base": "minecraft:item/bucket",
            // Sets the texture to use as the mask for the still fluid texture
            // Areas where the fluid is seen should be pure white
            // If not set or the fluid is empty, then the layer is not drawn
            // Points to 'assets/neoforge/textures/item/mask/bucket_fluid.png'
            "fluid": "neoforge:item/mask/bucket_fluid",
            // Sets the texture to use as either
            // - The overlay texture when 'cover_is_mask' is false
            // - The mask to apply to the base texture (should be pure white to see) when 'cover_is_mask' is true
            // If not set or no base texture is set when 'cover_is_mask' is true, then the layer is not drawn
            // Points to 'assets/neoforge/textures/item/mask/bucket_fluid_cover.png'
            "cover": "neoforge:item/mask/bucket_fluid_cover",
        },

        // When true, rotates the model 180 degrees for fluids whose density is negative or zero
        // Defaults to false
        "flip_gas": true,
        // When true, uses the cover texture as a mask for the base texture
        // Defaults to true
        "cover_is_mask": true,
        // When true, sets the lightmap of the fluid texture layer to its max value
        // for fluids whose light level is greater than zero
        // Defaults to true
        "apply_fluid_luminosity": false
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<ExampleFluidContainerItem> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new DynamicFluidContainerModel.Unbaked(
            // The textures used to construct the container
            // These are in reference to the block atlas, so they are relative to the `textures` directory
            new DynamicFluidContainerModel.Textures(
                // Sets the model particle sprite
                // If not set, uses the first texture that is not null:
                // - Fluid still texture
                // - Container base texture
                // - Container cover texture, if not used as a mask
                // Points to 'assets/minecraft/textures/item/bucket.png'
                Optional.of(Identifier.withDefaultNamespace("item/bucket")),
                // Sets the texture to use on the first layer, generally the container of the fluid
                // If not set, the layer will not be added
                // Points to 'assets/minecraft/textures/item/bucket.png'
                Optional.of(Identifier.withDefaultNamespace("item/bucket")),
                // Sets the texture to use as the mask for the still fluid texture
                // Areas where the fluid is seen should be pure white
                // If not set or the fluid is empty, then the layer is not rendered
                // Points to 'assets/neoforge/textures/item/mask/bucket_fluid.png'
                Optional.of(Identifier.fromNamespaceAndPath("neoforge", "item/mask/bucket_fluid")),
                // Sets the texture to use as either
                // - The overlay texture when 'cover_is_mask' is false
                // - The mask to apply to the base texture (should be pure white to see) when 'cover_is_mask' is true
                // If not set or no base texture is set when 'cover_is_mask' is true, then the layer is not rendered
                // Points to 'assets/neoforge/textures/item/mask/bucket_fluid_cover.png'
                Optional.of(Identifier.fromNamespaceAndPath("neoforge", "item/mask/bucket_fluid_cover"))
            ),
            // When true, rotates the model 180 degrees
            // Defaults to false
            true,
            // When true, uses the cover texture as a mask for the base texture
            // Defaults to true
            true,
            // When true, sets the lightmap of the fluid texture layer to its max value
            // Defaults to true
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

:::note
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

    // Update the render state
    @Override
    public void update(ItemStackRenderState state, ItemStack stack, ItemModelResolver resolver, ItemDisplayContext displayContext, @Nullable ClientLevel level, @Nullable ItemOwner owner, int seed) {
        // Set the identity used by the model
        state.appendModelIdentityElement(this);

        // Create a new layer
        ItemStackRenderState.LayerRenderState layerState = state.newLayer();

        // Sets the foil to use
        if (stack.hasFoil()) {
            layerState.setFoilType(ItemStackRenderState.FoilType.STANDARD);
            state.appendModelIdentityElement(ItemStackRenderState.FoilType.STANDARD);
        }


        // Apply the tint sources
        int tintSize = this.tints.size();
        int[] tintLayers = layerState.prepareTintLayers(tintSize);

        for (int idx = 0; idx < tintSize; idx++) {
            int tintColor = this.tints.get(idx).calculate(stack, level, owner.asLivingEntity());
            tintLayers[idx] = tintColor;
            state.appendModelIdentityElement(tintColor);
        }

        // Computes the bounds of the model
        // Used for GUI render bounds (when oversized) and item entity bobbing
        layerState.setExtents(CuboidItemModelWrapper.computeExtents(this.quads.getAll()));

        // Set the local transforms to apply for the client item
        layerState.setLocalTransform(this.transformation);

        // Set other common model properties
        this.properties.applyToLayer(layerState, displayContext);

        // Adds the quads to submit
        layerState.prepareQuadList().addAll(this.quads.getAll());

        // Set animated if it has the associated material flag
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
        // The map codec to register
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
            // Mark all dependencies for this item model
            resolver.markDependency(this.model);
        }

        @Override
        public ItemModel bake(ItemModel.BakingContext context, Matrix4fc parentTransform) {
            // Get the baked quads and return
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

随后，通过[模组 Event Bus][modbus] 上的 `RegisterItemModelsEvent` 注册 Map Codec。

```java
// In some event handler class
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerItemModels(RegisterItemModelsEvent event) {
    event.register(
        // The name to reference as the type
        Identifier.fromNamespaceAndPath("examplemod", "render_type"),
        // The map codec
        ExampleModelWrapper.Unbaked.MAP_CODEC
    )
}
```

最后，可以在 JSON 中使用 `ItemModel`，或将其作为 Datagen 流程的一部分。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// For some item 'examplemod:example_item'
// JSON at 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "examplemod:render_type",
        // Points to 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // Any tints to apply to the model texture
        "tints": []
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
// Assume there is some DeferredItem<Item> EXAMPLE_ITEM
// Within an extended ModelProvider
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new ExampleModelWrapper.Unbaked(
            // Points to 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            // Any tints to apply to the model texture
            List.of(),
            // The transformations to apply after the model JSON transforms
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
