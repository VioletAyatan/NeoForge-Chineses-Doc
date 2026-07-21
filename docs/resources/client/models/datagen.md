# Model Datagen

与大多数 JSON 数据一样，Block 和 Item Model 及其必需的 Blockstate 文件和[客户端 Item][citems] 都可以通过 [Datagen][datagen] 生成。全部工作由原版 `ModelProvider` 处理，NeoForge 则通过 `ExtendedModelTemplateBuilder` 提供扩展。由于 Block Model 和 Item Model 的 Model JSON 本身相似，Datagen 代码也相对相似。

## Model Template

每个 Model 都始于 `ModelTemplate`。对于原版，`ModelTemplate` 作为某个预生成 Model 文件的 Parent，定义 Parent Model、必需的 Texture Slot 和要应用的文件后缀。对于 NeoForge，`ExtendedModelTemplate` 通过 `ExtendedModelTemplateBuilder` 构造，使用户能够生成 Model 的基础 Element 和 Face，并使用 NeoForge 添加的所有功能。

可以使用 `ModelTemplates` 中的某个方法或调用构造器创建 `ModelTemplate`。构造器接收相对于 `models` 目录的可选 Parent Model `Identifier`、要附加到文件路径末尾的可选 String（例如按下状态的 Button 使用 `_pressed` 后缀），以及必须定义、否则 Datagen 会崩溃的 `TextureSlot` varargs。`TextureSlot` 只是定义 `textures` Map 中纹理“键”的 String。每个键还可拥有一个 Parent `TextureSlot`，当具体 Slot 未指定纹理时会解析到 Parent。例如，`TextureSlot#PARTICLE` 会先查找已定义的 `particle` 纹理，然后检查已定义的 `texture` 值，最后检查 `all`。如果 Slot 及其 Parent 均未定义，数据生成期间会崩溃。

```java
// Assumes there is a texture referenced as '#base'
// Can be resolved by either specifying 'base' or 'all'
public static final TextureSlot BASE = TextureSlot.create("base", TextureSlot.ALL);

// Assume there exists some model 'examplemod:block/example_template'
public static final ModelTemplate EXAMPLE_TEMPLATE = new ModelTemplate(
    // The parent model location
    Optional.of(
        ModelLocationUtils.decorateBlockModelLocation("examplemod:example_template")
    ),
    // The suffix to apply to the end of any model that uses this template
    Optional.of("_example"),
    // All texture slots that must be defined
    // Should be as specific as possible based on what's undefined in the parent model
    TextureSlot.PARTICLE,
    BASE
);
```

NeoForge 添加的 `ExtendedModelTemplate` 可以通过 `ExtendedModelTemplateBuilder#builder` 构造，也可以对现有原版 Template 调用 `ModelTemplate#extend` 构造。随后可用 `#build` 将 Builder 解析为 Template。Builder 方法可以完整控制 Model JSON 的构造：

| 方法                                           | 效果                                                                                                                                                                                                                                                                                                                                                  |
|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `#parent(Identifier parent)`                                         | 设置相对于 `models` 目录的 Parent Model 位置。 |
| `#suffix(String suffix)`                                                   | 将 String 附加到 Model 文件路径末尾。 |
| `#requiredTextureSlot(TextureSlot slot)`                                   | 添加生成时必须在 `TextureMapping` 中定义的 Texture Slot。 |
| `transform(ItemDisplayContext type, Consumer<TransformVecBuilder> action)` | 添加由 Consumer 配置的 `TransformVecBuilder`，用于设置 Model 的 `display`。 |
| `#ambientOcclusion(boolean ambientOcclusion)`                              | 设置是否使用 [Ambient Occlusion][ao]。                                                                                                                                                                                                                                                                                                     |
| `#guiLight(UnbakedModel.GuiLight light)`                                   | 设置 GUI Light，可以是 `GuiLight.FRONT` 或 `GuiLight.SIDE`。                                                                                                                                                                                                                                                                                         |
| `#element(Consumer<ElementBuilder> action)`                                | 添加一个由 Consumer 配置的新 `ElementBuilder`（相当于向 Model 添加新 [Element][elements]）。                                                                                                                                                                                                 |                                                                                                                                                                                                                                                            |
| `#customLoader(Supplier customLoaderFactory, Consumer action)`            | 使用给定 Factory，让此 Model 使用[自定义 Loader][custommodelloader]，以及由 Consumer 配置的自定义 Loader Builder。这会改变 Builder 类型，因此根据 Loader 实现可能使用不同方法。NeoForge 默认提供多个自定义 Loader；更多信息（包括 Datagen）参见链接文章。 |
| `#rootTransforms(Consumer<RootTransformsBuilder> action)`                  | 通过 Consumer 配置在 Item Display Transform 和 BlockState Transform 前应用的 Model Transform。 |

