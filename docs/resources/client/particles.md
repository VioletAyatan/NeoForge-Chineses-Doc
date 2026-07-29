# 粒子（Particles）

粒子（particle）是一种视觉效果，通常使用其关联的粒子类型（Particle Type）生成。客户端和服务端[两端][side]都可以生成粒子，但由于它主要是视觉效果，关键部分只存在于物理（和逻辑）客户端。

本文介绍粒子类型和粒子描述（Particle Description）的构造与使用。有关渲染方面的更多信息，请参阅配套的[客户端粒子][clientparticle]文章。

## 注册 `ParticleType`

粒子使用 `ParticleType` 注册。它的工作方式类似 `EntityType` 或 `BlockEntityType`：有一个 `Particle` 类——每个生成的粒子都是该类的实例——还有一个保存一些通用信息并用于注册的 `ParticleType` 类。`ParticleType` 是一个[注册表][registry]，因此我们应像注册其他对象一样，使用 `DeferredRegister` 注册它：

```java
public class MyParticleTypes {
    // 假设你的模组 ID 是 examplemod
    public static final DeferredRegister<ParticleType<?>> PARTICLE_TYPES =
        DeferredRegister.create(BuiltInRegistries.PARTICLE_TYPE, "examplemod");
    
    // 添加新粒子类型的最简单方法是重用原版的 SimpleParticleType。
    // 也可以实现自定义 ParticleType，请参见下文。
    public static final Supplier<SimpleParticleType> MY_QUAD_PARTICLE = PARTICLE_TYPES.register(
        // 粒子类型的名称。
        "my_quad_particle",
        // 提供器。boolean 参数表示在较低的粒子设置下是否限制该粒子类型；
        // 此处为 false。
        // 大多数原版粒子为 false，但爆炸、营火烟雾或鱿鱼墨汁等粒子为 true。
        () -> new SimpleParticleType(false)
    );
}
```

:::info
只有需要在服务端使用粒子时，才需要 `ParticleType`。客户端也可以直接使用 `Particle`。
:::

## 自定义 `ParticleType`

多数情况下 `SimpleParticleType` 已经足够，但有时需要在服务端为粒子附加额外数据。这时就需要自定义 `ParticleType` 以及与之关联的自定义 `ParticleOptions`。先从 `ParticleOptions` 开始，因为信息实际保存在其中：

```java
public class MyParticleOptions implements ParticleOptions {
    
    // 用于定义粒子附加信息的映射编解码器，例如供命令使用。
    // 由于我们的类型中没有信息，因此使用单元映射编解码器；
    // 这对应于在命令中使用空字符串。
    public static final MapCodec<MyParticleOptions> CODEC = MapCodec.unit(new MyParticleOptions());

    // 向网络缓冲区读写信息。
    public static final StreamCodec<ByteBuf, MyParticleOptions> STREAM_CODEC = StreamCodec.unit(new MyParticleOptions());

    // 不需要任何参数，但可以定义粒子工作所需的任何字段。
    public MyParticleOptions() {}

    @Override
    public ParticleType<?> getType() {
        // 返回注册的粒子类型
    }
}
```

随后，在自定义 `ParticleType` 中使用这个 `ParticleOptions` 实现……

```java
public class MyParticleType extends ParticleType<MyParticleOptions> {
    // boolean 参数同样决定是否在较低的粒子设置下限制该粒子。
    // 有关详细信息，请参阅文章顶部附近的 MyParticleTypes 类的实现。
    public MyParticleType(boolean overrideLimiter) {
        // 将反序列化器传递给 super。
        super(overrideLimiter);
    }

    @Override
    public MapCodec<MyParticleOptions> codec() {
        return MyParticleOptions.CODEC;
    }

    @Override
    public StreamCodec<? super RegistryFriendlyByteBuf, MyParticleOptions> streamCodec() {
        return MyParticleOptions.STREAM_CODEC;
    }
}
```

……并在[注册][registry]时引用它：

```java
public static final Supplier<MyParticleType> MY_CUSTOM_PARTICLE = PARTICLE_TYPES.register(
    "my_custom_particle",
    () -> new MyParticleType(false)
);
```

随后，把已注册的 Particle 传入 `ParticleOptions#getType`：

```java
public class MyParticleOptions implements ParticleOptions {
    
    // ...

    @Override
    public ParticleType<?> getType() {
        return MY_CUSTOM_PARTICLE.get();
    }
}
```

## 粒子描述

粒子描述（Particle Description）是 `assets/<namespace>/particles` 目录中的 JSON 文件。粒子描述与其关联的[粒子类型][particletype]同名，并由相对于 `assets/<namespace>/textures/particles` 的纹理列表组成。

粒子描述大致如下：

