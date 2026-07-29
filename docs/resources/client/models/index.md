# 模型（Models）

模型是决定方块或物品视觉形状和纹理的 JSON 文件。一个模型由多个各具尺寸的长方体元素（Element）组成，每个面都会分配纹理。

物品使用其[客户端物品][citems]定义的关联模型，方块则使用 [blockstate 文件][bsfile]中的关联模型。这些位置相对于 `models` 目录，因此名为 `examplemod:item/example_model` 的模型由 `assets/examplemod/models/item/example_model.json` 中的 JSON 定义。

## 规范

_另请参阅：[Minecraft Wiki][mcwiki] 上的 [Model][mcwikimodel]_

模型是一种 JSON 文件，其根 Tag 中可包含以下可选属性：

- `loader`：NeoForge 添加。设置自定义模型加载器（Model Loader）。更多信息参见[模型加载器][custommodelloader]。
- `parent`：设置父模型，使用相对于 `models` 文件夹的[资源位置][rl]。所有父级属性会先应用，再由当前模型中设置的属性覆盖。常用父级包括：
  - `minecraft:block/block`：所有方块模型的通用父级。
  - `minecraft:block/cube`：所有使用 1x1x1 立方体模型的模型的父级。
  - `minecraft:block/cube_all`：立方体模型的变体，六个面使用相同纹理，例如圆石或木板。
  - `minecraft:block/cube_bottom_top`：立方体模型的变体，四个水平面使用相同纹理，顶部和底部使用独立纹理。常见示例有砂岩或錾制石英块。
  - `minecraft:block/cube_column`：具有侧面纹理以及底部/顶部纹理的立方体模型变体。例如原木、石英柱和紫珀柱。
  - `minecraft:block/cross`：使用两个具有相同纹理的平面，一个顺时针旋转 45°，另一个逆时针旋转 45°，从上方看形成 X（名称由此而来）。大多数植物都使用它，例如草、树苗和花。
  - `minecraft:item/generated`：经典 2D 平面物品模型的父级，游戏中大多数物品都会使用。由于 quad 根据纹理生成，因此忽略 `elements` 块。
  - `minecraft:item/handheld`：看起来确实由玩家手持的 2D 平面物品模型的父级，主要用于工具。它是 `item/generated` 的子模型，因此同样忽略 `elements` 块。
  - `BlockItem` 通常（但并非总是）将其对应的方块模型用作[物品模型][itemmodels]。例如，圆石客户端物品使用 `minecraft:block/cobblestone` 模型。
- `ambientocclusion`：是否启用[环境光遮蔽][ao]。只对方块模型生效，默认为 `true`。如果自定义方块模型出现异常阴影，请尝试设为 `false`。
- `gui_light`：可以是 `"front"` 或 `"side"`。`"front"` 表示光线来自正面，适合平面 2D 模型；`"side"` 表示光线来自侧面，适合 3D 模型（尤其是方块模型）。默认为 `"side"`，只对物品模型生效。
- `textures`：将名称（称为 material 变量）映射到 `Material` 的子对象。随后可在[元素][elements]中使用 material 变量。也可以在元素中声明但不赋值，以便由子模型指定。
  - `sprite`：[纹理位置][textures]。
  - `force_translucent`：为 `true` 时，强制应用该纹理的面在 `translucent` layer 中渲染。为 `false` 时：
    - 如果纹理仅有不透明像素（alpha `255`），面在 `solid` layer 中渲染
    - 如果纹理像素仅有不透明或完全透明两种情况（alpha 为 `0` 或 `255`），面在 `cutout` layer 中渲染
    - 否则，面在 `translucent` layer 中渲染

:::tip
方块模型还应指定 `particle` 纹理。在方块上跌落、跑过或破坏方块时会使用此纹理。

物品模型也可以使用名为 `layer0`、`layer1` 等的 layer 纹理；索引较高的 layer 会渲染在索引较低的 layer 上方（例如 `layer1` 渲染在 `layer0` 上方）。这仅在父级为 `item/generated` 时生效，并且最多支持 5 层（`layer0` 至 `layer4`）。
:::

