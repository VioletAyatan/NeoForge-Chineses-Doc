# 模型（Model）

Model 是决定 Block 或 Item 视觉形状和纹理的 JSON 文件。一个 Model 由多个各具尺寸的长方体 Element 组成，每个面都会分配纹理。

Item 使用其[客户端 Item][citems] 定义的关联 Model，Block 则使用 [Blockstate 文件][bsfile]中的关联 Model。这些位置相对于 `models` 目录，因此名为 `examplemod:item/example_model` 的 Model 由 `assets/examplemod/models/item/example_model.json` 中的 JSON 定义。

## 规范

_另请参阅：[Minecraft Wiki][mcwiki] 上的 [Model][mcwikimodel]_

Model 是一种 JSON 文件，其根 Tag 中可包含以下可选属性：

- `loader`：NeoForge 添加。设置自定义 Model Loader。更多信息参见 [Model Loader][custommodelloader]。
- `parent`：设置 Parent Model，使用相对于 `models` 文件夹的 [Resource Location][rl]。所有 Parent 属性会先应用，再由当前 Model 中设置的属性覆盖。常用 Parent 包括：
  - `minecraft:block/block`：所有 Block Model 的通用 Parent。
  - `minecraft:block/cube`：所有使用 1x1x1 Cube Model 的 Model 的 Parent。
  - `minecraft:block/cube_all`：Cube Model 的变体，六个面使用相同纹理，例如 Cobblestone 或 Planks。
  - `minecraft:block/cube_bottom_top`：Cube Model 的变体，四个水平面使用相同纹理，顶部和底部使用独立纹理。常见示例有 Sandstone 或 Chiseled Quartz。
  - `minecraft:block/cube_column`：具有侧面纹理以及底部/顶部纹理的 Cube Model 变体。例如原木、Quartz Pillar 和 Purpur Pillar。
  - `minecraft:block/cross`：使用两个具有相同纹理的平面，一个顺时针旋转 45°，另一个逆时针旋转 45°，从上方看形成 X（名称由此而来）。大多数植物都使用它，例如 Grass、Sapling 和 Flower。
  - `minecraft:item/generated`：经典 2D 平面 Item Model 的 Parent，游戏中大多数 Item 都会使用。由于 Quad 根据纹理生成，因此忽略 `elements` 块。
  - `minecraft:item/handheld`：看起来确实由玩家手持的 2D 平面 Item Model 的 Parent，主要用于 Tool。它是 `item/generated` 的子 Model，因此同样忽略 `elements` 块。
  - `BlockItem` 通常（但并非总是）将其对应的 Block Model 用作 [Item Model][itemmodels]。例如，Cobblestone 客户端 Item 使用 `minecraft:block/cobblestone` Model。
- `ambientocclusion`：是否启用 [Ambient Occlusion][ao]。只对 Block Model 生效，默认为 `true`。如果自定义 Block Model 出现异常阴影，请尝试设为 `false`。
- `gui_light`：可以是 `"front"` 或 `"side"`。`"front"` 表示光线来自正面，适合平面 2D Model；`"side"` 表示光线来自侧面，适合 3D Model（尤其是 Block Model）。默认为 `"side"`，只对 Item Model 生效。
- `textures`：将名称（称为 Material 变量）映射到 `Material` 的子对象。随后可在 [Element][elements] 中使用 Material 变量。也可以在 Element 中声明但不赋值，以便由 Child Model 指定。
  - `sprite`：[纹理位置][textures]。
  - `force_translucent`：为 `true` 时，强制应用该纹理的 Face 在 `translucent` Layer 中渲染。为 `false` 时：
    - 如果纹理仅有不透明 Pixel（Alpha `255`），Face 在 `solid` Layer 中渲染
    - 如果纹理 Pixel 仅有不透明或完全透明两种情况（Alpha 为 `0` 或 `255`），Face 在 `cutout` Layer 中渲染
    - 否则，Face 在 `translucent` Layer 中渲染

:::tip
Block Model 还应指定 `particle` 纹理。在 Block 上跌落、跑过或破坏 Block 时会使用此纹理。

Item Model 也可以使用名为 `layer0`、`layer1` 等的 Layer 纹理；索引较高的 Layer 会渲染在索引较低的 Layer 上方（例如 `layer1` 渲染在 `layer0` 上方）。这仅在 Parent 为 `item/generated` 时生效，并且最多支持 5 层（`layer0` 至 `layer4`）。
:::

