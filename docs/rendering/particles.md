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
        // Whether the particle will have textures that are not fully opaque.
        true,
        // The texture atlas used to get the sprite from.
        // This should match `TextureAtlasSprite#atlasLocation`.
        TextureAtlas.LOCATION_PARTICLES,
        // The render pipeline used to draw the particle.
        // Custom render pipelines should be based from `RenderPipelines#PARTICLE_SNIPPET`
        // to specify the available uniforms and samplers.
        RenderPipelines.WEATHER_DEPTH_WRITE
    );

    private final SpriteSet spriteSet;

    // First four parameters are self-explanatory.
    // The sprite set or atlas sprite are typically given through the provider, see below.
    // Additional parameters can be added as needed, e.g., xSpeed/ySpeed/zSpeed.
    public MyQuadParticle(ClientLevel level, double x, double y, double z, SpriteSet spriteSet) {
        // Initial sprite set in constructor
        super(level, x, y, z, spriteSet.first());
        this.spriteSet = spriteSet;
        this.gravity = 0; // Our particle floats in midair now, because why not.
    }

    @Override
    public void tick() {
        // Let super handle movement.
        // You may replace this with your own movement if needed.
        // You may also override move() if you only want to modify the built-in movement.
        super.tick();

        // Set the sprite for the current particle age, i.e. advance the animation.
        this.setSpriteFromAge(this.spriteSet);
    }

    @Override
    protected abstract SingleQuadParticle.Layer getLayer() {
        // Sets the layer used to get and submit the texture.
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
// Let's assume we have the following particle class
public class ComplexParticle extends Particle {

    // You are not required to use these fields or store these values.
    // It is up to you to determine what you wish to render and get the
    // appropriate data.
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

// We can create a basic particle group like so
public class ComplexParticleGroup extends ParticleGroup<ComplexParticle> {

    public ComplexParticleGroup(ParticleEngine engine) {
        super(engine);
    }

    // ...
}
```

`Particle` 加入 `ParticleGroup` 后，会在 [Feature 提交][features]期间通过 `ParticleGroup#extractRenderState` 提取为 `ParticleGroupRenderState`。`ParticleGroupRenderState` 既是包含已提取粒子的 RenderState，也是把粒子元素提交给渲染器的处理器（通过 `#submit`）。

```java
// The particle group render state
public record ComplexParticleRenderState(List<ComplexParticleRenderState.Entry> entries) implements ParticleGroupRenderState {

    // Each entry represents a particle in the group
    public record Entry(Model.Simple model, SpriteId sprite, PoseStack pose) {}

    @Override
    public void submit(SubmitNodeCollector collector, CameraRenderState camera) {
        // Submit the particle elements to render
        for (ComplexParticleRenderState.Entry entry : this.entries) {
            collector.submitModel(...);
        }
    }
}

// And in the group...
public class ComplexParticleGroup extends ParticleGroup<ComplexParticle> {

    // ...

    @Override
    public ParticleGroupRenderState extractRenderState(Frustum frustum, Camera camera, float partialTickTime) {
        // Extract the render state from the particles
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
// Create the render type
// The string passed in should be a stringified `Identifier`
public static final ParticleRenderType COMPLEX = new ParticleRenderType("examplemod:complex");

@SubscribeEvent // on the mod event bus only on the physical client
public static void registerParticleProviders(RegisterParticleGroupsEvent event) {
    // Link the render type to the particle group
    event.register(COMPLEX, ComplexParticleGroup::new);
}

public class ComplexParticle extends Particle {

    // ...

    @Override
    public ParticleRenderType getGroup() {
        // Tell the particle to render using the particle group
        return COMPLEX;
    }
}
```

## `ParticleProvider`

为某种粒子类型创建粒子后，必须通过 `ParticleProvider` 把粒子类型与粒子关联起来。`ParticleProvider` 是仅客户端类，负责通过 `createParticle` 从 `ParticleEngine` 中实际创建 `Particle`。这里可以包含更复杂的代码，但许多 particle provider 都和下面一样简单：

```java
// The generic type of ParticleProvider must match the type of the particle type this provider is for.
public class MyQuadParticleProvider implements ParticleProvider<SimpleParticleType> {

    // A set of particle sprites.
    private final SpriteSet spriteSet;

    // The registration function passes a SpriteSet, so we accept that and store it for further use.
    // If your particle does not require a SpriteSet, this constructor can be omitted.
    public MyParticleProvider(SpriteSet spriteSet) {
        this.spriteSet = spriteSet;
    }

    // This is where the magic happens. We return a new particle each time this method is called!
    // The type of the first parameter matches the generic type passed to the super interface.
    @Override
    @Nullable
    public Particle createParticle(SimpleParticleType particleType, ClientLevel level, double x, double y, double z, double xd, double yd, double zd, RandomSource random
    ) {
        // We don't use the type, speed deltas, or engine random.
        return new MyQuadParticle(level, x, y, z, this.spriteSet);
    }
}
```

随后，必须在[客户端][side][模组事件总线][modbus]上的 `RegisterParticleProvidersEvent` 中，把 particle provider 与粒子类型关联起来：

```java
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerParticleProviders(RegisterParticleProvidersEvent event) {
    // There are multiple ways to register providers, all differing in the functional type they provide in the
    // second parameter. For example, #registerSpriteSet represents a Function<SpriteSet, ParticleProvider<?>>:
    event.registerSpriteSet(MyParticleTypes.MY_QUAD_PARTICLE.get(), MyQuadParticleProvider::new);

    // #registerSpecial, on the other hand, maps to a ParticleProvider<?>.
    // This should be used if the sprite is not obtained from the particle description.
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
