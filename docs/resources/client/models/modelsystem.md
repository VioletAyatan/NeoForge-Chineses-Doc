
# 理解模型系统（Understanding the Model System）

Minecraft 中的模型只是附带纹理的 quad 列表。建模流程的每个部分都有独立实现，底层模型 JSON 会反序列化为 `UnbakedModel`。最后，各 pipeline 都接收某个 `List<BakedQuad>` 以及自身所需属性。一些[方块实体渲染器][ber]也会使用这些模型。模型的复杂程度没有限制。

模型存储在 `ModelManager` 中，可通过 `Minecraft.getInstance().getModelManager()` 访问。对于物品 pipeline，可以把 [`Identifier`][rl] 传给 `ModelManager#getItemModel`，取得关联的 [`ItemModel`][itemmodels]。对于方块状态 pipeline，可以把 `BlockState` 传给 `ModelManager.getBlockStateModelSet().get()`，取得关联的 `BlockStateModel`。模组基本总会复用此前自动加载并 bake 的模型。

## 通用模型与几何

基础模型 JSON（位于 `assets/<namespace>/models`）会反序列化为 `UnbakedModel`。`UnbakedModel` 通常距 bake 后的输出只差一步，包含通用属性的某种形式。其中最重要的是通过 `UnbakedModel#geometry` 提供的 `UnbakedGeometry`，它表示将成为 `BakedQuad` 的数据。这些 quad 最终通过调用 `UnbakedGeometry#bake` 内联到物品模型和方块状态模型中。该方法通常构造一个 `QuadCollection`，其中包含可随时渲染或仅在给定方向未被剔除时渲染的 `BakedQuad` 列表。在建模程序（以及多数其他游戏）中，quad 对应 triangle；但 Minecraft 主要围绕方形设计，因此开发者选择使用 quad（4 个 vertex）而不是 triangle（3 个 vertex）进行渲染。

`UnbakedModel` 包含供[方块状态定义][bsd]、[物品模型][itemmodelsection]或二者使用的信息。例如，`useAmbientOcclusion` 仅由方块状态定义使用，`guiLight` 和 `transforms` 仅由物品模型使用，而 `textureSlots` 和 `parent` 则由二者使用。

bake 期间，每个 `UnbakedModel` 都包装在 `ResolvedModel` 中，由物品或方块状态的 `ModelBaker` 获取。顾名思义，`ResolvedModel` 是所有遗留引用均已解析的 `UnbakedModel`。随后，可以通过 `getTop*` 方法取得关联数据；这些方法会根据当前模型及其父级计算属性和几何。通常在此调用 `ResolvedModel#bakeTopGeometry`，将 `ResolvedModel` bake 为 `QuadCollection`。

## 方块状态定义

方块状态定义（Block State Definition）JSON（位于 `assets/<namespace>/blockstates`）会针对每个 `BlockState` 编译并 bake 为 `BlockStateModel`。创建 `BlockStateModel` 的过程如下：

- 加载期间：
    - 方块状态定义 JSON 加载为 `BlockStateModel.UnbakedRoot`。该 root 是通用共享缓存系统，用于把 `BlockState` 连接到一组 `BlockStateModel`。
    - `BlockStateModel.UnbakedRoot` 加载 `BlockStateModel.Unbaked`，并准备将其连接到相应 `BlockState`。
    - `BlockStateModel.Unbaked` 加载其 `BlockStateModelPart.Unbaked`；后者用于取得通用 `UnbakedModel`（更确切地说是 `ResolvedModel`）。
- bake 期间：
    - 针对每个 `BlockState` 调用 `BlockStateModel.UnbakedRoot#bake`。
    - 针对给定 `BlockState` 调用 `BlockStateModel.Unbaked#bake`，创建 `BlockStateModel`。
    - 对 `BlockStateModel` 内的模型部件调用 `BlockStateModelPart.Unbaked#bake`，将 `ResolvedModel` 内联为 `QuadCollection`，默认还会取得环境光遮蔽设置、粒子图标和渲染类型。

