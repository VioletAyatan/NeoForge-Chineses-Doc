# Screen

Screen 通常是 Minecraft 中所有图形用户界面（GUI）的基础：接收用户输入、在服务器上验证输入，并将产生的操作同步回客户端。Screen 可以与 [Menu][menus] 组合，为类似物品栏的视图建立通信网络；也可以独立存在，由 mod 开发者通过自己的[网络][network]实现进行处理。

Screen 由许多部分组成，因此很难直接完整理解 Minecraft 中的“Screen”究竟是什么。本文会先介绍 Screen 的各个组件及其应用方式，再讨论 Screen 本身。

## 渲染 GUI

GUI 渲染分两个阶段进行：提交阶段与渲染阶段。

提交阶段负责收集要渲染到 Screen 的所有元素（例如按钮、文本、Item）。每次提交都会存储在 `GuiRenderState` 中，经过处理后在渲染阶段绘制。原版提供四种元素类型：`GuiElementRenderState`、`GuiItemRenderState`、`GuiTextRenderState` 和 `PictureInPictureRenderState`。以下各节讨论的所有操作都发生在提交阶段，内部会创建上述某种渲染状态。

顾名思义，渲染阶段负责把元素渲染到 Screen。首先，会准备 `PictureInPictureRenderState`、`GuiItemRenderState` 与 `GuiTextRenderState`，并将其处理为 `GuiElementRenderState`。随后对元素排序，最后将其绘制到 Screen。完成后重置 `GuiRenderState`，以供下一个 GUI 或渲染 tick 使用。

### 相对坐标

向渲染状态提交任何内容时，都需要使用坐标指定元素的渲染位置。尽管存在多层抽象，Minecraft 的大多数渲染调用都接受 X、Y 坐标。X 值从左向右增大，Y 值从上向下增大。不过，坐标并不固定在特定范围；其范围会随 Screen 大小及游戏选项中指定的 GUI 缩放而变化。因此，必须特别注意传给渲染调用的坐标值能否随可变的 Screen 大小正确缩放——即正确相对化。

有关如何将坐标相对化的信息，请参阅 [Screen][screen] 一节。

:::caution
如果使用固定坐标或错误缩放 Screen，渲染出的对象可能显得异常或位置错误。检查坐标是否正确相对化的简单方法，是点击视频设置中的“GUI 缩放”按钮。确定 GUI 的渲染缩放比例时，会用该值除以显示器的宽度和高度。
:::

### `GuiGraphicsExtractor`

提交到 `GuiRenderState` 的所有元素通常都通过 `GuiGraphicsExtractor` 处理。提交阶段的几乎每个方法都将 `GuiGraphicsExtractor` 作为第一个参数；它包含用于提交常用渲染对象的方法。

`GuiGraphicsExtractor` 将当前 pose 公开为 `Matrix3x2fStack`，可用于应用任意 XY 变换：

```java
// For some GuiGraphicsExtractor graphics

// Push a new matrix onto the stack
graphics.pose().pushMatrix();

// Apply the transformations you want the element to render with

// Takes in some XY offset
graphics.pose().translate(10, 10);
// Takes in some rotation angle in radians
graphics.pose().rotate((float) Math.PI);
// Takes in some XY scalar
graphics.pose().scale(2f, 2f);

// Submit elements to the `GuiRenderState`
graphics.blitSprite(...);

// Pop the matrix to reset the transformations
graphics.pose().popMatrix();
```

此外，可以使用 `enableScissor` 与 `disableScissor` 将元素裁剪到特定区域：

```java
// For some GuiGraphicsExtractor graphics

// Enable the scissor with the bounds to render within
graphics.enableScissor(
    // The left X coordinate
    0,
    // The top Y coordinate
    0,
    // The right X coordinate
    10,
    // The bottom Y coordinate
    10
);

// Submit elements to the `GuiRenderState`
graphics.blitSprite(...);

// Disable the scissor to reset the rendering area
graphics.disableScissor();
```

### 节点树与层级

向 `GuiRenderState` 提交元素时，并非只是将其加入某个列表。否则，根据提交顺序，有些元素可能会被其他元素完全遮盖。为解决这一问题，元素最初会被分入某个层级中的节点树。元素的排序方式基于其定义的 `ScreenArea#bounds`；如果未定义，就不会提交该元素进行渲染。

`GuiRenderState` 由组成单向链表的 `GuiRenderState.Node` 构成，并使用 `up` 保存对下一个元素的引用。节点从第一个元素开始沿 `up` 方向渲染。每个节点都保存包含渲染状态的独立层数据。元素首次提交到 `GuiRenderState` 时，会根据其定义的 `ScreenArea#bounds` 决定使用或创建哪个节点。所选或新建的节点位于包含相交元素的最高节点上方一层。

:::warning
尽管 `ScreenArea#bounds` 标记为可空，但如果未定义 bounds，提交到渲染状态的元素不会被添加。该方法之所以可空，只是因为渲染阶段提交的元素会添加到当前节点，而不会根据 bounds 计算所属节点。
:::

