# 自定义模型加载器（Custom Model Loader）

Model 本质上只是一种形状，可以是 Cube、Cube 集合、Triangle 集合，或任何其他几何形状（或几何形状集合）。在多数上下文中，Model 如何定义并不重要，因为最终都会 Bake 为 `QuadCollection`。因此，NeoForge 允许注册自定义 Model Loader，把任意 Model 转换成游戏可使用的 Baked 格式。

## Model Loader

Block Model 的入口仍是 Model JSON 文件。不过，可以在 JSON 根中指定 `loader` 字段，以自定义 Loader 替换默认 Loader。自定义 Model Loader 可以忽略默认 Loader 所要求的所有字段。

除了默认 Model Loader，NeoForge 还提供几个内置 Loader，各有不同用途。

### Composite Model

Composite Model 可用于在 Parent 中指定不同 Model Part，而在 Child 中只应用其中一部分。示例最能说明这一点。假设 `examplemod:example_composite_model` 中存在以下 Parent Model：

```json5
{
    "loader": "neoforge:composite",
    // 指定模型零件。
    "children": {
        // 这些可以是对另一个模型的引用，也可以是模型本身的引用。
        "part_1": {
            "parent": "examplemod:some_model_1"
        },
        "part_2": {
            "parent": "examplemod:some_model_2"
        }
    },
    "visibility": {
        // 默认禁用第 2 部分。
        "part_2": false
    }
}
```

随后，可以在 `examplemod:example_composite_model` 的 Child Model 中分别禁用和启用各 Part：

```json5
{
    "parent": "examplemod:example_composite_model",
    // 覆盖可见性。如果某个部件丢失，它将使用父模型的可见性值。
    "visibility": {
        "part_1": false,
        "part_2": true
    }
}
```

要通过 [Datagen][modeldatagen] 生成此 Model，请使用自定义 Loader 类 `CompositeModelBuilder`。

:::warning
Composite Model Loader 不应用于[客户端 Item][citems] 所使用的 Model。它们应使用 Definition 本身提供的 [Composite Model][itemcomposite]。
:::

### Empty Model

Empty Model 完全不渲染任何内容。

```json5
{
    "loader": "neoforge:empty"
}
```

### OBJ Model

OBJ Model Loader 允许在游戏中使用 Wavefront `.obj` 3D Model，使 Model 可包含任意形状（包括 Triangle、Circle 等）。`.obj` Model 必须放在 `models` 文件夹（或其子文件夹）中，并提供同名 `.mtl` 文件（也可手动设置）。例如，位于 `models/block/example.obj` 的 OBJ Model 必须有对应的 `models/block/example.mtl` MTL 文件。

```json5
{
    "loader": "neoforge:obj",
    // 必填。参考模型文件。请注意，这是相对于命名空间根目录的，而不是相对于模型文件夹的。
    "model": "examplemod:models/example.obj",
    // 通常，.mtl 文件必须与 .obj 文件放在同一位置，只是文件结尾不同。
    // 加载器会自动发现这些文件。不过，也可以按需手动设置
    // .mtl 文件的位置。
    "mtl_override": "examplemod:models/example_other_name.mtl",
    // 这些纹理可以在 .mtl 文件中以 #texture0、#particle 等名称引用。
    // 这通常需要手动编辑 .mtl 文件。
    "textures": {
        "texture0": "minecraft:block/cobblestone",
        "particle": "minecraft:block/stone"
    },
    // 启用或禁用模型的自动剔除。 可选，默认为true。
    "automatic_culling": false,
    // 是否对模型进行着色。 可选，默认为true。
    "shade_quads": false,
    // 某些建模程序会假设 V=0 为底部而不是顶部。此 property 将 V 颠倒过来。
    // 可选，默认为 false。
    "flip_v": true,
    // 是否启用发射率。 可选，默认为true。
    "emissive_ambient": false
}
```

要通过 [Datagen][modeldatagen] 生成此 Model，请使用自定义 Loader 类 `ObjModelBuilder`。

### 创建自定义 Model Loader

创建自己的 Model Loader 需要四个类和一个事件处理器：

