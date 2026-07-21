# Particle

Particle 是一种视觉效果，通常使用其关联的 Particle Type 生成。客户端和服务端[两端][side]都可以生成 Particle，但由于它主要是视觉效果，关键部分只存在于物理（和逻辑）客户端。

本文介绍 Particle Type 和 Particle Description 的构造与使用。有关渲染方面的更多信息，请参阅配套的[客户端 Particle][clientparticle] 文章。

## 注册 `ParticleType`

Particle 使用 `ParticleType` 注册。它的工作方式类似 `EntityType` 或 `BlockEntityType`：有一个 `Particle` 类——每个生成的 Particle 都是该类的实例——还有一个保存一些通用信息并用于注册的 `ParticleType` 类。`ParticleType` 是一个 [Registry][registry]，因此我们应像注册其他对象一样，使用 `DeferredRegister` 注册它：

```java
public class MyParticleTypes {
    // Assuming that your mod id is examplemod
    public static final DeferredRegister<ParticleType<?>> PARTICLE_TYPES =
        DeferredRegister.create(BuiltInRegistries.PARTICLE_TYPE, "examplemod");
    
    // The easiest way to add new particle types is reusing vanilla's SimpleParticleType.
    // Implementing a custom ParticleType is also possible, see below.
    public static final Supplier<SimpleParticleType> MY_QUAD_PARTICLE = PARTICLE_TYPES.register(
        // The name of the particle type.
        "my_quad_particle",
        // The supplier. The boolean parameter denotes whether setting the Particles option in the
        // video settings to Minimal will affect this particle type or not; this is false for
        // most vanilla particles, but true for e.g. explosions, campfire smoke, or squid ink.
        () -> new SimpleParticleType(false)
    );
}
```

:::info
只有需要在服务端使用 Particle 时，才需要 `ParticleType`。客户端也可以直接使用 `Particle`。
:::

## 自定义 `ParticleType`

多数情况下 `SimpleParticleType` 已经足够，但有时需要在服务端为 Particle 附加额外数据。这时就需要自定义 `ParticleType` 以及与之关联的自定义 `ParticleOptions`。先从 `ParticleOptions` 开始，因为信息实际保存在其中：

```java
public class MyParticleOptions implements ParticleOptions {
    
    // A map codec defining additional information for the particle, used e.g. in commands.
    // Since there is no information in our type, use a unit map codec;
    // this corresponds to using an empty string in a command.
    public static final MapCodec<MyParticleOptions> CODEC = MapCodec.unit(new MyParticleOptions());

    // Read and write information to the network buffer.
    public static final StreamCodec<ByteBuf, MyParticleOptions> STREAM_CODEC = StreamCodec.unit(new MyParticleOptions());

    // Does not need any parameters, but may define any fields necessary for the particle to work.
    public MyParticleOptions() {}

    @Override
    public ParticleType<?> getType() {
        // Return the registered particle type
    }
}
```

随后，在自定义 `ParticleType` 中使用这个 `ParticleOptions` 实现……

```java
public class MyParticleType extends ParticleType<MyParticleOptions> {
    // The boolean parameter again determines whether to limit particles at lower particle settings.
    // See implementation of the MyParticleTypes class near the top of the article for more information.
    public MyParticleType(boolean overrideLimiter) {
        // Pass the deserializer to super.
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

## Particle Description

Particle Description 是 `assets/<namespace>/particles` 目录中的 JSON 文件。Particle Description 与其关联的 [Particle Type][particletype] 同名，并由相对于 `assets/<namespace>/textures/particles` 的纹理列表组成。

Particle Description 大致如下：

```json5
{
    // A list of textures that will be played in order. Will loop if necessary.
    // Texture locations are relative to the textures/particle folder.
    "textures": [
        // Points to `assets/examplemod/textures/particle/my_particle_0.png`
        "examplemod:my_particle_0",
        "examplemod:my_particle_1",
        "examplemod:my_particle_2",
        "examplemod:my_particle_3"
    ]
}
```

资源重新加载期间，`ParticleResources` 会加载所有 Particle Description，并把纹理拼接进 `TextureAtlas#LOCATION_PARTICLES` Atlas。随后，为每个 Description 创建一个 `SpriteSet`，其中包含指定的 `TextureAtlasSprite` 列表。

