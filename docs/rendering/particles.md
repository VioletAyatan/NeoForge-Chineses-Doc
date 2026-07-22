# 客户端粒子（Client Particles）

粒子是用于打磨游戏观感、增强沉浸感的视觉效果。由于它们主要用于视觉呈现，关键部分仅存在于物理（以及逻辑）客户端[一侧][side]。

本文介绍粒子中与渲染有关的内容。通常用于生成粒子的粒子类型，以及可以指定粒子 sprite 的粒子描述，请参阅配套的[粒子类型][particletype]文章。

## `Particle` 类

`Particle` 定义在世界中生成并显示给玩家的对象在客户端上的表现。大多数属性和基础物理行为由 `gravity`、`lifetime`、`hasPhysics`、`friction` 等字段控制。通常需要重写的方法只有 `tick` 和 `move`，二者的作用正如名称所示。因此，大部分自定义粒子的代码都很短，通常只有一个设置所需字段的构造器，偶尔再重写这两个方法。

构造粒子最常见的两种方式，一种是继承 `SingleQuadParticle` 或其实现（例如 `SimpleAnimatedParticle`），把始终面向视角的纹理绘制到屏幕；另一种是直接继承 `Particle`，从而完全控制提交给渲染器的 [Feature][features]。

## 单个四边形

继承 `SingleQuadParticle` 的粒子会把使用某个图集 sprite 的单个四边形绘制到屏幕。该类提供了许多辅助功能，例如通过 `quadSize` 字段或 `scale` 方法设置粒子大小，以及通过 `setColor` 和 `setAlpha` 为纹理着色。不过，对于四边形粒子来说，最重要的两项内容是作为纹理的 `TextureAtlasSprite`，以及决定从何处取得并渲染该 sprite 的 `SingleQuadParticle.Layer`。

首先，`TextureAtlasSprite` 会直接传入构造器；更常见的情况是传入一个 `SpriteSet`，它表示粒子在生命周期中的纹理。最初，sprite 被设置到 protected 字段 `sprite`；在 `tick` 期间，可以分别调用 `setSprite` 或 `setSpriteFromAge` 更新它。

:::tip
如果在粒子构造器中更新了 `age` 或 `lifetime` 字段，应调用 `setSpriteFromAge` 显示正确的纹理。
:::

随后，在 [Feature 提交流程][features]中，`SingleQuadParticle.Layer` 会决定使用哪个图集，以及用哪条 pipeline 把四边形绘制到屏幕。原版默认提供六个 layer：

| Layer | 纹理图集 | 用途 |
|:---:|:---:|:---|
| `OPAQUE_TERRAIN` | Blocks | 使用不透明 Block 纹理的粒子 |
| `TRANSLUCENT_TERRAIN` | Blocks | 使用透明 Block 纹理的粒子 |
| `OPAQUE_ITEMS` | Items | 使用不透明 Item 纹理的粒子 |
| `TRANSLUCENT_ITEMS` | Items | 使用透明 Item 纹理的粒子 |
| `OPAQUE` | Particles | 不透明粒子 |
| `TRANSLUCENT` | Particles | 透明粒子 |

为方便起见，如果使用原版 layer 之一，可以调用 `SingleQuadParticle.Layer#bySprite` 并传入纹理，由它判断粒子应属于哪个 layer。

调用构造器即可轻松创建自定义 layer。

