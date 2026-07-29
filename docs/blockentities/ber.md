# 方块实体渲染器（BlockEntityRenderer）

`BlockEntityRenderer` 通常缩写为 BER，用于以[静态已烘焙模型][model]（JSON、OBJ 等）无法表示的方式“渲染”[方块][block]。例如，它可用于动态渲染类似箱子的方块中的容器内容。方块实体渲染器要求方块拥有 [`BlockEntity`][blockentity]，即使该方块除此之外不存储任何数据。

BER 会直接实现 `BlockEntityRenderer`，并提交要渲染的[渲染特征][features]：

```java
// 接口中的泛型类型应设置为你要渲染的方块实体，
// 以及从中提取出的渲染状态。有关其更多信息请参见下文。
public class MyBlockEntityRenderer implements BlockEntityRenderer<MyBlockEntity, MyBlockEntityRenderState> {

    public MyBlockEntityRenderer(BlockEntityRendererProvider.Context context) {
        // 从上下文中获取必要的内容。
    }

    // 告诉渲染器如何创建新渲染状态。
    @Override
    public MyBlockEntityRenderState createRenderState() {
        return new MyBlockEntityRenderState();
    }

    // 通过把所需值从传入的方块实体复制到传入的渲染状态，
    // 来更新渲染状态。
    // 方块实体和渲染状态是传递给渲染器的泛型类型。
    @Override
    public void extractRenderState(MyBlockEntity blockEntity, MyBlockEntityRenderState renderState, float partialTick, Vec3 cameraPos, @Nullable ModelFeatureRenderer.CrumblingOverlay crumblingOverlay) {
        // 始终调用 super 或 `BlockEntityRenderState#extractBase`。
        super.extractRenderState(blockEntity, renderState, partialTick, cameraPos, crumblingOverlay);

        // 提取任何附加值并将其存储在此处的状态中。
        renderState.value = blockEntity.getValue();
    }

    // 实际提交渲染方块实体所需的 Feature。
    // 第一个参数与渲染状态的泛型类型匹配。
    @Override
    public void submit(MyBlockEntityRenderState renderState, PoseStack poseStack, SubmitNodeCollector collector, CameraRenderState cameraState) {
        // 在此处使用收集器提交。
    }
}
```

有了 BER 后，还需要注册它并将其连接到所属方块实体。这可在 [`EntityRenderersEvent.RegisterRenderers`][event] 中完成：

```java
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerEntityRenderers(EntityRenderersEvent.RegisterRenderers event) {
    event.registerBlockEntityRenderer(
            // 要注册渲染器的方块实体类型。
            MyBlockEntities.MY_BLOCK_ENTITY.get(),
            // 从 BlockEntityRendererProvider.Context 到 BlockEntityRenderer 的函数。
            MyBlockEntityRenderer::new
    );
}
```

:::info

如果 BER 中不需要提供器上下文，也可以移除构造器：

```java
public class MyBlockEntityRenderer implements BlockEntityRenderer<MyBlockEntity, MyBlockEntityRenderState> {
    
    // ...
}

// 在某些事件处理器类中
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerEntityRenderers(EntityRenderersEvent.RegisterRenderers event) {
    event.registerBlockEntityRenderer(MyBlockEntities.MY_BLOCK_ENTITY.get(),
            // 将 context 传给空的（默认）构造器。
            context -> new MyBlockEntityRenderer()
    );
}
```

:::

## 方块实体渲染状态

如上例所述，方块实体渲染状态（Block Entity Render State）用于从实际方块实体的值中提取渲染所需的值。它们本质上是继承自 `BlockEntityRenderState` 的可变数据存储对象：

```java
public class MyBlockEntityRenderState extends BlockEntityRenderState {
    public boolean value;
}
```

随后应在 `BlockEntityRenderer#extractRenderState` 中使用 `BlockEntity` 子类填充这些值。

## 物品方块渲染

物品方块渲染（Item Block Rendering）用于处理方块以物品形式渲染时的表现。由于并非所有带渲染器的方块实体都能通过静态物品模型表示，可以创建一种特殊渲染器，以便更动态地控制该过程。具体使用 [`SpecialModelRenderer`][special] 完成。在这些情况下，既必须创建一个特殊模型渲染器来提交所需[渲染特征][features]，也必须注册对应的特殊方块模型渲染器，以处理提交方块本身而非其物品变体进行渲染的场景（例如末影人携带方块）。

更多信息请参阅[客户端物品文档][special]。

[block]: ../blocks/index.md
[blockentity]: index.md
[event]: ../concepts/events.md#注册事件处理器
[features]: ../rendering/feature.md
[item]: ../items/index.md
[model]: ../resources/client/models/index.md
[special]: ../resources/client/models/items.md#special-model