- `elements`：长方体[元素][elements]的列表。
- `display`：保存不同[视角][perspectives]显示选项的子对象；可用键参见链接文章。只对物品模型生效，但通常会在方块模型中指定，以便物品模型继承显示选项。每个视角都是可选子对象，可按以下顺序包含选项：
  - `translation`：模型的平移，指定为 `[x, y, z]`。
  - `rotation`：模型的旋转，指定为 `[x, y, z]`。
  - `scale`：模型的缩放，指定为 `[x, y, z]`。
  - `right_rotation`：NeoForge 添加。在缩放后应用的第二次旋转，指定为 `[x, y, z]`。
- `transform`：参见[根变换][roottransforms]。

:::tip
如果难以确定某项内容的具体写法，可以查看实现类似效果的原版模型。
:::

### 元素

元素（Element）是长方体对象的 JSON 表示，具有以下属性：

- `from`：长方体起始角的坐标，指定为 `[x, y, z]`，单位为方块的 1/16。例如，`[0, 0, 0]` 是“左下”角，`[8, 8, 8]` 是中心，`[16, 16, 16]` 是方块的“右上”角。
- `to`：长方体结束角的坐标，指定为 `[x, y, z]`。与 `from` 一样，单位为方块的 1/16。

:::tip
Minecraft 将 `from` 和 `to` 的值限制在 `[-16, 32]` 范围内。不过，强烈不建议超出 `[0, 16]`，否则会产生光照和/或剔除问题。
:::

- `neoforge_data`：参见[额外面数据][extrafacedata]。
- `faces`：包含最多 6 个面数据的对象，分别名为 `north`、`south`、`east`、`west`、`up` 和 `down`。每个面包含以下数据：
  - `uv`：面的 UV，指定为 `[u1, v1, u2, v2]`，其中 `u1, v1` 是左上 UV 坐标，`u2, v2` 是右下 UV 坐标。
  - `texture`：面使用的纹理。必须是以 `#` 为前缀的纹理变量。例如，如果模型有名为 `wood` 的纹理，应使用 `#wood` 引用。技术上可选，缺失时使用 missing texture。
  - `rotation`：可选。将纹理顺时针旋转 90、180 或 270 度。
  - `cullface`：可选。指定方向存在与它接触的完整方块时，指示渲染引擎跳过该面。方向可为 `north`、`south`、`east`、`west`、`up` 或 `down`。
  - `tintindex`：可选。指定可由颜色处理器使用的 tint index；更多信息参见[着色][tinting]。默认为 -1，表示不着色。
  - `neoforge_data`：参见[额外面数据][extrafacedata]。

此外，还可以指定以下可选属性：

- `shade`：仅供方块模型使用。可选。此元素的面是否应有依赖方向的阴影，默认为 true。
- `rotation`：对象旋转，指定为包含以下数据的子对象：
  - `angle`：旋转角度，单位为度。
  - `axis`：旋转所围绕的轴。目前无法让对象同时围绕多个轴旋转。
  - `origin`：可选。旋转所围绕的原点，指定为 `[x, y, z]`。注意这些是绝对值，不相对于立方体位置。未指定时使用 `[0, 0, 0]`。

#### 额外面数据

额外面数据（Extra Face Data，`neoforge_data`）既可应用于元素，也可应用于元素的单个面。在所有可用上下文中都是可选的。如果同时指定元素级和面级额外面数据，面级数据会覆盖元素级数据。可以指定：

- `color`：用给定颜色为面着色。必须是 ARGB 值，可以指定为 string 或十进制 integer（JSON 不支持十六进制字面量）。默认为 `0xFFFFFFFF`。颜色值固定时，可用它替代 tint。
- `block_light`：覆盖该面使用的 block light 值，默认为 0。
- `sky_light`：覆盖该面使用的 sky light 值，默认为 0。
- `ambient_occlusion`：禁用或启用该面的环境光遮蔽，默认为模型中设置的值。

### 根变换

在模型顶层添加 `transform` 属性，会通知加载器在应用 [blockstate 文件][bsfile]中的旋转（方块模型）或 `display` 块中的变换（物品模型）之前，对全部几何应用一次根变换（Root Transform）。此功能由 NeoForge 添加。

根变换有两种指定方式。第一种是使用名为 `matrix` 的单个属性，其中以嵌套 JSON 数组形式包含 3x4 变换矩阵（row-major，省略最后一行）。矩阵按顺序由平移、左旋转、缩放、右旋转和变换原点组合而成。示例：

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

