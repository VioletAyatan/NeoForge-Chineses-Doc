# 纹理（Textures）

Minecraft 中的所有纹理都是 PNG 文件，位于某个命名空间的 `textures` 文件夹中。不支持 JPG、GIF 和其他图像格式。引用纹理的[标识符][identifiers]路径通常相对于 `textures` 文件夹；例如，标识符 `examplemod:block/example_block` 指向纹理文件 `assets/examplemod/textures/block/example_block.png`。

纹理尺寸通常应为 2 的幂，例如 16x16 或 32x32。与旧版本不同，现代 Minecraft 原生支持大于 16x16 的方块和物品纹理。如果你要自行渲染尺寸并非 2 的幂的纹理（例如 GUI 背景），请创建一个尺寸为下一个可用的 2 的幂（通常为 256x256）的空文件，把纹理放在该文件左上角，其余部分留空。随后，可以在使用该纹理的代码中设置实际绘制尺寸。

## 纹理元数据

纹理元数据可以在与纹理名称完全相同、但额外带有 `.mcmeta` 后缀的文件中指定。例如，位于 `textures/block/example.png` 的动画纹理需要配套的 `textures/block/example.png.mcmeta` 文件。`.mcmeta` 文件采用以下格式（所有字段均为可选）：

```json5
{
    // 通用纹理的元数据
    "texture": {
        // 如果需要，是否对纹理进行模糊处理。默认为 false。
        // 当前由编解码器指定，但在文件和代码中均未使用。
        "blur": true,
        // 如果需要，是否会夹紧纹理。默认为 false。
        // 当前由编解码器指定，但在文件和代码中均未使用。
        "clamp": true,
        // 设置生成 mipmap 时使用的策略（在远距离使用较低分辨率的纹理）。
        // 可以是：
        // - `mean`：默认值，对四个像素的颜色求平均。
        // - `cutout`：与 `mean` 类似，但所有层级都从原始纹理生成，
        // 而不是从相邻 mipmap 生成，并使用阈值 0.2 将 alpha 值捕捉到 0 或 1。
        // - `strict_cutout`：与 `cutout` 类似，但使用阈值 0.6 捕捉 alpha 值。
        // - `dark_cutout`：与 `mean` 类似，但周围像素只有在 alpha 不为 0 时
        // 才会纳入平均值。
        "mipmap_strategy": "mean",
        // 在判断 mipmap 中某个像素应完全不透明还是完全透明时，
        // 偏移 alpha 截止值。例如，对 `cutout` 策略设置为 0.3，
        // 会把 alpha 捕捉阈值改为 0.2 + 0.3 = 0.5。
        "alpha_cutoff_bias": 0.3
    },

    // 用作 GUI sprite 的纹理元数据。
    "gui": {
        // 指定纹理在需要时如何缩放。可以是以下三个之一：
        "scaling": {
            "type": "stretch" // default
        },
        "scaling": {
            "type": "tile",
            "width": 16,
            "height": 16
        },
        "scaling": {
            // 与 "tile" 类似，但允许指定边界偏移。
            "type": "nine_slice",
            "width": 16,
            "height": 16,
            // 也可能是用作所有四个边的值的单个 int。
            "border": {
                "left": 0,
                "top": 0,
                "right": 0,
                "bottom": 0
            },
            // 为 true 时，纹理中心部分会像 stretch 类型一样拉伸，
            // 而不是进行九宫格平铺。
            "stretch_inner": true
        }
    },

    // 动画纹理的元数据。
    // 见下文。
    "animation": {}
}
```

## 动画纹理

Minecraft 原生支持方块和物品的动画纹理。动画纹理由一个纹理文件构成，其中不同动画阶段依次纵向排列（例如，一个包含 8 个阶段的 16x16 动画纹理，会表示为 16x128 PNG 文件）。

要让它真正产生动画，而不是仅显示为扭曲纹理，纹理元数据中必须存在 `animation` 对象。这个子对象可以为空，也可以包含以下可选条目：

```json5
{
    "animation": {
        // 播放帧的自定义顺序。如果省略，则从上到下播放帧。
        "frames": [1, 0],
        // 切换到下一动画阶段前，每帧持续的帧数。默认为 1。
        "frametime": 5,
        // 是否在动画阶段之间进行插值。默认为 false。
        "interpolate": true,
        // 一个动画舞台的宽度和高度。如果省略，则对这两者使用纹理宽度。
        "width": 12,
        "height": 12
    }
}
```

[identifiers]: ../../misc/identifier.md