```json5
{
    // 将按顺序播放的纹理列表。如果需要的话会循环。
    // 纹理位置相对于 textures/particle 文件夹。
    "textures": [
        // 指向 `assets/examplemod/textures/particle/my_particle_0.png`
        "examplemod:my_particle_0",
        "examplemod:my_particle_1",
        "examplemod:my_particle_2",
        "examplemod:my_particle_3"
    ]
}
```

资源重新加载期间，`ParticleResources` 会加载所有粒子描述，并把纹理拼接进 `TextureAtlas#LOCATION_PARTICLES` atlas。随后，为每个描述创建一个 `SpriteSet`，其中包含指定的 `TextureAtlasSprite` 列表。

### 使用描述

要让[粒子][particle]使用其描述，必须将 `ParticleType` 与 [`ParticleProvider`][provider] 关联。该 `ParticleProvider` 通过[客户端][side][模组事件总线][modbus]上的 `RegisterParticleProvidersEvent` 接收 `SpriteSet`：

```java
public class MyParticleProvider implements ParticleProvider<SimpleParticleType> {

    private final SpriteSet spriteSet;

    // 获取 `ParticleResources` 提供的 SpriteSet。
    public MyParticleProvider(SpriteSet spriteSet) {
        this.spriteSet = spriteSet;
    }

    // ...
}

// 在某些仅限客户端的事件处理器中

@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerParticleProviders(RegisterParticleProvidersEvent event) {
    // 处理粒子描述时必须使用 #registerSpriteSet。
    event.registerSpriteSet(MyParticleTypes.MY_PARTICLE.get(), MyParticleProvider::new);
}
```

:::warning
如果为粒子类型创建了粒子描述，却没有通过 `RegisterParticleProvidersEvent#registerSpriteSet` 关联 `ParticleProvider`，日志中会记录“Redundant texture list”消息。
:::

### 数据生成

也可以通过扩展 `ParticleDescriptionProvider` 并重写 `#addDescriptions()` 方法，使用[数据生成][datagen]生成粒子定义文件：

```java
public class MyParticleDescriptionProvider extends ParticleDescriptionProvider {
    // 从 `GatherDataEvent.Client` 获取参数。
    public MyParticleDescriptionProvider(PackOutput output) {
        super(output);
    }

    // 假设所有引用的粒子实际存在。将 "examplemod" 替换为你的模组 ID。
    @Override
    protected void addDescriptions() {
        // 添加单 sprite 粒子定义，文件位于
        // assets/examplemod/textures/particle/my_single_particle.png.
        spriteSet(MyParticleTypes.MY_SINGLE_PARTICLE.get(), Identifier.fromNamespaceAndPath("examplemod", "my_single_particle"));
        // 添加多 sprite 粒子定义；此重载接受可变参数，另有接受 Iterable 的重载。
        spriteSet(MyParticleTypes.MY_MULTI_PARTICLE.get(),
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle_0"),
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle_1"),
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle_2")
        );
        // 上述的替代方案，对于给定数量的纹理，将 "_<index>" 附加到给定的基本名称。
        spriteSet(MyParticleTypes.MY_ALT_MULTI_PARTICLE.get(),
            // 基本名称。
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle"),
            // 纹理的数量。
            3,
            // 是否反转列表，即从最后一个元素而不是第一个元素开始。
            false
        );
    }
}
```

不要忘记把提供器添加到 `GatherDataEvent.Client`：

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MyParticleDescriptionProvider::new);
}
```

## 生成粒子

再次提醒，服务端只识别 [`ParticleType`][particletype] 和 [`ParticleOption`s][options]，而客户端直接使用由 `ParticleProvider` 提供、且与 `ParticleType` 关联的 `Particle`。因此，根据所在端不同，生成粒子的方式有很大差异。

- **通用代码**：调用 `Level#addParticle` 或 `Level#addAlwaysVisibleParticle`。这是创建所有人都能看到的粒子的首选方式。
- **客户端代码**：使用通用代码方式。也可以用所选 `Particle` 类创建 `new Particle()`，再以该 `Particle` 调用 `Minecraft.getInstance().particleEngine#add(Particle)`。请注意，以这种方式添加的粒子只会对当前客户端显示，其他玩家不可见。
- **服务端代码**：调用 `ServerLevel#sendParticles`。原版 `/particle` 命令使用这种方式。

[clientparticle]: ../../rendering/particles.md
[datagen]: ../index.md#数据生成
[event]: ../../concepts/events.md
[modbus]: ../../concepts/events.md#事件总线
[options]: #自定义-particletype
[particle]: ../../rendering/particles.md
[particletype]: #注册-particletype
[provider]: ../../rendering/particles.md#particleprovider
[side]: ../../concepts/sides.md
