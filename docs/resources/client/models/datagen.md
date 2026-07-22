# 模型数据生成（Model Datagen）

与大多数 JSON 数据一样，Block 和 Item Model 及其必需的 Blockstate 文件和[客户端 Item][citems] 都可以通过 [Datagen][datagen] 生成。全部工作由原版 `ModelProvider` 处理，NeoForge 则通过 `ExtendedModelTemplateBuilder` 提供扩展。由于 Block Model 和 Item Model 的 Model JSON 本身相似，Datagen 代码也相对相似。

## Model Template

每个 Model 都始于 `ModelTemplate`。对于原版，`ModelTemplate` 作为某个预生成 Model 文件的 Parent，定义 Parent Model、必需的 Texture Slot 和要应用的文件后缀。对于 NeoForge，`ExtendedModelTemplate` 通过 `ExtendedModelTemplateBuilder` 构造，使用户能够生成 Model 的基础 Element 和 Face，并使用 NeoForge 添加的所有功能。

可以使用 `ModelTemplates` 中的某个方法或调用构造器创建 `ModelTemplate`。构造器接收相对于 `models` 目录的可选 Parent Model `Identifier`、要附加到文件路径末尾的可选 String（例如按下状态的 Button 使用 `_pressed` 后缀），以及必须定义、否则 Datagen 会崩溃的 `TextureSlot` varargs。`TextureSlot` 只是定义 `textures` Map 中纹理“键”的 String。每个键还可拥有一个 Parent `TextureSlot`，当具体 Slot 未指定纹理时会解析到 Parent。例如，`TextureSlot#PARTICLE` 会先查找已定义的 `particle` 纹理，然后检查已定义的 `texture` 值，最后检查 `all`。如果 Slot 及其 Parent 均未定义，数据生成期间会崩溃。

```java
// 假设有一个引用为 '#base' 的纹理
// 可以通过指定 'base' 或 'all' 来解析
public static final TextureSlot BASE = TextureSlot.create("base", TextureSlot.ALL);

// 假设存在某个模型 'examplemod:block/example_template'
public static final ModelTemplate EXAMPLE_TEMPLATE = new ModelTemplate(
    // 父模型位置
    Optional.of(
        ModelLocationUtils.decorateBlockModelLocation("examplemod:example_template")
    ),
    // 适用于任何使用此模板的模型末尾的后缀
    Optional.of("_example"),
    // 必须定义的所有纹理槽
    // 应根据父模型中未定义的内容尽可能具体
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

:::info
调用基础 `create` 方法不会应用已保存的后缀。只有接收 Block 或 Item 的 `create*` 方法才会应用。
:::

```java
// 给定 BiConsumer<Identifier, ModelInstance> modelOutput
// 假设存在 DeferredBlock<Block> EXAMPLE_BLOCK
EXAMPLE_TEMPLATE.create(
    // 在 'assets/minecraft/models/block/example_block_example.json' 创建模型
    EXAMPLE_BLOCK.get(),
    // 在槽中定义纹理
    new TextureMapping()
        // "particle": "examplemod:item/example_block"
        .put(TextureSlot.PARTICLE, TextureMapping.getBlockTexture(EXAMPLE_BLOCK.get()))
        // "base": "examplemod:item/example_block_base"
        .put(TextureSlot.BASE, TextureMapping.getBlockTexture(EXAMPLE_BLOCK.get(), "_base")),
    // 生成模型json的消费者
    modelOutput
);
```

有时，生成的 Model 使用相似的 Model Template 和纹理命名模式（例如普通 Block 的纹理就是 Block 名称）。在这种情况下，可以创建 `TexturedModel.Provider` 来消除重复。该 Provider 实际上是一个函数式接口，接收某个 `Block` 并返回用于生成 Model 的 `TexturedModel`（`ModelTemplate`/`TextureMapping` 对）。接口通过 `TexturedModel#createDefault` 构造；该方法接收将 `Block` 映射到 `TextureMapping` 的函数以及要使用的 `ModelTemplate`。随后，以要生成的 `Block` 调用 `TexturedModel.Provider#create` 即可生成 Model。

```java
public static final TexturedModel.Provider EXAMPLE_TEMPLATE_PROVIDER = TexturedModel.createDefault(
    // 方块到纹理的映射
    block -> new TextureMapping()
        .put(TextureSlot.PARTICLE, TextureMapping.getBlockTexture(block))
        .put(TextureSlot.BASE, TextureMapping.getBlockTexture(block, "_base")),
    // 生成的模板
    EXAMPLE_TEMPLATE
);

// 给定 BiConsumer<Identifier, ModelInstance> modelOutput
// 假设存在 DeferredBlock<Block> EXAMPLE_BLOCK
EXAMPLE_TEMPLATE_PROVIDER.create(
    // 在 'assets/minecraft/models/block/example_block_example.json' 创建模型
    EXAMPLE_BLOCK.get(),
    // 生成模型json的消费者
    modelOutput
);
```

