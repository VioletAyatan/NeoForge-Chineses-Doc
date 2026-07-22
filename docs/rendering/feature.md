# 渲染特征（Feature）

渲染 Feature 定义了一组没有烘焙进 Level 几何体的对象，例如 Entity、文本和粒子。这些对象通常具有动态位置，因此下落中或被手持的 Block 和 Item 也属于这一类别。Feature renderer 的作用，是更好地批处理这些对象，并安排它们渲染到屏幕上的顺序。Feature renderer 分为两个阶段：提交阶段收集所有 Feature；渲染阶段渲染已经收集的 Feature。

## 提交 Feature

Feature 的提交通常由负责相应对象的底层子系统处理，例如[负责 Entity 的 `EntityRenderer`][entities]、[负责 BlockEntity 的 `BlockEntityRenderer`][blockentities]、[负责粒子的 `ParticleGroupRenderState`][particles]等。每个子系统都提供自己的 `submit` 方法，通常会接收对象的某种通用渲染状态。随后，必要元素通过 `SubmitNodeCollector` 提交，并存入 `SubmitNodeCollection` tree map，等待渲染。

collector 提供下列方法；它们在表中的顺序，也是最终的渲染顺序：

| 方法 | 说明 |
|:---:|:---|
| `submitShadow` | 按指定半径、位置和不透明度生成若干黑色椭圆。 |
| `submitNameTag` | 文本，按透明度排序。 |
| `submitText` | 文本。 |
| `submitFlame` | 应用于 Entity 的火焰覆盖层。 |
| `submitLeash` | 一个由 24 个分段组成的平面。 |
| `submitModel` | 带有渲染状态的 `Model`，按透明度排序。 |
| `submitModelPart` | `ModelPart`。 |
| `submitMovingBlock` | 一组使用动态光照的 `BlockStateModelPart`。 |
| `submitBlockModel` | 使用烘焙光照的 `BlockStateModel`。 |
| `submitBreakingBlockModel` | `BlockStateModel` 上方的破坏裂纹覆盖层。 |
| `submitItem` | 已拆解的 `ItemStackRenderState`。 |
| `submitCustomGeometry` | 任意方法，用于定义上传到指定 `RenderType` 缓冲区的顶点。 |
| `submitParticleGroup` | 用于缓存并写入一批粒子四边形的 renderer。 |

NeoForge 还添加了 `submitMultiLayerBlockModel`，用于提交一组 `BlockStateModelPart`。它完整支持为每个四边形分别指定渲染类型，而不是把所有四边形都推入同一个类型层。

:::warning
调用方法之后，提交给 collector 的每个元素都应视为不可变。`PoseStack` 等元素会在调用时创建快照，防止后续修改。
:::

严格来说，上述所有方法都属于父接口 `OrderedSubmitNodeCollector`。这是因为 collector 可以把 Feature 分组为不同的“order”；每个 order 表示 renderer 的一次独立 pass。默认情况下，所有 Feature 都在 order 0 上渲染，也就是按照下文定义的渲染顺序绘制。数值较小的 order 会先渲染，数值较大的 order 会后渲染。可以使用 `SubmitNodeCollector#order` 指定元素的绘制顺序：

```java
// 假设我们有一些 SubmitNodeCollector 收集器

// 这将在订单 0 上渲染。
collector.submitModel(...);

// 这将在模型之前渲染。
collector.order(-1).submitBlockModel(...);

// 这将在模型之后渲染。
collector.order(1).submitParticleGroup(...);
```

## 渲染 Feature

Feature 的渲染通过 `FeatureRenderDispatcher` 的 `renderAllFeatures` 处理。该方法会渲染 `SubmitNodeStorage` 中已经提交的对象；这个 storage 保存着 `SubmitNodeCollection` tree map。dispatcher 包含一组 renderer 类，每个类负责渲染一种已经提交的对象。整个顺序分为两个阶段：渲染不透明 Feature，以及渲染透明几何体。

对于不透明 Feature，同一个 order 内按以下顺序渲染：

- Model
- Model part
- Entity 火焰覆盖层
- 拴绳
- Item
- 移动的 Block
- Block Model
- NeoForge 的多层 Block Model
- 自定义几何体
- 粒子

对于透明 Feature，同一个 order 内按以下顺序渲染：

- 阴影
- Model
- Model part
- 名称标签
- 文本
- Item
- 移动的 Block
- Block Model
- NeoForge 的多层 Block Model
- 自定义几何体

透明粒子会在所有透明 Feature 渲染完毕后，通过单独的一次 pass 渲染。

Feature 渲染完成后，`SubmitNodeStorage` 会被清空，以便下次使用。Feature renderer 每帧可能调用多次，因为它不仅用于 Level，还用于手持 Item 和[画中画 GUI renderer][gui]。请注意，在这些情况下，`renderAllFeatures` 之后会调用 `MultiBufferSource.BufferSource#endBatch`，以构建 mesh 并将其绘制到缓冲区。

[blockentities]: ../blockentities/ber.md#blockentityrenderer
[entities]: ../entities/renderer.md#entity-renderers
[gui]: screens.md#picture-in-picture
[particles]: #TODO
