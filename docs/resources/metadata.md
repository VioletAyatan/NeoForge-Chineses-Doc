# 资源元数据（Resource Metadata）

`.mcmeta` 文件扩展名可用于保存游戏中任何客户端资源或服务端数据对象的 JSON 元数据。它最常用于定义包信息以及纹理的应用方式；不过，只要在文件名末尾加上 `.mcmeta`，任何文件都可以使用它（例如，`apple.png` 的资源元数据为 `apple.png.mcmeta`）。

:::info
虽然数据包中的 JSON 对象可以拥有资源元数据，但它不会被使用，因为元数据可以直接放在 JSON 文件本身中。
:::

## 元数据节

JSON 元数据对象划分为多个元数据节（Metadata Section），其中键表示节类型，值是该节的数据。在代码库中，它称为 `MetadataSectionType`，接收一个 `String` 键，以及用于序列化值的 [`Codec`][codec]。

原版和 NeoForge 当前提供以下元数据节：

| Section                          | 类                                                         | 应用于                      | 用途                                                           |
|:--------------------------------:|:-------------------------------------------------------------:|:-----------------------:|:--------------------------------------------------------------|
| `pack`                           | `PackMetadataSection`                                         | `pack.mcmeta`           | [包信息][pack]                                      |
| `features`                       | `FeatureFlagsMetadataSection`                                 | `pack.mcmeta`           | [启用实验性功能][features]                    |
| `filter`                         | `ResourceFilterSection`                                       | `pack.mcmeta`           | 筛选在此包之后应用的包文件             |
| `overlays` / `neoforge:overlays` | `OverlayMetadataSection` / `GeneratingOverlayMetadataSection` | `pack.mcmeta`           | 在给定条件下覆盖到主包之上的子包 |
| `language`                       | `LanguageMetadataSection`                                     | `pack.mcmeta`           | 额外语言，仅供资源包使用                 |
| `animation`                      | `AnimationMetadataSection`                                    | `.png.mcmeta`（纹理） | [动画图集纹理][animation]                          |
| `gui`                            | `GuiMetadataSection`                                          | `.png.mcmeta`（纹理） | [GUI sprite 纹理][texture]                                |
| `texture`                        | `TextureMetadataSection`                                      | `.png.mcmeta`（纹理） | [纹理][texture]                                           |
| `villager`                       | `VillagerMetadataSection`                                     | `.png.mcmeta`（纹理） | 村民帽子可见性                                       |

:::info
主模组 `pack.mcmeta` 不需要 `PackMetadataSection`，因为 NeoForge 会以合成方式生成它。不过，通过 [`AddPackFindersEvent` 模组总线事件][events]添加的任何捆绑包都需要它。
:::

要获取元数据节中的数据，需要访问从 `ResourceManager` 取得的文件 `Resource`，调用 `Resource#metadata` 获取 `ResourceMetadata`，再使用 `MetadataSectionType` 调用 `ResourceMetadata#getSection`。

```java
// 对于某些 `ResourceManager` resourceManager

// 获取最顶层资源的元数据
Optional<AnimationMetadataSection> waterStillMetadata = resourceManager.getResource(
    // Identifier 必须指定底层资源的确切路径。
    Identifier.fromNamespaceAndPath("minecraft", "textures/block/water_still.png")
).flatMap(resource -> {
    try {
        // 获取资源的元数据（如果存在），否则为空可选。
        return resource.metadata().getSection(AnimationMetadataSection.TYPE);
    } catch (IOException e) {
        // 如果尝试读取元数据文件时抛出异常。
        return Optional.empty();
    }
});

// 获取标识符的每个资源的元数据
List<AnimationMetadataSection> waterStillsMetadata = resourceManager.getResourceStack(
    // Identifier 必须指定底层资源的确切路径。
    Identifier.fromNamespaceAndPath("minecraft", "textures/block/water_still.png")
).map(resource -> {
    try {
        // 获取资源的元数据（如果存在），否则为空可选。
        return resource.metadata().getSection(AnimationMetadataSection.TYPE);
    } catch (IOException e) {
        // 如果尝试读取元数据文件时抛出异常。
        return Optional.empty();
    }
}).filter(Optional::isPresent).map(Optional::get);
```

客户端 `ResourceManager` 可以通过 `Minecraft#getResourceManager` 获取。另一方面，服务端除了在 `MinecraftServer#reloadResources` 中，不会公开 `ResourceManager`。使用它的唯一方式是将其作为 `PreparableReloadListener` 的一部分。

### 自定义节

自定义元数据节只需要创建对象、用于序列化和反序列化对象的 `Codec`，以及从 `mcmeta` 读取数据的 `MetadataSectionType`。

```java
public record ExampleMetadataSection(String value) {
    public static final Codec<ExampleMetadataSection> CODEC = Codec.STRING.xmap(ExampleMetadataSection::new, ExampleMetadataSection::value);

    public static final MetadataSectionType<ExampleMetadataSection> TYPE = new MetadataSectionType<>(
        // .mcmeta 中该部分的键应以你的模组 ID 为前缀。
        "examplemod:example_section",
        // 用于序列化和反序列化节数据的编解码器。
        CODEC
    );
}
```

完成后，就可以把该元数据节添加到对象的 `.mcmeta` 中：

```json5
// 在 'assets/examplemod/textures/block/example_block.png.mcmeta'
{
    "examplemod:example_section": "Hello world!"
}
```

并且可以像其他元数据节一样，使用对应类型获取它。

## 数据生成

原版通过 `PackMetadataGenerator` 提供 `pack.mcmeta` 的数据生成。任何其他文件的元数据都需要自定义 `DataProvider`。

### `PackMetadataGenerator`

`PackMetadataGenerator` 用于生成模组或其捆绑子包的 `pack.mcmeta`。元数据节通过 `add` 方法添加，该方法接收 `MetadataSectionType` 及其值。`PackMetadataGenerator` 还提供 `forFeaturePack`，用于生成包含 `PackMetadataSection` 以及可选 `FeatureFlagsMetadataSection` 的 `pack.mcmeta`：

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(PackMetadataGenerator::new)
        // 可以链接多个 `add` 调用。
        .add(
            // 要添加的元数据部分。
            LanguageMetadataSection.TYPE,
            // 元数据部分的值。
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

### 其他资源元数据

其他文件上的资源元数据需要自定义 `DataProvider`：

```java
public class ResourceMetadataProvider implements DataProvider {

    private final PackOutput output;
    private final Map<Path, ResourceMetadata> metadata;

    public ResourceMetadataProvider(PackOutput output) {
        this.output = output;
        this.metadata = new HashMap<>();
    }

    protected void add() {
        // 在此处添加元数据。
        this.textureMetadata(Identifier.fromNamespaceAndPath(
            "examplemod", "block/example_texture"
        ))
            // 可以链接多个 `add` 调用。
            .add(
                // 要添加的元数据部分。
                TextureMetadataSection.TYPE
                // 元数据部分的值。
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
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(ResourceMetadataProvider::new);
}
```

[animation]: client/textures.md#animated-textures
[codec]: ../datastorage/codecs.md
[events]: ../concepts/events.md
[features]: ../advanced/featureflags.md#feature-packs
[pack]: index.md#packmcmeta
[texture]: client/textures.md#纹理元数据