`BlockStateModel` 中最重要的方法是 `collectParts`，它负责把要渲染的 `BlockStateModelPart` 追加到列表。请记住，每个 `BlockStateModelPart` 都通过 `BlockStateModelPart#getQuads` 包含自己的 `BakedQuad` 列表；随后该列表会上传到 Vertex Consumer 并渲染。`collectParts` 有五个参数：

- `BlockAndTintGetter`：渲染 `BlockState` 所在 Level 的表示。
- `BlockPos`：方块的渲染位置。
- `BlockState`：正在渲染的[方块状态][blockstate]。可以为 null，表示正在渲染物品。
- `RandomSource`：可用于随机化的客户端 Random Source。
- `List<BlockStateModelPart>`：用于接收待渲染 Part 的列表。

### 模型数据

有时，`BlockStateModel` 可能依赖 `BlockEntity`，以决定在 `collectParts` 中选择哪些 `BlockStateModelPart`。NeoForge 提供模型数据（ModelData）系统，用于同步并传递来自 `BlockEntity` 的数据。为此，`BlockEntity` 必须实现 `getModelData` 并返回要同步的数据。随后可调用 `BlockEntity#requestModelDataUpdate` 将数据发送到客户端。在 `collectParts` 中，可以使用 `BlockPos` 对 `BlockAndTintGetter` 调用 `getModelData` 来取得数据。

## 物品模型

[客户端物品][clientitem] JSON（位于 `assets/<namespace>/items`）会针对给定 `Item` 编译并 bake 为 `ItemModel`，供 `ItemStack` 使用。创建 `ItemModel` 的过程如下：

- 加载期间：
    - 客户端物品 JSON 加载为 `ClientItem`，它保存物品模型以及渲染方式的一些通用属性。
    - `ClientItem` 加载 `ItemModel.Unbaked`。
- bake 期间：
    - 针对每个 `Item` 调用 `ItemModel.Unbaked#bake`，将 `ResolvedModel` 内联为 `List<BakedQuad>`，并取得一些通用 `ModelRenderProperties`；如果 `Item` 是 `BlockItem`，还会取得渲染类型。

物品渲染相关信息参见[手动提交物品进行渲染][itemmodels]一节。

### 视角

Minecraft 渲染引擎共识别 8 种物品渲染视角类型（若包含代码中的 fallback 则为 9 种）。它们用于模型 JSON 的 `display` 块，在代码中由 `ItemDisplayContext` 枚举表示。通常从 `UnbakedModel` 传入 `ItemModel` 的 `ModelRenderProperties`，再通过 `ModelRenderProperties#applyToLayer` 应用于 `ItemStackRenderState`。

| 枚举值                | JSON 键                  | 用途                                                                                                            |
|---------------------------|---------------------------|------------------------------------------------------------------------------------------------------------------|
| `THIRD_PERSON_RIGHT_HAND` | `"thirdperson_righthand"` | 第三人称右手（F5 视角或其他玩家）                                                        |
| `THIRD_PERSON_LEFT_HAND`  | `"thirdperson_lefthand"`  | 第三人称左手（F5 视角或其他玩家）                                                         |
| `FIRST_PERSON_RIGHT_HAND` | `"firstperson_righthand"` | 第一人称右手                                                                                       |
| `FIRST_PERSON_LEFT_HAND`  | `"firstperson_lefthand"`  | 第一人称左手                                                                                        |
| `HEAD`                    | `"head"`                  | 位于玩家头部盔甲槽位时（通常只能通过命令实现）                                          |
| `GUI`                     | `"gui"`                   | 物品栏、玩家快捷栏                                                                                       |
| `GROUND`                  | `"ground"`                | 掉落物品；其旋转由掉落物品渲染器而非模型处理 |
| `FIXED`                   | `"fixed"`                 | 物品展示框                                                                                                      |
| `ON_SHELF`                | `"on_shelf"`              | 位于架子方块上                                                                                                      |
| `NONE`                    | `"none"`                  | 代码中的 fallback，不应在 JSON 中使用                                                            |