## `ModelProvider`

Block 和 Item Model Datagen 分别使用 `registerModels` 提供的 Generator：`BlockModelGenerators` 和 `ItemModelGenerators`。每个 Generator 都会生成 Model JSON 以及其他所有必需文件（Blockstate、客户端 Item）。每个 Generator 都包含多种 Helper 方法，可将全部文件的构造批量合并到单个易用方法中。例如，使用 `ItemModelGenerators#generateFlatItem` 和 `ModelTemplates#FLAT_ITEM` 创建基础 `item/generated` Model，或使用 `BlockModelGenerators#createTrivialCube` 创建基础 `block/cube_all` Model。

```java
public class ExampleModelProvider extends ModelProvider {

    public ExampleModelProvider(PackOutput output) {
        // 将 "examplemod" 替换为你自己的模组 ID。
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // 在此生成模型和关联文件
    }
}
```

与所有 Data Provider 一样，不要忘记把 Provider 注册到事件：

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(ExampleModelProvider::new);
}
```

### Block Model Datagen

要实际生成 Blockstate 和 Block Model 文件，可以在 `ModelProvider#registerModels` 中调用 `BlockModelGenerators` 的众多 public 方法之一，也可以自行把生成文件传给 Blockstate 文件的 `blockStateOutput`、非简单客户端 Item 的 `itemModelOutput`，以及 Model JSON 的 `modelOutput`。

:::info
如果为 Block 注册了关联 `BlockItem`，但没有生成客户端 Item，`ModelProvider` 会自动生成客户端 Item，并使用默认 Block Model 位置 `assets/<namespace>/models/block/<path>.json` 作为其 Model。
:::