```java
public class MyQuadParticle extends SingleQuadParticle {

    public static final SingleQuadParticle.Layer EXAMPLE_LAYER = new SingleQuadParticle.Layer(
        // 粒子是否具有不完全不透明的纹理。
        true,
        // 用于从纹理图集中获取 sprite。
        // 这应该与 `TextureAtlasSprite#atlasLocation` 匹配。
        TextureAtlas.LOCATION_PARTICLES,
        // 用于绘制粒子的渲染管道。
        // 自定义渲染管道应基于 `RenderPipelines#PARTICLE_SNIPPET`
        // 并指定可用的 uniform 和 sampler。
        RenderPipelines.WEATHER_DEPTH_WRITE
    );

    private final SpriteSet spriteSet;

    // 前四个参数是不言自明的。
    // SpriteSet 或 atlas sprite 通常由提供器传入，见下文。
    // 可按需添加其他参数，例如 xSpeed/ySpeed/zSpeed。
    public MyQuadParticle(ClientLevel level, double x, double y, double z, SpriteSet spriteSet) {
        // 构造器中设置的初始 sprite
        super(level, x, y, z, spriteSet.first());
        this.spriteSet = spriteSet;
        this.gravity = 0; // 我们的粒子现在漂浮在半空中，因为为什么不呢。
    }

    @Override
    public void tick() {
        // 让 super 处理移动逻辑。
        // 如有需要，可以替换为自定义移动逻辑。
        // 如果你只想修改内置运动，你也可以重写 move()。
        super.tick();

        // 根据当前粒子年龄设置 sprite，即推进动画。
        this.setSpriteFromAge(this.spriteSet);
    }

    @Override
    protected abstract SingleQuadParticle.Layer getLayer() {
        // 设置用于获取和提交纹理的图层。
        return EXAMPLE_LAYER;
    }
}
```

:::warning
如果粒子的 `SingleQuadParticle.Layer` 使用 `TextureAtlas#LOCATION_PARTICLES`，该粒子必须拥有对应的[粒子描述][description]，否则粒子所需纹理不会被加入图集。
:::

## ParticleGroup 与 RenderState

如果一个粒子需要比四边形更复杂的结构，就需要拥有自己的 `ParticleGroup<P>`，其中 `P` 是 `Particle` 的类型。`ParticleGroup` 负责 tick 指定的一组 `Particle`，并在 `Particle#isAlive` 返回 false 时将其移除。每个 group 最多可以排队 16,384 个粒子；队列已满时会移除最早的粒子。

```java
// 假设我们有以下粒子类
public class ComplexParticle extends Particle {

    // 你不需要使用这些字段或存储这些值。
    // 由你决定要渲染的内容，并取得
    // 相应的数据。
    private final Model.Simple model;
    private final SpriteId sprite;

    public ComplexParticle(ClientLevel level, double x, double y, double z) {
        super(level, x, y, z);
        this.model = StandingSignRenderer.createSignModel(
            Minecraft.getInstance().getEntityModels(), WoodType.OAK, PlainSignBlock.Attachment.GROUND
        );
        this.sprite = Sheets.getSignSprite(WoodType.OAK);
    }

    public Model.Simple model() {
        return this.model;
    }

    public SpriteId sprite() {
        return this.sprite;
    }
}

// 我们可以像这样创建一个基本粒子组
public class ComplexParticleGroup extends ParticleGroup<ComplexParticle> {

    public ComplexParticleGroup(ParticleEngine engine) {
        super(engine);
    }

    // ...
}
```

`Particle` 加入 `ParticleGroup` 后，会在 [Feature 提交][features]期间通过 `ParticleGroup#extractRenderState` 提取为 `ParticleGroupRenderState`。`ParticleGroupRenderState` 既是包含已提取粒子的 RenderState，也是把粒子元素提交给渲染器的处理器（通过 `#submit`）。

```java
// 粒子组渲染状态
public record ComplexParticleRenderState(List<ComplexParticleRenderState.Entry> entries) implements ParticleGroupRenderState {

    // 每个条目代表组中的一个粒子
    public record Entry(Model.Simple model, SpriteId sprite, PoseStack pose) {}

    @Override
    public void submit(SubmitNodeCollector collector, CameraRenderState camera) {
        // 提交粒子元素进行渲染
        for (ComplexParticleRenderState.Entry entry : this.entries) {
            collector.submitModel(...);
        }
    }
}

// 并且在组中...
public class ComplexParticleGroup extends ParticleGroup<ComplexParticle> {

    // ...

    @Override
    public ParticleGroupRenderState extractRenderState(Frustum frustum, Camera camera, float partialTickTime) {
        // 从粒子中提取渲染状态
        List<ComplexParticleRenderState.Entry> entries = new ArrayList<>();

        for (ComplexParticle particle : this.particles) {
            PoseStack pose = new PoseStack();
            pose.pushPose();
            pose.mulPose(camera.rotation());
            entries.add(new ComplexParticleRenderState.Entry(particle.model(), particle.sprite(), pose));
        }

        return new ComplexParticleRenderState(entries);
    }
}
```