- 一个 `UnbakedModelLoader` 类
- 一个 `UnbakedGeometry` 类，通常是 `ExtendedUnbakedGeometry` 实例
- 一个 `UnbakedModel` 类，通常是 `AbstractUnbakedModel` 实例
- 一个保存 Baked Quad 的 `QuadCollection` 类，通常就是该类本身
- 一个为 `ModelEvent.RegisterLoaders` 编写的[客户端][sides][事件处理器][event]，用于注册 Unbaked Model Loader
- 可选：对于需要缓存所加载内容相关数据的 Model Loader，为 `AddClientReloadListenersEvent` 编写[客户端][sides][事件处理器][event]

为说明这些类如何连接，我们跟踪一次 Model 加载流程：

- 加载 Model 时，`loader` 属性设为你的 Loader 的 Model JSON 会传给 Unbaked Model Loader。Loader 随后读取 Model JSON，并使用其中的属性以及含有 Model Unbaked Quad 的 `UnbakedGeometry`，返回 `UnbakedModel` 对象。
- Bake Model 时，调用 `UnbakedGeometry#bake`，返回 `QuadCollection`。
- 渲染 Model 时，使用 `QuadCollection` 以及[客户端 Item][citems] 或 [BlockState Definition][blockstatedefinition] 所需的其他信息进行渲染。

:::info
如果要为 Item 或 BlockState 使用的 Model 创建自定义 Model Loader，根据用例，创建新的 `ItemModel` 或 `BlockStateModel` 可能更好。例如，使用或生成 `QuadCollection` 的 Model 更适合作为 `ItemModel` 或 `BlockStateModel`，而解析其他数据格式（例如 `.obj`）的 Model 应使用新的 Model Loader。
:::

下面通过基础类结构进一步说明。Loader 类名为 `MyUnbakedModelLoader`，Unbaked 类名为 `MyUnbakedModel`，Unbaked Geometry 名为 `MyUnbakedGeometry`。同时假定 Model Loader 需要某种缓存：

```java
// 这是用于将模型加载为其未烘焙格式的类
public class MyUnbakedModelLoader implements UnbakedModelLoader<MyUnbakedModel>, ResourceManagerReloadListener {
    // 强烈建议对未烘焙的模型加载器使用单例模式，因为所有模型都可以通过一个加载器加载。
    public static final MyUnbakedModelLoader INSTANCE = new MyUnbakedModelLoader();
    // 我们将用来注册此加载程序的 ID。也用于加载器 datagen 类。
    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_loader");

    // 按照单例模式，制作构造器private。
    private MyUnbakedModelLoader() {}

    @Override
    public void onResourceManagerReload(ResourceManager resourceManager) {
        // 处理任何缓存清除逻辑
    }

    @Override
    public MyUnbakedModel read(JsonObject obj, JsonDeserializationContext context) throws JsonParseException {
        // 使用给定的 JsonObject 和 JsonDeserializationContext（如果需要）从模型 JSON 获取 property。
        // MyUnbakedModel 构造器可以带有参数（见下文）。

        // 读取用于创建四边形的数据
        MyUnbakedGeometry geometry;

        // 对于vanilla和NeoForge提供的基本参数，可以使用StandardModelParameters
        StandardModelParameters params = StandardModelParameters.parse(obj, context);

        return new MyUnbakedModel(params, geometry);
    }
}

// 保存未烘焙的四边形进行渲染
// 存储在未烘焙模型中的其他信息应传递给上下文映射
public class MyUnbakedGeometry implements ExtendedUnbakedGeometry {

    public MyUnbakedGeometry(...) {
        // 存放未烘烤的四边形以进行烘烤
    }

    // 负责模型烘焙的方法，返回quad集合。 此方法中的参数为：
    // - 纹理名称与其关联材质的映射。
    // - 模型烘焙器。可用于取得待烘焙的子模型，以及从纹理槽位取得 sprite。
    // - 模型状态。它保存来自方块状态文件的转换，通常来自旋转和 uvlock。
    // - 模型名称。
    // - 由 NeoForge 和你的未烘焙模型提供的 ContextMap 设置。有关所有可用 property，请参阅 'NeoForgeModelProperties' 类。
    @Override
    public QuadCollection bake(TextureSlots textureSlots, ModelBaker baker, ModelState state, ModelDebugName debugName, ContextMap additionalProperties) {
        // 创建集合的 builder
        var builder = new QuadCollection.Builder();
        // 构建用于烘焙的四边形
        builder.addUnculledFace(...); // 或 addCulledFace（方向，BakedQuad）
        // 创建四元集合
        return builder.build();
    }
}

// 未烘焙的模型包含从 JSON 读取的所有信息。
// 它提供基本设置和几何形状。
// 使用 AbstractUnbakedModel 设置原版和 NeoForge property 方法
public class MyUnbakedModel extends AbstractUnbakedModel {

    private final MyUnbakedGeometry geometry;

    public MyUnbakedModel(StandardModelParameters params, MyUnbakedGeometry geometry) {
        super(params);
        this.geometry = geometry;
    }

    @Override
    public UnbakedGeometry geometry() {
        // 用于构造烘焙四边形的几何体
        return this.geometry;
    }

    @Override
    public void fillAdditionalProperties(ContextMap.Builder propertiesBuilder) {
        super.fillAdditionalProperties(propertiesBuilder);
        // 通过调用 withParameter(ContextKey<T>, T) 添加以下附加 property
        // 然后可以在 UnbakedGeometry#bake 中提供的 ContextMap 中访问它们
    }
}
```