- `elements`：长方体 [Element][elements] 的列表。
- `display`：保存不同[视角][perspectives]显示选项的子对象；可用键参见链接文章。只对 Item Model 生效，但通常会在 Block Model 中指定，以便 Item Model 继承显示选项。每个视角都是可选子对象，可按以下顺序包含选项：
  - `translation`：Model 的平移，指定为 `[x, y, z]`。
  - `rotation`：Model 的旋转，指定为 `[x, y, z]`。
  - `scale`：Model 的缩放，指定为 `[x, y, z]`。
  - `right_rotation`：NeoForge 添加。在缩放后应用的第二次旋转，指定为 `[x, y, z]`。
- `transform`：参见 [Root Transform][roottransforms]。

:::tip
如果难以确定某项内容的具体写法，可以查看实现类似效果的原版 Model。
:::

### Element

Element 是长方体对象的 JSON 表示，具有以下属性：

- `from`：长方体起始角的坐标，指定为 `[x, y, z]`，单位为 Block 的 1/16。例如，`[0, 0, 0]` 是“左下”角，`[8, 8, 8]` 是中心，`[16, 16, 16]` 是 Block 的“右上”角。
- `to`：长方体结束角的坐标，指定为 `[x, y, z]`。与 `from` 一样，单位为 Block 的 1/16。

:::tip
Minecraft 将 `from` 和 `to` 的值限制在 `[-16, 32]` 范围内。不过，强烈不建议超出 `[0, 16]`，否则会产生光照和/或剔除问题。
:::

- `neoforge_data`：参见[额外 Face 数据][extrafacedata]。
- `faces`：包含最多 6 个 Face 数据的对象，分别名为 `north`、`south`、`east`、`west`、`up` 和 `down`。每个 Face 包含以下数据：
  - `uv`：Face 的 UV，指定为 `[u1, v1, u2, v2]`，其中 `u1, v1` 是左上 UV 坐标，`u2, v2` 是右下 UV 坐标。
  - `texture`：Face 使用的纹理。必须是以 `#` 为前缀的 Texture 变量。例如，如果 Model 有名为 `wood` 的纹理，应使用 `#wood` 引用。技术上可选，缺失时使用 Missing Texture。
  - `rotation`：可选。将纹理顺时针旋转 90、180 或 270 度。
  - `cullface`：可选。指定方向存在与它接触的完整 Block 时，指示渲染引擎跳过该 Face。方向可为 `north`、`south`、`east`、`west`、`up` 或 `down`。
  - `tintindex`：可选。指定可由 Color 处理器使用的 Tint Index；更多信息参见[着色][tinting]。默认为 -1，表示不着色。
  - `neoforge_data`：参见[额外 Face 数据][extrafacedata]。

此外，还可以指定以下可选属性：

- `shade`：仅供 Block Model 使用。可选。此 Element 的 Face 是否应有依赖方向的阴影，默认为 true。
- `rotation`：对象旋转，指定为包含以下数据的子对象：
  - `angle`：旋转角度，单位为度。
  - `axis`：旋转所围绕的轴。目前无法让对象同时围绕多个轴旋转。
  - `origin`：可选。旋转所围绕的原点，指定为 `[x, y, z]`。注意这些是绝对值，不相对于 Cube 位置。未指定时使用 `[0, 0, 0]`。

#### 额外 Face 数据

额外 Face 数据（`neoforge_data`）既可应用于 Element，也可应用于 Element 的单个 Face。在所有可用上下文中都是可选的。如果同时指定 Element 级和 Face 级额外 Face 数据，Face 级数据会覆盖 Element 级数据。可以指定：

- `color`：用给定颜色为 Face 着色。必须是 ARGB 值，可以指定为 String 或十进制 Integer（JSON 不支持十六进制字面量）。默认为 `0xFFFFFFFF`。颜色值固定时，可用它替代 Tint。
- `block_light`：覆盖该 Face 使用的 Block Light 值，默认为 0。
- `sky_light`：覆盖该 Face 使用的 Sky Light 值，默认为 0。
- `ambient_occlusion`：禁用或启用该 Face 的 Ambient Occlusion，默认为 Model 中设置的值。

### Root Transform

在 Model 顶层添加 `transform` 属性，会通知 Loader 在应用 [Blockstate 文件][bsfile]中的旋转（Block Model）或 `display` 块中的 Transform（Item Model）之前，对全部 Geometry 应用一次 Transform。此功能由 NeoForge 添加。

Root Transform 有两种指定方式。第一种是使用名为 `matrix` 的单个属性，其中以嵌套 JSON 数组形式包含 3x4 Transform Matrix（Row-major，省略最后一行）。Matrix 按顺序由平移、左旋转、缩放、右旋转和 Transform Origin 组合而成。示例：

