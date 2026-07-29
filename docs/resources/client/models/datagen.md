# 模型数据生成（Model Datagen）

与大多数 JSON 数据一样，方块和物品模型及其必需的 blockstate 文件和[客户端物品][citems]都可以通过[数据生成][datagen]生成。全部工作由原版 `ModelProvider` 处理，NeoForge 则通过 `ExtendedModelTemplateBuilder` 提供扩展。由于方块模型和物品模型的模型 JSON 本身相似，数据生成代码也相对相似。

## 模型模板

每个模型都始于模型模板（Model Template）`ModelTemplate`。对于原版，`ModelTemplate` 作为某个预生成模型文件的父级，定义父模型、必需的纹理槽（Texture Slot）和要应用的文件后缀。对于 NeoForge，`ExtendedModelTemplate` 通过 `ExtendedModelTemplateBuilder` 构造，使用户能够生成模型的基础元素和面，并使用 NeoForge 添加的所有功能。

可以使用 `ModelTemplates` 中的某个方法或调用构造器创建 `ModelTemplate`。构造器接收相对于 `models` 目录的可选父模型 `Identifier`、要附加到文件路径末尾的可选 string（例如按下状态的按钮使用 `_pressed` 后缀），以及必须定义、否则数据生成会崩溃的 `TextureSlot` varargs。`TextureSlot` 只是定义 `textures` map 中纹理“键”的 string。每个键还可拥有一个父级 `TextureSlot`，当具体槽位未指定纹理时会解析到父级。例如，`TextureSlot#PARTICLE` 会先查找已定义的 `particle` 纹理，然后检查已定义的 `texture` 值，最后检查 `all`。如果槽位及其父级均未定义，数据生成期间会崩溃。

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

NeoForge 添加的 `ExtendedModelTemplate` 可以通过 `ExtendedModelTemplateBuilder#builder` 构造，也可以对现有原版模板调用 `ModelTemplate#extend` 构造。随后可用 `#build` 将 builder 解析为模板。builder 方法可以完整控制模型 JSON 的构造：

| 方法                                           | 效果                                                                                                                                                                                                                                                                                                                                                  |
|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `#parent(Identifier parent)`                                         | 设置相对于 `models` 目录的父模型位置。 |
| `#suffix(String suffix)`                                                   | 将 string 附加到模型文件路径末尾。 |
| `#requiredTextureSlot(TextureSlot slot)`                                   | 添加生成时必须在 `TextureMapping` 中定义的纹理槽。 |
| `transform(ItemDisplayContext type, Consumer<TransformVecBuilder> action)` | 添加由 consumer 配置的 `TransformVecBuilder`，用于设置模型的 `display`。 |
| `#ambientOcclusion(boolean ambientOcclusion)`                              | 设置是否使用[环境光遮蔽][ao]。                                                                                                                                                                                                                                                                                                     |
| `#guiLight(UnbakedModel.GuiLight light)`                                   | 设置 GUI light，可以是 `GuiLight.FRONT` 或 `GuiLight.SIDE`。                                                                                                                                                                                                                                                                                         |
| `#element(Consumer<ElementBuilder> action)`                                | 添加一个由 consumer 配置的新 `ElementBuilder`（相当于向模型添加新[元素][elements]）。                                                                                                                                                                                                 |                                                                                                                                                                                                                                                            |
| `#customLoader(Supplier customLoaderFactory, Consumer action)`            | 使用给定 factory，让此模型使用[自定义加载器][custommodelloader]，以及由 consumer 配置的自定义加载器 builder。这会改变 builder 类型，因此根据加载器实现可能使用不同方法。NeoForge 默认提供多个自定义加载器；更多信息（包括数据生成）参见链接文章。 |
| `#rootTransforms(Consumer<RootTransformsBuilder> action)`                  | 通过 consumer 配置在物品显示变换和方块状态变换前应用的模型变换。 |

:::tip
虽然可以通过数据生成创建复杂精细的模型，但更建议使用 [Blockbench][blockbench] 等建模软件创建复杂模型，再直接使用导出的模型，或把它作为其他模型的父级。
:::

### 创建模型实例

有了 `ModelTemplate` 后，可以调用某个 `ModelTemplate#create*` 方法生成模型本身。虽然各 create 方法接收不同参数，但本质上都接收表示文件名的 `Identifier`、将 `TextureSlot` 映射到相对于 `textures` 目录的某个 `Identifier` 的 `TextureMapping`，以及作为 `BiConsumer<Identifier, ModelInstance>` 的模型输出。随后，该方法实际创建用于生成模型的 `JsonObject`；如果提供任何重复项，则抛出错误。