全部完成后，不要忘记真正注册 Loader：

```java
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerLoaders(ModelEvent.RegisterLoaders event) {
    event.register(MyUnbakedModelLoader.ID, MyUnbakedModelLoader.INSTANCE);
}

// 如果你在模型加载器中缓存数据：
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void addClientResourceListeners(AddClientReloadListenersEvent event) {
    // 用我们的ID注册监听器
    event.addListener(MyUnbakedModelLoader.ID, MyUnbakedModelLoader.INSTANCE);
    // 添加模型加载器的依赖项以在加载模型之前运行
    // 允许在填充新数据之前清除缓存
    event.addDependency(MyUnbakedModelLoader.ID, VanillaClientListeners.MODELS);
}
```

#### Model Loader Datagen

当然，也可以通过 [Datagen][datagen] 生成 Model。为此，需要一个扩展 `CustomLoaderBuilder` 的类：

```java
public class MyLoaderBuilder extends CustomLoaderBuilder {
    public MyLoaderBuilder() {
        super(
            // 你的模型加载器的 ID。
            MyUnbakedModelLoader.ID,
            // 如果加载器不存在，加载器是否允许内联原版元素作为后备。
            false
        );
    }
    
    // 在此处添加字段和字段的设置器。然后可以在下面使用这些字段。

    @Override
    protected CustomLoaderBuilder copyInternal() {
        // 创建加载程序 builder 的新实例并从此 builder 复制 property
        // 到新实例。
        MyLoaderBuilder builder = new MyLoaderBuilder();
        // builder.<field> = this.<field>;
        return builder;
    }
    
    // 将模型序列化为 JSON。
    @Override
    public JsonObject toJson(JsonObject json) {
        // 将你的字段添加到给定的 JsonObject。
        // 然后调用 super，它添加了 loader property 和其他一些东西。
        return super.toJson(json);
    }
}
```

要使用此 Loader Builder，请在 Block（或 Item）[Model Datagen][modeldatagen] 期间执行以下操作：

```java
// 这里假定存在 ModelProvider 的子类和 DeferredBlock<Block> EXAMPLE_BLOCK。
// customLoader() 的参数是用于构造 builder 的 Supplier 和用于设置关联 property 的 Consumer。
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.createTrivialBlock(
        // 生成模型的方块
        EXAMPLE_BLOCK.get(),
        TexturedModel.createDefault(
            // 用于获取纹理的映射
            block -> new TextureMapping().put(
                TextureSlot.ALL, TextureMapping.getBlockTexture(block)
            ),
            // 用于创建 JSON 的模型模板 builder
            ExtendedModelTemplateBuilder.builder()
                // 假设我们正在使用自定义模型加载器
                .customLoader(MyLoaderBuilder::new, loader -> {
                    // 设置此处任何必填字段
                })
                // 模型所需的纹理
                .requiredTextureSlot(TextureSlot.ALL)
                // 完成后调用构建
                .build()
        )
    );
}
```

#### Visibility

`CustomLoaderBuilder` 的默认实现包含用于应用 Visibility 的方法。你可以选择在 Model Loader 中使用或忽略 `visibility` 属性。目前只有 [Composite Model Loader][composite] 和 [OBJ Loader][obj] 使用该属性。

## BlockState Model Loader

由于 BlockState Model 被视为独立于 Model JSON 文件，NeoForge 还提供自定义 Loader，通过在 Variant 或 Multipart 中指定 `type` 处理。自定义 BlockState Model Loader 可以忽略默认 Loader 所要求的所有字段。