- `translation`：相对平移，指定为三维 vector（`[x, y, z]`），缺失时默认为 `[0, 0, 0]`。
- `rotation` 或 `left_rotation`：缩放前，围绕平移后原点应用的旋转。默认为不旋转。可通过以下方式之一指定：
  - 将单个轴映射到旋转的 JSON 对象，例如 `{"x": 90}`
  - JSON 对象数组，每个对象将单个轴映射到旋转，并按指定顺序应用，例如 `[{"x": 90}, {"y": 45}, {"x": -22.5}]`
  - 包含三个值的数组，分别指定围绕各轴的旋转，例如 `[90, 45, -22.5]`
  - 包含四个值、直接指定 Quaternion 的数组，例如 `[0.38268346, 0, 0, 0.9238795]`（围绕 X 轴旋转 45 度）
- `scale`：相对于平移后原点的缩放，指定为三维 vector（`[x, y, z]`），缺失时默认为 `[1, 1, 1]`。
- `post_rotation` 或 `right_rotation`：缩放后围绕平移后原点应用的旋转。默认为不旋转，指定方式与 `rotation` 相同。
- `origin`：用于旋转和缩放的原点。变换最后也会移动到此处。可指定为三维 vector（`[x, y, z]`），或三个内置值之一：`"corner"`（`[0, 0, 0]`）、`"center"`（`[0.5, 0.5, 0.5]`）、`"opposing-corner"`（`[1, 1, 1]`，默认值）。

## blockstate 文件

_另请参阅：[Minecraft Wiki][mcwiki] 上的 [blockstate 文件][mcwikiblockstate]_

游戏使用 blockstate 文件为不同[方块状态][blockstates]分配不同模型。每个注册到游戏的方块必须恰好有一个 blockstate 文件。为方块状态指定方块模型有三种互斥方式：variant、multipart 或 NeoForge 添加的 definition type。

`variants` 块中，每个方块状态对应一个元素。这是关联方块状态与模型的主要方式，绝大多数方块都使用它。

- 键是不含方块名称的方块状态 string 表示，例如未含水上半台阶为 `"type=top,waterlogged=false"`，无 property 的方块为 `""`。未使用的 property 可以省略。例如，如果 `waterlogged` property 不影响所选模型，`type=top,waterlogged=false` 和 `type=top,waterlogged=true` 两个对象可合并为一个 `type=top` 对象。这也意味着空 string 对每个方块都有效。
- 值是单个模型对象或模型对象数组。使用数组时，会随机选择一个模型。模型对象包含：
  - `type`：NeoForge 添加。设置自定义方块状态模型加载器（Block State Model Loader）。更多信息参见[方块状态模型加载器][bsmmodelloader]。
  - `model`：模型文件位置的路径，相对于命名空间的 `models` 文件夹，例如 `minecraft:block/cobblestone`。
  - `x` 和 `y`：模型围绕 x 轴/y 轴的旋转，限制为 90 度的倍数。均为可选，默认为 0。
  - `uvlock`：旋转时是否锁定模型的 UV。可选，默认为 false。
  - `weight`：仅对模型对象数组有用。给对象分配用于随机选择的权重。可选，默认为 1。

相比之下，`multipart` 块中的元素会根据方块状态 property 组合。该方式主要用于栅栏和墙，它们根据 boolean property 启用四个方向部件。Multipart 元素由 `when` 块和 `apply` 块两部分组成。

- `when` 块指定方块状态的 string 表示，或者元素生效时必须满足的 property 列表。列表可命名为 `"OR"` 或 `"AND"`，对其内容执行相应逻辑运算。单个方块状态值和列表值都可通过 `|` 分隔多个实际值（例如 `facing=east|facing=west`）。
- `apply` 块指定要使用的模型对象或模型对象数组。其工作方式与 `variants` 块完全相同。

最后，`neoforge:definition_type` 可以指定用于注册 blockstate 文件的自定义模型加载器。更多信息参见[方块状态定义加载器][bsdmodelloader]。

## 客户端物品

游戏使用[客户端物品][citems]为 `ItemStack` 的各状态分配一个或多个模型。虽然模型 JSON 中有些物品专用字段，但客户端物品会根据上下文使用模型进行渲染，因此大多数信息已移到单独[章节][citems]。

## 着色

草或树叶等方块会根据位置和/或 property 改变纹理颜色。[模型元素][elements]可以在面上指定 tint index，让颜色处理器处理相应面。代码端通过三个事件工作：方块 tint source、基于生物群系的方块 tint（与方块 tint source 配合使用）和物品 tint source。先看方块 tint source：