```java
public class ExampleModelProvider extends ModelProvider {

    public ExampleModelProvider(PackOutput output) {
        // 将 "examplemod" 替换为你自己的模组 ID。
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // 占位符，其用法应替换为实际值。请参阅上文了解如何使用模型 builder，
        // 及以下模型 builder 提供的帮助程序。
        Block block = MyBlocksClass.EXAMPLE_BLOCK.get();

        // 创建一个简单的方块模型，每侧具有相同的纹理。
        // 纹理必须位于 assets/<namespace>/textures/block/<path>.png，其中
        // <namespace> 和 <path> 分别是方块注册名的命名空间与路径。
        // 用于大多数完整方块，例如木板、圆石或砖块。
        blockModels.createTrivialCube(block);

        // 接受使用 `TexturedModel.Provider` 的重载。
        blockModels.createTrivialBlock(block, EXAMPLE_TEMPLATE_PROVIDER);

        // 方块物品的模型会自动生成
        // 但是我们假设你想要生成不同的物品，例如扁平物品
        blockModels.registerSimpleFlatItemModel(block);

        // 添加原木方块模型。需要位于 assets/<namespace>/textures/block/<path>.png 和
        // assets/<namespace>/textures/block/<path>_top.png, referencing the side and top texture, respectively.
        // 请注意，此处的方块输入仅限于 RotatedPillarBlock，这是普通日志使用的类。
        blockModels.woodProvider(block).log(block);
        
        // 与 WoodProvider#logWithHorizontal 类似。用于石英柱和类似方块。
        blockModels.createRotatedPillarWithHorizontalVariant(block, TexturedModel.COLUMN_ALT, TexturedModel.COLUMN_HORIZONTAL_ALT);

        // 使用 `ExtendedModelTemplate` 指定要使用的渲染类型。
        blockModels.createRotatedPillarWithHorizontalVariant(block,
            TexturedModel.COLUMN_ALT.updateTemplate(template ->
                template.extend().renderType("minecraft:cutout").build()
            ),
            TexturedModel.COLUMN_HORIZONTAL_ALT.updateTemplate(template ->
                template.extend().renderType(this.mcLocation("cutout_mipped")).build()
            )
        );

        // 指定具有侧面纹理、正面纹理和顶部纹理的水平旋转方块模型。
        // 底部也将使用侧面纹理。如果不需要正面或顶部纹理，
        // 只需传入侧面纹理两次。由例如使用。熔炉和类似的方块。
        blockModels.createHorizontallyRotatedBlock(
            block,
            TexturedModel.Provider.ORIENTABLE_ONLY_TOP.updateTexture(mapping ->
                mapping.put(TextureSlot.SIDE, this.modLocation("block/example_texture_side"))
                .put(TextureSlot.FRONT, this.modLocation("block/example_texture_front"))
                .put(TextureSlot.TOP, this.modLocation("block/example_texture_top"))
            )
        );

        // 指定附加到面例如的水平旋转方块模型。对于按钮。
        // 考虑将方块放置在地面和天花板上，并相应地旋转它们。
        blockModels.familyWithExistingFullBlock(block).button(block);

        // 创建用于块状态文件的模型
        Identifier modelLoc = TexturedModel.CUBE.create(block, blockModels.modelOutput);

        // 创建通用变体进行变换
        Variant variant = new Variant(modelLoc);

        // 基本单一变体模型
        blockModels.blockStateOutput.accept(
            MultiVariantGenerator.dispatch(
                block,
                new MultiVariant(
                    WeightedList.of(
                        new Weighted<>(
                            // 设置模型
                            variant
                                // 设置绕 x 轴和 y 轴旋转
                                .with(VariantMutator.X_ROT.withValue(Quadrant.R90))
                                .with(VariantMutator.Y_ROT.withValue(Quadrant.R180))
                                // 设置 uvlock
                                .with(VariantMutator.UV_LOCK.withValue(true)),
                            // 设置重量
                            5
                        )
                    )
                )
            )
        );

        // 根据方块状态 property 添加一个或多个模型
        blockModels.blockStateOutput.accept(
            MultiVariantGenerator.dispatch(
                block,
                // 创建基本多变体
                BlockModelGenerators.variant(variant)
            ).with(
                // 申请物业调度
                // 将根据提供的变异器对变体进行变异
                PropertyDispatch.modify(BlockStateProperties.AXIS)
                    .select(Direction.Axis.Y, BlockModelGenerators.NOP)
                    .select(Direction.Axis.Z, BlockModelGenerators.X_ROT_90)
                    .select(Direction.Axis.X, BlockModelGenerators.X_ROT_90.then(BlockModelGenerators.Y_ROT_90))
            )
        );

        // 生成多部分
        blockModels.blockStateOutput.accept(
            MultiPartGenerator.multiPart(block)
                // 提供基础模型
                .with(BlockModelGenerators.variant(variant))
                // 添加变体出现的条件
                .with(
                    // 添加申请条件
                    new CombinedCondition(
                        CombinedCondition.Operation.OR,
                        List.of(
                            // 其中至少一个条件为 true
                            BlockModelGenerators.condition().term(BlockStateProperties.FACING, Direction.NORTH, Direction.SOUTH)
                            // 可以根据需要嵌套任意多个条件或组
                            new CombinedCondition(
                                CombinedCondition.Operation.AND,
                                List.of(
                                    BlockModelGenerators.condition().term(BlockStateProperties.FACING, Direction.NORTH)
                                )
                            )
                        )
                    ),
                    // 提供变异变体
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
        // 将 "examplemod" 替换为你自己的模组 ID。
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // 最常见的物品
        // item/generated with the layer0 texture as the item name
        itemModels.generateFlatItem(MyItemsClass.EXAMPLE_ITEM.get(), ModelTemplates.FLAT_ITEM);

        // 弓状物品
        ItemModel.Unbaked bow = ItemModelUtils.plainModel(ModelLocationUtils.getModelLocation(MyItemsClass.EXAMPLE_ITEM.get()));
        ItemModel.Unbaked pullingBow0 = ItemModelUtils.plainModel(this.createFlatItemModel(MyItemsClass.EXAMPLE_ITEM.get(), "_pulling_0", ModelTemplates.BOW));
        ItemModel.Unbaked pullingBow1 = ItemModelUtils.plainModel(this.createFlatItemModel(MyItemsClass.EXAMPLE_ITEM.get(), "_pulling_1", ModelTemplates.BOW));
        ItemModel.Unbaked pullingBow2 = ItemModelUtils.plainModel(this.createFlatItemModel(MyItemsClass.EXAMPLE_ITEM.get(), "_pulling_2", ModelTemplates.BOW));
        this.itemModelOutput.accept(
            MyItemsClass.EXAMPLE_ITEM.get(),
            // 物品的条件模型
            ItemModelUtils.conditional(
                // 检查物品是否正在使用
                ItemModelUtils.isUsingItem(),
                // 为 true 时，根据使用时长选择模型
                ItemModelUtils.rangeSelect(
                    new UseDuration(false),
                    // 应用于阈值的标量
                    0.05F,
                    pullingBow0,
                    // 0.65时的阈值
                    ItemModelUtils.override(pullingBow1, 0.65F),
                    // 0.9时的阈值
                    ItemModelUtils.override(pullingBow2, 0.9F)
                ),
                // 当false 时，使用基础弓模型
                bow
            ),
            // 渲染过程中使用的一些设置
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
}
```

[ao]: https://en.wikipedia.org/wiki/Ambient_occlusion
[blockbench]: https://www.blockbench.net
[citems]: items.md
[custommodelloader]: modelloaders.md#datagen
[datagen]: ../../index.md#data-generation
[elements]: index.md#elements