每个节点列表称为渲染状态中的一个层级。调用 `GuiGraphicsExtractor#nextStratum` 创建新节点列表后，一个渲染状态可以包含多个层级。新层级会渲染在先前层级的所有元素之上（例如 Item 工具提示）。调用 `nextStratum` 后无法返回前一层级。

### `GuiElementRenderState`

`GuiElementRenderState` 保存 GUI 元素如何渲染到 Screen 的元数据。元素渲染状态扩展 `ScreenArea`，以定义 Screen 上的 `bounds`。bounds 应始终包含整个被渲染元素，以确保它在节点列表中正确排序。bounds 的计算通常会使用下面的一些参数，包括位置与 pose。

`scissorArea` 会裁剪元素可渲染的区域。如果 `scissorArea` 为 `null`，则整个元素都会渲染到 Screen。同样，如果 `scissorArea` 矩形与 `bounds` 不相交，则不会渲染任何内容。

其余三个方法处理元素的实际渲染。`pipeline` 定义元素使用的着色器与元数据。`textureSetup` 可以在片段着色器中指定 `Sampler0`、`Sampler1`、`Sampler2` 或它们的组合。最后，`buildVertices` 传入要上传到缓冲区的顶点；它接收用于接收这些顶点的 `VertexConsumer`。

如果 `GuiGraphicsExtractor` 提供的现有方法不足以满足需求，NeoForge 添加了 `GuiGraphicsExtractor#submitGuiElementRenderState` 方法，用于提交自定义元素渲染状态。

```java
// For some GuiGraphicsExtractor graphics
graphics.submitGuiElementRenderState(new GuiElementRenderState() {

    // Store the current pose of the stack
    private final Matrix3x2f pose = new Matrix3x2f(graphics.pose());
    // Store the current scissor area
    @Nullable
    private final ScreenRectangle scissorArea = graphics.peekScissorStack();

    @Override
    public ScreenRectangle bounds() {
        // We will assume the bounds is 0, 0, 10, 10
        
        // Compute the initial rectangle
        ScreenRectangle rectangle = new ScreenRectangle(
            // The XY position
            0, 0,
            // The width and height of the element
            10, 10
        );

        // Transform the rectangle to its appropriate location using the pose
        rectangle = rectangle.transformMaxBounds(this.pose);

        // If there is a scissor area defined, return the intersection of the two rectangles
        // Otherwise, return the full bounds
        return this.scissorArea != null
            ? this.scissorArea.intersection(rectangle)
            : rectangle;
    }

    @Override
    @Nullable
    public ScreenRectangle scissorArea() {
        return this.scissorArea;
    }

    @Override
    public RenderPipeline pipeline() {
        return RenderPipelines.GUI;
    }

    @Override
    public TextureSetup textureSetup() {
        // Returns the textures to be used by the samplers in a fragment shader
        // When used by the fragment shader:
        // - Sampler0 typically contains the element texture
        // - Sampler1 typically provides a second element texture, currently only used by the end portal pipeline
        // - Sampler2 typically contains the game's lightmap texture

        // Should generally specify at least one texture in Sampler0
        return TextureSetup.noTexture();
    }

    @Override
    public void buildVertices(VertexConsumer consumer) {
        // Build the vertices using the vertex format specified by the pipeline
        // For GUI, uses quads with position and color
        // Color must be in ARGB format
        consumer.addVertexWith2DPose(this.pose, 0,   0).setUv(0, 0).setColor(0xFFFFFFFF);
        consumer.addVertexWith2DPose(this.pose, 0,  10).setUv(0, 1).setColor(0xFFFFFFFF);
        consumer.addVertexWith2DPose(this.pose, 10, 10).setUv(1, 1).setColor(0xFFFFFFFF);
        consumer.addVertexWith2DPose(this.pose, 10,  0).setUv(1, 0).setColor(0xFFFFFFFF);
    }
});
```

### 元素顺序

到目前为止，上述元素只使用 XY 坐标。GUI 渲染会忽略 Z 坐标，因为绘制到 Screen 的所有元素都使用禁用深度测试的 `RenderPipeline`。即便是使用更高级 pipeline 的 3D 元素，默认也会使用同样禁用深度测试的 `RenderPipeline#GUI_TEXTURED_PREMULTIPLIED_ALPHA` 绘制到 2D 纹理，从而避免常见用例中的 Z-fighting。

因此，在渲染阶段，各层级会按顺序渲染，节点列表中的节点则从第一个元素开始沿 `up` 方向渲染。那么，同一节点内部如何处理？这由 `GuiRenderer#ELEMENT_SORT_COMPARATOR` 负责，它依次根据元素的 `GuiElementRenderState#scissorArea`、`pipeline` 和 `textureSetup` 排序。

:::warning
为文本渲染的 Glyph 不参与排序，并且始终在当前节点的所有元素之后渲染。
:::