### Composite BlockState Model

Composite BlockState Model 可用于同时渲染多个 `BlockStateModel`。

```json5
{
    "variants": {
        "": {
            "type": "neoforge:composite",
            // 指定模型零件。
            "models": [
                // 这些必须是内联方块状态模型
                {
                    "variants": {
                        // ...
                    }
                },
                {
                    "multipart": [
                        // ...
                    ]
                }
                // ...
            ]
        }
    }
}
```

要通过 [Datagen][modeldatagen] 生成此 BlockState Model，请使用自定义 Loader 类 `CompositeBlockStateModelBuilder`。

### 复用默认 Model Loader

某些上下文中，在原版 Model Loader 之上构建 Model 逻辑比彻底替换它更合理。可以使用一个巧妙方法：在 Model Loader 中移除 `loader` 属性，再把数据交回 Model Deserializer，使其认为这是普通 Unbaked Model。随后便可在 Bake 前修改 Model 或其 Geometry，并以任意方式处理。

```java
public class MyUnbakedModelLoader implements UnbakedModelLoader<MyUnbakedModel> {
    public static final MyUnbakedModelLoader INSTANCE = new MyUnbakedModelLoader();
    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_loader");
    
    private MyUnbakedModelLoader() {}

    @Override
    public MyUnbakedModel read(JsonObject jsonObject, JsonDeserializationContext context) throws JsonParseException {
        // 移除 loader 字段，让反序列化器将其视为普通模型，
        // 然后把它传给反序列化器。
        jsonObject.remove("loader");
        UnbakedModel model = context.deserialize(jsonObject, UnbakedModel.class);
        return new MyUnbakedModel(model, /* 其他参数在这里*/);
    }
}

// 我们扩展委托类来存储包装的模型
public class MyUnbakedModel extends DelegateUnbakedModel {

    // 存储模型以供下面使用
    public MyUnbakedModel(UnbakedModel model, /* 其他参数在这里*/) {
       super(model);
    }
}
```

### 创建自定义 BlockState Model Loader

创建自己的 BlockState Model Loader 需要五个类和一个事件处理器：

- 一个加载 BlockState Model 的 `CustomUnbakedBlockStateModel` 类
- 一个 Bake Model 的 `BlockStateModel` 类，通常是 `DynamicBlockStateModel` 实例
- 一个加载 Model JSON 的 `BlockStateModelPart.Unbaked`
- 一个对给定 Face 或 Model 应用 Transform 的 `ModelState`
- 一个保存 Quad、Ambient Occlusion 和 Particle Texture 的 `BlockStateModelPart`，通常为 `SimpleModelWrapper`
- 一个为 `RegisterBlockStateModels` 编写的[客户端][sides][事件处理器][event]，用于注册 Unbaked BlockState Model Loader 的 Codec

为说明这些类如何连接，我们跟踪一次 BlockState Model 加载流程：

- 加载 Definition 时，Variant、Multipart 或[自定义 Definition][customdefinition] 中 `type` 属性设为你的 Loader 的 BlockState Model，会 Decode 为你的 `CustomUnbakedBlockStateModel`。
- Bake Model 时，调用 `CustomUnbakedBlockStateModel#bake`，返回包含若干 `BlockStateModelPart` 的 `BlockStateModel`。
- 渲染 Model 时，`BlockStateModel#collectParts` 收集待渲染的 `BlockStateModelPart` 列表。

下面通过基础类结构进一步说明。Baked Model 名为 `MyBlockStateModel`，Unbaked 类是内部 Record `MyBlockStateModel.Unbaked`，Model Part 名为 `MyBlockStateModelPart`，Unbaked Part 类是内部 Record `MyBlockStateModelPart.Unbaked`，`ModelState` 名为 `MyModelState`：