:::tip
虽然可以通过 Datagen 创建复杂精细的 Model，但更建议使用 [Blockbench][blockbench] 等建模软件创建复杂 Model，再直接使用导出的 Model，或把它作为其他 Model 的 Parent。
:::

### 创建 Model 实例

有了 `ModelTemplate` 后，可以调用某个 `ModelTemplate#create*` 方法生成 Model 本身。虽然各 create 方法接收不同参数，但本质上都接收表示文件名的 `Identifier`、将 `TextureSlot` 映射到相对于 `textures` 目录的某个 `Identifier` 的 `TextureMapping`，以及作为 `BiConsumer<Identifier, ModelInstance>` 的 Model Output。随后，该方法实际创建用于生成 Model 的 `JsonObject`；如果提供任何重复项，则抛出错误。

:::note
调用基础 `create` 方法不会应用已保存的后缀。只有接收 Block 或 Item 的 `create*` 方法才会应用。
:::

```java
// Given some BiConsumer<Identifier, ModelInstance> modelOutput
// Assume there is a DeferredBlock<Block> EXAMPLE_BLOCK
EXAMPLE_TEMPLATE.create(
    // Creates the model at 'assets/minecraft/models/block/example_block_example.json'
    EXAMPLE_BLOCK.get(),
    // Define textures in slots
    new TextureMapping()
        // "particle": "examplemod:item/example_block"
        .put(TextureSlot.PARTICLE, TextureMapping.getBlockTexture(EXAMPLE_BLOCK.get()))
        // "base": "examplemod:item/example_block_base"
        .put(TextureSlot.BASE, TextureMapping.getBlockTexture(EXAMPLE_BLOCK.get(), "_base")),
    // The consumer of the generated model json
    modelOutput
);
```

有时，生成的 Model 使用相似的 Model Template 和纹理命名模式（例如普通 Block 的纹理就是 Block 名称）。在这种情况下，可以创建 `TexturedModel.Provider` 来消除重复。该 Provider 实际上是一个函数式接口，接收某个 `Block` 并返回用于生成 Model 的 `TexturedModel`（`ModelTemplate`/`TextureMapping` 对）。接口通过 `TexturedModel#createDefault` 构造；该方法接收将 `Block` 映射到 `TextureMapping` 的函数以及要使用的 `ModelTemplate`。随后，以要生成的 `Block` 调用 `TexturedModel.Provider#create` 即可生成 Model。

```java
public static final TexturedModel.Provider EXAMPLE_TEMPLATE_PROVIDER = TexturedModel.createDefault(
    // Block to texture mapping
    block -> new TextureMapping()
        .put(TextureSlot.PARTICLE, TextureMapping.getBlockTexture(block))
        .put(TextureSlot.BASE, TextureMapping.getBlockTexture(block, "_base")),
    // The template to generate from
    EXAMPLE_TEMPLATE
);

// Given some BiConsumer<Identifier, ModelInstance> modelOutput
// Assume there is a DeferredBlock<Block> EXAMPLE_BLOCK
EXAMPLE_TEMPLATE_PROVIDER.create(
    // Creates the model at 'assets/minecraft/models/block/example_block_example.json'
    EXAMPLE_BLOCK.get(),
    // The consumer of the generated model json
    modelOutput
);
```

## `ModelProvider`

Block 和 Item Model Datagen 分别使用 `registerModels` 提供的 Generator：`BlockModelGenerators` 和 `ItemModelGenerators`。每个 Generator 都会生成 Model JSON 以及其他所有必需文件（Blockstate、客户端 Item）。每个 Generator 都包含多种 Helper 方法，可将全部文件的构造批量合并到单个易用方法中。例如，使用 `ItemModelGenerators#generateFlatItem` 和 `ModelTemplates#FLAT_ITEM` 创建基础 `item/generated` Model，或使用 `BlockModelGenerators#createTrivialCube` 创建基础 `block/cube_all` Model。

```java
public class ExampleModelProvider extends ModelProvider {

    public ExampleModelProvider(PackOutput output) {
        // Replace "examplemod" with your own mod id.
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // Generate models and associated files here
    }
}
```