未指定 `scissorArea` 的元素始终最先渲染，之后依次按顶部 Y、底部 Y、左侧 X、右侧 X 排序。如果两个元素的 `scissorArea` 相同，则使用 `pipeline` 的排序键（通过 `RenderPipeline#getSortKey`）。排序键取决于各 `RenderPipeline` 的构建顺序；在原版中，这对应 `RenderPipelines` 内静态常量的类加载顺序。如果排序键相同，则使用 `textureSetup`。未指定 `textureSetup` 的元素排在前面，之后按纹理元素的排序键（通过 `TextureSetup#getSortKey`）排列。

:::warning
从技术层面看，由于 `RenderPipeline` 与 `TextureSetup` 的存在，元素顺序并非确定性的。这是因为排序目标不是保证确定性，而是尽可能以最少的 pipeline 与纹理切换完成元素渲染。
:::

## `GuiGraphicsExtractor` 中的方法

`GuiGraphicsExtractor` 包含用于提交常用渲染对象的方法。这些方法分为六类：彩色矩形、字符串、纹理、Item、工具提示和画中画。每种方法都会提交一个元素，从 `pose` 继承当前 pose，并根据 `enableScissor` / `disableScissor` 从 `peekScissorStack` 继承裁剪区域。传给这些方法的所有颜色都必须采用 [ARGB][argb] 格式。

### 彩色矩形

彩色矩形使用 `ColoredRectangleRenderState` 提交。所有填充方法都可以接收可选的 `RenderPipeline` 与 `TextureSetup`，用于指定矩形应如何渲染。可以提交三类彩色矩形。

第一类是宽度为一个像素的彩色水平线与垂直线，分别使用 `horizontalLine` 和 `verticalLine`。`horizontalLine` 接收定义左右边界（含端点）的两个 X 坐标、顶部 Y 坐标和颜色。`verticalLine` 接收左侧 X 坐标、定义上下边界（含端点）的两个 Y 坐标和颜色。

第二类是 `fill` 方法，它提交一个要绘制到 Screen 的矩形。线条方法会在内部调用此方法。它接收左侧 X 坐标、顶部 Y 坐标、右侧 X 坐标、底部 Y 坐标和颜色。

第三类是 `outline` 方法，它提交四个宽度为一个像素的矩形作为轮廓。该方法接收左侧 X 坐标、顶部 Y 坐标、轮廓宽度、轮廓高度和颜色。

最后是 `fillGradient` 方法，它绘制带垂直渐变的矩形。该方法接收左侧 X 坐标、顶部 Y 坐标、右侧 X 坐标、底部 Y 坐标，以及底部与顶部颜色。

### 字符串

字符串、[`Component`][component] 与 `FormattedCharSequence` 使用 `GuiTextRenderState` 提交。每个字符串都通过提供的 `Font` 绘制；该 Font 使用指定的 `GlyphRenderTypes#guiPipeline` 创建 `BakedGlyph.GlyphInstance`，并可选择创建 `BakedGlyph.Effect`。在渲染阶段，文本渲染状态随后会转换为 `GlyphRenderState`，并可能为字符串中的每个字符转换出一个 `GlyphEffectRenderState`。

字符串有两种渲染对齐方式：左对齐字符串（`text`）与居中对齐字符串（`centeredText`）。二者都接收用于渲染字符串的 Font、要绘制的字符串、分别表示字符串左侧或中心的 X 坐标、顶部 Y 坐标和颜色。左对齐字符串还可以接收是否为文本绘制阴影的参数。

如果文本应在给定 bounds 内换行，可以改用 `textWithWordWrap`。如果文本需要某种矩形背景，可以使用 `textWithBackdrop`。二者默认都提交左对齐字符串。

也可以使用 `ActiveTextCollector` 提交字符串；它提供使用特定元数据（例如对齐、不透明度和滚动）渲染字符串的方法。文本 Collector 可通过 `GuiGraphicsExtractor#textRenderer` 或 `textRendererForWidget` 创建，也可以继承 `ActiveTextCollector` 本身；通常会接收 `$HoveredTextEffects`，提供是否渲染工具提示或改变光标等基础选项。随后可以使用 `accept` 或 `acceptScrolling` 渲染文本，传入相对于对齐方式的 X 位置、Y 位置、来自 `GuiGraphicsExtractor` 的一组参数、文本本身，以及可选的文本对齐方式。`acceptScrolling` 还接收最左、最右、最上和最下位置，用于表示滚动 bounds。

:::note
通常应以 [`Component`][component] 形式传入字符串，因为它能够处理多种用例，包括该方法的另外两个重载。
:::

### 纹理

纹理通过 `BlitRenderState` 提交，因此方法名为 `blit`。`BlitRenderState` 复制图像位，并通过 `RenderPipeline` 参数将其渲染到 Screen。每个 `blit` 还接收一个 `Identifier`，表示纹理的绝对位置：