```java
// 用于应用必要转换的模型状态
// 如果你使用中间对象来保存模型状态，则它必须可转换为 ModelState
public class MyModelState implements ModelState {

    // 用于未烘烤的方块模型部分
    public static final Codec<MyModelState> CODEC = Codec.unit(new MyModelState());

    public MyModelState() {}

    @Override
    public Transformation transformation() {
        // 返回模型旋转以应用于烘焙顶点
        return Transformation.identity();
    }

    @Override
    public Matrix4fc faceTransformation(Direction direction) {
        // 返回变换后应用于模型上给定面的矩阵
        // 目前在原版中未使用
        return NO_TRANSFORM;
    }

    @Override
    public Matrix4fc inverseFaceTransformation(Direction direction) {
        // 返回应用于模型上给定面的 faceTransformation 的倒数
        // 这被传递到 FaceBakery
        return NO_TRANSFORM;
    }
}

// 代表烘焙模型的模型部分
// useAmbientOcclusion 和 particleMaterial 作为 record 的一部分实现
public record MyBlockStateModelPart(QuadCollection quads, boolean useAmbientOcclusion, Material.Baked particleMaterial) implements BlockStateModelPart {

    // 获取烘焙的四边形进行渲染
    @Override
    List<BakedQuad> getQuads(@Nullable Direction direction) {
        return this.quads.getQuads(direction);
    }

    // 支持四边形的材料的标志。
    @Override
    public int materialFlags() {
        return this.quads.materialFlags();
    }

    // 从方块状态json读取的未烘焙模型
    public record Unbaked(Identifier modelLocation, MyModelState modelState) implements BlockStateModelPart.Unbaked {

        // 用于未烘焙方块状态模型
        public static final MapCodec<MyBlockStateModelPart.Unbaked> CODEC = RecordCodecBuilder.mapCodec(
            instance -> instance.group(
                Identifier.CODEC.fieldOf("model").forGetter(MyBlockStateModelPart.Unbaked::modelLocation),
                MyModelState.CODEC.fieldOf("state").forGetter(MyBlockStateModelPart.Unbaked::modelState)
            ).apply(instance, MyBlockStateModelPart.Unbaked::new)
        );

        @Override
        public void resolveDependencies(ResolvableModel.Resolver resolver) {
            // 标记模型部分使用的任何模型
            resolver.markDependency(this.modelLocation);
        }

        @Override
        public BlockStateModelPart bake(ModelBaker baker) {
            // 获取模型进行烘焙
            ResolvedModel resolvedModel = baker.getModel(this.modelLocation);

            // 获取模型零件的必要设置
            TextureSlots slots = resolvedModel.getTopTextureSlots();
            boolean ao = resolvedModel.getTopAmbientOcclusion();
            Material.Baked particle = resolvedModel.resolveParticleMaterial(slots, baker);
            QuadCollection quads = resolvedModel.bakeTopGeometry(slots, baker, this.modelState);
            
            // 返回烘焙部分
            return new MyBlockStateModelPart(quads, ao, particle);
        }
    }
}

// 代表烘焙方块状态的状态模型
public record MyBlockStateModel(MyBlockStateModelPart model) implements DynamicBlockStateModel {

    // 设置粒子材质
    // 虽然需要实现，但任何实际逻辑都应委托给级别感知版本
    @Override
    public Material.Baked particleMaterial() {
        return this.model.particleMaterial();
    }

    // 支持四边形的材料的标志。
    // 虽然需要实现，但任何实际逻辑都应委托给级别感知版本
    @Override
    public int materialFlags() {
        return this.quads.materialFlags();
    }

    // 这有效地充当了重复使用先前生成的几何体的关键。这通常应该尽可能具有确定性。
    @Override
    public Object createGeometryKey(BlockAndTintGetter level, BlockPos pos, BlockState state, RandomSource random) {
        return this;
    }

    // 负责收集要渲染的部分的方法。 此方法中的参数为：
    // - Block 与 tint 的 getter，通常是 Level。
    // - 要渲染的方块的位置。
    // - 方块的状态。
    // - 随机实例。
    // - 要渲染的模型零件列表。在此添加你的模型零件。
    @Override
    public void collectParts(BlockAndTintGetter level, BlockPos pos, BlockState state, RandomSource random, List<BlockStateModelPart> parts) {
        // 如果你希望渲染的方块依赖于方块实体（例如，你的方块实体实现了 `BlockEntity#getModelData`）
        // 你可以使用方块位置调用`BlockAndTintGetter#getModelData`
        // 你可以使用 `get` 和 `ModelProperty` 键读取 property
        // 请记住，你的方块实体应调用 `BlockEntity#requestModelDataUpdate` 将模型数据同步到客户端
        ModelData data = level.getModelData(pos);

        // 添加要渲染的模型
        parts.add(this.model);
    }

    @Override
    public Material.Baked particleMaterial(BlockAndTintGetter level, BlockPos pos, BlockState state) {
        // 如果要根据世界决定渲染哪种粒子，请重写此方法
        return self().particleMaterial();
    }

    @Override
    public int materialFlags(BlockAndTintGetter level, BlockPos pos, BlockState state) {
        // 如果要根据世界决定模型具有哪些材质标志，请重写此方法
        return self().materialFlags();
    }

    // 从方块状态json读取的未烘焙模型
    public record Unbaked(MyBlockStateModelPart.Unbaked model) implements CustomUnbakedBlockStateModel {

        // 要注册的编解码器
        public static final MapCodec<MyBlockStateModel.Unbaked> CODEC = MyBlockStateModelPart.Unbaked.CODEC.xmap(
            MyBlockStateModel.Unbaked::new, MyBlockStateModel.Unbaked::model
        );
        public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_model_loader");

        @Override
        public void resolveDependencies(ResolvableModel.Resolver resolver) {
            // 标记状态模型使用的任何模型
            this.model.resolveDependencies(resolver);
        }

        @Override
        public BlockStateModel bake(ModelBaker baker) {
            // 烘烤模型零件并传入方块状态模型
            return new MyBlockStateModel(this.model.bake(baker));
        }
    }
}
```


全部完成后，不要忘记真正注册 Loader：

```java
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerDefinitions(RegisterBlockStateModels event) {
    event.registerModel(MyBlockStateModel.Unbaked.ID, MyBlockStateModel.Unbaked.CODEC);
}
```

#### State Model Loader Datagen

当然，也可以通过 [Datagen][datagen] 生成 Model。为此，需要一个扩展 `CustomBlockStateModelBuilder` 的类：

```java
// 用于构建方块状态的 builder JSON
public class MyBlockStateModelBuilder extends CustomBlockStateModelBuilder {

