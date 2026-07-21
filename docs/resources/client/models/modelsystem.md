
# 理解 Model 系统

Minecraft 中的 Model 只是附带纹理的 Quad 列表。建模流程的每个部分都有独立实现，底层 Model JSON 会反序列化为 `UnbakedModel`。最后，各 Pipeline 都接收某个 `List<BakedQuad>` 以及自身所需属性。一些 [BlockEntity Renderer][ber] 也会使用这些 Model。Model 的复杂程度没有限制。

Model 存储在 `ModelManager` 中，可通过 `Minecraft.getInstance().getModelManager()` 访问。对于 Item Pipeline，可以把 [`Identifier`][rl] 传给 `ModelManager#getItemModel`，取得关联的 [`ItemModel`][itemmodels]。对于 BlockState Pipeline，可以把 `BlockState` 传给 `ModelManager.getBlockStateModelSet().get()`，取得关联的 `BlockStateModel`。模组基本总会复用此前自动加载并 Bake 的 Model。

## 通用 Model 和 Geometry

基础 Model JSON（位于 `assets/<namespace>/models`）会反序列化为 `UnbakedModel`。`UnbakedModel` 通常距 Bake 后的输出只差一步，包含通用属性的某种形式。其中最重要的是通过 `UnbakedModel#geometry` 提供的 `UnbakedGeometry`，它表示将成为 `BakedQuad` 的数据。这些 Quad 最终通过调用 `UnbakedGeometry#bake` 内联到 Item Model 和 BlockState Model 中。该方法通常构造一个 `QuadCollection`，其中包含可随时渲染或仅在给定方向未被剔除时渲染的 `BakedQuad` 列表。在建模程序（以及多数其他游戏）中，Quad 对应 Triangle；但 Minecraft 主要围绕方形设计，因此开发者选择使用 Quad（4 个 Vertex）而不是 Triangle（3 个 Vertex）进行渲染。

`UnbakedModel` 包含供 [BlockState Definition][bsd]、[Item Model][itemmodelsection] 或二者使用的信息。例如，`useAmbientOcclusion` 仅由 BlockState Definition 使用，`guiLight` 和 `transforms` 仅由 Item Model 使用，而 `textureSlots` 和 `parent` 则由二者使用。

Bake 期间，每个 `UnbakedModel` 都包装在 `ResolvedModel` 中，由 Item 或 BlockState 的 `ModelBaker` 获取。顾名思义，`ResolvedModel` 是所有遗留引用均已解析的 `UnbakedModel`。随后，可以通过 `getTop*` 方法取得关联数据；这些方法会根据当前 Model 及其 Parent 计算属性和 Geometry。通常在此调用 `ResolvedModel#bakeTopGeometry`，将 `ResolvedModel` Bake 为 `QuadCollection`。

## BlockState Definition

BlockState Definition JSON（位于 `assets/<namespace>/blockstates`）会针对每个 `BlockState` 编译并 Bake 为 `BlockStateModel`。创建 `BlockStateModel` 的过程如下：

- 加载期间：
    - BlockState Definition JSON 加载为 `BlockStateModel.UnbakedRoot`。该 Root 是通用共享缓存系统，用于把 `BlockState` 连接到一组 `BlockStateModel`。
    - `BlockStateModel.UnbakedRoot` 加载 `BlockStateModel.Unbaked`，并准备将其连接到相应 `BlockState`。
    - `BlockStateModel.Unbaked` 加载其 `BlockStateModelPart.Unbaked`；后者用于取得通用 `UnbakedModel`（更确切地说是 `ResolvedModel`）。
- Bake 期间：
    - 针对每个 `BlockState` 调用 `BlockStateModel.UnbakedRoot#bake`。
    - 针对给定 `BlockState` 调用 `BlockStateModel.Unbaked#bake`，创建 `BlockStateModel`。
    - 对 `BlockStateModel` 内的 Model Part 调用 `BlockStateModelPart.Unbaked#bake`，将 `ResolvedModel` 内联为 `QuadCollection`，默认还会取得 Ambient Occlusion 设置、Particle Icon 和 Render Type。