```java
// Points to 'assets/examplemod/textures/gui/container/example_container.png'
private static final Identifier TEXTURE = Identifier.fromNamespaceAndPath("examplemod", "textures/gui/container/example_container.png");
```

尽管 `blit` 有许多不同重载，这里只讨论其中两个。

第一个 `blit` 假定图像位于 PNG 文件中，依次接收两个整数、两个 float，最后再接收四个整数。它们分别是 Screen 上的左侧 X 与顶部 Y 坐标、PNG 内的左侧 X 与顶部 Y 坐标、待渲染图像的宽度与高度，以及 PNG 文件的宽度与高度。

:::tip
必须指定 PNG 文件大小，才能对坐标进行归一化并获得对应 UV 值。
:::

第二个 `blit` 在末尾新增一个整数，表示待绘制图像的染色色值。若未指定，染色色值为 `0xFFFFFFFF`。

#### `blitSprite`

`blitSprite` 是 `blit` 的特殊实现，其纹理取自 GUI 纹理图集。大多数覆盖在背景上的纹理都是 Sprite，例如熔炉 GUI 中的“燃烧进度”叠加层。所有 Sprite 纹理路径都相对于 `textures/gui/sprites`，无需指定文件扩展名。

```java
// Points to 'assets/examplemod/textures/gui/sprites/container/example_container/example_sprite.png'
private static final Identifier SPRITE = Identifier.fromNamespaceAndPath("examplemod", "container/example_container/example_sprite");
```

一组 `blitSprite` 方法的参数与 `blit` 相同，但没有处理 PNG 坐标、宽度和高度的四个整数。

另一组 `blitSprite` 方法接收更多纹理信息，以便绘制 Sprite 的一部分。这些方法接收 Sprite 宽度与高度、Sprite 内的 X 与 Y 坐标、Screen 上的左侧 X 与顶部 Y 坐标、染色色值，以及待渲染图像的宽度与高度。

如果 Sprite 大小与纹理大小不匹配，可以使用三种方式之一缩放 Sprite：`stretch`、`tile` 和 `nine_slice`。`stretch` 将图像从纹理大小拉伸到 Screen 大小；`tile` 反复渲染纹理，直至达到 Screen 大小；`nine_slice` 将纹理分为一个中心、四条边和四个角，再将其平铺到所需 Screen 大小。

可在与纹理文件同名的 mcmeta 文件中添加 `gui.scaling` JSON 对象来设置此行为。

```json5
// For some texture file example_sprite.png
// In example_sprite.png.mcmeta

// Stretch example
{
    "gui": {
        "scaling": {
            "type": "stretch"
        }
    }
}

// Tile example
{
    "gui": {
        "scaling": {
            "type": "tile",
            // The size to begin tiling at
            // This is usually the size of the texture
            "width": 40,
            "height": 40
        }
    }
}

// Nine slice example
{
    "gui": {
        "scaling": {
            "type": "nine_slice",
            // The size to begin tiling at
            // This is usually the size of the texture
            "width": 40,
            "height": 40,
            "border": {
                // The padding of the texture that will be sliced into the border texture
                "left": 1,
                "right": 1,
                "top": 1,
                "bottom": 1
            },
            // When true the center part of the texture will be applied like
            // the stretch type instead of a nine slice tiling.
            "stretch_inner": true
        }
    }
}
```

:::note
当 `blitSprite` 使用设置为平铺或九宫格切片的纹理时，会通过 `TiledBlitRenderState` 提交元素；除 `BlitRenderState` 中的其他参数外，它还指定 Tile 的宽度与高度。
:::

### Item

Item 使用 `GuiItemRenderState` 提交。在渲染阶段，根据 Item bounds 与客户端 Item 属性，Item 渲染状态随后会转换为 `BlitRenderState` 或 `OversizedItemRenderState`。

`item` 除接收 Screen 上的左侧 X 与顶部 Y 坐标外，还接收一个 `ItemStack`。它还可以选择接收持有该 ItemStack 的 `LivingEntity`、ItemStack 当前所在的 `Level` 以及种子值。另有 `fakeItem` 变体，会将 `LivingEntity` 设为 `null`。

Item 装饰（例如耐久条、冷却与数量）通过 `itemDecorations` 处理。除 `Font` 与数量文本覆盖值外，它接收与基础 `item` 相同的参数。

### 工具提示

工具提示通过上述多种渲染状态提交。工具提示方法分为两类：“下一帧”与“立即”。两类方法都接收用于渲染文本的 `Font`、`Component` 列表、用于特殊渲染的可选 `TooltipComponent`、左侧 X 与顶部 Y、用于调整位置的 `ClientTooltipPositioner`，以及背景与边框纹理。

“下一帧”工具提示并不是真的在下一帧提交，而是将提交推迟到调用 `Screen#render` 之后。工具提示会添加到新层级，因此渲染在 Screen 所有元素之上。“下一帧”方法采用 `set*Tooltip*ForNextFrame` 形式。它们还可以接收额外布尔值，指示是否覆盖当前已推迟的工具提示（若有），以及渲染出的工具提示应使用的 `ItemStack`。