### 使用 Description

要让 [Particle][particle] 使用其 Description，必须将 `ParticleType` 与 [`ParticleProvider`][provider] 关联。该 `ParticleProvider` 通过[客户端][side][模组总线][modbus][事件][event] `RegisterParticleProvidersEvent` 接收 `SpriteSet`：

```java
public class MyParticleProvider implements ParticleProvider<SimpleParticleType> {

    private final SpriteSet spriteSet;

    // Take in the sprite set provided by the `ParticleResources`.
    public MyParticleProvider(SpriteSet spriteSet) {
        this.spriteSet = spriteSet;
    }

    // ...
}

// In some client-only event handler

@SubscribeEvent // on the mod event bus only on the physical client
public static void registerParticleProviders(RegisterParticleProvidersEvent event) {
    // #registerSpriteSet MUST be used when dealing with particle descriptions.
    event.registerSpriteSet(MyParticleTypes.MY_PARTICLE.get(), MyParticleProvider::new);
}
```

:::warning
如果为 Particle Type 创建了 Particle Description，却没有通过 `RegisterParticleProvidersEvent#registerSpriteSet` 关联 `ParticleProvider`，日志中会记录“Redundant texture list”消息。
:::

### Datagen

也可以通过扩展 `ParticleDescriptionProvider` 并重写 `#addDescriptions()` 方法，使用 [Datagen][datagen] 生成 Particle Definition 文件：

```java
public class MyParticleDescriptionProvider extends ParticleDescriptionProvider {
    // Get the parameters from `GatherDataEvent.Client`.
    public MyParticleDescriptionProvider(PackOutput output) {
        super(output);
    }

    // Assumes that all the referenced particles actually exists. Replace "examplemod" with your mod id.
    @Override
    protected void addDescriptions() {
        // Adds a single sprite particle definition with the file at
        // assets/examplemod/textures/particle/my_single_particle.png.
        spriteSet(MyParticleTypes.MY_SINGLE_PARTICLE.get(), Identifier.fromNamespaceAndPath("examplemod", "my_single_particle"));
        // Adds a multi sprite particle definition, with a vararg parameter. Alternatively accepts an iterable.
        spriteSet(MyParticleTypes.MY_MULTI_PARTICLE.get(),
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle_0"),
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle_1"),
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle_2")
        );
        // Alternative for the above, appends "_<index>" to the base name given, for the given amount of textures.
        spriteSet(MyParticleTypes.MY_ALT_MULTI_PARTICLE.get(),
            // The base name.
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle"),
            // The number of textures.
            3,
            // Whether to reverse the list, i.e. start at the last element instead of the first.
            false
        );
    }
}
```

不要忘记把 Provider 添加到 `GatherDataEvent.Client`：

```java
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MyParticleDescriptionProvider::new);
}
```

## 生成 Particle

再次提醒，服务端只识别 [`ParticleType`][particletype] 和 [`ParticleOption`s][options]，而客户端直接使用由 `ParticleProvider` 提供、且与 `ParticleType` 关联的 `Particle`。因此，根据所在端不同，生成 Particle 的方式有很大差异。

- **通用代码**：调用 `Level#addParticle` 或 `Level#addAlwaysVisibleParticle`。这是创建所有人都能看到的 Particle 的首选方式。
- **客户端代码**：使用通用代码方式。也可以用所选 Particle 类创建 `new Particle()`，再以该 Particle 调用 `Minecraft.getInstance().particleEngine#add(Particle)`。请注意，以这种方式添加的 Particle 只会对当前客户端显示，其他玩家不可见。
- **服务端代码**：调用 `ServerLevel#sendParticles`。原版 `/particle` 命令使用这种方式。

[clientparticle]: ../../rendering/particles.md
[datagen]: ../index.md#data-generation
[event]: ../../concepts/events.md
[modbus]: ../../concepts/events.md#event-buses
[options]: #custom-particletypes
[particle]: ../../rendering/particles.md
[particletype]: #registering-particletypes
[provider]: ../../rendering/particles.md#particleprovider
[side]: ../../concepts/sides.md