与所有 Data Provider 一样，不要忘记把 Provider 注册到事件：

```java
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(ExampleModelProvider::new);
}
```

### Block Model Datagen

要实际生成 Blockstate 和 Block Model 文件，可以在 `ModelProvider#registerModels` 中调用 `BlockModelGenerators` 的众多 public 方法之一，也可以自行把生成文件传给 Blockstate 文件的 `blockStateOutput`、非简单客户端 Item 的 `itemModelOutput`，以及 Model JSON 的 `modelOutput`。

:::note
如果为 Block 注册了关联 `BlockItem`，但没有生成客户端 Item，`ModelProvider` 会自动生成客户端 Item，并使用默认 Block Model 位置 `assets/<namespace>/models/block/<path>.json` 作为其 Model。
:::

```java
public class ExampleModelProvider extends ModelProvider {

    public ExampleModelProvider(PackOutput output) {
        // Replace "examplemod" with your own mod id.
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // Placeholders, their usages should be replaced with real values. See above for how to use the model builder,
        // and below for the helpers the model builder offers.
        Block block = MyBlocksClass.EXAMPLE_BLOCK.get();

        // Create a simple block model with the same texture on each side.
        // The texture must be located at assets/<namespace>/textures/block/<path>.png, where
        // <namespace> and <path> are the block's registry name's namespace and path, respectively.
        // Used by the majority of (full) blocks, such as planks, cobblestone or bricks.
        blockModels.createTrivialCube(block);

        // Overload that accepts a `TexturedModel.Provider` to use.
        blockModels.createTrivialBlock(block, EXAMPLE_TEMPLATE_PROVIDER);

        // Block items have a model generated automatically
        // But let's assume you want to generate a different item, such as a flat item
        blockModels.registerSimpleFlatItemModel(block);

        // Adds a log block model. Requires two textures at assets/<namespace>/textures/block/<path>.png and
        // assets/<namespace>/textures/block/<path>_top.png, referencing the side and top texture, respectively.
        // Note that the block input here is limited to RotatedPillarBlock, which is the class vanilla logs use.
        blockModels.woodProvider(block).log(block);
        
        // Like WoodProvider#logWithHorizontal. Used by quartz pillars and similar blocks.
        blockModels.createRotatedPillarWithHorizontalVariant(block, TexturedModel.COLUMN_ALT, TexturedModel.COLUMN_HORIZONTAL_ALT);

        // Using the `ExtendedModelTemplate` to specify the render type to use.
        blockModels.createRotatedPillarWithHorizontalVariant(block,
            TexturedModel.COLUMN_ALT.updateTemplate(template ->
                template.extend().renderType("minecraft:cutout").build()
            ),
            TexturedModel.COLUMN_HORIZONTAL_ALT.updateTemplate(template ->
                template.extend().renderType(this.mcLocation("cutout_mipped")).build()
            )
        );

        // Specifies a horizontally-rotatable block model with a side texture, a front texture, and a top texture.
        // The bottom will use the side texture as well. If you don't need the front or top texture,
        // just pass in the side texture twice. Used by e.g. furnaces and similar blocks.
        blockModels.createHorizontallyRotatedBlock(
            block,
            TexturedModel.Provider.ORIENTABLE_ONLY_TOP.updateTexture(mapping ->
                mapping.put(TextureSlot.SIDE, this.modLocation("block/example_texture_side"))
                .put(TextureSlot.FRONT, this.modLocation("block/example_texture_front"))
                .put(TextureSlot.TOP, this.modLocation("block/example_texture_top"))
            )
        );

        // Specifies a horizontally-rotatable block model that is attached to a face, e.g. for buttons.
        // Accounts for placing the block on the ground and on the ceiling, and rotates them accordingly.
        blockModels.familyWithExistingFullBlock(block).button(block);

        // Create a model to use for blockstatefiles
        Identifier modelLoc = TexturedModel.CUBE.create(block, blockModels.modelOutput);

        // Create a common variant to transform
        Variant variant = new Variant(modelLoc);

        // Basic single variant model
        blockModels.blockStateOutput.accept(
            MultiVariantGenerator.dispatch(
                block,
                new MultiVariant(
                    WeightedList.of(
                        new Weighted<>(
                            // Set model
                            variant
                                // Set rotations around the x and y axes
                                .with(VariantMutator.X_ROT.withValue(Quadrant.R90))
                                .with(VariantMutator.Y_ROT.withValue(Quadrant.R180))
                                // Set a uvlock
                                .with(VariantMutator.UV_LOCK.withValue(true)),
                            // Set a weight
                            5
                        )
                    )
                )
            )
        );

        // Add one or multiple models based on the block state properties
        blockModels.blockStateOutput.accept(
            MultiVariantGenerator.dispatch(
                block,
                // Create the basic multi-variant
                BlockModelGenerators.variant(variant)
            ).with(
                // Apply a property dispatch
                // Will mutate the variant based on the provided mutators
                PropertyDispatch.modify(BlockStateProperties.AXIS)
                    .select(Direction.Axis.Y, BlockModelGenerators.NOP)
                    .select(Direction.Axis.Z, BlockModelGenerators.X_ROT_90)
                    .select(Direction.Axis.X, BlockModelGenerators.X_ROT_90.then(BlockModelGenerators.Y_ROT_90))
            )
        );

        // Generate a multipart
        blockModels.blockStateOutput.accept(
            MultiPartGenerator.multiPart(block)
                // Provide the base model
                .with(BlockModelGenerators.variant(variant))
                // Add conditions for variant to appear
                .with(
                    // Add conditions to apply
                    new CombinedCondition(
                        CombinedCondition.Operation.OR,
                        List.of(
                            // Where at least one of the conditions are true
                            BlockModelGenerators.condition().term(BlockStateProperties.FACING, Direction.NORTH, Direction.SOUTH)
                            // Can nest as many conditions or groups as necessary
                            new CombinedCondition(
                                CombinedCondition.Operation.AND,
                                List.of(
                                    BlockModelGenerators.condition().term(BlockStateProperties.FACING, Direction.NORTH)
                                )
                            )
                        )
                    ),
                    // Supply variant to mutate
                    BlockModelGenerators.variant(variant)
                )
        );
    }
}
```

