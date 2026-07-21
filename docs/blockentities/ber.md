# 方块实体渲染器（BlockEntityRenderer）

`BlockEntityRenderer` 通常缩写为 BER，用于以[静态 baked model][model]（JSON、OBJ 等）无法表示的方式“渲染”[Block][block]。例如，它可用于动态渲染类似箱子的 Block 中的容器内容。Block entity renderer 要求 Block 拥有 [`BlockEntity`][blockentity]，即使该 Block 除此之外不存储任何数据。

BER 直接实现 `BlockEntityRenderer`，由它提交要渲染的 [feature]：

```java
// The generic type in the superinterface should be set to what block entity
// you are trying to render, along with its extracted render state. More on this below.
public class MyBlockEntityRenderer implements BlockEntityRenderer<MyBlockEntity, MyBlockEntityRenderState> {

    public MyBlockEntityRenderer(BlockEntityRendererProvider.Context context) {
        // Get whatever is necessary from the context
    }

    // Tell the renderer how to create a new render state.
    @Override
    public MyBlockEntityRenderState createRenderState() {
        return new MyBlockEntityRenderState();
    }

    // Update the render state by copying the needed values from the passed block entity
    // to the passed render state.
    // The block entity and render state are the generic types passed to the renderer
    @Override
    public void extractRenderState(MyBlockEntity blockEntity, MyBlockEntityRenderState renderState, float partialTick, Vec3 cameraPos, @Nullable ModelFeatureRenderer.CrumblingOverlay crumblingOverlay) {
        // Always call super or `BlockEntityRenderState#extractBase`
        super.extractRenderState(blockEntity, renderState, partialTick, cameraPos, crumblingOverlay);

        // Extract and store any additional values in the state here.
        renderState.value = blockEntity.getValue();
    }

    // Actually submit the features of the block entity to render.
    // The first parameter matches the render state's generic type.
    @Override
    public void submit(MyBlockEntityRenderState renderState, PoseStack poseStack, SubmitNodeCollector collector, CameraRenderState cameraState) {
        // Submit using the collector here.
    }
}
```

有了 BER 后，还需要注册它并将其连接到所属 BlockEntity。这可在 [`EntityRenderersEvent.RegisterRenderers`][event] 中完成：

```java
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerEntityRenderers(EntityRenderersEvent.RegisterRenderers event) {
    event.registerBlockEntityRenderer(
            // The block entity type to register the renderer for.
            MyBlockEntities.MY_BLOCK_ENTITY.get(),
            // A function of BlockEntityRendererProvider.Context to BlockEntityRenderer.
            MyBlockEntityRenderer::new
    );
}
```

:::info

如果 BER 中不需要 provider context，也可以移除构造器：

```java
public class MyBlockEntityRenderer implements BlockEntityRenderer<MyBlockEntity, MyBlockEntityRenderState> {
    
    // ...
}

// In some event handler class
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerEntityRenderers(EntityRenderersEvent.RegisterRenderers event) {
    event.registerBlockEntityRenderer(MyBlockEntities.MY_BLOCK_ENTITY.get(),
            // Pass the context to an empty (default) constructor call
            context -> new MyBlockEntityRenderer()
    );
}
```

:::

## Block Entity Render State

如上例所述，block entity render state 用于从实际 BlockEntity 的值中提取渲染所需的值。它们本质上是继承自 `BlockEntityRenderState` 的可变数据存储对象：

```java
public class MyBlockEntityRenderState extends BlockEntityRenderState {
    public boolean value;
}
```

随后应在 `BlockEntityRenderer#extractRenderState` 中使用 `BlockEntity` 子类填充这些值。

## Item Block 渲染

由于并非所有带 renderer 的 BlockEntity 都能通过静态 Item model 表示，可以创建一种特殊 renderer，以便更动态地控制该过程。具体使用 [`SpecialModelRenderer`][special] 完成。在这些情况下，既必须创建一个 special model renderer 来提交所需 [feature]，也必须注册对应的 special block model renderer，以处理提交 Block 本身而非其 Item 变体进行渲染的场景（例如末影人携带 Block）。

更多信息请参阅[客户端 Item 文档][special]。

[block]: ../blocks/index.md
[blockentity]: index.md
[event]: ../concepts/events.md#注册事件处理器
[features]: ../rendering/feature.md
[item]: ../items/index.md
[model]: ../resources/client/models/index.md
[special]: ../resources/client/models/items.md#special-models