`Particle` 本身不知道自己属于哪个 `ParticleGroup`，`ParticleEngine` 也不知道这个 group 的存在。三者通过 `ParticleRenderType` 关联起来；它是 group 的唯一标识符。`ParticleRenderType` 通过[客户端][side][模组事件总线][modbus]上的 `RegisterParticleGroupsEvent` 与 `ParticleGroup` 关联。随后，`Particle` 可以通过让 `Particle#getGroup` 返回所创建的类型来使用该 group。

```java
// 创建渲染类型
// 传入的字符串应该是字符串化的 `Identifier`
public static final ParticleRenderType COMPLEX = new ParticleRenderType("examplemod:complex");

@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerParticleProviders(RegisterParticleGroupsEvent event) {
    // 将渲染类型链接到粒子组
    event.register(COMPLEX, ComplexParticleGroup::new);
}

public class ComplexParticle extends Particle {

    // ...

    @Override
    public ParticleRenderType getGroup() {
        // 告诉粒子使用粒子组进行渲染
        return COMPLEX;
    }
}
```

## `ParticleProvider`

为某种粒子类型创建粒子后，必须通过 `ParticleProvider` 把粒子类型与粒子关联起来。`ParticleProvider` 是仅客户端类，负责通过 `createParticle` 从 `ParticleEngine` 中实际创建 `Particle`。这里可以包含更复杂的代码，但许多 particle provider 都和下面一样简单：

```java
// ParticleProvider 的泛型类型必须与其所提供的粒子类型一致。
public class MyQuadParticleProvider implements ParticleProvider<SimpleParticleType> {

    // 一组粒子 sprite。
    private final SpriteSet spriteSet;

    // 注册函数传递 SpriteSet，因此我们接受该值并将其存储以供进一步使用。
    // 如果你的粒子不需要 SpriteSet，则可以省略此构造器。
    public MyParticleProvider(SpriteSet spriteSet) {
        this.spriteSet = spriteSet;
    }

    // 每次调用此方法都会返回一个新粒子。
    // 第一个参数的类型与传递给 super 接口的泛型类型匹配。
    @Override
    @Nullable
    public Particle createParticle(SimpleParticleType particleType, ClientLevel level, double x, double y, double z, double xd, double yd, double zd, RandomSource random
    ) {
        // 我们不随机使用类型、速度增量或引擎。
        return new MyQuadParticle(level, x, y, z, this.spriteSet);
    }
}
```

随后，必须在[客户端][side][模组事件总线][modbus]上的 `RegisterParticleProvidersEvent` 中，把 particle provider 与粒子类型关联起来：

```java
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerParticleProviders(RegisterParticleProvidersEvent event) {
    // 注册提供器有多种方式，区别在于第二个参数所接受的函数类型。
    // 例如，#registerSpriteSet 表示 Function<SpriteSet, ParticleProvider<?>>：
    event.registerSpriteSet(MyParticleTypes.MY_QUAD_PARTICLE.get(), MyQuadParticleProvider::new);

    // #registerSpecial 映射到 ParticleProvider<?>。
    // 如果 sprite 不是从粒子描述中取得，应使用此方法。
}
```

:::warning
如果使用 `registerSpriteSet`，粒子类型也必须拥有对应的[粒子描述][description]，否则会抛出异常，提示“Failed to load description”。
:::

[description]: ../resources/client/particles.md
[event]: ../concepts/events.md
[features]: feature.md
[modbus]: ../concepts/events.md#事件总线
[particletype]: ../resources/client/particles.md
[registry]: ../concepts/registries.md#methods-for-registering
[side]: ../concepts/sides.md