`BlockStateModel` 中最重要的方法是 `collectParts`，它负责把要渲染的 `BlockStateModelPart` 追加到列表。请记住，每个 `BlockStateModelPart` 都通过 `BlockStateModelPart#getQuads` 包含自己的 `BakedQuad` 列表；随后该列表会上传到 Vertex Consumer 并渲染。`collectParts` 有五个参数：

- `BlockAndTintGetter`：渲染 `BlockState` 所在 Level 的表示。
- `BlockPos`：Block 的渲染位置。
- `BlockState`：正在渲染的 [BlockState][blockstate]。可以为 null，表示正在渲染 Item。
- `RandomSource`：可用于随机化的客户端 Random Source。
- `List<BlockStateModelPart>`：用于接收待渲染 Part 的列表。

### Model Data

有时，`BlockStateModel` 可能依赖 `BlockEntity`，以决定在 `collectParts` 中选择哪些 `BlockStateModelPart`。NeoForge 提供 `ModelData` 系统，用于同步并传递来自 `BlockEntity` 的数据。为此，`BlockEntity` 必须实现 `getModelData` 并返回要同步的数据。随后可调用 `BlockEntity#requestModelDataUpdate` 将数据发送到客户端。在 `collectParts` 中，可以使用 `BlockPos` 对 `BlockAndTintGetter` 调用 `getModelData` 来取得数据。

## Item Model

[客户端 Item][clientitem] JSON（位于 `assets/<namespace>/items`）会针对给定 `Item` 编译并 Bake 为 `ItemModel`，供 `ItemStack` 使用。创建 `ItemModel` 的过程如下：

- 加载期间：
    - 客户端 Item JSON 加载为 `ClientItem`，它保存 Item Model 以及渲染方式的一些通用属性。
    - `ClientItem` 加载 `ItemModel.Unbaked`。
- Bake 期间：
    - 针对每个 `Item` 调用 `ItemModel.Unbaked#bake`，将 `ResolvedModel` 内联为 `List<BakedQuad>`，并取得一些通用 `ModelRenderProperties`；如果 `Item` 是 `BlockItem`，还会取得 Render Type。

Item 渲染相关信息参见[手动渲染 Item][itemmodels] 一节。

### 视角

Minecraft 渲染引擎共识别 8 种 Item 渲染视角类型（若包含代码中的 Fallback 则为 9 种）。它们用于 Model JSON 的 `display` 块，在代码中由 `ItemDisplayContext` enum 表示。通常从 `UnbakedModel` 传入 `ItemModel` 的 `ModelRenderProperties`，再通过 `ModelRenderProperties#applyToLayer` 应用于 `ItemStackRenderState`。

| Enum 值                | JSON 键                  | 用途                                                                                                            |
|---------------------------|---------------------------|------------------------------------------------------------------------------------------------------------------|
| `THIRD_PERSON_RIGHT_HAND` | `"thirdperson_righthand"` | 第三人称右手（F5 视角或其他玩家）                                                        |
| `THIRD_PERSON_LEFT_HAND`  | `"thirdperson_lefthand"`  | 第三人称左手（F5 视角或其他玩家）                                                         |
| `FIRST_PERSON_RIGHT_HAND` | `"firstperson_righthand"` | 第一人称右手                                                                                       |
| `FIRST_PERSON_LEFT_HAND`  | `"firstperson_lefthand"`  | 第一人称左手                                                                                        |
| `HEAD`                    | `"head"`                  | 位于玩家头部 Armor Slot 时（通常只能通过命令实现）                                          |
| `GUI`                     | `"gui"`                   | Inventory、玩家 Hotbar                                                                                       |
| `GROUND`                  | `"ground"`                | 掉落 Item；其旋转由掉落 Item Renderer 而非 Model 处理 |
| `FIXED`                   | `"fixed"`                 | Item Frame                                                                                                      |
| `ON_SHELF`                | `"on_shelf"`              | 位于 Shelf Block 上                                                                                                      |
| `NONE`                    | `"none"`                  | 代码中的 Fallback，不应在 JSON 中使用                                                            |