## Item Model Datagen

生成 Item Model 要简单得多，这主要得益于 `ItemModelGenerators` 中的大量 Helper 方法，以及用于 Property 信息的 `ItemModelUtils`。与上文类似，可以在 `ModelProvider#registerModels` 中调用 `ItemModelGenerators` 的众多 public 方法之一，也可以自行把生成文件传给非简单客户端 Item 的 `itemModelOutput` 和 Model JSON 的 `modelOutput`。

```java
public class ExampleModelProvider extends ModelProvider {

    public ExampleModelProvider(PackOutput output) {
        // Replace "examplemod" with your own mod id.
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // The most common item
        // item/generated with the layer0 texture as the item name
        itemModels.generateFlatItem(MyItemsClass.EXAMPLE_ITEM.get(), ModelTemplates.FLAT_ITEM);

        // A bow-like item
        ItemModel.Unbaked bow = ItemModelUtils.plainModel(ModelLocationUtils.getModelLocation(MyItemsClass.EXAMPLE_ITEM.get()));
        ItemModel.Unbaked pullingBow0 = ItemModelUtils.plainModel(this.createFlatItemModel(MyItemsClass.EXAMPLE_ITEM.get(), "_pulling_0", ModelTemplates.BOW));
        ItemModel.Unbaked pullingBow1 = ItemModelUtils.plainModel(this.createFlatItemModel(MyItemsClass.EXAMPLE_ITEM.get(), "_pulling_1", ModelTemplates.BOW));
        ItemModel.Unbaked pullingBow2 = ItemModelUtils.plainModel(this.createFlatItemModel(MyItemsClass.EXAMPLE_ITEM.get(), "_pulling_2", ModelTemplates.BOW));
        this.itemModelOutput.accept(
            MyItemsClass.EXAMPLE_ITEM.get(),
            // Conditional model for item
            ItemModelUtils.conditional(
                // Checks if item is being used
                ItemModelUtils.isUsingItem(),
                // When true, select model based on use duration
                ItemModelUtils.rangeSelect(
                    new UseDuration(false),
                    // Scalar to apply to the thresholds
                    0.05F,
                    pullingBow0,
                    // Threshold when 0.65
                    ItemModelUtils.override(pullingBow1, 0.65F),
                    // Threshold when 0.9
                    ItemModelUtils.override(pullingBow2, 0.9F)
                ),
                // When false, use the base bow model
                bow
            ),
            // Some settings to use during the rendering process
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
}
```

[ao]: https://en.wikipedia.org/wiki/Ambient_occlusion
[blockbench]: https://www.blockbench.net
[citems]: items.md
[custommodelloader]: modelloaders.md#datagen
[datagen]: ../../index.md#data-generation
[elements]: index.md#elements

