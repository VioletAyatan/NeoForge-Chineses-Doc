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
    // Specify model parts.
    "children": {
        // These can either be references to another model or a model itself.
        "part_1": {
            "parent": "examplemod:some_model_1"
        },
        "part_2": {
            "parent": "examplemod:some_model_2"
        }
    },
    "visibility": {
        // Disable part 2 by default.
        "part_2": false
    }
}
```

随后，可以在 `examplemod:example_composite_model` 的 Child Model 中分别禁用和启用各 Part：

```json5
{
    "parent": "examplemod:example_composite_model",
    // Override visibility. If a part is missing, it will use the parent model's visibility value.
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
    // Required. Reference to the model file. Note that this is relative to the namespace root, not the model folder.
    "model": "examplemod:models/example.obj",
    // Normally, .mtl files must be put into the same location as the .obj file, with only the file ending differing.
    // This will cause the loader to automatically pick them up. However, you can also set the location
    // of the .mtl file manually if needed.
    "mtl_override": "examplemod:models/example_other_name.mtl",
    // These textures can be referenced in the .mtl file as #texture0, #particle, etc.
    // This usually requires manual editing of the .mtl file.
    "textures": {
        "texture0": "minecraft:block/cobblestone",
        "particle": "minecraft:block/stone"
    },
    // Enable or disable automatic culling of the model. Optional, defaults to true.
    "automatic_culling": false,
    // Whether to shade the model or not. Optional, defaults to true.
    "shade_quads": false,
    // Some modeling programs will assume V=0 to be bottom instead of the top. This property flips the Vs upside-down.
    // Optional, defaults to false.
    "flip_v": true,
    // Whether to enable emissivity or not. Optional, defaults to true.
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
// This is the class used to load the model into its unbaked format
public class MyUnbakedModelLoader implements UnbakedModelLoader<MyUnbakedModel>, ResourceManagerReloadListener {
    // It is highly recommended to use a singleton pattern for unbaked model loaders, as all models can be loaded through one loader.
    public static final MyUnbakedModelLoader INSTANCE = new MyUnbakedModelLoader();
    // The id we will use to register this loader. Also used in the loader datagen class.
    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_loader");

    // In accordance with the singleton pattern, make the constructor private.        
    private MyUnbakedModelLoader() {}

    @Override
    public void onResourceManagerReload(ResourceManager resourceManager) {
        // Handle any cache clearing logic
    }

    @Override
    public MyUnbakedModel read(JsonObject obj, JsonDeserializationContext context) throws JsonParseException {
        // Use the given JsonObject and, if needed, the JsonDeserializationContext to get properties from the model JSON.
        // The MyUnbakedModel constructor may have constructor parameters (see below).

        // Read the data used to create the quads
        MyUnbakedGeometry geometry;

        // For the basic parameters provided by vanilla and NeoForge, you can use the StandardModelParameters
        StandardModelParameters params = StandardModelParameters.parse(obj, context);

        return new MyUnbakedModel(params, geometry);
    }
}

// Holds the unbaked quads to render
// Other information that is stored in the unbaked model should be passed to the context map
public class MyUnbakedGeometry implements ExtendedUnbakedGeometry {

    public MyUnbakedGeometry(...) {
        // Store the unbaked quads to bake
    }

    // Method responsible for model baking, returning the quad collection. Parameters in this method are:
    // - The map of texture names to their associated materials.
    // - The model baker. Can be used for getting sub-models to bake and getting sprites from the texture slots.
    // - The model state. This holds the transformations from the blockstate file, typically from rotations and the uvlock.
    // - The name of the model.
    // - A ContextMap of settings provided by NeoForge and your unbaked model. See the 'NeoForgeModelProperties' class for all available properties.
    @Override
    public QuadCollection bake(TextureSlots textureSlots, ModelBaker baker, ModelState state, ModelDebugName debugName, ContextMap additionalProperties) {
        // The builder to create the collection
        var builder = new QuadCollection.Builder();
        // Build the quads for baking
        builder.addUnculledFace(...); // or addCulledFace(Direction, BakedQuad)
        // Create the quad collection
        return builder.build();
    }
}

// The unbaked model contains all the information read from the JSON.
// It provides the basic settings and geometry.
// Using AbstractUnbakedModel sets the Vanilla and NeoForge properties methods
public class MyUnbakedModel extends AbstractUnbakedModel {

    private final MyUnbakedGeometry geometry;

    public MyUnbakedModel(StandardModelParameters params, MyUnbakedGeometry geometry) {
        super(params);
        this.geometry = geometry;
    }

    @Override
    public UnbakedGeometry geometry() {
        // The geometry to used to construct the baked quads
        return this.geometry;
    }

    @Override
    public void fillAdditionalProperties(ContextMap.Builder propertiesBuilder) {
        super.fillAdditionalProperties(propertiesBuilder);
        // Add additional properties below by calling withParameter(ContextKey<T>, T)
        // They can then be accessed in the ContextMap provided in UnbakedGeometry#bake
    }
}
```

全部完成后，不要忘记真正注册 Loader：

```java
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerLoaders(ModelEvent.RegisterLoaders event) {
    event.register(MyUnbakedModelLoader.ID, MyUnbakedModelLoader.INSTANCE);
}

// If you are caching data in the model loader:
@SubscribeEvent // on the mod event bus only on the physical client
public static void addClientResourceListeners(AddClientReloadListenersEvent event) {
    // Register the listener with our id
    event.addListener(MyUnbakedModelLoader.ID, MyUnbakedModelLoader.INSTANCE);
    // Add a dependency for our model loader to run before models are loaded
    // Allows the cache to be cleared before the new data is populated
    event.addDependency(MyUnbakedModelLoader.ID, VanillaClientListeners.MODELS);
}
```

#### Model Loader Datagen

当然，也可以通过 [Datagen][datagen] 生成 Model。为此，需要一个扩展 `CustomLoaderBuilder` 的类：

```java
public class MyLoaderBuilder extends CustomLoaderBuilder {
    public MyLoaderBuilder() {
        super(
            // Your model loader's id.
            MyUnbakedModelLoader.ID,
            // Whether the loader allows inline vanilla elements as a fallback if the loader is absent.
            false
        );
    }
    
    // Add fields and setters for the fields here. The fields can then be used below.

    @Override
    protected CustomLoaderBuilder copyInternal() {
        // Create a new instance of your loader builder and copy the properties from this builder
        // to the new instance.
        MyLoaderBuilder builder = new MyLoaderBuilder();
        // builder.<field> = this.<field>;
        return builder;
    }
    
    // Serialize the model to JSON.
    @Override
    public JsonObject toJson(JsonObject json) {
        // Add your fields to the given JsonObject.
        // Then call super, which adds the loader property and some other things.
        return super.toJson(json);
    }
}
```

要使用此 Loader Builder，请在 Block（或 Item）[Model Datagen][modeldatagen] 期间执行以下操作：

```java
// This assumes an extension of ModelProvider and a DeferredBlock<Block> EXAMPLE_BLOCK.
// The parameter for customLoader() is a Supplier to construct the builder and a Consumer to set to associated properties.
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.createTrivialBlock(
        // The block to generate the model for
        EXAMPLE_BLOCK.get(),
        TexturedModel.createDefault(
            // A mapping used to get the textures
            block -> new TextureMapping().put(
                TextureSlot.ALL, TextureMapping.getBlockTexture(block)
            ),
            // The model template builder used to create the JSON
            ExtendedModelTemplateBuilder.builder()
                // Say we are using a custom model loader
                .customLoader(MyLoaderBuilder::new, loader -> {
                    // Set any required fields here
                })
                // Textures required by the model
                .requiredTextureSlot(TextureSlot.ALL)
                // Call build once complete
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
            // Specify model parts.
            "models": [
                // These must be inlined block state models
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
        // Trick the deserializer into thinking this is a normal model by removing the loader field
        // Then, pass it to the deserializer.
        jsonObject.remove("loader");
        UnbakedModel model = context.deserialize(jsonObject, UnbakedModel.class);
        return new MyUnbakedModel(model, /* other parameters here */);
    }
}

// We extend the delegate class as that stores the wrapped model
public class MyUnbakedModel extends DelegateUnbakedModel {

    // Store the model for use below
    public MyUnbakedModel(UnbakedModel model, /* other parameters here */) {
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
// The model state used to apply the necessary transformations
// If you are using an intermediate object to hold the model state, it must be transformable to a ModelState
public class MyModelState implements ModelState {

    // Used for the unbaked block model part
    public static final Codec<MyModelState> CODEC = Codec.unit(new MyModelState());

    public MyModelState() {}

    @Override
    public Transformation transformation() {
        // Returns the model rotation to apply to the baking vertices
        return Transformation.identity();
    }

    @Override
    public Matrix4fc faceTransformation(Direction direction) {
        // Returns the matrix that is applied to a given face on the model after the transformation
        // This is currently unused in Vanilla
        return NO_TRANSFORM;
    }

    @Override
    public Matrix4fc inverseFaceTransformation(Direction direction) {
        // Returns the inverse of faceTransformation that is applied to a given face on the model
        // This is passed to the FaceBakery
        return NO_TRANSFORM;
    }
}

// The model part representing a baked model
// useAmbientOcclusion and particleMaterial are implemented as part of the record
public record MyBlockStateModelPart(QuadCollection quads, boolean useAmbientOcclusion, Material.Baked particleMaterial) implements BlockStateModelPart {

    // Get the baked quads to render
    @Override
    List<BakedQuad> getQuads(@Nullable Direction direction) {
        return this.quads.getQuads(direction);
    }

    // The flags of the materials backing the quads.
    @Override
    public int materialFlags() {
        return this.quads.materialFlags();
    }

    // The unbaked model that is read from the block state json
    public record Unbaked(Identifier modelLocation, MyModelState modelState) implements BlockStateModelPart.Unbaked {

        // Used for the unbaked block state model
        public static final MapCodec<MyBlockStateModelPart.Unbaked> CODEC = RecordCodecBuilder.mapCodec(
            instance -> instance.group(
                Identifier.CODEC.fieldOf("model").forGetter(MyBlockStateModelPart.Unbaked::modelLocation),
                MyModelState.CODEC.fieldOf("state").forGetter(MyBlockStateModelPart.Unbaked::modelState)
            ).apply(instance, MyBlockStateModelPart.Unbaked::new)
        );

        @Override
        public void resolveDependencies(ResolvableModel.Resolver resolver) {
            // Mark any models used by the model part
            resolver.markDependency(this.modelLocation);
        }

        @Override
        public BlockStateModelPart bake(ModelBaker baker) {
            // Get the model to bake
            ResolvedModel resolvedModel = baker.getModel(this.modelLocation);

            // Get the necessary settings for the model part
            TextureSlots slots = resolvedModel.getTopTextureSlots();
            boolean ao = resolvedModel.getTopAmbientOcclusion();
            Material.Baked particle = resolvedModel.resolveParticleMaterial(slots, baker);
            QuadCollection quads = resolvedModel.bakeTopGeometry(slots, baker, this.modelState);
            
            // Return the baked part
            return new MyBlockStateModelPart(quads, ao, particle);
        }
    }
}

// The state model representing the baked block state
public record MyBlockStateModel(MyBlockStateModelPart model) implements DynamicBlockStateModel {

    // Sets the particle material
    // While it needs to be implemented, any actual logic should be delegated to the level-aware version
    @Override
    public Material.Baked particleMaterial() {
        return this.model.particleMaterial();
    }

    // The flags of the materials backing the quads.
    // While it needs to be implemented, any actual logic should be delegated to the level-aware version
    @Override
    public int materialFlags() {
        return this.quads.materialFlags();
    }

    // This effectively acts as a key to reuse geometry previous produced. This should generally be as deterministic as possible.
    @Override
    public Object createGeometryKey(BlockAndTintGetter level, BlockPos pos, BlockState state, RandomSource random) {
        return this;
    }

    // Method responsible for collecting the parts to be rendered. Parameters in this method are:
    // - The getter for the blocks and tints, usually the level.
    // - The position of the block to render.
    // - The state of the block.
    // - A random instance.
    // - This list of model parts to be rendered. Add your model parts here.
    @Override
    public void collectParts(BlockAndTintGetter level, BlockPos pos, BlockState state, RandomSource random, List<BlockStateModelPart> parts) {
        // If you want the block rendered to be dependent on the block entity (e.g., your block entity implements `BlockEntity#getModelData`)
        // You can call `BlockAndTintGetter#getModelData` with the block position
        // You can read the property using `get` with the `ModelProperty` key
        // Remember that your block entity should call `BlockEntity#requestModelDataUpdate` to sync the model data to the client
        ModelData data = level.getModelData(pos);

        // Add the model to be rendered
        parts.add(this.model);
    }

    @Override
    public Material.Baked particleMaterial(BlockAndTintGetter level, BlockPos pos, BlockState state) {
        // Override this if you want to use the level to determine what particle to render
        return self().particleMaterial();
    }

    @Override
    public int materialFlags(BlockAndTintGetter level, BlockPos pos, BlockState state) {
        // Override this if you want to use the level to determine what material flags the model has
        return self().materialFlags();
    }

    // The unbaked model that is read from the block state json
    public record Unbaked(MyBlockStateModelPart.Unbaked model) implements CustomUnbakedBlockStateModel {

        // The codec to register
        public static final MapCodec<MyBlockStateModel.Unbaked> CODEC = MyBlockStateModelPart.Unbaked.CODEC.xmap(
            MyBlockStateModel.Unbaked::new, MyBlockStateModel.Unbaked::model
        );
        public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_model_loader");

        @Override
        public void resolveDependencies(ResolvableModel.Resolver resolver) {
            // Mark any models used by the state model
            this.model.resolveDependencies(resolver);
        }

        @Override
        public BlockStateModel bake(ModelBaker baker) {
            // Bake the model parts and pass into the block state model
            return new MyBlockStateModel(this.model.bake(baker));
        }
    }
}
```


全部完成后，不要忘记真正注册 Loader：

```java
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerDefinitions(RegisterBlockStateModels event) {
    event.registerModel(MyBlockStateModel.Unbaked.ID, MyBlockStateModel.Unbaked.CODEC);
}
```

#### State Model Loader Datagen

当然，也可以通过 [Datagen][datagen] 生成 Model。为此，需要一个扩展 `CustomBlockStateModelBuilder` 的类：

```java
// The builder used to construct the block state JSON
public class MyBlockStateModelBuilder extends CustomBlockStateModelBuilder {

    private MyBlockStateModelPart.Unbaked model;

    public MyBlockStateModelBuilder() {}
    
    // Add fields and setters for the fields here. The fields can then be used below.

    @Override
    public MyBlockStateModelBuilder with(VariantMutator variantMutator) {
        // If you want to apply any mutators that assumes your unbaked model part is a `Variant`
        // If not, this should do nothing
        return this;
    }

    // This is for generalized unbaked blockstate models
    @Override
    public MyBlockStateModelBuilder with(UnbakedMutator unbakedMutator) {
        var result = new MyBlockStateModelBuilder();

        if (this.model != null) {
            result.model = unbakedMutator.apply(this.model);
        }

        return result;
    }

    // Converts the builder to its unbaked variant to encode
    @Override
    public CustomUnbakedBlockStateModel toUnbaked() {
        return new MyBlockStateModel.Unbaked(this.model);
    }
}
```

要使用此 State Definition Loader Builder，请在 Block（或 Item）[Model Datagen][modeldatagen] 期间执行以下操作：

```java
// This assumes an extension of ModelProvider and a DeferredBlock<Block> EXAMPLE_BLOCK.
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.blockStateOutput.accept(
        MultiVariantGenerator.dispatch(
            // The block to generate the model for
            EXAMPLE_BLOCK.get(),
            // Our custom block state builder
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
        // Other fields
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

    // The codec to register
    public static final MapCodec<MyBlockModelDefinition> CODEC = MyBlockStateModel.Unbaked.CODEC.xmap(
        MyBlockModelDefinition::new, MyBlockModelDefinition::model
    );
    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_definition_loader");

    // This method maps all possible states to some unbaked root
    // As the root will generally share block states models, they are typically operated using a `ModelBaker.SharedOperationKey` to cache the loading model
    @Override
    public Map<BlockState, BlockStateModel.UnbakedRoot> instantiate(StateDefinition<Block, BlockState> states, Supplier<String> sourceSupplier) {
        Map<BlockState, BlockStateModel.UnbakedRoot> result = new HashMap<>();

        // Handle for all possible states
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
@SubscribeEvent // on the mod event bus only on the physical client
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
        // Returns the block you are generating the definition file for
        return this.block;
    }

    @Override
    public BlockModelDefinition create() {
        // Creates the block model definition used to encode and decode the file
        return new MyBlockModelDefinition(this.builder.toUnbaked());
    }
} 
```

要使用此 State Definition Loader Builder，请在 Block（或 Item）[Model Datagen][modeldatagen] 期间执行以下操作：

```java
// This assumes a DeferredBlock<Block> EXAMPLE_BLOCK.
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.blockStateOutput.accept(
        MyBlockModelDefinitionGenerator.dispatch(
            // The block to generate the model for
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
    // Other fields
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