NeoForge 允许[扩展][extended] `ItemDisplayContext`，用于自定义渲染调用。模组 `ItemDisplayContext` 可以指定在 Model 未定义 Transform 时使用的 Fallback Transform。其他行为与原版相同。

## 修改 Bake 结果

通常可以在代码中用某种 Delegate 包装现有 BlockState Model 或 ItemStack Model，从而修改它。BlockState Model 提供 `DelegateBlockStateModel`，而 ItemStack Model 没有现成实现。你的实现可以只重写所需方法：

```java
// For block states
public class MyDelegateBlockStateModel extends DelegateBlockStateModel {
    // Pass the original model to super.
    public MyDelegateBlockStateModel(BlockStateModel originalModel) {
        super(originalModel);
    }
    
    // Override whatever methods you want here. You may also access originalModel if needed.
}

// For item models
public class MyDelegateItemModel implements ItemModel {

    private final ItemModel originalModel;

    public MyDelegateItemModel(ItemModel originalModel) {
        this.originalModel = originalModel;
    }

    // Override whatever methods you want here. You may also access originalModel if needed.
    @Override
    public void update(ItemStackRenderState renderState, ItemStack stack, ItemModelResolver resolver, ItemDisplayContext displayContext, @Nullable ClientLevel level, @Nullable ItemOwner owner, int seed
    ) {
        this.originalModel.update(renderState, stack, resolver, displayContext, level, owner, seed);
    }
}
```

编写 Model Wrapper 类后，必须把 Wrapper 应用于应受影响的 Model。请在 [**模组 Event Bus**][modbus] 上为 `ModelEvent.ModifyBakingResult` 编写[客户端][sides][事件处理器][event]：

```java
@SubscribeEvent // on the mod event bus only on the physical client
public static void modifyBakingResult(ModelEvent.ModifyBakingResult event) {
    // For block state models
    event.getBakingResult().blockStateModels().computeIfPresent(
        // The block state of the model to modify.
        MyBlocksClass.EXAMPLE_BLOCK.get().defaultBlockState(),
        // A BiFunction with the location and the original models as parameters, returning the new model.
        (location, model) -> new MyDelegateBakedModel(model);
    );

    // For item models
    event.getBakingResult().itemStackModels().computeIfPresent(
        // The resource location the model to modify.
        // Typically the item registry name; however, can be anything due to the ITEM_MODEL data component
        MyItemsClass.EXAMPLE_ITEM.getKey().identifier(),
        // A BiFunction with the location and the original models as parameters, returning the new model.
        (location, model) -> new MyDelegateItemModel(model);
    );
}
```

:::warning
通常建议尽可能使用[自定义 Model Loader][modelloader]，而不是在 `ModelEvent.ModifyBakingResult` 中包装 Baked Model。自定义 Model Loader 在需要时也可以使用 Delegate Model。
:::

[ao]: https://en.wikipedia.org/wiki/Ambient_occlusion
[ber]: ../../../blockentities/ber.md
[blockstate]: ../../../blocks/states.md
[bsd]: #block-state-definitions
[clientitem]: items.md
[event]: ../../../concepts/events.md
[extended]: ../../../advanced/extensibleenums.md#creating-an-enum-entry
[itemmodels]: items.md#manually-rendering-an-item
[itemmodelsection]: #item-models
[livingentity]: ../../../entities/livingentity.md
[modbus]: ../../../concepts/events.md#event-buses
[modelloader]: modelloaders.md
[rl]: ../../../misc/identifier.md
[perspective]: #perspectives
[rendertype]: index.md#render-types
[sides]: ../../../concepts/sides.md