相反，“立即”工具提示会在方法调用时立即提交。“立即”方法采用 `tooltip` 形式，还接收工具提示所悬停的 `ItemStack`。

### 画中画

画中画（PiP）允许把任意对象绘制到 Screen。PiP 不会直接绘制到输出，而是先将对象绘制到中间纹理（即“画面”），再在渲染阶段默认以 `BlitRenderState` 的形式提交到 `GuiRenderState`。`GuiGraphicsExtractor` 为地图（`map`）、Entity（`entity`）、玩家皮肤（`skin`）、书本模型（`book`）、旗帜图案（`bannerPattern`）、告示牌（`sign`）和性能分析图表（`profilerChart`）提供了方法。

:::note
当 `ClientItem.Properties#oversizedInGui` 为 true 时，超出默认 16x16 bounds 的 Item 会使用 `OversizedItemRenderer` PiP 作为渲染机制。
:::

每个 PiP 都会提交 `PictureInPictureRenderState`，将对象渲染到 Screen。与 `GuiElementRenderState` 类似，`PictureInPictureRenderState` 也扩展 `ScreenArea`，通过 `bounds` 定义边界，并通过 `scissorArea` 定义裁剪。随后，`PictureInPictureRenderState` 会定义画面的渲染位置与大小，指定左侧 X（`x0`）、右侧 X（`x1`）、顶部 Y（`y0`）和底部 Y（`y1`）。画面内的元素还可以按某个 float 值进行 `scale`。最后，可以使用额外的 `pose` 变换画面的 XY 坐标。默认使用单位 pose，因为渲染对象通常已在画面自身内部完成变换。为简化实现，可以使用 `PictureInPictureRenderState#getBounds` 计算 `bounds`；但如果修改了 `pose`，就需要实现自己的逻辑。

```java
// Other parameters can be added, but this is the minimum required to implement all methods
public record ExampleRenderState(
    int x0, // The left X
    int x1, // The right X
    int y0, // The top Y
    int y1, // The bottom Y
    float scale, // The scale factor when drawing to the picture
    @Nullable ScreenRectangle scissorArea, // The rendering area
    @Nullable ScreenRectangle bounds // The bounds of the element
) implements PictureInPictureRenderState {

    // Additional constructors
    public ExampleRenderState(int x, int y, int width, int height, @Nullable ScreenRectangle scissorArea) {
        this(
            x, // x0
            x + width, // x1
            y, // y0
            y + height, // y1
            1f, // scale
            scissorArea,
            PictureInPictureRenderState.getBounds(x, y, x + width, y + height, scissorArea)
        );
    }
}
```

为了绘制 PiP 渲染状态并将其提交到画面，每个 PiP 都有自己的 `PictureInPictureRenderer<T>`，其中 `T` 是所实现的 `PictureInPictureRenderState`。其中有许多可重写方法，使用户几乎能够完全控制整个 pipeline，但有三个方法必须实现。

首先是 `getRenderStateClass`，它只返回 `PictureInPictureRenderState` 的类。在原版中，该方法用于注册 Renderer 对应的渲染状态。NeoForge 仍使用渲染状态类，但改为通过事件完成注册，将其映射到动态 Renderer 池，而不是调用 `getRenderStateClass`。

其次是 `getTextureLabel`，它为正在写入的画面提供唯一调试标签。最后是 `renderToTexture`，与其他渲染方法类似，它负责实际将对象绘制到画面。