    private MyBlockStateModelPart.Unbaked model;

    public MyBlockStateModelBuilder() {}
    
    // 在此处添加字段和字段的设置器。然后可以在下面使用这些字段。

    @Override
    public MyBlockStateModelBuilder with(VariantMutator variantMutator) {
        // 如果你想应用任何假设你的未烘焙模型部件是 `Variant` 的变异器
        // 如果不是，此应该什么也不做
        return this;
    }

    // 这是针对广义未烘焙方块状态模型
    @Override
    public MyBlockStateModelBuilder with(UnbakedMutator unbakedMutator) {
        var result = new MyBlockStateModelBuilder();

        if (this.model != null) {
            result.model = unbakedMutator.apply(this.model);
        }

        return result;
    }

    // 将 builder 转换为其未烘焙的变体进行编码
    @Override
    public CustomUnbakedBlockStateModel toUnbaked() {
        return new MyBlockStateModel.Unbaked(this.model);
    }
}
```

要使用此 State Definition Loader Builder，请在 Block（或 Item）[Model Datagen][modeldatagen] 期间执行以下操作：

```java
// 这里假定存在 ModelProvider 的子类和 DeferredBlock<Block> EXAMPLE_BLOCK。
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.blockStateOutput.accept(
        MultiVariantGenerator.dispatch(
            // 生成模型的方块
            EXAMPLE_BLOCK.get(),
            // 我们的自定义方块状态 builder
            MultiVariant.of(new CustomBlockStateModelBuilder().with(...))
        )
    );
}
```

这会生成如下 Model：

```json5
{
  "variants": {
    "": {
        "type": "examplemod:my_custom_model_loader"
        // 其他字段
    }
  }
}
```

## BlockState Definition Loader

单个 BlockState Model 负责加载单个 BlockState，而 BlockState Definition Loader 负责加载整个 BlockState 文件，通过指定 `neoforge:definition_type` 进行处理。自定义 BlockState Definition Loader 可以忽略默认 Loader 所要求的所有字段。

### 创建自定义 BlockState Definition Loader

创建自己的 BlockState Definition Loader 需要两个类和一个事件处理器：

- 一个加载 BlockState Definition 的 `CustomBlockModelDefinition` 类
- 一个将 BlockState Bake 为其 `BlockStateModel` 的 `BlockStateModel.UnbakedRoot` 类
- 一个为 `RegisterBlockStateModels` 编写的[客户端][sides][事件处理器][event]，用于注册 Unbaked BlockState Model Loader 的 Codec

为说明这些类如何连接，我们跟踪一次 BlockState Model 加载流程：

- 加载 Definition 时，`neoforge:definition_type` 属性设为你的 Loader 的 BlockState Definition 会 Decode 为 `CustomBlockModelDefinition`。
- 随后调用 `CustomBlockModelDefinition#instantiate`，将所有可能的 BlockState 映射到其 `BlockStateModel.UnbakedRoot`。简单情况下，通过 `BlockStateModel.Unbaked#asRoot` 构造；复杂情况则创建自己的 `BlockStateModel.UnbakedRoot`。
- Bake Model 时，调用 `BlockStateModel.UnbakedRoot#bake`，为某个 `BlockState` 返回 `BlockStateModel`。