```json5
{
    // ...
    "transform": {
        "matrix": [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]
    }
}
```

第二种方式是指定一个 JSON 对象，其中包含以下条目的任意组合，并按所列顺序应用：

- `translation`：相对平移，指定为三维 Vector（`[x, y, z]`），缺失时默认为 `[0, 0, 0]`。
- `rotation` 或 `left_rotation`：缩放前，围绕平移后原点应用的旋转。默认为不旋转。可通过以下方式之一指定：
  - 将单个轴映射到旋转的 JSON 对象，例如 `{"x": 90}`
  - JSON 对象数组，每个对象将单个轴映射到旋转，并按指定顺序应用，例如 `[{"x": 90}, {"y": 45}, {"x": -22.5}]`
  - 包含三个值的数组，分别指定围绕各轴的旋转，例如 `[90, 45, -22.5]`
  - 包含四个值、直接指定 Quaternion 的数组，例如 `[0.38268346, 0, 0, 0.9238795]`（围绕 X 轴旋转 45 度）
- `scale`：相对于平移后原点的缩放，指定为三维 Vector（`[x, y, z]`），缺失时默认为 `[1, 1, 1]`。
- `post_rotation` 或 `right_rotation`：缩放后围绕平移后原点应用的旋转。默认为不旋转，指定方式与 `rotation` 相同。
- `origin`：用于旋转和缩放的原点。Transform 最后也会移动到此处。可指定为三维 Vector（`[x, y, z]`），或三个内置值之一：`"corner"`（`[0, 0, 0]`）、`"center"`（`[0.5, 0.5, 0.5]`）、`"opposing-corner"`（`[1, 1, 1]`，默认值）。

## Blockstate 文件

_另请参阅：[Minecraft Wiki][mcwiki] 上的 [Blockstate 文件][mcwikiblockstate]_

游戏使用 Blockstate 文件为不同 [BlockState][blockstates] 分配不同 Model。每个注册到游戏的 Block 必须恰好有一个 Blockstate 文件。为 BlockState 指定 Block Model 有三种互斥方式：Variant、Multipart 或 NeoForge 添加的 Definition Type。

`variants` 块中，每个 BlockState 对应一个 Element。这是关联 BlockState 与 Model 的主要方式，绝大多数 Block 都使用它。

- 键是不含 Block 名称的 BlockState String 表示，例如未含水上半 Slab 为 `"type=top,waterlogged=false"`，无 Property 的 Block 为 `""`。未使用的 Property 可以省略。例如，如果 `waterlogged` Property 不影响所选 Model，`type=top,waterlogged=false` 和 `type=top,waterlogged=true` 两个对象可合并为一个 `type=top` 对象。这也意味着空 String 对每个 Block 都有效。
- 值是单个 Model Object 或 Model Object 数组。使用数组时，会随机选择一个 Model。Model Object 包含：
  - `type`：NeoForge 添加。设置自定义 BlockState Model Loader。更多信息参见 [BlockState Model Loader][bsmmodelloader]。
  - `model`：Model 文件位置的路径，相对于命名空间的 `models` 文件夹，例如 `minecraft:block/cobblestone`。
  - `x` 和 `y`：Model 围绕 x 轴/y 轴的旋转，限制为 90 度的倍数。均为可选，默认为 0。
  - `uvlock`：旋转时是否锁定 Model 的 UV。可选，默认为 false。
  - `weight`：仅对 Model Object 数组有用。给对象分配用于随机选择的权重。可选，默认为 1。

相比之下，`multipart` 块中的 Element 会根据 BlockState Property 组合。该方式主要用于 Fence 和 Wall，它们根据 Boolean Property 启用四个方向 Part。Multipart Element 由 `when` 块和 `apply` 块两部分组成。

- `when` 块指定 BlockState 的 String 表示，或者 Element 生效时必须满足的 Property 列表。列表可命名为 `"OR"` 或 `"AND"`，对其内容执行相应逻辑运算。单个 BlockState 值和列表值都可通过 `|` 分隔多个实际值（例如 `facing=east|facing=west`）。
- `apply` 块指定要使用的 Model Object 或 Model Object 数组。其工作方式与 `variants` 块完全相同。

最后，`neoforge:definition_type` 可以指定用于注册 BlockState 文件的自定义 Model Loader。更多信息参见 [BlockState Definition Loader][bsdmodelloader]。

## 客户端 Item

游戏使用[客户端 Item][citems] 为 `ItemStack` 的各 State 分配一个或多个 Model。虽然 Model JSON 中有些 Item 专用字段，但客户端 Item 会根据上下文使用 Model 进行渲染，因此大多数信息已移到单独[章节][citems]。