```java
public class ExampleRenderer extends PictureInPictureRenderer<ExampleRenderState> {

    // Takes in the buffers used to write the object to the picture
    public ExampleRenderer(MultiBufferSource.BufferSource bufferSource) {
        super(bufferSource);
    }

    @Override
    public Class<ExampleRenderState> getRenderStateClass() {
        // Returns the render state class
        return ExampleRenderState.class;
    }

    @Override
    protected String getTextureLabel() {
        // Can be any string, but should be unique
        // Prefix with mod id for greater clarity
        return "examplemod: example pip";
    }

    @Override
    protected void renderToTexture(ExampleRenderState renderState, PoseStack pose) {
        // Modify pose if desired
        // Can push/pop if wanted, but a new `PoseStack` is created for writing to the picture
        pose.translate(...);

        // Render the object to the screen
        VertexConsumer consumer = this.bufferSource.getBuffer(RenderType.lines());
        consumer.addVertex(...).setColor(...).setNormal(...);
        consumer.addVertex(...).setColor(...).setNormal(...);
    }

    // Additional methods

    @Override
    protected void blitTexture(ExampleRenderState renderState, GuiRenderState guiState) {
        // Submits the picture to the gui render state as a `BlitRenderState` by default
        // Override this if you want to modify the `BlitRenderState`
        // Should call `GuiRenderState#submitBlitToCurrentLayer`
        // Bounds can be `null`
        super.blitTexture(renderState, guiState);
    }

    @Override
    protected boolean textureIsReadyToBlit(ExampleRenderState renderState) {
        // When true, this reuses the already written-to picture instead of
        // constructing a new picture and writing to it using `renderToTexture`.
        // This should only be true if it is guaranteed that two elements will
        // be rendered *exactly* the same.
        return super.textureIsReadyToBlit(renderState);
    }

    @Override
    protected float getTranslateY(int scaledHeight, int guiScale) {
        // Sets the initial offset the `PoseStack` is translated by in the Y direction.
        // Common implementations use `scaledHeight / 2f` to center the Y coordinate similar to X.
        return scaledHeight;
    }

    @Override
    public boolean canBeReusedFor(ExampleRenderState state, int textureWidth, int textureHeight) {
        // A NeoForge-added method used to check if this renderer can be reused on a subsequent frame.
        // When true, this will reuse the constructed state and renderer from the previous frame.
        // When false, a new renderer will be created.
        return super.canBeReusedFor(state, textureWidth, textureHeight);
    }
}
```

要使用 PiP，必须在[模组事件总线][modbus]上将 Renderer 注册到 `RegisterPictureInPictureRenderersEvent`。

```java
@SubscribeEvent // on the mod event bus
public static void registerPip(RegisterPictureInPictureRenderersEvent event) {
    event.register(
        // The PiP render state class
        ExampleRenderState.class,
        // A factory that takes in the `MultiBufferSource.BufferSource` and returns the PiP renderer
        ExampleRenderer::new
    );
}
```

随后可以使用 NeoForge 添加的 `GuiGraphicsExtractor#submitPictureInPictureRenderState` 提交 PiP 渲染状态：

```java
// For some GuiGraphicsExtractor graphics
graphics.submitPictureInPictureRenderState(new ExampleRenderState(
    0, 0,
    10, 10,
    // Get the scissor area from the stack
    graphics.peekScissorStack()
));
```

:::note
NeoForge 修复了一个错误；该错误会阻止在同一帧提交某种 PiP 渲染状态的多个实例。
:::

## `Renderable`

`Renderable` 本质上是要被渲染的对象，包括 Screen、按钮、聊天框、列表等。`Renderable` 只有一个方法：`#extractRenderState`。它接收用于向 Screen 提交元素的 `GuiGraphicsExtractor`、按相对 Screen 大小缩放后的鼠标 X 与 Y 位置，以及 tick delta（自上一帧以来经过了多少 tick）。

常见 Renderable 包括 Screen 与 Widget。Widget 是可交互元素，例如 `Button`、其子类型 `ImageButton`，以及用于在 Screen 上输入文本的 `EditBox`。

## `GuiEventListener`

Minecraft 中的所有 Screen 都实现 `GuiEventListener`。`GuiEventListener` 负责处理用户与 Screen 的交互，包括鼠标输入（移动、点击、释放、拖动、滚动、悬停）和键盘输入（按下、释放、键入）。每个方法都会返回关联操作是否成功影响 Screen。按钮、聊天框、列表等 Widget 也实现此接口。

### `ContainerEventHandler`

与 `GuiEventListener` 几乎同义的是其子类型 `ContainerEventHandler`。它负责处理用户与包含 Widget 的 Screen 之间的交互，管理当前获得焦点的对象以及关联交互如何应用。`ContainerEventHandler` 添加了三项功能：可交互子项、拖动和焦点。

事件处理器保存子项，用于确定元素的交互顺序。执行鼠标事件处理器（拖动除外）时，会运行列表中鼠标悬停到的第一个子项的逻辑。

通过 `#mouseClicked` 与 `#mouseReleased` 实现的鼠标元素拖动，能够提供执行更精确的逻辑。

焦点机制允许在事件执行期间优先检查并处理特定子项，例如处理键盘事件或鼠标拖动时。焦点通常通过 `#setFocused` 设置。此外，可以使用 `#nextFocusPath` 在可交互子项之间循环，并根据传入的 `FocusNavigationEvent` 选择子项。

:::note
Screen 通过 `AbstractContainerEventHandler` 实现 `ContainerEventHandler`；后者添加了拖动与子项焦点的 setter 和 getter 逻辑。
:::

## `NarratableEntry`

`NarratableEntry` 是可通过 Minecraft 无障碍旁白功能朗读的元素。每个元素可根据悬停或选中状态提供不同旁白，优先级通常依次为焦点、悬停和所有其他情况。

`NarratableEntry` 有四个方法：两个方法决定朗读元素时的优先级（`#narrationPriority` 与 `#getTabOrderGroup`）；一个方法决定是否朗读旁白（`#isActive`）；最后一个方法将旁白提供给关联输出，以供播报或阅读（`#updateNarration`）。

:::note
Minecraft 的所有 Widget 都是 `NarratableEntry`，因此使用现有子类型时通常无需手动实现它。
:::

## Screen 子类型