NeoForge 允许[扩展][extended] `ItemDisplayContext`，用于自定义渲染调用。模组 `ItemDisplayContext` 可以指定在模型未定义变换时使用的 fallback 变换。其他行为与原版相同。

## 修改烘焙结果

通常可以在代码中用某种 delegate 包装现有方块状态模型或物品堆叠模型，从而修改它。方块状态模型提供 `DelegateBlockStateModel`，而物品堆叠模型没有现成实现。你的实现可以只重写所需方法：

```java
// 对于方块状态
public class MyDelegateBlockStateModel extends DelegateBlockStateModel {
    // 将原始模型传递给 super。
    public MyDelegateBlockStateModel(BlockStateModel originalModel) {
        super(originalModel);
    }
    
    // 在此重写所需的任意方法。如有需要，也可以访问 originalModel。
}

// 对于物品模型
public class MyDelegateItemModel implements ItemModel {

    private final ItemModel originalModel;

    public MyDelegateItemModel(ItemModel originalModel) {
        this.originalModel = originalModel;
    }

    // 在此重写所需的任意方法。如有需要，也可以访问 originalModel。
    @Override
    public void update(ItemStackRenderState renderState, ItemStack stack, ItemModelResolver resolver, ItemDisplayContext displayContext, @Nullable ClientLevel level, @Nullable ItemOwner owner, int seed
    ) {
        this.originalModel.update(renderState, stack, resolver, displayContext, level, owner, seed);
    }
}
```

编写模型包装类后，必须把包装应用于应受影响的模型。请在 [**模组事件总线**][modbus] 上为 `ModelEvent.ModifyBakingResult` 编写[客户端][sides][事件处理器][event]：

```java
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void modifyBakingResult(ModelEvent.ModifyBakingResult event) {
    // 适用于方块状态模型
    event.getBakingResult().blockStateModels().computeIfPresent(
        // 要修改的模型的方块状态。
        MyBlocksClass.EXAMPLE_BLOCK.get().defaultBlockState(),
        // BiFunction，以位置和原始模型为参数，返回新模型。
        (location, model) -> new MyDelegateBakedModel(model);
    );

    // 适用于物品模型
    event.getBakingResult().itemStackModels().computeIfPresent(
        // 要修改的模型的资源位置。
        // 通常为物品注册表名称；但是，由于 ITEM_MODEL 数据组件，可以是任何内容
        MyItemsClass.EXAMPLE_ITEM.getKey().identifier(),
        // BiFunction，以位置和原始模型为参数，返回新模型。
        (location, model) -> new MyDelegateItemModel(model);
    );
}
```

:::warning
通常建议尽可能使用[自定义模型加载器][modelloader]，而不是在 `ModelEvent.ModifyBakingResult` 中包装已烘焙模型。自定义模型加载器在需要时也可以使用 delegate 模型。
:::

[ao]: https://en.wikipedia.org/wiki/Ambient_occlusion
[ber]: ../../../blockentities/ber.md
[blockstate]: ../../../blocks/states.md
[bsd]: #方块状态定义
[clientitem]: items.md
[event]: ../../../concepts/events.md
[extended]: ../../../advanced/extensibleenums.md#创建枚举条目
[itemmodels]: items.md#手动提交物品进行渲染
[itemmodelsection]: #物品模型
[livingentity]: ../../../entities/livingentity.md
[modbus]: ../../../concepts/events.md#事件总线
[modelloader]: modelloaders.md
[rl]: ../../../misc/identifier.md
[perspective]: #视角
[rendertype]: index.md#渲染类型
[sides]: ../../../concepts/sides.md