## 着色

Grass 或 Leaves 等 Block 会根据位置和/或 Property 改变纹理颜色。[Model Element][elements] 可以在 Face 上指定 Tint Index，让 Color 处理器处理相应 Face。代码端通过三个事件工作：Block Tint Source、基于 Biome 的 Block Tint（与 Block Tint Source 配合使用）和 Item Tint Source。先看 Block Tint Source：

```java
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerBlockColorHandlers(RegisterColorHandlersEvent.BlockTintSources event) {
    // Parameters are the block's state, the level the block is in, the block's position, and the tint index.
    // The level and position may be null.
    event.register(
        // A list of tint sources to apply to the block. The 'tintindex' defined in
        // the model indexes into the list.
        List.of(
            // For 'tintindex: 0'.
            // Takes in the block's state.
            state -> {
                // Replace with your own calculation. See the BlockColors class for vanilla references.
                // Colors are in ARGB format.
                return 0xFFFFFFFF;
            },
            // For 'tintindex: 1',
            new BlockTintSource() {

                @Override
                public int color(BlockState state) {
                    // The default tint to apply.
                    return 0xFFFFFFFF;
                }

                @Override
                public int colorInWorld(BlockState state, BlockAndTintGetter level, BlockPos pos) {
                    // The tint to apply when the block is in the world.
                    // Defaults to `color` if not overridden.
                    return 0xFFFFFFFF;
                }

                @Override
                public int colorAsTerrainParticle(BlockState state, BlockAndTintGetter level, BlockPos pos) {
                    // The tint to apply when a `TerrainParticle` is spawned.
                    // Defaults to `colorInWorld` if not overridden.
                    return 0xFFFFFFFF;
                }
            }
        ),
        // A varargs of blocks to apply the tinting to
        EXAMPLE_BLOCK.get(), ...
    );
}
```

以下是 Color Resolver 示例：

```java
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerColorResolvers(RegisterColorHandlersEvent.ColorResolvers event) {
    // Parameters are the current biome, the block's X position, and the block's Z position.
    event.register((biome, x, z) -> {
        // Replace with your own calculation. See the BiomeColors class for vanilla references.
        // Colors are in ARGB format.
        return 0xFFFFFFFF;
    });
}
```

Item Tint 参见客户端 Item 文章中的[相关章节][itemtints]。

## 注册独立 Model

未以某种方式与 Block 或 Item 关联、但其他上下文（例如 [BlockEntity Renderer][ber]）仍需要的 Model，可以通过 `ModelEvent.RegisterStandalone` 注册：

```java
// This can be any type as long as it can be obtained from the ResolvedModel and the ModelBaker
// The generic type should be whatever is the generic type of the UnbakedStandaloneModel<T>
public static final StandaloneModelKey<QuadCollection> EXAMPLE_KEY = new StandaloneModelKey<>(
    new ModelDebugName() {
        @Override
        public String debugName() {
            // A name for the standalone model
            // Can be any string, but it should contain the mod id
            return "examplemod: Example Model";
        }
    }
);



@SubscribeEvent // on the mod event bus only on the physical client
public static void registerAdditional(ModelEvent.RegisterStandalone event) {
    event.register(
        // The model to get
        EXAMPLE_KEY,
        // An UnbakedStandaloneModel<T> we care about, in this case one that returns a QuadCollection
        // Can use the static methods from SimpleUnbakedStandaloneModel<T> for simplicity
        SimpleUnbakedStandaloneModel.quadCollection(
            // The model id, relative to `assets/<namespace>/models/<path>.json`
            Identifier.fromNamespaceAndPath("examplemod", "block/example_unused_model")
        )
    );
}
```

[ao]: https://en.wikipedia.org/wiki/Ambient_occlusion
[ber]: ../../../blockentities/ber.md
[bsfile]: #blockstate-files
[bsdmodelloader]: modelloaders.md#block-state-definition-loaders
[bsmmodelloader]: modelloaders.md#block-state-model-loaders
[custommodelloader]: modelloaders.md#model-loaders
[elements]: #elements
[extrafacedata]: #extra-face-data
[citems]: items.md
[itemtints]: items.md#tinting
[mcwiki]: https://minecraft.wiki
[mcwikiblockstate]: https://minecraft.wiki/w/Tutorials/Models#Block_states
[mcwikimodel]: https://minecraft.wiki/w/Model
[perspectives]: modelsystem.md#perspectives
[roottransforms]: #root-transforms
[rl]: ../../../misc/identifier.md
[textures]: ../textures.md
[tinting]: #tinting