掌握上述知识后，就可以构造基础 Screen。为便于理解，以下会按照通常遇到的顺序介绍 Screen 的各个组件。

首先，所有 Screen 都接收一个表示 Screen 标题的 `Component`。该组件通常由某个子类型绘制到 Screen；在基础 Screen 中，它只用于旁白消息。Screen 还可以接收 `Minecraft` 实例以及渲染文本时使用的 `Font`；若未指定，则使用默认实例与 Font。

```java
// In some Screen subclass
public MyScreen(Component title) {
    super(Minecraft.getInstance(), Minecraft.getInstance().font, title);
}
```

### 初始化

Screen 初始化后会调用 `#init` 方法。`init` 方法根据 `Minecraft` 实例，将 Screen 内的初始设置设为经游戏缩放后的相对宽度与高度。添加 Widget 或预计算相对坐标等设置都应在此方法中完成。如果调整游戏窗口大小，会通过调用 `init` 方法重新初始化 Screen。

向 Screen 添加 Widget 有三种方式，各自用途不同：

| 方法                 | 说明                                                                          |
|:--------------------:|:------------------------------------------------------------------------------|
|`addWidget`           | 添加可交互且可旁白、但不渲染的 Widget。                                       |
|`addRenderableOnly`   | 添加只渲染、不可交互且无旁白的 Widget。                                       |
|`addRenderableWidget` | 添加可交互、可旁白且会渲染的 Widget。                                         |

通常最常使用 `addRenderableWidget`。

```java
// In some Screen subclass
@Override
protected void init() {
    super.init();

    // Add widgets and precomputed values
    this.addRenderableWidget(new EditBox(/* ... */));
}
```

### Screen Tick

Screen 也会使用 `#tick` 方法执行 tick，以便为渲染运行一定程度的客户端逻辑。

```java
// In some Screen subclass
@Override
public void tick() {
    super.tick();

    // Execute some logic every frame
}
```

### 输入处理

由于 Screen 是 `GuiEventListener` 的子类型，也可以重写输入处理器，例如处理特定[按键][keymapping]的逻辑。

### 渲染 Screen

Screen 通过 `#extractRenderStateWithTooltipAndSubtitles` 在三个不同层级提交元素进行渲染：背景层级、元素层级，以及可选的悬浮层级。

首先通过 `#extractBackground` 提交背景层级元素，通常包含模糊效果或背景纹理。

:::warning
通过 `GuiGraphicsExtractor#blurBeforeThisStratum` 处理的模糊效果，在任意一帧中只能调用一次。尝试提交第二次模糊会抛出异常。
:::

随后通过作为 `Renderable` 子类型所提供的 `#extractRenderState` 方法提交元素层级元素。该方法主要提交 Widget 和标签，同时设置待提交的悬浮元素。

最后，悬浮层级提交位于先前元素之上的元素，例如工具提示。

```java
// In some Screen subclass

// mouseX and mouseY indicate the scaled coordinates of where the cursor is in on the screen
@Override
public void extractBackground(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
    // Submit things on the background stratum
    this.extractTransparentBackground(graphics);
}

@Override
public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
    // Submit things before widgets

    // Then the widgets if this is a direct child of the Screen
    super.extractRenderState(graphics, mouseX, mouseY, partialTick);

    // Submit things after widgets

    // Set the tooltip to be added above everything in this method
    graphics.setTooltipForNextFrame(...);
}
```

### 关闭 Screen

关闭 Screen 时，由两个方法处理清理工作：`#onClose` 与 `#removed`。

每当用户输入操作关闭当前 Screen 时，都会调用 `onClose`。该方法通常作为回调，用于销毁并保存 Screen 自身的内部过程，其中包括向服务器发送数据包。

`removed` 会在 Screen 切换并交由垃圾收集器回收之前调用。它负责处理所有尚未重置回 Screen 打开前初始状态的内容。

```java
// In some Screen subclass

@Override
public void onClose() {
    // Stop any handlers here

    // Call last in case it interferes with the override
    super.onClose();
}

@Override
public void removed() {
    // Reset initial states here

    // Call last in case it interferes with the override
    super.removed()
;}
```

## `AbstractContainerScreen`

如果 Screen 直接关联到 [Menu][menus]，则应改为继承 `AbstractContainerScreen`。`AbstractContainerScreen` 充当 Menu 的 Screen 与输入处理器，并包含槽位同步与交互逻辑。因此，通常只需重写或实现两个方法，即可获得可用的容器 Screen。为便于理解，以下同样按照通常遇到的顺序介绍容器 Screen 的各个组件。

`AbstractContainerScreen` 通常需要五个参数：正在打开的容器 Menu（由泛型 `T` 表示）、玩家物品栏（仅用于显示名称）、Screen 自身的标题，以及背景纹理的宽度与高度。

:::note
如果背景纹理的宽度与高度为 176 x 166，可以从 super 构造器中省略。这并非指图像大小——图像通常是 256 x 256 的 PNG——而是其中具体的纹理 bounds。
:::