下面通过基础类结构进一步说明。Block Model Definition 名为 `MyBlockModelDefinition`，并复用 `BlockStateModel.Unbaked#asRoot` 构造 `BlockStateModel.UnbakedRoot`：

```java
public record MyBlockModelDefinition(MyBlockStateModel.Unbaked model) implements CustomBlockModelDefinition {

    // 要注册的编解码器
    public static final MapCodec<MyBlockModelDefinition> CODEC = MyBlockStateModel.Unbaked.CODEC.xmap(
        MyBlockModelDefinition::new, MyBlockModelDefinition::model
    );
    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_definition_loader");

    // 该方法将所有可能的状态映射到某个未烘焙的根
    // 由于根通常会共享方块状态模型，因此通常使用 `ModelBaker.SharedOperationKey` 来操作它们来缓存加载模型
    @Override
    public Map<BlockState, BlockStateModel.UnbakedRoot> instantiate(StateDefinition<Block, BlockState> states, Supplier<String> sourceSupplier) {
        Map<BlockState, BlockStateModel.UnbakedRoot> result = new HashMap<>();

        // 所有可能状态的句柄
        var unbakedRoot = this.model.asRoot();
        states.getPossibleStates().forEach(state -> result.put(state, unbakedRoot));

        return result;
    }

    @Override
    public MapCodec<? extends CustomBlockModelDefinition> codec() {
        return CODEC;
    }
}
```

全部完成后，不要忘记真正注册 Loader：

```java
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerDefinitions(RegisterBlockStateModels event) {
    event.registerDefinition(MyBlockModelDefinition.ID, MyBlockModelDefinition.CODEC);
}
```

#### State Definition Loader Datagen

当然，也可以通过 [Datagen][datagen] 生成 Definition。为此，需要一个实现 `BlockModelDefinitionGenerator` 的类：

```java
public class MyBlockModelDefinitionGenerator implements BlockModelDefinitionGenerator {

    private final Block block;
    private final MyBlockStateModelBuilder builder;

    private MyBlockModelDefinitionGenerator(Block block, MyBlockStateModelBuilder builder) {
        this.block = block;
        this.builder = builder;
    }

    public static MyBlockModelDefinitionGenerator dispatch(Block block, MyBlockStateModelBuilder builder) {
        return new MyBlockModelDefinitionGenerator(block, builder);
    }

    @Override
    public Block block() {
        // 返回你为其生成定义文件的方块
        return this.block;
    }

    @Override
    public BlockModelDefinition create() {
        // 创建用于编码和解码文件的方块模型定义
        return new MyBlockModelDefinition(this.builder.toUnbaked());
    }
} 
```

要使用此 State Definition Loader Builder，请在 Block（或 Item）[Model Datagen][modeldatagen] 期间执行以下操作：

```java
// 这里假定存在 DeferredBlock<Block> EXAMPLE_BLOCK。
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.blockStateOutput.accept(
        MyBlockModelDefinitionGenerator.dispatch(
            // 生成模型的方块
            EXAMPLE_BLOCK.get(),
            new CustomBlockStateModelBuilder(...)
        )
    );
}
```

这会生成如下 Model：

```json5
{
    "neoforge:definition_type": "examplemod:my_custom_definition_loader"
    // 其他字段
}
```

[citems]: items.md
[composite]: #composite-model
[customdefinition]: #block-state-definition-loaders
[datagen]: ../../index.md#data-generation
[event]: ../../../concepts/events.md#注册事件处理器
[itemcomposite]: items.md#composite-models
[modeldatagen]: datagen.md
[obj]: #obj-model
[sides]: ../../../concepts/sides.md
