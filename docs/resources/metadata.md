# 资源元数据（Resource Metadata）

`.mcmeta` 文件扩展名可用于保存游戏中任何 Asset 或 Data 对象的 JSON Metadata。它最常用于定义 Pack 信息以及纹理的应用方式；不过，只要在文件名末尾加上 `.mcmeta`，任何文件都可以使用它（例如，`apple.png` 的资源 Metadata 为 `apple.png.mcmeta`）。

:::info
虽然 Data Pack 中的 JSON 对象可以拥有资源 Metadata，但它不会被使用，因为 Metadata 可以直接放在 JSON 文件本身中。
:::

## Metadata Section

JSON Metadata 对象划分为多个 Section，其中键表示 Section 类型，值是该 Section 的数据。在代码库中，它称为 `MetadataSectionType`，接收一个 `String` 键，以及用于序列化值的 [`Codec`][codec]。

原版和 NeoForge 当前提供以下 Metadata Section：

| Section                          | 类                                                         | 应用于                      | 用途                                                           |
|:--------------------------------:|:-------------------------------------------------------------:|:-----------------------:|:--------------------------------------------------------------|
| `pack`                           | `PackMetadataSection`                                         | `pack.mcmeta`           | [Pack 信息][pack]                                      |
| `features`                       | `FeatureFlagsMetadataSection`                                 | `pack.mcmeta`           | [启用实验性功能][features]                    |
| `filter`                         | `ResourceFilterSection`                                       | `pack.mcmeta`           | 筛选在此 Pack 之后应用的 Pack 文件             |
| `overlays` / `neoforge:overlays` | `OverlayMetadataSection` / `GeneratingOverlayMetadataSection` | `pack.mcmeta`           | 在给定条件下覆盖到主 Pack 之上的子 Pack |
| `language`                       | `LanguageMetadataSection`                                     | `pack.mcmeta`           | 额外语言，仅供 Resource Pack 使用                 |
| `animation`                      | `AnimationMetadataSection`                                    | `.png.mcmeta`（纹理） | [动画 Atlas 纹理][animation]                          |
| `gui`                            | `GuiMetadataSection`                                          | `.png.mcmeta`（纹理） | [GUI Sprite 纹理][texture]                                |
| `texture`                        | `TextureMetadataSection`                                      | `.png.mcmeta`（纹理） | [纹理][texture]                                           |
| `villager`                       | `VillagerMetadataSection`                                     | `.png.mcmeta`（纹理） | Villager 帽子可见性                                       |

:::info
主模组 `pack.mcmeta` 不需要 `PackMetadataSection`，因为 NeoForge 会以合成方式生成它。不过，通过 [`AddPackFindersEvent` 模组总线事件][events]添加的任何捆绑 Pack 都需要它。
:::

要获取 Metadata Section 中的数据，需要访问从 `ResourceManager` 取得的文件 `Resource`，调用 `Resource#metadata` 获取 `ResourceMetadata`，再使用 `MetadataSectionType` 调用 `ResourceMetadata#getSection`。

```java
// For some `ResourceManager` resourceManager

// Get the metadata for the topmost resource
Optional<AnimationMetadataSection> waterStillMetadata = resourceManager.getResource(
    // Identifier must specify exact path to the backing resource resource.
    Identifier.fromNamespaceAndPath("minecraft", "textures/block/water_still.png")
).flatMap(resource -> {
    try {
        // Get the metadata for the resource if present, otherwise an empty optional.
        return resource.metadata().getSection(AnimationMetadataSection.TYPE);
    } catch (IOException e) {
        // If an exception is thrown trying to read the metadata file.
        return Optional.empty();
    }
});

// Get the metadata of every resource for the identifier
List<AnimationMetadataSection> waterStillsMetadata = resourceManager.getResourceStack(
    // Identifier must specify exact path to the backing resource resource.
    Identifier.fromNamespaceAndPath("minecraft", "textures/block/water_still.png")
).map(resource -> {
    try {
        // Get the metadata for the resource if present, otherwise an empty optional.
        return resource.metadata().getSection(AnimationMetadataSection.TYPE);
    } catch (IOException e) {
        // If an exception is thrown trying to read the metadata file.
        return Optional.empty();
    }
}).filter(Optional::isPresent).map(Optional::get);
```

客户端 `ResourceManager` 可以通过 `Minecraft#getResourceManager` 获取。另一方面，服务端除了在 `MinecraftServer#reloadResources` 中，不会公开 `ResourceManager`。使用它的唯一方式是将其作为 `PreparableReloadListener` 的一部分。

### 自定义 Section

自定义 Metadata Section 只需要创建对象、用于序列化和反序列化对象的 `Codec`，以及从 `mcmeta` 读取数据的 `MetadataSectionType`。

