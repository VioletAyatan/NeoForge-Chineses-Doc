# 纹理（Textures）

Minecraft 中的所有纹理都是 PNG 文件，位于某个命名空间的 `textures` 文件夹中。不支持 JPG、GIF 和其他图像格式。引用纹理的 [Identifier][identifiers] 路径通常相对于 `textures` 文件夹；例如，Identifier `examplemod:block/example_block` 指向纹理文件 `assets/examplemod/textures/block/example_block.png`。

纹理尺寸通常应为 2 的幂，例如 16x16 或 32x32。与旧版本不同，现代 Minecraft 原生支持大于 16x16 的 Block 和 Item 纹理。如果你要自行渲染尺寸并非 2 的幂的纹理（例如 GUI 背景），请创建一个尺寸为下一个可用的 2 的幂（通常为 256x256）的空文件，把纹理放在该文件左上角，其余部分留空。随后，可以在使用该纹理的代码中设置实际绘制尺寸。

## 纹理 Metadata

纹理 Metadata 可以在与纹理名称完全相同、但额外带有 `.mcmeta` 后缀的文件中指定。例如，位于 `textures/block/example.png` 的动画纹理需要配套的 `textures/block/example.png.mcmeta` 文件。`.mcmeta` 文件采用以下格式（所有字段均为可选）：

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
        // 设置生成 mipmaps 时使用的策略（使用较低分辨率的纹理）
        // 距离）。
        // 可以是：
        // - `mean`：默认值，平均四个像素之间的颜色。
        // - `cutout`：'mean'，除了所有级别都是从原始纹理生成的
        // 而不是接近的 mipmap，使用阈值将 alpha 值捕捉到 0 或 1
        // 为 0.2。
        // - `strict_cutout`：'cutout'，但 alpha 值使用阈值 0.6 捕捉。
        // - `dark_cutout`：'mean'，只不过周围的像素只包含在
        // 平均值（如果其 alpha 不为 0）。
        "mipmap_strategy": "mean",
        // 在确定像素是否应完全生成时偏移截止 alpha
        // 对于 mipmap 不透明或透明。例如，使用 'cutout' 策略设置为 0.3
        // 将 alpha 值捕捉更改为 0.2 + 0.3 = 0.5。
        "alpha_cutoff_bias": 0.3
    },

    // 用作 GUI sprite的纹理的元数据
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
            // 当 true 时，纹理的中心部分将像这样应用
            // 拉伸类型而不是九片平铺。
            "stretch_inner": true
        }
    },

    // 动画纹理的元数据
    // 见下文
    "animation": {}
}
```

## 动画纹理

Minecraft 原生支持 Block 和 Item 的动画纹理。动画纹理由一个纹理文件构成，其中不同动画阶段依次纵向排列（例如，一个包含 8 个阶段的 16x16 动画纹理，会表示为 16x128 PNG 文件）。

要让它真正产生动画，而不是仅显示为扭曲纹理，纹理 Metadata 中必须存在 `animation` 对象。这个子对象可以为空，也可以包含以下可选条目：

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