:::info
调用基础 `create` 方法不会应用已保存的后缀。只有接收方块或物品的 `create*` 方法才会应用。
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
    // 生成模型 JSON 的 consumer。
    modelOutput
);
```

有时，生成的模型使用相似的模型模板和纹理命名模式（例如普通方块的纹理就是方块名称）。在这种情况下，可以创建 `TexturedModel.Provider` 来消除重复。该提供器实际上是一个函数式接口，接收某个 `Block` 并返回用于生成模型的 `TexturedModel`（`ModelTemplate`/`TextureMapping` 对）。接口通过 `TexturedModel#createDefault` 构造；该方法接收将 `Block` 映射到 `TextureMapping` 的函数以及要使用的 `ModelTemplate`。随后，以要生成的 `Block` 调用 `TexturedModel.Provider#create` 即可生成模型。

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
    // 生成模型 JSON 的 consumer。
    modelOutput
);
```

## `ModelProvider`

方块和物品模型的数据生成分别使用 `registerModels` 提供的生成器：`BlockModelGenerators` 和 `ItemModelGenerators`。每个生成器都会生成模型 JSON 以及其他所有必需文件（blockstate、客户端物品）。每个生成器都包含多种 helper 方法，可将全部文件的构造批量合并到单个易用方法中。例如，使用 `ItemModelGenerators#generateFlatItem` 和 `ModelTemplates#FLAT_ITEM` 创建基础 `item/generated` 模型，或使用 `BlockModelGenerators#createTrivialCube` 创建基础 `block/cube_all` 模型。

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

与所有数据提供器一样，不要忘记把提供器注册到事件：

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(ExampleModelProvider::new);
}
```

### 方块模型数据生成

要实际生成 blockstate 和方块模型文件，可以在 `ModelProvider#registerModels` 中调用 `BlockModelGenerators` 的众多 public 方法之一，也可以自行把生成文件传给 blockstate 文件的 `blockStateOutput`、非简单客户端物品的 `itemModelOutput`，以及模型 JSON 的 `modelOutput`。

:::info
如果为方块注册了关联 `BlockItem`，但没有生成客户端物品，`ModelProvider` 会自动生成客户端物品，并使用默认方块模型位置 `assets/<namespace>/models/block/<path>.json` 作为其模型。
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
        // assets/<namespace>/textures/block/<path>_top.png，分别引用侧面和顶部纹理。
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
        // 只需传入侧面纹理两次。例如熔炉和类似方块会使用它。
        blockModels.createHorizontallyRotatedBlock(
            block,
            TexturedModel.Provider.ORIENTABLE_ONLY_TOP.updateTexture(mapping ->
                mapping.put(TextureSlot.SIDE, this.modLocation("block/example_texture_side"))
                .put(TextureSlot.FRONT, this.modLocation("block/example_texture_front"))
                .put(TextureSlot.TOP, this.modLocation("block/example_texture_top"))
            )
        );

        // 指定附着到某个面的水平旋转方块模型，例如按钮。
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
                // 应用 property dispatch。
                // 将根据提供的 mutator 改变 variant。
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
                    // 添加要应用的条件。
                    new CombinedCondition(
                        CombinedCondition.Operation.OR,
                        List.of(
                    // 至少一个条件为 true。
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
                    // 提供要改变的 variant。
                    BlockModelGenerators.variant(variant)
                )
        );
    }
}
```

## 物品模型数据生成

生成物品模型要简单得多，这主要得益于 `ItemModelGenerators` 中的大量 helper 方法，以及用于 property 信息的 `ItemModelUtils`。与上文类似，可以在 `ModelProvider#registerModels` 中调用 `ItemModelGenerators` 的众多 public 方法之一，也可以自行把生成文件传给非简单客户端物品的 `itemModelOutput` 和模型 JSON 的 `modelOutput`。

```java
public class ExampleModelProvider extends ModelProvider {

    public ExampleModelProvider(PackOutput output) {
        // 将 "examplemod" 替换为你自己的模组 ID。
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // 最常见的物品
        // 使用 item/generated，并以物品名称作为 layer0 纹理。
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
[custommodelloader]: modelloaders.md#模型加载器数据生成
[datagen]: ../../index.md#数据生成
[elements]: index.md#元素