```java
public record ExampleMetadataSection(String value) {
    public static final Codec<ExampleMetadataSection> CODEC = Codec.STRING.xmap(ExampleMetadataSection::new, ExampleMetadataSection::value);

    public static final MetadataSectionType<ExampleMetadataSection> TYPE = new MetadataSectionType<>(
        // The key for the section in the .mcmeta, should be prefixed with your mod id.
        "examplemod:example_section",
        // The codec to serialize and deserialize the section data.
        CODEC
    );
}
```

完成后，就可以把该 Metadata Section 添加到对象的 `.mcmeta` 中：

```json5
// In 'assets/examplemod/textures/block/example_block.png.mcmeta'
{
    "examplemod:example_section": "Hello world!"
}
```

并且可以像其他 Metadata Section 一样，使用对应类型获取它。

## 数据生成

原版通过 `PackMetadataGenerator` 提供 `pack.mcmeta` 的数据生成。任何其他文件的 Metadata 都需要自定义 `DataProvider`。

### `PackMetadataGenerator`

`PackMetadataGenerator` 用于生成模组或其捆绑子 Pack 的 `pack.mcmeta`。Metadata Section 通过 `add` 方法添加，该方法接收 `MetadataSectionType` 及其值。`PackMetadataGenerator` 还提供 `forFeaturePack`，用于生成包含 `PackMetadataSection` 以及可选 `FeatureFlagsMetadataSection` 的 `pack.mcmeta`：

```java
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(PackMetadataGenerator::new)
        // Can chain multiple `add` calls.
        .add(
            // The metadata section to add.
            LanguageMetadataSection.TYPE,
            // The value of the metadata section.
            Map.of(
                "hello_world",
                new LanguageInfo(
                    "Programmer's Land",
                    "Hello world!",
                    false
                )
            )
        );
}
```

### 其他资源 Metadata

其他文件上的资源 Metadata 需要自定义 `DataProvider`：

```java
public class ResourceMetadataProvider implements DataProvider {

    private final PackOutput output;
    private final Map<Path, ResourceMetadata> metadata;

    public ResourceMetadataProvider(PackOutput output) {
        this.output = output;
        this.metadata = new HashMap<>();
    }

    protected void add() {
        // Add metadata here.
        this.textureMetadata(Identifier.fromNamespaceAndPath(
            "examplemod", "block/example_texture"
        ))
            // Can chain multiple `add` calls.
            .add(
                // The metadata section to add.
                TextureMetadataSection.TYPE
                // The value of the metadata section.
                new TextureMetadataSection(
                    true, TextureMetadataSection.DEFAULT_CLAMP, MipmapStrategy.AUTO, TextureMetadataSection.DEFAULT_ALPHA_CUTOFF_BIAS
                )
            ).add(
                ExampleMetadataSection.TYPE,
                new ExampleMetadataSection("Hello world!")
            );
    }

    protected ResourceMetadata textureMetadata(Identifier resource) {
        return this.metadata(
            PackOutput.Target.RESOURCE_PACK,
            "textures",
            resource.withSuffix(".png")
        );
    }

    protected ResourceMetadata metadata(PackOutput.Target type, String directory, Identifier resource) {
        return this.metadata.computeIfAbsent(
            this.output.createPathProvider(type, directory).file(resource, "mcmeta"),
            p -> new ResourceMetadata()
        );
    }

    @Override
    public CompletableFuture<?> run(CachedOutput cache) {
        Executor executor = Util.backgroundExecutor().forName("serializeMetadata");
        return CompletableFuture.allOf(
            this.metadata.entrySet().stream().map(entry -> CompletableFuture.runAsync(() -> {
                    JsonObject result = new JsonObject();
                    entry.getValue().sections().forEach((type, data) -> result.add(type, data.get()));
                    return result;
                }, executor).thenComposeAsync(json -> DataProvider.saveStable(cache, json, entry.getKey()), executor)
            ).toArray(CompletableFuture[]::new)
        );
    }

    @Override
    public final String getName() {
        return "Resource Metadata";
    }

    public record ResourceMetadata(Map<String, Supplier<JsonElement>> sections) {

        public ResourceMetadata() {
            this(new HashMap<>());
        }

        public <T> ResourceMetadata add(MetadataSectionType<T> type, T value) {
            this.sections.put(type.name(), () -> type.codec().encodeStart(JsonOps.INSTANCE, value).getOrThrow(IllegalArgumentException::new).getAsJsonObject());
            return this;
        }
    }
}
```

随后可以把它添加到 `GatherDataEvent`：

```java
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(ResourceMetadataProvider::new);
}
```

[animation]: client/textures.md#animated-textures
[codec]: ../datastorage/codecs.md
[events]: ../concepts/events.md
[features]: ../advanced/featureflags.md#feature-packs
[pack]: index.md#packmcmeta
[texture]: client/textures.md#texture-metadata