```java
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerBlockColorHandlers(RegisterColorHandlersEvent.BlockTintSources event) {
    // 参数依次为方块的状态、方块所在的世界、方块的位置和着色索引。
    // 级别和位置可能是 null。
    event.register(
        // 应用到方块的色调源列表。 'tintindex' 定义于
        // 模型索引到列表中。
        List.of(
            // 对于 'tintindex: 0'。
            // 获取方块的状态。
            state -> {
                // 替换为你自己的计算结果。请参阅 BlockColors 类以获取普通参考。
                // 颜色采用 ARGB 格式。
                return 0xFFFFFFFF;
            },
            // 对于 'tintindex: 1'，
            new BlockTintSource() {

                @Override
                public int color(BlockState state) {
                    // 要应用的默认色调。
                    return 0xFFFFFFFF;
                }

                @Override
                public int colorInWorld(BlockState state, BlockAndTintGetter level, BlockPos pos) {
                    // 当方块位于世界中时要应用的色调。
                    // 如果未覆盖，则默认为 `color`。
                    return 0xFFFFFFFF;
                }

                @Override
                public int colorAsTerrainParticle(BlockState state, BlockAndTintGetter level, BlockPos pos) {
                    // 生成 `TerrainParticle` 时应用的色调。
                    // 如果未覆盖，则默认为 `colorInWorld`。
                    return 0xFFFFFFFF;
                }
            }
        ),
        // 用于应用着色的方块的可变参数
        EXAMPLE_BLOCK.get(), ...
    );
}
```

以下是 Color Resolver 示例：

```java
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerColorResolvers(RegisterColorHandlersEvent.ColorResolvers event) {
    // 参数依次为当前生物群系、方块的 X 坐标和 Z 坐标。
    event.register((biome, x, z) -> {
        // 替换为你自己的计算结果。请参阅 BiomeColors 类以获取普通参考。
        // 颜色采用 ARGB 格式。
        return 0xFFFFFFFF;
    });
}
```

物品 tint 参见客户端物品文章中的[相关章节][itemtints]。

## 注册独立模型

未以某种方式与方块或物品关联、但其他上下文（例如[方块实体渲染器][ber]）仍需要的模型，可以通过 `ModelEvent.RegisterStandalone` 注册：

```java
// 只要能够从 ResolvedModel 和 ModelBaker 获取，就可以使用任意类型
// 泛型类型应与 UnbakedStandaloneModel<T> 的泛型类型一致
public static final StandaloneModelKey<QuadCollection> EXAMPLE_KEY = new StandaloneModelKey<>(
    new ModelDebugName() {
        @Override
        public String debugName() {
            // 独立模型的名称
            // 可以是任何字符串，但应包含模组 ID
            return "examplemod: Example Model";
        }
    }
);



@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerAdditional(ModelEvent.RegisterStandalone event) {
    event.register(
        // 获取的模型
        EXAMPLE_KEY,
        // 所需的 UnbakedStandaloneModel<T>；本例使用返回 QuadCollection 的实现
        // 为简化代码，可以使用 SimpleUnbakedStandaloneModel<T> 的 static 方法
        SimpleUnbakedStandaloneModel.quadCollection(
            // 模型 ID，相对于 `assets/<namespace>/models/<path>.json`
            Identifier.fromNamespaceAndPath("examplemod", "block/example_unused_model")
        )
    );
}
```

[ao]: https://en.wikipedia.org/wiki/Ambient_occlusion
[ber]: ../../../blockentities/ber.md
[bsfile]: #blockstate-文件
[bsdmodelloader]: modelloaders.md#方块状态定义加载器
[bsmmodelloader]: modelloaders.md#方块状态模型加载器
[custommodelloader]: modelloaders.md#模型加载器
[elements]: #元素
[extrafacedata]: #额外面数据
[blockstates]: ../../../blocks/states.md
[citems]: items.md
[itemmodels]: items.md#基础模型
[itemtints]: items.md#着色
[mcwiki]: https://minecraft.wiki
[mcwikiblockstate]: https://minecraft.wiki/w/Tutorials/Models#Block_states
[mcwikimodel]: https://minecraft.wiki/w/Model
[perspectives]: modelsystem.md#视角
[roottransforms]: #根变换
[rl]: ../../../misc/identifier.md
[textures]: ../textures.md
[tinting]: #着色