这里可以设置多个定位字段：

字段              | 说明
:---:             | :---
`titleLabelX`     | Screen 标题渲染位置的相对 X 坐标。
`titleLabelY`     | Screen 标题渲染位置的相对 Y 坐标。
`inventoryLabelX` | 玩家物品栏名称渲染位置的相对 X 坐标。
`inventoryLabelY` | 玩家物品栏名称渲染位置的相对 Y 坐标。

:::caution
前文提到，预计算的相对坐标应在 `#init` 方法中设置。这一点仍然成立，因为这里提到的值并非预计算坐标，而是静态值与已相对化的坐标。

图像值表示背景纹理大小，因此是静态且不变的。为简化渲染，会在 `init` 方法中预计算另外两个值（`leftPos` 与 `topPos`），标记背景渲染位置的左上角。标签坐标相对于这两个值。

`leftPos` 与 `topPos` 也提供了一种便捷的背景渲染方式，因为它们已经表示要传给 `GuiGraphicsExtractor#blit` 的位置。
:::

```java
// In some AbstractContainerScreen subclass
public MyContainerScreen(MyMenu menu, Inventory playerInventory, Component title) {
    super(menu, playerInventory, title, 176, 166);

    this.titleLabelX = 10;
    this.inventoryLabelX = 10;
}
```

### 访问 Menu

由于 Menu 会传入 Screen，因此现在可以通过 `menu` 字段访问 Menu 内已经同步的所有值（无论通过槽位、DataSlot 还是自定义系统同步）。

### 容器 Tick

当玩家存活且正在查看 Screen 时，容器 Screen 会在 `#tick` 方法中通过 `#containerTick` 执行 tick。它实质上取代了容器 Screen 中的 `tick`，最常见的用途是让配方书执行 tick。

```java
// In some AbstractContainerScreen subclass
@Override
protected void containerTick() {
    super.containerTick();

    // Tick things here
}
```

### 渲染容器 Screen

容器 Screen 使用全部三个层级提交元素。首先，背景层级通过重写 `#extractBackground` 提交背景纹理。随后，元素层级像之前一样在 `#extractContents` 中提交 Widget，再在 `#extractLabels` 中提交标签。最后，`AbstractContainerScreen` 通过 `extractTooltip` 设置要在悬浮层级提交的工具提示。

先从背景开始：调用 `extractBackground`，将 Screen 的背景元素提交到背景层级。

```java
// In some AbstractContainerScreen subclass

// The location of the background texture (assets/<namespace>/<path>)
private static final Identifier BACKGROUND_LOCATION = Identifier.fromNamespaceAndPath(MOD_ID, "textures/gui/container/my_container_screen.png");

@Override
protected void extractBackground(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
    super.extractBackground(graphics, mouseX, mouseY, a);

    // Submits the background texture. 'leftPos' and 'topPos' should
    // already represent the top left corner of where the texture
    // should be rendered as it was precomputed from the 'imageWidth'
    // and 'imageHeight'. The two zeros represent the integer u/v
    // coordinates inside the PNG file, whose size is represented by
    // the last two integers (typically 256 x 256).
    graphics.blit(
        RenderPipelines.GUI_TEXTURED,
        BACKGROUND_LOCATION,
        this.leftPos, this.topPos,
        0, 0,
        this.imageWidth, this.imageHeight,
        256, 256
    );
}
```

调用 `extractLabels`，在渲染层级中的 Widget 之后提交文本。它以 Screen Font 调用 `text`，提交关联组件。

```java
// In some AbstractContainerScreen subclass
@Override
protected void extractLabels(GuiGraphicsExtractor graphics, int mouseX, int mouseY) {
    super.extractLabels(graphics, mouseX, mouseY);

    // Assume we have some Component 'label'
    // 'label' is drawn at 'labelX' and 'labelY'
    // The color is an ARGB value
    // The final boolean renders the drop shadow when true
    graphics.text(this.font, this.label, this.labelX, this.labelY, 0xFF404040, false);
}
```

:::note
提交标签时，**不需要**指定 `leftPos` 与 `topPos` 偏移。它们已经在 `Matrix3x2fStack` 中完成平移，因此此方法内的所有内容都会相对于这些坐标提交。
:::

## 注册 AbstractContainerScreen

要将 `AbstractContainerScreen` 与 Menu 配合使用，必须在[**模组事件总线**][modbus]的 `RegisterMenuScreensEvent` 中调用 `register` 完成注册。

```java
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerScreens(RegisterMenuScreensEvent event) {
    event.register(MY_MENU.get(), MyContainerScreen::new);
}
```

[menus]: ../inventories/menus.md
[network]: ../networking/index.md
[screen]: #the-screen-subtype
[argb]: https://en.wikipedia.org/wiki/RGBA_color_model#ARGB32
[component]: ../resources/client/i18n.md#components
[keymapping]: ../misc/keymappings.md#inside-a-gui
[modbus]: ../concepts/events.md#事件总线
